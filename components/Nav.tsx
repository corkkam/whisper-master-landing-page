"use client";

import { Wordmark } from "./Wordmark";
import { useJoin } from "./waitlist/JoinContext";

const links = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features",     label: "Features" },
  { href: "#who-its-for",  label: "Use cases" },
];

export default function Nav() {
  const { open } = useJoin();

  return (
    <nav className="nav-wrap" aria-label="Main navigation">
      <div className="nav">
        <a href="#top" aria-label="Whispr home">
          <Wordmark />
        </a>
        <div className="nav-links">
          {links.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </div>
        <button className="nav-cta" onClick={() => open()}>
          Join waitlist <span aria-hidden="true">↗</span>
        </button>
      </div>
    </nav>
  );
}
