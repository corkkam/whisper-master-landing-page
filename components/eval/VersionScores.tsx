import Link from "next/link";
import { formatWhen } from "@/lib/eval/present";
import { overallPassPercent, type RunSummary } from "@/lib/eval/types";

/**
 * How each released version scored.
 *
 * `Scripts/release.sh` grades every stable and beta build against the same
 * suite and pushes the result tagged with the version, so this is the table
 * that answers "did the release we just shipped get better or worse". A run
 * pushed by hand carries no version and is not here; it is in the register
 * below instead.
 *
 * Empty until the first release cuts one, and it says so rather than rendering
 * an empty frame — an unexplained blank table on a page whose whole job is
 * credibility reads as something broken.
 */
export default function VersionScores({ runs }: { runs: RunSummary[] }) {
  if (runs.length === 0) {
    return (
      <p className="ev-empty">
        No released build has been graded yet. From the next release on, every stable and beta
        build runs this suite as it is published and its score appears here.
      </p>
    );
  }

  return (
    <div className="ev-vers">
      <div className="ev-vers-head ev-term" aria-hidden="true">
        <span>Version</span>
        <span>Released</span>
        <span>Passed</span>
        <span>Light</span>
        <span>Polish</span>
        <span>Typical cleanup</span>
      </div>
      {runs.map((run) => {
        const light = run.aggregate?.byTarget?.light;
        const polish = run.aggregate?.byTarget?.polish;
        const llm = light?.latency?.llm?.median;
        const passed = overallPassPercent(run);
        return (
          <Link className="ev-vers-row" href={`/eval/${run.id}`} key={run.id}>
            <span className="ev-vers-name">
              {run.version}
              {run.channel ? <i className={`ev-chan ev-chan--${run.channel}`}>{run.channel}</i> : null}
            </span>
            <span className="ev-vers-when ev-mono">{formatWhen(run.createdAt, false)}</span>
            <span className="ev-vers-big">{passed === null ? "—" : `${passed}%`}</span>
            <span className="ev-vers-cell">{light ? `${light.pass}/${light.total}` : "—"}</span>
            <span className="ev-vers-cell">{polish ? `${polish.pass}/${polish.total}` : "—"}</span>
            <span className="ev-vers-cell ev-mono">
              {typeof llm === "number" ? `${llm} ms` : "—"}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
