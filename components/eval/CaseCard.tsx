import { wordDiff } from "@/lib/eval/diff";
import { explainReasons, toneFor } from "@/lib/eval/present";
import type { CaseGroup, ResultDTO } from "@/lib/eval/types";

/** Targets in the order they run, with the label the page uses for each. */
const TARGETS: [string, string][] = [
  ["light", "Light"],
  ["polish", "Polish"],
  ["slack", "Slack"],
  ["email", "Email"],
  ["code", "Code"],
];

const SOURCE_LABEL: Record<string, string> = {
  LibriSpeech: "Real speech",
  TTS: "Synthetic",
  Bluetooth: "Bluetooth",
  Noise: "Noisy",
  Text: "Typed",
};

/**
 * One line of transcript, marked up against what it was derived from.
 *
 * The diff is word-level and compares on an alphanumeric key, so a change of
 * case or punctuation is not drawn as a word swap — only real insertions,
 * deletions and substitutions are. Without that, every single line came out
 * fully marked, because the cleanup capitalises and punctuates everything.
 */
function Marked({ base, text }: { base?: string | null; text: string }) {
  if (base == null) return <>{text}</>;
  return (
    <>
      {wordDiff(base, text).map((part, i) => (
        <span key={i}>
          {part.type === "same" ? part.text : <mark className={part.type}>{part.text}</mark>}{" "}
        </span>
      ))}
    </>
  );
}

export default function CaseCard({ group }: { group: CaseGroup }) {
  const shown = [
    ...TARGETS.filter(([key]) => group.targets[key]),
    ...Object.keys(group.targets)
      .filter((key) => !TARGETS.some(([k]) => k === key))
      .map((key) => [key, key] as [string, string]),
  ];
  /**
   * Failures merged by explanation.
   *
   * Most spoken failures are the microphone mishearing the clip, which fails
   * every mode for the same reason, so a line per mode repeated the same
   * sentence two or three times under a case. One line per distinct
   * explanation, named for the modes it covers.
   */
  const byReason = new Map<string, string[]>();
  for (const [key, label] of shown) {
    const result = group.targets[key];
    if (!result || result.mechanicalPass) continue;
    const why = explainReasons(result.reasons);
    byReason.set(why, [...(byReason.get(why) ?? []), label]);
  }
  const whyLabel = (labels: string[]) =>
    labels.length === shown.length
      ? "Why?"
      : `Why ${labels.map((l) => l.toLowerCase()).join(" and ")}?`;

  return (
    <article className="ev-case">
      <div className="ev-case-top">
        <span className="ev-case-id ev-mono">{group.caseId}</span>
        {group.category ? <span className="ev-tag">{group.category}</span> : null}
        <span className="ev-tag">{SOURCE_LABEL[group.source] ?? group.source}</span>
        <span className={`ev-verdict ev-verdict--${group.anyFail ? "fail" : "pass"}`}>
          {group.anyFail ? "needs review" : "clean"}
        </span>
      </div>

      <div className="ev-case-lines">
        {group.inputKind === "audio" && group.asrReference != null ? (
          <>
            <div className="ev-line">
              <span className="ev-role ev-role--heard">Heard</span>
              <span className="ev-txt">
                <Marked base={group.asrReference} text={group.asrText ?? ""} />
                {group.wer != null ? (
                  <i className="ev-wer" style={{ color: toneFor(group.wer * 100) }}>
                    {Math.round(group.wer * 100)}% misheard
                  </i>
                ) : null}
              </span>
            </div>
            <div className="ev-line">
              <span className="ev-role">Was said</span>
              <span className="ev-txt ev-txt--dim">{group.asrReference}</span>
            </div>
          </>
        ) : null}

        <div className="ev-line">
          <span className="ev-role">Instant</span>
          <span className="ev-txt">{group.deterministic}</span>
        </div>

        {shown.map(([key, label]) => {
          const result = group.targets[key] as ResultDTO;
          return (
            <div className="ev-line" key={key}>
              <span className="ev-role">{label}</span>
              <span className="ev-txt">
                <Marked base={group.deterministic} text={result.llmOutput} />
                {typeof result.latencyMs?.llm === "number" ? (
                  <i className="ev-ms">{result.latencyMs.llm} ms</i>
                ) : null}
                {!result.guardAccepted ? (
                  <i className="ev-kept">the cleanup was rejected, so the original was kept</i>
                ) : null}
              </span>
            </div>
          );
        })}

        {[...byReason.entries()].map(([why, labels]) => (
          <div className="ev-line ev-line--why" key={why}>
            <span className="ev-role ev-role--why">{whyLabel(labels)}</span>
            <span className="ev-txt ev-txt--why">{why}</span>
          </div>
        ))}
      </div>
    </article>
  );
}
