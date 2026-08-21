import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/sections/Footer";
import CaseCard from "@/components/eval/CaseCard";
import CaseFilters from "@/components/eval/CaseFilters";
import ConditionBars from "@/components/eval/ConditionBars";
import Pagination from "@/components/eval/Pagination";
import { conditionsOf, formatWhen } from "@/lib/eval/present";
import { getRunCases, getRunSummary } from "@/lib/eval/queries";
import { overallPassPercent } from "@/lib/eval/types";
import { product } from "@/lib/config";

export const revalidate = 60;

const CASES_PER_PAGE = 10;

const TARGET_LABEL: Record<string, string> = {
  light: "Light, ships on by default",
  polish: "Polish, experimental",
  slack: "Slack and chat",
  email: "Email",
  code: "Code and editors",
};

const SOURCE_FILTERS: [string, string][] = [
  ["LibriSpeech", "Real speech"],
  ["TTS", "Synthetic"],
  ["Bluetooth", "Bluetooth"],
  ["Noise", "Noisy"],
  ["Text", "Typed"],
];

type Search = Record<string, string | string[] | undefined>;

const one = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const run = await getRunSummary(id).catch(() => null);
  if (!run) return { title: `Evaluation run — ${product.name}` };
  const name = run.version ? `${run.version}` : (run.label ?? "run");
  return {
    title: `${name} — how it scored — ${product.name}`,
    description: `Every case in the ${run.label ?? "evaluation"} run, marked up: what the microphone heard and what each cleanup mode did to it.`,
    alternates: { canonical: `/eval/${id}` },
    // One run out of many is not a page search should rank; the index is.
    robots: { index: false, follow: true },
  };
}

export default async function RunPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Search>;
}) {
  const { id } = await params;
  const search = await searchParams;

  const run = await getRunSummary(id).catch(() => null);
  if (!run) notFound();

  const filters = {
    page: Math.max(1, Number(one(search.page)) || 1),
    pageSize: CASES_PER_PAGE,
    outcome: (["pass", "fail"].includes(one(search.outcome))
      ? one(search.outcome)
      : "all") as "all" | "pass" | "fail",
    source: one(search.source) || "all",
    q: one(search.q),
  };

  const cases = await getRunCases(id, filters).catch(() => null);
  const passed = overallPassPercent(run);
  const byTarget = run.aggregate?.byTarget ?? {};
  const conditions = conditionsOf(run);

  // Only offer a filter for a source this run actually graded, so the chips
  // cannot produce an empty list.
  const sources = SOURCE_FILTERS.filter(([value]) =>
    value === "Text"
      ? run.totalCases > run.audioCases
      : Boolean(run.aggregate?.werBySource?.[value as "TTS"])
  ).map(([value, label]) => ({ value, label }));

  const linkParams: Record<string, string> = {};
  if (filters.outcome !== "all") linkParams.outcome = filters.outcome;
  if (filters.source !== "all") linkParams.source = filters.source;
  if (filters.q) linkParams.q = filters.q;

  return (
    <>
      <Nav />
      <main className="page">
        <header className="page-head ev-run-head">
          <Link className="ev-back" href="/eval">
            &larr; All runs
          </Link>
          <p className="label">
            <i className="rec-dot" />
            {run.version ? `Version ${run.version}` : "Evaluation run"}
          </p>
          <h1 className="page-title">{run.label ?? "Run"}</h1>
          <p className="ev-run-meta ev-mono">
            {formatWhen(run.createdAt)}
            {run.channel ? ` · ${run.channel} channel` : ""}
            {run.branch ? ` · ${run.branch}` : ""}
            {run.gitCommit ? ` · ${run.gitCommit.slice(0, 7)}` : ""} · {run.totalCases} cases
            {run.audioCases > 0 ? `, ${run.audioCases} spoken` : ""}
          </p>
        </header>

        <div className="ev-panels">
          <section className="ev-panel">
            <h2 className="ev-panel-h">Did it hear the words right?</h2>
            <ConditionBars conditions={conditions} />
          </section>
          <section className="ev-panel">
            <h2 className="ev-panel-h">Did it clean up correctly and safely?</h2>
            <div className="ev-tiles">
              {Object.keys(byTarget).map((target) => {
                const t = byTarget[target];
                const percent = t.total ? Math.round((t.pass / t.total) * 100) : 0;
                return (
                  <div className="ev-tile" key={target}>
                    <div className="ev-tile-big">
                      {percent}
                      <small>%</small>
                    </div>
                    <div className="ev-tile-cap">{TARGET_LABEL[target] ?? target}</div>
                    <div className="ev-tile-sub">
                      {t.pass}/{t.total} cases passed
                      {t.latency?.llm ? ` · ${t.latency.llm.median} ms typical` : ""}
                    </div>
                  </div>
                );
              })}
              <div className="ev-tile ev-tile--span">
                <div className="ev-tile-cap">When a case fails, whose fault is it?</div>
                <div className="ev-tile-blame">
                  <b style={{ color: "var(--ember-ink)" }}>{run.aggregate?.attribution?.asr ?? 0}</b>{" "}
                  the microphone misheard the words &nbsp;&middot;&nbsp;{" "}
                  <b>{run.aggregate?.attribution?.cleanup ?? 0}</b> the cleanup itself slipped
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="ev-sec">
          <h2 className="ev-h2">Every case</h2>
          <p className="ev-cap">
            Each case shows the instant on-device cleanup, then what each mode did to it. Added
            words are <mark className="ins">marked</mark>, removed words are{" "}
            <mark className="del">struck</mark>. For a spoken case, <b>Heard</b> is what the
            microphone transcribed and <b>Was said</b> is the reference it is scored against.
          </p>

          <CaseFilters
            sources={sources}
            initialQuery={filters.q}
            outcome={filters.outcome}
            source={filters.source}
          />

          {!cases ? (
            <p className="ev-empty">The cases for this run are not reachable right now.</p>
          ) : cases.cases.length === 0 ? (
            <p className="ev-empty">No cases match these filters.</p>
          ) : (
            <>
              <p className="ev-count ev-term">
                {cases.total} case{cases.total === 1 ? "" : "s"} match
              </p>
              <div className="ev-cases">
                {cases.cases.map((group) => (
                  <CaseCard group={group} key={group.caseId} />
                ))}
              </div>
              <Pagination
                page={cases.page}
                total={cases.total}
                pageSize={cases.pageSize}
                params={linkParams}
              />
            </>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
