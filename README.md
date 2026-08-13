# Whisper Master — the website

This is the code behind **[whispermaster.app](https://whispermaster.app)**, the
site for Whisper Master: a local-first dictation app for macOS. Everything the
public sees lives here — the marketing page, the downloads, sign-in, pricing, the
privacy and trust pages, the team enquiry form, and the billing plumbing.

The idea the site sells is simple: **your voice never leaves your Mac.**
Transcription runs on your own hardware, so there is no recording to store, leak,
or hand over. That is an architectural fact, not a promise — and the site is built
to say so plainly.

**Built with:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 3 ·
Clerk (sign-in) · Supabase · Polar (billing) · Framer Motion · Three.js, deployed
on Vercel with pnpm.

## Get it running

You need Node and [pnpm](https://pnpm.io). Then:

```bash
pnpm install
cp .env.local.example .env.local   # then fill it in — see below
pnpm dev                           # open http://localhost:3000
```

That is enough to see the site. Some features stay dark until their keys are set.

**Other commands**

```bash
pnpm build              # production build — also the type-check that gates every change
pnpm lint               # linting
pnpm audit --prod       # dependency security check (expected: clean)
node scripts/shoot.mjs  # capture Playwright screenshots of the site
```

Use **pnpm**, not npm — the lockfile is pnpm's.

## Configuration

Copy `.env.local.example` to `.env.local` and fill it in. **Eight variables are
required** — the Clerk publishable and secret keys, the two Clerk redirect URLs,
the Supabase URL, service-role key and schema, and the site URL. Everything else
is optional, and each optional variable switches on a whole feature (the admin
lead pipeline, founder notifications, the Turnstile bot check, Google Analytics,
and Polar checkout). Every variable is annotated in that file. `.env.local` is
git-ignored; add a new variable to `.env.local.example` by name only, never with a
real value.

## What lives where

| Route | What it is |
|---|---|
| `/` | the marketing page, built from `components/sections/` |
| `/download` | the stable build (free, no account) and the invite-only beta |
| `/pricing` | published prices, with a lower tier for India; no purchase yet |
| `/for-teams` | the enquiry form for teams and regulated firms |
| `/roadmap` | what is shipped and what is next |
| `/trust` · `/privacy` · `/terms` | how the product handles your data |
| `/welcome` · `/sign-in` · `/sign-up` | account flow (Clerk) |

```
app/               routes (App Router)
components/
  sections/        the marketing page, section by section
  chrome/          site chrome — cursor, notch, consent, analytics, toasts
  plates/          the illustrated surfaces the page is built on
lib/
  config.ts        public product copy and the stable download URL
  config.server.ts server-only values (the beta download URL) — never bundled to the client
  content.ts       roadmap, FAQ, proof stats, hero copy
  legal.ts         the privacy/trust disclosure copy
  pricing.ts       tiers, and the India purchasing-power pricing
  billing/         Polar plans and entitlement grants
  leads/           the team enquiry funnel
  waitlist/        early-access actions and queries
  supabase/        the server-side admin client
supabase/migrations/   0001 … 0008
middleware.ts      Clerk auth, plus a guard for retired session cookies
```

## A few things to know

- **The download is free and needs no account.** You create one on first launch,
  only to identify your licence. Your dictation stays on your Mac.
- **Billing is built but switched off.** The public position is "free during the
  beta". Prices are published so referral rewards mean something.
- **`main` is what production serves.** Branch off `dev`, open a pull request, and
  promote to production deliberately.

## For contributors and agents

The deeper working rules — the security invariants, the copy and design
constraints, the billing model, and the landmines that look like cleanup
opportunities — are in **[`AGENTS.md`](AGENTS.md)**, with a fast-path summary in
**[`CLAUDE.md`](CLAUDE.md)**. Read `AGENTS.md` before changing code. In short:
verify UI changes visually, keep the download DMG links versioned, never describe
payments as live or analytics as anonymous, and never weaken an auth gate or
commit a secret.

## More

- `../whisper-master/` — the Mac app this site sells
- `../docs/` — the shared documentation set for the whole project
