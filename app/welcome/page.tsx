import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import Nav from "@/components/Nav";
import Footer from "@/components/sections/Footer";
import { currentTier } from "@/lib/billing/entitlements";
import { product } from "@/lib/config";

export const metadata: Metadata = {
  title: `Thank you — ${product.name}`,
  robots: { index: false, follow: false },
};

// The webhook that grants access races the browser redirect from Polar, so this
// page must never be cached — a cached "still processing" would strand a paying
// customer on it.
export const dynamic = "force-dynamic";

/**
 * Post-checkout landing.
 *
 * The important thing this page handles is the race: Polar redirects the buyer
 * here immediately, while the `subscription.active` webhook that actually grants
 * access arrives on a separate connection a moment later. So for a second or two
 * a genuine paying customer can load this page and read `plan: "free"`.
 *
 * The wrong response is to show an error. The right one is to say that payment
 * succeeded — which it did, Polar redirected here — and that access is landing.
 * Never tell someone who has just paid that something went wrong.
 */
export default async function WelcomePage() {
  const { userId } = await auth();
  const tier = userId ? await currentTier(userId) : "free";
  const granted = tier !== "free";

  return (
    <>
      <Nav />
      <main className="page">
        <header className="page-head">
          <p className="label">
            <i className="rec-dot" />
            {granted ? "You're in" : "Payment received"}
          </p>
          <h1 className="page-title">
            Thank you.<br />
            <em>{granted ? "Your licence is active." : "Setting up your licence."}</em>
          </h1>
          <p className="page-lede">
            {granted ? (
              <>
                Your account is on <strong>{tier}</strong>. Sign in to the Mac app
                with the same account and it will unlock on its own — there is no
                licence key to copy.
              </>
            ) : (
              <>
                Your payment went through. The licence is being applied to your
                account now, which usually takes a few seconds — refresh this page
                shortly. If it has not appeared in five minutes, email{" "}
                <a href={`mailto:${product.contactEmail}`}>{product.contactEmail}</a>{" "}
                and it will be fixed by hand.
              </>
            )}
          </p>
        </header>

        <section className="section">
          <div className="section-head">
            <h2 className="section-title">What happens now</h2>
          </div>
          <ol className="steps">
            <li className="step">
              <span className="step-n">1</span>
              <div>
                <h3>Download the app</h3>
                <p>
                  macOS 14 or later, Apple Silicon. The first launch downloads the
                  speech model — about 1.5 GB, once.
                </p>
                <Link className="btn btn--primary" href="/download">
                  Download for Mac <span aria-hidden="true">↓</span>
                </Link>
              </div>
            </li>
            <li className="step">
              <span className="step-n">2</span>
              <div>
                <h3>Sign in with this same account</h3>
                <p>
                  That is the whole activation step. The app reads your plan from
                  your account — nothing to paste, nothing to keep safe.
                </p>
              </div>
            </li>
            <li className="step">
              <span className="step-n">3</span>
              <div>
                <h3>Hold the hotkey and talk</h3>
                <p>
                  Use a wired or built-in microphone if you can. Our own measured
                  accuracy drops noticeably over Bluetooth, and we would rather you
                  heard that from us than discovered it.
                </p>
              </div>
            </li>
          </ol>
        </section>

        <section className="page-cta">
          <h2>Manage your billing</h2>
          <p>
            Invoices, payment method and cancellation all live in one place. No
            email required, no retention flow to sit through.
          </p>
          <div className="page-cta-actions">
            <a className="btn btn--ghost" href="/api/portal">
              Open billing portal
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
