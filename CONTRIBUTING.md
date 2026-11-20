# Contributing

Thanks for helping. Read [`AGENTS.md`](AGENTS.md) first: it holds the hard security
rules for this site. Security bugs go through [`SECURITY.md`](SECURITY.md), never a
public issue.

## Workflow

1. Fork, then branch off `dev` as `feature/<short-name>` or `bug/<short-name>`.
2. Use `pnpm`. Copy `.env.local.example` to `.env.local` and use your own Clerk
   development instance and a local Supabase (`supabase start`).
3. Before you open the PR, run:

   ```bash
   pnpm install
   pnpm exec tsc --noEmit
   pnpm build
   ```

4. Open the PR against `dev`. Say what changed, why, and how you tested it. Add a
   screenshot for a UI change.

## Rules

- Every export from a `"use server"` file is a public endpoint. It must check the
  session itself.
- Never commit a secret, key, token or `.env` file.
- Do not weaken an auth check, the webhook signature check or any test.

## License

This project is licensed under the [GNU AGPL-3.0](LICENSE). By opening a pull
request you agree that your contribution is licensed under the same terms.
