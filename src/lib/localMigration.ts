import type { MigrationPreview, MigrationResponse, SyncMutation } from "@/types/sync";

const phase2Key = "project-suiii:phase-2-nutrition";
const phase3Key = "project-suiii:phase-3-training";

function readJson(key: string) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export function buildMigrationPreview(): MigrationPreview {
  const nutrition = readJson(phase2Key);
  const training = readJson(phase3Key);
  const mealLogs = nutrition?.mealLogs && typeof nutrition.mealLogs === "object" ? Object.keys(nutrition.mealLogs).length : 0;
  const sessions = training?.sessions && typeof training.sessions === "object" ? Object.values(training.sessions as Record<string, { exerciseSessions?: { setLogs?: unknown[] }[] }> ) : [];
  const workoutSessions = sessions.length;
  const sets = sessions.reduce((total, session) => total + (session.exerciseSessions ?? []).reduce((sum, exercise) => sum + (exercise.setLogs?.length ?? 0), 0), 0);
  const dailyCheckIns = training?.readinessByDate && typeof training.readinessByDate === "object" ? Object.keys(training.readinessByDate).length : 0;
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
  const nutrition = readJson(phase2Key);
  const training = readJson(phase3Key);
  const now = new Date().toISOString();
  const mutations: SyncMutation[] = [];
  const mealLogs = nutrition?.mealLogs as Record<string, { id: string; date: string; mealDefinitionId: string; status: string; startedAt: string | null; completedAt: string | null }> | undefined;
  Object.values(mealLogs ?? {}).forEach((log) => {
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
  const sessions = training?.sessions as Record<string, { id: string; date: string; workoutDefinitionId: string; status: string; startedAt: string; completedAt: string | null }> | undefined;
  Object.values(sessions ?? {}).forEach((session) => {
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
  const readinessByDate = training?.readinessByDate as Record<string, { date?: string; badmintonGames?: number; energy?: string; soreness?: number; sleepHours?: number | null; note?: string }> | undefined;
  Object.entries(readinessByDate ?? {}).forEach(([date, checkIn]) => {
    mutations.push({
      client_mutation_id: `migrate-daily-${date}`,
      device_id: deviceId,
      entity_type: "daily_tracking",
      entity_id: `daily-${date}`,
      mutation_type: "upsert",
      created_at: now,
      payload: {
        tracking_date: checkIn.date ?? date,
        water_ml: 0,
        cigarettes: 0,
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

  const nutrition = readJson(phase2Key);
  if (nutrition?.mealLogs && typeof nutrition.mealLogs === "object") {
    const nextMealLogs = { ...(nutrition.mealLogs as Record<string, unknown>) };
    mealIds.forEach((id) => {
      delete nextMealLogs[id];
    });
    window.localStorage.setItem(phase2Key, JSON.stringify({ ...nutrition, mealLogs: nextMealLogs }));
  }

  const training = readJson(phase3Key);
  if (training) {
    const nextSessions = training.sessions && typeof training.sessions === "object" ? { ...(training.sessions as Record<string, unknown>) } : {};
    const nextReadiness = training.readinessByDate && typeof training.readinessByDate === "object" ? { ...(training.readinessByDate as Record<string, unknown>) } : {};
    workoutIds.forEach((id) => {
      delete nextSessions[id];
    });
    dailyDates.forEach((date) => {
      delete nextReadiness[date];
    });
    window.localStorage.setItem(phase3Key, JSON.stringify({ ...training, sessions: nextSessions, readinessByDate: nextReadiness }));
  }

  return buildMigrationPreview();
}
