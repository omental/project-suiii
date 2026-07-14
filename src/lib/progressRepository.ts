import { enqueueMutation, readSyncQueue, writeSyncQueue } from "@/lib/syncQueue";
import { getProgrammeStartDate } from "@/lib/dashboardSelectors";
import { getDhakaDateKey, getProgrammePosition } from "@/lib/dhakaClock";
import type { BodyMeasurement, DigestionLevel, ProgressLocalState, ProgressPose, WeeklyCheckIn, WellbeingLevel } from "@/types/progress";

const progressKey = "project-suiii:phase-5-progress";

export const defaultProgressState: ProgressLocalState = {
  version: 5,
  measurements: {},
  checkIns: {},
  photos: {},
  smokingBaseline: null,
  smokingDailyLimit: 12,
  currentDraftCheckInId: null
};

function id(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function readProgressState(): ProgressLocalState {
  if (typeof window === "undefined") return defaultProgressState;
  try {
    const raw = window.localStorage.getItem(progressKey);
    if (!raw) return defaultProgressState;
    const parsed = JSON.parse(raw) as Partial<ProgressLocalState>;
    if (parsed.version !== 5) return defaultProgressState;
    return { ...defaultProgressState, ...parsed };
  } catch {
    return defaultProgressState;
  }
}

export function writeProgressState(state: ProgressLocalState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(progressKey, JSON.stringify(state));
}

export function resetProgressStateForTests() {
  if (typeof window !== "undefined") window.localStorage.removeItem(progressKey);
}

function enqueue(entityType: "body_measurement" | "weekly_check_in", entityId: string, mutationType: "upsert" | "delete", payload: Record<string, unknown>) {
  const queue = readSyncQueue();
  writeSyncQueue(enqueueMutation(queue, { entity_type: entityType, entity_id: entityId, mutation_type: mutationType, payload }));
}

export function saveMeasurement(state: ProgressLocalState, input: Partial<BodyMeasurement>): ProgressLocalState {
  const now = new Date().toISOString();
  const localDate = getDhakaDateKey();
  const measurement: BodyMeasurement = {
    id: input.id ?? id("measurement"),
    clientRecordId: input.clientRecordId ?? id("measurement-client"),
    measuredAt: input.measuredAt ?? now,
    localDate: input.localDate ?? localDate,
    weightKg: input.weightKg ?? null,
    waistIn: input.waistIn ?? null,
    chestIn: input.chestIn ?? null,
    armIn: input.armIn ?? null,
    thighIn: input.thighIn ?? null,
    source: input.source ?? "manual",
    note: input.note ?? "",
    version: (input.version ?? 0) + 1,
    deletedAt: null
  };
  enqueue("body_measurement", measurement.id, "upsert", {
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
  });
  return { ...state, measurements: { ...state.measurements, [measurement.id]: measurement } };
}

export function deleteMeasurementLocal(state: ProgressLocalState, measurementId: string) {
  const measurement = state.measurements[measurementId];
  if (!measurement) return state;
  enqueue("body_measurement", measurementId, "delete", { client_record_id: measurement.clientRecordId, version: measurement.version });
  return { ...state, measurements: { ...state.measurements, [measurementId]: { ...measurement, deletedAt: new Date().toISOString(), version: measurement.version + 1 } } };
}

export function startOrUpdateDraftCheckIn(
  state: ProgressLocalState,
  input: {
    weightKg?: number | null;
    waistIn?: number | null;
    chestIn?: number | null;
    armIn?: number | null;
    thighIn?: number | null;
    energy?: WellbeingLevel | null;
    hunger?: WellbeingLevel | null;
    digestion?: DigestionLevel | null;
    averageSleepMinutes?: number | null;
    privateNote?: string;
  }
) {
  const now = new Date().toISOString();
  const today = getDhakaDateKey();
  const existing = state.currentDraftCheckInId ? state.checkIns[state.currentDraftCheckInId] : null;
  const measurementState = saveMeasurement(state, {
    weightKg: input.weightKg ?? null,
    waistIn: input.waistIn ?? null,
    chestIn: input.chestIn ?? null,
    armIn: input.armIn ?? null,
    thighIn: input.thighIn ?? null,
    source: "check_in"
  });
  const measurement = Object.values(measurementState.measurements).sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))[0];
  const activityDates = [
    ...Object.values(measurementState.measurements).filter((measurementItem) => !measurementItem.deletedAt).map((measurementItem) => measurementItem.localDate),
    ...Object.values(measurementState.checkIns).filter((checkInItem) => !checkInItem.deletedAt && checkInItem.status === "completed").map((checkInItem) => checkInItem.checkInDate)
  ];
  const programmeStartDate = getProgrammeStartDate(today, activityDates);
  const checkIn: WeeklyCheckIn = {
    id: existing?.id ?? id("check-in"),
    clientRecordId: existing?.clientRecordId ?? id("check-in-client"),
    weekNumber: existing?.weekNumber ?? getProgrammePosition(programmeStartDate, today).week,
    checkInDate: today,
    status: "draft",
    energy: input.energy ?? existing?.energy ?? null,
    hunger: input.hunger ?? existing?.hunger ?? null,
    digestion: input.digestion ?? existing?.digestion ?? null,
    averageSleepMinutes: input.averageSleepMinutes ?? existing?.averageSleepMinutes ?? null,
    privateNote: input.privateNote ?? existing?.privateNote ?? "",
    measurementId: measurement.id,
    completedAt: null,
    version: (existing?.version ?? 0) + 1,
    deletedAt: null
  };
  enqueue("weekly_check_in", checkIn.id, "upsert", {
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
    version: checkIn.version
  });
  return { ...measurementState, checkIns: { ...measurementState.checkIns, [checkIn.id]: checkIn }, currentDraftCheckInId: checkIn.id };
}

export function completeDraftCheckIn(state: ProgressLocalState, checkInId: string) {
  const checkIn = state.checkIns[checkInId];
  if (!checkIn) return state;
  const completed = { ...checkIn, status: "completed" as const, completedAt: new Date().toISOString(), version: checkIn.version + 1 };
  enqueue("weekly_check_in", completed.id, "upsert", {
    client_record_id: completed.clientRecordId,
    week_number: completed.weekNumber,
    check_in_date: completed.checkInDate,
    status: completed.status,
    energy: completed.energy,
    hunger: completed.hunger,
    digestion: completed.digestion,
    average_sleep_minutes: completed.averageSleepMinutes,
    private_note: completed.privateNote,
    measurement_id: null,
    completed_at: completed.completedAt,
    version: completed.version
  });
  return { ...state, checkIns: { ...state.checkIns, [completed.id]: completed }, currentDraftCheckInId: null };
}

export function saveLocalPhoto(state: ProgressLocalState, checkInId: string, pose: ProgressPose, previewUrl: string | null): ProgressLocalState {
  const photoId = id("photo");
  const uploadState: "pending" | "local_only" = previewUrl ? "pending" : "local_only";
  return {
    ...state,
    photos: {
      ...state.photos,
      [photoId]: { id: photoId, checkInId, pose, previewUrl, uploaded: false, uploadState, createdAt: new Date().toISOString() }
    }
  };
}
