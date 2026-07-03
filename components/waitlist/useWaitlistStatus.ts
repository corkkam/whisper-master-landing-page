"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { getDashboard, type Dashboard } from "@/lib/waitlist/actions";

const CACHE_KEY = "whisper-master:dashboard";
const EVENT = "whisper-master:dashboard";

// Dedupe concurrent fetches (Hero + FinalCTA mount together).
let inflight: Promise<Dashboard | null> | null = null;

function readCache(): Dashboard | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Dashboard) : null;
  } catch {
    return null;
  }
}

/** Persist + broadcast a fresh dashboard so every status card updates in place. */
export function publishDashboard(dash: Dashboard | null) {
  try {
    if (dash) sessionStorage.setItem(CACHE_KEY, JSON.stringify(dash));
    else sessionStorage.removeItem(CACHE_KEY);
  } catch {
    /* storage unavailable — event still keeps mounted cards in sync */
  }
  window.dispatchEvent(new CustomEvent<Dashboard | null>(EVENT, { detail: dash }));
}

/**
 * Waitlist status for the current browser session. `dash` is non-null once we
 * know the signed-in visitor already has a spot — cached copy first (instant),
 * then refreshed from the server.
 */
export function useWaitlistStatus() {
  const { isLoaded, isSignedIn } = useUser();
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      try {
        sessionStorage.removeItem(CACHE_KEY);
      } catch {}
      setDash(null);
      setReady(true);
      return;
    }

    const cached = readCache();
    if (cached) {
      setDash(cached);
      setReady(true);
    }

    let cancelled = false;
    inflight ??= getDashboard().finally(() => {
      inflight = null;
    });
    inflight.then((d) => {
      if (cancelled) return;
      setDash(d);
      setReady(true);
      try {
        if (d) sessionStorage.setItem(CACHE_KEY, JSON.stringify(d));
        else sessionStorage.removeItem(CACHE_KEY);
      } catch {}
    });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  // Live updates from the join modal (new signup, referral share, etc.).
  useEffect(() => {
    const h = (e: Event) => {
      setDash((e as CustomEvent<Dashboard | null>).detail);
      setReady(true);
    };
    window.addEventListener(EVENT, h);
    return () => window.removeEventListener(EVENT, h);
  }, []);

  return { dash, ready, isSignedIn: isLoaded ? isSignedIn : false };
}
