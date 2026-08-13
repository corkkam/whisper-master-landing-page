"use client";

import { useDictation } from "@/components/chrome/DictationContext";

/**
 * The hero's proof: a messy line spoken out, a pause, and the cleaned result in
 * its place. Runs forever, on the page's one dictation clock.
 *
 * It used to open on a drawn screen edge with the band hanging off it — a
 * depiction of the Mac's top bezel, printed in the middle of the page. That
 * belongs to the real top edge now (see `MenuBarNotch`), and drawing it twice
 * would put the product's chrome in two places on one screen, which no machine
 * does. So this panel is just the transcript: what you said, and what it wrote.
 *
 * All state lives in `DictationContext`, which is what keeps the words here and
 * the word in the band describing the same moment.
 */
export default function LiveDictation() {
  const { heard, shown, written } = useDictation();

  return (
    <div className="capture">
      <div className="capture-body">
        <div className="capture-row">
          <span className="capture-tag">You say</span>
          <p className="capture-said">
            {heard}
            {!written && <i className="caret" aria-hidden="true" />}
          </p>
        </div>

        <div className="capture-row capture-row--out is-in" data-fresh={written || undefined}>
          <span className="capture-tag capture-tag--out">It writes</span>
          <p className="capture-wrote" aria-live="polite">
            {shown}
          </p>
        </div>
      </div>
    </div>
  );
}
