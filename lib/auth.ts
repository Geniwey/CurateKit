/**
 * Server-side auth helpers built on Supabase.
 *
 * These helpers are used by Server Components, Route Handlers and Server
 * Actions to resolve the current user and to enforce route protection.
 */
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { getPrisma } from "@/lib/db";

export type SessionUser = {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
};

/**
 * Resolve the authenticated Supabase user.
 * Returns `null` when there is no session. Wrapped in React `cache` so
 * repeated calls within one request reuse the same result.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return {
    id: user.id,
    email: user.email ?? "",
    name: user.user_metadata?.full_name ?? user.email ?? "",
    avatarUrl: user.user_metadata?.avatar_url,
  };
});

/**
 * Ensure a matching `User` row exists in the database for the given Supabase
 * user. We key our `User` table on the Supabase user id so ownership stays in
 * sync with the auth provider. Safe to call on every login/signup.
 */
export async function upsertUser(user: SessionUser) {
  const prisma = getPrisma();
  return prisma.user.upsert({
    where: { id: user.id },
    update: { email: user.email, name: user.name },
    create: { id: user.id, email: user.email, name: user.name },
  });
}

/**
 * Require an authenticated user for a protected page.
 * Redirects to /login when the visitor is not signed in.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
