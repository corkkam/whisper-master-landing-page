/**
 * Display-side mirror of the point values awarded in `supabase/migrations/0002_viral.sql`.
 * SQL is the source of truth for *awarding* points (anti-cheat); this drives UI copy.
 * If you change values, change them in both places.
 */
export const POINTS = {
  join: 100,
  emailVerify: 50,
  referral: 200,
  shareX: 25,
  shareLinkedIn: 25,
  // Donation points were removed along with the donation tiers. The SQL in
  // 0002_viral.sql still defines the award function; it is simply never called
  // now that nothing can pay. Leave it — dropping it is a migration, and an
  // uncalled function is harmless.
} as const;

export type Milestone = {
  referrals: number;
  label: string;
  key: "beta" | "priority" | "pro_1mo" | "founder" | "lifetime";
  /**
   * What the reward is actually worth, in the words we'd use on an invoice.
   * A reward with no stated value is a placeholder, and a waitlist that
   * accrues placeholders accrues liability. Every figure here traces to a
   * published number on /pricing — if you change one, change both.
   */
  worth?: string;
};

export const MILESTONES: Milestone[] = [
  { referrals: 3, label: "Early Beta Access", key: "beta" },
  { referrals: 10, label: "Priority Beta Access", key: "priority" },
  { referrals: 25, label: "1 Month Pro", key: "pro_1mo", worth: "worth $12" },
  { referrals: 50, label: "Founder Badge", key: "founder" },
  { referrals: 100, label: "Lifetime Pro", key: "lifetime", worth: "worth $149" },
];

/** The next milestone a user hasn't hit yet (null once they've maxed out). */
export function nextMilestone(referrals: number): Milestone | null {
  return MILESTONES.find((m) => referrals < m.referrals) ?? null;
}

// ── Donation tiers: removed, deliberately ───────────────────────────────────
//
// There used to be $5 / $15 / $50 "skip the queue" tiers here. They are gone
// for three reasons, in ascending order of importance:
//
//   1. They did not work. No processor was ever wired, so `startDonationCheckout`
//      returned "Payment integration coming soon" — every click on a payment
//      button produced an error message. Asking for money and then failing is
//      worse than not asking.
//   2. "Pay to skip the queue" contradicts "free during beta". Once downloads
//      are public there is no queue to skip, and the offer becomes nonsense.
//   3. Charging for queue position before charging for the product trains the
//      wrong expectation and muddies the first real pricing conversation.
//
// If a "support the work" tier comes back later, it belongs on /pricing next to
// the real plans, not bolted onto the waitlist. See docs/10-monetization.md.
