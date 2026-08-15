import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import AdminNav from "@/components/admin/AdminNav";
import Bars from "@/components/admin/Bars";
import BetaActions from "@/components/admin/BetaActions";
import Breakdown from "@/components/admin/Breakdown";
import { isAdmin } from "@/lib/admin";
import { getBetaUser } from "@/lib/beta/queue";
import { displayName } from "@/lib/beta/rows";
import { compact, daysAgo, duration } from "@/lib/stats/derive";
import { getUserUsage } from "@/lib/stats/usage";

export const metadata: Metadata = {
  title: "User",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** Clerk user ids are `user_` plus base62. Rejected before any lookup. */
const CLERK_USER_ID = /^user_[A-Za-z0-9]{10,64}$/;

/**
 * One account, and what it actually does with the product.
 *
 * The page is ordered by how much each fact changes a decision. Usage first,
 * because "should this person be in the beta" and "is this person worth a call"
 * are both answered by whether they dictate. What they typed into the form
 * comes second. Identifiers come last, where they belong on a page that is read
 * far more often than it is copied from.
 *
 * The approve control sits in the header rather than at the bottom, so the
 * decision and the evidence for it are never separated by a scroll.
 */
export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  if (!(await isAdmin())) notFound();

  const { userId } = await params;
  if (!CLERK_USER_ID.test(userId)) notFound();

  const row = await getBetaUser(userId);
  if (!row) notFound();

  const usage = await getUserUsage(userId);
  const dictated = usage.totals.dictations > 0 || usage.totals.words > 0;
  const lastSeen = row.lastActiveAt ?? row.lastSignInAt;

  return (
    <>
      <Nav />
      <main className="page ad-page">
        <header className="page-head">
          <p className="label">
            <i className="rec-dot" />
            <Link href="/admin/users" className="ad-back">
              Users
            </Link>
          </p>
          <h1 className="page-title">
            {displayName(row)}
            <br />
            <em>
              {row.approved
                ? "in the beta."
                : row.requested
                  ? "waiting for beta."
                  : "on the stable build."}
            </em>
          </h1>
        </header>

        <AdminNav current="users" />

        <div className="ad-userhead">
          <p className="ad-userhead-line">
            <a href={`mailto:${row.email}`}>{row.email}</a>
            {row.company ? <span> / {row.company}</span> : null}
            {row.role ? <span> / {row.role}</span> : null}
          </p>
          <BetaActions userId={row.userId} approved={row.approved} size="lg" />
        </div>

        {/* ── What they do with it ─────────────────────────────────────── */}
        <section className="ad-section">
          <h2>
            Usage <i>last {usage.windowDays} days</i>
          </h2>

          {!usage.available ? (
            <p className="ad-none">
              The <code>usage_daily</code> table did not answer, so this is missing rather
              than zero.
            </p>
          ) : !dictated ? (
            <p className="ad-none">
              No dictation synced in the last {usage.windowDays} days. The Mac app posts a
              rollup once a day after someone dictates, so this stays empty for an account
              that has signed up but not used the app.
            </p>
          ) : (
            <>
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
                <div className="ad-stat">
                  <strong>{usage.activeDays}</strong>
                  <span>days active</span>
                </div>
                <div className="ad-stat ad-stat--good">
                  <strong>{compact(usage.totals.wordsCorrected)}</strong>
                  <span>words corrected</span>
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
                  <h3 className="ad-sub">Where their words land</h3>
                  <Breakdown
                    rows={usage.topApps.map((a) => ({ label: a.name, count: a.words }))}
                    empty="No per-application data in this window."
                  />
                </div>
                <div>
                  <h3 className="ad-sub">Rhythm</h3>
                  <dl className="ad-facts">
                    <div>
                      <dt>First dictation</dt>
                      <dd>{usage.firstDay ?? "none"}</dd>
                    </div>
                    <div>
                      <dt>Last dictation</dt>
                      <dd>{usage.lastDay ?? "none"}</dd>
                    </div>
                    <div>
                      <dt>Days active</dt>
                      <dd>
                        {usage.activeDays} of {usage.windowDays}
                      </dd>
                    </div>
                    <div>
                      <dt>Dictionary fixes</dt>
                      <dd>{usage.totals.dictionaryFixes.toLocaleString()}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </>
          )}
        </section>

        {/* ── What they told us ────────────────────────────────────────── */}
        <section className="ad-section">
          <h2>Account</h2>
          <dl className="ad-facts">
            <div>
              <dt>Signed up</dt>
              <dd>{row.createdAt.slice(0, 10)}</dd>
            </div>
            <div>
              <dt>Last seen</dt>
              <dd>{lastSeen ? `${lastSeen.slice(0, 10)} (${daysAgo(lastSeen)})` : "Never"}</dd>
            </div>
            <div>
              <dt>Asked for beta</dt>
              <dd>
                {row.requested ? row.requestedAt?.slice(0, 10) ?? "yes" : "Never asked"}
              </dd>
            </div>
            <div>
              <dt>Beta access</dt>
              <dd className={row.approved ? "ad-yes" : undefined}>
                {row.approved ? `Yes, since ${row.betaJoinedAt ?? "an unstamped date"}` : "No"}
              </dd>
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
            <div>
              <dt>Referred in</dt>
              <dd>{row.referrals}</dd>
            </div>
            <div>
              <dt>Clerk id</dt>
              <dd>
                <code>{row.userId}</code>
              </dd>
            </div>
          </dl>

          {row.useCase && (
            <div className="ad-quote">
              <span>What they want it for</span>
              <p>{row.useCase}</p>
            </div>
          )}

          {/* Supabase mirrors the Clerk flag for exports and the app's own check,
              and it reconciles lazily on the user's next visit. A disagreement is
              expected right after an approval and is surfaced only so it is never
              mistaken for a failed grant. */}
          {row.requested &&
            row.mirroredStatus != null &&
            row.approved !== (row.mirroredStatus === "accepted") && (
              <p className="ad-drift">
                Supabase still reads <code>{row.mirroredStatus}</code>. Clerk is the gate, so
                access is correct either way.
              </p>
            )}
        </section>
      </main>
    </>
  );
}
