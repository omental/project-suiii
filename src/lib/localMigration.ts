import type { MigrationPreview, SyncMutation } from "@/types/sync";

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
  return mutations;
}
