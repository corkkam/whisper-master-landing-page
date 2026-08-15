"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { approveBetaUser, revokeBetaUser } from "@/lib/beta/admin-actions";
// From ./rows, not ./queue — queue.ts is `server-only` and importing it here
// would (correctly) fail the build by pulling the Clerk secret key and the
// service-role Supabase client into the browser bundle.
import { displayName, type BetaUserRow } from "@/lib/beta/rows";
import { daysAgo } from "@/lib/stats/derive";

/**
 * One account in the beta queue, expandable into everything we know.
 *
 * Collapsed it answers only the question the queue exists for: who is this,
 * how long have they waited, and do I let them in. Everything they typed into
 * the early-access form is one click down, because a queue that renders every
 * field for every row is a queue that stops being read.
 *
 * The approve control is a sibling of the expand control rather than inside
 * it. Nesting a button in a button is invalid, and more practically it makes
 * approving someone a two-step operation that opens a panel you did not want.
 */
export default function BetaRow({ row }: { row: BetaUserRow }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const state = row.approved ? "approved" : row.requested ? "waiting" : "none";
  const stateLabel = row.approved ? "Approved" : row.requested ? "Waiting" : "No request";

  function run(action: () => Promise<{ ok: boolean; mirrored?: boolean; error?: string }>) {
    setError(null);
    setWarning(null);
    start(async () => {
      const res = await action();
      if (!res.ok) {
        setError(res.error ?? "That did not go through. Try again.");
        return;
      }
      // The gate itself is Clerk, so the change is live even when the Supabase
      // mirror missed. Say so rather than implying the approval failed.
      if (res.mirrored === false) {
        setWarning("Access changed. The Supabase status mirror did not update.");
      }
    });
  }

  return (
    <article className={`ad-row ad-row--${state}`}>
      <div className="ad-row-head">
        <button
          className="ad-row-toggle"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <span className={`ad-state ad-state--${state}`}>{stateLabel}</span>
          <span className="ad-ident">
            <strong>{displayName(row)}</strong>
            <em>
              {row.email}
              {row.company ? ` / ${row.company}` : ""}
            </em>
          </span>
          <span className="ad-row-meta">
            {row.requested && !row.approved && <i className="ad-wait">{daysAgo(row.requestedAt)}</i>}
            {row.role && <i>{row.role}</i>}
            {row.referrals > 0 && <i className="ad-refs">{row.referrals} referred</i>}
          </span>
        </button>

        <div className="ad-row-act">
          {row.approved ? (
            <button
              className="ad-btn ad-btn--revoke"
              disabled={pending}
              onClick={() => run(() => revokeBetaUser(row.userId))}
            >
              {pending ? "Working" : "Revoke"}
            </button>
          ) : (
            <button
              className="ad-btn ad-btn--approve"
              disabled={pending}
              onClick={() => run(() => approveBetaUser(row.userId))}
            >
              {pending ? "Working" : "Approve"}
            </button>
          )}
        </div>
      </div>

      {(error || warning) && (
        <p className={`ad-row-note${error ? " ad-row-note--error" : ""}`}>{error ?? warning}</p>
      )}

      {open && (
        <div className="ad-row-body">
          <dl className="ad-facts">
            <div>
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${row.email}`}>{row.email}</a>
              </dd>
            </div>
            <div>
              <dt>Signed up</dt>
              <dd>{row.createdAt.slice(0, 10)}</dd>
            </div>
            <div>
              <dt>Asked for beta</dt>
              <dd>{row.requested ? row.requestedAt?.slice(0, 10) ?? "yes" : "Never asked"}</dd>
            </div>
            <div>
              <dt>Last seen</dt>
              <dd>{(row.lastActiveAt ?? row.lastSignInAt)?.slice(0, 10) ?? "Never"}</dd>
            </div>
            {row.platform && (
              <div>
                <dt>Platform</dt>
                <dd>{row.platform}</dd>
              </div>
            )}
            {row.referralSource && (
              <div>
                <dt>Heard via</dt>
                <dd>{row.referralSource}</dd>
              </div>
            )}
            {row.points != null && (
              <div>
                <dt>Points / rank</dt>
                <dd>
                  {row.points} / #{row.position ?? "?"}
                </dd>
              </div>
            )}
            {row.approved && (
              <div>
                <dt>Beta since</dt>
                <dd className="ad-yes">{row.betaJoinedAt ?? "date not stamped"}</dd>
              </div>
            )}
            <div>
              <dt>Clerk id</dt>
              <dd>
                <code>{row.userId}</code>
              </dd>
            </div>
          </dl>

          <Link href={`/admin/users/${row.userId}`} className="ad-more">
            Open their full record and usage
          </Link>

          {row.useCase && (
            <div className="ad-quote">
              <span>What they want it for</span>
              <p>{row.useCase}</p>
            </div>
          )}

          {/* Supabase mirrors the Clerk flag for exports and the app's status
              check, and it reconciles lazily on the user's own next visit. A
              disagreement here is expected right after an approval and is only
              worth surfacing so it is never mistaken for a failed grant. */}
          {row.requested && row.mirroredStatus != null &&
            row.approved !== (row.mirroredStatus === "accepted") && (
              <p className="ad-drift">
                Supabase still reads <code>{row.mirroredStatus}</code>. Clerk is the gate, so
                access is correct either way.
              </p>
            )}
        </div>
      )}
    </article>
  );
}
