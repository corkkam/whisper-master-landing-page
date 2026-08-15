"use client";

import { useState, useTransition } from "react";
import { approveBetaUser, revokeBetaUser } from "@/lib/beta/admin-actions";

/**
 * The approve / revoke control, on its own so the queue row and the user detail
 * page share one implementation of what is, on this site, the highest-value
 * button there is.
 *
 * Reports a failed Supabase mirror as a mirror failure rather than as a failed
 * grant. Clerk is the gate, so access has already changed by then, and telling
 * the founder otherwise invites a second click on a write that already landed.
 */
export default function BetaActions({
  userId,
  approved,
  size = "sm",
}: {
  userId: string;
  approved: boolean;
  size?: "sm" | "lg";
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  function run(action: () => Promise<{ ok: boolean; mirrored?: boolean; error?: string }>) {
    setError(null);
    setWarning(null);
    start(async () => {
      const res = await action();
      if (!res.ok) {
        setError(res.error ?? "That did not go through. Try again.");
        return;
      }
      if (res.mirrored === false) {
        setWarning("Access changed. The Supabase status mirror did not update.");
      }
    });
  }

  return (
    <div className={`ad-actions ad-actions--${size}`}>
      {approved ? (
        <button
          className="ad-btn ad-btn--revoke"
          disabled={pending}
          onClick={() => run(() => revokeBetaUser(userId))}
        >
          {pending ? "Working" : "Revoke beta"}
        </button>
      ) : (
        <button
          className="ad-btn ad-btn--approve"
          disabled={pending}
          onClick={() => run(() => approveBetaUser(userId))}
        >
          {pending ? "Working" : "Approve for beta"}
        </button>
      )}
      {(error || warning) && (
        <p className={`ad-row-note${error ? " ad-row-note--error" : ""}`}>{error ?? warning}</p>
      )}
    </div>
  );
}
