import { buildMigrationPreview, readMigrationCompletionMarker } from "@/lib/localMigration";
import { storageKeyFor } from "@/lib/accountStorage";
import { readSyncQueue, writeSyncQueue } from "@/lib/syncQueue";

const phase1Key = () => storageKeyFor("dashboard");
const phase2Key = () => storageKeyFor("nutrition");
const phase3Key = () => storageKeyFor("training");
const progressKey = () => storageKeyFor("progress");
const programmeProfileKey = () => storageKeyFor("programmeProfile");
const exportMetaKey = () => storageKeyFor("exportMeta");

export type DeviceCategoryId = "nutrition" | "workouts" | "daily_tracking" | "measurements" | "check_ins" | "photos" | "pending_sync" | "dashboard";

export type DeviceRecordStatus = "pending" | "imported" | "rejected" | "local" | "needs_attention";

export type DeviceRecordSummary = {
  id: string;
  categoryId: DeviceCategoryId;
  title: string;
  subtitle: string;
  date: string | null;
  status: DeviceRecordStatus;
  technicalDetails: Record<string, unknown>;
  safeIssue?: string;
};

export type DeviceCategorySummary = {
  id: DeviceCategoryId;
  name: string;
  total: number;
  pending: number;
  imported: number;
  rejected: number;
  earliestDate: string | null;
  latestDate: string | null;
  records: DeviceRecordSummary[];
};

export type DeviceDataSummary = {
  categories: DeviceCategorySummary[];
  totalSupportedRecords: number;
  totalPendingRecords: number;
  schemaVersions: Record<string, number | "malformed" | "missing">;
  deviceIdDisplay: string;
  deviceName: string;
  lastSuccessfulImportAt: string | null;
  legacyRecordsAwaitingImport: number;
  pendingSyncChanges: number;
  migrationStatus: "completed" | "not_required" | "pending";
  conflictsNeedingAttention: number;
  lastExportAt: string | null;
  photoBinaryIncluded: false;
  photoMetadataCount: number;
  malformedRecords: DeviceRecordSummary[];
};

export type DeviceDataExportEnvelope = {
  application: "Project SUIII";
  exportType: "device-backup";
  formatVersion: 1;
  exportedAt: string;
  timezone: "Asia/Dhaka";
  device: { deviceId: string; deviceName: string };
  summary: Omit<DeviceDataSummary, "categories" | "malformedRecords"> & { categories: Omit<DeviceCategorySummary, "records">[] };
  data: Record<string, unknown>;
  recovery: { malformedRecords: DeviceRecordSummary[] };
  notes: string[];
};

function readJson(key: string): { ok: true; value: Record<string, unknown> | null } | { ok: false; raw: string } {
  if (typeof window === "undefined") return { ok: true, value: null };
  const raw = window.localStorage.getItem(key);
  if (!raw) return { ok: true, value: null };
  try {
    return { ok: true, value: JSON.parse(raw) as Record<string, unknown> };
  } catch {
    return { ok: false, raw };
  }
}

function objectValues(value: unknown): Record<string, unknown>[] {
  return value && typeof value === "object" ? Object.values(value as Record<string, Record<string, unknown>>) : [];
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function dateFrom(value: unknown): string | null {
  const text = asString(value);
  return text ? text.slice(0, 10) : null;
}

function category(id: DeviceCategoryId, name: string, records: DeviceRecordSummary[]): DeviceCategorySummary {
  const dates = records.map((record) => record.date).filter(Boolean).sort() as string[];
  return {
    id,
    name,
    total: records.length,
    pending: records.filter((record) => record.status === "pending").length,
    imported: records.filter((record) => record.status === "imported").length,
    rejected: records.filter((record) => record.status === "rejected" || record.status === "needs_attention").length,
    earliestDate: dates[0] ?? null,
    latestDate: dates.at(-1) ?? null,
    records
  };
}

function malformedRecord(categoryId: DeviceCategoryId, id: string, label: string, raw: unknown): DeviceRecordSummary {
  return {
    id,
    categoryId,
    title: label,
    subtitle: "Needs attention",
    date: null,
    status: "needs_attention",
    safeIssue: "This local record could not be read safely, but it is retained for export and recovery.",
    technicalDetails: { raw }
  };
}

function summarizeMeal(item: Record<string, unknown>, index: number): DeviceRecordSummary {
  const id = asString(item.id) ?? `meal-${index}`;
  const date = asString(item.date);
  if (!date) return malformedRecord("nutrition", id, "Meal log", item);
  return {
    id,
    categoryId: "nutrition",
    title: `${date} · ${asString(item.mealDefinitionId) ?? "Meal"}`,
    subtitle: `${asString(item.status) ?? "saved"}${asString(item.completedAt) ? ` · completed ${asString(item.completedAt)}` : ""}`,
    date,
    status: "local",
    technicalDetails: { id, mealDefinitionId: item.mealDefinitionId, status: item.status, startedAt: item.startedAt, completedAt: item.completedAt }
  };
}

function summarizeWorkout(item: Record<string, unknown>, index: number): DeviceRecordSummary {
  const id = asString(item.id) ?? `workout-${index}`;
  const date = asString(item.date);
  if (!date) return malformedRecord("workouts", id, "Workout session", item);
  const exercises = objectValues(item.exerciseSessions);
  const sets = exercises.reduce((total, exercise) => total + (Array.isArray(exercise.setLogs) ? exercise.setLogs.length : 0), 0);
  return {
    id,
    categoryId: "workouts",
    title: `${date} · ${asString(item.workoutDefinitionId) ?? "Workout"}`,
    subtitle: `${sets} sets · ${asString(item.status) ?? "saved"}`,
    date,
    status: "local",
    technicalDetails: { id, workoutDefinitionId: item.workoutDefinitionId, status: item.status, startedAt: item.startedAt, completedAt: item.completedAt }
  };
}

function summarizeReadiness(item: Record<string, unknown>, fallbackDate: string): DeviceRecordSummary {
  const date = asString(item.date) ?? fallbackDate;
  return {
    id: asString(item.id) ?? `readiness-${date}`,
    categoryId: "daily_tracking",
    title: `${date} · Daily check-in`,
    subtitle: `Energy ${asString(item.energy) ?? "not set"} · soreness ${String(item.soreness ?? "not set")}`,
    date,
    status: "local",
    technicalDetails: { id: item.id, badmintonGames: item.badmintonGames, energy: item.energy, soreness: item.soreness, sleepHours: item.sleepHours }
  };
}

function summarizeMeasurement(item: Record<string, unknown>, index: number): DeviceRecordSummary {
  const id = asString(item.id) ?? `measurement-${index}`;
  const date = asString(item.localDate) ?? dateFrom(item.measuredAt);
  if (!date) return malformedRecord("measurements", id, "Measurement", item);
  return {
    id,
    categoryId: "measurements",
    title: `${date} · Measurement`,
    subtitle: `Weight ${String(item.weightKg ?? "not logged")} kg · Waist ${String(item.waistIn ?? "not logged")} in`,
    date,
    status: "local",
    technicalDetails: { id, clientRecordId: item.clientRecordId, measuredAt: item.measuredAt, localDate: item.localDate, note: item.note }
  };
}

function summarizeCheckIn(item: Record<string, unknown>, index: number): DeviceRecordSummary {
  const id = asString(item.id) ?? `check-in-${index}`;
  const date = asString(item.checkInDate);
  if (!date) return malformedRecord("check_ins", id, "Weekly check-in", item);
  return {
    id,
    categoryId: "check_ins",
    title: `Week ${String(item.weekNumber ?? "?")} · ${date}`,
    subtitle: `${asString(item.status) ?? "saved"} · energy ${asString(item.energy) ?? "not set"}`,
    date,
    status: "local",
    technicalDetails: { id, clientRecordId: item.clientRecordId, status: item.status, completedAt: item.completedAt, measurementId: item.measurementId }
  };
}

function summarizePhoto(item: Record<string, unknown>, index: number): DeviceRecordSummary {
  const id = asString(item.id) ?? `photo-${index}`;
  return {
    id,
    categoryId: "photos",
    title: `${asString(item.pose) ?? "Progress"} photo`,
    subtitle: item.previewUrl ? "Metadata included · image binary not included" : "Metadata only",
    date: dateFrom(item.createdAt),
    status: asString(item.uploadState) === "uploaded" ? "imported" : "pending",
    technicalDetails: { id, checkInId: item.checkInId, pose: item.pose, uploadState: item.uploadState, createdAt: item.createdAt, hasPreviewUrl: Boolean(item.previewUrl) }
  };
}

function safeVersion(value: { ok: true; value: Record<string, unknown> | null } | { ok: false }): number | "malformed" | "missing" {
  if (!value.ok) return "malformed";
  if (!value.value) return "missing";
  return typeof value.value.version === "number" ? value.value.version : "malformed";
}

function abbreviateDeviceId(deviceId: string) {
  return deviceId.length <= 10 ? deviceId : `${deviceId.slice(0, 6)}…${deviceId.slice(-4)}`;
}

export function getDeviceDataSummary(): DeviceDataSummary {
  const dashboardKey = phase1Key();
  const nutritionKey = phase2Key();
  const trainingKey = phase3Key();
  const progressStorageKey = progressKey();
  const profileKey = programmeProfileKey();
  const nutrition = readJson(nutritionKey);
  const training = readJson(trainingKey);
  const progress = readJson(progressStorageKey);
  const phase1 = readJson(dashboardKey);
  const profile = readJson(profileKey);
  const queue = readSyncQueue();
  const exportMeta = readJson(exportMetaKey());

  const malformedRecords: DeviceRecordSummary[] = [];
  const meals = nutrition.ok ? objectValues(nutrition.value?.mealLogs).map(summarizeMeal) : [malformedRecord("nutrition", nutritionKey, "Nutrition storage", nutrition.raw)];
  const workouts = training.ok ? objectValues(training.value?.sessions).map(summarizeWorkout) : [malformedRecord("workouts", trainingKey, "Training storage", training.raw)];
  const readiness = training.ok && training.value?.readinessByDate && typeof training.value.readinessByDate === "object"
    ? Object.entries(training.value.readinessByDate as Record<string, Record<string, unknown>>).map(([date, item]) => summarizeReadiness(item, date))
    : [];
  const measurements = progress.ok ? objectValues(progress.value?.measurements).map(summarizeMeasurement) : [malformedRecord("measurements", progressStorageKey, "Progress storage", progress.raw)];
  const checkIns = progress.ok ? objectValues(progress.value?.checkIns).map(summarizeCheckIn) : [];
  const photos = progress.ok ? objectValues(progress.value?.photos).map(summarizePhoto) : [];
  const pending = [...queue.pending, ...queue.failed].map((item, index) => ({
    id: item.client_mutation_id,
    categoryId: "pending_sync" as const,
    title: `${item.entity_type.replaceAll("_", " ")} · ${item.mutation_type}`,
    subtitle: item.created_at,
    date: dateFrom(item.created_at),
    status: "pending" as const,
    technicalDetails: { index, clientMutationId: item.client_mutation_id, entityType: item.entity_type, entityId: item.entity_id, mutationType: item.mutation_type }
  }));

  const categories = [
    category("nutrition", "Nutrition", meals),
    category("workouts", "Workouts", workouts),
    category("daily_tracking", "Daily tracking", readiness),
    category("measurements", "Measurements", measurements),
    category("check_ins", "Weekly check-ins", checkIns),
    category("photos", "Progress photos", photos),
    category("pending_sync", "Pending sync changes", pending),
    category("dashboard", "Dashboard profile", phase1.ok && phase1.value ? [{ id: dashboardKey, categoryId: "dashboard", title: "Dashboard local state", subtitle: "Water, cigarettes and timeline state", date: null, status: "local", technicalDetails: { hasLocalState: true } }] : [])
  ];
  categories.forEach((item) => malformedRecords.push(...item.records.filter((record) => record.status === "needs_attention")));
  const preview = buildMigrationPreview();
  const marker = readMigrationCompletionMarker(null, queue.deviceId);
  const pendingSyncChanges = queue.pending.length + queue.failed.length;
  const conflictsNeedingAttention = queue.failed.length + malformedRecords.length;
  return {
    categories,
    totalSupportedRecords: categories.reduce((total, item) => total + item.total, 0),
    totalPendingRecords: preview.total_records + pendingSyncChanges,
    schemaVersions: {
      dashboard: safeVersion(phase1),
      nutrition: safeVersion(nutrition),
      training: safeVersion(training),
      progress: safeVersion(progress),
      programmeProfile: profile.ok && profile.value ? 1 : profile.ok ? "missing" : "malformed"
    },
    deviceIdDisplay: abbreviateDeviceId(queue.deviceId),
    deviceName: queue.deviceName,
    lastSuccessfulImportAt: queue.lastSyncAt,
    legacyRecordsAwaitingImport: preview.total_records,
    pendingSyncChanges,
    migrationStatus: marker ? "completed" : preview.total_records > 0 ? "pending" : "not_required",
    conflictsNeedingAttention,
    lastExportAt: exportMeta.ok ? asString(exportMeta.value?.lastExportAt) : null,
    photoBinaryIncluded: false,
    photoMetadataCount: photos.length,
    malformedRecords
  };
}

export function buildDeviceDataExport(now = new Date()): DeviceDataExportEnvelope {
  const queue = readSyncQueue();
  const summary = getDeviceDataSummary();
  const categories = summary.categories.map(({ records, ...item }) => item);
  const dashboard = readJson(phase1Key());
  const nutrition = readJson(phase2Key());
  const training = readJson(phase3Key());
  const progress = readJson(progressKey());
  const profile = readJson(programmeProfileKey());
  const data = {
    dashboard: dashboard.ok ? dashboard.value : null,
    nutrition: nutrition.ok ? nutrition.value : null,
    training: training.ok ? training.value : null,
    progress: progress.ok ? progress.value : null,
    programmeProfile: profile.ok ? profile.value : null,
    pendingSync: { pending: queue.pending, failed: queue.failed, lastSyncAt: queue.lastSyncAt, recentActivity: queue.recentActivity }
  };
  return {
    application: "Project SUIII",
    exportType: "device-backup",
    formatVersion: 1,
    exportedAt: now.toISOString(),
    timezone: "Asia/Dhaka",
    device: { deviceId: queue.deviceId, deviceName: queue.deviceName },
    summary: { ...summary, categories },
    data,
    recovery: { malformedRecords: summary.malformedRecords },
    notes: ["Authentication cookies, CSRF tokens, API URLs and environment configuration are excluded.", "Photo image files are not included in this JSON backup; progress photo metadata is included."]
  };
}

export function backupFilename(now = new Date()) {
  return `project-suiii-device-backup-${now.toISOString().replace(/[-:]/g, "").slice(0, 15).replace("T", "-")}.json`;
}

export function markDeviceDataExported(exportedAt: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(exportMetaKey(), JSON.stringify({ lastExportAt: exportedAt }));
}

export function downloadDeviceDataBackup(now = new Date()) {
  const envelope = buildDeviceDataExport(now);
  const filename = backupFilename(now);
  const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  markDeviceDataExported(envelope.exportedAt);
  return { filename, recordCount: envelope.summary.totalSupportedRecords, envelope };
}
