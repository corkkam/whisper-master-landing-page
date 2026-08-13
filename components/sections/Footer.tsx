import Link from "next/link";
import { Wordmark } from "../Wordmark";
import { product } from "@/lib/config";
import CookieSettingsLink from "../chrome/CookieSettingsLink";

/**
 * The colophon.
 *
 * A manual's colophon is a structured block, not a run of links: it says what
 * the thing is, where the rest of it lives, and under what terms. The previous
 * version put eleven links in a single flat row, which weighted a legal notice
 * exactly the same as the download page and wrapped two of them onto an orphan
 * second line.
 *
 * Grouped into named columns instead, and set into the empty half the sign-off
 * was leaving — so the statement and the index balance rather than the page
 * ending on a long stretch of nothing.
 */
const GROUPS: { head: string; links: { href: string; label: string }[] }[] = [
  {
    head: "The manual",
    links: [
      { href: "/#chain", label: "How it works" },
      { href: "/#enclosure", label: "Privacy" },
      { href: "/#parts", label: "Features" },
      { href: "/#notes", label: "Service notes" },
    ],
  },
  {
    head: "The product",
    links: [
      { href: "/download", label: "Download" },
      // Off the footer while the beta is free — see components/Nav.tsx.
      // { href: "/pricing", label: "Pricing" },
      // { href: "/for-teams", label: "For teams" },
      { href: "/roadmap", label: "Roadmap" },
    ],
  },
  {
    head: "The fine print",
    links: [
      // The privacy proof sits with the legal notices on purpose: it is the
      // document that backs the claim the rest of them are written around.
      { href: "/trust", label: "What leaves your Mac" },
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="colophon">
      <div className="colophon-inner">
        <div className="colophon-top">
          <h2 className="colophon-statement">
            <span>Your voice.</span>
            <span className="quiet">Your machine.</span>
            <span>Nobody else&rsquo;s.</span>
          </h2>

          <nav className="colophon-index" aria-label="Footer">
            {GROUPS.map((g) => (
              <div className="colophon-group" key={g.head}>
                <p className="colophon-head">{g.head}</p>
                <ul>
                  {g.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href}>{l.label}</Link>
                    </li>
                  ))}
                  {g.head === "The fine print" && (
                    <li>
                      <CookieSettingsLink />
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="colophon-foot">
          <Link href="/" aria-label={`${product.name} home`}>
            <Wordmark />
          </Link>
          <p className="colophon-fine">
            © {new Date().getFullYear()} {product.name} · Transcription runs on
            your device. Always.
          </p>
          <a className="colophon-mail" href={`mailto:${product.contactEmail}`}>
            {product.contactEmail}
          </a>
        </div>
      </div>
    </footer>
  );
}
