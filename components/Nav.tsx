"use client";

import { useEffect, useState } from "react";
import { product } from "@/lib/config";
import { Wordmark } from "./Wordmark";

const links = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-3 sm:pt-4">
      <nav
        aria-label="Primary"
        className={`flex w-full max-w-content items-center justify-between rounded-2xl px-4 py-2.5 transition-all duration-300 sm:px-5 ${
          scrolled
            ? "glass shadow-glass-sm"
            : "border border-transparent bg-transparent"
        }`}
      >
        <a
          href="#top"
          className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          aria-label={`${product.name} home`}
        >
          <Wordmark />
        </a>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm text-white/65 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              {l.label}
            </a>
          ))}
        </div>

        <a
          href="#join"
          className="inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-glow transition hover:bg-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2 focus-visible:ring-offset-base-900"
        >
          Join Waitlist
        </a>
      </nav>
    </header>
  );
}
