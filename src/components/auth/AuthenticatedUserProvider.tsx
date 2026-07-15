"use client";

import { createContext, useContext } from "react";
import type React from "react";
import type { AuthUser } from "@/types/sync";

const AuthenticatedUserContext = createContext<AuthUser | null>(null);

export function AuthenticatedUserProvider({ user, children }: { user: AuthUser; children: React.ReactNode }) {
  return (
    <AuthenticatedUserContext.Provider value={user}>
      {children}
    </AuthenticatedUserContext.Provider>
  );
}

export function useAuthenticatedUser() {
  const user = useContext(AuthenticatedUserContext);
  if (!user) {
    return {
      id: "unknown",
      email: "",
      full_name: "Athlete",
      timezone: "Asia/Dhaka",
      is_active: true,
      is_admin: false
    } satisfies AuthUser;
  }
  return user;
}
