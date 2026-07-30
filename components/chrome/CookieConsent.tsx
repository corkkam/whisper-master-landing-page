"use client";

import { useEffect, useState } from "react";
import {
  CONSENT_MANAGE_EVENT,
  GA_ENABLED,
  readConsent,
  writeConsent,
  type Consent,
} from "@/lib/analytics";

/**
 * Bottom-left consent card. Deliberately not a modal: it doesn't trap focus or
 * block the page, because the page works fine whichever button you press.
 *
 * Accept and Decline are the same size, same weight, one click each — the
 * decline path isn't buried behind a settings screen.
 */
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // No measurement ID means no non-essential cookies exist to consent to,
    // so asking would be theatre.
    if (!GA_ENABLED) return;

    if (readConsent() === null) setVisible(true);

    // Footer → "Cookie settings" re-opens this so a choice can be withdrawn.
    const onManage = () => setVisible(true);
    window.addEventListener(CONSENT_MANAGE_EVENT, onManage);
    return () => window.removeEventListener(CONSENT_MANAGE_EVENT, onManage);
  }, []);

  if (!visible) return null;

  const decide = (value: Consent) => {
    writeConsent(value);
    setVisible(false);
  };

  return (
    <div
      className="consent"
      role="region"
      aria-label="Cookie consent"
      data-cursor="Your call"
    >
      <p className="consent-label">
        <i className="rec-dot" />
        Cookies
      </p>

      <p className="consent-copy">
        Transcription never leaves your Mac — but this website uses Google
        Analytics to count visits. It only loads if you say yes. Sign-in cookies
        are always on, because sign-in needs them.
      </p>

      <div className="consent-actions">
        <button
          type="button"
          className="btn btn--primary consent-btn"
          onClick={() => decide("granted")}
        >
          Accept
        </button>
        <button
          type="button"
          className="btn btn--ghost consent-btn"
          onClick={() => decide("denied")}
        >
          Decline
        </button>
      </div>
    </div>
  );
}
