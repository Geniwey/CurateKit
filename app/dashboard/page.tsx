import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import type { ContentItemDTO } from "@/lib/types";
import ContentIdeasTable from "@/components/ContentIdeasTable";

export const metadata: Metadata = {
  title: "Dashboard",
};

export const dynamic = "force-dynamic";

/**
 * Dashboard — protected page that renders the current user's "Content Ideas"
 * data table, seeded with data fetched server-side. All mutations happen
 * through the CRUD API (see components/ContentIdeasTable.tsx).
 */
export default async function DashboardPage() {
  const user = await requireUser();

  let items: ContentItemDTO[] = [];
  try {
    const prisma = getPrisma();
    const rows = await prisma.contentItem.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" },
    });
    items = rows.map((row) => ({
      id: row.id,
      title: row.title,
      sourceUrl: row.sourceUrl,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    }));
  } catch {
    // No DATABASE_URL configured yet — render an empty table gracefully.
    items = [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Content Ideas</h1>
        <p className="mt-1 text-sm text-slate-600">
          Collect stories, move them through your pipeline, and track what
          you&apos;ve recorded.
        </p>
      </div>

      <ContentIdeasTable initialItems={items} />
    </div>
  );
}
