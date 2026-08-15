// Beta-queue vocabulary and row shape — shared by server and client.
//
// Split out of `./queue.ts` because the queue UI is a client component (it has
// expand state and optimistic approve buttons) and it needs the row type and
// the filter list. If those lived in `./queue.ts`,
// importing them would drag the Clerk secret key and the service-role Supabase
// client into the client graph — which `server-only` correctly refuses.
//
// The type alone would be erased at compile time, but `BETA_FILTERS` and the
// label map are runtime values, so the split has to be real.

/**
 * The three states an account can be in, plus "all".
 *
 * `waiting` is the one that matters: the person asked for early access and has
 * not been approved. `no-request` is an account that signed up for the stable
 * build and never asked for beta — they are not a queue, they are the userbase,
 * and mixing the two makes the queue look permanently full.
 */
export type BetaFilter = "waiting" | "approved" | "no-request" | "all";

export const BETA_FILTERS: BetaFilter[] = ["waiting", "approved", "no-request", "all"];

export const BETA_FILTER_LABEL: Record<BetaFilter, string> = {
  waiting: "Waiting",
  approved: "Approved",
  "no-request": "No request",
  all: "All accounts",
};

export function parseBetaFilter(raw: string | undefined): BetaFilter {
  return BETA_FILTERS.includes(raw as BetaFilter) ? (raw as BetaFilter) : "waiting";
}

/**
 * One account, as the admin surface sees it.
 *
 * Assembled from two sources that answer different questions. Clerk is the
 * authority on *who has an account* and *whether they are approved*
 * (`publicMetadata.betaAccess`); Supabase `waitlist_entries` is the record of
 * *what they told us when they asked*. An account with no Supabase row is a
 * stable-build user who never requested beta, and `requested` is false.
 *
 * Timestamps are ISO strings rather than Date objects because this crosses the
 * server/client boundary into a client component.
 */
export type BetaUserRow = {
  userId: string;
  email: string;
  name: string | null;
  /** Account creation, ISO. From Clerk, so it exists for every row. */
  createdAt: string;
  lastActiveAt: string | null;
  lastSignInAt: string | null;

  /** `publicMetadata.betaAccess` — the gate itself, not a mirror of it. */
  approved: boolean;
  betaJoinedAt: string | null;

  /** Did they fill in the early-access form? False means they never asked. */
  requested: boolean;
  requestedAt: string | null;
  company: string | null;
  role: string | null;
  platform: string | null;
  useCase: string | null;
  referralSource: string | null;
  points: number | null;
  position: number | null;
  referrals: number;
  /** Supabase's mirror of the gate. Drifts until someone reads their own page. */
  mirroredStatus: string | null;
};

export function matchesFilter(row: BetaUserRow, filter: BetaFilter): boolean {
  switch (filter) {
    case "waiting":
      return !row.approved && row.requested;
    case "approved":
      return row.approved;
    case "no-request":
      return !row.approved && !row.requested;
    case "all":
      return true;
  }
}

/** Display name, falling back through everything we might know. */
export function displayName(row: BetaUserRow): string {
  return row.name?.trim() || row.email || row.userId;
}
