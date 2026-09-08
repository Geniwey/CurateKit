# Verify your copy (buyer fresh-clone check)

Bought CurateKit? Prove to yourself it's production-ready before you wire up
any credentials. These three commands run on a **fresh clone with NO `.env`
and NO database** — the test suite mocks Supabase + Prisma with tiny
in-memory fakes, so nothing touches the network.

```bash
npm install   # 1. install (also generates the Prisma client)
npm test      # 2. run the buyer-verification suite (no env vars needed)
npm run build # 3. production build (passes with no credentials configured)
```

## What success looks like

- `npm test` → `Test Files  2 passed (2)` / `Tests  24 passed (24)`, exit 0.
  - `tests/auth.test.ts` (11 tests) — login lands on `/dashboard`, bad
    passwords bounce to `/login?error=`, instant vs. email-confirm signups
    redirect correctly, logout lands on `/`, OAuth callback handles
    valid/missing/bad codes, anonymous visitors are sent to `/login`.
  - `tests/items.test.ts` (13 tests) — GET lists only the caller's rows
    (newest first), POST creates DRAFT items (201) and rejects blank titles
    (400), PATCH walks `DRAFT → SCRIPTED → RECORDED` and rejects anything
    outside the enum, cross-user PATCH/DELETE return 404 without touching the
    row, anonymous callers get 401 everywhere.
- `npm run build` → `✓ Compiled successfully`, exit 0 — the app builds
  without Supabase/Neon credentials because the Prisma client is created
  lazily (see `lib/db.ts`).

## Honest limits (read before deploying)

These checks verify the **code you bought**: auth redirects, route guards,
validation, user-scoping, and that the kit installs and builds cleanly.
They do NOT verify **your infrastructure**. After `.env` setup, confirm the
live wiring yourself:

1. Fill in `.env` from `.env.example` (Supabase URL + anon key, Neon pooled
   `DATABASE_URL` + direct `DIRECT_URL`).
2. Create the tables: `npx prisma migrate deploy` (or `npx prisma db push`).
3. `npm run dev` → sign up → add an idea → move it Draft → Scripted →
   Recorded. If that loop works, your Supabase + Neon wiring is live.

PostHog and Sentry are optional — the app runs and builds fine with their
keys left blank.
