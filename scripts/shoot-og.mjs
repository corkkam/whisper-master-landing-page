/**
 * The share card, shot from the page itself.
 *
 * The card used to be drawn from scratch in `opengraph-image.tsx` — a dark
 * gradient carrying the old palette, which after the redesign advertised a site
 * that no longer existed. Shooting the real hero means the card cannot drift
 * from the page again; re-run this whenever the hero changes.
 *
 * Usage:
 *   pnpm build && pnpm start
 *   node scripts/shoot-og.mjs
 */
import { chromium } from "playwright";
import { copyFileSync } from "node:fs";

const OUT = "app/opengraph-image.jpg";
/** X renders the same card. Copied rather than re-exported: the static file
 *  convention takes a file, not a module, so this is the only way to keep the
 *  two from drifting. */
const TWITTER_OUT = "app/twitter-image.jpg";
const URL = process.env.OG_URL ?? "http://127.0.0.1:3000/";

const browser = await chromium.launch();
// Shot at 2x and downsampled by whoever renders it. JPEG rather than PNG
// because the hero is a photographic pencil plate: the PNG of this same frame
// came out at 1.3 MB, which is over the size at which WhatsApp quietly gives up
// on the thumbnail and shows a bare link.
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 2,
});
await page.goto(URL, { waitUntil: "networkidle" });

// The headline dictates itself in on load — strikes its filler words, cleans
// them up, then seals with the accent and the full stop. A fixed timeout caught
// it mid-type (no stop, no accent, every word still the streaming grey), so
// wait for the phase the component itself reports as finished.
await page.waitForSelector('.dictated[data-phase="settled"]', { timeout: 20_000 });

// Chrome that belongs to the browsing session, not to the page.
await page.evaluate(() => {
  document
    .querySelectorAll(".cursor-layer, .screen-scroll, .consent")
    .forEach((el) => el.remove());
});
await page.waitForTimeout(400);

await page.screenshot({ path: OUT, type: "jpeg", quality: 86 });
copyFileSync(OUT, TWITTER_OUT);
console.log(`${OUT} + ${TWITTER_OUT} ← ${URL}`);
await browser.close();
