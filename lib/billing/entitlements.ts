// Granting and revoking paid access. Server-only, NOT client-callable.
//
// This is the file doc 10 §10.4 rule 2 is about: "the entitlement-granting
// helper never lives in a `"use server"` module". Every export from a
// `"use server"` file becomes a public HTTP endpoint, so `grantEntitlement`
// living there would literally be a "give me Pro for free" button — it takes a
// user id and a tier as parameters and, by design, performs no authorisation of
// its own. It trusts its caller absolutely.
//
// Its only legitimate caller is the Polar webhook route, after signature
// verification. `server-only` is what makes that structural.
//
// ARCHITECTURE (doc 10 §10.4)
//   Clerk publicMetadata is the source of truth. Supabase mirrors it.
// The Mac app already reads `publicMetadata.betaAccess`; `publicMetadata.plan`
// deliberately mirrors that mechanism rather than inventing a second one.
import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/server";
import { isOneTimeTier, outranks, type EntitlementTier } from "./plans";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export type GrantArgs = {
  clerkUserId: string;
  tier: EntitlementTier;
  seats?: number;
  polarCustomerId?: string;
  polarSubscriptionId?: string;
  polarOrderId?: string;
  /** ISO date the access lapses. Null/absent = no expiry (lifetime). */
  currentPeriodEnd?: string | null;
};

/**
 * Grant or upgrade paid access.
 *
 * IDEMPOTENT AND NON-DOWNGRADING, which matters more than it looks. Polar
 * delivers webhooks at-least-once and does not guarantee ordering, so this
 * function will be called with stale events — a `subscription.active` for a Pro
 * plan can arrive *after* the `order.paid` for a Lifetime purchase the same
 * customer made a minute later. Applying events blindly in arrival order would
 * silently downgrade a paying customer.
 *
 * So a grant never lowers the tier: `outranks` decides, and a lower-ranked
 * event only refreshes the billing metadata.
 */
export async function grantEntitlement(args: GrantArgs): Promise<void> {
  const client = await clerkClient();
  const user = await client.users.getUser(args.clerkUserId);
  const existing = (user.publicMetadata ?? {}) as Record<string, unknown>;
  const currentTier = (existing.plan as EntitlementTier | undefined) ?? "free";

  const keepExisting = outranks(currentTier, args.tier) && currentTier !== args.tier;
  const effectiveTier = keepExisting ? currentTier : args.tier;

  // The order that granted a one-time tier is recorded on the user, so a later
  // refund can be matched to the grant it pays for (see `revokeRefundedOrder`).
  // Only the order that first granted the tier is kept: a second purchase of
  // a tier the user already holds does not replace it.
  const recordOrder =
    !!args.polarOrderId &&
    isOneTimeTier(args.tier) &&
    !keepExisting &&
    (currentTier !== args.tier || typeof existing.polarOrderId !== "string");

  if (keepExisting) {
    console.warn(
      `[billing] Not downgrading ${args.clerkUserId}: holds "${currentTier}", ` +
        `event granted "${args.tier}". Recording billing ids only.`
    );
  }

  await client.users.updateUserMetadata(args.clerkUserId, {
    publicMetadata: {
      plan: effectiveTier,
      planSince:
        typeof existing.planSince === "string" && currentTier !== "free"
          ? existing.planSince
          : today(),
      ...(args.seats != null ? { seats: args.seats } : {}),
      ...(args.polarCustomerId ? { polarCustomerId: args.polarCustomerId } : {}),
      ...(args.polarSubscriptionId
        ? { polarSubscriptionId: args.polarSubscriptionId }
        : {}),
      ...(recordOrder ? { polarOrderId: args.polarOrderId } : {}),
      planExpiresAt: args.currentPeriodEnd ?? null,
    },
  });

  await mirrorToSupabase({ ...args, tier: effectiveTier, active: true });
}

/**
 * End paid access.
 *
 * Only ever called for `subscription.revoked`. NOT for `subscription.canceled`
 * — those are different events and conflating them is the classic billing bug:
 * "canceled" means the customer has turned off auto-renew and keeps access
 * until the period ends, while "revoked" means the access has actually lapsed.
 * Revoking on cancel would delete access a customer has already paid for and
 * generate a refund request and a bad review on the same day.
 *
 * A lifetime purchase is never revoked by a subscription event. Somebody who
 * bought Lifetime and separately trialled a monthly plan must not lose their
 * licence when the monthly one lapses.
 */
export async function revokeEntitlement(
  clerkUserId: string,
  reason: string
): Promise<void> {
  const client = await clerkClient();
  const user = await client.users.getUser(clerkUserId);
  const existing = (user.publicMetadata ?? {}) as Record<string, unknown>;
  const currentTier = (existing.plan as EntitlementTier | undefined) ?? "free";

  if (currentTier === "lifetime") {
    console.warn(
      `[billing] Ignoring revoke for ${clerkUserId} (${reason}): holds a lifetime licence.`
    );
    return;
  }

  await client.users.updateUserMetadata(clerkUserId, {
    publicMetadata: {
      plan: "free",
      planExpiresAt: null,
      seats: null,
      polarSubscriptionId: null,
    },
  });

  await mirrorToSupabase({
    clerkUserId,
    tier: "free",
    active: false,
    revokedReason: reason,
  });
}

/**
 * End a one-time grant because its order was fully refunded.
 *
 * Downgrades ONLY when the user's current tier is a one-time tier AND the
 * refunded order is the order that granted it (`publicMetadata.polarOrderId`).
 * Any other refund (a different order, a duplicate purchase, a grant made
 * before order ids were recorded) leaves access alone and returns why, so the
 * founder can act by hand. Stripping a lifetime licence on an unrelated refund
 * is the worse error: it takes away something the customer still paid for.
 *
 * Returns a short description of what it did, for the billing event log.
 */
export async function revokeRefundedOrder(
  clerkUserId: string,
  orderId: string
): Promise<string> {
  const client = await clerkClient();
  const user = await client.users.getUser(clerkUserId);
  const existing = (user.publicMetadata ?? {}) as Record<string, unknown>;
  const currentTier = (existing.plan as EntitlementTier | undefined) ?? "free";

  if (!isOneTimeTier(currentTier)) {
    return `Holds "${currentTier}", not a one-time tier. Access kept`;
  }
  if (existing.polarOrderId !== orderId) {
    console.warn(
      `[billing] Refund of order ${orderId} for ${clerkUserId} does not match the ` +
        `order that granted "${currentTier}". Access kept; check by hand.`
    );
    return `Order does not match the "${currentTier}" grant. Access kept`;
  }

  await client.users.updateUserMetadata(clerkUserId, {
    publicMetadata: { plan: "free", planExpiresAt: null, seats: null, polarOrderId: null },
  });
  await mirrorToSupabase({
    clerkUserId,
    tier: "free",
    active: false,
    polarOrderId: orderId,
    revokedReason: "order.refunded",
  });
  return `Full refund of the "${currentTier}" order. Revoked`;
}

/**
 * Mirror to Supabase for reporting and exports.
 *
 * Never throws. Clerk is the source of truth; if this write fails the customer
 * still has the access they paid for, and a failed mirror must not turn into a
 * webhook 500 that makes Polar retry a grant that already succeeded.
 */
async function mirrorToSupabase(args: {
  clerkUserId: string;
  tier: EntitlementTier;
  active: boolean;
  seats?: number;
  polarCustomerId?: string;
  polarSubscriptionId?: string;
  polarOrderId?: string;
  currentPeriodEnd?: string | null;
  revokedReason?: string;
}): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("entitlements").upsert(
      {
        clerk_user_id: args.clerkUserId,
        tier: args.tier,
        active: args.active,
        seats: args.seats ?? null,
        polar_customer_id: args.polarCustomerId ?? null,
        polar_subscription_id: args.polarSubscriptionId ?? null,
        polar_order_id: args.polarOrderId ?? null,
        current_period_end: args.currentPeriodEnd ?? null,
        revoked_reason: args.revokedReason ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "clerk_user_id" }
    );
    if (error) console.error("[billing] Supabase mirror failed:", error.message);
  } catch (e) {
    console.error("[billing] Supabase mirror threw:", e);
  }
}

/**
 * Append-only audit trail of every billing event we acted on.
 *
 * Worth the extra write: when a customer disputes what they were charged or
 * when access appears wrong, the alternative to this table is reading Polar's
 * dashboard and guessing what our webhook did with each event.
 */
export async function logBillingEvent(args: {
  eventType: string;
  clerkUserId: string | null;
  polarCustomerId?: string | null;
  productId?: string | null;
  detail?: string;
}): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("billing_events").insert({
      event_type: args.eventType,
      clerk_user_id: args.clerkUserId,
      polar_customer_id: args.polarCustomerId ?? null,
      product_id: args.productId ?? null,
      detail: args.detail ?? null,
    });
  } catch (e) {
    console.error("[billing] event log failed:", e);
  }
}

/** Read a user's current tier from the source of truth. */
export async function currentTier(clerkUserId: string): Promise<EntitlementTier> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(clerkUserId);
    const plan = (user.publicMetadata as Record<string, unknown> | null)?.plan;
    return (plan as EntitlementTier) ?? "free";
  } catch {
    return "free";
  }
}
