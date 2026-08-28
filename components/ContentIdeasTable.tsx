"use client";

/**
 * ContentIdeasTable — an "add + edit + delete" data table for the dashboard.
 *
 * This client component is driven entirely by the CRUD API:
 *   GET    /api/items          list the current user's items
 *   POST   /api/items          create an item
 *   PATCH  /api/items/[id]     update an item's fields / status
 *   DELETE /api/items/[id]     delete an item
 *
 * It receives the initial items from the server (SSR) and re-fetches after
 * every mutation so the UI always reflects the database.
 */
import { useCallback, useEffect, useState } from "react";
import {
  CONTENT_STATUSES,
  type ContentItemDTO,
  type ContentStatus,
} from "@/lib/types";

type Props = {
  initialItems: ContentItemDTO[];
};

const STATUS_STYLES: Record<ContentStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700 ring-slate-200",
  SCRIPTED: "bg-amber-50 text-amber-700 ring-amber-200",
  RECORDED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

export default function ContentIdeasTable({ initialItems }: Props) {
  const [items, setItems] = useState<ContentItemDTO[]>(initialItems);
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    const res = await fetch("/api/items");
    if (!res.ok) throw new Error("Failed to load items");
    setItems(await res.json());
  }, []);

  // Re-sync with the API once the page mounts (SSR data can be stale).
  useEffect(() => {
    refresh().catch(() => setError("Could not reach the API."));
  }, [refresh]);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          sourceUrl: sourceUrl.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to add item");
      setTitle("");
      setSourceUrl("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(id: string, status: ContentStatus) {
    try {
      const res = await fetch(`/api/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function deleteItem(id: string) {
    try {
      const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete item");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      ) : null}

      {/* Add form */}
      <form
        onSubmit={addItem}
        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label
            htmlFor="title"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            New content idea
          </label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. 'AI news roundup for this week'"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <div className="flex-1">
          <label
            htmlFor="sourceUrl"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Source URL
          </label>
          <input
            id="sourceUrl"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !title.trim()}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 transition"
        >
          {busy ? "Adding…" : "Add idea"}
        </button>
      </form>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-slate-400"
                >
                  No content ideas yet — add your first one above.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {item.title}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {item.sourceUrl ? (
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-indigo-600 hover:underline"
                      >
                        {item.sourceUrl}
                      </a>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={item.status}
                      onChange={(e) =>
                        updateStatus(
                          item.id,
                          e.target.value as ContentStatus
                        )
                      }
                      className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset focus:outline-none ${STATUS_STYLES[item.status]}`}
                    >
                      {CONTENT_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="text-sm font-medium text-red-600 hover:text-red-500 transition"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
