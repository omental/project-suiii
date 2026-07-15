import { readSyncQueue } from "@/lib/syncQueue";
import { accountStoragePrefix as buildAccountStoragePrefix, migrateLegacyStorageForAccount } from "@/lib/accountStorage";

const markerKey = "project-suiii:offline-account-marker";

export type OfflineAccountMarker = {
  accountId: string;
  deviceId: string;
  enabled: boolean;
  authenticatedAt: string;
};

export function recordAuthenticatedAccount(accountId: string) {
  const queue = readSyncQueue();
  const marker: OfflineAccountMarker = { accountId, deviceId: queue.deviceId, enabled: true, authenticatedAt: new Date().toISOString() };
  window.localStorage.setItem(markerKey, JSON.stringify(marker));
  migrateLegacyStorageForAccount(accountId, queue.deviceId);
  return marker;
}

export function readOfflineAccountMarker(): OfflineAccountMarker | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(markerKey) ?? "null") as OfflineAccountMarker | null;
    return parsed?.accountId && parsed.deviceId ? parsed : null;
  } catch {
    return null;
  }
}

export function disableOfflineAccountAccess() {
  const marker = readOfflineAccountMarker();
  if (!marker) return null;
  const next = { ...marker, enabled: false };
  window.localStorage.setItem(markerKey, JSON.stringify(next));
  return next;
}

export function canUseOfflineDeviceMode(accountId: string) {
  const marker = readOfflineAccountMarker();
  return Boolean(marker?.enabled && marker.accountId === accountId && marker.deviceId === readSyncQueue().deviceId);
}

export function accountStoragePrefix(accountId: string) {
  const deviceId = readSyncQueue().deviceId;
  return buildAccountStoragePrefix(accountId, deviceId);
}
