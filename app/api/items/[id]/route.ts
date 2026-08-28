import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import type { ContentItemDTO, ContentStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_STATUSES: ContentStatus[] = ["DRAFT", "SCRIPTED", "RECORDED"];

type RouteContext = { params: { id: string } };

/**
 * PATCH /api/items/[id] — update fields of an item owned by the current user.
 * Supports `title`, `sourceUrl` and `status` (any combination).
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { title?: unknown; sourceUrl?: unknown; status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate input before touching the database.
  const update: { title?: string; sourceUrl?: string | null; status?: ContentStatus } = {};

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "title must be a non-empty string" }, { status: 400 });
    }
    update.title = body.title.trim();
  }

  if (body.sourceUrl !== undefined) {
    update.sourceUrl =
      typeof body.sourceUrl === "string" && body.sourceUrl.trim()
        ? body.sourceUrl.trim()
        : null;
  }

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status as ContentStatus)) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }
    update.status = body.status as ContentStatus;
  }

  try {
    const prisma = getPrisma();
    // Scope the update to the owner so users can never touch each other's rows.
    const item = await prisma.contentItem.updateMany({
      where: { id: params.id, ownerId: user.id },
      data: update,
    });

    if (item.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.contentItem.findUnique({
      where: { id: params.id },
    });

    const dto: ContentItemDTO = {
      id: updated!.id,
      title: updated!.title,
      sourceUrl: updated!.sourceUrl,
      status: updated!.status,
      createdAt: updated!.createdAt.toISOString(),
    };
    return NextResponse.json(dto);
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}

/**
 * DELETE /api/items/[id] — delete an item owned by the current user.
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const prisma = getPrisma();
    const result = await prisma.contentItem.deleteMany({
      where: { id: params.id, ownerId: user.id },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}
