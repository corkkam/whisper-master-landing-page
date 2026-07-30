"use client";

// Notch orb disabled — see the commented block in the right wing below.
// import { ThinkingOrb } from "thinking-orbs";
import { heroBackdropState } from "@/lib/content";

/**
 * The app itself, running, faded into the hero's background.
 *
 * A replica of the Mac app's **notch row** — the resting live form: the menu-bar
 * strip, the camera housing, the state word in the left wing and the ember-lit orb
 * in the right one. It sits behind the hero copy so the first thing you see is the
 * product *in place on a Mac*, without a screenshot to go stale or a second
 * animation competing with `LiveDictation`.
 *
 * No transcript here, deliberately: in the real band the words **replace** the
 * state word, and the row form only exists while there is nothing to read (with
 * words, the notch opens downward into a band). Showing both at once would depict
 * a state the app can't be in. The words are `LiveDictation`'s job — this says
 * "it's live in your menu bar", that one says "here's what it writes".
 *
 * It is a DOM replica rather than an image on purpose: it stays crisp at any
 * density, it costs no request, and it inherits the palette — so when the app's
 * notch changes, this changes with it instead of drifting.
 *
 * **Currently static**, back to the original intent: the `thinking-orbs`
 * `listening` orb that briefly filled the right wing is commented out in place.
 * Nothing in this row moves now, so it stays a backdrop rather than a second
 * animation competing with `LiveDictation` behind the headline. The orb library
 * is still in use in the capture panel, where a phase glyph belongs.
 *
 * `superseded` is set once the hero video is playing — the film shows this same
 * row photographically, so the replica fades out rather than doubling it.
 */
export default function HeroAppBackdrop({ superseded = false }: { superseded?: boolean }) {
  return (
    <div className={`app-backdrop${superseded ? " is-yielded" : ""}`} aria-hidden="true">
      <div className="app-backdrop-bar">
        {/* Left wing: the state, in the app's own words. */}
        <span className="app-backdrop-state">{heroBackdropState}</span>

        {/* The camera housing the band molds around — nothing renders behind it,
            which is why the two ends sit in the wings either side. */}
        <span className="app-backdrop-notch" />

        {/* Right wing: where the light comes from. The wing itself stays — it
            holds the 28px the band's geometry is built around, and the ember
            glow at the trailing edge is aimed at it.

            The orb is commented out, not deleted: this is the one moving part
            the backdrop had, and it sits directly behind the headline. Restore
            by uncommenting this and the import above. `theme` is pinned rather
            than `auto` because this page is dark in every condition, and auto
            follows the visitor's OS — light mode would paint dark ink on a dark
            band. `paused` hands it to the film once that supersedes this row. */}
        <span className="app-backdrop-orb">
          {/* <ThinkingOrb state="listening" size={20} theme="dark" paused={superseded} /> */}
        </span>
      </div>
    </div>
  );
}
