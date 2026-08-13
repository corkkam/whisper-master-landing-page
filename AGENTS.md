# AGENTS.md — Whisper Master landing page

The entry point for any AI agent working in this repository. It overrides the
machine-level `~/AGENTS.md` where the two disagree.

Last verified against the tree: **2026-08-14**, `main` and `dev` both at `b4fcff5`.
A security audit on that date fixed the client-bundle beta-URL leak, tightened the
CSP, patched a dependency advisory, and added migration `0008`; the working
reference for day-to-day is **[`CLAUDE.md`](CLAUDE.md)**, which points back here.

---

## 1. What this repository is

The public web surface for Whisper Master: the marketing site, the download page,
sign-in, pricing, the trust and legal pages, the B2B lead funnel, and the billing
plumbing. It is **not** a waitlist page any more, whatever the git history and the
old README said. Stable downloads are open to everyone; the beta build stays
behind a Clerk flag.

**Stack:** Next.js 15 App Router · React 19 · TypeScript · Tailwind 3 · Clerk ·
Supabase · Polar · Framer Motion · Three.js · pnpm 11 · Vercel.

Live at **https://whispermaster.app**. The Mac app it sells lives at
`../whisper-master/`; shared product and business docs are in `../docs/`.

## 2. Routes and what owns them

| Route | What it is |
|---|---|
| `/` | the marketing page, assembled from `components/sections/` |
| `/download` | stable DMG open to all, beta DMG behind `publicMetadata.betaAccess` |
| `/pricing` | published prices, PPP for India, **no Buy buttons while checkout is dormant** |
| `/for-teams` | the B2B lead form, deliberately with no sign-in gate |
| `/admin/pipeline` | the lead pipeline, gated by `ADMIN_USER_IDS`, fails closed with a 404 |
| `/roadmap` | public roadmap, data in `lib/content.ts` |
| `/trust`, `/privacy`, `/terms` | the disclosure surface, copy in `lib/legal.ts` |
| `/welcome`, `/sign-in`, `/sign-up`, `/sso-callback` | Clerk auth flow |
| `/r/[code]` | referral redirect |
| `/api/checkout`, `/api/portal`, `/api/webhooks/polar` | Polar billing |

Library layout: `lib/billing/` (plans, entitlements), `lib/clerk/` (beta flag),
`lib/leads/` (schema, scoring, stages, actions, queries), `lib/waitlist/`
(actions, queries, points), `lib/supabase/server.ts`, plus `config.ts` (public
product copy and the stable download URL), `config.server.ts` (`server-only`
values that must never reach the client bundle — the beta download URL lives
here), `content.ts`, `legal.ts`, `pricing.ts`, `site.ts`, `analytics.ts`,
`admin.ts`, `turnstile.ts`.

## 3. Build and gates

```bash
pnpm install
pnpm dev            # http://localhost:3000
pnpm build          # the real gate — it type-checks the whole app
pnpm lint
node scripts/shoot.mjs   # Playwright screenshots of the site
```

**`pnpm build` passing is the gate.** There is no test suite. Use pnpm; an
`npm install` here is wrong.

**Verify visually before claiming a UI change.** Run the dev server and look, or
use the screenshot script. "It compiles" is not done.

## 4. Hard rules

1. **Everything exported from a `"use server"` module is a public HTTP endpoint.**
   `lib/waitlist/actions.ts` says so in its own header. Every function there must
   establish identity itself with `auth()` / `currentUser()` and derive every
   security-relevant value from that session, never from its arguments. Helpers
   that must not be browser-callable — webhook handlers, entitlement grants,
   internal mutations — go in `queries.ts`, guarded by `server-only`.
2. **The Polar webhook verifies the signature before granting anything.** An
   unverified webhook endpoint is a "give me Pro for free" button.
3. **Clerk `publicMetadata` is the authority on entitlement; Supabase mirrors it.**
   Do not create a second source of truth.
4. **`subscription.canceled` does not revoke access — only `subscription.revoked`
   does.** Cancel means auto-renew is off; the customer keeps the period they paid
   for.
5. **Grants never downgrade.** `grantEntitlement` compares tier rank before
   writing, because Polar delivers at-least-once and unordered.
6. **Checkout resolves the product id server-side** against the allow-list in
   `lib/billing/plans.ts`. Do not switch to `Checkout()` from `@polar-sh/nextjs`:
   it takes the product id from a query parameter, which would make the browser
   the authority on what is being sold, including the tiers that must not be
   self-serve.
7. **Never claim payments are live.** Checkout is complete and deliberately
   dormant — `selfServeCheckoutReady()` reads whether `POLAR_PRODUCT_*` is set.
   "Free during beta" is the public position.
8. **Never describe analytics as anonymous or opt-in.** They are account-linked
   and opt-out. This copy moves together with the Mac app's Settings string; the
   two must agree.
9. **Never quote 3.4% word error rate without its condition.** Clean human speech
   is 3.4%, a Bluetooth HFP mic is 16.3%, a noisy room is 23.5%. The three are
   quoted together or not at all.
10. **Link a versioned DMG, never an overwriteable alias.** `WhisperMaster.dmg`
    kept serving stale bytes from the CDN; `lib/config.ts` points stable at
    `dl.corkkam.com/WhisperMaster-1.0.0.dmg` on purpose, with the reasoning
    written above the constant. Update it deliberately when a release lands.
    The **beta** URL is not there — it is in `lib/config.server.ts` behind
    `server-only`, because a `"use client"` file that imports one field off an
    exported object ships the whole object in the public JS. A gated URL that
    ships to everyone is not gated; do not move `betaDownloadUrl` back into a
    client-importable module.
11. **Never weaken an auth gate**, and never commit a secret. `.env.local` is
    git-ignored; document a new variable in `.env.local.example` by name only.
12. **The middleware's retired-cookie guard is load-bearing.** An unverifiable
    Clerk token is treated as no session rather than allowed to throw — an
    unhandled throw in `clerkMiddleware()` is a 500 on every route in the matcher.
    Read the comment at the top of `middleware.ts` before changing it.

## 5. Configuration

Required: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`,
`NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`,
`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_SCHEMA`,
`NEXT_PUBLIC_SITE_URL`.

Optional, and each one switches a whole feature on: `ADMIN_USER_IDS` (the lead
pipeline 404s until it is set), `LEAD_NOTIFY_WEBHOOK_URL` /
`LEAD_NOTIFY_TELEGRAM_*`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` +
`TURNSTILE_SECRET_KEY` (or `TURNSTILE_DISABLED=true`),
`NEXT_PUBLIC_GA_MEASUREMENT_ID`, and the `POLAR_*` set that turns checkout on.
Full annotations in `.env.local.example`.

Migrations are `supabase/migrations/0001` through `0008`. `0006_leads.sql` backs
the lead funnel; `0007_entitlements.sql` is only needed when charging starts;
`0008_lead_upsert_hardening.sql` redefines `upsert_lead` to stop a resubmission
overwriting an existing Clerk linkage and to bound the appended notes — **it is
written but not yet applied to the live project.** **Whether any of these have
been run against the live project is not knowable from the repo — verify with the
Supabase CLI, do not assume.**

Read live configuration through the CLIs (`vercel env ls`, `supabase`, `gh`).
Never ask the user to click through a dashboard, and never print a secret value —
print the command that sets it.

## 5b. Agent skills

Skills are vendored into `.agents/skills/` and symlinked into `.claude/skills/`.
`skills-lock.json` pins each one, so add and update them with
`npx skills add <repo> --skill <name>`. Do not hand-edit a vendored skill; the
next lock-driven install overwrites it.

Installed: the `clerk/skills` set, and `brag` (`latent-spaces/brag`) which builds
a launch video from the site. `/brag` needs Node 22+, FFmpeg, and the Hyperframes
CLI, and it writes to `brag-output/`, which is git-ignored. Its 18 MB of bundled
music and sound effects is the bulk of `.agents/skills/`.

## 6. Branch and deploy

- Branch `<feature|bug>/<COR-###>-<kebab-description>` off `dev`. Linear team
  **Corkkam**.
- Never commit directly to `dev` or `main`. Push the feature branch and open a PR.
- **`main` is what production serves.** A route that only exists on `dev` 404s in
  production.
- `vercel --prod` and promoting a deployment need explicit confirmation each time.

## 7. Copy and design rules

- Information-dense, minimal copy. No decorative card or pill chrome, no light-
  grey subtitle lines above sections, no em dashes in UI text, no continuously
  repainting CSS animation.
- **Non-trivial UI work stops for a mock.** Publish distinct mocks, report the
  URL, and implement only the one that gets picked. A wrong label, a spacing fix,
  or a bug in an existing component does not need one.
- Never name a model or provider in user-facing copy or errors.
- Never fabricate a screenshot, a demo video, a metric, or a user count. The
  "2,400+ waitlist members" line was real copy on this site once, and pulling it
  is the standard the site is held to now.

## 8. Ask before you act

Confirm first, naming the exact command, for: a production deploy, writing to
`main` or `dev`, any destructive database work, production configuration, a
domain or DNS change, anything a real person receives, and any spend. A question
is read-only.
