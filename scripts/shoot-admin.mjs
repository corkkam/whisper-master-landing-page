// Throwaway: sign in to the local dev server as the fixture admin and capture
// the admin surfaces. Pairs with scripts/seed-dev-admin.py; neither ships.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3001";
const EMAIL = "priya.raman+clerk_test@example.com";
const OUT = "admin-shots";

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();

page.on("console", (m) => m.type() === "error" && console.log("[console]", m.text()));
page.on("pageerror", (e) => console.log("[pageerror]", e.message));

await page.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded" });
await page.getByLabel(/email/i).first().fill(EMAIL);
await page.getByRole("button", { name: /continue/i }).first().click();
await page.waitForTimeout(2500);
// Clerk development instances accept 424242 as the code for any
// `+clerk_test@` address, so no mailbox is involved.
if (page.url().includes("factor-one")) {
  // Clerk renders the code field as styled divs over one hidden input, and the
  // container sets `pointer-events: none`, so it has to be filled directly.
  await page.locator("input").first().fill("424242", { force: true });
}
await page.waitForTimeout(3000);
console.log("after sign-in:", page.url());

async function shoot(name, path) {
  const res = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  console.log(path, res?.status());
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
}

await shoot("overview", "/admin");
await shoot("users", "/admin/users");
await shoot("users-by-usage", "/admin/users?sort=usage");
await shoot("beta", "/admin/beta");

// The detail page needs a real id, so take one off the list rather than
// hard-coding a fixture that the seeder regenerates on every run.
// Sorted by usage, so the detail shot lands on someone who actually dictates.
await page.goto(`${BASE}/admin/users?sort=usage`, { waitUntil: "domcontentloaded" });
const href = await page.locator("a.ad-urow").first().getAttribute("href");
if (href) await shoot("user-detail", href);
else console.log("no user rows to open");

// Narrow, because this is a tool used one-handed between other things.
await page.setViewportSize({ width: 430, height: 900 });
await shoot("users-mobile", "/admin/users");
if (href) await shoot("user-detail-mobile", href);

await browser.close();
console.log("done");
