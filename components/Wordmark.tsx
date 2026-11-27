import Image from "next/image";

/**
 * The mark is the orb — the same dotted sphere the app draws while it is
 * listening to you, frozen on one frame. It replaced a four-bar mic level
 * meter, which the app itself no longer uses anywhere.
 *
 * It is the shipped app icon, not a web-only drawing: the 128px slot of the
 * app repo's `Resources/AppIcon.icns`, cropped to the tile (Apple's icon-grid
 * margin removed) and scaled to 72px, 3x this 24px box. That slot is drawn at
 * its own dot density, so it still reads as a sphere at this size.
 * `app/favicon.ico` (the 16 and 32px slots, and 48px from the 64px slot) and
 * `app/apple-icon.png` come from the same file. `Scripts/make-logo.swift`
 * still writes its own web variants to these three paths when it runs, so
 * re-extract from the .icns after it.
 *
 * Static on purpose, and `unoptimized` on purpose. `thinking-orbs` renders the
 * live animated version — but a logo must not change shape, the system spends
 * its only perpetual motion on the record dot, and that component is
 * canvas-only, so it would also cost the nav and footer a server-rendered
 * mark. `unoptimized` keeps the exact bytes of the file rather than letting
 * the image pipeline resample a dot field.
 */
export function OrbMark({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/wordmark-orb.png"
      alt=""
      aria-hidden="true"
      width={24}
      height={24}
      unoptimized
      priority
      className={`wordmark-mark ${className}`}
    />
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`wordmark ${className}`}>
      <OrbMark />
      <span className="wordmark-text">
        Typing<em>.sucks</em>
      </span>
    </span>
  );
}
