import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/sections/Footer";
import LeadForm from "@/components/leads/LeadForm";
import { product } from "@/lib/config";
import { teamPlans } from "@/lib/pricing";

export const metadata: Metadata = {
  title: `For teams and regulated firms — ${product.name}`,
  description:
    "Dictation that a compliance review can approve. Transcription runs entirely on your own Macs — no audio, no transcript, and no metadata sent to us. Per-seat licensing for law firms, clinics and practices.",
  alternates: { canonical: "/for-teams" },
};

/**
 * The organisation funnel.
 *
 * This page exists because the rest of the site sells to an individual and this
 * product's best buyer is a firm. The distinction is not size, it is *why they
 * buy*: an individual buys because typing is slow, a firm buys because their
 * professional obligations rule out every cloud alternative and they have been
 * living without dictation as a result.
 *
 * Which means the copy below optimises for a reader who is not the user. It is
 * a partner, a practice manager or an IT lead who has to defend the decision.
 * So the page leads with the architecture and the disclosures rather than the
 * product experience, and it states the current limitations plainly — that is
 * not modesty, it is the fastest route to being trusted by someone whose job is
 * to find the catch.
 */
export default function ForTeamsPage() {
  return (
    <>
      <Nav />
      <main className="page">
        <header className="page-head">
          <p className="label">
            <i className="rec-dot" />
            For teams &amp; regulated practices
          </p>
          <h1 className="page-title">
            Dictation your compliance<br />
            review can <em>actually approve</em>.
          </h1>
          <p className="page-lede">
            Most dictation tools send your audio to a server. For a law firm, a
            clinic or a therapy practice, that single fact ends the evaluation —
            so a lot of professionals simply gave up on dictation and went back
            to typing. Whisper Master transcribes entirely on the Mac in front of
            you. There is no server to send audio to.
          </p>
        </header>

        {/* ── The claim, stated as an architecture fact rather than a promise ── */}
        <section className="teams-claim">
          <div className="teams-claim-main">
            <h2>The reason this clears review is structural, not contractual</h2>
            <p>
              A cloud vendor asks you to trust a policy: they promise not to
              retain your recordings, and you take that on faith backed by a
              contract. The speech still leaves your building, so the risk is
              real and the paperwork is how you manage it.
            </p>
            <p>
              Whisper Master runs the speech model on your own hardware. The
              audio is processed in memory on the Mac and never written to a
              network socket. There is no retention policy to audit because
              there is nothing to retain — a difference your reviewer can verify
              from the network layer rather than from our word.
            </p>
            <p className="teams-claim-caveat">
              <strong>What we will not claim:</strong> the app is not
              air-gapped. Signing in, downloading the model the first time, and
              checking for updates all touch the network. Product analytics and
              usage statistics are currently <em>on by default</em>. For a
              regulated deployment those are switched off and enforced — see the
              disclosure table below, which lists every byte that moves.
            </p>
          </div>

          <ul className="teams-facts">
            <li>
              <strong>3.4%</strong>
              <span>
                measured word-error rate on clean speech — and we publish the
                bad numbers too
              </span>
            </li>
            <li>
              <strong>0</strong>
              <span>bytes of audio or transcript transmitted, ever</span>
            </li>
            <li>
              <strong>Offline</strong>
              <span>
                dictation keeps working with the network cable pulled out
              </span>
            </li>
          </ul>
        </section>

        {/* ── The disclosure table: the actual sales asset for this buyer ── */}
        <section className="section teams-disclosure">
          <div className="section-head">
            <h2 className="section-title">Everything that touches the network</h2>
            <p className="section-lede">
              This is the whole list. Your reviewer will ask for it, so it is
              here rather than behind an NDA — and on a regulated plan the
              optional rows are disabled by policy, not by a checkbox a user can
              re-tick.
            </p>
          </div>

          <div className="flowtable">
            <div className="flowtable-head">
              <span>What</span>
              <span>Where it goes</span>
              <span>On a regulated plan</span>
            </div>
            {[
              {
                what: "Your speech audio",
                where: "Nowhere. Processed in memory on your Mac.",
                reg: "N/A",
                tag: "never",
              },
              {
                what: "The transcribed text",
                where: "Nowhere. Pasted into your app, stored locally.",
                reg: "N/A",
                tag: "never",
              },
              {
                what: "Sign-in (identity only)",
                where: "Clerk — email address, no content",
                reg: "Required for licensing",
                tag: "required",
              },
              {
                what: "Speech model download",
                where: "Cloudflare R2, once, ~1.5 GB",
                reg: "One-time; can be pre-staged by IT",
                tag: "required",
              },
              {
                what: "Update checks",
                where: "Sparkle appcast",
                reg: "Can be pinned to an internal feed",
                tag: "required",
              },
              {
                what: "Product analytics",
                where: "PostHog and Google Analytics — anonymous, content-free",
                reg: "Disabled and enforced",
                tag: "optional",
              },
              {
                what: "Usage statistics",
                where: "Our dashboard — counts only, no text",
                reg: "Disabled and enforced",
                tag: "optional",
              },
              {
                what: "Notes & reminders sync",
                where: "Your account — this one carries dictated text",
                reg: "Disabled and enforced",
                tag: "optional",
              },
              {
                what: "Nearby Macs (mesh)",
                where: "A paired Mac on your LAN — off by default",
                reg: "Disabled and enforced",
                tag: "optional",
              },
            ].map((row) => (
              <div className="flowrow" key={row.what}>
                <span className="flowrow-what">{row.what}</span>
                <span className="flowrow-cell">{row.where}</span>
                <span className="flowrow-cell">
                  <i className={`flowtag flowtag--${row.tag === "optional" ? "optional" : "required"}`}>
                    {row.reg}
                  </i>
                </span>
              </div>
            ))}
          </div>

          <p className="teams-disclosure-note">
            The same table, written for individuals, lives at{" "}
            <Link href="/trust">/trust</Link>. We have never had two versions of
            it and do not intend to start.
          </p>
        </section>

        {/* ── Pricing ── */}
        <section className="section" id="pricing">
          <div className="section-head">
            <h2 className="section-title">Per-seat pricing</h2>
            <p className="section-lede">
              Published rather than &ldquo;contact us&rdquo;, because you should
              be able to size this before you talk to anyone. Annual billing;
              seats are reassignable when someone leaves.
            </p>
          </div>

          <div className="teams-plans">
            {teamPlans.map((plan) => (
              <article
                key={plan.key}
                className={`plan${plan.featured ? " plan--featured" : ""}`}
              >
                <h3 className="plan-name">{plan.name}</h3>
                <p className="plan-price">
                  {plan.price.usd}
                  <span className="plan-period">{plan.period}</span>
                </p>
                <p className="plan-sub">{plan.sub.usd}</p>
                <p className="plan-sub plan-sub--inr">{plan.price.inr} {plan.sub.inr}</p>
                <ul className="plan-list">
                  {plan.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <p className="plan-note">{plan.note}</p>
              </article>
            ))}
          </div>

          <p className="teams-anchor">
            For context: <strong>Dragon Medical One</strong>, the incumbent in
            clinical dictation, is licensed at roughly{" "}
            <strong>$99 per user per month</strong> and is cloud-backed. We are
            not pretending to match its clinical vocabulary yet — we are saying
            that if what you need is accurate, private dictation into the app you
            already use, you should not be paying that.
          </p>
        </section>

        {/* ── Honest limitations. This converts better than hiding them. ── */}
        <section className="section teams-limits">
          <div className="section-head">
            <h2 className="section-title">Where we are not a fit yet</h2>
            <p className="section-lede">
              You would find all of this in week two of an evaluation. Finding it
              in minute two is better for both of us.
            </p>
          </div>
          <ul className="teams-limit-list">
            <li>
              <strong>macOS on Apple Silicon only.</strong> No Windows, no iPad,
              no Intel Macs. If your practice is on Windows we are not a
              candidate and no roadmap promise will change that this year.
            </li>
            <li>
              <strong>No SOC 2 report.</strong> We are a very small company. If
              your procurement process requires SOC 2 Type II before signature,
              we will fail it today — tell us anyway, because knowing which
              deals it blocks is how it gets prioritised.
            </li>
            <li>
              <strong>Accuracy degrades on Bluetooth headsets and in noisy
              rooms</strong> — 16.3% and 23.5% word-error rate respectively,
              versus 3.4% on clean speech. Those are our own published numbers.
              A wired or built-in mic is a real requirement, not a nicety.
            </li>
            <li>
              <strong>Centralised admin controls are early.</strong> MDM
              deployment, managed preferences and an org-wide policy lock are
              built for regulated plans on request rather than available
              self-serve. Ask, and we will tell you honestly what exists.
            </li>
          </ul>
        </section>

        {/* ── The form ── */}
        <section className="section teams-enquiry" id="enquire">
          <div className="section-head">
            <h2 className="section-title">Tell us what your review requires</h2>
            <p className="section-lede">
              There is no sales team — this reaches the person who wrote the
              app. If we do not clear your bar, we would rather say so in the
              first reply than in the fourth meeting.
            </p>
          </div>
          <LeadForm source="for-teams" />
        </section>
      </main>
      <Footer />
    </>
  );
}
