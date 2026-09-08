/**
 * Items CRUD against a mocked Prisma client.
 *
 * Promise under test: every /api/items handler is auth-protected AND
 * user-scoped — a signed-in user only ever sees, creates, edits or deletes
 * their OWN rows — and status moves through the real pipeline
 * Draft → Scripted → Recorded at the enum/validation level.
 *
 * Coverage: GET list (scope + newest-first), POST create (201 + validation),
 * PATCH update (status transitions, invalid status, cross-user 404), DELETE
 * (own row, cross-user 404), and 401s for anonymous visitors on all four.
 *
 * No env vars, no database — the Prisma fake in helpers.ts is the only
 * database these handlers ever see (see setup.ts).
 */
import "./setup";
import { beforeEach, describe, expect, it } from "vitest";
import { CONTENT_STATUSES, type ContentItemDTO } from "@/lib/types";
import {
  ALICE,
  BOB,
  SIGNED_OUT,
  jsonRequest,
  makePrisma,
  makeRow,
} from "./helpers";
import { setPrisma, setScenario, testState } from "./setup";

const { GET, POST } = await import("@/app/api/items/route");
const { PATCH, DELETE } = await import("@/app/api/items/[id]/route");

const aliceSession = () => setScenario({ sessionUser: { id: ALICE.id, email: ALICE.email } });

beforeEach(() => {
  setPrisma(makePrisma());
  setScenario(SIGNED_OUT);
});

describe("GET /api/items", () => {
  it("anonymous visitors get 401", async () => {
    const res = await GET();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns ONLY the caller's rows, newest first", async () => {
    aliceSession();
    setPrisma(
      makePrisma([
        makeRow(ALICE.id, { title: "older", createdAt: new Date(2026, 0, 1) }),
        makeRow(BOB.id, { title: "bob's — must not leak" }),
        makeRow(ALICE.id, { title: "newer", createdAt: new Date(2026, 0, 5) }),
      ])
    );

    const res = await GET();
    expect(res.status).toBe(200);
    const items = (await res.json()) as ContentItemDTO[];
    expect(items.map((i) => i.title)).toEqual(["newer", "older"]);
  });

  it("every Prisma query carries the caller's ownerId scope", async () => {
    aliceSession();
    await GET();
    const scopes = testState.prisma.__calls
      .filter((c) => c.method === "findMany")
      .map((c) => (c.args as { where: { ownerId: string } }).where.ownerId);
    expect(scopes).toEqual([ALICE.id]);
  });
});

describe("POST /api/items", () => {
  it("anonymous visitors get 401", async () => {
    const res = await POST(jsonRequest("/api/items", "POST", { title: "x" }));
    expect(res.status).toBe(401);
  });

  it("creates a DRAFT item owned by the caller (201 + DTO shape)", async () => {
    aliceSession();
    const res = await POST(
      jsonRequest("/api/items", "POST", {
        title: "  My first idea  ",
        sourceUrl: "https://example.com/news",
      })
    );
    expect(res.status).toBe(201);
    const dto = (await res.json()) as ContentItemDTO;
    expect(dto).toMatchObject({
      title: "My first idea", // trimmed
      sourceUrl: "https://example.com/news",
      status: "DRAFT", // new items always start as drafts
    });
    expect(typeof dto.id).toBe("string");
    expect(typeof dto.createdAt).toBe("string");
    // …and it really belongs to Alice in the "database".
    expect(testState.prisma.__rows[0].ownerId).toBe(ALICE.id);
  });

  it("blank sourceUrl becomes null; missing title is 400", async () => {
    aliceSession();
    const blank = await POST(
      jsonRequest("/api/items", "POST", { title: "ok", sourceUrl: "   " })
    );
    expect(blank.status).toBe(201);
    expect(((await blank.json()) as ContentItemDTO).sourceUrl).toBeNull();

    const noTitle = await POST(jsonRequest("/api/items", "POST", { title: "  " }));
    expect(noTitle.status).toBe(400);
    expect(await noTitle.json()).toEqual({ error: "title is required" });
  });
});

describe("PATCH /api/items/[id] — status pipeline", () => {
  it("moves an item Draft → Scripted → Recorded", async () => {
    aliceSession();
    const seed = makeRow(ALICE.id, { title: "pipeline" });
    setPrisma(makePrisma([seed]));
    const params = { params: { id: seed.id } };

    for (const status of ["SCRIPTED", "RECORDED"] as const) {
      const res = await PATCH(jsonRequest(`/api/items/${seed.id}`, "PATCH", { status }), params);
      expect(res.status).toBe(200);
      expect(((await res.json()) as ContentItemDTO).status).toBe(status);
    }
    expect(testState.prisma.__rows[0].status).toBe("RECORDED");
  });

  it("rejects statuses outside the DRAFT/SCRIPTED/RECORDED enum", async () => {
    aliceSession();
    const seed = makeRow(ALICE.id);
    setPrisma(makePrisma([seed]));
    const res = await PATCH(
      jsonRequest(`/api/items/${seed.id}`, "PATCH", { status: "PUBLISHED" }),
      { params: { id: seed.id } }
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: `status must be one of: ${CONTENT_STATUSES.join(", ")}`,
    });
    expect(testState.prisma.__rows[0].status).toBe("DRAFT"); // untouched
  });

  it("cannot touch another user's row (404) and rejects bad titles", async () => {
    aliceSession();
    const bobs = makeRow(BOB.id, { title: "bob's" });
    setPrisma(makePrisma([bobs]));

    const cross = await PATCH(
      jsonRequest(`/api/items/${bobs.id}`, "PATCH", { title: "hijacked" }),
      { params: { id: bobs.id } }
    );
    expect(cross.status).toBe(404);
    expect(testState.prisma.__rows[0].title).toBe("bob's"); // untouched

    const mine = makeRow(ALICE.id, { title: "mine" });
    setPrisma(makePrisma([mine]));
    const badTitle = await PATCH(
      jsonRequest(`/api/items/${mine.id}`, "PATCH", { title: " " }),
      { params: { id: mine.id } }
    );
    expect(badTitle.status).toBe(400);
  });

  it("anonymous visitors get 401", async () => {
    const res = await PATCH(
      jsonRequest("/api/items/x", "PATCH", { status: "SCRIPTED" }),
      { params: { id: "x" } }
    );
    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/items/[id]", () => {
  it("deletes the caller's own row", async () => {
    aliceSession();
    const seed = makeRow(ALICE.id);
    setPrisma(makePrisma([seed]));
    const res = await DELETE(jsonRequest(`/api/items/${seed.id}`, "DELETE"), {
      params: { id: seed.id },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(testState.prisma.__rows).toHaveLength(0);
  });

  it("cannot delete another user's row (404, row survives)", async () => {
    aliceSession();
    const bobs = makeRow(BOB.id);
    setPrisma(makePrisma([bobs]));
    const res = await DELETE(jsonRequest(`/api/items/${bobs.id}`, "DELETE"), {
      params: { id: bobs.id },
    });
    expect(res.status).toBe(404);
    expect(testState.prisma.__rows).toHaveLength(1);
  });

  it("anonymous visitors get 401", async () => {
    const res = await DELETE(jsonRequest("/api/items/x", "DELETE"), {
      params: { id: "x" },
    });
    expect(res.status).toBe(401);
  });
});
