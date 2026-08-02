import { Polar } from "@polar-sh/sdk";
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { isPlanSlug, PLANS, polarServer, productIdFor } from "@/lib/billing/plans";
import { siteUrl } from "@/lib/site";

/**
 * Start a Polar checkout.
 *
 * WHY THIS IS HAND-WRITTEN RATHER THAN `Checkout()` FROM @polar-sh/nextjs
 * The stock handler reads the product id straight out of a query parameter and
 * passes it to Polar. That makes the *browser* the authority on what is being
 * sold. Two concrete problems with that here:
 *
 *   1. Any product in the Polar organisation becomes purchasable by URL,
 *      including the Team and Practice tiers, which are deliberately not
 *      self-serve — the Practice tier promises a signed DPA and a written
 *      answer to a security questionnaire, and selling that without a human
 *      having read the questionnaire is selling something we have not agreed
 *      to do.
 *   2. It reads `customerExternalId` from the query string too, so the link
 *      that decides *whose account gets upgraded* would be client-controlled.
 *
 * So: the client sends a slug, we resolve the product id from a server-side
 * table, and the customer identity comes from the Clerk session. Neither is
 * negotiable from the browser.
 *
 * Requiring sign-in before checkout is deliberate and not merely convenient. A
 * licence has to attach to an identity — the Mac app unlocks by reading
 * `publicMetadata.plan` off the signed-in Clerk user. An anonymous purchase
 * would have nothing to attach to, and reconciling it later by email is the
 * kind of manual work a one-person company cannot absorb.
 */
export async function GET(req: NextRequest) {
  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  if (!accessToken) {
    console.error("[checkout] POLAR_ACCESS_TOKEN is not set");
    return NextResponse.json({ error: "Checkout is not configured yet." }, { status: 503 });
  }

  const slug = req.nextUrl.searchParams.get("plan") ?? "";
  if (!isPlanSlug(slug)) {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  }

  const plan = PLANS[slug];
  if (!plan.selfServe) {
    // Not an error the buyer caused — send them to the conversation this tier
    // actually requires rather than showing them a dead end.
    return NextResponse.redirect(new URL("/for-teams#enquire", siteUrl()));
  }

  const productId = productIdFor(slug);
  if (!productId) {
    console.error(`[checkout] ${plan.envKey} is not set — cannot sell "${slug}".`);
    return NextResponse.json({ error: "That plan is not on sale yet." }, { status: 503 });
  }

  const { userId } = await auth();
  if (!userId) {
    // Bounce through sign-in and come back to the same checkout.
    const signIn = new URL("/sign-in", siteUrl());
    signIn.searchParams.set("redirect_url", `/api/checkout?plan=${slug}`);
    return NextResponse.redirect(signIn);
  }

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress;

  // Seats only apply to seat-based plans, and are clamped. Unbounded input
  // here would let someone construct a checkout for 2 billion seats.
  let seats: number | undefined;
  if (plan.seatBased) {
    const raw = Number.parseInt(req.nextUrl.searchParams.get("seats") ?? "", 10);
    seats = Number.isFinite(raw) ? Math.min(Math.max(raw, 1), 500) : 1;
  }

  const polar = new Polar({ accessToken, server: polarServer() });

  const success = new URL("/welcome", siteUrl());
  success.searchParams.set("checkoutId", "{CHECKOUT_ID}");

  try {
    const checkout = await polar.checkouts.create({
      products: [productId],
      // The join between Polar and Clerk. Polar echoes this back on every
      // webhook for this customer, which is how the webhook knows whose
      // account to unlock without any email matching.
      externalCustomerId: userId,
      customerEmail: email,
      customerName: user?.fullName ?? undefined,
      // Redundant with externalCustomerId, deliberately: metadata survives on
      // the order/subscription object itself, which makes manual reconciliation
      // in the Polar dashboard possible when something has gone wrong.
      metadata: { clerkUserId: userId, plan: slug },
      ...(seats != null ? { seats } : {}),
      successUrl: decodeURI(success.toString()),
    });

    return NextResponse.redirect(checkout.url);
  } catch (e) {
    console.error("[checkout] Polar checkout creation failed:", e);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 502 }
    );
  }
}
