"use client";

import { Wordmark } from "./Wordmark";
import { useJoin } from "./waitlist/JoinContext";
import { useWaitlistStatus } from "./waitlist/useWaitlistStatus";

const links = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features",     label: "Features" },
  { href: "#who-its-for",  label: "Use cases" },
  { href: "#roadmap",      label: "Roadmap" },
  { href: "/download",     label: "Download" },
];

export default function Nav() {
  const { open } = useJoin();
  // Already joined (same browser) — the CTA becomes a referral prompt; the
  // modal opens straight to the success screen with the link + share buttons.
  // Once approved, the queue is irrelevant and the CTA points at the builds.
  const { dash } = useWaitlistStatus();

  return (
    <nav className="nav-wrap" aria-label="Main navigation">
      <div className="nav">
        <a href="#top" aria-label="Whisper Master home">
          <Wordmark />
        </a>
        <div className="nav-links">
          {links.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </div>
        {dash?.approved ? (
          <a className="nav-cta" href="/download">
            Download <span aria-hidden="true">↓</span>
          </a>
        ) : (
          <button className="nav-cta" onClick={() => open()}>
            {dash ? "Refer a friend" : "Join waitlist"}{" "}
            <span aria-hidden="true">↗</span>
          </button>
        )}
      </div>
    </nav>
  );
}
