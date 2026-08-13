# CLAUDE.md — working reference

This file is loaded automatically when an agent starts in this repo. It is the
quick reference for getting oriented and not breaking anything. The full contract
is **[`AGENTS.md`](AGENTS.md)** — read it before you touch code. Where this file
and `AGENTS.md` disagree, `AGENTS.md` wins; this one just gets you moving faster.

## What this is

The public web surface for **Whisper Master**, a local-first macOS dictation app:
marketing page, downloads, sign-in, pricing, the trust/legal pages, the B2B lead
funnel, and dormant billing plumbing. It is **not** a waitlist page, whatever the
git history says. Live at https://whispermaster.app.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind 3 · Clerk ·
Supabase · Polar · Framer Motion · Three.js · pnpm 11 · Vercel.

## Run it

```bash
pnpm install
pnpm dev            # http://localhost:3000
pnpm build          # the real gate — type-checks the whole app. There is no test suite.
pnpm lint
pnpm audit --prod   # dependency check; expected clean
node scripts/shoot.mjs   # Playwright screenshots of the site
```

Use **pnpm**, never `npm` (there is a `pnpm-lock.yaml`). Dependency security
overrides live in `pnpm-workspace.yaml`, not `package.json` — pnpm 11 moved them.

**Verify UI changes visually.** Run the dev server and look, or use the screenshot
script. "It compiles" is not done.

## The load-bearing rules (full list in AGENTS.md §4)

1. **Every export from a `"use server"` module is a public HTTP endpoint.** It must
   establish identity itself with `auth()`/`currentUser()` and derive every
   security-relevant value from the session, never from an argument. Anything that
   must not be browser-callable lives in a `queries.ts`-style module behind
   `import "server-only"`.
2. **Client bundles leak whole objects.** A `"use client"` file that imports one
   property off an exported object ships the entire object in the public JS. That
   is why the beta download URL lives in `lib/config.server.ts` (`server-only`),
   not in `downloads` in `lib/config.ts` — a gated URL that ships to everyone is
   not gated.
3. **Billing is complete and deliberately dormant.** Public position is "free
   during beta". Never describe payments as live. `selfServeCheckoutReady()`
   derives dormancy from whether `POLAR_PRODUCT_*` is set.
4. **The Polar webhook verifies the signature before granting anything.** Grants
   never downgrade; `subscription.canceled` does not revoke, only `.revoked` does.
5. **Analytics are account-linked and opt-out.** Never write "anonymous" or
   "opt-in". This copy moves in lock-step with the Mac app's Settings string.
6. **Link a versioned DMG, never the overwriteable alias** — the alias serves
   stale bytes from the CDN. Reasoning is above the constant in `lib/config.ts`.
7. **The middleware retired-cookie guard is load-bearing.** An unverifiable Clerk
   token is treated as no session; an unhandled throw in `clerkMiddleware()` is a
   500 on every route. Read the comment at the top of `middleware.ts` first.
8. **Never weaken an auth gate; never commit a secret.** `.env.local` is
   git-ignored; document a new variable in `.env.local.example` by name only.

## Security posture (audited 2026-08-14)

- CSP is set in `next.config.mjs`. `'unsafe-eval'` is dev-only now (React Refresh);
  production drops it. `connect-src` pins the exact Supabase host from
  `NEXT_PUBLIC_SUPABASE_URL`, not a `*.supabase.co` wildcard.
- The beta DMG URL is server-only (`lib/config.server.ts`); it must not re-enter
  any client-imported object.
- `supabase/migrations/0008_lead_upsert_hardening.sql` (lead upsert: no linkage
  overwrite, bounded notes) and `0009_lead_events_ip_hash.sql` (ip_hash carried
  on `lead_events`, closing the rate-cap gap where resubmits to a known email
  were never counted) are both **applied to prod** as of 2026-08-14. The IP rate
  cap in `lib/leads/queries.ts` now counts `lead_events`, not `leads`.
- `TURNSTILE_DISABLED` is confirmed **unset** in production (checked 2026-08-14)
  — it is an intentional kill switch that opens the unauthenticated lead form to
  spam while set. Recheck after any env var changes to this project.

## Branch and deploy

- Branch off `dev`, never commit directly to `dev` or `main`. Push a feature
  branch and open a PR (the `file-pr` skill).
- **`main` is what production serves.** A route only on `dev` 404s in prod.
- `vercel --prod` and promoting a deployment need explicit confirmation each time.
- Read live config through the CLIs (`vercel env ls`, `supabase`, `gh`). Never
  print a secret value — print the command that sets it.
