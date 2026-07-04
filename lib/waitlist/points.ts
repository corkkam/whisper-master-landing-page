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
  // Donation points — awarded server-side when payment webhook fires
  donationSupporter: 300,   // ~$5  — jumps ~3 spots
  donationChampion: 1000,   // ~$15 — jumps ~10 spots
  donationFounder: 5000,    // ~$50 — jumps ~50 spots
} as const;

export type Milestone = {
  referrals: number;
  label: string;
  key: "beta" | "priority" | "pro_1mo" | "founder" | "lifetime";
};

export const MILESTONES: Milestone[] = [
  { referrals: 3, label: "Early Beta Access", key: "beta" },
  { referrals: 10, label: "Priority Beta Access", key: "priority" },
  { referrals: 25, label: "1 Month Pro", key: "pro_1mo" },
  { referrals: 50, label: "Founder Badge", key: "founder" },
  { referrals: 100, label: "Lifetime Pro", key: "lifetime" },
];

/** The next milestone a user hasn't hit yet (null once they've maxed out). */
export function nextMilestone(referrals: number): Milestone | null {
  return MILESTONES.find((m) => referrals < m.referrals) ?? null;
}

/** Donation tiers — payment integration to be wired up separately. */
export const DONATION_TIERS = [
  {
    key: "supporter" as const,
    label: "Supporter",
    amount: 5,
    points: POINTS.donationSupporter,
    perk: "Jump ~3 spots",
    color: "text-white/70",
  },
  {
    key: "champion" as const,
    label: "Champion",
    amount: 15,
    points: POINTS.donationChampion,
    perk: "Jump ~10 spots",
    color: "text-accent-300",
  },
  {
    key: "founder" as const,
    label: "Founder",
    amount: 50,
    points: POINTS.donationFounder,
    perk: "Jump ~50 spots + Founder badge",
    color: "text-yellow-400",
  },
] as const;

export type DonationTierKey = (typeof DONATION_TIERS)[number]["key"];
