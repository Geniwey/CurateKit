import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Buyer-verification test config.
 *
 * Only `tests/` is included; the tests mock Supabase + Prisma with
 * hand-rolled fixtures, so they run with NO env vars and NO database.
 * `@/*` mirrors the tsconfig path alias used by the app code.
 */
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
