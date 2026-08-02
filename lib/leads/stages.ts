// Pipeline vocabulary — shared by server and client.
//
// This file exists purely so that `lib/leads/queries.ts` can stay `server-only`.
// The pipeline UI is a client component (it has expand/collapse state and
// optimistic stage buttons), and it needs the stage list and the row shape. If
// those lived in queries.ts, importing them would drag the whole service-role
// data layer into the client graph — which `server-only` correctly refuses to
// allow, and which would be a genuine leak if it ever succeeded.
//
// Types alone would be erased at compile time and could have stayed put, but
// `LEAD_STAGES` is a runtime value, so the split has to be real.

import type { LeadBand } from "./scoring";

export type LeadStage =
  | "new" | "qualified" | "demo" | "pilot" | "proposal" | "won" | "lost";

/** Order matters: this is the sequence the pipeline UI renders stages in. */
export const LEAD_STAGES: LeadStage[] = [
  "new", "qualified", "demo", "pilot", "proposal", "won", "lost",
];

export const STAGE_LABEL: Record<LeadStage, string> = {
  new: "New",
  qualified: "Qualified",
  demo: "Demo",
  pilot: "Pilot",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

/** Stages a deal can still move out of — used to compute "open pipeline". */
export const OPEN_STAGES: LeadStage[] = LEAD_STAGES.filter(
  (s) => s !== "won" && s !== "lost"
);

export type LeadRow = {
  id: number;
  email: string;
  full_name: string;
  organisation: string | null;
  role: string | null;
  phone: string | null;
  vertical: string;
  seats: string;
  compliance_driver: string | null;
  current_tool: string | null;
  timeline: string;
  notes: string | null;
  source: string | null;
  country: string | null;
  score: number;
  band: LeadBand;
  stage: LeadStage;
  owner_note: string | null;
  next_action: string | null;
  next_action_at: string | null;
  lost_reason: string | null;
  deal_value_usd: number | null;
  clerk_user_id: string | null;
  created_at: string;
  updated_at: string;
};
