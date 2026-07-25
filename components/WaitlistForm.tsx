"use client";

import { useId, useState, type FormEvent } from "react";
import { useJoin } from "./waitlist/JoinContext";
import { useWaitlistStatus } from "./waitlist/useWaitlistStatus";
import { nextMilestone } from "@/lib/waitlist/points";
import { EMAIL_AUTH_ENABLED } from "@/lib/config";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function WaitlistForm({
  id,
}: {
  variant?: "hero" | "band";
  id?: string;
}) {
  const reactId = useId();
  const inputId = id ?? `waitlist-${reactId}`;
  const { open } = useJoin();
  const { dash, ready, isSignedIn } = useWaitlistStatus();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (value && !EMAIL_RE.test(value)) {
      setError("Enter a valid email address.");
      return;
    }
    open({ email: value });
  }

  // Approved off the waitlist — the queue is over for them, so the hero CTA
  // becomes the download itself.
  if (dash?.approved) {
    return (
      <div className="waitlist-status">
        <div className="waitlist-status-rank">
          <strong aria-hidden="true">✓</strong>
          <span>Approved</span>
        </div>
        <div className="waitlist-status-info">
          <p>
            You&apos;re in
            {dash.fullName ? `, ${dash.fullName.split(" ")[0]}` : ""}.
          </p>
          <p className="waitlist-status-next">
            Beta and stable builds are both unlocked.
          </p>
        </div>
        <a className="waitlist-btn" href="/download">
          Download <span aria-hidden="true">↓</span>
        </a>
      </div>
    );
  }

  // Already on the list (same browser, Clerk session cached) — no email input,
  // just their spot and how far the next referral reward is.
  if (dash) {
    const next = nextMilestone(dash.referralsCount);
    const remaining = next ? next.referrals - dash.referralsCount : 0;
    return (
      <div className="waitlist-status">
        <div className="waitlist-status-rank">
          <strong>{dash.rank ? `#${dash.rank}` : "—"}</strong>
          <span>Your spot</span>
        </div>
        <div className="waitlist-status-info">
          <p>
            You&apos;re on the list
            {dash.fullName ? `, ${dash.fullName.split(" ")[0]}` : ""}.
          </p>
          <p className="waitlist-status-next">
            {next
              ? `${remaining} referral${remaining === 1 ? "" : "s"} away from ${next.label}`
              : "All rewards unlocked 🏆"}
          </p>
        </div>
        <button className="waitlist-btn" onClick={() => open()}>
          Boost my spot <span aria-hidden="true">↗</span>
        </button>
      </div>
    );
  }

  // Signed in but never finished joining — skip the email field, the modal
  // resumes at the details step.
  if (isSignedIn && ready) {
    return (
      <div className="waitlist-btn-wrap">
        <button className="waitlist-btn" onClick={() => open()}>
          Finish claiming your spot <span aria-hidden="true">↗</span>
        </button>
      </div>
    );
  }

  // Google-only mode: single CTA button, no misleading email field.
  if (!EMAIL_AUTH_ENABLED) {
    return (
      <div className="waitlist-btn-wrap">
        <button className="waitlist-btn" onClick={() => open()}>
          Get early access <span aria-hidden="true">↗</span>
        </button>
      </div>
    );
  }

  return (
    <div>
      <form className="waitlist-form" onSubmit={handleSubmit} noValidate>
        <label className="sr-only" htmlFor={inputId}>
          Work email
        </label>
        <input
          id={inputId}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          aria-invalid={!!error}
          aria-describedby={error ? "email-error" : undefined}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError("");
          }}
        />
        <button type="submit">
          Get early access <span aria-hidden="true">↗</span>
        </button>
      </form>
      {error && (
        <p className="form-error" id="email-error">
          {error}
        </p>
      )}
    </div>
  );
}
