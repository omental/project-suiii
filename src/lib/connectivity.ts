import { ApiError, apiRequest, fetchMe, fetchSyncStatus, NetworkError } from "@/lib/apiClient";
import { mergePulledRecords } from "@/lib/syncMerge";
import { readSyncQueue, writeSyncQueue } from "@/lib/syncQueue";
import type { SyncPullResponse, SyncPushResponse } from "@/types/sync";

export type ConnectivityKind = "online" | "offline" | "reconnecting" | "server_unreachable" | "sync_pending" | "sync_failed" | "connection_unknown";

export type SyncRunResult = {
  status: "skipped" | "complete" | "attention" | "offline" | "session_expired" | "device_revoked" | "server_unavailable";
  uploaded: number;
  downloaded: number;
  conflicts: number;
  rejected: number;
};

export function classifyConnectivity(browserOnline: boolean, serverReachable: boolean | null, pending: number, failed: number): ConnectivityKind {
  if (!browserOnline) return "offline";
  if (serverReachable === false) return failed > 0 ? "sync_failed" : "server_unreachable";
  if (pending > 0) return "sync_pending";
  if (failed > 0) return "sync_failed";
  return serverReachable ? "online" : "connection_unknown";
}

export function shouldRetrySync(error: unknown) {
  if (error instanceof NetworkError) return true;
  if (error instanceof ApiError) return [502, 503, 504, 408].includes(error.status);
  return false;
}

export function isNonRetryableSyncError(error: unknown) {
  return error instanceof ApiError && [401, 403, 409, 422].includes(error.status);
}

let syncInFlight = false;
let automaticAttempts = 0;
let lastAutomaticAttemptAt: string | null = null;

export function getReconnectSyncMeta() {
  return { syncInFlight, automaticAttempts, lastAutomaticAttemptAt };
}

export function resetReconnectSyncMetaForTests() {
  syncInFlight = false;
  automaticAttempts = 0;
  lastAutomaticAttemptAt = null;
}

export async function runTwoWaySync(mode: "manual" | "auto" = "manual"): Promise<SyncRunResult> {
  if (syncInFlight) return { status: "skipped", uploaded: 0, downloaded: 0, conflicts: 0, rejected: 0 };
  const currentQueue = readSyncQueue();
  if (mode === "auto" && currentQueue.pending.length === 0) return { status: "skipped", uploaded: 0, downloaded: 0, conflicts: 0, rejected: 0 };
  syncInFlight = true;
  try {
    await fetchMe();
    let uploaded = 0;
    let downloaded = 0;
    let conflicts = 0;
    let rejected = 0;
    let nextPending = currentQueue.pending;
    let nextFailed = currentQueue.failed;
    if (currentQueue.pending.length > 0) {
      const push = await apiRequest<SyncPushResponse>("/sync/push", { method: "POST", body: JSON.stringify({ mutations: currentQueue.pending }) });
      const confirmed = (status: string) => status === "applied" || status === "duplicate" || status === "already_exists";
      uploaded = push.results.filter((result) => confirmed(result.status)).length;
      conflicts = push.results.filter((result) => result.status === "conflict" || result.status === "server_newer").length;
      rejected = push.results.filter((result) => result.status === "rejected").length;
      nextPending = currentQueue.pending.filter((mutation, index) => !push.results[index] || !confirmed(push.results[index].status));
      const failedIds = new Set(nextFailed.map((mutation) => mutation.client_mutation_id));
      nextFailed = [...nextFailed, ...nextPending.filter((mutation) => !failedIds.has(mutation.client_mutation_id))];
    }
    const pull = await apiRequest<SyncPullResponse>("/sync/pull");
    downloaded = mergePulledRecords(pull.records, [...nextPending, ...nextFailed]).downloaded;
    const status = await fetchSyncStatus();
    const nextQueue = {
      ...currentQueue,
      pending: nextPending,
      failed: nextFailed,
      lastSyncAt: status.last_sync_at ?? new Date().toISOString(),
      recentActivity: [`${mode === "auto" ? "Reconnect sync" : "Sync"} completed: ${uploaded} uploaded, ${downloaded} downloaded, ${conflicts} conflicts, ${rejected} rejected`, ...currentQueue.recentActivity].slice(0, 5)
    };
    writeSyncQueue(nextQueue);
    return { status: nextPending.length || conflicts || rejected ? "attention" : "complete", uploaded, downloaded, conflicts, rejected };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return { status: "session_expired", uploaded: 0, downloaded: 0, conflicts: 0, rejected: 0 };
    if (error instanceof ApiError && error.status === 403) return { status: "device_revoked", uploaded: 0, downloaded: 0, conflicts: 0, rejected: 0 };
    if (error instanceof NetworkError) return { status: "offline", uploaded: 0, downloaded: 0, conflicts: 0, rejected: 0 };
    return { status: "server_unavailable", uploaded: 0, downloaded: 0, conflicts: 0, rejected: 0 };
  } finally {
    syncInFlight = false;
  }
}

export async function maybeRunReconnectSync() {
  const queue = readSyncQueue();
  if (queue.pending.length === 0 || syncInFlight || automaticAttempts >= 3) return { status: "skipped" as const };
  automaticAttempts += 1;
  lastAutomaticAttemptAt = new Date().toISOString();
  await new Promise((resolve) => window.setTimeout(resolve, Math.min(2000, 300 * automaticAttempts)));
  return runTwoWaySync("auto");
}
