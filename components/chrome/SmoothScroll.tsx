"use client";

import { ReactLenis, useLenis } from "lenis/react";
import "lenis/dist/lenis.css";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Global Lenis instance in `root` mode — it drives window scroll rather than a
 * wrapper element, so `position: sticky` / `fixed` and hash anchors keep working
 * and no extra DOM is introduced.
 *
 * Smoothing is a comfort, not a requirement: when the visitor asks for reduced
 * motion we mount plain native scrolling instead.
 */
export default function SmoothScroll({ children }: { children: ReactNode }) {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const onChange = () => setReduce(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // `HashNavigation` is mounted in both branches. Half of what it does is
  // routing, not scrolling, and that has to work whether or not the visitor
  // gets smoothing — it falls back to `window.scrollTo` when Lenis is absent.
  if (reduce) {
    return (
      <>
        <HashNavigation />
        {children}
      </>
    );
  }

  return (
    <ReactLenis
      root
      options={{
        // Slightly long duration + a deep ease-out: the page should feel like it
        // has mass, which suits a tool you talk to rather than click at.
        duration: 1.05,
        easing: (t: number) => 1 - Math.pow(1 - t, 3.2),
        wheelMultiplier: 0.9,
        touchMultiplier: 1.6,
        // Native touch scrolling stays native — smoothing a thumb drag feels wrong.
        syncTouch: false,
      }}
    >
      <HashNavigation />
      {children}
    </ReactLenis>
  );
}

/** Clearance for the fixed nav bar, so a target doesn't land under it. */
const NAV_OFFSET = -90;

/** Frames to keep re-measuring after a route change before giving up. */
const MAX_SETTLE_FRAMES = 30;

/** Frames to keep correcting once the target has been found. */
const CORRECTION_FRAMES = 6;

/** `document.querySelector` throws on a hash that isn't a valid selector. */
function findTarget(hash: string): HTMLElement | null {
  if (!hash || hash === "#") return null;
  try {
    return document.querySelector(hash);
  } catch {
    return null;
  }
}

/**
 * Hash navigation, routed through Lenis.
 *
 * Anything that scrolls the window natively while Lenis is running leaves its
 * virtual position stale, and the next wheel event snaps the page back to where
 * Lenis thought it was — which is what made the nav links look broken. Both the
 * router and plain anchors do exactly that, so every same-document hash jump has
 * to go through `lenis.scrollTo` instead.
 *
 * Cross-document hash links ("/#features" from /roadmap) can't be left to the
 * router either — see the click handler.
 */
function HashNavigation() {
  const lenis = useLenis();
  const router = useRouter();
  const pathname = usePathname();
  const firstRun = useRef(true);
  // A hash we still owe the incoming route, stashed when a cross-page link is
  // clicked so the route change can finish the job.
  const pendingHash = useRef<string | null>(null);

  const scrollToHash = useCallback(
    (hash: string, immediate: boolean) => {
      const target = findTarget(hash);
      if (!target) return false;

      if (!lenis) {
        // No Lenis means reduced motion, so never animate the jump.
        window.scrollTo({
          top: target.getBoundingClientRect().top + window.scrollY + NAV_OFFSET,
          behavior: "auto",
        });
        return true;
      }

      // Lenis caches the scroll limit from its last resize and clamps `scrollTo`
      // against it. After a route change that limit belongs to the page we came
      // from, so without this the jump stops at the *previous* page's maximum
      // scroll — which is what made "Features" from /download land near the top
      // of the home page rather than on the section.
      lenis.resize();
      lenis.scrollTo(target, { offset: NAV_OFFSET, immediate, force: true });
      return true;
    },
    [lenis]
  );

  useEffect(() => {
    function onClick(e: MouseEvent) {
      // Let modified clicks (new tab, download, etc.) behave normally.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }

      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      // Plain route links are next/link's job and it handles them correctly.
      if (!url.hash) return;

      // Same-document hash links — `#id`, `/#id`, or `<current path>#id`. The nav
      // writes the middle form via next/link, which is why matching on a leading
      // "#" alone missed it and let the router scroll instead.
      //
      // Capture phase, so this runs before the router's handler: stop the event
      // outright rather than letting it navigate and then correcting the scroll.
      if (url.pathname === window.location.pathname) {
        if (!scrollToHash(url.hash, false)) return;
        e.preventDefault();
        e.stopPropagation();
        window.history.pushState(null, "", url.hash);
        return;
      }

      // Cross-document hash link, e.g. "/#features" from /roadmap. Handing the
      // whole URL to the router doesn't work: in dev it drops the navigation
      // silently (the RSC request goes out, nothing commits), and in production
      // the scroll races the incoming page's layout. Route to the bare path —
      // which the router does handle — and let the effect below scroll once the
      // target actually exists.
      e.preventDefault();
      e.stopPropagation();
      pendingHash.current = url.hash;
      router.push(url.pathname + url.search);
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [router, scrollToHash]);

  /**
   * Route changes. Three cases, all of which used to leave Lenis out of step:
   *
   *  - a hash we owe the incoming route (the cross-page click above),
   *  - landing on a hash directly (a deep link or back/forward),
   *  - landing at the top, where the router has already reset the window but
   *    Lenis still holds the previous page's offset and would drag the new page
   *    back down on the first wheel event.
   */
  useEffect(() => {
    const hash = pendingHash.current ?? window.location.hash;
    pendingHash.current = null;

    if (hash) {
      let raf = 0;
      let frames = 0;
      let hits = 0;

      // The target may not be mounted on the first frame, and fonts or images
      // above it can still shift it afterwards — so keep re-measuring for a
      // short while rather than betting on a single fixed delay.
      const settle = () => {
        if (scrollToHash(hash, true)) {
          if (hits === 0 && window.location.hash !== hash) {
            // Reflect the section in the URL now that we've actually landed.
            window.history.replaceState(null, "", hash);
          }
          hits++;
        }
        frames++;
        if (hits >= CORRECTION_FRAMES || frames >= MAX_SETTLE_FRAMES) return;
        raf = requestAnimationFrame(settle);
      };

      raf = requestAnimationFrame(settle);
      return () => cancelAnimationFrame(raf);
    }

    // Don't fight the browser restoring scroll position on a reload.
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }

    if (!lenis) return;
    lenis.resize();
    lenis.scrollTo(0, { immediate: true, force: true });
  }, [lenis, pathname, scrollToHash]);

  // Back/forward through hashes we pushed above.
  useEffect(() => {
    const onHashChange = () => scrollToHash(window.location.hash, false);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [scrollToHash]);

  return null;
}
