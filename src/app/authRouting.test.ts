import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieToStringMock = vi.fn(() => "suiii_session=abc");
const redirectMock = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({ toString: cookieToStringMock }))
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock
}));

describe("app route privacy boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieToStringMock.mockReturnValue("suiii_session=abc");
    process.env.API_INTERNAL_BASE_URL = "http://internal.test/api/v1";
  });

  it("keeps private app routes inside the authenticated route group", () => {
    const appDir = join(process.cwd(), "src", "app");
    const protectedDir = join(appDir, "(authenticated)");

    expect(existsSync(join(protectedDir, "page.tsx"))).toBe(true);
    expect(existsSync(join(protectedDir, "meals", "page.tsx"))).toBe(true);
    expect(existsSync(join(protectedDir, "train", "page.tsx"))).toBe(true);
    expect(existsSync(join(protectedDir, "progress", "page.tsx"))).toBe(true);
    expect(existsSync(join(protectedDir, "sync", "page.tsx"))).toBe(true);
    expect(existsSync(join(appDir, "sign-in", "page.tsx"))).toBe(true);
    expect(existsSync(join(appDir, "page.tsx"))).toBe(false);
  });

  it("does not disable user scaling in viewport metadata", () => {
    const layout = readFileSync(join(process.cwd(), "src", "app", "layout.tsx"), "utf8");
    expect(layout).not.toMatch(new RegExp(["maximum", "Scale"].join(""), "i"));
    expect(layout).not.toMatch(new RegExp(["user", "Scalable"].join(""), "i"));
    expect(layout).not.toMatch(new RegExp(["user", "scalable"].join("-"), "i"));
  });

  it("checks the server session through auth/me without storing the response", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(JSON.stringify({
      id: "user-1",
      email: "athlete@example.test",
      full_name: "Demo Athlete",
      timezone: "Asia/Dhaka",
      is_active: true,
      is_admin: false
    }), { status: 200, headers: { "Content-Type": "application/json" } })));
    vi.stubGlobal("fetch", fetchMock);
    const { getServerAuthenticatedUser } = await import("@/lib/serverAuth");

    const result = await getServerAuthenticatedUser();

    expect(result.status).toBe("authenticated");
    expect(fetchMock).toHaveBeenCalledWith("http://internal.test/api/v1/auth/me", expect.objectContaining({
      cache: "no-store",
      headers: { cookie: "suiii_session=abc" }
    }));
  });

  it("redirects unauthenticated private routes before rendering", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(null, { status: 401 }))));
    const { requireAuthenticatedUser } = await import("@/lib/serverAuth");

    await requireAuthenticatedUser();

    expect(redirectMock).toHaveBeenCalledWith("/sign-in");
  });
});
