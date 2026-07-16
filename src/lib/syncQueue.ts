import type { SyncMutation, SyncQueueState } from "@/types/sync";
import { clearScopedStorageForTests, legacyStorageKeyFor, storageKeyFor } from "@/lib/accountStorage";

const queueKey = () => storageKeyFor("syncQueue");

export const defaultSyncQueueState: SyncQueueState = {
  version: 4,
  deviceId: "device-local",
  deviceName: "This device",
  csrfToken: null,
  pending: [],
  failed: [],
  lastSyncAt: null,
  pullCursor: null,
  recentActivity: []
};

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function readSyncQueue(): SyncQueueState {
  if (typeof window === "undefined") return defaultSyncQueueState;
  try {
    const raw = window.localStorage.getItem(queueKey());
    if (!raw) {
      const next = { ...defaultSyncQueueState, deviceId: randomId() };
      writeSyncQueue(next);
      return next;
    }
    const parsed = JSON.parse(raw) as Partial<SyncQueueState>;
    if (parsed.version !== 4 || !Array.isArray(parsed.pending)) return defaultSyncQueueState;
    return { ...defaultSyncQueueState, ...parsed };
  } catch {
    return defaultSyncQueueState;
  }
}

export function writeSyncQueue(state: SyncQueueState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(queueKey(), JSON.stringify(state));
}

export function enqueueMutation(state: SyncQueueState, mutation: Omit<SyncMutation, "client_mutation_id" | "device_id" | "created_at">): SyncQueueState {
  return {
    ...state,
    pending: [
      ...state.pending,
      {
        ...mutation,
        client_mutation_id: randomId(),
        device_id: state.deviceId,
        created_at: new Date().toISOString()
      }
    ]
  };
}

export function upsertPendingMutation(
  state: SyncQueueState,
  mutation: Omit<SyncMutation, "client_mutation_id" | "device_id" | "created_at">
): SyncQueueState {
  const existingIndex = state.pending.findIndex((item) =>
    item.entity_type === mutation.entity_type &&
    item.entity_id === mutation.entity_id &&
    item.mutation_type === mutation.mutation_type
  );
  const createdAt = new Date().toISOString();
  if (existingIndex >= 0) {
    const pending = [...state.pending];
    pending[existingIndex] = {
      ...pending[existingIndex],
      ...mutation,
      device_id: state.deviceId
    };
    return { ...state, pending };
  }
  return {
    ...state,
    pending: [
      ...state.pending,
      {
        ...mutation,
        client_mutation_id: randomId(),
        device_id: state.deviceId,
        created_at: createdAt
      }
    ]
  };
}

export function resetSyncQueueForTests() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(queueKey());
    window.localStorage.removeItem(legacyStorageKeyFor("syncQueue"));
    window.localStorage.removeItem("project-suiii:offline-account-marker");
    clearScopedStorageForTests();
  }
}
