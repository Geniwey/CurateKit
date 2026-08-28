import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, upsertUser } from "@/lib/auth";

/**
 * GET /auth/callback — exchanges an OAuth / email-confirmation code for a
 * session, ensures the `User` row exists, then redirects to the dashboard.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const user = await getCurrentUser();
      if (user) {
        try {
          await upsertUser(user);
        } catch {
          // DB not configured — auth still works without it.
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(
      "Could not authenticate. Please try again."
    )}`
  );
}
