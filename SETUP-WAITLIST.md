# Waitlist backend — setup

Stack: **Clerk** (auth: Google OAuth + email OTP) + **Supabase** (plain
Postgres via the service-role key — no Supabase Auth). One entry per person;
signing in again shows your position, points, and referral link.

Do these once, then the app runs locally and on Vercel.

## 1. Clerk (auth)

1. dashboard.clerk.com → your app → **API Keys** — copy the publishable +
   secret keys into `.env.local` (see `.env.local.example`).
2. **User & Authentication → Email, Phone, Username** — enable **Email
   verification code** (OTP sign-in, no password).
3. **User & Authentication → Social connections** — enable **Google**.
4. **Restrictions → Sign-up mode: Public.** Do NOT use Clerk's "Waitlist"
   mode — it blocks the `signUp.create()` calls the join modal relies on.
   Gating access to the actual app is handled by the `status` column in
   Supabase (`pending → invited → accepted`), not by Clerk.

## 2. Supabase (database)

1. supabase.com → New project. Pick a region close to you.
2. **Settings → API** — copy `Project URL` and the `service_role` key
   (secret) into `.env.local`. The anon key is not used.
3. **SQL Editor → New query** → run
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
   It creates `waitlist_entries` (+ `social_claims`, `referrals`), the
   referral-code and points triggers, and the rank recompute. Point values
   mirror [`lib/waitlist/points.ts`](lib/waitlist/points.ts) — if you change
   them, change both places.
4. Run [`supabase/migrations/0002_payment_clicks.sql`](supabase/migrations/0002_payment_clicks.sql)
   the same way — it creates `payment_clicks`, which records every click on a
   "skip the queue" donation tier (payment-interest analytics).

## 3. Local env

```bash
cp .env.local.example .env.local
```

Fill in the Clerk keys, `NEXT_PUBLIC_SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, and `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.

## 4. Run

```bash
npm run dev
```

Test the loop: join → success screen shows your spot + referral link → open
the `/r/CODE` link in a private window → join with a second account → first
account gains +200 points and moves up.

## Environments (local / preview / production)

One Supabase instance serves all three without data collisions, using a mix of
a local stack and Postgres **schema separation**:

| Environment | Supabase | Schema (`SUPABASE_DB_SCHEMA`) | Clerk |
|-------------|----------|-------------------------------|-------|
| **Local**   | `supabase start` (Docker) | `public` (local DB) | test keys |
| **Preview** | cloud instance | `dev` | test keys |
| **Production** | cloud instance | `public` | live keys |

The server client reads `SUPABASE_DB_SCHEMA` (see `lib/supabase/server.ts`),
defaulting to `public`.

### Local development (recommended)

```bash
supabase start          # boots local Postgres + applies supabase/migrations
supabase status         # prints local API URL + keys (already in .env.local)
pnpm dev
```

`.env.local` points at the local stack (`http://127.0.0.1:54321`). Nothing you
do locally touches cloud data. `supabase stop` when done.

### Cloud `dev` schema (one-time, for Preview)

In the Supabase dashboard for the cloud project:

1. **SQL Editor → New query** → run
   [`supabase/dev-schema.sql`](supabase/dev-schema.sql). It creates a `dev`
   schema mirroring `public` (keep the two in sync when you change either).
2. **Settings → API → Exposed schemas** → add `dev` (PostgREST won't serve an
   unexposed schema).

`SUPABASE_DB_SCHEMA` is already set in Vercel (`public` for Production,
`dev` for Preview).

## Deploy (Vercel)

Add the same env vars in the Vercel project settings and set
`NEXT_PUBLIC_SITE_URL` to your production URL. In Clerk, create a
**production instance** for the real domain (dev instances show a banner and
cap MAUs) and swap the keys.

---

### What's wired

- `supabase/migrations/0001_init.sql` — schema + triggers + rank recompute
- `supabase/migrations/0002_payment_clicks.sql` — payment-interest click tracking
- `lib/supabase/server.ts` — service-role admin client (server-only)
- `lib/waitlist/schema.ts` — Zod validation + form field options
- `lib/waitlist/actions.ts` — `submitWaitlist`, `getDashboard`,
  `claimSocial`, `getLeaderboard` (server actions)
- `lib/waitlist/points.ts` — display-side point values + milestones
- `app/r/[code]/route.ts` — referral links (30-day cookie → attached on join)
- `components/waitlist/JoinModal.tsx` — Google/OTP auth → details → success
  dashboard (position, points, referral link, share buttons, milestones)

### Not wired yet

- **Donations / skip-the-queue** — checkout is a stub
  (`startDonationCheckout`); wire Stripe/Polar and call
  `awardDonationPoints` from the payment webhook, or hide the panel.
- **Turnstile** — components exist (`components/waitlist/Turnstile.tsx`)
  but are not mounted in the join flow.
