import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/sections/Footer";
import { product } from "@/lib/config";
import { entity, LEGAL_UPDATED } from "@/lib/legal";

export const metadata: Metadata = {
  title: `Terms of Service — ${product.name}`,
  description:
    "The agreement between you and Whisper Master: what you may do with the app, what we promise, and what we don't.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <>
      <Nav />
      <main className="page">
        <header className="page-head">
          <p className="label">
            <i className="rec-dot" />
            Terms of Service
          </p>
          <h1 className="page-title">
            Terms of<br />
            <em>Service.</em>
          </h1>
          <p className="page-lede">
            Short, and written to be read. By installing or using {product.name} you
            agree to what follows.
          </p>
          <p className="legal-meta">Last updated {LEGAL_UPDATED}</p>
        </header>

        <article className="legal">
          <section>
            <h2>1. Who this agreement is with</h2>
            <p>
              These terms are between you and {entity.legalEntity} of{" "}
              {entity.jurisdiction} (&ldquo;we&rdquo;, &ldquo;us&rdquo;), the operator of{" "}
              {product.name}. If you are using the app on behalf of an organisation,
              you confirm you are authorised to accept these terms for it.
            </p>
          </section>

          <section>
            <h2>2. Your licence</h2>
            <p>
              We grant you a personal, non-exclusive, non-transferable licence to
              install and use {product.name} on Macs you own or control, for as long as
              you comply with these terms. You may use it for commercial work.
            </p>
            <p>You may not:</p>
            <ul>
              <li>Redistribute, resell, or sublicense the app.</li>
              <li>
                Reverse-engineer it, except where that right cannot lawfully be
                restricted in your jurisdiction.
              </li>
              <li>Remove or obscure any notice contained in it.</li>
              <li>
                Use it to record anyone without whatever consent the law where you are
                requires. Consent to recording is your responsibility, not ours — see
                section 5.
              </li>
            </ul>
            <p>
              We keep all intellectual property in the app. You keep everything you
              dictate: we obtain no rights whatsoever in your speech or the text
              produced from it, and could claim none, because we never receive it.
            </p>
          </section>

          <section>
            <h2>3. Accounts</h2>
            <p>
              Using the app requires an account. Keep your credentials to yourself; you
              are responsible for what happens under your account. You may close it at
              any time by writing to us, and we will delete your data as described in
              the <Link href="/privacy">Privacy Policy</Link>. We may suspend an account
              that is being used to break these terms or the law, and we will tell you
              why unless the law forbids it.
            </p>
          </section>

          <section>
            <h2>4. The beta period</h2>
            <p>
              {product.name} is currently free to use while in beta. Free during beta
              means exactly that — we are not going to charge you retroactively for the
              period in which you helped us test it.
            </p>
            <p>
              We intend to introduce paid plans; the intended prices are published on
              our <Link href="/pricing">pricing page</Link>. When paid plans begin, we
              will give existing users at least 30 days&rsquo; notice by email, and any
              plan or discount we have specifically promised you — including rewards
              earned through the referral programme — will be honoured on the terms it
              was offered under. During beta the software may change, break, or lose
              features at short notice; that is what beta means.
            </p>
          </section>

          <section>
            <h2>5. How you use it matters</h2>
            <p>
              This app types text into other applications on your behalf, using
              macOS Accessibility permissions. You are responsible for what it types and
              where. Check important text before you send it — dictation makes mistakes,
              and some of those mistakes will be confident and plausible ones.
            </p>
            <p>
              Recording law varies. Some jurisdictions require every participant in a
              conversation to consent before it is recorded or transcribed. Complying
              with the law that applies to you is your obligation.
            </p>
            <p>
              Do not rely on {product.name} alone where a transcription error could
              cause serious harm — medical, legal, financial or safety-critical
              contexts. Review the output.
            </p>
          </section>

          <section>
            <h2>6. Accuracy claims</h2>
            <p>
              We publish measured accuracy figures, including the conditions where we
              perform poorly. Those figures describe our test corpus under stated
              conditions. They are an honest measurement, not a guarantee about your
              voice, your accent, your microphone or your room.
            </p>
          </section>

          <section>
            <h2>7. Third-party services</h2>
            <p>
              The app depends on services listed in the{" "}
              <Link href="/privacy">Privacy Policy</Link> for sign-in, model downloads
              and updates. Their availability is not within our control, and outages
              affecting sign-in may prevent access. Once models are installed,
              dictation itself works offline.
            </p>
          </section>

          <section>
            <h2>8. Warranties and liability</h2>
            <p>
              The app is provided &ldquo;as is&rdquo;. To the fullest extent the law
              allows, we exclude implied warranties of merchantability and fitness for a
              particular purpose. We do not warrant that it will be uninterrupted or
              error-free.
            </p>
            <p>
              To the fullest extent the law allows, we are not liable for indirect or
              consequential loss, lost profits, or lost data, and our total liability to
              you for any claim is limited to the greater of the amount you paid us in
              the twelve months before the claim, or US $50.
            </p>
            <p>
              Nothing in these terms limits liability for fraud, for death or personal
              injury caused by negligence, or for anything else that cannot lawfully be
              limited. If you are a consumer, you keep every statutory right your local
              law gives you, and nothing here overrides it.
            </p>
          </section>

          <section>
            <h2>9. Ending it</h2>
            <p>
              You may stop using the app and delete it at any time. We may end this
              licence if you materially breach these terms and do not fix the breach
              within 30 days of us asking. Sections 2, 8 and 10 survive termination.
            </p>
          </section>

          <section>
            <h2>10. Governing law</h2>
            <p>
              These terms are governed by the laws of {entity.jurisdiction}, and the
              courts of {entity.courts} have exclusive jurisdiction. If you are a
              consumer resident elsewhere, this does not deprive you of the protection
              of the mandatory laws of your country of residence, or of the right to
              bring proceedings there.
            </p>
          </section>

          <section>
            <h2>11. Changes</h2>
            <p>
              We may update these terms. If a change materially affects your rights we
              will notify account holders by email at least 30 days beforehand, and
              continuing to use the app after that means you accept the change. If you
              do not, stop using the app and close your account.
            </p>
          </section>

          <section>
            <h2>12. Contact</h2>
            <p>
              <a href={`mailto:${entity.contactEmail}`}>{entity.contactEmail}</a>. A
              human reads it.
            </p>
          </section>
        </article>

        <section className="page-cta">
          <h2>The part most people actually want</h2>
          <p>What the app sends over the network, in a table, with nothing hidden.</p>
          <div className="page-cta-actions">
            <Link className="btn btn--primary" href="/trust" data-cursor="Read it">
              What leaves your Mac
              <span aria-hidden="true">→</span>
            </Link>
            <Link className="btn btn--ghost" href="/privacy">
              Privacy Policy
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
