"use client";

import Link from "next/link";
import { Component, useEffect, useState, type ReactNode } from "react";
import { Wordmark } from "./Wordmark";
import { useWaitlistStatus } from "./waitlist/useWaitlistStatus";

const links = [
  { href: "/#features", label: "Features" },
  { href: "/#how", label: "How it works" },
  { href: "/#principles", label: "Principles" },
  { href: "/roadmap", label: "Roadmap" },
];

export default function Nav() {
  const [lifted, setLifted] = useState(false);

  // The bar earns its backdrop only once content is behind it.
  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`nav-wrap ${lifted ? "is-lifted" : ""}`} aria-label="Main">
      <div className="nav">
        <Link href="/" aria-label="Whisper Master home" className="nav-brand">
          <Wordmark />
        </Link>

        <div className="nav-links">
          {links.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </div>

        <div className="nav-right">
          <Quiet>
            <NavStatus />
          </Quiet>
          <Link className="nav-cta" href="/download" data-cursor="Get the app">
            Download
            <span aria-hidden="true">↓</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

/**
 * The status chip is the only part of the bar that needs auth and waitlist state.
 * It lives in its own leaf, wrapped below, so the brand, the links and the
 * download CTA never depend on that lookup — losing a decorative word must not
 * be able to take the site's navigation down with it.
 */
function NavStatus() {
  const { dash, isSignedIn } = useWaitlistStatus();
  return (
    <span className="nav-status" aria-hidden="true">
      <i className="rec-dot" />
      {dash?.approved ? "approved" : isSignedIn ? "signed in" : "on-device"}
    </span>
  );
}

/** Renders nothing if its child throws. Deliberately silent: the chip is decor. */
class Quiet extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
