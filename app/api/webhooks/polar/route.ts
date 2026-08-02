import { Webhooks } from "@polar-sh/nextjs";
import {
  grantEntitlement,
  logBillingEvent,
  revokeEntitlement,
} from "@/lib/billing/entitlements";
import { tierForProductId } from "@/lib/billing/plans";

/**
 * Polar webhook — the only thing in this codebase that grants paid access.
 *
 * SIGNATURE VERIFICATION
 * Handled by the `Webhooks` helper, which validates the standard-webhooks
 * headers against POLAR_WEBHOOK_SECRET before any handler below runs. Doc 10
 * §10.4 rule 1: "an unverified webhook endpoint is a 'give me Pro for free'
 * button." The `!` on the secret is deliberate — if it is unset we want a loud
 * failure at module load, not a route that quietly accepts anything.
 *
 * WHY `subscription.active` AND NOT `checkout.updated`
 * A completed checkout is not the same as money having arrived. `active` is the
 * state that means the subscription is live and paid.
 *
 * WHY `canceled` DOES NOT REVOKE
 * `subscription.canceled` fires when a customer turns off auto-renew. They have
 * already paid for the current period and keep access until it ends.
 * `subscription.revoked` is the event where access actually lapses. Conflating
 * the two deletes access somebody paid for — the classic billing bug, and one
 * that produces a refund request and a bad review on the same afternoon.
 *
 * DELIVERY IS AT-LEAST-ONCE AND UNORDERED
 * Every handler must therefore be idempotent, and grants must not downgrade.
 * That logic lives in `grantEntitlement`, not here.
 */

/**
 * Resolve which Clerk user a webhook payload is about.
 *
 * `externalCustomerId` is set at checkout from the Clerk session (see
 * app/api/checkout/route.ts), so it is the reliable join. `metadata.clerkUserId`
 * is a deliberate redundancy for manually-created checkout links — the Team and
 * Practice tiers are sold through a conversation, and those links are generated
 * by hand in the Polar dashboard where it is easy to set metadata and easy to
 * forget the external id.
 */
function clerkUserIdFrom(data: {
  customer?: { externalId?: string | null } | null;
  metadata?: Record<string, unknown> | null;
}): string | null {
  const external = data.customer?.externalId;
  if (typeof external === "string" && external.startsWith("user_")) return external;

  const meta = data.metadata?.clerkUserId;
  if (typeof meta === "string" && meta.startsWith("user_")) return meta;

  return null;
}

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,

  // ── One-time purchases (Lifetime) ──────────────────────────────────────
  onOrderPaid: async (payload) => {
    const order = payload.data;
    const clerkUserId = clerkUserIdFrom(order as never);
    const productId = order.productId;
    const tier = productId ? tierForProductId(productId) : null;

    await logBillingEvent({
      eventType: "order.paid",
      clerkUserId,
      polarCustomerId: order.customerId,
      productId,
      detail: tier ? `Granting ${tier}` : "No matching product — ignored",
    });

    // Both of these are misconfigurations rather than attacks, and both must
    // fail loudly: silently ignoring a paid order means a customer has been
    // charged and has nothing to show for it.
    if (!clerkUserId) {
      console.error("[polar] order.paid with no resolvable Clerk user:", order.id);
      return;
    }
    if (!tier) {
      console.error(`[polar] order.paid for unmapped product ${productId} — check POLAR_PRODUCT_* env vars`);
      return;
    }

    await grantEntitlement({
      clerkUserId,
      tier,
      polarCustomerId: order.customerId,
      polarOrderId: order.id,
      // A one-time purchase has no period end. Explicit null rather than
      // undefined so it overwrites any expiry left over from a prior
      // subscription on the same account.
      currentPeriodEnd: null,
    });
  },

  // ── Subscriptions becoming live ────────────────────────────────────────
  onSubscriptionActive: async (payload) => {
    const sub = payload.data;
    const clerkUserId = clerkUserIdFrom(sub as never);
    const productId = sub.productId;
    const tier = productId ? tierForProductId(productId) : null;

    await logBillingEvent({
      eventType: "subscription.active",
      clerkUserId,
      polarCustomerId: sub.customerId,
      productId,
      detail: tier ? `Granting ${tier}` : "No matching product — ignored",
    });

    if (!clerkUserId || !tier) {
      console.error("[polar] subscription.active unresolved:", { id: sub.id, clerkUserId, productId });
      return;
    }

    await grantEntitlement({
      clerkUserId,
      tier,
      seats: typeof sub.seats === "number" ? sub.seats : undefined,
      polarCustomerId: sub.customerId,
      polarSubscriptionId: sub.id,
      currentPeriodEnd: sub.currentPeriodEnd
        ? new Date(sub.currentPeriodEnd).toISOString()
        : null,
    });
  },

  /**
   * Plan changes and renewals. Re-grants rather than assuming nothing moved: an
   * upgrade from Pro to Practice arrives here, as does a seat-count change on a
   * team plan, and both need the entitlement refreshed.
   */
  onSubscriptionUpdated: async (payload) => {
    const sub = payload.data;
    const clerkUserId = clerkUserIdFrom(sub as never);
    const productId = sub.productId;
    const tier = productId ? tierForProductId(productId) : null;
    if (!clerkUserId || !tier) return;

    // A subscription that is no longer in a paying state should not be
    // re-granted by a routine update event. Revocation is handled by
    // `subscription.revoked`; this just avoids extending access here.
    const status = String(sub.status ?? "");
    if (status !== "active" && status !== "trialing") {
      await logBillingEvent({
        eventType: "subscription.updated",
        clerkUserId,
        polarCustomerId: sub.customerId,
        productId,
        detail: `Status "${status}" — not re-granting`,
      });
      return;
    }

    await grantEntitlement({
      clerkUserId,
      tier,
      seats: typeof sub.seats === "number" ? sub.seats : undefined,
      polarCustomerId: sub.customerId,
      polarSubscriptionId: sub.id,
      currentPeriodEnd: sub.currentPeriodEnd
        ? new Date(sub.currentPeriodEnd).toISOString()
        : null,
    });
  },

  /**
   * Auto-renew turned off. Logged, NOT revoked — access continues to the end of
   * the paid period. See the header note.
   */
  onSubscriptionCanceled: async (payload) => {
    const sub = payload.data;
    await logBillingEvent({
      eventType: "subscription.canceled",
      clerkUserId: clerkUserIdFrom(sub as never),
      polarCustomerId: sub.customerId,
      productId: sub.productId,
      detail: `Auto-renew off; access retained until ${sub.currentPeriodEnd ?? "period end"}`,
    });
  },

  // ── Access actually lapsing ────────────────────────────────────────────
  onSubscriptionRevoked: async (payload) => {
    const sub = payload.data;
    const clerkUserId = clerkUserIdFrom(sub as never);

    await logBillingEvent({
      eventType: "subscription.revoked",
      clerkUserId,
      polarCustomerId: sub.customerId,
      productId: sub.productId,
      detail: "Revoking entitlement",
    });

    if (!clerkUserId) {
      console.error("[polar] subscription.revoked with no resolvable Clerk user:", sub.id);
      return;
    }
    await revokeEntitlement(clerkUserId, "subscription.revoked");
  },

  // ── Refunds ────────────────────────────────────────────────────────────
  // A refunded one-time purchase has no subscription to revoke, so it has to be
  // handled explicitly or a refunded Lifetime licence stays granted forever.
  onOrderRefunded: async (payload) => {
    const order = payload.data;
    const clerkUserId = clerkUserIdFrom(order as never);

    await logBillingEvent({
      eventType: "order.refunded",
      clerkUserId,
      polarCustomerId: order.customerId,
      productId: order.productId,
      detail: "Refund — revoking",
    });

    if (!clerkUserId) return;

    // `revokeEntitlement` refuses to revoke a lifetime licence, which is the
    // right default everywhere except here. A refunded lifetime purchase is
    // exactly the case that must override it, so it is done directly.
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    await client.users.updateUserMetadata(clerkUserId, {
      publicMetadata: { plan: "free", planExpiresAt: null, seats: null },
    });
  },
});
