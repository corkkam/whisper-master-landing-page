import type { Metadata } from "next";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { SignInButton } from "@clerk/nextjs";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { isBetaUser } from "@/lib/clerk/beta";
import { downloads, product } from "@/lib/config";

export const metadata: Metadata = {
  title: "Download Whisper Master",
  description:
    "Download Whisper Master for macOS. The stable build is a free public download; the beta channel is available to waitlist members.",
};

// Auth-dependent — never statically cache. `currentUser()` already opts this
// route into dynamic rendering, but we're explicit so the beta gate is correct
// per request.
export const dynamic = "force-dynamic";

export default async function DownloadPage() {
  const user = await currentUser();
  const signedIn = user != null;
  const beta = isBetaUser(user?.publicMetadata);

  return (
    <>
      <Nav />
      <main className="download-page">
        <div className="download-head">
          <div className="kicker">DOWNLOAD</div>
          <h1>Get {product.name} for Mac</h1>
          <p>
            The stable build is a free public download. The beta channel is
            reserved for waitlist members — sign in and it unlocks here
            automatically.
          </p>
        </div>

        <div className="download-grid">
          {/* ── Stable: public, always available ───────────────────────── */}
          <section className="dl-card">
            <div className="dl-badge dl-badge--stable">Stable</div>
            <h2>The reliable build</h2>
            <p className="dl-desc">
              What everyone runs. Tested, notarized, and auto-updating. Best if
              you just want dictation that works.
            </p>
            <a className="dl-btn dl-btn--primary" href={downloads.stable}>
              Download for macOS <span aria-hidden="true">↓</span>
            </a>
            <p className="dl-req">{downloads.requirements}</p>
          </section>

          {/* ── Beta: gated on Clerk publicMetadata.betaAccess ─────────── */}
          <section className="dl-card">
            <div className="dl-badge dl-badge--beta">Beta</div>
            <h2>Early builds, first</h2>
            <p className="dl-desc">
              New features and fixes before they hit stable, updated often.
              Installs side-by-side with the stable app.
            </p>

            {beta ? (
              <>
                <a className="dl-btn dl-btn--primary" href={downloads.beta}>
                  Download the beta <span aria-hidden="true">↓</span>
                </a>
                <p className="dl-req">
                  You&rsquo;re on the beta channel. Updates arrive automatically.
                </p>
              </>
            ) : signedIn ? (
              <>
                <Link className="dl-btn dl-btn--ghost" href="/#pricing">
                  Request beta access
                </Link>
                <p className="dl-req">
                  <LockGlyph /> Your account doesn&rsquo;t have beta access yet.
                  Join the waitlist to unlock it.
                </p>
              </>
            ) : (
              <>
                <SignInButton mode="modal">
                  <button className="dl-btn dl-btn--ghost" type="button">
                    Sign in to check access
                  </button>
                </SignInButton>
                <p className="dl-req">
                  <LockGlyph /> Beta is for waitlist members.{" "}
                  <Link href="/#pricing" className="dl-inline-link">
                    Join the waitlist
                  </Link>{" "}
                  to unlock it.
                </p>
              </>
            )}
          </section>
        </div>

        <p className="dl-foot-note">
          Both builds transcribe 100% on your device. Signing in only checks
          your access — your voice and transcripts never leave your Mac.
        </p>
      </main>
      <Footer />
    </>
  );
}

function LockGlyph() {
  return (
    <span aria-hidden="true" className="dl-lock">
      🔒
    </span>
  );
}
