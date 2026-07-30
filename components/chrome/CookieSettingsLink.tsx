"use client";

import { CONSENT_MANAGE_EVENT, GA_ENABLED } from "@/lib/analytics";

/**
 * Reopens the consent card so a visitor can withdraw (or grant) analytics
 * consent later — the "as easy to withdraw as to give" half of GDPR 7(3).
 */
export default function CookieSettingsLink() {
  if (!GA_ENABLED) return null;

  return (
    <button
      type="button"
      className="footer-cookies"
      onClick={() => window.dispatchEvent(new Event(CONSENT_MANAGE_EVENT))}
    >
      Cookie settings
    </button>
  );
}
