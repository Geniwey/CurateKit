import Link from "next/link";

/**
 * Landing page — a minimalist, high-converting hero for the
 * "Content Curation Dashboard".
 */
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col">
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          CurateKit
        </Link>
        <div className="flex items-center gap-4 text-sm font-medium">
          <Link href="/login" className="text-slate-600 hover:text-slate-900 transition">
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-700 transition"
          >
            Get started
          </Link>
        </div>
      </nav>

      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <span className="mb-6 rounded-full bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-600">
          The content creator&apos;s command center
        </span>

        <h1 className="max-w-3xl text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
          Curate news. Ship short-form scripts.{" "}
          <span className="text-indigo-600">On repeat.</span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-slate-600">
          CurateKit is a content curation dashboard that turns a firehose of
          news into a clean, actionable pipeline of video ideas — so you can
          plan, script, and record without the chaos.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/signup"
            className="rounded-lg bg-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-sm hover:bg-indigo-500 transition"
          >
            Start curating — it&apos;s free
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-slate-300 bg-white px-8 py-4 text-lg font-semibold text-slate-700 hover:border-slate-400 transition"
          >
            I already have an account
          </Link>
        </div>

        <div className="mt-16 grid w-full max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            {
              title: "Curate",
              body: "Collect news and trending stories into a single ideas list the moment you spot them.",
            },
            {
              title: "Script",
              body: "Move ideas from DRAFT to SCRIPTED as you write, keeping every pipeline stage visible.",
            },
            {
              title: "Record",
              body: "Queue up RECORDED videos and track what you have actually shipped.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm"
            >
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto w-full max-w-5xl px-6 py-8 text-center text-sm text-slate-400">
        © {new Date().getFullYear()} CurateKit · A production-ready Micro-SaaS
        starter kit.
      </footer>
    </main>
  );
}
