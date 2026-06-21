"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
    };
  }
}

/**
 * Cloudflare Turnstile widget. If NEXT_PUBLIC_TURNSTILE_SITE_KEY is unset it
 * renders nothing and immediately reports a sentinel token, so the flow works
 * locally before Turnstile is configured (the server also skips then).
 */
export default function Turnstile({
  onToken,
}: {
  onToken: (token: string | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onToken);
  cb.current = onToken;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey) {
      cb.current("dev-skip");
      return;
    }
    const SCRIPT_ID = "cf-turnstile-script";

    const render = () => {
      if (window.turnstile && ref.current && !ref.current.hasChildNodes()) {
        window.turnstile.render(ref.current, {
          sitekey: siteKey,
          theme: "dark",
          callback: (t: string) => cb.current(t),
          "error-callback": () => cb.current(null),
          "expired-callback": () => cb.current(null),
        });
      }
    };

    if (document.getElementById(SCRIPT_ID)) {
      render();
    } else {
      const s = document.createElement("script");
      s.id = SCRIPT_ID;
      s.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.defer = true;
      s.onload = render;
      document.head.appendChild(s);
    }
  }, [siteKey]);

  if (!siteKey) return null;
  return <div ref={ref} className="mt-1 min-h-[65px]" />;
}
