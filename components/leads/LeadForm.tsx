"use client";

import { useState } from "react";
import Turnstile from "@/components/waitlist/Turnstile";
import { submitLead } from "@/lib/leads/actions";
import {
  HONEYPOT_FIELD,
  SEAT_BANDS,
  TIMELINES,
  VERTICALS,
  type LeadInput,
} from "@/lib/leads/schema";

/**
 * The team enquiry form.
 *
 * Two design decisions worth defending, because both look like mistakes:
 *
 * 1. NO SIGN-IN. The rest of this site funnels everything through Clerk. This
 *    form deliberately does not. The person filling it in is evaluating vendors
 *    on behalf of a firm; asking them to create an account first is asking them
 *    to leave. Identity is captured opportunistically server-side if they
 *    happen to already be signed in.
 *
 * 2. ONE PAGE, NOT A WIZARD. Multi-step forms convert better for consumers
 *    because they hide length. For a B2B buyer the opposite holds — they want
 *    to see the whole ask before committing, and a wizard that reveals a fourth
 *    step reads as a trap. Five required fields, four optional, all visible.
 *
 * The optional fields are the interesting ones. They are not required precisely
 * because volunteering them is the buying signal the scorer rewards.
 */

const initial: LeadInput = {
  fullName: "",
  email: "",
  organisation: "",
  role: "",
  phone: "",
  vertical: "Law firm / legal",
  seats: "6–20",
  timeline: "Evaluating now",
  complianceDriver: "",
  currentTool: "",
  notes: "",
  source: "",
};

export default function LeadForm({ source = "for-teams" }: { source?: string }) {
  const [values, setValues] = useState<LeadInput>({ ...initial, source });
  const [honeypot, setHoneypot] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [band, setBand] = useState<"hot" | "warm" | "cold">("cold");

  function set<K extends keyof LeadInput>(key: K, v: LeadInput[K]) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    setError(null);

    const res = await submitLead({ ...values, source }, token, honeypot);

    if (res.ok) {
      setBand(res.band);
      setState("done");
    } else {
      setError(res.error);
      setState("idle");
    }
  }

  if (state === "done") {
    // The confirmation is tiered by band, because the promise has to be one we
    // can actually keep. Telling every enquiry "we'll call you within a day"
    // and then not doing so for the low-intent ones is worse than saying
    // nothing. Hot leads get a hard commitment; the rest get an honest one.
    return (
      <div className="lead-done">
        <p className="label">
          <i className="rec-dot" />
          Received
        </p>
        <h3>Thank you — that&rsquo;s everything we need.</h3>
        <p>
          {band === "hot" ? (
            <>
              This lands as a priority enquiry, so you&rsquo;ll hear from us{" "}
              <strong>within one working day</strong> — from the person who wrote
              the app, not a sales team, because there isn&rsquo;t one.
            </>
          ) : (
            <>
              We&rsquo;ll come back to you <strong>within three working days</strong>.
              It&rsquo;s a one-person company, so the reply will be a real one
              rather than a fast one.
            </>
          )}
        </p>
        <p className="lead-done-next">
          In the meantime, the two things every compliance review asks for are
          already public: <a href="/trust">exactly what leaves your Mac</a>, and{" "}
          <a href="https://whisper-eval-dashboard.vercel.app">
            our measured accuracy, including where it&rsquo;s weak
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form className="lead-form" onSubmit={onSubmit} noValidate>
      <div className="lead-grid">
        <label className="lead-field">
          <span>Your name <i>*</i></span>
          <input
            required
            value={values.fullName}
            onChange={(e) => set("fullName", e.target.value)}
            autoComplete="name"
            maxLength={120}
          />
        </label>

        <label className="lead-field">
          <span>Work email <i>*</i></span>
          <input
            required
            type="email"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            autoComplete="email"
            maxLength={200}
          />
        </label>

        <label className="lead-field">
          <span>Firm or organisation <i>*</i></span>
          <input
            required
            value={values.organisation}
            onChange={(e) => set("organisation", e.target.value)}
            autoComplete="organization"
            maxLength={200}
          />
        </label>

        <label className="lead-field">
          <span>Your role</span>
          <input
            value={values.role}
            onChange={(e) => set("role", e.target.value)}
            placeholder="Managing partner, practice manager, IT lead…"
            autoComplete="organization-title"
            maxLength={120}
          />
        </label>

        <label className="lead-field">
          <span>What kind of work <i>*</i></span>
          <select
            required
            value={values.vertical}
            onChange={(e) => set("vertical", e.target.value as LeadInput["vertical"])}
          >
            {VERTICALS.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </label>

        <label className="lead-field">
          <span>How many people would dictate <i>*</i></span>
          <select
            required
            value={values.seats}
            onChange={(e) => set("seats", e.target.value as LeadInput["seats"])}
          >
            {SEAT_BANDS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>

        <label className="lead-field">
          <span>Timeline <i>*</i></span>
          <select
            required
            value={values.timeline}
            onChange={(e) => set("timeline", e.target.value as LeadInput["timeline"])}
          >
            {TIMELINES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>

        <label className="lead-field">
          <span>Phone (optional)</span>
          <input
            value={values.phone}
            onChange={(e) => set("phone", e.target.value)}
            autoComplete="tel"
            maxLength={40}
          />
        </label>
      </div>

      <label className="lead-field lead-field--wide">
        <span>
          Why does the transcription need to stay on the device?
          <em>
            The more specific you are, the faster we can tell you whether we
            actually clear your bar — or whether we don&rsquo;t yet.
          </em>
        </span>
        <textarea
          rows={3}
          value={values.complianceDriver}
          onChange={(e) => set("complianceDriver", e.target.value)}
          placeholder="e.g. client matters are privileged and our PI insurer flagged cloud transcription; or: HIPAA, and our current vendor won't sign a BAA for the recording step"
          maxLength={600}
        />
      </label>

      <div className="lead-grid">
        <label className="lead-field">
          <span>What do you use today?</span>
          <input
            value={values.currentTool}
            onChange={(e) => set("currentTool", e.target.value)}
            placeholder="Dragon, Otter, a typist, nothing…"
            maxLength={200}
          />
        </label>

        <label className="lead-field">
          <span>Anything else</span>
          <input
            value={values.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Deployment questions, procurement, deadlines…"
            maxLength={2000}
          />
        </label>
      </div>

      {/* Honeypot — visually hidden, never focusable, never announced. */}
      <div className="lead-hp" aria-hidden="true">
        <label>
          Company website
          <input
            name={HONEYPOT_FIELD}
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </label>
      </div>

      <Turnstile onToken={setToken} />

      {error && <p className="lead-error" role="alert">{error}</p>}

      <div className="lead-actions">
        <button
          className="btn btn--primary btn--xl"
          type="submit"
          disabled={state === "sending"}
        >
          {state === "sending" ? "Sending…" : "Talk to us about your team"}
        </button>
        <p className="lead-fine">
          Goes straight to the founder. No sales sequence, no drip campaign —
          there is nobody here to run one.
        </p>
      </div>
    </form>
  );
}
