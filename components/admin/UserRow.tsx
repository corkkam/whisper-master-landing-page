import Link from "next/link";
import { displayName, type BetaUserRow } from "@/lib/beta/rows";
import { compact, daysAgo } from "@/lib/stats/derive";
import type { UserUsageSummary } from "@/lib/stats/usage";

/**
 * One account in the users list.
 *
 * A link, not an expander. The beta queue expands in place because the decision
 * is made there and navigating away loses the queue; browsing users is the
 * opposite job, and each row here is the doorway to a page that carries far
 * more than a panel could.
 *
 * Usage is on the row rather than behind the click, because "who actually uses
 * this" is the question a users list is opened to answer. An account with no
 * usage says so in words: a blank cell reads as missing data, and on this
 * column the difference between "never dictated" and "we did not look" is the
 * whole point.
 */
export default function UserRow({
  row,
  usage,
  windowDays,
}: {
  row: BetaUserRow;
  usage: UserUsageSummary | undefined;
  windowDays: number;
}) {
  const state = row.approved ? "approved" : row.requested ? "waiting" : "none";
  const stateLabel = row.approved ? "Beta" : row.requested ? "Waiting" : "Stable";
  const lastSeen = row.lastActiveAt ?? row.lastSignInAt;
  const name = displayName(row);
  const subtitle = [name === row.email ? null : row.email, row.company]
    .filter(Boolean)
    .join(" / ");

  return (
    <Link href={`/admin/users/${row.userId}`} className={`ad-urow ad-urow--${state}`}>
      <span className={`ad-state ad-state--${state}`}>{stateLabel}</span>

      <span className="ad-ident">
        <strong>{name}</strong>
        {/* An account with no profile name falls back to its email address, and
            printing that twice wastes the only line the row has for context. */}
        {subtitle && <em>{subtitle}</em>}
      </span>

      <span className="ad-urow-usage">
        {usage ? (
          <>
            <b>{compact(usage.words)}</b>
            <i>
              words / {usage.activeDays} day{usage.activeDays === 1 ? "" : "s"}
            </i>
          </>
        ) : (
          <i className="ad-urow-idle">no dictation in {windowDays}d</i>
        )}
      </span>

      <span className="ad-urow-seen">
        <b>{lastSeen ? daysAgo(lastSeen) : "never"}</b>
        <i>last seen</i>
      </span>
    </Link>
  );
}
