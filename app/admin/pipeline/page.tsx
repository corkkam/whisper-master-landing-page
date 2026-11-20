import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import AdminNav from "@/components/admin/AdminNav";
import LeadCard from "@/components/leads/LeadCard";
import { isAdmin } from "@/lib/admin";
import { listLeads, pipelineSummary } from "@/lib/leads/queries";
import { LEAD_STAGES, STAGE_LABEL, type LeadRow } from "@/lib/leads/stages";

export const metadata: Metadata = {
  title: "Pipeline",
  robots: { index: false, follow: false },
};

// Never cached. A stale pipeline is a pipeline that gets mistrusted and then
// ignored, and the read is cheap at this scale.
export const dynamic = "force-dynamic";

const STAGE_ORDER = LEAD_STAGES;

/**
 * The sales pipeline.
 *
 * Organised around one question — *what should I do today* — rather than around
 * the data model. A kanban board is the conventional answer here and it is the
 * wrong one for a solo founder: a board optimises for seeing work distributed
 * across a team, and there is no team. So the top of the page is a single
 * action queue, and the full pipeline sits below it.
 */
export default async function PipelinePage() {
  // 404 rather than 403. A 403 confirms the route exists and is worth probing;
  // a 404 tells an unauthorised visitor nothing at all.
  if (!(await isAdmin())) notFound();

  const [leads, summary] = await Promise.all([listLeads({ limit: 300 }), pipelineSummary()]);

  const today = new Date().toISOString().slice(0, 10);
  const open = leads.filter((l) => l.stage !== "won" && l.stage !== "lost");

  // The action queue: anything overdue, plus every untouched hot lead. Sorted
  // by score so the highest-value work is first, because a solo founder will
  // realistically get through the top few and nothing else.
  const needsAction = open
    .filter(
      (l) =>
        (l.next_action_at != null && l.next_action_at <= today) ||
        (l.stage === "new" && l.band === "hot")
    )
    .sort((a, b) => b.score - a.score);

  const byStage = new Map<string, LeadRow[]>();
  for (const l of leads) {
    if (!byStage.has(l.stage)) byStage.set(l.stage, []);
    byStage.get(l.stage)!.push(l);
  }

  const countFor = (s: string) => summary.find((r) => r.stage === s)?.count ?? 0;
  const openPipelineUsd = summary
    .filter((r) => r.stage !== "won" && r.stage !== "lost")
    .reduce((n, r) => n + Number(r.pipeline_usd ?? 0), 0);
  const wonUsd = Number(summary.find((r) => r.stage === "won")?.pipeline_usd ?? 0);

  return (
    <>
      <Nav />
      <main className="page pl-page">
        <header className="page-head">
          <p className="label"><i className="rec-dot" />Pipeline</p>
          <h1 className="page-title">
            {needsAction.length > 0
              ? <>{needsAction.length} thing{needsAction.length === 1 ? "" : "s"} <em>need you today</em>.</>
              : <>Nothing <em>overdue</em>.</>}
          </h1>
        </header>

        <AdminNav current="pipeline" />

        <div className="pl-summary">
          <div className="pl-stat">
            <strong>{open.length}</strong>
            <span>open leads</span>
          </div>
          <div className="pl-stat">
            <strong>${openPipelineUsd.toLocaleString()}</strong>
            <span>open pipeline / yr</span>
          </div>
          <div className="pl-stat pl-stat--won">
            <strong>${wonUsd.toLocaleString()}</strong>
            <span>won / yr</span>
          </div>
          <div className="pl-stat">
            <strong>{leads.filter((l) => l.band === "hot").length}</strong>
            <span>hot</span>
          </div>
        </div>

        {needsAction.length > 0 && (
          <section className="pl-section pl-section--urgent">
            <h2>Do these first</h2>
            <div className="pl-list">
              {needsAction.map((l) => <LeadCard key={l.id} lead={l} />)}
            </div>
          </section>
        )}

        {leads.length === 0 && (
          <section className="pl-empty">
            <h2>No leads yet.</h2>
            <p>
              Enquiries from <code>/for-teams</code> land here, scored and with a
              suggested next action already attached. If you expected one and it
              is missing, check that <code>SUPABASE_SERVICE_ROLE_KEY</code> is set
              and that migration <code>0006_leads.sql</code> has been run.
            </p>
          </section>
        )}

        {STAGE_ORDER.map((stage) => {
          const rows = byStage.get(stage);
          if (!rows?.length) return null;
          return (
            <section className="pl-section" key={stage}>
              <h2>
                {STAGE_LABEL[stage]} <i>{countFor(stage)}</i>
              </h2>
              <div className="pl-list">
                {rows.map((l) => <LeadCard key={l.id} lead={l} />)}
              </div>
            </section>
          );
        })}
      </main>
    </>
  );
}
