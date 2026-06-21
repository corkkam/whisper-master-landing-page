# Waitlist backend — setup

Stack: **Supabase** (Postgres + Auth) with passwordless verified capture
(Google OAuth **or** email OTP). One entry per person; the same sign-in lets
them return to see their position.

Do these once, then the app runs locally and on Vercel.

## 1. Create the Supabase project
1. supabase.com → New project. Pick a region close to you.
2. **Settings → API** — copy:
   - `Project URL`
   - `anon` `public` key
   - `service_role` key (secret)

## 2. Create the database
- **SQL Editor → New query** → run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
  (profiles + waitlist_entries + position counter + auto-profile + RLS).
- Then run [`supabase/migrations/0002_viral.sql`](supabase/migrations/0002_viral.sql)
  (referral codes + points ledger + referrals + leaderboard RPCs). Review the
  point values in it first — they mirror `lib/waitlist/points.ts`.

## 3. Enable Google sign-in
1. **Google Cloud Console** → APIs & Services → Credentials → *Create OAuth client ID* → Web application.
2. Authorized redirect URI: `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
   (shown in Supabase under Auth → Providers → Google).
3. Copy the **Client ID** + **Client secret**.
4. Supabase → **Authentication → Providers → Google** → paste both → enable.

## 4. (Email OTP) — already on
Email is enabled by default in Supabase Auth. The app uses 6-digit OTP
(no password). Optionally customize the email template under
**Authentication → Email Templates → Magic Link / OTP**.

## 4b. Cloudflare Turnstile (bot check at signup)
1. dash.cloudflare.com → **Turnstile** → Add site (your domain + `localhost`).
2. Copy the **Site key** → `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, and the
   **Secret key** → `TURNSTILE_SECRET_KEY`.

## 5. Local env
```bash
cp .env.local.example .env.local
```
Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, and `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.

## 6. Redirect URLs (Supabase → Authentication → URL Configuration)
- **Site URL:** `http://localhost:3000` (and your Vercel URL in prod)
- **Redirect URLs:** add `http://localhost:3000/auth/callback` and the prod equivalent.

## 7. Run
```bash
npm run dev
```

## Deploy (Vercel)
Add the same env vars in the Vercel project settings, set
`NEXT_PUBLIC_SITE_URL` to your production URL, and add that URL to Supabase
Site URL + Redirect URLs.

---

### What's wired
- `supabase/migrations/0001_init.sql` — schema + RLS + triggers
- `lib/supabase/{client,server}.ts` — browser + server (+ admin) clients
- `lib/waitlist/schema.ts` — Zod validation + form field options
- `lib/waitlist/actions.ts` — `submitWaitlist`, `getMyEntry` (server actions)
- `app/auth/callback/route.ts` — Google OAuth callback

### Next (the join UI)
The join flow (auth step → details step → success with position), wired to the
hero CTA, comes next — it'll use the browser client for Google/OTP and the
`submitWaitlist` action to persist.
