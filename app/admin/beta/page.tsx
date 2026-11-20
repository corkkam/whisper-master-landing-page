import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import AdminNav from "@/components/admin/AdminNav";
import BetaRow from "@/components/admin/BetaRow";
import { isAdmin } from "@/lib/admin";
import { listBetaQueue } from "@/lib/beta/queue";
import {
  BETA_FILTERS,
  BETA_FILTER_LABEL,
  matchesFilter,
  parseBetaFilter,
  type BetaUserRow,
} from "@/lib/beta/rows";

export const metadata: Metadata = {
  title: "Beta queue",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** How many rows a tab renders before it asks you to search instead. */
const PAGE_LIMIT = 200;

/**
 * The beta queue.
 *
 * Approving someone used to mean opening the Clerk dashboard, finding the user,
 * and hand-editing a JSON metadata blob. That is a fine way to grant beta
 * access to the wrong person, and it gives no view of who is waiting or what
 * they said when they asked. This page is that view, with the same one-click
 * grant behind it.
 *
 * `publicMetadata.betaAccess` on Clerk stays the gate. Nothing here introduces
 * a second source of truth: the list is read from Clerk, the buttons write to
 * Clerk, and the Supabase `status` column is updated afterwards as a mirror for
 * exports and the Mac app's own check.
 */
export default async function BetaQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  if (!(await isAdmin())) notFound();

  const params = await searchParams;
  const filter = parseBetaFilter(params.filter);
  const query = (params.q ?? "").trim().toLowerCase();

  const queue = await listBetaQueue();
  const { counts } = queue;

  const filtered = queue.rows
    .filter((r) => matchesFilter(r, filter))
    .filter((r) => (query ? haystack(r).includes(query) : true));

  const shown = filtered.slice(0, PAGE_LIMIT);

  const tabCount: Record<string, number> = {
    waiting: counts.waiting,
    approved: counts.approved,
    "no-request": counts.noRequest,
    all: queue.rows.length,
  };

  return (
    <>
      <Nav />
      <main className="page pl-page">
        <header className="page-head">
          <p className="label">
            <i className="rec-dot" />
            Beta
          </p>
          <h1 className="page-title">
            {counts.waiting > 0 ? (
              <>
                {counts.waiting} {counts.waiting === 1 ? "request" : "requests"}{" "}
                <em>to decide.</em>
              </>
            ) : (
              <>
                The queue is <em>clear.</em>
              </>
            )}
          </h1>
        </header>

        <AdminNav current="beta" />

        {queue.clerkError && (
          <p className="ad-alert">
            Clerk did not answer, so this list is empty rather than actually empty. Approving
            will not work until it does. <code>{queue.clerkError}</code>
          </p>
        )}
        {queue.waitlistError && (
          <p className="ad-alert">
            The waitlist table did not answer. Accounts still list and approve correctly, but
            without what each person submitted. <code>{queue.waitlistError}</code>
          </p>
        )}
        {queue.truncated && (
          <p className="ad-alert">
            Showing the {queue.rows.length.toLocaleString()} most recent of{" "}
            {queue.totalAccounts.toLocaleString()} accounts. Older ones are not in any tab
            below.
          </p>
        )}

        <div className="pl-summary">
          <div className={`pl-stat${counts.waiting > 0 ? " ad-stat--due" : ""}`}>
            <strong>{counts.waiting.toLocaleString()}</strong>
            <span>waiting</span>
          </div>
          <div className="pl-stat pl-stat--won">
            <strong>{counts.approved.toLocaleString()}</strong>
            <span>in beta</span>
          </div>
          <div className="pl-stat">
            <strong>{counts.noRequest.toLocaleString()}</strong>
            <span>never asked</span>
          </div>
          <div className="pl-stat">
            <strong>{queue.totalAccounts.toLocaleString()}</strong>
            <span>accounts</span>
          </div>
        </div>

        <div className="ad-controls">
          <nav className="ad-tabs ad-tabs--filter" aria-label="Filter accounts">
            {BETA_FILTERS.map((f) => (
              <Link
                key={f}
                href={{ pathname: "/admin/beta", query: cleanQuery(f, query) }}
                className={`ad-tab${f === filter ? " is-current" : ""}`}
                aria-current={f === filter ? "page" : undefined}
              >
                {BETA_FILTER_LABEL[f]} <i>{tabCount[f]}</i>
              </Link>
            ))}
          </nav>

          {/* A plain GET form, so search is a URL you can bookmark and the page
              stays entirely server-rendered. */}
          <form className="ad-search" method="get" action="/admin/beta">
            <input type="hidden" name="filter" value={filter} />
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
          <section className="pl-empty">
            <h2>{query ? "No account matches that." : emptyTitle(filter)}</h2>
            <p>{query ? "Try an email address, or clear the search." : emptyBody(filter)}</p>
          </section>
        ) : (
          <section className="pl-section">
            {/* The tab strip above already names the filter and its count, so a
                heading only earns its space when a search has narrowed it. */}
            {query && (
              <h2>
                Matching {query} <i>{filtered.length}</i>
              </h2>
            )}
            <div className="pl-list">
              {shown.map((r) => (
                <BetaRow key={r.userId} row={r} />
              ))}
            </div>
            {filtered.length > shown.length && (
              <p className="ad-foot">
                Showing the first {PAGE_LIMIT} of {filtered.length.toLocaleString()}. Search to
                narrow it.
              </p>
            )}
          </section>
        )}
      </main>
    </>
  );
}

/** One lowercase string per row, so search is a single substring test. */
function haystack(row: BetaUserRow): string {
  return [row.name, row.email, row.company, row.role, row.userId]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function cleanQuery(filter: string, query: string) {
  return query ? { filter, q: query } : { filter };
}

function emptyTitle(filter: string): string {
  if (filter === "waiting") return "Nobody is waiting.";
  if (filter === "approved") return "Nobody is in the beta yet.";
  if (filter === "no-request") return "Every account has asked for beta.";
  return "No accounts yet.";
}

function emptyBody(filter: string): string {
  if (filter === "waiting")
    return "A request appears here when someone signs in and asks for early access on the download page.";
  if (filter === "approved")
    return "Approve someone from the Waiting tab and they appear here, with the beta build unlocked on their next visit to /download.";
  if (filter === "no-request")
    return "Everyone who signed up has also asked for the beta channel.";
  return "Accounts appear here as soon as anyone signs up. If you expected some, check that CLERK_SECRET_KEY points at the instance you are looking at.";
}
