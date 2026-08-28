import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, upsertUser } from "@/lib/auth";

/**
 * POST /auth/login — signs the user in with email + password and redirects.
 * On success the Supabase session cookie is set and we also ensure a matching
 * `User` row exists in the database (keyed on the Supabase user id).
 */
export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }

  const user = await getCurrentUser();
  if (user) {
    try {
      await upsertUser(user);
    } catch {
      // DB not configured (no DATABASE_URL) — auth still works without it.
    }
  }

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
