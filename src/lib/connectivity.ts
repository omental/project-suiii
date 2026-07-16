import { ApiError, apiRequest, fetchMe, fetchSyncStatus, NetworkError } from "@/lib/apiClient";
import { mergePulledRecords } from "@/lib/syncMerge";
import { readSyncQueue, writeSyncQueue } from "@/lib/syncQueue";
import { repairMissingOutboxMutations } from "@/lib/syncOutbox";
import type { SyncPullResponse, SyncPushResponse } from "@/types/sync";

export type ConnectivityKind = "online" | "offline" | "reconnecting" | "server_unreachable" | "sync_pending" | "sync_failed" | "connection_unknown";

export type SyncRunResult = {
  status: "skipped" | "complete" | "attention" | "offline" | "session_expired" | "device_revoked" | "server_unavailable" | "storage_uninitialized";
  uploaded: number;
  downloaded: number;
  conflicts: number;
  rejected: number;
  repaired: number;
  unsupported: number;
  stillPending: number;
  pushFailed: boolean;
  pullFailed: boolean;
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

function syncPullLimitQuery() {
  const raw = process.env.NEXT_PUBLIC_SYNC_PULL_LIMIT;
  const value = raw ? Number(raw) : null;
  return value && Number.isInteger(value) && value > 0 ? `limit=${value}` : "";
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
  const emptyResult = (status: SyncRunResult["status"], extras: Partial<SyncRunResult> = {}): SyncRunResult => ({
    status,
    uploaded: 0,
    downloaded: 0,
    conflicts: 0,
    rejected: 0,
    repaired: 0,
    unsupported: 0,
    stillPending: 0,
    pushFailed: false,
    pullFailed: false,
    ...extras
  });
  if (syncInFlight) return emptyResult("skipped");
  const repair = repairMissingOutboxMutations();
  if (!repair.accountInitialized) return emptyResult("storage_uninitialized");
  const currentQueue = repair.queue;
  if (mode === "auto" && currentQueue.pending.length === 0) return emptyResult("skipped", { repaired: repair.repaired, unsupported: repair.unsupported });
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
      writeSyncQueue({
        ...currentQueue,
        pending: nextPending,
        failed: nextFailed,
        recentActivity: [`Push accepted: ${uploaded} uploaded, ${conflicts} conflicts, ${rejected} rejected`, ...currentQueue.recentActivity].slice(0, 5)
      });
    }
    let nextCursor = currentQueue.pullCursor;
    try {
      let hasMore = true;
      while (hasMore) {
        const params = new URLSearchParams();
        if (nextCursor) params.set("cursor", nextCursor);
        const limit = syncPullLimitQuery();
        if (limit) {
          const [key, value] = limit.split("=");
          params.set(key, value);
        }
        const query = params.toString() ? `?${params.toString()}` : "";
        const pull = await apiRequest<SyncPullResponse>(`/sync/pull${query}`);
        const merge = mergePulledRecords(pull.records, [...nextPending, ...nextFailed]);
        downloaded += merge.applied;
        nextCursor = pull.next_cursor;
        hasMore = pull.has_more;
      }
    } catch (error) {
      const stillPending = nextPending.length;
      return emptyResult("server_unavailable", {
        uploaded,
        conflicts,
        rejected,
        repaired: repair.repaired,
        unsupported: repair.unsupported,
        stillPending,
        pullFailed: true
      });
    }
    const status = await fetchSyncStatus();
    const nextQueue = {
      ...currentQueue,
      pending: nextPending,
      failed: nextFailed,
      pullCursor: nextCursor,
      lastSyncAt: status.last_sync_at ?? new Date().toISOString(),
      recentActivity: [`${mode === "auto" ? "Reconnect sync" : "Sync"} completed: ${uploaded} uploaded, ${downloaded} downloaded, ${conflicts} conflicts, ${rejected} rejected, ${repair.repaired} repaired`, ...currentQueue.recentActivity].slice(0, 5)
    };
    writeSyncQueue(nextQueue);
    const stillPending = nextPending.length;
    return {
      status: stillPending || conflicts || rejected || repair.unsupported ? "attention" : "complete",
      uploaded,
      downloaded,
      conflicts,
      rejected,
      repaired: repair.repaired,
      unsupported: repair.unsupported,
      stillPending,
      pushFailed: false,
      pullFailed: false
    };
  } catch (error) {
    const latest = readSyncQueue();
    const base = { repaired: repair.repaired, unsupported: repair.unsupported, stillPending: latest.pending.length, pushFailed: currentQueue.pending.length > 0, pullFailed: false };
    if (error instanceof ApiError && error.status === 401) return emptyResult("session_expired", base);
    if (error instanceof ApiError && error.status === 403) return emptyResult("device_revoked", base);
    if (error instanceof NetworkError) return emptyResult("offline", base);
    return emptyResult("server_unavailable", base);
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
