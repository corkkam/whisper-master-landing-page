# Security policy

This repository is the website at https://whispermaster.app: marketing pages,
downloads, sign-in, billing, the admin console, the public eval pages, and the sync
API that the Whisper Master Mac app calls.

## Report a vulnerability

Report privately. Do **not** open a public issue, pull request or discussion.

Use GitHub private vulnerability reporting: the **Security** tab of this repository,
then **Report a vulnerability**. Include the URL or route, steps to reproduce, and
the impact you expect.

We reply within 3 working days, and we keep you informed until the fix ships. We
credit you in the advisory unless you ask us not to.

## Testing rules

- Test only against your own account. Do not read, change or delete other users' data.
- No denial of service, spam, social engineering or physical attacks.
- Do not run automated scanners at volume against production.
- Stop and report as soon as you can show impact.

## In scope

- Authentication and authorization: Clerk session handling, server actions,
  `/admin` routes, beta access
- The sync API (`/api/usage`, `/api/notes`) and eval ingest
- Billing: checkout, the customer portal, the Polar webhook, entitlement grants
- Supabase row-level security and database functions in `supabase/migrations/`
- XSS, open redirects, CSRF, SSRF, and leaks of secrets or private download URLs

## Out of scope

- Publishable keys that are public by design (Clerk `pk_`, Supabase publishable or anon key)
- Missing headers or best-practice notes with no exploit path
- Rate limits on pages that are not forms or APIs
