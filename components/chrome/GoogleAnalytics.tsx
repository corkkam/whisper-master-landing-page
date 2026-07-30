"use client";

import { Suspense, useEffect, useState } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import {
  CONSENT_EVENT,
  GA_ENABLED,
  GA_MEASUREMENT_ID,
  gtag,
  initGtag,
  readConsent,
  type Consent,
} from "@/lib/analytics";

function GoogleAnalyticsTag() {
  const [consent, setConsent] = useState<Consent | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // The consent cookie is only legible on the client, so the first render is
  // always "undecided" and we settle on the real answer here. CookieConsent
  // tells us about later changes rather than us polling the cookie.
  useEffect(() => {
    setConsent(readConsent());
    const onChange = (e: Event) =>
      setConsent((e as CustomEvent<Consent>).detail);
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  const granted = GA_ENABLED && consent === "granted";

  // Queue the config before the tag arrives. Declared ahead of the page-view
  // effect so it always runs first on the render that flips `granted`.
  useEffect(() => {
    if (granted) initGtag();
  }, [granted]);

  // `send_page_view: false` above means every view — first load included — is
  // sent from here, which is also what makes client-side routing show up.
  useEffect(() => {
    if (!granted) return;
    const qs = searchParams.toString();
    gtag("event", "page_view", {
      page_path: qs ? `${pathname}?${qs}` : pathname,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [granted, pathname, searchParams]);

  if (!granted) return null;

  return (
    <Script
      id="ga-tag"
      src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      strategy="afterInteractive"
    />
  );
}

/**
 * GA4, gated on the cookie banner. Renders nothing at all until the visitor
 * opts in — see lib/analytics.ts for the why.
 */
export default function GoogleAnalytics() {
  // useSearchParams() opts a route into client rendering unless it sits behind
  // a Suspense boundary; this component lives in the root layout, so it needs
  // one to keep the static pages static.
  return (
    <Suspense fallback={null}>
      <GoogleAnalyticsTag />
    </Suspense>
  );
}
