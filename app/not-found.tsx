import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/sections/Footer";
import { ArrowRight } from "@/components/icons";

export const metadata: Metadata = {
  title: "Page not found — Whisper Master",
  robots: { index: false, follow: true },
};

/**
 * The default Next.js 404 renders on a white ground in a system font with no
 * link out of it — on this site that reads as a different site entirely, and
 * leaves the visitor with nowhere to go.
 *
 * The routes below are the ones people actually arrive at a dead URL looking
 * for: an old download link, a renamed pricing page, the privacy write-up.
 */
const ROUTES = [
  { href: "/download", label: "Download for Mac", note: "Free while in beta" },
  { href: "/pricing", label: "Pricing", note: "Plans and what each includes" },
  { href: "/trust", label: "What leaves your Mac", note: "Every request, listed" },
  { href: "/roadmap", label: "Roadmap", note: "Shipping, building, next" },
];

export default function NotFound() {
  return (
    <>
      <Nav />
      <main className="page page--404" id="top">
        <div className="page-head">
          <p className="label">
            <i className="rec-dot" />
            404
          </p>
          <h1 className="page-title">
            That page
            <br />
            is not here.
          </h1>
          <p className="page-lede">
            The link may be out of date, or the page may have moved. Everything
            below is where people usually meant to land.
          </p>
        </div>

        <ul className="nf-list">
          {ROUTES.map((r) => (
            <li key={r.href}>
              <Link href={r.href} className="nf-link">
                <span>
                  <strong>{r.label}</strong>
                  <em>{r.note}</em>
                </span>
                <ArrowRight />
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <Footer />
    </>
  );
}
