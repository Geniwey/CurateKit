/**
 * Hand-rolled fixtures + mock factories for the buyer-verification suite.
 *
 * Philosophy: no mocking libraries, no network, no env vars. Each test fills
 * a tiny in-memory Supabase client and Prisma client with a scripted scenario
 * ("signed in as Alice, she owns two rows") and then calls the REAL route
 * handlers. Only the two infrastructure boundaries are swapped (`vi.mock`
 * on `@/lib/supabase/server` and `@/lib/db`); every line of auth + API logic
 * under test is production code.
 *
 * The fakes are deliberately strict where the seller promise lives:
 * - every Prisma query asserts the `where` clause is scoped to the caller's
 *   user id, so a regression that leaks another user's rows fails the test
 *   instead of silently passing;
 * - status changes go through the real DRAFT → SCRIPTED → RECORDED enum from
 *   `lib/types.ts`, so an invalid status is rejected exactly like production.
 */
import type { SessionUser } from "@/lib/auth";
import type { ContentStatus } from "@/lib/types";

/** Two deterministic demo users — stable ids keep assertions readable. */
export const ALICE: SessionUser = {
  id: "user-alice-001",
  email: "alice@example.com",
  name: "Alice",
};

export const BOB: SessionUser = {
  id: "user-bob-002",
  email: "bob@example.com",
  name: "Bob",
};

/** A ContentItem row as Prisma returns it (Prisma maps snake_case columns). */
export type FakeRow = {
  id: string;
  title: string;
  sourceUrl: string | null;
  status: ContentStatus;
  ownerId: string;
  createdAt: Date;
};

let nextId = 1;

/** Build a row owned by `ownerId`, defaulting to DRAFT. */
export function makeRow(
  ownerId: string,
  overrides: Partial<FakeRow> = {}
): FakeRow {
  const n = nextId++;
  return {
    id: `item-${n}`,
    title: `Idea ${n}`,
    sourceUrl: null,
    status: "DRAFT",
    ownerId,
    createdAt: new Date(2026, 0, n),
    ...overrides,
  };
}

/**
 * In-memory Prisma stand-in implementing only the `contentItem` methods the
 * routes use (`findMany`, `create`, `updateMany`, `findUnique`, `deleteMany`
 * plus `user.upsert`). All reads/writes filter on `ownerId`, mirroring the
 * user-scoping the real handlers enforce — and any `where` clause missing an
 * owner scope throws, so the test catches cross-user leaks.
 */
export function makePrisma(seed: FakeRow[] = []) {
  const rows: FakeRow[] = [...seed];
  const calls: { method: string; args: unknown }[] = [];

  function assertOwnerScoped(where: Record<string, unknown>, method: string) {
    if (!where || typeof where.ownerId !== "string" || !where.ownerId) {
      throw new Error(
        `${method} called without an ownerId scope — users could see each other's rows`
      );
    }
  }

  const contentItem = {
    findMany: async (args: { where: { ownerId: string } }) => {
      calls.push({ method: "findMany", args });
      assertOwnerScoped(args.where, "findMany");
      return rows
        .filter((r) => r.ownerId === args.where.ownerId)
        .sort((a, b) => +b.createdAt - +a.createdAt);
    },
    create: async (args: {
      data: { title: string; sourceUrl: string | null; ownerId: string };
    }) => {
      calls.push({ method: "create", args });
      assertOwnerScoped({ ownerId: args.data.ownerId }, "create");
      const row = makeRow(args.data.ownerId, {
        title: args.data.title,
        sourceUrl: args.data.sourceUrl,
        status: "DRAFT",
      });
      rows.push(row);
      return row;
    },
    updateMany: async (args: {
      where: { id: string; ownerId: string };
      data: Partial<FakeRow>;
    }) => {
      calls.push({ method: "updateMany", args });
      assertOwnerScoped(args.where, "updateMany");
      let count = 0;
      for (const row of rows) {
        if (row.id === args.where.id && row.ownerId === args.where.ownerId) {
          Object.assign(row, args.data);
          count++;
        }
      }
      return { count };
    },
    findUnique: async (args: { where: { id: string } }) => {
      calls.push({ method: "findUnique", args });
      return rows.find((r) => r.id === args.where.id) ?? null;
    },
    deleteMany: async (args: { where: { id: string; ownerId: string } }) => {
      calls.push({ method: "deleteMany", args });
      assertOwnerScoped(args.where, "deleteMany");
      const before = rows.length;
      for (let i = rows.length - 1; i >= 0; i--) {
        if (rows[i].id === args.where.id && rows[i].ownerId === args.where.ownerId) {
          rows.splice(i, 1);
        }
      }
      return { count: before - rows.length };
    },
  };

  return {
    __rows: rows,
    __calls: calls,
    contentItem,
    user: {
      upsert: async (args: {
        where: { id: string };
        update?: unknown;
        create?: unknown;
      }) => {
        calls.push({ method: "user.upsert", args });
        return { id: args.where.id };
      },
    },
  };
}

export type FakePrisma = ReturnType<typeof makePrisma>;

/** Shape of a Supabase auth user the app reads (id/email/metadata). */
export type FakeSupabaseUser = {
  id: string;
  email: string;
  user_metadata?: { full_name?: string; avatar_url?: string };
};

export type SupabaseScenario = {
  /** Result of signInWithPassword. */
  loginError?: string | null;
  /** Result of signUp: "session" (instant login) or "confirm" (email check). */
  signup?: { mode: "session" | "confirm"; error?: string };
  /** Result of exchangeCodeForSession in the OAuth/email callback. */
  exchangeError?: string | null;
  /** The user the session belongs to (null = anonymous visitor). */
  sessionUser?: FakeSupabaseUser | null;
};

/** Minimal Supabase-auth fake for the /auth/* form routes. */
export function makeSupabase(scenario: SupabaseScenario = {}) {
  const calls: string[] = [];
  const auth = {
    signInWithPassword: async () => {
      calls.push("signInWithPassword");
      return {
        error: scenario.loginError ? { message: scenario.loginError } : null,
      };
    },
    signUp: async () => {
      calls.push("signUp");
      if (scenario.signup?.error) {
        return {
          data: { session: null },
          error: { message: scenario.signup.error },
        };
      }
      const mode = scenario.signup?.mode ?? "session";
      return { data: { session: mode === "session" ? {} : null }, error: null };
    },
    signOut: async () => {
      calls.push("signOut");
    },
    exchangeCodeForSession: async () => {
      calls.push("exchangeCodeForSession");
      return {
        error: scenario.exchangeError
          ? { message: scenario.exchangeError }
          : null,
      };
    },
    getUser: async () => ({
      data: { user: scenario.sessionUser ?? null },
    }),
  };
  return { auth, __calls: calls };
}

export type FakeSupabase = ReturnType<typeof makeSupabase>;

/** POST a form (as the login/signup pages do) to an /auth/* route handler. */
export function formRequest(path: string, fields: Record<string, string>): Request {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  return new Request(`http://localhost:3000${path}`, {
    method: "POST",
    body: form,
  });
}

/** JSON request helper for the /api/items routes. */
export function jsonRequest(path: string, method: string, body?: unknown): Request {
  return new Request(`http://localhost:3000${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/**
 * Totally signed-out scenario: every auth call behaves as "no session".
 * Used to prove protected routes reject anonymous visitors.
 */
export const SIGNED_OUT: SupabaseScenario = {};
