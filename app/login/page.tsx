import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/AuthForms";

export const metadata = { title: "Log in" };

/**
 * Login page. The form lives behind a <Suspense> boundary because it reads
 * the ?error= / ?message= query parameters with useSearchParams().
 */
export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <Link href="/" className="mb-8 text-lg font-semibold tracking-tight">
        CurateKit
      </Link>
      <Suspense
        fallback={
          <div className="w-full max-w-sm text-sm text-slate-400">Loading…</div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
