"use client";

import { Cloud, Database, Dumbbell, Droplets, LogOut, Settings, Shield, Target, Utensils } from "lucide-react";
import Link from "next/link";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuthenticatedUser } from "@/components/auth/AuthenticatedUserProvider";
import { logout } from "@/lib/apiClient";
import { runTwoWaySync } from "@/lib/connectivity";
import { downloadDeviceDataBackup, getDeviceDataSummary, type DeviceCategoryId, type DeviceCategorySummary, type DeviceDataSummary } from "@/lib/deviceData";
import { buildMigrationPreview } from "@/lib/localMigration";
import { disableOfflineAccountAccess } from "@/lib/offlineAccount";
import { defaultSyncQueueState, readSyncQueue } from "@/lib/syncQueue";
import { getCanonicalAccountIdentity, storageKeyFor } from "@/lib/accountStorage";
import type { MigrationPreview, SyncEntityType } from "@/types/sync";

export function SyncDataPage() {
  const authUser = useAuthenticatedUser();
  const [preview, setPreview] = useState<MigrationPreview>({ meal_logs: 0, workout_sessions: 0, daily_check_ins: 0, sets: 0, date_range: "No local records", total_records: 0 });
  const [queue, setQueue] = useState(defaultSyncQueueState);
  const [summary, setSummary] = useState<DeviceDataSummary | null>(null);
  const [browserOnline, setBrowserOnline] = useState(true);
  const [storageHydrated, setStorageHydrated] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState("");
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "complete" | "attention" | "offline" | "server_unavailable">("idle");
  const [syncMessage, setSyncMessage] = useState("");
  const inFlightSyncRef = useRef(false);

  function refreshDeviceData() {
    setPreview(buildMigrationPreview());
    setQueue(readSyncQueue());
    setSummary(getDeviceDataSummary());
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      refreshDeviceData();
      setStorageHydrated(true);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const updateOnlineState = () => setBrowserOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    updateOnlineState();
    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);
    return () => {
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
    };
  }, []);

  const exportData = () => {
    try {
      const result = downloadDeviceDataBackup();
      setExportMessage(`${result.filename} · ${result.recordCount} records exported`);
      refreshDeviceData();
    } catch {
      setExportMessage("Export failed. Your local data was not changed.");
    }
  };

  const syncNow = async () => {
    if (inFlightSyncRef.current) return;
    inFlightSyncRef.current = true;
    setSyncState("syncing");
    setSyncMessage("Syncing...");
    try {
      const result = await runTwoWaySync("manual");
      const nextQueue = readSyncQueue();
      setQueue(nextQueue);
      setSummary(getDeviceDataSummary());
      if (result.status === "complete") {
        setSyncState("complete");
        const repaired = result.repaired ? `, ${result.repaired} repaired` : "";
        setSyncMessage(result.uploaded > 0 || result.downloaded > 0 || result.repaired > 0 ? `Sync completed: ${result.uploaded} uploaded, ${result.downloaded} downloaded${repaired}` : "All caught up");
      } else if (result.status === "attention") {
        setSyncState("attention");
        const repaired = result.repaired ? `${result.repaired} repaired, ` : "";
        const unsupported = result.unsupported ? `, ${result.unsupported} unsupported local photo uploads` : "";
        setSyncMessage(`Sync needs attention: ${repaired}${result.stillPending} still pending, ${result.conflicts} conflicts, ${result.rejected} rejected${unsupported}`);
      } else if (result.status === "offline") {
        setSyncState("offline");
        setSyncMessage(`Offline - ${result.stillPending} changes retained`);
      } else if (result.status === "session_expired") {
        setSyncState("attention");
        setSyncMessage("Session expired");
      } else if (result.status === "device_revoked") {
        setSyncState("attention");
        setSyncMessage("Device revoked");
      } else if (result.status === "storage_uninitialized") {
        setSyncState("attention");
        setSyncMessage("Account storage is not initialized. Sign in again before syncing.");
      } else if (result.pullFailed) {
        setSyncState("server_unavailable");
        setSyncMessage(`Push accepted, but pull failed: ${result.uploaded} uploaded, ${result.stillPending} still pending`);
      } else {
        setSyncState("server_unavailable");
        setSyncMessage(`Server unavailable - ${result.stillPending} changes retained`);
      }
    } catch {
      setSyncState("server_unavailable");
      setSyncMessage("Server unavailable");
    } finally {
      inFlightSyncRef.current = false;
    }
  };

  const signOut = async () => {
    const current = readSyncQueue();
    if ((current.pending.length > 0 || current.failed.length > 0) && !window.confirm("You have unsynced changes on this device. Sign out anyway?")) return;
    disableOfflineAccountAccess();
    try {
      await logout();
    } finally {
      window.location.href = "/sign-in";
    }
  };

  const accountName = authUser.full_name.trim() || authUser.email || "Authenticated athlete";
  const syncHeadline = syncState === "syncing"
    ? "Syncing..."
    : syncMessage || (queue.pending.length === 0 && queue.failed.length === 0 && queue.lastSyncAt && syncState === "complete" ? "All Caught Up" : "Sync Needs Attention");
  const connectionLabel = browserOnline ? "Browser online" : "Browser offline";
  const statusByEntity = buildStatusByEntity(queue);

  return (
    <AppShell>
      <div className="px-4 py-5">
        <header className="flex items-start justify-between">
          <Link href="/" className="focus-ring text-4xl" aria-label="Back">‹</Link>
          <div className="text-center">
            <p className="display text-suii-gold">Project SUIII</p>
            <h1 className="display text-5xl leading-none">Sync & Data</h1>
          </div>
          <Settings className="size-8 text-suii-muted" />
        </header>
        <section className="card mt-5 flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Cloud className="size-20 text-suii-lime" />
            <div>
              <h2 className="display text-3xl text-suii-lime">{syncHeadline}</h2>
              <p className="text-suii-muted">Last synced {queue.lastSyncAt ? new Date(queue.lastSyncAt).toLocaleString() : "not yet"}</p>
              <span className="mt-2 inline-flex rounded border border-suii-lime px-3 py-1 display text-suii-lime">{connectionLabel}</span>
            </div>
          </div>
          <button onClick={syncNow} disabled={syncState === "syncing"} className="focus-ring rounded-lg border border-suii-lime px-4 py-3 display text-suii-lime disabled:opacity-60">Sync Now</button>
        </section>
        <section className="card mt-4 p-4">
          <p className="display text-suii-gold">Private Account</p>
          <h2 className="display text-3xl">{accountName}</h2>
          <p className="text-suii-muted">{authUser.email}</p>
          <p className="display mt-2 text-suii-gold">{storageHydrated ? `This device · ${queue.deviceName}` : "This device"}</p>
        </section>
        <section className="card mt-4 divide-y divide-white/10 p-4">
          <SyncRow icon={<Utensils />} title="Meals" detail={`${categoryTotal(summary, "nutrition")} cached · ${preview.meal_logs} legacy`} status={categoryStatus(summary, "nutrition", ["meal_log"], statusByEntity)} />
          <SyncRow icon={<Dumbbell />} title="Workouts" detail={`${categoryTotal(summary, "workouts")} cached · ${preview.workout_sessions} legacy`} status={categoryStatus(summary, "workouts", ["workout_session"], statusByEntity)} />
          <SyncRow icon={<Droplets />} title="Daily Tracking" detail={`${categoryTotal(summary, "daily_tracking")} cached · ${preview.daily_check_ins} legacy`} status={categoryStatus(summary, "daily_tracking", ["daily_tracking"], statusByEntity)} />
          <SyncRow icon={<Target />} title="Profile & Goals" detail={`${categoryTotal(summary, "measurements") + categoryTotal(summary, "check_ins")} cached`} status={categoryStatus(summary, "measurements", ["profile", "body_measurement", "weekly_check_in"], statusByEntity)} />
        </section>
        <section className="card mt-4 flex gap-4 border-suii-blue/40 p-4">
          <Cloud className="size-16 text-suii-blue" />
          <div>
            <h2 className="display text-2xl text-suii-blue">Local Data Available</h2>
            <p className="text-suii-muted">Saved device records remain available here. Use Sync Now after you are signed in and connected to upload or pull changes.</p>
            <p className="display mt-3 text-suii-blue">{queue.pending.length} Pending Sync Changes</p>
          </div>
        </section>
        <section className="card mt-4 p-4">
          <h2 className="display text-2xl">Recent Activity</h2>
          {queue.recentActivity.length ? queue.recentActivity.map((item) => <p key={item} className="mt-3 text-suii-muted">✓ {item}</p>) : <p className="mt-3 text-suii-muted">No sync activity yet.</p>}
        </section>
        {process.env.NODE_ENV !== "production" ? <SyncDiagnosticsPanel userId={authUser.id} queue={queue} /> : null}
        <section className="card mt-4 divide-y divide-white/10 p-4">
          <h2 className="display pb-3 text-2xl">Device Data</h2>
          {summary ? <p className="pb-3 text-suii-muted">{summary.totalSupportedRecords} local cached records · {summary.pendingSyncChanges} pending sync changes · {summary.legacyRecordsAwaitingImport} legacy records awaiting import</p> : null}
          <Action icon={<Database />} label="Export My Data" onClick={exportData} />
          <Action icon={<Database />} label="Review Device Data" onClick={() => { refreshDeviceData(); setReviewing(true); }} />
          <button data-testid="sync-sign-out" className="flex min-h-14 w-full items-center gap-3 py-3 text-left display text-suii-gold" onClick={signOut}><LogOut className="size-6" />Sign Out</button>
        </section>
        {exportMessage ? <p className="card mt-4 p-4 text-suii-blue">{exportMessage}</p> : null}
        {summary ? (
          <section className="card mt-4 p-4">
            <h2 className="display text-2xl">Device Overview</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Tile label="Records" value={summary.totalSupportedRecords} />
              <Tile label="Pending Sync" value={summary.pendingSyncChanges} />
              <Tile label="Legacy Import" value={summary.legacyRecordsAwaitingImport} />
              <Tile label="Migration" value={summary.migrationStatus.replace("_", " ")} />
              <Tile label="Last Sync" value={summary.lastSuccessfulImportAt ? new Date(summary.lastSuccessfulImportAt).toLocaleDateString() : "Not yet"} />
              <Tile label="Attention" value={summary.conflictsNeedingAttention} />
              <Tile label="Device" value={summary.deviceIdDisplay} />
            </div>
            <p className="mt-3 text-sm text-suii-muted">Your backup stays on your device unless you choose where to save it. Exporting does not delete your data.</p>
          </section>
        ) : null}
        {reviewing && summary ? (
          <section className="card mt-4 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="display text-suii-blue">Device Data</p>
                <h2 className="display text-3xl">Review</h2>
              </div>
              <button className="focus-ring rounded border border-suii-blue px-3 py-2 display text-suii-blue" onClick={() => setReviewing(false)}>Back</button>
            </div>
            <div className="mt-4 space-y-3">
              {summary.categories.map((item) => (
                <CategoryReview key={item.id} category={item} expanded={expanded === item.id} onToggle={() => setExpanded(expanded === item.id ? null : item.id)} />
              ))}
            </div>
            <p className="mt-4 text-sm text-suii-muted">Authentication cookies, CSRF tokens, API URLs and environment settings are not shown or exported.</p>
            {summary.photoMetadataCount ? <p className="mt-2 text-sm text-suii-gold">{summary.photoMetadataCount} photo metadata records found. Photo image files are not included in JSON export.</p> : null}
          </section>
        ) : null}
        <p className="card mt-4 flex gap-3 p-4 text-suii-muted"><Shield className="size-6 text-suii-gold" />Your fitness records are available only to your authenticated account.</p>
      </div>
    </AppShell>
  );
}

function SyncDiagnosticsPanel({ userId, queue }: { userId: string; queue: ReturnType<typeof readSyncQueue> }) {
  const identity = getCanonicalAccountIdentity();
  const entityCounts = buildStatusByEntity(queue);
  return (
    <section className="card mt-4 p-4" data-testid="sync-diagnostics">
      <p className="display text-suii-gold">Sync Diagnostics</p>
      <div className="mt-3 grid gap-2 text-xs text-suii-muted">
        <p>Server user ID: {userId}</p>
        <p>Local account ID: {identity?.accountId ?? "not initialized"}</p>
        <p>Device ID: {queue.deviceId}</p>
        <p>Namespace: {identity ? storageKeyFor("syncQueue") : "legacy/offline"}</p>
        <p>Pull cursor: {queue.pullCursor ?? "none"}</p>
        <p>Pending: {queue.pending.length} · Failed: {queue.failed.length} · Last sync: {queue.lastSyncAt ?? "not yet"}</p>
        {[...entityCounts.entries()].map(([entityType, counts]) => (
          <p key={entityType}>{entityType}: {counts.pending} pending · {counts.failed} failed</p>
        ))}
      </div>
    </section>
  );
}

function buildStatusByEntity(queue: ReturnType<typeof readSyncQueue>) {
  const status = new Map<SyncEntityType, { pending: number; failed: number }>();
  const add = (entityType: SyncEntityType, key: "pending" | "failed") => {
    const current = status.get(entityType) ?? { pending: 0, failed: 0 };
    current[key] += 1;
    status.set(entityType, current);
  };
  queue.pending.forEach((mutation) => add(mutation.entity_type, "pending"));
  queue.failed.forEach((mutation) => add(mutation.entity_type, "failed"));
  return status;
}

function categoryTotal(summary: DeviceDataSummary | null, id: DeviceCategoryId) {
  return summary?.categories.find((item) => item.id === id)?.total ?? 0;
}

function categoryStatus(
  summary: DeviceDataSummary | null,
  categoryId: DeviceCategoryId,
  entityTypes: SyncEntityType[],
  statusByEntity: Map<SyncEntityType, { pending: number; failed: number }>
) {
  const totals = entityTypes.reduce((next, entityType) => {
    const status = statusByEntity.get(entityType);
    return {
      pending: next.pending + (status?.pending ?? 0),
      failed: next.failed + (status?.failed ?? 0)
    };
  }, { pending: 0, failed: 0 });
  if (totals.failed > 0) return `${totals.failed} need attention`;
  if (totals.pending > 0) return `${totals.pending} pending`;
  const category = summary?.categories.find((item) => item.id === categoryId);
  if (!category || category.total === 0) return "No local records";
  if (category.rejected > 0) return `${category.rejected} need attention`;
  if (summary?.lastSuccessfulImportAt) return "Synced";
  return "Saved on this device";
}

function SyncRow({ icon, title, detail, status }: { icon: React.ReactNode; title: string; detail: string; status: string }) {
  return <div className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 py-4 text-suii-lime">{icon}<p className="display text-xl text-white">{title}</p><p className="text-right text-suii-muted">{detail}<br /><span className="display text-suii-lime">{status}</span></p></div>;
}

function Action({ icon, label, muted = false, onClick }: { icon: React.ReactNode; label: string; muted?: boolean; onClick?: () => void }) {
  return <button onClick={onClick} className={`flex min-h-14 w-full items-center gap-3 py-3 text-left display ${muted ? "text-suii-muted" : "text-white"}`}>{icon}{label}<span className="ml-auto">›</span></button>;
}

function Tile({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded border border-white/10 p-3"><p className="display text-2xl text-suii-lime">{value}</p><p className="text-xs text-suii-muted">{label}</p></div>;
}

function CategoryReview({ category, expanded, onToggle }: { category: DeviceCategorySummary; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="rounded border border-white/10 p-3">
      <button className="flex w-full items-center justify-between gap-3 text-left" onClick={onToggle}>
        <span><span className="display text-xl">{category.name}</span><br /><span className="text-sm text-suii-muted">{category.total} records · {category.pending} pending · {category.rejected} need attention</span></span>
        <span className="display text-suii-blue">{expanded ? "Close" : "Review"}</span>
      </button>
      {expanded ? (
        <div className="mt-3 space-y-3">
          {category.records.length === 0 ? <p className="text-sm text-suii-muted">No records stored on this device.</p> : category.records.map((record) => (
            <div key={record.id} className="rounded border border-white/10 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="display text-lg">{record.title}</p>
                  <p className="text-sm text-suii-muted">{record.subtitle}</p>
                  {record.safeIssue ? <p className="mt-1 text-sm text-suii-gold">{record.safeIssue}</p> : null}
                </div>
                <span className="rounded border border-suii-blue px-2 py-1 text-xs text-suii-blue">{record.status.replace("_", " ")}</span>
              </div>
              <details className="mt-2 text-xs text-suii-muted">
                <summary className="cursor-pointer text-suii-blue">Technical details</summary>
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-black/40 p-2">{JSON.stringify(record.technicalDetails, null, 2)}</pre>
              </details>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
