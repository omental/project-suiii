import { buildDeviceDataExport, type DeviceDataExportEnvelope } from "@/lib/deviceData";

const maxBackupBytes = 5 * 1024 * 1024;
const restoreActivityKey = "project-suiii:device-restore-activity";
const supportedFormatVersion = 1;
const allowedDataKeys = new Set(["dashboard", "nutrition", "training", "progress", "programmeProfile", "pendingSync"]);

export type RestorePreview = {
  status: "ready" | "error";
  message: string;
  recordsFound: number;
  newRecords: number;
  identicalRecords: number;
  conflicts: number;
  malformedRecords: number;
  unsupportedRecords: number;
  envelope?: DeviceDataExportEnvelope;
};

function countObjectRecords(value: unknown) {
  if (!value || typeof value !== "object") return 0;
  return Object.values(value as Record<string, unknown>).filter((item) => item && typeof item === "object").length;
}

export function validateDeviceBackupText(text: string, current = buildDeviceDataExport()): RestorePreview {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return errorPreview("Malformed JSON. Choose a Project SUIII device backup file.");
  }
  if (!parsed || typeof parsed !== "object") return errorPreview("Malformed backup file.");
  const envelope = parsed as Partial<DeviceDataExportEnvelope>;
  if (envelope.application !== "Project SUIII" || envelope.exportType !== "device-backup") return errorPreview("This file is not a Project SUIII device backup.");
  if (typeof envelope.formatVersion !== "number") return errorPreview("Backup format version is missing.");
  if (envelope.formatVersion > supportedFormatVersion) return errorPreview("This backup was created by a newer Project SUIII version.");
  if (envelope.formatVersion !== supportedFormatVersion) return errorPreview("Unsupported Project SUIII backup version.");
  if (!envelope.exportedAt || Number.isNaN(Date.parse(envelope.exportedAt))) return errorPreview("Backup export date is invalid.");
  if (!envelope.data || typeof envelope.data !== "object") return errorPreview("Backup data categories are missing.");
  const data = envelope.data as Record<string, unknown>;
  const unsupportedRecords = Object.keys(data).filter((key) => !allowedDataKeys.has(key)).length;
  const recordsFound = Object.values(data).reduce<number>((sum, category) => sum + countNestedRecords(category), 0);
  const currentSerialized = JSON.stringify(current.data);
  const incomingSerialized = JSON.stringify(data);
  const identicalRecords = currentSerialized === incomingSerialized ? recordsFound : 0;
  const conflicts = currentSerialized !== incomingSerialized && recordsFound > 0 ? estimateConflicts(data, current.data) : 0;
  return {
    status: "ready",
    message: "Backup preview ready. Review conflicts before restoring.",
    recordsFound,
    newRecords: Math.max(0, recordsFound - conflicts - identicalRecords),
    identicalRecords,
    conflicts,
    malformedRecords: envelope.recovery?.malformedRecords?.length ?? 0,
    unsupportedRecords,
    envelope: envelope as DeviceDataExportEnvelope
  };
}

export async function previewBackupFile(file: File): Promise<RestorePreview> {
  if (file.size > maxBackupBytes) return errorPreview("Backup file is too large.");
  return validateDeviceBackupText(await file.text());
}

export function restoreAddMissing(preview: RestorePreview) {
  if (typeof window === "undefined" || preview.status !== "ready" || !preview.envelope) return;
  const data = preview.envelope.data as Record<string, unknown>;
  restoreLocalStorageKey("project-suiii:phase-1-dashboard", data.dashboard);
  restoreLocalStorageKey("project-suiii:phase-2-nutrition", data.nutrition);
  restoreLocalStorageKey("project-suiii:phase-3-training", data.training);
  restoreLocalStorageKey("project-suiii:phase-5-progress", data.progress);
  restoreLocalStorageKey("project-suiii:programme-profile", data.programmeProfile);
  writeRestoreActivity(preview);
}

function restoreLocalStorageKey(key: string, value: unknown) {
  if (value === undefined || value === null || window.localStorage.getItem(key)) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function writeRestoreActivity(preview: RestorePreview) {
  const activity = {
    restoredAt: new Date().toISOString(),
    mode: "add_missing",
    recordsFound: preview.recordsFound,
    newRecords: preview.newRecords,
    conflicts: preview.conflicts,
    malformedRecords: preview.malformedRecords
  };
  window.localStorage.setItem(restoreActivityKey, JSON.stringify(activity));
}

function errorPreview(message: string): RestorePreview {
  return { status: "error", message, recordsFound: 0, newRecords: 0, identicalRecords: 0, conflicts: 0, malformedRecords: 0, unsupportedRecords: 0 };
}

function countNestedRecords(value: unknown): number {
  if (!value || typeof value !== "object") return 0;
  if (Array.isArray(value)) return value.length;
  return Object.values(value as Record<string, unknown>).reduce<number>((sum, child) => sum + countObjectRecords(child), 0);
}

function estimateConflicts(incoming: Record<string, unknown>, current: Record<string, unknown>) {
  return Object.keys(incoming).filter((key) => key !== "pendingSync" && incoming[key] && current[key] && JSON.stringify(incoming[key]) !== JSON.stringify(current[key])).length;
}
