export type StorageHealth = {
  localStorageAvailable: boolean;
  cacheStorageAvailable: boolean;
  serviceWorkerActive: boolean;
  usageBytes: number | null;
  quotaBytes: number | null;
  lastStorageError: string | null;
};

const errorKey = "project-suiii:last-storage-error";

export function recordStorageError(error: unknown) {
  if (typeof window === "undefined") return;
  const message = error instanceof Error ? error.message : "Storage write failed";
  try {
    window.localStorage.setItem(errorKey, message);
  } catch {
    // Nothing else is safe if localStorage itself is unavailable.
  }
}

export async function getStorageHealth(): Promise<StorageHealth> {
  let localStorageAvailable = false;
  let lastStorageError: string | null = null;
  try {
    const key = "project-suiii:storage-test";
    window.localStorage.setItem(key, "1");
    window.localStorage.removeItem(key);
    localStorageAvailable = true;
    lastStorageError = window.localStorage.getItem(errorKey);
  } catch (error) {
    lastStorageError = error instanceof Error ? error.message : "Local storage unavailable";
  }
  const estimate = navigator.storage?.estimate ? await navigator.storage.estimate().catch(() => null) : null;
  return {
    localStorageAvailable,
    cacheStorageAvailable: typeof window !== "undefined" && "caches" in window,
    serviceWorkerActive: typeof navigator !== "undefined" && Boolean(navigator.serviceWorker?.controller),
    usageBytes: typeof estimate?.usage === "number" ? estimate.usage : null,
    quotaBytes: typeof estimate?.quota === "number" ? estimate.quota : null,
    lastStorageError
  };
}
