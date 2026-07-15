import { SignInPage } from "@/components/auth/SignInPage";
import { getServerAuthenticatedUser } from "@/lib/serverAuth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function SignInRoute() {
  const auth = await getServerAuthenticatedUser();
  if (auth.status === "authenticated") redirect("/");
  return <SignInPage />;
}
