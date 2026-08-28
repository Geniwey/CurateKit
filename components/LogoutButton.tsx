/**
 * Logout button — POSTs to /auth/logout which signs the user out.
 */
export default function LogoutButton() {
  return (
    <form action="/auth/logout" method="post">
      <button
        type="submit"
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400 transition"
      >
        Log out
      </button>
    </form>
  );
}
