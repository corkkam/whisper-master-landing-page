import Link from "next/link";
import { Wordmark } from "../Wordmark";
import { product } from "@/lib/config";

/**
 * Closing statement, borrowing the reference site's stacked-type sign-off. The
 * line is the promise the whole page has been making, said once more plainly.
 */
export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-statement">
        <p className="label">
          <i className="rec-dot" />
          Innovate with a human touch
        </p>
        <h2 className="footer-big">
          <span>Your voice.</span>
          <span className="hollow">Your machine.</span>
          <span>Nobody else&rsquo;s.</span>
        </h2>
      </div>

      <div className="footer-bar">
        <Link href="/" aria-label={`${product.name} home`}>
          <Wordmark />
        </Link>

        <nav className="footer-links" aria-label="Footer">
          <Link href="/#features">Features</Link>
          <Link href="/#how">How it works</Link>
          <Link href="/#principles">Principles</Link>
          <Link href="/roadmap">Roadmap</Link>
          <Link href="/download">Download</Link>
        </nav>

        <a className="footer-mail" href={`mailto:${product.contactEmail}`} data-cursor="Say hello">
          {product.contactEmail}
        </a>
      </div>

      <p className="footer-fine">
        <span>© {new Date().getFullYear()} {product.name}</span>
        <i aria-hidden="true" />
        <span>Transcription runs on your device. Always.</span>
      </p>
    </footer>
  );
}
