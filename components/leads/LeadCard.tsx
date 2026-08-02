"use client";

import { useState, useTransition } from "react";
import { moveLeadStage, saveLeadNote } from "@/lib/leads/admin-actions";
// From ./stages, not ./queries — queries.ts is `server-only` and importing it
// here would (correctly) fail the build by pulling the service-role data layer
// into the client bundle.
import { LEAD_STAGES, STAGE_LABEL, type LeadRow } from "@/lib/leads/stages";

/**
 * One row of the pipeline, expandable into the full record.
 *
 * Collapsed by default and showing only what triages a lead in one glance —
 * score, firm, seats, and the next action. A pipeline UI that renders every
 * field for every lead is a pipeline UI that stops being opened, and an unopened
 * pipeline is worse than a spreadsheet.
 */
export default function LeadCard({ lead }: { lead: LeadRow }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [note, setNote] = useState(lead.owner_note ?? "");
  const [next, setNext] = useState(lead.next_action ?? "");
  const [nextAt, setNextAt] = useState(lead.next_action_at ?? "");
  const [value, setValue] = useState(
    lead.deal_value_usd != null ? String(lead.deal_value_usd) : ""
  );
  const [saved, setSaved] = useState(false);

  const overdue =
    lead.next_action_at != null &&
    lead.next_action_at < new Date().toISOString().slice(0, 10) &&
    lead.stage !== "won" &&
    lead.stage !== "lost";

  function move(stage: string) {
    start(async () => {
      await moveLeadStage(lead.id, stage);
    });
  }

  function save() {
    start(async () => {
      await saveLeadNote(lead.id, {
        ownerNote: note,
        nextAction: next,
        nextActionAt: nextAt,
        dealValueUsd: value.trim() === "" ? null : Number(value) || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <article className={`pl-card pl-card--${lead.band}${overdue ? " pl-card--overdue" : ""}`}>
      <button className="pl-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="pl-score" title={`${lead.band} lead`}>{lead.score}</span>
        <span className="pl-ident">
          <strong>{lead.organisation ?? lead.full_name}</strong>
          <em>
            {lead.full_name}
            {lead.role ? ` · ${lead.role}` : ""} · {lead.vertical}
          </em>
        </span>
        <span className="pl-meta">
          <i className="pl-seats">{lead.seats}</i>
          <i className={`pl-stage pl-stage--${lead.stage}`}>{STAGE_LABEL[lead.stage]}</i>
        </span>
      </button>

      {lead.next_action && (
        <p className={`pl-next${overdue ? " pl-next--overdue" : ""}`}>
          <span>Next</span> {lead.next_action}
          {lead.next_action_at ? ` — due ${lead.next_action_at}` : ""}
        </p>
      )}

      {open && (
        <div className="pl-body">
          <dl className="pl-facts">
            <div>
              <dt>Email</dt>
              <dd><a href={`mailto:${lead.email}`}>{lead.email}</a></dd>
            </div>
            {lead.phone && (
              <div><dt>Phone</dt><dd>{lead.phone}</dd></div>
            )}
            <div><dt>Timeline</dt><dd>{lead.timeline}</dd></div>
            {lead.current_tool && (
              <div><dt>Uses today</dt><dd>{lead.current_tool}</dd></div>
            )}
            {lead.country && <div><dt>Country</dt><dd>{lead.country}</dd></div>}
            <div><dt>Source</dt><dd>{lead.source ?? "—"}</dd></div>
            <div><dt>Enquired</dt><dd>{lead.created_at.slice(0, 10)}</dd></div>
            {lead.clerk_user_id && (
              <div><dt>Product user</dt><dd className="pl-yes">Yes — already using the app</dd></div>
            )}
          </dl>

          {lead.compliance_driver && (
            <div className="pl-quote">
              <span>Why on-device</span>
              <p>{lead.compliance_driver}</p>
            </div>
          )}

          {lead.notes && (
            <div className="pl-quote pl-quote--dim">
              <span>Their notes</span>
              <p>{lead.notes}</p>
            </div>
          )}

          <div className="pl-stages">
            {LEAD_STAGES.map((s) => (
              <button
                key={s}
                disabled={pending || s === lead.stage}
                onClick={() => move(s)}
                className={`pl-stage-btn${s === lead.stage ? " is-current" : ""}`}
              >
                {STAGE_LABEL[s]}
              </button>
            ))}
          </div>

          <div className="pl-edit">
            <label>
              <span>Next action</span>
              <input value={next} onChange={(e) => setNext(e.target.value)} maxLength={500} />
            </label>
            <label>
              <span>Due</span>
              <input type="date" value={nextAt ?? ""} onChange={(e) => setNextAt(e.target.value)} />
            </label>
            <label>
              <span>Deal value (USD/yr)</span>
              <input
                inputMode="numeric"
                value={value}
                onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </label>
            <label className="pl-edit--wide">
              <span>Your notes</span>
              <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <button className="btn btn--primary" onClick={save} disabled={pending}>
              {pending ? "Saving…" : saved ? "Saved" : "Save"}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
