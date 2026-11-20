"use client";

import { useUser } from "@clerk/nextjs";
import { downloads, product } from "@/lib/config";
import { proofStats } from "@/lib/content";
import { useCallback, useState } from "react";
import { Rise } from "@/components/plates/Plate";
import { HeroPond } from "@/components/plates/HeroPond";
import { DictatedHeadline, type Phase } from "@/components/plates/DictatedHeadline";
import LiveDictation from "./LiveDictation";

/**
 * PLATE 00 — THE SOURCE.
 *
 * The hero is the pond, and the pond is a readout.
 *
 * The specimen below carries the worked example; the headline above carries
 * the argument. Nothing on this plate duplicates the other.
 */

export default function Hero() {
  const { user, isLoaded } = useUser();
  /** The pond surfaces once the headline starts to seat, not before. */
  const [surfaced, setSurfaced] = useState(false);
  /* `null` until the reader takes the key. Holding makes the koi talk and
     nothing else — the headline dictates itself once, on load, and is then
     left alone. Re-running it on every hold turned the page's own argument
     into a toy. */
  const [speaking, setSpeaking] = useState<boolean | null>(null);
  const [cue, setCue] = useState(false);
  const onSettle = useCallback(() => setSurfaced(true), []);
  const onPhase = useCallback((p: Phase) => {
    // The invitation waits for the full stop to drop. Offering it while the
    // sentence is still resolving asks the reader to interrupt the one thing
    // the hero exists to show them.
    if (p === "settled") setCue(true);
  }, []);
  const onSpeakStart = useCallback(() => setSpeaking(true), []);
  const onSpeakEnd = useCallback(() => setSpeaking(false), []);
  const firstName = user?.firstName ?? user?.username ?? null;

  return (
    <section className="hero" id="top">
      {/* Two layers. The surface drifts through a slow flow field; the koi
          sits under it and is only ever distorted by what the water is doing.
          See components/plates/HeroPond.tsx. */}
      <HeroPond
        priority
        amp={0.011}
        speaking={speaking}
        onSpeakStart={onSpeakStart}
        onSpeakEnd={onSpeakEnd}
        className={`hero-water ${surfaced ? "is-up" : ""}`}
      />

      <div className="plate-inner hero-inner">
        <Rise>
          <p className="plate-no">
            <b>Plate 00</b>
            <span>
              {isLoaded && firstName ? `Welcome back, ${firstName}` : "The source"}
            </span>
          </p>
        </Rise>

        {/* The headline dictates itself: raw speech in, cleanup on the largest
            type on the page. See components/plates/DictatedHeadline.tsx. */}
        <DictatedHeadline className="hero-title" onSettle={onSettle} onPhase={onPhase} />

        <Rise delay={80}>
          <p className="hero-sub">
            {/* The instruction is the instrument.
                A floating "hold to speak" chip on the artwork was the obvious
                place for this and the wrong one twice over: `.hero-inner` sits
                above the band, so on a wide screen most of the pond cannot take
                a press at all — and the page was already telling the reader to
                hold one key two words earlier. Making the words themselves the
                key needs no new furniture and puts the control exactly where
                the sentence promises it. */}
            <button
              type="button"
              className={`hold-key ${cue ? "is-live" : ""}`}
              aria-label="Hold to dictate the headline"
              disabled={!cue}
              onPointerDown={(e) => {
                if (e.pointerType === "mouse" && e.button !== 0) return;
                e.currentTarget.setPointerCapture?.(e.pointerId);
                onSpeakStart();
              }}
              onPointerUp={onSpeakEnd}
              onPointerCancel={onSpeakEnd}
              onKeyDown={(e) => {
                if (e.key !== " " && e.key !== "Enter" || e.repeat) return;
                e.preventDefault();
                onSpeakStart();
              }}
              onKeyUp={(e) => {
                if (e.key !== " " && e.key !== "Enter") return;
                e.preventDefault();
                onSpeakEnd();
              }}
              onBlur={onSpeakEnd}
            >
              <i aria-hidden="true" />
              Hold one key
            </button>{" "}
            and talk. {product.name} writes clean, punctuated text straight to
            your cursor in any app — and the audio never leaves the machine it
            was spoken into.
          </p>
        </Rise>

        <Rise delay={140}>
          <div className="hero-actions">
            <a className="btn btn--primary btn--xl" href="#unit">
              Download for Mac
            </a>
            <a className="hero-secondary" href="#chain">
              See the signal path →
            </a>
          </div>
        </Rise>

        <Rise delay={200}>
          <p className="hero-meta">
            <span>{downloads.requirements}</span>
            <i aria-hidden="true" />
            <span>Free while in beta</span>
          </p>
        </Rise>


        <Rise className="hero-capture">
          <LiveDictation />
        </Rise>

        <div className="specs">
          {proofStats.map((s, i) => (
            <Rise key={s.label} className="spec" delay={i * 70}>
              <strong>{s.value}</strong>
              <span className="spec-term">{s.label}</span>
              <span className="spec-note">{s.note}</span>
            </Rise>
          ))}
        </div>
      </div>
    </section>
  );
}
