// Parity harness for `scoring.ts`, which is a hand port of the Mac app's Swift
// `EvalScoreKit`. If the two drift, the number published on /eval is the wrong
// one — and the only thing that used to say so was a comment at the top of the
// file.
//
// Every assertion below is the same case as a test in
// `eval/text-cleanup/EvalScoreTests/` in the whisper-master repo
// (`MatcherTests`, `MetricsTests`). When you change either side, change both and
// run this.
//
//   pnpm eval:parity          (Node runs TypeScript natively; no test runner)
//
// It lives in scripts/ and is excluded from tsconfig, so the `.ts` import
// extension Node needs does not force `allowImportingTsExtensions` on the app.
//
// Deliberately dependency-free and not wired into CI here: the Swift side is the
// source of truth and its own tests gate it, so this is the check you run when
// touching the port.

import { matches, normWords, novelWords, percentileIndex } from "../lib/eval/scoring.ts";

let bad = 0;
const eq = (label: string, got: unknown, want: unknown) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    bad++;
    console.log("FAIL", label, "->", JSON.stringify(got), "want", JSON.stringify(want));
  }
};
const W = normWords;

// --- matcher: the same 16 assertions as the Swift MatcherTests
eq("um/number", matches("um", "The number in the summary."), false);
eq("um/real", matches("um", "So um, I think."), true);
eq("uh/although", matches("uh", "Although the throughput held."), false);
eq("AM/campaign", matches("AM", "The same example campaign."), false);
eq("AM/real", matches("AM", "Meet at 9 AM."), true);
eq("20/2025", matches("20", "It closed in 2025."), false);
eq("30/real", matches("30", "About 30 minutes."), true);
eq("$25", matches("$25", "It is $25."), true);
eq("1.", matches("1.", "1. First"), true);
eq("is@", matches("is@", "The repo is@github.com/x."), true);
eq("PR", matches("PR", "Review the PR?"), true);
eq("PRs", matches("PR", "Both PRs are open."), false);
eq("4:00", matches("4", "The meeting is at 4:00."), true);
eq("url", matches("github.com/corkkam", "See github.com/corkkam/x."), true);
eq("thursday", matches("thursday", "Cut over on Thursday."), true);
eq("newline-dash", matches("\n- ", "items:\n- one"), true);

// --- novelWords: the same 8 as the Swift MetricsTests
eq("itn", novelWords(W("it costs twenty five"), W("It costs $25.")), []);
eq("initialism", novelWords(W("our a p i is slow"), W("Our API is slow.")), []);
eq("contraction", novelWords(W("i do not think so"), W("I don't think so.")), []);
eq("digit-initialism", novelWords(W("send it to 1400 market street apartment 6 b"), W("Send it to 1400 Market Street Apartment 6B.")), []);
eq("two-token-join", novelWords(W("she said c est la vie"), W('She said "c\'est la vie".')), []);
eq("ordinal", novelWords(W("the deadline is march fifteenth"), W("The deadline is March 15th.")), []);
eq("answered", novelWords(W("what is the capital of france"), W("The capital of France is Paris.")), ["paris"]);
eq("dedup", novelWords(W("hello"), W("hello Paris Paris Paris")), ["paris"]);

// --- percentileIndex
eq("pct(2,.9)", percentileIndex(2, 0.9), 1);
eq("pct(1,.9)", percentileIndex(1, 0.9), 0);
eq("pct(10,.9)", percentileIndex(10, 0.9), 8);
eq("pct(100,.99)", percentileIndex(100, 0.99), 98);
eq("pct(0,.9)", percentileIndex(0, 0.9), 0);

// --- case-sensitive assertions (Swift MatcherTests.testExactAssertion*)
eq("exact/API-right", matches("API", "Our API is slow.", true), true);
eq("exact/API-wrong", matches("API", "Our api is slow.", true), false);
eq("exact/API-plural", matches("API", "Our APIs are slow.", true), false);
eq("exact/Parakeet-lower", matches("Parakeet", "We deployed the parakeet model.", true), false);
eq("exact/Parakeet-right", matches("Parakeet", "We deployed the Parakeet model.", true), true);
eq("insensitive-unchanged", matches("api", "Our API is slow."), true);
eq("exact/punctuation-term", matches("$25", "It is $25.", true), true);

console.log(bad === 0 ? "PARITY OK — 36 checks match the Swift EvalScoreKit tests" : `${bad} FAILED`);
process.exit(bad ? 1 : 0);
