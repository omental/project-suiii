import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthUser } from "@/types/sync";

type ServerAuthResult =
  | { status: "authenticated"; user: AuthUser }
  | { status: "unauthenticated" }
  | { status: "error" };

export function getInternalApiBaseUrl() {
  return process.env.API_INTERNAL_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8100/api/v1";
}

export async function getServerAuthenticatedUser(): Promise<ServerAuthResult> {
  const cookieHeader = (await cookies()).toString();
  if (!cookieHeader) return { status: "unauthenticated" };

  let response: Response;
  try {
    response = await fetch(`${getInternalApiBaseUrl()}/auth/me`, {
      cache: "no-store",
      headers: { cookie: cookieHeader }
    });
  } catch {
    return { status: "error" };
  }

  if (response.status === 401 || response.status === 403) return { status: "unauthenticated" };
  if (!response.ok) return { status: "error" };

  return { status: "authenticated", user: await response.json() as AuthUser };
}

export async function requireAuthenticatedUser() {
  const result = await getServerAuthenticatedUser();
  if (result.status !== "authenticated") redirect("/sign-in");
  return result.user;
}
