/**
 * Whisper Master — pricing source of truth.
 *
 * Nothing charges money yet: the app is free during beta and no processor is
 * wired. But the *numbers* are decided and published, for two reasons:
 *
 *   1. `lib/waitlist/points.ts` promises "1 Month Pro" and "Lifetime Pro" as
 *      referral rewards. Those promises are meaningless — and arguably
 *      misleading — until "Pro" has a price attached. Publishing the number is
 *      what makes the milestone honourable.
 *   2. Silence on price reads as "they'll charge me later and I don't know how
 *      much", which is a worse conversion story than any actual number.
 *
 * ── Why two currencies, not one converted at spot rate ────────────────────
 * We sell from India to both India and the rest of the world. A flat $12/mo is
 * about ₹1,050 — far above what the Indian prosumer market bears, and it would
 * price out the founder's own home market. The INR figures below are
 * purchasing-power adjusted (roughly a third of the USD figure), not converted.
 * This is standard practice and is why the two columns will never reconcile at
 * any exchange rate.
 *
 * Anchors checked against the actual competitive set (all Mac dictation, all
 * on-device or hybrid): Superwhisper ~$8.49/mo or $249 lifetime, MacWhisper
 * ~€59 one-time, Wispr Flow ~$12/mo. We sit at the top of the subscription
 * band and well below Superwhisper's lifetime, because lifetime is the tier
 * this audience actually converts on.
 */

export type Currency = "usd" | "inr";

export const CURRENCIES: Record<
  Currency,
  { code: Currency; label: string; symbol: string }
> = {
  usd: { code: "usd", label: "USD", symbol: "$" },
  inr: { code: "inr", label: "INR", symbol: "₹" },
};

export type Plan = {
  key: "free" | "pro" | "lifetime";
  /**
   * Which entry in `lib/billing/plans.ts` a "Buy" button starts a checkout for.
   * Absent on the free tier, which has nothing to sell. Kept as a slug rather
   * than a Polar product id so the id never reaches the browser and the set of
   * purchasable things stays decided on the server.
   */
  checkoutSlug?: "pro_monthly" | "pro_yearly" | "lifetime";
  name: string;
  /** Headline price per currency. `null` renders as the free price. */
  price: Record<Currency, string | null>;
  /** Billing period shown beside the price. */
  period: string;
  /** The secondary line under the price — annual equivalent, or framing. */
  sub: Record<Currency, string>;
  features: string[];
  /** Small print under the divider. */
  note: string;
  featured?: boolean;
};

export const plans: Plan[] = [
  {
    key: "free",
    name: "Free",
    price: { usd: null, inr: null },
    period: "forever",
    sub: {
      usd: "No card, no trial timer, no nagging.",
      inr: "No card, no trial timer, no nagging.",
    },
    features: [
      "Unlimited on-device dictation during beta",
      "The full cleanup layer — filler removal, number formatting, self-corrections",
      "Works completely offline",
      "Every accuracy improvement we ship",
    ],
    note: "After beta: capped by dictation minutes, never by quality",
  },
  {
    key: "pro",
    checkoutSlug: "pro_monthly",
    name: "Pro",
    price: { usd: "$12", inr: "₹399" },
    period: "/month",
    sub: {
      usd: "or $96/year — two months free",
      inr: "or ₹3,499/year — two months free",
    },
    features: [
      "Everything in Free, uncapped",
      "Custom vocabulary and replacement rules",
      "Priority on new models as they land",
      "Support from the person who wrote the app",
    ],
    note: "Cancel any time · no lock-in",
    featured: true,
  },
  {
    key: "lifetime",
    checkoutSlug: "lifetime",
    name: "Lifetime",
    price: { usd: "$149", inr: "₹5,999" },
    period: "once",
    sub: {
      usd: "One payment. Every future update.",
      inr: "One payment. Every future update.",
    },
    features: [
      "Everything in Pro, permanently",
      "All future updates included",
      "No subscription to remember or cancel",
      "The tier the 100-referral milestone unlocks",
    ],
    note: "For people who are done with subscriptions",
  },
];

/**
 * ── Organisation pricing ──────────────────────────────────────────────────
 *
 * WHY THESE TIERS EXIST AT ALL
 * The plans above sell to a person who finds typing slow. That market is
 * crowded and price-anchored downwards: Superwhisper is ~$8.49/mo, MacWhisper
 * is a one-time €59, and both are already on-device. Competing there means
 * winning on brand and distribution against incumbents who have both, with
 * neither.
 *
 * The tiers below sell to a *firm* that is professionally prohibited from using
 * any of them. A litigation practice or a clinic does not compare us to
 * Superwhisper; it compares us to Dragon (~$99/user/month, cloud-backed) or to
 * not dictating at all. That is a different price ladder, a different buyer, and
 * — critically for a solo founder — a deal size that justifies a human
 * conversation. Nine seats at the Practice tier is worth more annually than
 * three hundred consumer subscriptions, and it churns far less.
 *
 * WHY THE REGULATED TIER COSTS 2× THE TEAM TIER
 * Not because the dictation is better — it is identical. The premium buys the
 * things that make it *deployable* in a regulated environment: a signed data
 * processing agreement, telemetry disabled by enforced policy rather than by a
 * user-toggleable setting, managed deployment, and a named human who answers
 * security questionnaires. Those are real, unavoidable costs of serving this
 * buyer, and they are precisely what no consumer dictation app will do.
 *
 * HONESTY CONSTRAINT
 * Every line below has to survive contact with a compliance officer. Nothing
 * here should promise an artifact that does not exist — SOC 2 in particular is
 * deliberately absent. The page that used to say so in plain text was
 * /for-teams; it was removed with the lead funnel, so whoever restores a
 * multi-seat surface owes that disclosure a new home.
 */
export type TeamPlan = {
  key: "team" | "regulated" | "enterprise";
  name: string;
  price: Record<Currency, string>;
  period: string;
  sub: Record<Currency, string>;
  features: string[];
  note: string;
  featured?: boolean;
};

export const teamPlans: TeamPlan[] = [
  {
    key: "team",
    name: "Team",
    price: { usd: "$19", inr: "₹649" },
    period: "/seat/month",
    sub: {
      usd: "billed annually · minimum 3 seats",
      inr: "per seat/month, billed annually",
    },
    features: [
      "Everything in Pro, for every seat",
      "One invoice, central billing, reassignable seats",
      "Shared custom vocabulary across the team",
      "Analytics and usage sync switchable org-wide",
      "Email support with a named human",
    ],
    note: "For teams who want central billing, not a compliance posture",
  },
  {
    key: "regulated",
    name: "Practice",
    price: { usd: "$39", inr: "₹1,299" },
    period: "/seat/month",
    sub: {
      usd: "billed annually · minimum 3 seats",
      inr: "per seat/month, billed annually",
    },
    features: [
      "Everything in Team",
      "Regulated Mode — all telemetry off by enforced policy, not a setting",
      "Signed data processing agreement (GDPR Art. 28 / DPDP)",
      "Written architecture note for your security review",
      "Managed deployment and pinned update channel",
      "We answer your security questionnaire, in writing",
    ],
    note: "For law, healthcare, therapy and finance · roughly 60% under Dragon",
    featured: true,
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: { usd: "Let's talk", inr: "Let's talk" },
    period: "",
    sub: {
      usd: "50+ seats, or procurement requirements",
      inr: "50+ seats, or procurement requirements",
    },
    features: [
      "Everything in Practice",
      "Volume pricing",
      "MDM / configuration-profile deployment",
      "Internal model and update mirror",
      "Custom vocabulary built from your own terminology",
    ],
    note: "No SOC 2 report today — ask us where that sits",
  },
];

/**
 * Countries that see INR by default. Kept deliberately to India alone — PPP
 * pricing offered too broadly is arbitrage, and the discount stops being
 * defensible to the customers paying full price.
 */
export const INR_COUNTRIES = new Set(["IN"]);

export function defaultCurrencyForCountry(country: string | null): Currency {
  return country && INR_COUNTRIES.has(country.toUpperCase()) ? "inr" : "usd";
}
