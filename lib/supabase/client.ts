/**
 * Browser (client-side) Supabase client.
 *
 * Use this only from Client Components. Server code must use
 * `@/lib/supabase/server` which reads cookies from the request.
 */
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
