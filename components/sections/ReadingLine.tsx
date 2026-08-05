"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * The reading line.
 *
 * The page's one large-type moment, held between the bottleneck and the
 * enclosure — the hinge in the story, where the complaint turns into the claim.
 *
 * Words sit at the paper's own middle tone and settle into full ink as they
 * cross a line two thirds up the viewport, one at a time in reading order. The
 * last four words take the live colour, because they are the promise the rest
 * of the page is drawn to prove.
 */
const LINES = ["Say it once.", "It goes nowhere", "but your Mac."];

/** Words from this index on are set in the live colour. */
const LIVE_FROM = 4;

export default function ReadingLine() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [lit, setLit] = useState(0);

  const lines = useMemo(() => {
    let n = 0;
    return LINES.map((line) => line.split(" ").map((word) => ({ word, i: n++ })));
  }, []);
  const total = lines.reduce((sum, l) => sum + l.length, 0);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setLit(total);
      return;
    }

    let raf = 0;
    let running = false;

    const measure = () => {
      const trigger = window.innerHeight * 0.68;
      let count = 0;
      for (const el of wordRefs.current) {
        if (el && el.getBoundingClientRect().top < trigger) count += 1;
        else break;
      }
      // Words only ever light. Scrolling back up must not put them out, which
      // would turn a reading effect into a scrubber.
      setLit((prev) => (count > prev ? count : prev));
      raf = running ? requestAnimationFrame(measure) : 0;
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !running) {
          running = true;
          raf = requestAnimationFrame(measure);
        } else if (!entry.isIntersecting) {
          running = false;
          if (raf) cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(host);

    return () => {
      io.disconnect();
      running = false;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [total]);

  return (
    <section className="plate" aria-label="Say it once. It goes nowhere but your Mac.">
      <div className="plate-inner">
        <div className="reading" ref={hostRef}>
          <p className="reading-copy">
            {lines.map((line, li) => (
              <span className="reading-line" key={li}>
                {line.map(({ word, i }) => (
                  <span
                    key={i}
                    ref={(el) => {
                      wordRefs.current[i] = el;
                    }}
                    className={`reading-word ${i >= LIVE_FROM ? "is-live" : ""} ${
                      i < lit ? "is-lit" : ""
                    }`}
                  >
                    {word}{" "}
                  </span>
                ))}
              </span>
            ))}
          </p>
        </div>
      </div>
    </section>
  );
}
