# Buyer onboarding — clone to your first content item to a live deploy

This is the guided path for a **new buyer**: from an empty folder to running the
kit locally with your own Supabase + Neon credentials, adding your first content
idea, and putting it on Vercel.

It is intentionally short and sequential. Two other docs do the heavy lifting and
are not duplicated here:

- **[`README.md`](../README.md)** — the full reference: every optional service,
  the complete project structure, and the available npm scripts.
- **[`docs/VERIFY-BUYER.md`](VERIFY-BUYER.md)** — the fresh-clone sanity check
  (no credentials needed) and its honest limits.

---

## 1. Before you start

| You need | Why | Where |
| --- | --- | --- |
| **Node.js 18.17+** (Node 20 LTS recommended) and npm | Next.js 14.2 requires 18.17+; the README states the same prerequisite. **Note:** `package.json` intentionally has no `engines` field, so nothing is pinned for you. | [nodejs.org](https://nodejs.org) (`node -v` to check) |
| A **Supabase** project (free tier is fine) | Email/password auth + sessions | [supabase.com](https://supabase.com) → New project |
| A **Neon** project (free tier is fine) | Postgres database for content items | [neon.tech](https://neon.tech) → New project |
| A **GitHub** account + **Vercel** account | Only for step 7 (deployment) | [vercel.com](https://vercel.com) |
| PostHog / Sentry | Optional — leave the keys blank and the app still runs and builds | see README §3–4 |

**What you'll have at the end:** the landing page on `http://localhost:3000`,
working signup → login → protected dashboard, content ideas saved to *your* Neon
database and moved through `DRAFT → SCRIPTED → RECORDED`, and the same app
deployed on a public Vercel URL.

---

## 2. Clone + install

```bash
git clone <your-kit-repo-url> curatekit
cd curatekit
npm install
```

`npm install` installs everything and generates the Prisma client (the
`@prisma/client` package runs `prisma generate` on install). If you later edit
`prisma/schema.prisma`, regenerate on demand with `npm run db:generate`.

**Sanity gate — do this now, before configuring anything.** With no `.env` and no
database, this must pass:

```bash
npm test        # 24 tests (13 items CRUD + 11 auth), mocked Supabase/Prisma
npm run build   # production build, exit 0
```

It proves the code you bought installs, builds, and behaves (auth redirects,
route guards, validation, user-scoping). For the exact expected output and, more
importantly, **what it does not prove**, read
[`docs/VERIFY-BUYER.md`](VERIFY-BUYER.md) — don't skip the "Honest limits"
section there.

---

## 3. Configure `.env`

```bash
cp .env.example .env
```

`.env` is listed in `.gitignore` — keep it out of version control. Fill in the
four required values; the names come from `.env.example` and match what the app
reads:

| Variable | Copy it from | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → **Project Settings → API** → **Project URL** | Looks like `https://xxxxxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → **Project Settings → API** → **Project API keys** → `anon` / `public` | The *anon* key, not `service_role` |
| `DATABASE_URL` | Neon → your project → **Connection Details** → **Pooled connection** | Host contains `-pooler`, string ends `?pgbouncer=true`. This is what the running app uses. |
| `DIRECT_URL` | Neon → your project → **Connection Details** → **Direct connection** | Same branch, plain host (no `-pooler`, no `pgbouncer`). Prisma CLI uses it for migrations/Studio. |

PostHog and Sentry (`NEXT_PUBLIC_POSTHOG_KEY`, `SENTRY_DSN`, …) are optional and
safe to leave empty — the README explains where each one comes from.

Before you move on: in Supabase → **Authentication → URL Configuration**, set the
**Site URL** to `http://localhost:3000` and add
`http://localhost:3000/auth/callback` as an **Additional Redirect URL**, so email
confirmation and OAuth land back in your app. New Supabase projects have *Confirm
email* on by default; README §1 shows how to turn it off if you want instant
signups.

---

## 4. Create the database tables

This kit ships a **committed migration**
(`prisma/migrations/20250101000000_init`), so apply it rather than generating a
new one:

```bash
npx prisma migrate deploy
```

`migrate deploy` applies the migrations already in the repo and records them —
that's the correct command for a fresh database, and it's the same command to run
again in production later. Prisma CLI reads `DIRECT_URL` (the unpooled string) by
design.

**Alternative, if you'd rather not keep migration history** (this is the README's
option B — pick one approach and stay with it):

```bash
npm run db:push          # == npx prisma db push
```

### What this creates in your Neon database

| Object | Contents |
| --- | --- |
| `users` table | `id` (text, primary key — **this is the Supabase auth user id**), `email` (unique), `name` (nullable), `created_at` |
| `content_items` table | `id` (cuid text, primary key), `title`, `source_url` (nullable), `status`, `owner_id`, `created_at` |
| `ContentStatus` enum | `DRAFT`, `SCRIPTED`, `RECORDED` — `status` defaults to `DRAFT` |
| FK + index | `content_items.owner_id → users.id` with `ON DELETE CASCADE`, plus an index on `owner_id` |

Inspect the tables with `npm run db:studio` (Prisma Studio) whenever you want.

---

## 5. First run

```bash
npm run dev
```

Open **http://localhost:3000**.

**What you should see, in order:**

1. **Landing page** (`app/page.tsx`) — hero *"Curate news. Ship short-form
   scripts. On repeat."* with **Get started** / **Start curating** buttons and an
   *"I already have an account"* link.
2. **Signup** (`/signup`) — email + password form (password minimum 6 characters).
   Submitting posts to `/auth/signup`:
   - **Confirm email ON** (Supabase default) → you land on `/login` with
     *"Account created! Check your email to confirm your signup."* Click the link
     in the email; it returns via `/auth/callback` and signs you in.
   - **Confirm email OFF** → you go straight to `/dashboard`.
3. **Login** (`/login`) — posts to `/auth/login`, sets the Supabase session
   cookie, redirects to `/dashboard`. A wrong password bounces back to
   `/login?error=…` with the message shown.
4. **Protected dashboard** (`/dashboard`) — `app/dashboard/layout.tsx` checks the
   session; if you visit `/dashboard` in a private window you are redirected to
   `/login`. A successful session shows the header with your email and a **Log
   out** button, plus the *Content Ideas* table.

> **Honest note:** step 5 only works with *your real* `.env` values from step 3.
> The automated tests from step 2 mock Supabase and Prisma, so they verify the
> code's behaviour, **not** your live wiring — that verification is yours to do
> here. If signup fails, re-check the Site URL/redirect settings above and that
> `NEXT_PUBLIC_SUPABASE_ANON_KEY` is the `anon` key. If the table shows *"No
> content ideas yet"* but adding fails, the most common cause is a missing or
> wrong `DATABASE_URL`/`DIRECT_URL` — see the notes at the end of
> [`docs/VERIFY-BUYER.md`](VERIFY-BUYER.md).

---

## 6. Your first content item

1. Sign in and go to `/dashboard` → **Content Ideas**.
2. In the add form, type a **New content idea** (e.g. `AI news roundup for this
   week`) and optionally a **Source URL**, then click **Add idea**. This is a
   `POST /api/items`.
3. The row appears at the top of the table with status **DRAFT** (the list is
   ordered newest first) and today's date.
4. Use the **status dropdown** on the row to move the item along — that's a
   `PATCH /api/items/<id>` — or **Delete** to remove it.
5. Reload the page: the item is still there, because it lives in your Neon
   database, not in browser state.

### What the pipeline means for a content business

| Status | Meaning in practice |
| --- | --- |
| `DRAFT` | You curated a story/idea worth covering, but haven't written anything yet. This is your inbox. |
| `SCRIPTED` | You've written the hook, beats and CTA — it's ready to film. |
| `RECORDED` | Shot, edited or published. Kept for tracking and for the archive. |

Every item is **private to its owner**: `owner_id` is set to your Supabase user id
on create, and `GET/PATCH/DELETE` only ever touch rows where `owner_id` matches
the signed-in user — another account's item returns `404`, never data.

---

## 7. Deploy to Vercel

1. **Push the repo to GitHub** (your own copy).
2. Go to [vercel.com/new](https://vercel.com/new), import that repository, and
   accept the defaults: framework preset **Next.js**, install `npm install`,
   build `npm run build`.
3. **Project → Settings → Environment Variables** — add the same keys from step 3
   with scope **Production**:

   | Variable | Public or secret? |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Public by design — the `NEXT_PUBLIC_` prefix ships it to the browser. Safe to expose; it's just your project URL. |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public by design in the same sense: it's Supabase's browser-safe key and is protected by Row Level Security on Supabase's side. Never use the `service_role` key here. |
   | `DATABASE_URL` | **Secret.** Server-only; contains your database password. Never prefix it with `NEXT_PUBLIC_`. |
   | `DIRECT_URL` | **Secret.** Server/CLI-only; same password. |
   | PostHog / Sentry keys | Optional; may be public (`NEXT_PUBLIC_*`) or secret (`SENTRY_DSN`) as documented in the README. |

4. **Apply the migration to the production database.** The deploy build does
   *not* run migrations. From your machine, with the production Neon
   `DIRECT_URL` in `.env`, run `npx prisma migrate deploy` once (you can point it
   at the same Neon branch your production app uses). If you can't run Node
   locally, run the SQL from `prisma/migrations/20250101000000_init/migration.sql`
   in Neon's SQL editor instead.
5. **Back in Supabase → Authentication → URL Configuration**: set **Site URL** to
   your Vercel domain and add `https://<your-domain>/auth/callback` to the
   redirect URLs, otherwise confirmation emails will point at `localhost`.

More detail (including the Sentry build-plugin note) is in README's *Deployment
to Vercel* section.

---

## 8. Next steps / customization pointers

- **Restyle the landing page** — `app/page.tsx` is a single Tailwind file; change
  the copy and colors there. Global styles are `app/globals.css`,
  `tailwind.config.ts` holds the theme.
- **Add a field to content items** — add it to `ContentItem` in
  `prisma/schema.prisma`, then `npx prisma migrate dev --name add_<field>` for a
  new recorded migration (or `npm run db:push` if you chose the no-history
  route). Then surface it in three places: the DTO in `lib/types.ts`, the mapping
  in `app/api/items/route.ts` (+ `app/api/items/[id]/route.ts` for updates), and
  the form/table in `components/ContentIdeasTable.tsx`.
- **Extend the pipeline** — add a value to the `ContentStatus` enum in
  `prisma/schema.prisma` (migrate it), then add it to `CONTENT_STATUSES` in
  `lib/types.ts` and to `STATUS_STYLES` in `components/ContentIdeasTable.tsx` so
  it gets a colour and appears in the dropdown.
- **Add your own tests** — `tests/` uses Vitest with in-memory Supabase/Prisma
  fakes (see `tests/helpers.ts`); `npm test` runs them all. Keeping this suite
  green is the fastest way to know a change didn't break the auth or CRUD
  contracts.
- **Orientation** — README's *Project structure* section lists every file and how
  auth, the data model, and the API-driven table fit together.

> **Honest scope note:** this guide describes the code paths in the repository you
> bought. It was written from the source, `prisma/schema.prisma` and the committed
> migration — the kit's automated tests run against mocked Supabase/Prisma, so your
> own Supabase + Neon wiring (steps 5–7) is the part you confirm yourself in a
> browser, exactly as `docs/VERIFY-BUYER.md` describes.
