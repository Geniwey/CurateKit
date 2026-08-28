/**
 * Prisma client (singleton).
 *
 * The client is created lazily (inside getPrisma) rather than at module load so that
 * `next build` still passes when the app is built before DATABASE_URL is configured.
 * In a real runtime environment the first query will connect to Neon.
 */
import { PrismaClient } from "@prisma/client";

// Reuse the same instance across hot-reloads in development to avoid
// exhausting database connections.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

/** Returns a shared PrismaClient, creating it on first use. */
export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createClient();
  }
  return globalForPrisma.prisma;
}

// Default export for convenience: `import prisma from "@/lib/db"`.
export default getPrisma();
