import Link from "next/link";
import { formatWhen } from "@/lib/eval/present";
import type { RunSummary } from "@/lib/eval/types";

function scoreOf(run: RunSummary, target: string): string {
  const t = run.aggregate?.byTarget?.[target];
  return t ? `${t.pass}/${t.total}` : "—";
}

function speechError(run: RunSummary): string {
  const ls = run.aggregate?.werBySource?.LibriSpeech;
  return ls ? `${(ls.mean * 100).toFixed(1)}%` : "—";
}

/**
 * Every run, one row each, as a register rather than a stack of cards.
 *
 * The header row is hidden below the table's natural width instead of the rows
 * collapsing into labelled pairs: at that size the label and the build hash are
 * what identify a run, and the two scores read fine without a header.
 */
export default function RunRegister({ runs }: { runs: RunSummary[] }) {
  return (
    <div className="ev-reg">
      <div className="ev-reg-head ev-term" aria-hidden="true">
        <span>Run</span>
        <span>When</span>
        <span>Build</span>
        <span>Size</span>
        <span>Light</span>
        <span>Polish</span>
        <span>Speech error</span>
      </div>
      {runs.map((run) => (
        <Link className="ev-row" href={`/eval/${run.id}`} key={run.id}>
          <span className="ev-row-label">
            {run.label ?? "run"}
            <i className={`ev-row-kind ev-row-kind--${run.audioCases > 0 ? "audio" : "typed"}`}>
              {run.audioCases > 0 ? "spoken" : "typed"}
            </i>
            {run.version ? (
              <i className="ev-row-kind ev-row-kind--version">
                {run.version}
                {run.channel ? ` · ${run.channel}` : ""}
              </i>
            ) : null}
          </span>
          <span className="ev-row-when ev-mono">{formatWhen(run.createdAt)}</span>
          <span className="ev-row-commit ev-mono">{run.gitCommit?.slice(0, 7) ?? "—"}</span>
          <span className="ev-row-n">{run.totalCases} cases</span>
          <span className="ev-row-score">
            {scoreOf(run, "light")}
            <i>light</i>
          </span>
          <span className="ev-row-score">
            {scoreOf(run, "polish")}
            <i>polish</i>
          </span>
          <span className="ev-row-wer ev-mono">{speechError(run)}</span>
        </Link>
      ))}
    </div>
  );
}
