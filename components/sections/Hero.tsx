"use client";

import { useUser } from "@clerk/nextjs";
import { downloads, product } from "@/lib/config";
import { proofStats } from "@/lib/content";
import { useCallback, useState } from "react";
import { Rise } from "@/components/plates/Plate";
import { Water } from "@/components/plates/Water";
import { DictatedHeadline } from "@/components/plates/DictatedHeadline";
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
  const onSettle = useCallback(() => setSurfaced(true), []);
  const firstName = user?.firstName ?? user?.username ?? null;



  return (
    <section className="hero" id="top">
      {/* The surface is alive: the drawn contour lines glide through a slow
          flow field. See components/plates/Water.tsx. */}
      <Water
        src="/hero/koi-single.webp"
        alt="A koi turning in still water, drawn in coloured pencil, its wake spreading across the surface"
        priority
        amp={0.011}
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
        <DictatedHeadline className="hero-title" onSettle={onSettle} />

        <Rise delay={80}>
          <p className="hero-sub">
            Hold one key and talk. {product.name} writes clean, punctuated text
            straight to your cursor in any app — and the audio never leaves the
            machine it was spoken into.
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
