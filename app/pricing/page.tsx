import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import Nav from "@/components/Nav";
import Footer from "@/components/sections/Footer";
import JoinButton from "@/components/waitlist/JoinButton";
import PlanGrid from "@/components/pricing/PlanGrid";
import { product } from "@/lib/config";
import { defaultCurrencyForCountry } from "@/lib/pricing";
import { selfServeCheckoutReady } from "@/lib/billing/plans";

export const metadata: Metadata = {
  title: `Pricing — ${product.name}`,
  description:
    "Whisper Master is free while in beta. Here is exactly what it will cost when it isn't, in USD and INR — published up front so nobody is surprised later.",
  alternates: { canonical: "/pricing" },
};

export default async function PricingPage() {
  // Vercel sets this at the edge. Absent locally and on other hosts, in which
  // case everyone gets USD and can switch — a wrong default is a minor
  // annoyance, so this deliberately has no fallback geo lookup.
  const country = (await headers()).get("x-vercel-ip-country");
  const initial = defaultCurrencyForCountry(country);

  // Evaluated here rather than inside PlanGrid: that is a client component and
  // `process.env` is empty in the browser, so the flag has to cross as a prop.
  const checkoutEnabled = selfServeCheckoutReady();

  return (
    <>
      <Nav />
      <main className="page">
        <header className="page-head">
          <p className="label">
            <i className="rec-dot" />
            Pricing
          </p>
          <h1 className="page-title">
            Free right now.<br />
            <em>Here&rsquo;s the plan.</em>
          </h1>
          <p className="page-lede">
            We&rsquo;re not taking money yet. But you deserve to know what it will
            cost before you invest time in it, so the numbers are below rather than
            behind a &ldquo;contact us&rdquo;.
          </p>
        </header>

        <div className="pricing-banner">
          {checkoutEnabled ? (
            <p>
              <strong>Paid plans are live.</strong> Everything you earned during the
              beta is honoured at these prices, and nobody is billed for the period
              they spent helping us test. Cancel any time from the{" "}
              <a href="/api/portal">billing portal</a> — no email, no retention flow.
            </p>
          ) : (
            <p>
              <strong>Everything is free during the beta.</strong> No card, no trial
              countdown. When paid plans start, every beta user gets at least 30
              days&rsquo; notice by email — and we will never bill you for the period
              you spent helping us test.
            </p>
          )}
        </div>

        <PlanGrid initial={initial} checkoutEnabled={checkoutEnabled} />

        <section className="pricing-faq">
          <div>
            <h3>Why publish prices you aren&rsquo;t charging?</h3>
            <p>
              Because our referral programme promises &ldquo;1 Month Pro&rdquo; and
              &ldquo;Lifetime Pro&rdquo; as rewards, and a reward with no price
              attached isn&rsquo;t a reward — it&rsquo;s a placeholder. Publishing
              the numbers is what makes those milestones mean something. Anything
              you earn now will be honoured at these prices.
            </p>
          </div>

          <div>
            <h3>Why is the India price lower than the dollar price?</h3>
            <p>
              Because it&rsquo;s set for local purchasing power rather than
              converted at the exchange rate. We&rsquo;re built in India, and
              pricing our home market out of our own product would be a strange way
              to run a company. The two columns aren&rsquo;t meant to reconcile.
            </p>
          </div>

          <div>
            <h3>What does the free tier lose after beta?</h3>
            <p>
              Minutes, not quality. The cleanup layer — the part that turns
              &ldquo;um, send it to, uh, twenty no thirty people&rdquo; into
              &ldquo;Send it to 30 people&rdquo; — is the product, and crippling it
              to sell upgrades would be both annoying and self-defeating. The free
              tier gets a weekly dictation cap and everything else intact.
            </p>
          </div>

          <div>
            <h3>Is there a team or enterprise plan?</h3>
            <p>
              Yes, and the per-seat prices are published rather than hidden behind
              &ldquo;contact us&rdquo; — see <Link href="/for-teams">for teams</Link>.
              On-device transcription is often the only option for legal, medical
              and finance practices whose obligations rule out sending audio to a
              cloud service, so that page leads with the disclosure table your
              security reviewer will ask for and is honest about where we
              don&rsquo;t clear the bar yet.
            </p>
          </div>

          <div>
            <h3>Will you raise the price on me later?</h3>
            <p>
              Not on a plan you already hold. If Pro goes up, it goes up for new
              subscribers; if you bought Lifetime, it stays lifetime. Read the{" "}
              <Link href="/terms">terms</Link> — section 4 says the same thing in
              binding language.
            </p>
          </div>
        </section>

        <section className="page-cta">
          <h2>Get it while it&rsquo;s free</h2>
          <p>
            Beta access is open. Dictate for a week and decide whether any of the
            numbers above are worth paying.
          </p>
          <div className="page-cta-actions">
            <Link className="btn btn--primary" href="/download" data-cursor="Get the app">
              Download for Mac
              <span aria-hidden="true">↓</span>
            </Link>
            <JoinButton className="btn btn--ghost" cursor="Join">
              Join the waitlist
            </JoinButton>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
