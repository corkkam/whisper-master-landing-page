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
    "Download Whisper Master for macOS — the stable build is free and needs no account. The beta channel opens once you're approved for early access.",
};

// The stable link is public, but the *beta* card still branches on Clerk
// `publicMetadata.betaAccess` and on early-access rank, so the page reads
// `currentUser()` on every request and must not be cached or prerendered.
// Do not "optimise" this back to static: a cached beta card would either leak
// the beta artifact URL to unapproved users or hide it from approved ones.
export const dynamic = "force-dynamic";

export default async function DownloadPage() {
  const user = await currentUser();
  const signedIn = user != null;
  const beta = isBetaUser(user?.publicMetadata);
  // Only needed to tell "already asked for early access" apart from "never asked".
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
            auth, because beta access is still a manual approval.

            Since sign-up went public, the beta queue is the *only* remaining
            gate, and this card is the only place scarcity language belongs. Every
            branch below therefore has to leave the visitor holding something:
            the stable build is theirs today whatever the beta says. */}
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

          {/* ── Beta: requires sign-in *and* early-access approval ───────── */}
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
                  <Lock /> You&rsquo;re on the early-access list
                  {dash.rank ? (
                    <>
                      {" "}
                      at <strong>#{dash.rank}</strong>
                    </>
                  ) : null}
                  . We&rsquo;ll email you the moment the beta opens for you —
                  referrals move you up.
                </p>
              </>
            ) : (
              <>
                <JoinButton className="btn btn--ghost" cursor="Takes one screen">
                  Ask for early access
                  <span aria-hidden="true">↗</span>
                </JoinButton>
                <p className="dl-req">
                  <Lock /> Beta builds are invite-only — asking takes one screen.
                  The stable build is yours right now either way.
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
