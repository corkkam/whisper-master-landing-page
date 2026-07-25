# macOS app → Supabase + Clerk integration handoff

**Goal:** make the Whisper Master macOS app use *this* project's Supabase
instance and Clerk auth, including the beta/stable release channel.

**Audience:** the agent/developer working on the macOS (Swift/SwiftUI) app.

> **TL;DR of the blocker:** this Supabase instance runs **RLS enabled with
> zero policies** — today only the server-side *service-role* key can read/write.
> A native client (the Mac app) **cannot** just embed a key and query it. You
> must pick a client-access path (Section 4) and add RLS policies. Do **not**
> ship the service-role key in the app.

---

## 1. The Supabase instance

| Field | Value |
|-------|-------|
| Project name | `supabase-crimson-magnet` |
| Project ref | `ypazgzrxkrdbnbrqgxjk` |
| API / Project URL | `https://ypazgzrxkrdbnbrqgxjk.supabase.co` |
| Region / PG | `us-east-1` / Postgres 17 |
| Data API base | `https://ypazgzrxkrdbnbrqgxjk.supabase.co/rest/v1` |

**Schema separation (one instance, no cross-env collisions):**

| Environment | Schema | Who uses it |
|-------------|--------|-------------|
| Production | `public` | the shipping Mac app + web production |
| Preview / internal test | `dev` | web preview deploys; use for beta/dev Mac builds |
| Local web dev | `public` on a local `supabase start` stack | web only |

- **Production Mac build → `public`.**
- **Internal/beta Mac build (optional) → `dev`** for isolated test data. Select
  the schema per request with the PostgREST profile header
  (`Accept-Profile: dev` for reads, `Content-Profile: dev` for writes), or with
  the schema option in the Supabase client.

SSL is **enforced** on the instance. The Data API is HTTPS with a publicly
trusted cert (no custom CA needed). The `Supabase Root 2021 CA` cert is only
relevant for *direct* Postgres connections (migrations/tooling), not for the app.

---

## 2. Auth model (Clerk)

Auth is **Clerk**, not Supabase Auth. Supabase is a plain database keyed on the
**Clerk user id** (`waitlist_entries.user_id`, a `user_...` string).

Clerk has two instances under one app:

| Clerk instance | Publishable key (public) | Mac build |
|----------------|--------------------------|-----------|
| **Production** (domain `whisper.corkkam.com`) | `pk_live_Y2xlcmsud2hpc3Blci5jb3Jra2FtLmNvbSQ` | shipping build |
| **Development** (`sweeping-humpback-68.clerk.accounts.dev`) | `pk_test_c3dlZXBpbmctaHVtcGJhY2stNjguY2xlcmsuYWNjb3VudHMuZGV2JA` | internal/dev build |

Use **ClerkKit** (native Swift SDK) for sign-in (Google OAuth + email OTP are
enabled). Publishable keys are safe to embed. **Secret keys / service-role key /
DB password are server-only — never put them in the app.** Get any server-side
secret from Vercel env or the dashboards, over a secure channel, not from this doc.

---

## 3. Beta vs stable release channel

Beta is **one flag on the Clerk user**, `publicMetadata.betaAccess` (boolean),
plus `betaJoinedAt` (ISO date). It is:

- granted when a waitlist member is **approved** — manually in the Clerk
  dashboard (Users → Metadata → Public), or via `lib/clerk/beta.ts` →
  `approveUser`. Joining the waitlist alone does not set it,
- **readable by the Mac app** after login (public metadata),
- writable **only** with the Clerk secret key, so it can't be spoofed client-side.

There is **no separate beta instance/account** — beta and stable users share the
Clerk production instance; flipping the flag (`setBetaAccess(userId,false)`
server-side) rolls a user beta→stable with the same login.

**Mac app usage — pick the update feed from the flag (Sparkle):**

```swift
if let user = Clerk.shared.user {
    let isBeta = (user.publicMetadata["betaAccess"] as? Bool) ?? false
    SparkleUpdater.shared.feedURL = URL(string: isBeta
        ? "https://<domain>/appcast-beta.xml"
        : "https://<domain>/appcast.xml")!
}
```

(The two appcast feeds themselves are a web/hosting task, out of scope here.)

---

## 4. How the Mac app reaches Supabase data — pick ONE

Because RLS is on with no policies, choose a path and implement it:

### Option A — Clerk as a Supabase third-party auth provider (recommended for a native client)

Let the Mac app query Supabase **directly** as the signed-in user, with RLS
scoping each user to their own rows.

1. **Supabase dashboard → Authentication → Sign In / Providers → Third-Party
   Auth → add Clerk.** Point it at the Clerk instance's domain so Supabase trusts
   Clerk-issued JWTs (validates against Clerk's JWKS).
2. **Clerk:** ensure the session token includes a `role: "authenticated"` claim
   (Clerk's Supabase integration does this) so `to authenticated` RLS applies.
3. **Add RLS policies** (currently none). Example for `public` — repeat for `dev`
   with `dev.` if beta builds use that schema:

   ```sql
   -- A user can read their own waitlist row.
   create policy "own row: select"
     on public.waitlist_entries for select
     to authenticated
     using ( user_id = auth.jwt() ->> 'sub' );

   -- (Add insert/update policies only if the app writes; keep them user-scoped.)
   ```

   `auth.jwt() ->> 'sub'` = the Clerk user id. Service-role still bypasses RLS,
   so the web backend is unaffected.
4. **Mac app (supabase-swift):** create the client with an `accessToken` closure
   that returns the Clerk session token, so every request carries the user's JWT:

   ```swift
   let supabase = SupabaseClient(
     supabaseURL: URL(string: "https://ypazgzrxkrdbnbrqgxjk.supabase.co")!,
     supabaseKey: "<anon/publishable key>",   // public client key, below
     options: .init(auth: .init(accessToken: {
       try await Clerk.shared.session?.getToken()?.jwt ?? ""
     }))
   )
   ```

   Public client key (safe to embed; useless without the policies above):
   `sb_publishable_sZ-HAWBlwB5S0etuVsxEaA_gyqc-tGe`
   (legacy anon JWT also works if the SDK version needs it — pull from the
   dashboard → Settings → API.)

### Option B — thin backend API (no client-side Supabase)

Keep Supabase strictly server-side. Add Clerk-authenticated **route handlers** to
the Next.js app (e.g. `GET /api/me/status`) that verify the Clerk session and
query Supabase with the service-role client, returning only what the Mac app
needs. The Mac app calls those endpoints with the Clerk token; it never touches
Supabase directly. More web work, but no RLS-policy or third-party-auth setup and
the service key stays fully server-side.

**Recommendation:** Option A if the Mac app needs real-time/direct data access;
Option B if it only needs a couple of read-only checks (simplest, most locked-down).

---

## 5. Schema / table reference (`public`, mirrored in `dev`)

Created by `supabase/migrations/0001_init.sql`, `0002_payment_clicks.sql`,
`0003_service_role_grants.sql`; the `dev` mirror is `supabase/dev-schema.sql`.

- **`waitlist_entries`** — one row per person. Keyed by `user_id` (Clerk id).
  Notable columns: `email`, `full_name`, `status` (`pending`→`invited`→`accepted`,
  the app-access gate), `points`, `position`, `referral_code`, `referred_by`.
- **`social_claims`** — `+25` points per network (`x`, `linkedin`), once each.
- **`referrals`** — referral attribution (one per referred user).
- **`payment_clicks`** — "skip the queue" tier click analytics.

For gating the Mac app's *access to the product*, read the user's
`waitlist_entries.status` (`accepted` = allowed). For the *update channel*, read
Clerk `publicMetadata.betaAccess`. These are two independent axes.

---

## 6. Checklist for the Mac agent

- [ ] Integrate ClerkKit; sign in with the **production** publishable key
      (`pk_live_…`); use the dev key for internal builds.
- [ ] Read `publicMetadata.betaAccess` → choose Sparkle appcast (Section 3).
- [ ] Pick Supabase access path (Section 4) and implement it:
  - Option A: enable Clerk third-party auth in Supabase, add RLS policies,
    wire supabase-swift with the Clerk token.
  - Option B: add Clerk-authed API routes on the web app; call those instead.
- [ ] Production build → `public` schema; internal/beta build → `dev` schema
      (profile header) if you want isolated test data.
- [ ] Confirm the app **never** embeds the service-role key, Clerk secret key,
      or DB password.

## 7. Security do / don't

- ✅ Embed: Clerk publishable key, Supabase anon/publishable key (public by design).
- ❌ Never embed: `SUPABASE_SERVICE_ROLE_KEY`, `CLERK_SECRET_KEY`, `POSTGRES_PASSWORD`.
- ✅ Keep RLS on; add only user-scoped policies. Service-role (server) bypasses RLS.
- ✅ `betaAccess` is writable only server-side — the Mac app reads it, never writes it.
