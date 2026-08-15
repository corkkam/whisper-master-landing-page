import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import AdminNav from "@/components/admin/AdminNav";
import Bars from "@/components/admin/Bars";
import Breakdown from "@/components/admin/Breakdown";
import { isAdmin } from "@/lib/admin";
import { listBetaQueue } from "@/lib/beta/queue";
import {
  activeSince,
  breakdown,
  compact,
  createdSince,
  daysAgo,
  duration,
  signupsByWeek,
  topReferrers,
} from "@/lib/stats/derive";
import { getUsageStats } from "@/lib/stats/usage";
import { displayName } from "@/lib/beta/rows";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

// Never cached. A stale dashboard is a dashboard that gets mistrusted and then
// ignored, and the reads are cheap at this scale.
export const dynamic = "force-dynamic";

/**
 * The founder's overview.
 *
 * Three questions, in the order they get asked: how many people are there, how
 * many of them actually use it, and who is waiting on me. Everything on this
 * page traces to a real row in Clerk or Supabase; nothing is estimated,
 * projected or filled in when a source is missing. A source that fails says so
 * in place of its numbers rather than rendering a confident zero, because a
 * zero that means "the query broke" is the one failure mode a dashboard must
 * never have.
 */
export default async function AdminOverviewPage() {
  // 404 rather than 403. A 403 confirms the route exists and is worth probing.
  if (!(await isAdmin())) notFound();

  const [queue, usage] = await Promise.all([listBetaQueue(), getUsageStats()]);

  const { rows, counts } = queue;
  const waiting = rows.filter((r) => !r.approved && r.requested);
  const dictating = rows.filter((r) => usage.byUser.has(r.userId)).length;

  const weeks = signupsByWeek(rows, 8);
  const new7 = createdSince(rows, 7);
  const new30 = createdSince(rows, 30);

  return (
    <>
      <Nav />
      <main className="page ad-page">
        <header className="page-head">
          <p className="label">
            <i className="rec-dot" />
            Admin
          </p>
          <h1 className="page-title">
            {counts.waiting > 0 ? (
              <>
                {counts.waiting} {counts.waiting === 1 ? "person is" : "people are"}{" "}
                <em>waiting on you.</em>
              </>
            ) : (
              <>
                Nobody is <em>waiting.</em>
              </>
            )}
          </h1>
        </header>

        <AdminNav current="overview" />

        {queue.clerkError && (
          <p className="ad-alert">
            Clerk did not answer, so every account number below is missing rather than zero.{" "}
            <code>{queue.clerkError}</code>
          </p>
        )}
        {queue.waitlistError && (
          <p className="ad-alert">
            The waitlist table did not answer, so accounts show without the detail they
            submitted. <code>{queue.waitlistError}</code>
          </p>
        )}
        {queue.truncated && (
          <p className="ad-alert">
            Showing the {rows.length.toLocaleString()} most recent of{" "}
            {queue.totalAccounts.toLocaleString()} accounts. Counts on this page cover only
            those.
          </p>
        )}

        <div className="ad-summary">
          <div className="ad-stat">
            <strong>{queue.totalAccounts.toLocaleString()}</strong>
            <span>accounts</span>
          </div>
          <div className="ad-stat">
            <strong>{counts.approved.toLocaleString()}</strong>
            <span>in beta</span>
          </div>
          <div className={`ad-stat${counts.waiting > 0 ? " ad-stat--due" : ""}`}>
            <strong>{counts.waiting.toLocaleString()}</strong>
            <span>waiting</span>
          </div>
          <div className="ad-stat">
            <strong>{new7.toLocaleString()}</strong>
            <span>new this week</span>
          </div>
          <div className="ad-stat ad-stat--good">
            <strong>{usage.available ? usage.activeUsers.d7.toLocaleString() : "n/a"}</strong>
            <span>dictated this week</span>
          </div>
          <div className="ad-stat">
            <strong>{dictating.toLocaleString()}</strong>
            <span>ever dictated</span>
          </div>
        </div>

        {/* ── Who is waiting ───────────────────────────────────────────── */}
        <section className={`ad-section${counts.waiting > 0 ? " ad-section--urgent" : ""}`}>
          <h2>
            Beta queue <i>{counts.waiting}</i>
          </h2>
          {waiting.length === 0 ? (
            <p className="ad-none">
              No outstanding requests. {counts.noRequest.toLocaleString()} account
              {counts.noRequest === 1 ? "" : "s"} on the stable build never asked for early
              access.
            </p>
          ) : (
            <>
              <ul className="ad-queue-peek">
                {waiting.slice(0, 5).map((r) => (
                  <li key={r.userId}>
                    <strong>{displayName(r)}</strong>
                    <em>{r.company ?? r.role ?? r.email}</em>
                    <i>waiting {daysAgo(r.requestedAt ?? r.createdAt)}</i>
                  </li>
                ))}
              </ul>
              <Link href="/admin/beta" className="ad-more">
                Approve from the queue
              </Link>
            </>
          )}
        </section>

        {/* ── What the product is actually doing ───────────────────────── */}
        <section className="ad-section">
          <h2>
            Usage <i>last {usage.windowDays} days</i>
          </h2>

          {!usage.available ? (
            <p className="ad-none">
              The <code>usage_daily</code> table did not answer. Check{" "}
              <code>SUPABASE_SERVICE_ROLE_KEY</code> and that migration{" "}
              <code>0005_usage_sync_tables.sql</code> has been run against this project.
            </p>
          ) : usage.totals.dictations === 0 ? (
            <p className="ad-none">
              No usage has synced yet. The Mac app posts a daily rollup after someone
              dictates, so this stays empty until a signed-in build is in real use.
            </p>
          ) : (
            <>
              {usage.truncated && (
                <p className="ad-alert">
                  The usage read hit its row cap, so these totals are partial and low.
                </p>
              )}
              <div className="ad-summary">
                <div className="ad-stat">
                  <strong>{compact(usage.totals.words)}</strong>
                  <span>words dictated</span>
                </div>
                <div className="ad-stat">
                  <strong>{compact(usage.totals.dictations)}</strong>
                  <span>dictations</span>
                </div>
                <div className="ad-stat">
                  <strong>{duration(usage.totals.seconds)}</strong>
                  <span>time held</span>
                </div>
                <div className="ad-stat ad-stat--good">
                  <strong>{compact(usage.totals.wordsCorrected)}</strong>
                  <span>words corrected</span>
                </div>
                <div className="ad-stat">
                  <strong>{usage.activeUsers.d30.toLocaleString()}</strong>
                  <span>active users</span>
                </div>
                <div className="ad-stat">
                  <strong>
                    {usage.totals.dictations > 0
                      ? Math.round(usage.totals.words / usage.totals.dictations)
                      : 0}
                  </strong>
                  <span>words per dictation</span>
                </div>
              </div>

              <Bars
                caption="dictations per day"
                data={usage.days.map((d) => ({
                  key: d.day,
                  value: d.dictations,
                  label: d.day,
                }))}
              />

              <div className="ad-split">
                <div>
                  <h3 className="ad-sub">Where the words land</h3>
                  <Breakdown
                    rows={usage.topApps.map((a) => ({ label: a.name, count: a.words }))}
                    empty="No per-application data in this window."
                  />
                </div>
                <div>
                  <h3 className="ad-sub">Active users</h3>
                  <ul className="ad-breakdown">
                    <li style={{ "--fill": "100%" } as React.CSSProperties}>
                      <span>Last 30 days</span>
                      <b>{usage.activeUsers.d30.toLocaleString()}</b>
                    </li>
                    <li
                      style={
                        {
                          "--fill": `${pct(usage.activeUsers.d7, usage.activeUsers.d30)}%`,
                        } as React.CSSProperties
                      }
                    >
                      <span>Last 7 days</span>
                      <b>{usage.activeUsers.d7.toLocaleString()}</b>
                    </li>
                    <li
                      style={
                        {
                          "--fill": `${pct(usage.activeUsers.d1, usage.activeUsers.d30)}%`,
                        } as React.CSSProperties
                      }
                    >
                      <span>Today</span>
                      <b>{usage.activeUsers.d1.toLocaleString()}</b>
                    </li>
                  </ul>
                  <p className="ad-foot">
                    Counted from synced dictation, not from opening the app.{" "}
                    {activeSince(rows, 7).toLocaleString()} account
                    {activeSince(rows, 7) === 1 ? "" : "s"} signed in this week.
                  </p>
                </div>
              </div>
            </>
          )}
        </section>

        {/* ── Where the accounts came from ─────────────────────────────── */}
        <section className="ad-section">
          <h2>
            Signups <i>{new30} in 30 days</i>
          </h2>

          <Bars
            caption="accounts created per week"
            data={weeks.map((w) => ({ key: w.start, value: w.count, label: w.label }))}
          />

          <div className="ad-split ad-split--three">
            <div>
              <h3 className="ad-sub">Heard about it via</h3>
              <Breakdown
                rows={breakdown(
                  rows.filter((r) => r.requested),
                  (r) => r.referralSource
                )}
                empty="Nobody has filled in the early-access form yet."
              />
            </div>
            <div>
              <h3 className="ad-sub">Who they are</h3>
              <Breakdown
                rows={breakdown(
                  rows.filter((r) => r.requested),
                  (r) => r.role
                )}
                empty="No roles recorded."
              />
            </div>
            <div>
              <h3 className="ad-sub">Brought others in</h3>
              {topReferrers(rows, 5).length === 0 ? (
                <p className="ad-none">No referrals yet.</p>
              ) : (
                <Breakdown
                  rows={topReferrers(rows, 5).map((r) => ({
                    label: displayName(r),
                    count: r.referrals,
                  }))}
                />
              )}
            </div>
          </div>
        </section>

        <section className="ad-section">
          <h2>Elsewhere</h2>
          <ul className="ad-links">
            <li>
              <Link href="/admin/users">
                All users <i>{queue.totalAccounts} accounts</i>
              </Link>
            </li>
            <li>
              <Link href="/admin/beta">
                Beta queue <i>{counts.waiting} waiting</i>
              </Link>
            </li>
          </ul>
        </section>
      </main>
    </>
  );
}

function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}
