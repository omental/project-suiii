import { getCanonicalAccountIdentity, storageKeyFor } from "@/lib/accountStorage";
import { readSyncQueue, upsertPendingMutation, writeSyncQueue } from "@/lib/syncQueue";
import type { BodyMeasurement, ProgressLocalState, WeeklyCheckIn } from "@/types/progress";
import type { SyncEntityType, SyncMutation, SyncQueueState } from "@/types/sync";
import type { MealLog, Phase2LocalState } from "@/types/nutrition";
import type { Phase3TrainingState, ReadinessCheckIn, WorkoutSession } from "@/types/training";

export type OutboxRepairResult = {
  repaired: number;
  unsupported: number;
  accountInitialized: boolean;
  queue: SyncQueueState;
};

type QueueMutationInput = Omit<SyncMutation, "client_mutation_id" | "device_id" | "created_at">;

function hasServerConfirmation(record: unknown) {
  return Boolean(record && typeof record === "object" && "serverUpdatedAt" in record);
}

function readStoredState<T>(domain: "nutrition" | "training" | "progress", fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(storageKeyFor(domain));
    return raw ? { ...fallback, ...JSON.parse(raw) as Partial<T> } as T : fallback;
  } catch {
    return fallback;
  }
}

function mutationKey(entityType: SyncEntityType, entityId: string, mutationType: "upsert" | "delete") {
  return `${entityType}:${entityId}:${mutationType}`;
}

function existingMutationKeys(queue: SyncQueueState) {
  const keys = new Set<string>();
  [...queue.pending, ...queue.failed].forEach((mutation) => keys.add(mutationKey(mutation.entity_type, mutation.entity_id, mutation.mutation_type)));
  return keys;
}

export function mealLogMutation(log: MealLog): QueueMutationInput {
  return {
    entity_type: "meal_log",
    entity_id: log.id,
    mutation_type: "upsert",
    payload: {
      client_record_id: log.id,
      local_date: log.date,
      definition_id: log.mealDefinitionId,
      status: log.status,
      started_at: log.startedAt,
      completed_at: log.completedAt,
      updated_at: log.updatedAt,
      version: Number((log as MealLog & { version?: unknown }).version ?? 1),
      payload: log
    }
  };
}

export function workoutSessionMutation(session: WorkoutSession): QueueMutationInput {
  return {
    entity_type: "workout_session",
    entity_id: session.id,
    mutation_type: "upsert",
    payload: {
      client_record_id: session.id,
      local_date: session.date,
      definition_id: session.workoutDefinitionId,
      status: session.status,
      started_at: session.startedAt,
      completed_at: session.completedAt,
      updated_at: session.updatedAt,
      version: Number((session as WorkoutSession & { version?: unknown }).version ?? 3),
      payload: session
    }
  };
}

export function dailyTrackingMutation(readiness: ReadinessCheckIn): QueueMutationInput {
  return {
    entity_type: "daily_tracking",
    entity_id: readiness.date,
    mutation_type: "upsert",
    payload: {
      client_record_id: readiness.date,
      tracking_date: readiness.date,
      badminton_games: readiness.badmintonGames,
      energy: readiness.energy,
      soreness: readiness.soreness,
      sleep_minutes: typeof readiness.sleepHours === "number" ? Math.round(readiness.sleepHours * 60) : null,
      notes: readiness.note,
      version: Number((readiness as ReadinessCheckIn & { version?: unknown }).version ?? 1)
    }
  };
}

export function bodyMeasurementMutation(measurement: BodyMeasurement, mutationType: "upsert" | "delete" = "upsert"): QueueMutationInput {
  return {
    entity_type: "body_measurement",
    entity_id: measurement.id,
    mutation_type: mutationType,
    payload: {
      client_record_id: measurement.clientRecordId,
      measured_at: measurement.measuredAt,
      local_date: measurement.localDate,
      weight_kg: measurement.weightKg,
      waist_in: measurement.waistIn,
      chest_in: measurement.chestIn,
      arm_in: measurement.armIn,
      thigh_in: measurement.thighIn,
      source: measurement.source,
      note: measurement.note,
      version: measurement.version
    }
  };
}

export function weeklyCheckInMutation(checkIn: WeeklyCheckIn, mutationType: "upsert" | "delete" = "upsert"): QueueMutationInput {
  return {
    entity_type: "weekly_check_in",
    entity_id: checkIn.id,
    mutation_type: mutationType,
    payload: {
      client_record_id: checkIn.clientRecordId,
      week_number: checkIn.weekNumber,
      check_in_date: checkIn.checkInDate,
      status: checkIn.status,
      energy: checkIn.energy,
      hunger: checkIn.hunger,
      digestion: checkIn.digestion,
      average_sleep_minutes: checkIn.averageSleepMinutes,
      private_note: checkIn.privateNote,
      measurement_id: null,
      completed_at: checkIn.completedAt,
      version: checkIn.version
    }
  };
}

export function queueLocalMutation(mutation: QueueMutationInput) {
  if (typeof window === "undefined") return;
  try {
    writeSyncQueue(upsertPendingMutation(readSyncQueue(), mutation));
  } catch {
    // The calling repository has already kept the local record visible.
  }
}

export function queueMealLogMutation(log: MealLog) {
  queueLocalMutation(mealLogMutation(log));
}

export function queueWorkoutSessionMutation(session: WorkoutSession) {
  queueLocalMutation(workoutSessionMutation(session));
}

export function queueDailyTrackingMutation(readiness: ReadinessCheckIn) {
  queueLocalMutation(dailyTrackingMutation(readiness));
}

export function queueBodyMeasurementMutation(measurement: BodyMeasurement, mutationType: "upsert" | "delete" = "upsert") {
  queueLocalMutation(bodyMeasurementMutation(measurement, mutationType));
}

export function queueWeeklyCheckInMutation(checkIn: WeeklyCheckIn, mutationType: "upsert" | "delete" = "upsert") {
  queueLocalMutation(weeklyCheckInMutation(checkIn, mutationType));
}

function addIfMissing(queue: SyncQueueState, keys: Set<string>, mutation: QueueMutationInput) {
  const key = mutationKey(mutation.entity_type, mutation.entity_id, mutation.mutation_type);
  if (keys.has(key)) return { queue, added: false };
  keys.add(key);
  return { queue: upsertPendingMutation(queue, mutation), added: true };
}

export function repairMissingOutboxMutations(): OutboxRepairResult {
  const queue = readSyncQueue();
  if (typeof window === "undefined") return { repaired: 0, unsupported: 0, accountInitialized: false, queue };
  if (!getCanonicalAccountIdentity()) return { repaired: 0, unsupported: 0, accountInitialized: false, queue };

  let nextQueue = queue;
  let repaired = 0;
  const keys = existingMutationKeys(queue);
  const nutrition = readStoredState<Phase2LocalState>("nutrition", {
    version: 2,
    waterIncrementsMl: [],
    cigaretteIncrements: [],
    completedTimelineIds: [],
    weighing: { actionId: "", actualGrams: null, completed: false },
    mealLogs: {},
    weighingSessions: {}
  });
  const training = readStoredState<Phase3TrainingState>("training", {
    version: 3,
    sessions: {},
    activeSessionId: null,
    readinessByDate: {},
    uncomfortableExerciseIds: [],
    progressionRecommendations: {}
  });
  const progress: ProgressLocalState = readStoredState<ProgressLocalState>("progress", {
    version: 5,
    measurements: {},
    checkIns: {},
    photos: {},
    smokingBaseline: null,
    smokingDailyLimit: 12,
    currentDraftCheckInId: null
  });

  const maybeAdd = (mutation: QueueMutationInput) => {
    const result = addIfMissing(nextQueue, keys, mutation);
    nextQueue = result.queue;
    if (result.added) repaired += 1;
  };

  Object.values(nutrition.mealLogs).forEach((log) => {
    if (!hasServerConfirmation(log)) maybeAdd(mealLogMutation(log));
  });
  Object.values(training.sessions).forEach((session) => {
    if (!hasServerConfirmation(session)) maybeAdd(workoutSessionMutation(session));
  });
  Object.values(training.readinessByDate).forEach((readiness) => {
    if (!hasServerConfirmation(readiness)) maybeAdd(dailyTrackingMutation(readiness));
  });
  Object.values(progress.measurements).forEach((measurement) => {
    if (!hasServerConfirmation(measurement)) maybeAdd(bodyMeasurementMutation(measurement, measurement.deletedAt ? "delete" : "upsert"));
  });
  Object.values(progress.checkIns).forEach((checkIn) => {
    if (!hasServerConfirmation(checkIn)) maybeAdd(weeklyCheckInMutation(checkIn, checkIn.deletedAt ? "delete" : "upsert"));
  });

  const unsupported = Object.values(progress.photos).filter((photo) => photo.uploadState === "pending" || photo.uploadState === "failed").length;
  if (repaired > 0) writeSyncQueue(nextQueue);
  return { repaired, unsupported, accountInitialized: true, queue: nextQueue };
}
