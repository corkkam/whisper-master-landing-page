import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import AdminNav from "@/components/admin/AdminNav";
import UserRow from "@/components/admin/UserRow";
import { isAdmin } from "@/lib/admin";
import { listBetaQueue } from "@/lib/beta/queue";
import { displayName, type BetaUserRow } from "@/lib/beta/rows";
import { compact } from "@/lib/stats/derive";
import { getUsageStats, type UserUsageSummary } from "@/lib/stats/usage";

export const metadata: Metadata = {
  title: "Users",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** How many rows a sort renders before it asks you to search instead. */
const PAGE_LIMIT = 200;

const SORTS = [
  { key: "recent", label: "Newest" },
  { key: "active", label: "Last seen" },
  { key: "usage", label: "Most used" },
  { key: "name", label: "Name" },
] as const;

type SortKey = (typeof SORTS)[number]["key"];

function parseSort(raw: string | undefined): SortKey {
  return SORTS.some((s) => s.key === raw) ? (raw as SortKey) : "recent";
}

/**
 * Every account, with what each one actually does.
 *
 * Separate from the beta queue on purpose. The queue answers one question and
 * is emptied; this list is browsed. Usage sits on the row rather than behind
 * the click, because "who is really using this" is the only reason to open a
 * users list at all, and a list of names with no signal is a list nobody opens
 * twice.
 *
 * Sorting and searching are URL state, handled on the server. That keeps the
 * page a pure server render, and it makes "the five heaviest users" a link you
 * can keep.
 */
export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; q?: string }>;
}) {
  if (!(await isAdmin())) notFound();

  const params = await searchParams;
  const sort = parseSort(params.sort);
  const query = (params.q ?? "").trim().toLowerCase();

  const [queue, usage] = await Promise.all([listBetaQueue(), getUsageStats()]);
  const { rows } = queue;

  const filtered = query ? rows.filter((r) => haystack(r).includes(query)) : rows.slice();
  sortRows(filtered, sort, usage.byUser);
  const shown = filtered.slice(0, PAGE_LIMIT);

  const dictating = rows.filter((r) => usage.byUser.has(r.userId)).length;
  const neverDictated = rows.length - dictating;

  return (
    <>
      <Nav />
      <main className="page ad-page">
        <header className="page-head">
          <p className="label">
            <i className="rec-dot" />
            Users
          </p>
          <h1 className="page-title">
            {queue.totalAccounts.toLocaleString()} account
            {queue.totalAccounts === 1 ? "" : "s"}, <em>{dictating} dictating.</em>
          </h1>
        </header>

        <AdminNav current="users" />

        {queue.clerkError && (
          <p className="ad-alert">
            Clerk did not answer, so this list is empty rather than actually empty.{" "}
            <code>{queue.clerkError}</code>
          </p>
        )}
        {queue.truncated && (
          <p className="ad-alert">
            Showing the {rows.length.toLocaleString()} most recent of{" "}
            {queue.totalAccounts.toLocaleString()} accounts.
          </p>
        )}
        {!usage.available && (
          <p className="ad-alert">
            The <code>usage_daily</code> table did not answer, so every row below reads as
            no dictation. That is the read failing, not the userbase being idle.
          </p>
        )}

        <div className="ad-summary">
          <div className="ad-stat">
            <strong>{queue.totalAccounts.toLocaleString()}</strong>
            <span>accounts</span>
          </div>
          <div className="ad-stat ad-stat--good">
            <strong>{dictating.toLocaleString()}</strong>
            <span>dictated in {usage.windowDays}d</span>
          </div>
          <div className="ad-stat">
            <strong>{neverDictated.toLocaleString()}</strong>
            <span>idle</span>
          </div>
          <div className="ad-stat">
            <strong>{compact(usage.totals.words)}</strong>
            <span>words, all users</span>
          </div>
        </div>

        <div className="ad-controls">
          <nav className="ad-tabs ad-tabs--filter" aria-label="Sort accounts">
            {SORTS.map((s) => (
              <Link
                key={s.key}
                href={{ pathname: "/admin/users", query: cleanQuery(s.key, query) }}
                className={`ad-tab${s.key === sort ? " is-current" : ""}`}
                aria-current={s.key === sort ? "page" : undefined}
              >
                {s.label}
              </Link>
            ))}
          </nav>

          <form className="ad-search" method="get" action="/admin/users">
            <input type="hidden" name="sort" value={sort} />
            <input
              type="search"
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Name, email, company"
              aria-label="Search accounts"
            />
            <button type="submit" className="ad-btn">
              Search
            </button>
          </form>
        </div>

        {shown.length === 0 ? (
          <section className="ad-empty">
            <h2>{query ? "No account matches that." : "No accounts yet."}</h2>
            <p>
              {query
                ? "Try an email address, or clear the search."
                : "Accounts appear here as soon as anyone signs up. If you expected some, check that CLERK_SECRET_KEY points at the instance you are looking at."}
            </p>
          </section>
        ) : (
          <section className="ad-section">
            {query && (
              <h2>
                Matching {query} <i>{filtered.length}</i>
              </h2>
            )}
            <div className="ad-list">
              {shown.map((r) => (
                <UserRow
                  key={r.userId}
                  row={r}
                  usage={usage.byUser.get(r.userId)}
                  windowDays={usage.windowDays}
                />
              ))}
            </div>
            {filtered.length > shown.length && (
              <p className="ad-foot">
                Showing the first {PAGE_LIMIT} of {filtered.length.toLocaleString()}. Search
                to narrow it.
              </p>
            )}
          </section>
        )}
      </main>
    </>
  );
}

/**
 * Sort in place.
 *
 * Every comparator falls back to newest-first rather than leaving ties to the
 * incoming order, so a reload never reshuffles rows that compare equal — which
 * on "Most used" is everyone who has never dictated.
 */
function sortRows(
  rows: BetaUserRow[],
  sort: SortKey,
  byUser: Map<string, UserUsageSummary>
) {
  const newest = (a: BetaUserRow, b: BetaUserRow) => b.createdAt.localeCompare(a.createdAt);
  if (sort === "recent") return rows.sort(newest);

  if (sort === "name") {
    return rows.sort(
      (a, b) => displayName(a).localeCompare(displayName(b)) || newest(a, b)
    );
  }

  if (sort === "usage") {
    return rows.sort(
      (a, b) =>
        (byUser.get(b.userId)?.words ?? 0) - (byUser.get(a.userId)?.words ?? 0) ||
        newest(a, b)
    );
  }

  // Last seen. Never-seen accounts sort last rather than first, which is what
  // an empty string would do against an ISO timestamp.
  return rows.sort((a, b) => {
    const seen = (r: BetaUserRow) => r.lastActiveAt ?? r.lastSignInAt ?? "";
    return seen(b).localeCompare(seen(a)) || newest(a, b);
  });
}

function haystack(row: BetaUserRow): string {
  return [row.name, row.email, row.company, row.role, row.userId]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function cleanQuery(sort: string, query: string) {
  return query ? { sort, q: query } : { sort };
}
