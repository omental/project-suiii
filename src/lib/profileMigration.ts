import type { UserProfile } from "@/types/sync";

const programmeProfileKey = "project-suiii:programme-profile";
const markerPrefix = "project-suiii:profile-migration:v1";

export type LocalProgrammeProfile = {
  programmeStartDate?: string;
};

export function readLocalProgrammeProfile(): LocalProgrammeProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(programmeProfileKey);
    return raw ? JSON.parse(raw) as LocalProgrammeProfile : null;
  } catch {
    return null;
  }
}

export function profileMigrationMarkerKey(userId: string) {
  return `${markerPrefix}:${userId}`;
}

export function hasProfileMigrationMarker(userId: string) {
  if (typeof window === "undefined") return true;
  return Boolean(window.localStorage.getItem(profileMigrationMarkerKey(userId)));
}

export function markProfileMigration(userId: string, decision: "keep_server" | "use_device" | "manual_review") {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(profileMigrationMarkerKey(userId), JSON.stringify({ version: 1, decision, completedAt: new Date().toISOString() }));
}

export function needsProfileMigration(profile: UserProfile, userId: string) {
  const local = readLocalProgrammeProfile();
  return Boolean(local?.programmeStartDate && !profile.profile_configured && !hasProfileMigrationMarker(userId));
}
