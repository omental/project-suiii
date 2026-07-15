import { storageKeyFor } from "@/lib/accountStorage";
import type { MigrationPreview, MigrationResponse, SyncMutation } from "@/types/sync";

const phase2Key = () => storageKeyFor("nutrition");
const phase3Key = () => storageKeyFor("training");
const migrationVersion = 1;
const markerPrefix = "project-suiii:migration:v1";

type LegacyRecord = Record<string, unknown> & {
  id?: string;
  date?: string;
  pendingMigration?: boolean;
  legacyMigration?: boolean;
  migratedAt?: string | null;
};

type LegacyWorkoutRecord = LegacyRecord & {
  exerciseSessions?: { setLogs?: unknown[] }[];
};

type LegacyMealLog = LegacyRecord & {
  id: string;
  date: string;
  mealDefinitionId: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
};

type LegacyWorkoutSession = LegacyWorkoutRecord & {
  id: string;
  date: string;
  workoutDefinitionId: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
};

type LegacyReadiness = LegacyRecord & {
  date?: string;
  badmintonGames?: number;
  energy?: string;
  soreness?: number;
  sleepHours?: number | null;
  note?: string;
};

export type MigrationCompletionMarker = {
  migrationVersion: 1;
  completedAt: string;
  accountId: string;
  deviceId: string;
  resultSummary: Record<string, unknown>;
};

function readJson(key: string) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function isPendingLegacyRecord(record: unknown, storageVersion?: unknown, currentVersion?: number): record is LegacyRecord {
  if (!record || typeof record !== "object") return false;
  const item = record as LegacyRecord;
  if (item.migratedAt) return false;
  if (item.pendingMigration === true || item.legacyMigration === true) return true;
  if (currentVersion === undefined) return false;
  return storageVersion !== currentVersion && (typeof item.id === "string" || typeof item.date === "string");
}

function migrationMarkerKey(accountId: string, deviceId: string) {
  return `${markerPrefix}:${accountId}:${deviceId}`;
}

export function readMigrationCompletionMarker(accountId: string | null | undefined, deviceId: string): MigrationCompletionMarker | null {
  if (typeof window === "undefined" || !accountId) return null;
  try {
    const raw = window.localStorage.getItem(migrationMarkerKey(accountId, deviceId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MigrationCompletionMarker>;
    if (parsed.migrationVersion !== migrationVersion || parsed.accountId !== accountId || parsed.deviceId !== deviceId || !parsed.completedAt) return null;
    return parsed as MigrationCompletionMarker;
  } catch {
    return null;
  }
}

export function writeMigrationCompletionMarker(accountId: string, deviceId: string, resultSummary: Record<string, unknown>, completedAt = new Date().toISOString()) {
  if (typeof window === "undefined") return;
  const marker: MigrationCompletionMarker = {
    migrationVersion,
    completedAt,
    accountId,
    deviceId,
    resultSummary
  };
  window.localStorage.setItem(migrationMarkerKey(accountId, deviceId), JSON.stringify(marker));
}

export function hasCompletedMigration(accountId: string | null | undefined, deviceId: string) {
  return Boolean(readMigrationCompletionMarker(accountId, deviceId));
}

export function buildMigrationPreview(): MigrationPreview {
  const nutrition = readJson(phase2Key());
  const training = readJson(phase3Key());
  const mealEntries = nutrition?.mealLogs && typeof nutrition.mealLogs === "object" ? Object.values(nutrition.mealLogs).filter((record) => isPendingLegacyRecord(record, nutrition.version, 2)) : [];
  const mealLogs = mealEntries.length;
  const sessions: LegacyWorkoutRecord[] = training?.sessions && typeof training.sessions === "object"
    ? Object.values(training.sessions as Record<string, LegacyWorkoutRecord>).filter((record) => isPendingLegacyRecord(record, training.version, 3))
    : [];
  const workoutSessions = sessions.length;
  const sets = sessions.reduce((total, session) => total + (session.exerciseSessions ?? []).reduce((sum, exercise) => sum + (exercise.setLogs?.length ?? 0), 0), 0);
  const dailyCheckIns = training?.readinessByDate && typeof training.readinessByDate === "object" ? Object.values(training.readinessByDate).filter((record) => isPendingLegacyRecord(record, training.version, 3)).length : 0;
  const total = mealLogs + workoutSessions + dailyCheckIns;
  return {
    meal_logs: mealLogs,
    workout_sessions: workoutSessions,
    daily_check_ins: dailyCheckIns,
    sets,
    date_range: total ? "14-20 July" : "No local records",
    total_records: total
  };
}

export function buildMigrationMutations(deviceId: string): SyncMutation[] {
  const nutrition = readJson(phase2Key());
  const training = readJson(phase3Key());
  const now = new Date().toISOString();
  const mutations: SyncMutation[] = [];
  const mealLogs = nutrition?.mealLogs as Record<string, LegacyMealLog> | undefined;
  Object.values(mealLogs ?? {}).filter((record) => isPendingLegacyRecord(record, nutrition?.version, 2)).forEach((log) => {
    mutations.push({
      client_mutation_id: `migrate-meal-${log.id}`,
      device_id: deviceId,
      entity_type: "meal_log",
      entity_id: log.id,
      mutation_type: "upsert",
      created_at: now,
      payload: {
        client_record_id: log.id,
        local_date: log.date,
        definition_id: log.mealDefinitionId,
        status: log.status,
        payload: log,
        started_at: log.startedAt,
        completed_at: log.completedAt,
        version: 1
      }
    });
  });
  const sessions = training?.sessions as Record<string, LegacyWorkoutSession> | undefined;
  Object.values(sessions ?? {}).filter((record) => isPendingLegacyRecord(record, training?.version, 3)).forEach((session) => {
    mutations.push({
      client_mutation_id: `migrate-workout-${session.id}`,
      device_id: deviceId,
      entity_type: "workout_session",
      entity_id: session.id,
      mutation_type: "upsert",
      created_at: now,
      payload: {
        client_record_id: session.id,
        local_date: session.date,
        definition_id: session.workoutDefinitionId,
        status: session.status,
        payload: session,
        started_at: session.startedAt,
        completed_at: session.completedAt,
        version: 1
      }
    });
  });
  const readinessByDate = training?.readinessByDate as Record<string, LegacyReadiness> | undefined;
  Object.entries(readinessByDate ?? {}).filter(([, checkIn]) => isPendingLegacyRecord(checkIn, training?.version, 3)).forEach(([date, checkIn]) => {
    mutations.push({
      client_mutation_id: `migrate-daily-${date}`,
      device_id: deviceId,
      entity_type: "daily_tracking",
      entity_id: `daily-${date}`,
      mutation_type: "upsert",
      created_at: now,
      payload: {
        tracking_date: checkIn.date ?? date,
        badminton_games: checkIn.badmintonGames ?? null,
        energy: checkIn.energy ?? null,
        soreness: checkIn.soreness ?? null,
        sleep_minutes: checkIn.sleepHours === null || checkIn.sleepHours === undefined ? null : Math.round(Number(checkIn.sleepHours) * 60),
        notes: checkIn.note ?? null,
        version: 1
      }
    });
  });
  return mutations;
}

export function completeConfirmedMigrationRecords(response: MigrationResponse, records: SyncMutation[]) {
  if (typeof window === "undefined") return buildMigrationPreview();
  const rejectedIds = new Set((response.summary.rejected_items ?? []).map((item) => item.client_record_id));
  const confirmed = records.filter((record) => {
    const clientRecordId = typeof record.payload.client_record_id === "string" ? record.payload.client_record_id : record.entity_id.replace(/^daily-/, "");
    return !rejectedIds.has(clientRecordId);
  });

  const mealIds = new Set(confirmed.filter((record) => record.entity_type === "meal_log").map((record) => String(record.payload.client_record_id)));
  const workoutIds = new Set(confirmed.filter((record) => record.entity_type === "workout_session").map((record) => String(record.payload.client_record_id)));
  const dailyDates = new Set(confirmed.filter((record) => record.entity_type === "daily_tracking").map((record) => String(record.payload.tracking_date ?? record.entity_id.replace(/^daily-/, ""))));

  const nutrition = readJson(phase2Key());
  if (nutrition?.mealLogs && typeof nutrition.mealLogs === "object") {
    const nextMealLogs = { ...(nutrition.mealLogs as Record<string, unknown>) };
    mealIds.forEach((id) => {
      const item = nextMealLogs[id];
      nextMealLogs[id] = item && typeof item === "object" ? { ...item as Record<string, unknown>, pendingMigration: false, migratedAt: new Date().toISOString() } : item;
    });
    window.localStorage.setItem(phase2Key(), JSON.stringify({ ...nutrition, mealLogs: nextMealLogs }));
  }

  const training = readJson(phase3Key());
  if (training) {
    const nextSessions = training.sessions && typeof training.sessions === "object" ? { ...(training.sessions as Record<string, unknown>) } : {};
    const nextReadiness = training.readinessByDate && typeof training.readinessByDate === "object" ? { ...(training.readinessByDate as Record<string, unknown>) } : {};
    workoutIds.forEach((id) => {
      const item = nextSessions[id];
      nextSessions[id] = item && typeof item === "object" ? { ...item as Record<string, unknown>, pendingMigration: false, migratedAt: new Date().toISOString() } : item;
    });
    dailyDates.forEach((date) => {
      const item = nextReadiness[date];
      nextReadiness[date] = item && typeof item === "object" ? { ...item as Record<string, unknown>, pendingMigration: false, migratedAt: new Date().toISOString() } : item;
    });
    window.localStorage.setItem(phase3Key(), JSON.stringify({ ...training, sessions: nextSessions, readinessByDate: nextReadiness }));
  }

  return buildMigrationPreview();
}
