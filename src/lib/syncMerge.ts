import { defaultProgressState } from "@/lib/progressRepository";
import { storageKeyFor } from "@/lib/accountStorage";
import type { SyncMutation, SyncPullRecord } from "@/types/sync";

const phase2Key = () => storageKeyFor("nutrition");
const phase3Key = () => storageKeyFor("training");
const progressKey = () => storageKeyFor("progress");

function readJson(key: string) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function text(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function pendingKeys(mutations: SyncMutation[]) {
  const keys = new Set<string>();
  mutations.forEach((mutation) => {
    keys.add(`${mutation.entity_type}:${mutation.entity_id}`);
    const clientRecordId = text(mutation.payload.client_record_id);
    if (clientRecordId) keys.add(`${mutation.entity_type}:${clientRecordId}`);
  });
  return keys;
}

function canMerge(record: SyncPullRecord, blocked: Set<string>) {
  return !blocked.has(`${record.entity_type}:${record.entity_id}`) && !blocked.has(`${record.entity_type}:${record.client_record_id}`);
}

function mergeMeal(record: SyncPullRecord) {
  const id = text(record.payload.id) ?? record.client_record_id;
  const current = readJson(phase2Key()) ?? { version: 2, mealLogs: {}, weighingSessions: {} };
  const mealLogs = current.mealLogs && typeof current.mealLogs === "object" ? { ...current.mealLogs as Record<string, unknown> } : {};
  if (record.deleted_at) delete mealLogs[id];
  else mealLogs[id] = { ...record.payload, version: record.server_version, serverUpdatedAt: record.server_updated_at };
  writeJson(phase2Key(), { ...current, version: 2, mealLogs });
}

function mergeWorkout(record: SyncPullRecord) {
  const id = text(record.payload.id) ?? record.client_record_id;
  const current = readJson(phase3Key()) ?? { version: 3, sessions: {}, readinessByDate: {}, activeSessionId: null };
  const sessions = current.sessions && typeof current.sessions === "object" ? { ...current.sessions as Record<string, unknown> } : {};
  if (record.deleted_at) delete sessions[id];
  else sessions[id] = { ...record.payload, version: record.server_version, serverUpdatedAt: record.server_updated_at };
  writeJson(phase3Key(), { ...current, version: 3, sessions });
}

function mergeDailyTracking(record: SyncPullRecord) {
  const date = text(record.payload.tracking_date) ?? record.client_record_id;
  const current = readJson(phase3Key()) ?? { version: 3, sessions: {}, readinessByDate: {}, activeSessionId: null };
  const readinessByDate = current.readinessByDate && typeof current.readinessByDate === "object" ? { ...current.readinessByDate as Record<string, unknown> } : {};
  if (record.deleted_at) {
    delete readinessByDate[date];
  } else {
    readinessByDate[date] = {
      ...(readinessByDate[date] && typeof readinessByDate[date] === "object" ? readinessByDate[date] as Record<string, unknown> : {}),
      id: `readiness-${date}`,
      date,
      badmintonGames: numberOrNull(record.payload.badminton_games),
      energy: text(record.payload.energy),
      soreness: numberOrNull(record.payload.soreness),
      sleepHours: typeof record.payload.sleep_minutes === "number" ? record.payload.sleep_minutes / 60 : null,
      note: text(record.payload.notes) ?? "",
      version: record.server_version,
      serverUpdatedAt: record.server_updated_at
    };
  }
  writeJson(phase3Key(), { ...current, version: 3, readinessByDate });
}

function mergeMeasurement(record: SyncPullRecord) {
  const current = { ...defaultProgressState, ...(readJson(progressKey()) ?? {}) };
  const measurements = current.measurements && typeof current.measurements === "object" ? { ...(current.measurements as unknown as Record<string, Record<string, unknown>>) } : {};
  const existingKey = Object.entries(measurements).find(([, item]) => item.clientRecordId === record.client_record_id)?.[0];
  const id = existingKey ?? text(record.payload.id) ?? record.client_record_id;
  if (record.deleted_at) {
    if (measurements[id]) measurements[id] = { ...measurements[id], deletedAt: record.deleted_at, version: record.server_version };
  } else {
    measurements[id] = {
      id,
      clientRecordId: record.client_record_id,
      measuredAt: text(record.payload.measured_at) ?? record.server_updated_at,
      localDate: text(record.payload.local_date) ?? record.server_updated_at.slice(0, 10),
      weightKg: numberOrNull(record.payload.weight_kg),
      waistIn: numberOrNull(record.payload.waist_in),
      chestIn: numberOrNull(record.payload.chest_in),
      armIn: numberOrNull(record.payload.arm_in),
      thighIn: numberOrNull(record.payload.thigh_in),
      source: text(record.payload.source) ?? "imported",
      note: text(record.payload.note) ?? "",
      version: record.server_version,
      deletedAt: null,
      serverUpdatedAt: record.server_updated_at
    };
  }
  writeJson(progressKey(), { ...current, version: 5, measurements });
}

function mergeCheckIn(record: SyncPullRecord) {
  const current = { ...defaultProgressState, ...(readJson(progressKey()) ?? {}) };
  const checkIns = current.checkIns && typeof current.checkIns === "object" ? { ...(current.checkIns as unknown as Record<string, Record<string, unknown>>) } : {};
  const existingKey = Object.entries(checkIns).find(([, item]) => item.clientRecordId === record.client_record_id)?.[0];
  const id = existingKey ?? text(record.payload.id) ?? record.client_record_id;
  if (record.deleted_at) {
    if (checkIns[id]) checkIns[id] = { ...checkIns[id], deletedAt: record.deleted_at, version: record.server_version };
  } else {
    checkIns[id] = {
      id,
      clientRecordId: record.client_record_id,
      weekNumber: typeof record.payload.week_number === "number" ? record.payload.week_number : 1,
      checkInDate: text(record.payload.check_in_date) ?? record.server_updated_at.slice(0, 10),
      status: text(record.payload.status) ?? "draft",
      energy: text(record.payload.energy),
      hunger: text(record.payload.hunger),
      digestion: text(record.payload.digestion),
      averageSleepMinutes: numberOrNull(record.payload.average_sleep_minutes),
      privateNote: text(record.payload.private_note) ?? "",
      measurementId: text(record.payload.measurement_id),
      completedAt: text(record.payload.completed_at),
      version: record.server_version,
      deletedAt: null,
      serverUpdatedAt: record.server_updated_at
    };
  }
  writeJson(progressKey(), { ...current, version: 5, checkIns });
}

export function mergePulledRecords(records: SyncPullRecord[], pendingMutations: SyncMutation[]) {
  const blocked = pendingKeys(pendingMutations);
  let downloaded = 0;
  records.forEach((record) => {
    if (!canMerge(record, blocked)) return;
    if (record.entity_type === "meal_log") mergeMeal(record);
    else if (record.entity_type === "workout_session") mergeWorkout(record);
    else if (record.entity_type === "daily_tracking") mergeDailyTracking(record);
    else if (record.entity_type === "body_measurement") mergeMeasurement(record);
    else if (record.entity_type === "weekly_check_in") mergeCheckIn(record);
    else return;
    downloaded += 1;
  });
  return { downloaded };
}
