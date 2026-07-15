const offlineMarkerKey = "project-suiii:offline-account-marker";
const legacyOwnerKey = "project-suiii:namespace:v1:legacy-owner";
const quarantinePrefix = "project-suiii:quarantine:v1";

export const storageDomains = {
  dashboard: { legacyKey: "project-suiii:phase-1-dashboard", version: 1 },
  nutrition: { legacyKey: "project-suiii:phase-2-nutrition", version: 2 },
  training: { legacyKey: "project-suiii:phase-3-training", version: 3 },
  syncQueue: { legacyKey: "project-suiii:phase-4-sync-queue", version: 4 },
  progress: { legacyKey: "project-suiii:phase-5-progress", version: 5 },
  programmeProfile: { legacyKey: "project-suiii:programme-profile", version: 1 },
  restoreMeta: { legacyKey: "project-suiii:device-restore-activity", version: 1 },
  exportMeta: { legacyKey: "project-suiii:device-export-meta", version: 1 }
} as const;

export type StorageDomain = keyof typeof storageDomains;

type AccountMarker = {
  accountId: string;
  deviceId: string;
  enabled: boolean;
};

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 96);
}

export function scopedStorageKey(accountId: string, deviceId: string, domain: StorageDomain) {
  const entry = storageDomains[domain];
  return `project-suiii:${safeSegment(accountId)}:${safeSegment(deviceId)}:${domain}:v${entry.version}`;
}

export function readActiveAccountMarker(): AccountMarker | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(offlineMarkerKey) ?? "null") as Partial<AccountMarker> | null;
    return parsed?.enabled && parsed.accountId && parsed.deviceId ? { accountId: parsed.accountId, deviceId: parsed.deviceId, enabled: true } : null;
  } catch {
    return null;
  }
}

export function storageKeyFor(domain: StorageDomain) {
  const marker = readActiveAccountMarker();
  return marker ? scopedStorageKey(marker.accountId, marker.deviceId, domain) : storageDomains[domain].legacyKey;
}

export function legacyStorageKeyFor(domain: StorageDomain) {
  return storageDomains[domain].legacyKey;
}

export function accountStoragePrefix(accountId: string, deviceId: string) {
  return `project-suiii:${safeSegment(accountId)}:${safeSegment(deviceId)}`;
}

export function migrateLegacyStorageForAccount(accountId: string, deviceId: string) {
  if (typeof window === "undefined") return;
  const ownerRaw = window.localStorage.getItem(legacyOwnerKey);
  const owner = ownerRaw ? safeParse<{ accountId?: string; deviceId?: string }>(ownerRaw) : null;
  if (owner?.accountId && (owner.accountId !== accountId || owner.deviceId !== deviceId)) {
    for (const [domain, entry] of Object.entries(storageDomains) as Array<[StorageDomain, typeof storageDomains[StorageDomain]]>) {
      const value = window.localStorage.getItem(entry.legacyKey);
      if (value && !window.localStorage.getItem(scopedStorageKey(owner.accountId, owner.deviceId ?? deviceId, domain))) {
        window.localStorage.setItem(`${quarantinePrefix}:${safeSegment(owner.accountId)}:${domain}:v${entry.version}`, value);
      }
    }
    return;
  }

  for (const [domain, entry] of Object.entries(storageDomains) as Array<[StorageDomain, typeof storageDomains[StorageDomain]]>) {
    const scoped = scopedStorageKey(accountId, deviceId, domain);
    const value = window.localStorage.getItem(entry.legacyKey);
    if (value && !window.localStorage.getItem(scoped)) window.localStorage.setItem(scoped, value);
  }
  window.localStorage.setItem(legacyOwnerKey, JSON.stringify({ version: 1, accountId, deviceId, completedAt: new Date().toISOString() }));
}

export function clearScopedStorageForTests() {
  if (typeof window === "undefined") return;
  for (const key of Object.keys(window.localStorage)) {
    if (key.startsWith("project-suiii:") && (key.includes(":dashboard:v") || key.includes(":nutrition:v") || key.includes(":training:v") || key.includes(":syncQueue:v") || key.includes(":progress:v") || key.includes(":programmeProfile:v"))) {
      window.localStorage.removeItem(key);
    }
  }
  window.localStorage.removeItem(legacyOwnerKey);
}

function safeParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
