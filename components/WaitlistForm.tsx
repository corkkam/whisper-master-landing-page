"use client";

import { useId, useState, type FormEvent } from "react";
import { useJoin } from "./waitlist/JoinContext";
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
