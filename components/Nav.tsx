"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { Wordmark } from "./Wordmark";

/**
 * The running head, printed.
 *
 * Every other thing on this page is printed matter — flat ink on paper,
 * hairline rules, plate numbers, pencil drawings, no depth anywhere. The bar
 * was the one object made of a different material: a slab floating above the
 * page with a glass sheen, an accent bloom, a drop shadow and rounded corners.
 *
 * Quoting the app's notch was the wrong instinct, even though the shape is the
 * product's own. The app's chrome is screen glass; this site is paper. The two
 * materials cannot share a page, and no amount of retuning the colour or the
 * type was going to fix that, because neither was the problem.
 *
 * So the head is printed directly onto the stock: no fill, no float, no glass.
 * Ink type, one hairline rule beneath it, and the plate index set in the same
 * mono-and-display pairing the plates themselves use. The rule doubles as the
 * position readout — it fills in ember as you read down, the way a page number
 * would tell you the same thing.
 */

/** The plates, in reading order. These mirror the sections in `app/page.tsx`. */
const PLATES = [
  { n: "00", label: "Source", href: "/#top", id: "top" },
  { n: "01", label: "Bottleneck", href: "/#bottleneck", id: "bottleneck" },
  { n: "02", label: "Enclosure", href: "/#enclosure", id: "enclosure" },
  { n: "03", label: "Chain", href: "/#chain", id: "chain" },
  { n: "04", label: "Output", href: "/#parts", id: "parts" },
  { n: "05", label: "Notes", href: "/#notes", id: "notes" },
  { n: "06", label: "Unit", href: "/#unit", id: "unit" },
];

/** Pages that are not part of the manual's plate sequence. */
const PAGES = [
  { href: "/pricing", label: "Pricing" },
  { href: "/for-teams", label: "Teams" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/trust", label: "What leaves your Mac" },
];

export default function Nav() {
  /**
   * The rule's fill. Driven straight off the scroll and then through a spring,
   * so it glides rather than stepping once per scroll event — a value written
   * discretely from a scroll handler always reads as snapping, however often
   * the handler runs.
   */
  const { scrollYProgress } = useScroll();
  const fill = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    mass: 0.35,
    restDelta: 0.0005,
  });

  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [dropped, setDropped] = useState(false);
  /** True once the hero's own download button is no longer on screen. */
  const [ctaNeeded, setCtaNeeded] = useState(false);
  const pathname = usePathname();
  const onHome = pathname === "/";

  useEffect(() => setOpen(false), [pathname]);

  // The drop-in. One frame after mount so the transition has a start state.
  useEffect(() => {
    const id = requestAnimationFrame(() => setDropped(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    let frame = 0;
    const read = () => {

      // Which plate the bar is currently sitting over. Measured rather than
      // derived from offsets, so re-ordering the page cannot desync it.
      let current: string | null = null;
      for (const p of PLATES) {
        const el = document.getElementById(p.id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top <= 120 && r.bottom > 120) current = p.id;
      }
      setActive(current);

      // Does the band need to carry the CTA? Only if the hero's is gone.
      const heroCta = document.querySelector(".hero-actions");
      if (heroCta) {
        const r = heroCta.getBoundingClientRect();
        setCtaNeeded(r.bottom < 72);
      } else {
        setCtaNeeded(true);
      }

      frame = 0;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const plate = PLATES.find((p) => p.id === active) ?? PLATES[0];

  return (
    <>
      <nav className="runhead" data-dropped={dropped} aria-label="Main">
        <Link href="/" className="runhead-mark" aria-label="Whisper Master home">
          <Wordmark />
        </Link>

        {onHome && (
          <ol className="runhead-toc">
            {PLATES.map((p) => (
              <li key={p.id}>
                <a
                  href={p.href}
                  className={active === p.id ? "is-here" : ""}
                  aria-current={active === p.id ? "true" : undefined}
                >
                  <b>{p.n}</b>
                  <span>{p.label}</span>
                </a>
              </li>
            ))}
          </ol>
        )}

        <div className="runhead-end">
          <Link className="runhead-page" href="/pricing">
            Pricing
          </Link>
          {/* Only once the hero's own download button has scrolled away. */}
          <Link
            className="btn btn--primary btn--sm runhead-cta"
            href="/download"
            data-shown={ctaNeeded}
            tabIndex={ctaNeeded ? undefined : -1}
            aria-hidden={ctaNeeded ? undefined : true}
          >
            Get the app
          </Link>
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="menu-sheet"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <i aria-hidden="true" />
            <i aria-hidden="true" />
          </button>
        </div>

        {/* The rule under the head, doubling as the position readout. */}
        <span className="runhead-rule" aria-hidden="true">
          <motion.i style={{ scaleX: fill }} />
        </span>
      </nav>

      <div id="menu-sheet" className="menu-sheet" data-open={open} inert={!open}>
        <p className="menu-sheet-head">Contents</p>
        <ol className="menu-plates">
          {PLATES.map((p, i) => (
            <li key={p.id} style={{ transitionDelay: `${open ? 60 + i * 38 : 0}ms` }}>
              <a href={p.href} onClick={() => setOpen(false)}>
                <b>{p.n}</b>
                <span>{p.label}</span>
              </a>
            </li>
          ))}
        </ol>
        <p
          className="menu-sheet-head"
          style={{ transitionDelay: `${open ? 60 + PLATES.length * 38 : 0}ms` }}
        >
          Elsewhere
        </p>
        <ul className="menu-pages">
          {PAGES.map((p, i) => (
            <li
              key={p.href}
              style={{ transitionDelay: `${open ? 100 + (PLATES.length + i) * 38 : 0}ms` }}
            >
              <Link href={p.href} onClick={() => setOpen(false)}>
                {p.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
