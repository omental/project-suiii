import type React from "react";
import { AuthenticatedUserProvider } from "@/components/auth/AuthenticatedUserProvider";
import { requireAuthenticatedUser } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuthenticatedUser();
  return <AuthenticatedUserProvider user={user}>{children}</AuthenticatedUserProvider>;
}
