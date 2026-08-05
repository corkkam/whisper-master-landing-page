"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LayoutGroup, motion } from "framer-motion";

/**
 * The headline, dictated.
 *
 * The most satisfying thing this product does is the cleanup: you say "um so
 * can we move the launch review to tuesday at uh two thirty" and what lands is
 * "Can we move the launch review to Tuesday at 2:30?". Every dictation site
 * demonstrates that in a box somewhere below the fold. This does it to the
 * largest piece of type on the page.
 *
 * Four beats, once, on load:
 *
 *   1. **Streaming.** Words arrive one at a time, lowercase and unpunctuated,
 *      in the muted tone — this is a live transcript, not writing yet. An ember
 *      caret trails the last word, because that is your voice still going.
 *   2. **The pause.** The key comes up. Nothing moves for a beat, which is what
 *      makes the next part land.
 *   3. **Marking.** Every word about to be cut is struck through in ember, one
 *      after another in reading order. This is the beat that makes the
 *      correction land — cutting them silently reads as nothing happening.
 *   4. **Cleanup.** The struck words leave and the line glides closed around
 *      them, each survivor settling into ink a moment after the one before it.
 *   5. **Settled.** Capitals, the full stop, and the claim in ember.
 *
 * Then it is completely still. Nothing here loops, per the app's §6 — and the
 * whole thing is skipped under `prefers-reduced-motion`, which gets the final
 * headline immediately.
 *
 * The `<h1>` always contains the finished sentence for search and for screen
 * readers; the animated tokens are `aria-hidden` scaffolding over it.
 */

type Token = {
  /** What was said. */
  raw: string;
  /** What survives cleanup, or null if this word is dropped. */
  clean: string | null;
  /** Marks the claim, which is the one line set in ember. */
  accent?: boolean;
};

const SPOKEN: Token[] = [
  { raw: "um", clean: null },
  { raw: "so", clean: null },
  { raw: "your", clean: "Your" },
  { raw: "voice", clean: "voice" },
  { raw: "is", clean: "is" },
  { raw: "like", clean: null },
  // The stutter. Deliberately two tokens so one can survive and one cannot.
  { raw: "the", clean: null },
  { raw: "the", clean: "the" },
  { raw: "fastest", clean: "fastest" },
  { raw: "thing", clean: "thing" },
  { raw: "about", clean: "about", accent: true },
  { raw: "you", clean: "you", accent: true },
  { raw: "i", clean: null },
  { raw: "think", clean: null },
];

const FINAL = "Your voice is the fastest thing about you.";

/** Milliseconds between spoken words. Roughly a natural speaking rate. */
const WORD_MS = 150;
/** The beat after the key comes up, before anything is marked. */
const HOLD_MS = 700;
/** How long the strike-throughs take to draw across the fillers. */
const MARK_MS = 780;
/** The glide, once the fillers are struck and removed. */
const CLEAN_MS = 1100;
/** How long after the glide starts before the type begins seating. */
const SEAL_IN = 620;
/** Per-word delay while the line seats, in reading order. */
const SEAL_STEP = 62;

/**
 * `marking` is the beat that makes the correction land: the words about to be
 * cut are struck through in ember, one after another in reading order, *before*
 * they disappear. Removing them silently is technically the same result and
 * reads as nothing having happened.
 */
type Phase =
  | "streaming"
  | "holding"
  | "marking"
  | "cleaning"
  /**
   * The payoff. Up to here the line has only *stopped being wrong*; nothing has
   * confirmed it is now right, which is why the clean text was landing flat.
   *
   * So the type seats into the page, letterpress fashion: each word in reading
   * order deepens to full ink, tightens its tracking as the setting
   * consolidates, and blooms a soft ember warmth that fades as it beds in. Then,
   * once the whole line has seated, the full stop drops — held back until last
   * because punctuation arriving on its own is the single most characteristic
   * thing this product does.
   */
  | "sealing"
  | "settled";

export function DictatedHeadline({
  className = "",
  onSettle,
}: {
  className?: string;
  /**
   * Fires when the line begins to seat. The hero uses it to bring the
   * illustration up *behind* the finished sentence — on load the artwork was
   * fully rendered while the headline was still small muted mono, so the fish
   * won the reader's attention over the message.
   */
  onSettle?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("streaming");
  const [spoken, setSpoken] = useState(0);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced.current) {
      setSpoken(SPOKEN.length);
      setPhase("settled");
      return;
    }

    const timers: number[] = [];
    // Stream the words in.
    for (let i = 1; i <= SPOKEN.length; i++) {
      timers.push(window.setTimeout(() => setSpoken(i), 340 + i * WORD_MS));
    }
    const streamEnd = 340 + SPOKEN.length * WORD_MS;
    const markAt = streamEnd + HOLD_MS;
    const cleanAt = markAt + MARK_MS;
    timers.push(window.setTimeout(() => setPhase("holding"), streamEnd));
    timers.push(window.setTimeout(() => setPhase("marking"), markAt));
    timers.push(window.setTimeout(() => setPhase("cleaning"), cleanAt));
    timers.push(window.setTimeout(() => setPhase("sealing"), cleanAt + SEAL_IN));
    const sealDone = cleanAt + SEAL_IN + SPOKEN.length * SEAL_STEP + 520;
    timers.push(window.setTimeout(() => setPhase("settled"), sealDone));

    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (phase === "sealing") onSettle?.();
  }, [phase, onSettle]);

  const cleaned = phase === "cleaning" || phase === "sealing" || phase === "settled";
  const marking = phase === "marking" || cleaned;
  const sealing = phase === "sealing" || phase === "settled";
  const stopped = phase === "settled";

  /** Index of the final surviving word — the one the full stop attaches to. */
  const lastKept = useMemo(() => {
    for (let i = SPOKEN.length - 1; i >= 0; i--) if (SPOKEN[i].clean !== null) return i;
    return -1;
  }, []);

  const tokens = useMemo(() => {
    let seat = 0;
    return SPOKEN.map((t, i) => ({
      ...t,
      i,
      dropped: t.clean === null,
      // Position among the *surviving* words, so the seal does not pause on the
      // gaps where a filler used to be.
      seat: t.clean === null ? -1 : seat++,
      visible: i < spoken,
    }));
  }, [spoken]);

  /**
   * The glide is Motion's layout engine rather than a hand-rolled FLIP.
   *
   * The problem is the same either way — the cleanup changes the font *family*,
   * and a font swap is not something CSS can interpolate, so the words have to
   * be moved by transform. But measuring and inverting by hand meant a
   * two-frame commit per element and no way to interrupt cleanly; `layout` does
   * the invert once per frame for the whole group, on the compositor, and
   * survives being interrupted mid-flight.
   */
  const lineRef = useRef<HTMLSpanElement | null>(null);

  // The caret trails the last word that has arrived, and only while you are
  // still speaking.
  const caretAt = phase === "streaming" ? spoken - 1 : -1;

  return (
    <h1 className={`dictated ${className}`.trim()} data-phase={phase}>
      {/* The real sentence, for search engines and screen readers. */}
      <span className="sr-only">{FINAL}</span>

      <span className="dictated-line" ref={lineRef} aria-hidden="true">
       <LayoutGroup>
        {tokens.map((t) => (
          <motion.span
            key={t.i}
            layout="position"
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            data-i={t.i}
            className={[
              "dw",
              t.dropped ? "dw--drop" : "",
              t.accent ? "dw--accent" : "",
              t.visible ? "is-in" : "",
              marking && t.dropped ? "is-marked" : "",
              cleaned && t.dropped ? "is-gone" : "",
              cleaned ? "is-clean" : "",
              sealing ? "is-sealed" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ "--i": t.i, "--seat": t.seat } as React.CSSProperties}
          >
            {/* The word is `inline-block` once it seats, so it can be moved and
                tracked. The space therefore has to live *outside* it — trailing
                whitespace collapses inside an inline-block — but still inside
                `.dw`, so it leaves with the word when the word is cut. */}
            <span className="dw-in">{cleaned && t.clean ? t.clean : t.raw}</span>
            {/* Every word carries its own trailing space so it leaves with the
                word when cut — except the last one, which the full stop butts
                straight up against. */}
            {!(cleaned && t.i === lastKept) && " "}
            {caretAt === t.i && <i className="dw-caret" />}
          </motion.span>
        ))}
       </LayoutGroup>

        {/* Held back until the line has seated. Punctuation arriving by itself
            is the most recognisable thing the cleanup does, so it gets its own
            beat rather than riding in attached to "you". */}
        <span className={`dictated-stop ${sealing ? "is-in" : ""} ${stopped ? "is-set" : ""}`}>
          .
        </span>
      </span>
    </h1>
  );
}
