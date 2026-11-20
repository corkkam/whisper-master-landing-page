import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/sections/Footer";
import ConditionBars from "@/components/eval/ConditionBars";
import RunRegister from "@/components/eval/RunRegister";
import TrendChart from "@/components/eval/TrendChart";
import VersionScores from "@/components/eval/VersionScores";
import { formatWhen, headlineFrom, trendSeries } from "@/lib/eval/present";
import { listRunsByVersion, listRunsPaged } from "@/lib/eval/queries";
import type { RunSummary } from "@/lib/eval/types";
import { product } from "@/lib/config";

export const metadata: Metadata = {
  title: `How we know it works — ${product.name}`,
  description:
    "Every evaluation run of the dictation pipeline, graded on the shipped app: what it heard, what it cleaned up, and where it does worst. Including the bad numbers.",
  alternates: { canonical: "/eval" },
};

/**
 * The eval history is pushed at release time, not on a request, so a short
 * revalidate window is the whole caching story. Sixty seconds means a score
 * published by a release shows up while the release is still being announced.
 */
export const revalidate = 60;

/** How many runs the register shows before paging. Nine exist; this is headroom. */
const REGISTER_SIZE = 25;

const STAGES: [string, string][] = [
  [
    "Speak",
    "Real recorded human speech, plus a synthetic voice, a noisy-room mix and a Bluetooth-headset mix of every written case.",
  ],
  [
    "Transcribe",
    "The exact speech model the app ships, running on a Mac. No stand-in, no cloud, no second implementation.",
  ],
  [
    "Clean up",
    "The shipped cleanup pass runs inside the real app, behind the same faithfulness guard your copy has.",
  ],
  [
    "Grade",
    "Keyword rules, word error against the reference, and the guard's verdict. Every failure is attributed to hearing or to cleanup.",
  ],
];

export default async function EvalPage() {
  let runs: RunSummary[] = [];
  let versions: RunSummary[] = [];
  let unreachable = false;

  try {
    const [page, byVersion] = await Promise.all([
      listRunsPaged(1, REGISTER_SIZE),
      listRunsByVersion(),
    ]);
    runs = page.runs;
    versions = byVersion;
  } catch {
    // A page whose subject is honesty should not render zeros when it cannot
    // read the numbers. Say the history is unreachable instead.
    unreachable = true;
  }

  const headline = headlineFrom(runs);
  const trend = trendSeries(runs);

  return (
    <>
      <Nav />
      <main className="page">
        <header className="page-head">
          <p className="label">
            <i className="rec-dot" />
            Evaluation
          </p>
          <h1 className="page-title">
            How we know
            <br />
            <em>it works.</em>
          </h1>
          <p className="page-lede">
            Every change to dictation is graded on one suite, run through the shipped app rather
            than a copy of it. This is the whole record, the runs we are proud of and the ones we
            are not. Nothing here is hand-picked.
          </p>
        </header>

        {unreachable ? (
          <p className="ev-empty">
            The run history is not reachable right now, so there is nothing to show. Rather than
            print zeros on a page about measurement, this says so.
          </p>
        ) : !headline ? (
          <p className="ev-empty">
            No runs are stored yet. The first one appears here as soon as a release grades itself.
          </p>
        ) : (
          <>
            <section className="ev-sec ev-sec--first">
              <p className="ev-term ev-stamp">
                Latest run &middot; {formatWhen(headline.run.createdAt)}
                {headline.run.branch ? ` · ${headline.run.branch}` : ""}
                {headline.run.gitCommit ? ` · ${headline.run.gitCommit.slice(0, 7)}` : ""}
              </p>
              <div className="ev-read">
                <div>
                  <b>{headline.cleanupPercent === null ? "—" : `${headline.cleanupPercent}%`}</b>
                  <span>of cases cleaned correctly</span>
                  <i>
                    light mode &middot; typed text &middot;{" "}
                    {headline.typedRun?.totalCases ?? 0} cases
                  </i>
                </div>
                <div>
                  <b>
                    {headline.llmMedianMs === null ? "—" : headline.llmMedianMs}
                    {headline.llmMedianMs === null ? "" : <small> ms</small>}
                  </b>
                  <span>for a typical cleanup</span>
                  <i>
                    {headline.llmP90Ms === null
                      ? "median on the light mode"
                      : `${headline.llmP90Ms} ms at the 90th percentile`}
                  </i>
                </div>
                <div>
                  <b>{headline.conditionRange ?? "—"}</b>
                  <span>of words misheard, best condition to worst</span>
                  <i>never quoted as one number, see below</i>
                </div>
                <div>
                  <b>0</b>
                  <span>bytes of audio that leave the Mac</span>
                  <i>every number here was measured on device</i>
                </div>
              </div>
            </section>

            <section className="ev-sec">
              <h2 className="ev-h2">Where the hearing gets hard</h2>
              <p className="ev-cap">
                The average share of words the microphone gets wrong, by recording condition. Clean
                human speech is the number to trust. The noisy room and the Bluetooth headset are
                where we currently do worst, and they are on this page for exactly that reason.
              </p>
              <ConditionBars conditions={headline.conditions} />
              {headline.attribution.asr + headline.attribution.cleanup > 0 ? (
                <div className="ev-blame">
                  <div>
                    <b style={{ color: "var(--ember-ink)" }}>{headline.attribution.asr}</b>
                    <span>failures where the microphone misheard the words</span>
                  </div>
                  <div>
                    <b>{headline.attribution.cleanup}</b>
                    <span>failures where the cleanup itself slipped</span>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="ev-sec">
              <h2 className="ev-h2">How each version scored</h2>
              <p className="ev-cap">
                Every stable and beta build grades itself as it is published, against this same
                suite. So the question is not how some commit did, it is how the copy you are
                running did.
              </p>
              <VersionScores runs={versions} />
            </section>

            <section className="ev-sec">
              <h2 className="ev-h2">What happens to one clip</h2>
              <p className="ev-cap">
                Every case rides the same chain the app uses, then is graded at the end.
              </p>
              <ol className="ev-steps">
                {STAGES.map(([name, body], i) => (
                  <li key={name}>
                    <span className="ev-step-n">{String(i + 1).padStart(2, "0")}</span>
                    <h3>{name}</h3>
                    <p>{body}</p>
                  </li>
                ))}
              </ol>
            </section>

            {trend.typed.length >= 2 || trend.spoken.length >= 2 ? (
              <section className="ev-sec">
                <h2 className="ev-h2">Is it getting better?</h2>
                <p className="ev-cap">
                  Share of cases that pass, run by run, oldest first. Typed and spoken cases are
                  drawn apart on purpose: a spoken case can fail because the microphone misheard
                  it, so one line across both would hide which half moved.
                </p>
                <TrendChart typed={trend.typed} spoken={trend.spoken} />
              </section>
            ) : null}

            <section className="ev-sec">
              <h2 className="ev-h2">Every run</h2>
              <p className="ev-cap">
                Each row is one full pass of the suite against one build. Open a row to read every
                case in it, marked up.
              </p>
              <RunRegister runs={runs} />
            </section>
          </>
        )}

        <section className="page-cta">
          <h2>Check it yourself</h2>
          <p>
            The cases, the prompts and the scorer are in the repository, and this page is generated
            from the stored runs rather than written by hand.
          </p>
          <div className="page-cta-foot">
            <div className="page-cta-actions">
              <Link className="btn btn--ghost" href="/trust">
                What leaves your Mac
              </Link>
              <Link className="btn btn--ghost" href="/download">
                Download the app
              </Link>
            </div>
            {headline ? (
              <p className="ev-term">Last run &middot; {formatWhen(headline.run.createdAt, false)}</p>
            ) : null}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
