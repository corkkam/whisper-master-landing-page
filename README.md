# Whisper Master — the site

The public web surface for [Whisper Master](https://whispermaster.app), the
local-first dictation app for macOS: marketing page, downloads, sign-in, pricing,
the trust and legal disclosure, the B2B lead funnel, and the billing plumbing.

It started life as a waitlist page. It is not one any more — the stable build is
open to anyone, and the beta sits behind a Clerk flag.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 3 ·
Clerk · Supabase · Polar · Framer Motion · Three.js · pnpm · Vercel.

**Positioning:** the wedge is architectural, not featural. Transcription runs on
the buyer's own hardware, so there is no retention policy to audit because there
is nothing to retain.

---

## Quick start

```bash
pnpm install
pnpm dev            # http://localhost:3000
pnpm build          # the gate — type-checks the whole app
pnpm lint
node scripts/shoot.mjs   # Playwright screenshots
```

Copy `.env.local.example` to `.env.local` and fill it in. Eight variables are
required (Clerk publishable and secret keys, the two Clerk redirect URLs, the
Supabase URL, service-role key and schema, and the site URL). Everything else is
optional and each one switches a whole feature on — see the annotations in that
file.

Use **pnpm**. There is a `pnpm-lock.yaml`; `npm install` here is wrong.

## Routes

| Route | What it is |
|---|---|
| `/` | the marketing page, assembled from `components/sections/` |
| `/download` | stable DMG open to everyone, beta behind `publicMetadata.betaAccess` |
| `/pricing` | published prices, purchasing-power pricing for India, no Buy buttons while checkout is dormant |
| `/for-teams` | the B2B lead form, deliberately with no sign-in gate |
| `/admin/pipeline` | the lead pipeline, gated by `ADMIN_USER_IDS`, 404s until it is set |
| `/roadmap` | the public roadmap |
| `/trust` · `/privacy` · `/terms` | the disclosure surface |
| `/welcome` · `/sign-in` · `/sign-up` · `/sso-callback` | Clerk auth |
| `/r/[code]` | referral redirect |
| `/api/checkout` · `/api/portal` · `/api/webhooks/polar` | Polar billing |

## Layout

```
app/               routes (App Router)
components/
  sections/        the marketing page, section by section
  chrome/          site chrome — cursor, notch, consent, analytics, toasts
  plates/          the illustrated surfaces the page is built on
  pricing/  leads/  waitlist/    feature-specific UI
lib/
  config.ts        product copy, download URLs and the reasoning behind them
  content.ts       roadmap, FAQ, proof stats, hero demo copy
  legal.ts         the disclosure copy — moves with the Mac app's Settings string
  pricing.ts       tiers, and INR_COUNTRIES scoping PPP pricing to India alone
  billing/         Polar plans and entitlement grants
  leads/           schema, server-side scoring, pipeline stages
  waitlist/        actions (public endpoints) and queries (server-only)
  clerk/beta.ts    the beta-access flag
  supabase/        the admin client
supabase/migrations/   0001 … 0007
middleware.ts      Clerk, plus the retired-cookie guard
```

## Things that will bite you

**Everything exported from a `"use server"` module is a public HTTP endpoint.**
Next.js compiles each one into a server action with a stable id that ships in the
client bundle, so anyone can call it with arbitrary arguments. Functions in
`lib/waitlist/actions.ts` establish identity themselves and derive every
security-relevant value from the session, never from a parameter. Anything that
must not be browser-callable lives in `queries.ts`, guarded by `server-only`.

**Billing is complete and deliberately dormant.** `selfServeCheckoutReady()`
reads whether `POLAR_PRODUCT_*` is set, so dormancy is derived from configuration
rather than from a separate flag. Turning it on is an afternoon: run migration
`0007`, create the Polar products, set the variables, point the webhook. Until
then the public position is "free during beta". **Do not describe payments as
live.**

**The webhook verifies Polar's signature before granting anything**, entitlement
lives on Clerk `publicMetadata` with Supabase as a mirror, `subscription.canceled`
does not revoke access (only `subscription.revoked` does), and grants never
downgrade — Polar delivers at-least-once and unordered, so a stale Pro event can
arrive after a Lifetime purchase.

**Checkout resolves the product id server-side** against an allow-list in
`lib/billing/plans.ts`. The stock `Checkout()` handler takes it from a query
parameter, which would make the browser the authority on what is being sold.

**Download links point at a versioned DMG on purpose.** The overwriteable alias
kept serving stale bytes from the CDN. The reasoning is written above the
constants in `lib/config.ts`; update them deliberately when a release lands.

**The middleware's retired-cookie guard is load-bearing.** `clerkMiddleware()`
throws on a session token signed by a Clerk instance whose key is not in the
current JWKS, and on Vercel an unhandled throw there is a 500 on every route.
This site runs three Clerk instances, and after one was rotated, returning
visitors carrying the old cookie took the whole site down. An unverifiable token
is now treated as no session. Read the comment at the top of `middleware.ts`
before touching it.

**Analytics are account-linked and opt-out.** Never write "anonymous" or
"opt-in" — the copy here and the Mac app's Settings string move together.

**Never quote 3.4% word error rate on its own.** Clean human speech is 3.4%, a
Bluetooth HFP mic is 16.3%, a noisy room is 23.5%. All three or none.

## Deploy

Hosted on Vercel. **`main` is what production serves** — a route that only exists
on `dev` 404s in production. Branch off `dev`, open a PR, and promote
deliberately.

## More

- [`AGENTS.md`](AGENTS.md) — the working contract for anyone, human or agent
- `../docs/` — the shared documentation set for the whole project
- `../whisper-master/` — the Mac app this site sells
