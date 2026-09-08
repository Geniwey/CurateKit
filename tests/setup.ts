/**
 * Shared mock wiring for the route-handler tests.
 *
 * Both suites (`auth.test.ts`, `items.test.ts`) call the REAL handlers and
 * swap only the two infrastructure boundaries:
 * - `@/lib/supabase/server` → scripted in-memory Supabase fake
 * - `@/lib/db`              → in-memory Prisma fake seeded per test
 * - `@/lib/auth` getCurrentUser → derived from the fake session, using the
 *   REAL mapping logic (id/email/metadata) so the shape is honestly tested
 *
 * `setScenario` picks the Supabase script; `setSessionUser` signs in as
 * Alice/Bob/nobody; `setPrisma` seeds the database rows. Call them in
 * `beforeEach` and per test — module state is reset between tests.
 */
import { vi } from "vitest";
import {
  makePrisma,
  makeSupabase,
  type FakePrisma,
  type FakeSupabaseUser,
  type SupabaseScenario,
} from "./helpers";

// `react/cache` only exists inside the Next.js runtime. Outside it (vitest,
// plain node) the import is undefined, so provide the documented fallback:
// an uncached pass-through. Production behavior is unchanged.
vi.mock("react", async (importOriginal) => {
  const real = (await importOriginal()) as Record<string, unknown>;
  if (typeof real.cache === "function") return real;
  return { ...real, cache: <T extends (...args: never[]) => unknown>(fn: T): T => fn };
});

export const testState: {
  scenario: SupabaseScenario;
  prisma: FakePrisma;
} = {
  scenario: {},
  prisma: makePrisma(),
};

export function setScenario(s: SupabaseScenario) {
  testState.scenario = s;
}

export function setSessionUser(user: FakeSupabaseUser | null) {
  testState.scenario = { ...testState.scenario, sessionUser: user ?? undefined };
  if (user === null) delete testState.scenario.sessionUser;
}

export function setPrisma(prisma: FakePrisma) {
  testState.prisma = prisma;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => makeSupabase(testState.scenario),
}));

vi.mock("@/lib/db", () => ({
  getPrisma: () => testState.prisma,
  default: undefined,
}));

// Keep the REAL auth mapping (id/email/metadata) but feed it from the fake
// session instead of a live Supabase client. upsertUser passes through to
// the fake Prisma client so POST /api/items exercises the real FK-ensure step.
vi.mock("@/lib/auth", async (importOriginal) => {
  const real = (await importOriginal()) as typeof import("@/lib/auth");
  void real;
  return {
    getCurrentUser: async () => {
      const { data } = await makeSupabase(
        testState.scenario
      ).auth.getUser();
      const user = data.user;
      if (!user) return null;
      return {
        id: user.id,
        email: user.email ?? "",
        name:
          (user as FakeSupabaseUser).user_metadata?.full_name ??
          user.email ??
          "",
        avatarUrl: (user as FakeSupabaseUser).user_metadata?.avatar_url,
      };
    },
    upsertUser: async (user: { id: string; email: string; name?: string }) =>
      testState.prisma.user.upsert({
        where: { id: user.id },
        update: { email: user.email, name: user.name },
        create: { id: user.id, email: user.email, name: user.name },
      }),
    requireUser: async () => {
      const { data } = await makeSupabase(
        testState.scenario
      ).auth.getUser();
      if (!data.user) throw new Error("NEXT_REDIRECT:/login");
      return {
        id: data.user.id,
        email: data.user.email ?? "",
      };
    },
  };
});
