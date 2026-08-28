import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, upsertUser } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import type { ContentItemDTO, ContentStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_STATUSES: ContentStatus[] = ["DRAFT", "SCRIPTED", "RECORDED"];

/**
 * GET /api/items — list the current user's content items (newest first).
 */
export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const prisma = getPrisma();
    const rows = await prisma.contentItem.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" },
    });

    const items: ContentItemDTO[] = rows.map((row) => ({
      id: row.id,
      title: row.title,
      sourceUrl: row.sourceUrl,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    }));

    return NextResponse.json(items);
  } catch {
    return NextResponse.json(
      { error: "Database unavailable" },
      { status: 503 }
    );
  }
}

/**
 * POST /api/items — create a new content item owned by the current user.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { title?: unknown; sourceUrl?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const sourceUrl =
    typeof body.sourceUrl === "string" && body.sourceUrl.trim()
      ? body.sourceUrl.trim()
      : null;

  if (!title) {
    return NextResponse.json(
      { error: "title is required" },
      { status: 400 }
    );
  }

  try {
    const prisma = getPrisma();
    // Owner must exist in the DB (FK) — upsert the user row first.
    await upsertUser(user);

    const item = await prisma.contentItem.create({
      data: { title, sourceUrl, ownerId: user.id },
    });

    const dto: ContentItemDTO = {
      id: item.id,
      title: item.title,
      sourceUrl: item.sourceUrl,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
    };
    return NextResponse.json(dto, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Database unavailable" },
      { status: 503 }
    );
  }
}
