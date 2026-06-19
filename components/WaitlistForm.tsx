"use client";

import { useId, useState, type FormEvent } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowRightIcon, CheckIcon } from "./icons";

type Status = "idle" | "loading" | "success" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Stubbed waitlist capture with a fully working optimistic success UI.
 *
 * To connect a real provider, replace the body of `submitEmail` below:
 *
 *   // Formspree
 *   const res = await fetch("https://formspree.io/f/<your-id>", {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json", Accept: "application/json" },
 *     body: JSON.stringify({ email }),
 *   });
 *   if (!res.ok) throw new Error("failed");
 *
 *   // Loops / Resend / Supabase — POST to your own /api/waitlist route instead.
 */
async function submitEmail(email: string): Promise<void> {
  // TODO: connect to your waitlist provider (Formspree / Loops / Resend / Supabase).
  // Simulated network latency so loading + success states are demo-real.
  await new Promise((resolve) => setTimeout(resolve, 950));
  // Throw here to exercise the error state, e.g. `throw new Error("network");`
  if (!email) throw new Error("missing email");
}

export default function WaitlistForm({
  variant = "hero",
  id,
}: {
  variant?: "hero" | "band";
  id?: string;
}) {
  const reactId = useId();
  const inputId = id ?? `waitlist-${reactId}`;
  const reduce = useReducedMotion();

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === "loading") return;

    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    setStatus("loading");
    setMessage("");
    try {
      await submitEmail(value);
      setStatus("success");
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  const isBand = variant === "band";

  return (
    <div className="w-full">
      <AnimatePresence mode="wait" initial={false}>
        {status === "success" ? (
          <motion.div
            key="success"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="glass flex items-center gap-3 rounded-2xl px-5 py-4"
            role="status"
            aria-live="polite"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent-300 ring-1 ring-accent/30">
              <CheckIcon className="h-5 w-5" />
            </span>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">You&rsquo;re in.</p>
              <p className="text-sm text-white/55">
                Check your inbox — early access invites roll out weekly.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={false}
            onSubmit={handleSubmit}
            noValidate
            className="w-full"
          >
            <label htmlFor={inputId} className="sr-only">
              Email address
            </label>
            <div
              className={`glass group flex flex-col gap-2 rounded-2xl p-2 transition-shadow focus-within:shadow-glow sm:flex-row sm:items-center ${
                isBand ? "" : ""
              }`}
            >
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
                  if (status === "error") setStatus("idle");
                }}
                aria-invalid={status === "error"}
                aria-describedby={`${inputId}-status`}
                disabled={status === "loading"}
                className="w-full flex-1 rounded-xl bg-transparent px-4 py-3 text-base text-white placeholder:text-white/35 outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2 focus-visible:ring-offset-base-900 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {status === "loading" ? (
                  <>
                    <Spinner />
                    Joining…
                  </>
                ) : (
                  <>
                    Join the waitlist
                    <ArrowRightIcon className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
            <p
              id={`${inputId}-status`}
              aria-live="polite"
              className={`mt-2 min-h-[1.25rem] px-1 text-sm ${
                status === "error" ? "text-red-300" : "text-transparent"
              }`}
            >
              {status === "error" ? message : "."}
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        opacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
