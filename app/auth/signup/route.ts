import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, upsertUser } from "@/lib/auth";

/**
 * POST /auth/signup — creates a new Supabase account.
 *
 * - If email confirmation is disabled, a session is returned immediately and we
 *   redirect straight to the dashboard.
 * - If email confirmation is enabled, the user must click the link we send; we
 *   redirect them to the login page with a "check your email" notice.
 */
export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${new URL(request.url).origin}/auth/callback`,
    },
  });

  if (error) {
    return NextResponse.redirect(
      new URL(`/signup?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }

  // If a session was returned the account was created & confirmed automatically.
  if (data.session) {
    const user = await getCurrentUser();
    if (user) {
      try {
        await upsertUser(user);
      } catch {
        // DB not configured — auth still works without it.
      }
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Email confirmation enabled — tell the user to confirm before logging in.
  return NextResponse.redirect(
    new URL(
      "/login?message=Account created! Check your email to confirm your signup.",
      request.url
    )
  );
}
