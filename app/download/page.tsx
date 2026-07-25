import type { Metadata } from "next";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { SignInButton } from "@clerk/nextjs";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { isBetaUser } from "@/lib/clerk/beta";
import { getDashboard } from "@/lib/waitlist/actions";
import { downloads, product } from "@/lib/config";

export const metadata: Metadata = {
  title: "Download Whisper Master",
  description:
    "Download Whisper Master for macOS. The stable build is a free public download; the beta channel unlocks once you're approved off the waitlist.",
};

// Auth-dependent — never statically cache. `currentUser()` already opts this
// route into dynamic rendering, but we're explicit so the beta gate is correct
// per request.
export const dynamic = "force-dynamic";

// Opens the join modal on the landing page (see JoinContext's ?join handling).
const JOIN_HREF = "/?join=1";

export default async function DownloadPage() {
  const user = await currentUser();
  const signedIn = user != null;
  const beta = isBetaUser(user?.publicMetadata);
  // Only needed to tell "waiting in line" apart from "never joined" — skip the
  // query for signed-out visitors and for approved users (already unlocked).
  const dash = signedIn && !beta ? await getDashboard() : null;

  return (
    <>
      <Nav />
      <main className="download-page">
        <div className="download-head">
          <div className="kicker">DOWNLOAD</div>
          <h1>Get {product.name} for Mac</h1>
          <p>
            The stable build is a free public download. The beta channel unlocks
            here automatically once you&rsquo;re approved off the waitlist.
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

          {/* ── Beta: gated on approval (Clerk publicMetadata.betaAccess) ─ */}
          <section className="dl-card">
            <div className="dl-badge dl-badge--beta">Beta</div>
            <h2>Early builds, first</h2>
            <p className="dl-desc">
              New features and fixes before they hit stable, updated often.
              Installs side-by-side with the stable app.
            </p>

            {beta ? (
              /* Approved — the whole point of the flow. */
              <>
                <a className="dl-btn dl-btn--primary" href={downloads.beta}>
                  Download the beta <span aria-hidden="true">↓</span>
                </a>
                <p className="dl-req">
                  You&rsquo;re approved and on the beta channel. Updates arrive
                  automatically.
                </p>
              </>
            ) : dash ? (
              /* On the list, not approved yet — show the spot, keep them sharing. */
              <>
                <Link className="dl-btn dl-btn--ghost" href={JOIN_HREF}>
                  Move up the line <span aria-hidden="true">↗</span>
                </Link>
                <p className="dl-req">
                  <LockGlyph /> You&rsquo;re{" "}
                  {dash.rank ? (
                    <>
                      <strong>#{dash.rank}</strong> on the waitlist
                    </>
                  ) : (
                    "on the waitlist"
                  )}
                  . We&rsquo;ll email you the moment you&rsquo;re approved —
                  referrals move you up.
                </p>
              </>
            ) : signedIn ? (
              /* Signed in but never completed the join form. */
              <>
                <Link className="dl-btn dl-btn--ghost" href={JOIN_HREF}>
                  Join the waitlist <span aria-hidden="true">↗</span>
                </Link>
                <p className="dl-req">
                  <LockGlyph /> You&rsquo;re signed in but not on the waitlist
                  yet. Join to get in line for beta access.
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
                  <LockGlyph /> Beta is for approved waitlist members.{" "}
                  <Link href={JOIN_HREF} className="dl-inline-link">
                    Join the waitlist
                  </Link>{" "}
                  to get in line.
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
