# CurateKit

**A production-ready Micro-SaaS starter kit for content creators.** Curate news,
manage short-form video scripts, and move ideas through a clean
`Draft → Scripted → Recorded` pipeline — all from a minimalist dashboard.

Built to be sold and extended, CurateKit wires the boring-but-essential parts of a
SaaS so you can ship a product instead of boilerplate:

| Area | Tech |
| ---- | ---- |
| Framework | Next.js 14 (App Router) + React + TypeScript + Tailwind CSS |
| Auth | Supabase Auth (email/password, OAuth-ready) |
| Database | Neon (Serverless Postgres) via Prisma ORM |
| Analytics | PostHog |
| Error monitoring | Sentry |
| Deployment | Vercel |

Once you fill in `.env` (see *Quick start*) the kit runs end-to-end as-is — no
code to write. **Supabase (Auth) and Neon (Postgres) are required**; PostHog and
Sentry are optional, and the app runs and builds fine when their environment
variables are empty.

---

## Quick start

> **Prerequisites:** Node.js 18.17+ (Node 20 LTS recommended) and npm.

> **Required to run end-to-end:** Supabase (auth) + Neon (database). PostHog and
> Sentry are optional — see the setup guides below.

```bash
# 1. Install dependencies
npm install

# 2. Copy the example env and fill it in (see setup guides below)
cp .env.example .env

# 3. Create the database tables in Neon (see "Database setup")
npx prisma migrate dev --name init   # or: npx prisma db push

# 4. Run the dev server
npm run dev
```

Open http://localhost:3000 — you can sign up, log in, and the dashboard will be
empty until you add your first content idea.

---

## 1. Supabase Auth — get the keys

1. Go to [supabase.com](https://supabase.com) → **New project** (free tier is fine).
2. When the project is ready, open **Project Settings → API** (or the **API** link in
   the left sidebar).
3. Copy two values into `.env`:
   - **`NEXT_PUBLIC_SUPABASE_URL`** ← the **Project URL** (e.g. `https://xyzcompany.supabase.co`)
   - **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** ← the **`anon` / `public`** Project API key
4. (Recommended) In **Authentication → URL Configuration**, set the Site URL to
   `http://localhost:3000` for local dev and your Vercel URL for production. Add
   `http://localhost:3000/auth/callback` as an **Additional Redirect URL** so email
   confirmation / OAuth works.
5. (Optional) **Authentication → Sign In / Providers** — email/password is enabled
   by default. Turn off "Confirm email" if you want instant signups without a
   confirmation link.

The starter kit calls `/auth/callback` to exchange confirmation/OAuth codes for a
session and creates/updates the matching `User` row in your database automatically.

---

## 2. Neon (Postgres) — get the database URL

1. Go to [neon.tech](https://neon.tech) → **New project** (free tier is fine).
2. Open your project → **Connection Details** (top-right).
3. You need **two** connection strings for the same branch:
   - **Pooled connection** — the one with `-pooler` in the host and
     `?pgbouncer=true`. This is what the running app uses.
     Put it in **`DATABASE_URL`**.
   - **Direct connection** — the plain one without `-pooler`/`pgbouncer`. Prisma
     uses this for migrations and Studio. Put it in **`DIRECT_URL`**.

> Both strings use your database user password. They look like:
> ```
> DATABASE_URL=postgresql://neondb_owner:password@ep-abc123-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true
> DIRECT_URL=postgresql://neondb_owner:password@ep-abc123.us-east-2.aws.neon.tech/neondb?sslmode=require
> ```

### Database setup (create the tables)

Pick **one** of these approaches:

**A. Use the committed migration (recommended, tracks schema history):**
```bash
npx prisma migrate dev --name init   # local, applies + saves the migration
# or on a fresh deploy:
npx prisma migrate deploy            # only applies existing migrations
```

**B. Sync the schema directly (no migration history):**
```bash
npx prisma db push
```

Both create two tables (`users`, `content_items`) and the `ContentStatus` enum in your
Neon database. Verify with `npx prisma studio`.

> Prisma needs the Prisma engine binaries on first run; `npm install` already ran
> `prisma generate`, so the client is ready.

---

## 3. PostHog analytics (optional)

1. Go to [posthog.com](https://posthog.com) → **Create a project** (free tier).
2. Open **Project Settings → Project API Key** (or the onboarding "Install" step).
3. Copy the **Project API key** (starts with `phc_`) into `.env`:
   - **`NEXT_PUBLIC_POSTHOG_KEY`** ← the `phc_...` key
   - **`NEXT_PUBLIC_POSTHOG_HOST`** ← your ingestion host (default
     `https://us.i.posthog.com` is fine for EU/US default regions)

The app auto-tracks **pageviews** and is set up for custom **events** (see
`lib/analytics.ts` and `components/PostHogProvider.tsx`). If you leave the key empty,
analytics is silently disabled.

---

## 4. Sentry error monitoring (optional)

1. Go to [sentry.io](https://sentry.io) → **Create a project** → choose **Next.js**.
2. Copy the **DSN** from **Project Settings → Client Keys (DSN)**. It looks like
   `https://xxxx@o123.ingest.sentry.io/1234`.
3. Put that same DSN in both env vars:
   - **`SENTRY_DSN`** — server runtime (via `instrumentation.ts`)
   - **`NEXT_PUBLIC_SENTRY_DSN`** — browser (via `sentry.client.config.ts`)

If the DSN is empty the build skips the Sentry webpack plugin and no events are
captured — safe to ship without it.

---

## Deployment to Vercel

1. Push this repo to GitHub and import it in [vercel.com](https://vercel.com/new).
2. Under **Project → Settings → Environment Variables**, add **all** variables from
   `.env.example` (scope: *Production*):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `DATABASE_URL` (Neon pooled string), `DIRECT_URL` (Neon direct string)
   - `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` (optional)
   - `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` (optional)
3. Add the build commands / settings — defaults work:
   - Framework preset: **Next.js**
   - Build command: `npm run build` (leave default)
   - Install command: `npm install` (leave default)
4. **Seed the database** on Vercel by running the migration in a one-off: on Neon,
   `prisma migrate deploy` against a direct URL, or run it locally against the same
   `DATABASE_URL`. The starter does not run migrations inside the deploy build
   (migrations need `DIRECT_URL` and a live connection, which Vercel builds can't
   reliably reach).
5. Back in Supabase, set the production **Site URL** / **Additional Redirect URLs**
   to your deployed domain.

> **Important:** Vercel runs `npm install`, which triggers `prisma generate` via the
> `postinstall`-style flow only if configured. Here we run generate explicitly —
> see `npm run db:generate`. If you add `prisma` as a normal dependency the engine
> binaries are bundled for you automatically.

---

## Project structure

Everything is organised to be read and extended:

```
curatekit/
├── app/                        # Next.js App Router
│   ├── layout.tsx              #   root layout (fonts, PostHog, Sentry)
│   ├── page.tsx                #   landing page / hero
│   ├── login/page.tsx          #   login form
│   ├── signup/page.tsx         #   signup form
│   ├── dashboard/
│   │   ├── layout.tsx          #   protected layout (redirects to /login)
│   │   └── page.tsx            #   Content Ideas dashboard (server-fetched)
│   ├── auth/
│   │   ├── login/route.ts      #   POST login (sets session, upserts User)
│   │   ├── signup/route.ts     #   POST signup
│   │   ├── logout/route.ts     #   POST logout
│   │   └── callback/route.ts   #   GET OAuth / email-confirmation callback
│   └── api/
│       └── items/
│           ├── route.ts        #   GET list, POST create (auth-scoped)
│           └── [id]/route.ts   #   PATCH update, DELETE (auth-scoped)
├── components/
│   ├── PostHogProvider.tsx     #   client analytics provider + pageviews
│   ├── ContentIdeasTable.tsx   #   API-driven data table (add/edit/delete)
│   └── LogoutButton.tsx
├── lib/
│   ├── db.ts                   #   Prisma Client singleton
│   ├── auth.ts                 #   getCurrentUser / requireUser / upsertUser
│   ├── analytics.ts            #   PostHog helpers (inert without key)
│   ├── types.ts                #   shared API/DTO types
│   └── supabase/
│       ├── server.ts           #   server Supabase client (request cookies)
│       └── client.ts           #   browser Supabase client
├── prisma/
│   ├── schema.prisma           #   User + ContentItem models (Neon config)
│   └── migrations/             #   committed SQL migrations
├── instrumentation.ts          #   Sentry server init (inert without DSN)
├── sentry.client.config.ts     #   Sentry browser init (inert without DSN)
├── next.config.mjs             #   Next + conditional Sentry plugin
└── .env.example                #   template for all secrets
```

### How the pieces fit together

- **Auth flow** — forms POST to `/auth/*` route handlers, which use the server
  Supabase client. On success the handler redirects to `/dashboard` and upserts the
  `User` row (keyed on the Supabase user id) so ownership stays in sync. The
  `/dashboard/layout.tsx` guards the route and redirects anonymous visitors to
  `/login`.
- **Data model** — `ContentItem` belongs to a `User` via `ownerId` (FK, cascade
  delete). Every API route scope queries to the authenticated user's id, so users
  can never read or mutate each other's rows.
- **API-driven table** — the dashboard seeds the table server-side, then the client
  component drives all mutations through `/api/items` and `/api/items/[id]`.

---

## Available scripts

| Command | What it does |
| ------- | ------------ |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (must pass before deploying) |
| `npm start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run db:generate` | Regenerate the Prisma client from the schema |
| `npm run db:migrate` | Apply & record a new migration (`prisma migrate dev`) |
| `npm run db:push` | Push schema changes directly to the database |
| `npm run db:studio` | Open Prisma Studio to browse/edit data |

---

## License

This project is a starter kit intended to be purchased and customized by its owner.
See your marketplace license terms.
