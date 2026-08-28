import { Suspense } from "react";
import Link from "next/link";
import { SignupForm } from "@/components/AuthForms";

export const metadata = { title: "Sign up" };

/**
 * Signup page. The form lives behind a <Suspense> boundary because it reads
 * the ?error= query parameter with useSearchParams().
 */
export default function SignupPage() {
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
        <SignupForm />
      </Suspense>
    </main>
  );
}
