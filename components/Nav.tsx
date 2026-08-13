"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { Wordmark } from "./Wordmark";
import MenuBarNotch from "./chrome/MenuBarNotch";

/**
 * The running head, as a menu bar.
 *
 * This bar spent a long while as printed matter — ink on the page's own stock,
 * a hairline under it, nothing that looked like screen glass. That was the
 * right call while the notch was drawn down in the hero, because a slab of
 * chrome floating over paper is a material mismatch and no amount of colour
 * tuning fixes it.
 *
 * The resolution isn't to keep the two materials apart, it's to say which one
 * the *viewport* is. It is a Mac display: the page is what's on screen, the top
 * edge is the lid, and the notch belongs in it — centred, hanging off the real
 * edge, exactly where the app's band appears when you hold the key.
 *
 * Which then fixes the layout, because macOS has already solved it. A Mac menu
 * bar puts identity and menus to the left of the housing and status to the
 * right, and it never centres a row of links, because the housing is already
 * occupying the centre. So:
 *
 *   - **Left of the island:** the wordmark, then the plate you are standing on,
 *     named in full. That second slot is the one macOS gives the frontmost
 *     app's name, and "where am I in this document" is the equivalent fact.
 *   - **The island:** fixed track, never moves. It has to be fixed — the band
 *     opens and closes on the demo's clock, and a centre column sized to its
 *     content would shove both sides around every few seconds. The track is
 *     the band at full extension; the band moves inside it, nothing else moves.
 *   - **Right of it:** the contents rail, the destinations, the way in.
 *
 * The rail is where the real editing happened. This side used to carry seven
 * numbered word-links, and they did not fit: ~520px of labels sharing one half
 * of the bar with a wordmark and a CTA, crushed together and colliding with the
 * notch (which is what the bar looked like before this pass). Seven ticks cost
 * 112px and lose nothing — the current plate is named in full on the left, each
 * tick names itself on hover, and the whole labelled contents is one click away
 * in the sheet. It also reads as the app's own level meter, which is the right
 * accident: a readout of position, drawn the way this product draws a readout.
 *
 * What survived from the printed version: type set in ink, no fill on the bar
 * beyond a wash of the paper itself, and the hairline beneath doubling as the
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
  // Pricing is off the nav while the beta is free — see the note on the top-bar
  // link below. The route itself still works; it is just not advertised.
  // { href: "/pricing", label: "Pricing" },
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

  const [active, setActive] = useState(PLATES[0].id);
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
      // Hold the last plate through any gap between sections. Falling back to
      // "00 Source" in the seams would have the readout on the left announce a
      // section you left several screens ago.
      setActive((prev) => current ?? prev);

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

  const here = Math.max(0, PLATES.findIndex((p) => p.id === active));
  const plate = PLATES[here];

  return (
    <>
      <nav className="runhead" data-dropped={dropped} aria-label="Main">
        {/* Left of the island: who this is, and where you are in it. */}
        <div className="runhead-side runhead-side--l">
          <Link href="/" className="runhead-mark" aria-label="Whisper Master home">
            <Wordmark />
          </Link>

          {onHome && (
            <span className="runhead-plate">
              <b>{plate.n}</b>
              {/* Re-keyed on purpose: remounting replays the drop-in, so the
                  label changes the way a menu bar's app name changes. */}
              <span key={plate.id}>{plate.label}</span>
            </span>
          )}
        </div>

        {/* The island, pinned to the centre of the display. */}
        <MenuBarNotch />

        {/* Right of it: how far you've read, and where else you can go. */}
        <div className="runhead-side runhead-side--r">
          {onHome && (
            <ol className="runhead-index" aria-label="Plates">
              {PLATES.map((p, i) => (
                <li key={p.id}>
                  <a
                    href={p.href}
                    data-state={i < here ? "past" : i === here ? "here" : "ahead"}
                    aria-current={i === here ? "true" : undefined}
                  >
                    <i aria-hidden="true" />
                    {/* Visible on hover and focus, and always the link's
                        accessible name — moved with opacity and transform
                        rather than display, so it stays in the a11y tree. */}
                    <span>
                      {p.n} {p.label}
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          )}

          {onHome && <span className="runhead-div" aria-hidden="true" />}

          {/* Pricing is commented out rather than deleted, and stays that way
              until paid plans actually start. Everything is free during the
              beta, so a Pricing link in the menu bar asks a question the site
              then has to talk the visitor out of — it buys an objection for
              free, right next to the download. Restore this line and the PAGES
              entry above together when there is something to charge for. */}
          {/* <Link className="runhead-page" href="/pricing">
            Pricing
          </Link> */}
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
            aria-label={open ? "Close contents" : "Open contents"}
            title="Contents"
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
        <div className="menu-sheet-inner">
          <div>
            <p className="menu-sheet-head">Contents</p>
            <ol className="menu-plates">
              {PLATES.map((p, i) => (
                <li key={p.id} style={{ transitionDelay: `${open ? 60 + i * 38 : 0}ms` }}>
                  <a
                    href={p.href}
                    onClick={() => setOpen(false)}
                    aria-current={onHome && p.id === active ? "true" : undefined}
                  >
                    <b>{p.n}</b>
                    <span>{p.label}</span>
                  </a>
                </li>
              ))}
            </ol>
          </div>

          <div>
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
            {/* The sheet is now the only nav some visitors open, so it carries
                the download rather than dead-ending on a list of links. */}
            <Link
              className="btn btn--primary menu-sheet-cta"
              href="/download"
              onClick={() => setOpen(false)}
            >
              Download for Mac
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
