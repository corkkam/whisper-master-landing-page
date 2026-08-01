"use client";

import { useEffect } from "react";
import { XIcon } from "@/components/icons";

/**
 * One transient confirmation, bottom-centre. Presentational only — whoever
 * renders it owns the message and decides when it goes away, so there's no
 * queue and no context to wire up.
 *
 * Bottom-*centre* on purpose: the cookie card is bottom-right (`.consent`),
 * so the two can never overlap.
 */
export default function Toast({
  message,
  onDismiss,
  variant = "success",
  duration,
}: {
  message: string;
  onDismiss: () => void;
  /** Failures read red and stay up longer — they usually ask for a retry. */
  variant?: "success" | "error";
  /** Auto-dismiss delay in ms. Defaults by variant. */
  duration?: number;
}) {
  const isError = variant === "error";
  const delay = duration ?? (isError ? 8000 : 6000);
  // Re-armed whenever the message changes, so a second toast in the same
  // session gets a full window rather than inheriting the first one's timer.
  useEffect(() => {
    const t = setTimeout(onDismiss, delay);
    return () => clearTimeout(t);
  }, [message, delay, onDismiss]);

  return (
    // Success is announced politely — it's a confirmation of something the user
    // already saw. A failure is an alert: it's the only place the reason
    // survives once the modal is gone.
    <div
      className={`toast${isError ? " toast--error" : ""}`}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
    >
      <i className={`rec-dot${isError ? "" : " is-live"}`} aria-hidden="true" />
      <p className="toast-copy">{message}</p>
      <button
        type="button"
        className="toast-close"
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        <XIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
