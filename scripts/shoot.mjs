import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

// Usage: node scripts/shoot.mjs <outDir> [path ...]
const [outDir = "shots", ...paths] = process.argv.slice(2);
const routes = paths.length ? paths : ["/"];

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();

for (const [label, viewport] of Object.entries({
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
})) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
  for (const route of routes) {
    const slug = route === "/" ? "home" : route.replace(/\W+/g, "-").replace(/^-|-$/g, "");
    await page.goto(`http://127.0.0.1:3000${route}`, { waitUntil: "networkidle" });
    // Let entrance animations settle, then walk the page so every
    // scroll-triggered reveal has fired before the full-page capture.
    await page.waitForTimeout(1200);
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.8;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 220));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${outDir}/${slug}-${label}.png`, fullPage: true });
    console.log(`${outDir}/${slug}-${label}.png`);
  }
  await page.close();
}

await browser.close();
