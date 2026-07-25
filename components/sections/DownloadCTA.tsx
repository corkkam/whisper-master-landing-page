"use client";

import Link from "next/link";
import { SignUpButton, useUser } from "@clerk/nextjs";
import HyperspeedBackdrop from "@/components/chrome/HyperspeedBackdrop";
import { downloads } from "@/lib/config";

export default function DownloadCTA() {
  const { isSignedIn, isLoaded } = useUser();

  return (
    <section className="download-cta" id="download">
      <HyperspeedBackdrop variant="cta" />

      <div className="download-inner">
        <p className="label">
          <i className="rec-dot is-live" />
          Ready when you are
        </p>

        <h2 className="download-title">
          Stop typing.<br />
          Start <em>talking.</em>
        </h2>

        <p className="download-lede">
          Free while in beta. {downloads.requirements}. Your account only checks
          which build you can get — your voice and your transcripts never leave
          your Mac.
        </p>

        <div className="download-actions">
          {!isLoaded ? (
            // Reserve the button's box so the section doesn't jolt on hydration.
            <span className="btn btn--primary btn--pending" aria-hidden="true">
              Download for Mac
            </span>
          ) : isSignedIn ? (
            <Link className="btn btn--primary btn--xl" href="/download" data-cursor="Let's go">
              Download for Mac
              <span aria-hidden="true">↓</span>
            </Link>
          ) : (
            <SignUpButton mode="modal" forceRedirectUrl="/download">
              <button className="btn btn--primary btn--xl" type="button" data-cursor="Takes a second">
                Create your account to download
                <span aria-hidden="true">↓</span>
              </button>
            </SignUpButton>
          )}

          <Link className="btn btn--ghost btn--xl" href="/roadmap" data-cursor="What's next">
            See the roadmap
          </Link>
        </div>

        {isLoaded && !isSignedIn && (
          <p className="download-note">
            Already have an account?{" "}
            <Link href="/download" className="inline-link">
              Sign in to get your build
            </Link>
            .
          </p>
        )}
      </div>
    </section>
  );
}
