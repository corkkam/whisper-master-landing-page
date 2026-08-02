import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/sections/Footer";
import { product } from "@/lib/config";
import { flows, neverLeaves, entity, LEGAL_UPDATED } from "@/lib/legal";

export const metadata: Metadata = {
  title: `Privacy Policy — ${product.name}`,
  description:
    "How Whisper Master handles your data. Transcription happens on your Mac; your audio is never uploaded. This policy lists every exception.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <main className="page">
        <header className="page-head">
          <p className="label">
            <i className="rec-dot" />
            Privacy Policy
          </p>
          <h1 className="page-title">
            Privacy<br />
            <em>Policy.</em>
          </h1>
          <p className="page-lede">
            The plain-English version lives at{" "}
            <Link href="/trust">what leaves your Mac</Link> and is the one we&rsquo;d
            rather you read. This is the formal document that binds us.
          </p>
          <p className="legal-meta">Last updated {LEGAL_UPDATED}</p>
        </header>

        <article className="legal">
          <section>
            <h2>1. Who we are</h2>
            <p>
              {product.name} is operated by {entity.legalEntity}, based in{" "}
              {entity.jurisdiction} (&ldquo;we&rdquo;, &ldquo;us&rdquo;). For anything
              in this policy, including any request to access or delete your data,
              write to <a href={`mailto:${entity.contactEmail}`}>{entity.contactEmail}</a>.
              We are the data controller for the information described below.
            </p>
          </section>

          <section>
            <h2>2. The core principle</h2>
            <p>
              {product.name} transcribes speech <strong>entirely on your device</strong>.
              The speech-recognition model runs on your Mac&rsquo;s own processor. Your
              audio is held in memory only for as long as it takes to transcribe, then
              discarded. It is never written to disk, never transmitted to us, and never
              transmitted to any third party.
            </p>
            <p>
              We therefore hold <strong>no recordings of you and no transcripts of what
              you dictate</strong>. This is an architectural fact, not a policy choice:
              we could not hand over your dictation in response to a legal demand,
              because we have never had it.
            </p>
            <p>Specifically, the following never leave your Mac under any setting:</p>
            <ul>
              {neverLeaves.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2>3. What we do collect</h2>
            <p>
              There are {flows.length} occasions on which the app uses the network. Each
              is listed below with the data involved, why we need it, and our lawful
              basis for processing it under the GDPR and the UK GDPR.
            </p>

            {flows.map((f, i) => (
              <div className="legal-flow" key={f.what}>
                <h3>
                  3.{i + 1} {f.what}
                  <span
                    className={`flowtag ${
                      f.required ? "flowtag--required" : "flowtag--optional"
                    }`}
                  >
                    {f.required ? "Required" : "Optional"}
                  </span>
                </h3>
                <dl>
                  <dt>Recipient</dt>
                  <dd>{f.where}</dd>
                  <dt>Data</dt>
                  <dd>{f.payload}</dd>
                  <dt>Your control</dt>
                  <dd>{f.control}</dd>
                  <dt>Lawful basis</dt>
                  <dd>
                    {f.required
                      ? "Performance of our contract with you — the app cannot function without it."
                      : "Our legitimate interest in maintaining and improving the app, which you may object to at any time using the control above."}
                  </dd>
                </dl>
              </div>
            ))}

            <p>
              Our website additionally uses cookies for analytics only after you accept
              them in the consent banner, and Cloudflare Turnstile to distinguish humans
              from bots on sign-up. Declining analytics cookies does not affect any
              feature of the site.
            </p>
          </section>

          <section>
            <h2>4. What we never do</h2>
            <ul>
              <li>We do not sell your personal data. We have never done so and have no mechanism to.</li>
              <li>We do not share your data with advertisers or data brokers.</li>
              <li>
                We do not use your dictation to train speech models. We could not: we
                do not receive it.
              </li>
              <li>We do not build advertising profiles or track you across other websites.</li>
            </ul>
          </section>

          <section>
            <h2>5. How long we keep things</h2>
            <p>
              Account details are kept for as long as your account exists, and deleted
              within 30 days of you closing it. Anonymous product analytics are retained
              in aggregate and cannot be traced back to you. Daily statistics rollups —
              if you have left &ldquo;Back up my stats&rdquo; on — are kept until you
              delete your account or ask us to remove them.
            </p>
          </section>

          <section>
            <h2>6. Your rights</h2>
            <p>
              Depending on where you live, you have some or all of the following rights:
              to access the data we hold about you, to correct it, to delete it, to
              receive a portable copy, to object to processing based on legitimate
              interests, and to withdraw consent. Residents of the EEA and UK hold these
              under the GDPR; residents of California hold comparable rights under the
              CCPA, including the right not to be discriminated against for exercising
              them; residents of India hold rights under the Digital Personal Data
              Protection Act, 2023.
            </p>
            <p>
              Exercise any of them by writing to{" "}
              <a href={`mailto:${entity.contactEmail}`}>{entity.contactEmail}</a>. We
              will respond within 30 days and will not charge you for it. If you believe
              we have handled your data improperly you may complain to your local data
              protection authority.
            </p>
          </section>

          <section>
            <h2>7. International transfers</h2>
            <p>
              We operate from {entity.jurisdiction}, and the providers listed in section
              3 process data in the United States and the European Union. Where data
              moves between jurisdictions, it does so under the standard contractual
              clauses or equivalent safeguards offered by those providers. Because your
              audio and transcripts never leave your device, the data crossing borders is
              limited to your account identity and the operational data described above.
            </p>
          </section>

          <section>
            <h2>8. Children</h2>
            <p>
              {product.name} is not directed at children under 13, and we do not
              knowingly collect their data. If you believe a child has created an
              account, write to us and we will delete it.
            </p>
          </section>

          <section>
            <h2>9. Security</h2>
            <p>
              Traffic between the app and our providers uses TLS. Account data sits with
              providers that maintain their own security programmes. The strongest
              security property of this product, though, is structural: the sensitive
              material — your voice and your words — is never in our custody in the first
              place.
            </p>
          </section>

          <section>
            <h2>10. Changes</h2>
            <p>
              If we change this policy in a way that affects what we collect, we will
              update the date at the top and tell account holders by email before the
              change takes effect. We will not quietly broaden what we collect.
            </p>
          </section>
        </article>

        <section className="page-cta">
          <h2>Prefer the readable version?</h2>
          <p>The same facts, in a table, with nothing you need a lawyer to parse.</p>
          <div className="page-cta-actions">
            <Link className="btn btn--primary" href="/trust" data-cursor="Read it">
              What leaves your Mac
              <span aria-hidden="true">→</span>
            </Link>
            <Link className="btn btn--ghost" href="/terms">
              Terms of Service
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
