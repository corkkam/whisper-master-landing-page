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
  duration = 6000,
}: {
  message: string;
  onDismiss: () => void;
  /** Auto-dismiss delay in ms. */
  duration?: number;
}) {
  // Re-armed whenever the message changes, so a second toast in the same
  // session gets a full window rather than inheriting the first one's timer.
  useEffect(() => {
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [message, duration, onDismiss]);

  return (
    // `status` + polite: announced without stealing focus from the page the
    // user just got back to.
    <div className="toast" role="status" aria-live="polite">
      <i className="rec-dot is-live" aria-hidden="true" />
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
