import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import Nav from "@/components/Nav";
import Footer from "@/components/sections/Footer";
import JoinButton from "@/components/waitlist/JoinButton";
import HyperspeedBackdrop from "@/components/chrome/HyperspeedBackdrop";
import { isBetaUser } from "@/lib/clerk/beta";
import { getDashboard } from "@/lib/waitlist/actions";
import { downloads, product } from "@/lib/config";

export const metadata: Metadata = {
  title: `Download ${product.name}`,
  description:
    "Download Whisper Master for macOS — the stable build is free and needs no account. The beta channel unlocks once you're approved off the waitlist.",
};

// The stable link is public, but the *beta* card still branches on Clerk
// `publicMetadata.betaAccess` and on waitlist rank, so the page reads
// `currentUser()` on every request and must not be cached or prerendered.
// Do not "optimise" this back to static: a cached beta card would either leak
// the beta artifact URL to unapproved users or hide it from approved ones.
export const dynamic = "force-dynamic";

export default async function DownloadPage() {
  const user = await currentUser();
  const signedIn = user != null;
  const beta = isBetaUser(user?.publicMetadata);
  // Only needed to tell "waiting in line" apart from "never joined".
  const dash = signedIn && !beta ? await getDashboard() : null;
  const firstName = user?.firstName ?? null;

  return (
    <>
      <Nav />
      <main className="page page--download">
        {/* Same road as the landing CTA, so arriving here reads as continuing
            the journey rather than landing on a plain form. Full-bleed across
            the top and faded to ink before it reaches the cards. */}
        <HyperspeedBackdrop variant="page" />

        <header className="page-head">
          <p className="label">
            <i className="rec-dot is-live" />
            Download
          </p>
          <h1 className="page-title">
            {firstName ? (
              <>
                Let&rsquo;s get you<br />
                <em>set up, {firstName}.</em>
              </>
            ) : (
              <>
                Get {product.name}<br />
                <em>for your Mac.</em>
              </>
            )}
          </h1>
          <p className="page-lede">
            {signedIn
              ? "Both builds transcribe entirely on your device. Pick the one that suits how much churn you want."
              : "The stable build is a free download and needs no account. You'll create one the first time you open the app — that's what identifies your licence, and it's the only part that touches the network."}
          </p>
        </header>

        {/* Stable is public and unauthenticated — the download page is the top
            of the funnel, so nothing gates it. Only the *beta* card branches on
            auth, because beta access is a manual approval off the waitlist. */}
        <div className="dl-grid">
          {/* ── Stable: public, no account required ───────────────────────── */}
          <section className="dl-card dl-card--stable">
            <div className="dl-badge">Stable</div>
            <h2>The reliable build</h2>
            <p className="dl-desc">
              What most people run. Tested, notarized, and auto-updating. Pick
              this if you just want dictation that works.
            </p>
            <a className="btn btn--primary" href={downloads.stable} data-cursor="Let's go">
              Download for macOS
              <span aria-hidden="true">↓</span>
            </a>
            <p className="dl-req">{downloads.requirements}</p>
          </section>

          {/* ── Beta: requires sign-in *and* approval off the waitlist ────── */}
          <section className="dl-card dl-card--beta">
            <div className="dl-badge dl-badge--beta">Beta</div>
            <h2>Early builds, first</h2>
            <p className="dl-desc">
              New features and fixes before they reach stable, updated often.
              Installs side by side with the stable app.
            </p>

            {beta ? (
              <>
                <a className="btn btn--signal" href={downloads.beta} data-cursor="You're in">
                  Download the beta
                  <span aria-hidden="true">↓</span>
                </a>
                <p className="dl-req">
                  You&rsquo;re on the beta channel — updates arrive automatically.
                </p>
              </>
            ) : dash ? (
              <>
                <JoinButton className="btn btn--ghost" cursor="Climb the list">
                  Move up the line
                  <span aria-hidden="true">↗</span>
                </JoinButton>
                <p className="dl-req">
                  <Lock /> You&rsquo;re{" "}
                  {dash.rank ? <strong>#{dash.rank}</strong> : "on the waitlist"}
                  {dash.rank ? " on the waitlist" : ""}. We&rsquo;ll email you the
                  moment you&rsquo;re approved — referrals move you up.
                </p>
              </>
            ) : (
              <>
                <JoinButton className="btn btn--ghost" cursor="Takes one screen">
                  Join the waitlist
                  <span aria-hidden="true">↗</span>
                </JoinButton>
                <p className="dl-req">
                  <Lock /> Beta is for approved waitlist members. Join to get in
                  line — it takes one screen.
                </p>
              </>
            )}
          </section>
        </div>

        <p className="dl-foot">
          Both builds transcribe 100% on your device. The stable download needs
          no account; the app asks you to sign in on first launch to identify
          your licence — your voice and your transcripts never leave your Mac.
        </p>
      </main>
      <Footer />
    </>
  );
}

function Lock() {
  return (
    <span aria-hidden="true" className="dl-lock">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
        <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
      </svg>
    </span>
  );
}
