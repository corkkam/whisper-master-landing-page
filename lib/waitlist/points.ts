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
