"use client";

import Link from "next/link";
import { SignUpButton, useUser } from "@clerk/nextjs";
import { downloads } from "@/lib/config";
import { Plate, PlateNo, Rise } from "@/components/plates/Plate";
import { Water } from "@/components/plates/Water";

/**
 * PLATE 06 — THE UNIT.
 *
 * The close. Same words on the button as the hero, because the ask has not
 * changed and dressing it up at the bottom makes it look like a bigger one.
 * The assurances sit above the button rather than beneath it: they are what
 * make it clickable, not a footnote explaining it afterwards.
 */
export default function Unit() {
  const { isSignedIn, isLoaded } = useUser();

  return (
    <Plate
      id="unit"
      className="unit"
      backdrop={
        <Water
          src="/plates/unit.webp"
          alt="An open hand held just above still water, in the moment before it touches"
          amp={0.007}
          className="unit-pond"
        />
      }
    >
      <Rise>
        <PlateNo n="06" title="The unit" />
      </Rise>

      <Rise as="h2" className="plate-title">
        Stop typing your thoughts. Say them.
      </Rise>

      <Rise delay={80}>
        <p className="unit-lede">
          Free while in beta. {downloads.requirements}. Your account only decides
          which build you can download — your voice and your transcripts stay
          where they were spoken.
        </p>
      </Rise>

      <Rise delay={140}>
        <ul className="unit-assurances">
          <li>No card, no trial clock</li>
          <li>Uninstall takes your data with it</li>
          <li>Beta accounts keep their build</li>
        </ul>
      </Rise>

      <Rise delay={200}>
        <div className="unit-actions">
          {!isLoaded ? (
            // Reserve the button's box so the plate does not jolt on hydration.
            <span className="btn btn--primary btn--xl btn--pending" aria-hidden="true">
              Download for Mac
            </span>
          ) : isSignedIn ? (
            <Link className="btn btn--primary btn--xl" href="/download">
              Download for Mac
            </Link>
          ) : (
            <SignUpButton mode="modal" forceRedirectUrl="/download">
              <button className="btn btn--primary btn--xl" type="button">
                Download for Mac
              </button>
            </SignUpButton>
          )}
          <Link className="hero-secondary" href="/roadmap">
            See what is next →
          </Link>
        </div>
      </Rise>

      {isLoaded && !isSignedIn && (
        <p className="unit-note">
          Already have an account?{" "}
          <Link href="/download" className="inline-link">
            Sign in to get your build
          </Link>
          .
        </p>
      )}
    </Plate>
  );
}
