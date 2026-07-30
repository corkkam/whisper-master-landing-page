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

   This is a **per-instance** setting: set it on the development instance *and*
   on the production instance (the dashboard's env switcher). A production
   instance left in waitlist mode fails only in production, with
   `The sign_up_if_missing option cannot be used: sign up is in waitlist mode`.
   Verify either side without logging in:

   ```bash
   curl -s "https://<frontend-api-host>/v1/environment?__clerk_api_version=2025-04-10&_clerk_js_version=5.100.0" \
     | python3 -c "import sys,json;print(json.load(sys.stdin)['user_settings']['sign_up']['mode'])"
   # → public
   ```

   The host is the base64-decoded publishable key, e.g.
   `clerk.whisper.corkkam.com` for production. There is no Backend API for this
   setting — `PATCH /v1/instance/restrictions` only covers allowlist/blocklist —
   so it has to be flipped in the dashboard.

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

| Environment | Supabase | Schema (`SUPABASE_DB_SCHEMA`) | Clerk instance |
|-------------|----------|-------------------------------|----------------|
| **Local**   | `supabase start` (Docker) | `public` (local DB) | **Development** (test keys) |
| **Preview** | cloud instance | `dev` | **Development** (test keys) |
| **Production** | cloud instance | `public` | **Production** (live keys) |

Clerk gives you two instances under one app. The **Development** instance
(test keys) is a throwaway userbase for local + preview work. The
**Production** instance (live keys) is the real userbase and serves **both beta
and stable users** — there's no separate "beta" instance; the channel is just a
flag on the user (below).

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

## Approving a waitlist member (Clerk metadata)

Approval is **one flag on the Clerk user**, not a separate instance or account.
Joining the waitlist does *not* grant it — every entry lands as `pending` and
waits for you:

```
Join           → Clerk account + Supabase row (status: pending)
                 user sees rank, referral link, milestones
You approve    → Clerk dashboard → Users → <user> → Metadata → Public
                 { "betaAccess": true }
User returns   → /download: stable (always) + beta (now unlocked)
                 Supabase status reconciles to `accepted` on next read
```

### Approving one user

1. dashboard.clerk.com → **Users** → pick the user (search by email).
2. **Metadata → Public metadata → Edit**, then save:

   ```jsonc
   {
     "betaAccess": true,
     "betaJoinedAt": "2026-07-26"  // optional; ISO date for your own records
   }
   ```

3. That's it. Nothing to redeploy — `/download` is `force-dynamic`, so their
   next page load shows the beta button. The landing-page hero CTA and nav
   switch to **Download** too.

`publicMetadata` is readable everywhere but only **writable with the secret
key**, so the flag can't be spoofed from a browser.

**Helpers** ([`lib/clerk/beta.ts`](lib/clerk/beta.ts)) for scripted/bulk
approvals — the dashboard is the everyday path:

- `approveUser(userId, current?)` — approve off the waitlist. Idempotent and
  merge-safe; `betaJoinedAt` is stamped once.
- `setBetaAccess(userId, false)` — revoke (beta → stable) without deleting the
  account. Use when the beta program ends; the same login rolls onto stable.
- `isBetaUser(publicMetadata)` — read the flag.

The contract is typed in [`types/globals.d.ts`](types/globals.d.ts) so
`user.publicMetadata.betaAccess` is checked at compile time.

### Where the gate is enforced

| Surface | Signed out | Pending | Approved |
| --- | --- | --- | --- |
| Hero / final CTA (`WaitlistForm`) | email → join | rank + "Boost my spot" | **Download** |
| Nav CTA | "Join waitlist" | "Refer a friend" | **Download** |
| Join modal success screen | — | "Beta access is pending" | "Download the beta" |
| `/download` → Stable | ✅ public | ✅ | ✅ |
| `/download` → Beta | sign-in prompt | 🔒 "You're #N…" | ✅ download |

> **Heads-up — the beta gate is UI-only.** `downloads.beta` in
> [`lib/config.ts`](lib/config.ts) is a public R2 URL, so anyone who knows or
> guesses it can fetch the DMG without being approved. To make the gate real,
> serve it through a route handler that checks `isBetaUser()` and redirects to a
> short-lived **presigned** R2 URL (and make the bucket private).

> **Automating approval.** The flag is just metadata, so anything can set it: a
> `/api/webhooks/clerk` handler, a cron that approves the top N by points, or a
> Supabase trigger calling `approveUser()`. Approvals made out-of-band still
> work — `getDashboard()` mirrors them into `waitlist_entries.status`.

### How the Mac app consumes it

After Clerk login, read the same field and point Sparkle at the matching
appcast:

```swift
if let user = Clerk.shared.user {
    let isBeta = user.publicMetadata["betaAccess"] as? Bool ?? false
    SparkleUpdater.shared.feedURL = URL(string: isBeta
        ? "https://yourdomain.com/appcast-beta.xml"
        : "https://yourdomain.com/appcast.xml")!
}
```

One account works for both channels; flip the flag and the user moves between
them — no re-signup.

> **Alternative — Clerk's own waitlist mode.** Clerk can host the queue itself
> (Restrictions → Sign-up mode → Waitlist, with an Approve button and invite
> emails). This repo deliberately doesn't use it: unapproved users can't sign
> in there, which kills the referral engine — no rank, referral link, points, or
> milestones until after approval. Keep Sign-up mode on **Public** and gate on
> `betaAccess` instead.

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
- `lib/clerk/beta.ts` — approval flag helpers (`approveUser`, `setBetaAccess`,
  `isBetaUser`); set on approval, **not** on join
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
