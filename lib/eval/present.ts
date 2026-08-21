// Turning stored runs into the few numbers the page actually states.
//
// Kept apart from `queries.ts` so it stays pure and importable anywhere: none
// of this touches the database, and all of it is the kind of judgement that
// should be readable in one place rather than spread across JSX.
import type { Source } from "./scoring";
import type { RunSummary } from "./types";

/**
 * Recording conditions, worst-case last.
 *
 * Clean human speech leads because it is the only one recorded from real
 * people; the rest are the app being made to struggle on purpose. The order is
 * fixed rather than sorted by score, so a good run and a bad run put the same
 * condition in the same place.
 */
const CONDITIONS: { source: Source; name: string; note: string }[] = [
  { source: "LibriSpeech", name: "Clean human speech", note: "real recordings" },
  { source: "Bluetooth", name: "Bluetooth headset", note: "HFP, the worst microphone people use" },
  { source: "TTS", name: "Synthetic voice", note: "generated speech" },
  { source: "Noise", name: "Noisy room", note: "speech mixed with room noise" },
];

export interface Condition {
  name: string;
  note: string;
  /** Mean share of words misheard, as a percentage. */
  percent: number;
  clips: number;
}

/** The conditions a run measured, in fixed order. Empty for a typed-only run. */
export function conditionsOf(run: RunSummary | undefined): Condition[] {
  const bySource = run?.aggregate?.werBySource ?? {};
  return CONDITIONS.flatMap(({ source, name, note }) => {
    const wer = bySource[source];
    if (!wer) return [];
    return [{ name, note, percent: Number((wer.mean * 100).toFixed(1)), clips: wer.count }];
  });
}

/**
 * Which colour a word-error figure earns.
 *
 * Signal (the machine working) below 5%, then a warning amber, then ember. The
 * thresholds match the scorer's own 15% fail line, so the bar changes colour at
 * the point the run starts counting the case as a mishearing.
 */
export function toneFor(percent: number): string {
  if (percent < 5) return "var(--signal-ink)";
  if (percent < 15) return "var(--warning)";
  return "var(--ember-ink)";
}

/**
 * The scorer's own failure reasons, in English.
 *
 * `reasons` are written for the offline scorer and read like log lines:
 * `asr wer 40%`, `missing '40'`, `forbidden 'John'`. They are exactly right in
 * a terminal and meaningless on a public page, which is the one place they now
 * appear.
 *
 * Rules of the same kind are merged, because a case that forbids two words
 * produced two reasons and rendering them separately gave "the result still
 * contains X, which this case forbids; the result still contains Y, which this
 * case forbids". Anything unrecognised is passed through untouched rather than
 * swallowed, so a reason added to the scorer shows up looking raw here instead
 * of silently vanishing.
 */
const quoted = (values: string[]): string => {
  const marked = values.map((v) => `\u201c${v}\u201d`);
  if (marked.length === 1) return marked[0];
  return `${marked.slice(0, -1).join(", ")} and ${marked[marked.length - 1]}`;
};

export function explainReasons(reasons: string[]): string {
  const missing: string[] = [];
  const forbidden: string[] = [];
  const rest: string[] = [];

  for (const reason of reasons) {
    const misheard = reason.match(/^asr wer (\d+)%$/);
    if (misheard) {
      rest.push(`the microphone misheard ${misheard[1]}% of the words`);
      continue;
    }
    const wasMissing = reason.match(/^missing '(.*)'$/);
    if (wasMissing) {
      missing.push(wasMissing[1]);
      continue;
    }
    const wasForbidden = reason.match(/^forbidden '(.*)'$/);
    if (wasForbidden) {
      forbidden.push(wasForbidden[1]);
      continue;
    }
    rest.push(reason);
  }

  const parts: string[] = [];
  if (missing.length) parts.push(`the result is missing ${quoted(missing)}`);
  if (forbidden.length) {
    parts.push(`the result still contains ${quoted(forbidden)}, which this case forbids`);
  }
  parts.push(...rest);
  return parts.join("; ");
}

/** Share of the shipping mode's cases that passed. */
export function lightPassPercent(run: RunSummary | undefined): number | null {
  const light = run?.aggregate?.byTarget?.light;
  return light && light.total ? Math.round((light.pass / light.total) * 100) : null;
}

export interface Headline {
  /** The run every headline number below was read from. */
  run: RunSummary;
  /** Newest run graded on typed text alone, which is the cleanup-only figure. */
  typedRun: RunSummary | undefined;
  cleanupPercent: number | null;
  llmMedianMs: number | null;
  llmP90Ms: number | null;
  conditions: Condition[];
  /** "3.4 to 23.5%", or null when the run graded typed text only. */
  conditionRange: string | null;
  attribution: { asr: number; cleanup: number };
}

/**
 * The four numbers at the top of /eval, and where each one comes from.
 *
 * Cleanup accuracy and speed are read from the newest **typed** run, because a
 * spoken case can fail on the microphone mishearing it, and letting that drag
 * down a figure labelled "cleaned correctly" would be measuring the wrong
 * thing. It is the **light** mode's rate alone, for the same reason: polish is
 * experimental and off by default, so averaging the two publishes a number
 * nobody's copy of the app actually produces. Hearing comes from the newest run that has audio in it. When only one
 * kind of run exists, both fall back to the newest.
 *
 * The word-error figure is never stated alone. It is published as the range
 * across every condition, with the four conditions immediately below it: 3.4%
 * is the number on clean human speech, and quoting it without the 23.5% in a
 * noisy room would be marketing rather than measurement.
 */
export function headlineFrom(runs: RunSummary[]): Headline | null {
  const latest = runs[0];
  if (!latest) return null;

  const typedRun = runs.find((r) => r.audioCases === 0);
  const audioRun = runs.find((r) => Object.keys(r.aggregate?.werBySource ?? {}).length > 0);
  const forCleanup = typedRun ?? latest;
  const conditions = conditionsOf(audioRun);
  const llm = forCleanup.aggregate?.byTarget?.light?.latency?.llm;

  const percents = conditions.map((c) => c.percent);
  const conditionRange = percents.length
    ? `${Math.min(...percents)} to ${Math.max(...percents)}%`
    : null;

  return {
    run: audioRun ?? latest,
    typedRun: forCleanup,
    cleanupPercent: lightPassPercent(forCleanup),
    llmMedianMs: typeof llm?.median === "number" ? llm.median : null,
    llmP90Ms: typeof llm?.p90 === "number" ? llm.p90 : null,
    conditions,
    conditionRange,
    attribution: (audioRun ?? latest).aggregate?.attribution ?? { asr: 0, cleanup: 0 },
  };
}

export interface TrendPoint {
  id: string;
  label: string;
  when: string;
  light: number;
  polish: number | null;
}

/**
 * Two series, not one.
 *
 * The old dashboard drew a single pass-rate line across every run, and because
 * typed and spoken runs alternate it zig-zagged between about 95% and about
 * 55% — which reads as wild instability and is really just two different
 * measurements sharing an axis. Split, the same nine runs say something true:
 * the cleanup improved a lot, and the spoken figure is held down by hearing.
 */
export function trendSeries(runs: RunSummary[]): { typed: TrendPoint[]; spoken: TrendPoint[] } {
  const oldestFirst = [...runs].reverse();
  const point = (r: RunSummary): TrendPoint => {
    const byTarget = r.aggregate?.byTarget ?? {};
    const rate = (key: string) => {
      const t = byTarget[key];
      return t && t.total ? (t.pass / t.total) * 100 : null;
    };
    return {
      id: r.id,
      label: r.label ?? "run",
      when: r.createdAt,
      light: rate("light") ?? 0,
      polish: rate("polish"),
    };
  };
  return {
    typed: oldestFirst.filter((r) => r.audioCases === 0).map(point),
    spoken: oldestFirst.filter((r) => r.audioCases > 0).map(point),
  };
}

/** "6 July 2026, 13:56" in a fixed locale, so server and client agree. */
export function formatWhen(iso: string, withTime = true): string {
  const date = new Date(iso);
  const day = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  if (!withTime) return day;
  const time = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
  return `${day}, ${time}`;
}
