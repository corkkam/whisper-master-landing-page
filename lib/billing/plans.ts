/**
 * The purchasable catalogue — the bridge between the prices published in
 * `lib/pricing.ts` and the product ids that exist inside Polar.
 *
 * WHY PRODUCT IDS COME FROM THE ENVIRONMENT
 * Polar issues different product ids in sandbox and production. Hard-coding
 * them would mean either testing against production billing or shipping code
 * that charges nobody. Reading them from env keeps one code path across both.
 *
 * WHY THERE IS A SERVER-SIDE ALLOW-LIST AT ALL
 * `@polar-sh/nextjs`'s stock `Checkout` handler takes the product id straight
 * from a query parameter. That is fine for a storefront, but it means the
 * browser decides what is being sold — including products that are not meant
 * to be self-serve, and any product in the organisation. Our checkout route
 * accepts a *slug* from this table instead and resolves the id server-side, so
 * the set of things a stranger can buy is exactly the set enumerated here.
 */

export type PlanSlug =
  | "pro_monthly"
  | "pro_yearly"
  | "lifetime"
  | "team"
  | "practice";

/**
 * The durable entitlement a purchase produces. This is what gets written to
 * Clerk `publicMetadata.plan` and what the Mac app reads.
 *
 * Ordered by precedence — see `outranks()`. Precedence matters because a user
 * can hold more than one thing over time (buy Pro, later buy Lifetime), and a
 * webhook for the *older* one must never downgrade the newer.
 */
export type EntitlementTier = "free" | "pro" | "lifetime" | "team" | "practice";

const TIER_RANK: Record<EntitlementTier, number> = {
  free: 0,
  pro: 1,
  team: 2,
  practice: 3,
  lifetime: 4,
};

/** Does `a` grant at least as much as `b`? */
export function outranks(a: EntitlementTier, b: EntitlementTier): boolean {
  return TIER_RANK[a] >= TIER_RANK[b];
}

export type PlanDefinition = {
  slug: PlanSlug;
  tier: EntitlementTier;
  /** Env var holding the Polar product id. */
  envKey: string;
  /** One-time purchase rather than a subscription — changes which webhook grants it. */
  oneTime: boolean;
  /**
   * Whether a stranger may buy this without talking to us.
   *
   * `false` for Team and Practice deliberately. The Practice tier promises a
   * signed DPA and a written answer to a security questionnaire — commitments
   * that require a human to have read the questionnaire first. Selling that
   * self-serve would be selling something we have not yet agreed to do. These
   * tiers used to route through /for-teams; that form is gone, so /api/checkout
   * now answers with the contact address and the founder generates a checkout
   * link once the conversation has happened.
   */
  selfServe: boolean;
  /** Polar's native per-seat quantity. Only meaningful for seat-based plans. */
  seatBased: boolean;
};

export const PLANS: Record<PlanSlug, PlanDefinition> = {
  pro_monthly: {
    slug: "pro_monthly",
    tier: "pro",
    envKey: "POLAR_PRODUCT_PRO_MONTHLY",
    oneTime: false,
    selfServe: true,
    seatBased: false,
  },
  pro_yearly: {
    slug: "pro_yearly",
    tier: "pro",
    envKey: "POLAR_PRODUCT_PRO_YEARLY",
    oneTime: false,
    selfServe: true,
    seatBased: false,
  },
  lifetime: {
    slug: "lifetime",
    tier: "lifetime",
    envKey: "POLAR_PRODUCT_LIFETIME",
    oneTime: true,
    selfServe: true,
    seatBased: false,
  },
  team: {
    slug: "team",
    tier: "team",
    envKey: "POLAR_PRODUCT_TEAM",
    oneTime: false,
    selfServe: false,
    seatBased: true,
  },
  practice: {
    slug: "practice",
    tier: "practice",
    envKey: "POLAR_PRODUCT_PRACTICE",
    oneTime: false,
    selfServe: false,
    seatBased: true,
  },
};

export function isPlanSlug(v: string): v is PlanSlug {
  return Object.prototype.hasOwnProperty.call(PLANS, v);
}

/** Resolve a slug to its configured Polar product id, or null if unconfigured. */
export function productIdFor(slug: PlanSlug): string | null {
  return process.env[PLANS[slug].envKey]?.trim() || null;
}

/**
 * Reverse lookup: which tier does this Polar product id grant?
 *
 * Used by the webhook, which is told a product id and must decide what to
 * unlock. Returns null for an unrecognised product — which is the correct
 * response to a webhook for something we do not sell, rather than guessing.
 */
export function tierForProductId(productId: string): EntitlementTier | null {
  for (const plan of Object.values(PLANS)) {
    if (productIdFor(plan.slug) === productId) return plan.tier;
  }
  return null;
}

/** Sandbox unless explicitly told otherwise — the safe default to fail into. */
export function polarServer(): "sandbox" | "production" {
  return process.env.POLAR_SERVER === "production" ? "production" : "sandbox";
}

/**
 * Is self-serve checkout live?
 *
 * Derived from configuration rather than being its own feature flag, so there
 * is nothing to forget to flip. Checkout appears exactly when an access token
 * and at least one self-serve product id exist, and disappears if they are
 * removed.
 *
 * This matters because doc 10 §10.6 records a deliberate decision that the beta
 * is free — charging before retention is proven optimises the wrong number. The
 * plumbing being finished should not silently start billing people. Leave the
 * `POLAR_PRODUCT_*` vars unset and `/pricing` keeps saying "free during beta",
 * which is what it says today and what it should keep saying until the founder
 * decides otherwise.
 *
 * Server-side only — `process.env` is not populated in the browser, so this
 * must be evaluated in a server component and passed down as a prop.
 */
export function selfServeCheckoutReady(): boolean {
  if (!process.env.POLAR_ACCESS_TOKEN?.trim()) return false;
  return Object.values(PLANS).some((p) => p.selfServe && productIdFor(p.slug));
}
