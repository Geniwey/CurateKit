/**
 * Auth flow shape — signup/login guard rails.
 *
 * Promise under test: the kit's auth routes sign users in/out through Supabase
 * and always land them in the right place (dashboard on success, back to the
 * form with an error message on failure). A scripted Supabase fake drives every
 * branch: valid login, bad password, instant signup, email-confirmation
 * signup, logout, OAuth callback success + failure, plus the anonymous-visitor
 * guard on protected routes.
 *
 * No env vars, no network — only `@/lib/supabase/server` and `@/lib/db` are
 * mocked (see setup.ts); every handler below is production code.
 */
import "./setup";
import { beforeEach, describe, expect, it } from "vitest";
import { ALICE, formRequest, makePrisma } from "./helpers";
import { setScenario, testState } from "./setup";

const { POST: loginPOST } = await import("@/app/auth/login/route");
const { POST: signupPOST } = await import("@/app/auth/signup/route");
const { POST: logoutPOST } = await import("@/app/auth/logout/route");
const { GET: callbackGET } = await import("@/app/auth/callback/route");

beforeEach(() => {
  testState.prisma = makePrisma();
  setScenario({});
});

describe("POST /auth/login", () => {
  it("valid credentials land on /dashboard", async () => {
    setScenario({
      sessionUser: { id: ALICE.id, email: ALICE.email },
    });
    const res = await loginPOST(
      formRequest("/auth/login", { email: ALICE.email, password: "secret123" })
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/dashboard");
  });

  it("wrong password bounces back to /login with the error in the URL", async () => {
    setScenario({ loginError: "Invalid login credentials" });
    const res = await loginPOST(
      formRequest("/auth/login", { email: ALICE.email, password: "wrong" })
    );
    expect(res.status).toBe(307);
    const location = res.headers.get("location")!;
    expect(location).toContain("/login?error=");
    expect(location).toContain("Invalid%20login%20credentials");
  });
});

describe("POST /auth/signup", () => {
  it("instant-confirm signup lands on /dashboard", async () => {
    setScenario({
      signup: { mode: "session" },
      sessionUser: { id: ALICE.id, email: ALICE.email },
    });
    const res = await signupPOST(
      formRequest("/auth/signup", {
        email: "new@example.com",
        password: "secret123",
      })
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/dashboard"
    );
  });

  it("email-confirm signup asks the user to check their inbox", async () => {
    setScenario({ signup: { mode: "confirm" } });
    const res = await signupPOST(
      formRequest("/auth/signup", {
        email: "new@example.com",
        password: "secret123",
      })
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login?message=");
  });

  it("signup failure bounces back to /signup with the error", async () => {
    setScenario({
      signup: { mode: "session", error: "User already registered" },
    });
    const res = await signupPOST(
      formRequest("/auth/signup", { email: ALICE.email, password: "secret123" })
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/signup?error=");
  });
});

describe("POST /auth/logout + GET /auth/callback", () => {
  it("logout signs out and lands on the landing page", async () => {
    const res = await logoutPOST(
      new Request("http://localhost:3000/auth/logout", { method: "POST" })
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("OAuth/email callback with a valid code lands on ?next= (default /dashboard)", async () => {
    setScenario({
      sessionUser: { id: ALICE.id, email: ALICE.email },
    });
    const res = await callbackGET(
      new Request("http://localhost:3000/auth/callback?code=valid-code")
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/dashboard");
  });

  it("callback without a code bounces to /login with an error", async () => {
    const res = await callbackGET(
      new Request("http://localhost:3000/auth/callback")
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login?error=");
  });

  it("callback with a bad code bounces to /login with an error", async () => {
    setScenario({ exchangeError: "bad code" });
    const res = await callbackGET(
      new Request("http://localhost:3000/auth/callback?code=bad-code")
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login?error=");
  });
});

describe("protected-route guard (anonymous visitors go to /login)", () => {
  it("getCurrentUser returns null with no session, shaped like a SessionUser when signed in", async () => {
    const { getCurrentUser } = await import("@/lib/auth");
    setScenario({});
    expect(await getCurrentUser()).toBeNull();

    setScenario({
      sessionUser: {
        id: ALICE.id,
        email: ALICE.email,
        user_metadata: { full_name: "Alice A" },
      },
    });
    expect(await getCurrentUser()).toMatchObject({
      id: ALICE.id,
      email: ALICE.email,
      name: "Alice A",
    });
  });

  it("requireUser attempts a /login redirect for anonymous visitors", async () => {
    const { requireUser } = await import("@/lib/auth");
    setScenario({});
    // next/navigation redirect() throws outside the Next runtime — the guard
    // is correct as long as it *attempts* the /login redirect (never resolves).
    const result = await requireUser().then(
      () => "resolved",
      (err: unknown) => err
    );
    expect(result).not.toBe("resolved");
    expect(String((result as Error)?.message ?? result)).toContain("/login");
  });
});
