"use client";

import { useId, useState, type FormEvent } from "react";
import { useJoin } from "./waitlist/JoinContext";
import { ArrowRightIcon } from "./icons";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Hero / CTA email capture. Validates lightly, then hands off to the multi-step
 * JoinModal (auth → details → success) prefilled with whatever was typed.
 */
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
      setError("Please enter a valid email address.");
      return;
    }
    open({ email: value }); // empty is fine — the modal collects it
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} noValidate className="w-full">
        <label htmlFor={inputId} className="sr-only">
          Email address
        </label>
        <div className="glass group flex flex-col gap-2 rounded-2xl p-2 transition-shadow focus-within:shadow-glow sm:flex-row sm:items-center">
          <input
            id={inputId}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError("");
            }}
            className="w-full flex-1 rounded-xl bg-transparent px-4 py-3 text-base text-white placeholder:text-white/35 outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          />
          <button
            type="submit"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2 focus-visible:ring-offset-base-900"
          >
            Join the waitlist
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </div>
        <p
          aria-live="polite"
          className={`mt-2 min-h-[1.25rem] px-1 text-sm ${
            error ? "text-red-300" : "text-transparent"
          }`}
        >
          {error || "."}
        </p>
      </form>
    </div>
  );
}
