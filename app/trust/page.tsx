import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/sections/Footer";
import { Reveal } from "@/components/motion";
import { product } from "@/lib/config";
import { flows, neverLeaves, entity, LEGAL_UPDATED } from "@/lib/legal";

export const metadata: Metadata = {
  title: `What leaves your Mac — ${product.name}`,
  description:
    "Every network request Whisper Master makes, what is inside it, and how to switch it off. Five rows. Audio is not one of them.",
  alternates: { canonical: "/trust" },
};

export default function TrustPage() {
  return (
    <>
      <Nav />
      <main className="page">
        <header className="page-head">
          <p className="label">
            <i className="rec-dot" />
            Transparency
          </p>
          <h1 className="page-title">
            What leaves<br />
            <em>your Mac.</em>
          </h1>
          <p className="page-lede">
            Most privacy pages are written to be defensible. This one is written to
            be <em>checked</em>. Below is every network request the app makes, what
            is actually inside it, and how to turn it off. If you find something
            here that doesn&rsquo;t match what the app does, tell us and we&rsquo;ll
            fix whichever one is wrong.
          </p>
        </header>

        {/* The claim first, in the largest type on the page. Everything after
            this is the evidence for it. */}
        <Reveal className="trust-hero">
          <p className="trust-hero-kicker">The short version</p>
          <p className="trust-hero-claim">
            Your <span className="accent-ember">voice</span> never leaves this
            machine.
          </p>
          <p className="trust-hero-sub">
            Transcription runs entirely on your Mac&rsquo;s own silicon. There is no
            audio upload, because there is no server to upload it to. Once the model
            is installed you can put the Mac in airplane mode and dictate all day.
          </p>
        </Reveal>

        <section className="trust-section" aria-labelledby="never">
          <h2 id="never" className="trust-h2">
            Never sent, under any setting
          </h2>
          <ul className="trust-never">
            {neverLeaves.map((line) => (
              <li key={line}>
                <span className="trust-never-mark" aria-hidden="true" />
                {line}
              </li>
            ))}
          </ul>
        </section>

        <section className="trust-section" aria-labelledby="flows">
          <h2 id="flows" className="trust-h2">
            The {flows.length} things that do use the network
          </h2>
          <p className="trust-note">
            Two of these are on by default and can be switched off in the app&rsquo;s
            settings without losing any dictation features. We&rsquo;d rather say
            that plainly than bury it.
          </p>

          <div className="flowtable">
            <div className="flowtable-head" aria-hidden="true">
              <span>What</span>
              <span>Where it goes</span>
              <span>What&rsquo;s in it</span>
              <span>Your control</span>
            </div>

            {flows.map((f) => (
              <article className="flowrow" key={f.what}>
                <div className="flowrow-what">
                  <h3>{f.what}</h3>
                  <span
                    className={`flowtag ${
                      f.required ? "flowtag--required" : "flowtag--optional"
                    }`}
                  >
                    {f.required ? "Required" : "Optional"}
                  </span>
                </div>

                <div className="flowrow-cell">
                  <dt>Where it goes</dt>
                  <dd>{f.where}</dd>
                </div>

                <div className="flowrow-cell">
                  <dt>What&rsquo;s in it</dt>
                  <dd>{f.payload}</dd>
                </div>

                <div className="flowrow-cell">
                  <dt>Your control</dt>
                  <dd className={f.onByDefault && !f.required ? "flow-default-on" : ""}>
                    {f.control}
                  </dd>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="trust-section" aria-labelledby="why">
          <h2 id="why" className="trust-h2">
            Why we publish this
          </h2>
          <p className="trust-body">
            We ask for two permissions that deserve suspicion: your microphone, and
            Accessibility, which lets the app type on your behalf. Any app with both
            could, in principle, do something ugly. &ldquo;Trust us&rdquo; is not a
            good enough answer, so instead we publish the list and let you audit it
            with a network monitor like Little Snitch. That is the only form of this
            promise that is worth anything.
          </p>
          <p className="trust-body">
            The same reasoning is why we publish our{" "}
            <Link href="/#comparison">accuracy numbers including the bad ones</Link>
            — the noisy-room and Bluetooth-microphone figures where we currently do
            worst. A vendor who only shows you their good numbers is telling you
            about their marketing, not their product.
          </p>
        </section>

        <section className="page-cta">
          <h2>Read the formal versions</h2>
          <p>
            This page is the plain-English one. The binding documents say the same
            thing in the language lawyers need.
          </p>
          <div className="page-cta-actions">
            <Link className="btn btn--ghost" href="/privacy">
              Privacy Policy
            </Link>
            <Link className="btn btn--ghost" href="/terms">
              Terms of Service
            </Link>
            <a className="btn btn--ghost" href={`mailto:${entity.contactEmail}`}>
              Ask us directly
            </a>
          </div>
          <p className="trust-updated">Last updated {LEGAL_UPDATED}</p>
        </section>
      </main>
      <Footer />
    </>
  );
}
