"use server";

// Founder-side pipeline mutations.
//
// SECURITY: like every `"use server"` module, each export here is a public HTTP
// endpoint. Unlike lib/leads/actions.ts — which is unauthenticated on purpose
// because the enquirer is a stranger — every function in this file MUST prove
// the caller is the founder before it touches anything. `requireAdmin()` throws
// on failure rather than returning a boolean, so a missing check is a crash
// rather than a silent authorisation bypass.

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import {
  setLeadStage,
  updateLeadFields,
  type LeadStage,
  LEAD_STAGES,
} from "./queries";

export async function moveLeadStage(
  leadId: number,
  stage: string,
  detail?: string
): Promise<{ ok: boolean }> {
  await requireAdmin();

  // Validate against the known set rather than trusting the string — the DB has
  // a CHECK constraint too, but failing here gives a clean result instead of a
  // 500 from Postgres.
  if (!LEAD_STAGES.includes(stage as LeadStage)) return { ok: false };
  if (!Number.isSafeInteger(leadId) || leadId <= 0) return { ok: false };

  const res = await setLeadStage(leadId, stage as LeadStage, detail);
  revalidatePath("/admin/pipeline");
  return res;
}

export async function saveLeadNote(
  leadId: number,
  fields: {
    ownerNote?: string;
    nextAction?: string;
    nextActionAt?: string;
    dealValueUsd?: number | null;
    lostReason?: string;
  }
): Promise<{ ok: boolean }> {
  await requireAdmin();
  if (!Number.isSafeInteger(leadId) || leadId <= 0) return { ok: false };

  const res = await updateLeadFields(leadId, {
    ...(fields.ownerNote !== undefined ? { owner_note: fields.ownerNote.slice(0, 4000) } : {}),
    ...(fields.nextAction !== undefined ? { next_action: fields.nextAction.slice(0, 500) } : {}),
    ...(fields.nextActionAt !== undefined
      ? { next_action_at: fields.nextActionAt || null }
      : {}),
    ...(fields.dealValueUsd !== undefined ? { deal_value_usd: fields.dealValueUsd } : {}),
    ...(fields.lostReason !== undefined ? { lost_reason: fields.lostReason.slice(0, 500) } : {}),
  });

  revalidatePath("/admin/pipeline");
  return res;
}
