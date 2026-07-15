"use client";

import { Cloud, Database, Dumbbell, Droplets, LogOut, RefreshCcw, Settings, Shield, Target, Utensils } from "lucide-react";
import Link from "next/link";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ApiError, apiRequest, fetchSyncStatus, logout, NetworkError } from "@/lib/apiClient";
import { downloadDeviceDataBackup, getDeviceDataSummary, type DeviceCategorySummary, type DeviceDataSummary } from "@/lib/deviceData";
import { buildMigrationPreview } from "@/lib/localMigration";
import { mergePulledRecords } from "@/lib/syncMerge";
import { readSyncQueue, writeSyncQueue } from "@/lib/syncQueue";
import type { MigrationPreview, SyncPullResponse, SyncPushResponse } from "@/types/sync";

export function SyncDataPage() {
  const [preview, setPreview] = useState<MigrationPreview>({ meal_logs: 0, workout_sessions: 0, daily_check_ins: 0, sets: 0, date_range: "No local records", total_records: 0 });
  const [queue, setQueue] = useState(readSyncQueue());
  const [summary, setSummary] = useState<DeviceDataSummary | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState("");
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "complete" | "attention" | "offline" | "server_unavailable">("idle");
  const [syncMessage, setSyncMessage] = useState("");
  const inFlightSyncRef = useRef(false);

  useEffect(() => {
    // Local sync queue data is only available after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshDeviceData();
  }, []);

  const refreshDeviceData = () => {
    setPreview(buildMigrationPreview());
    setQueue(readSyncQueue());
    setSummary(getDeviceDataSummary());
  };

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
    const currentQueue = readSyncQueue();
    inFlightSyncRef.current = true;
    setSyncState("syncing");
    setSyncMessage("Syncing...");
    try {
      const pending = currentQueue.pending;
      let uploaded = 0;
      let downloaded = 0;
      let conflicts = 0;
      let rejected = 0;
      let nextPending = pending;
      let nextFailed = currentQueue.failed;
      if (pending.length > 0) {
        const push = await apiRequest<SyncPushResponse>("/sync/push", {
          method: "POST",
          body: JSON.stringify({ mutations: pending })
        });
        const isConfirmed = (status: string) => status === "applied" || status === "duplicate" || status === "already_exists";
        uploaded = push.results.filter((result) => isConfirmed(result.status)).length;
        conflicts = push.results.filter((result) => result.status === "conflict" || result.status === "server_newer").length;
        rejected = push.results.filter((result) => result.status === "rejected").length;
        nextPending = pending.filter((mutation, index) => {
          const result = push.results[index];
          return !result || !isConfirmed(result.status);
        });
        const failedIds = new Set(nextFailed.map((mutation) => mutation.client_mutation_id));
        nextFailed = [...nextFailed, ...nextPending.filter((mutation) => !failedIds.has(mutation.client_mutation_id))];
      }
      const pull = await apiRequest<SyncPullResponse>("/sync/pull");
      const mergeResult = mergePulledRecords(pull.records, [...nextPending, ...nextFailed]);
      downloaded = mergeResult.downloaded;
      const status = await fetchSyncStatus();
      const nextQueue = {
        ...currentQueue,
        pending: nextPending,
        failed: nextFailed,
        lastSyncAt: status.last_sync_at ?? new Date().toISOString(),
        recentActivity: [`Sync completed: ${uploaded} uploaded, ${downloaded} downloaded, ${conflicts} conflicts, ${rejected} rejected`, ...currentQueue.recentActivity].slice(0, 5)
      };
      writeSyncQueue(nextQueue);
      setQueue(nextQueue);
      setSummary(getDeviceDataSummary());
      if (nextPending.length === 0 && conflicts === 0 && rejected === 0) {
        setSyncState("complete");
        setSyncMessage(uploaded > 0 ? "Sync completed" : "All caught up");
      } else {
        setSyncState("attention");
        setSyncMessage("Sync needs attention");
      }
    } catch (error) {
      if (error instanceof NetworkError) {
        setSyncState("offline");
        setSyncMessage("Offline");
      } else if (error instanceof ApiError && [401, 409, 422].includes(error.status)) {
        setSyncState("attention");
        setSyncMessage("Sync needs attention");
      } else {
        setSyncState("server_unavailable");
        setSyncMessage("Server unavailable");
      }
    } finally {
      inFlightSyncRef.current = false;
    }
  };

  const signOut = async () => {
    try {
      await logout();
    } finally {
      window.location.href = "/sign-in";
    }
  };

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
              <h2 className="display text-3xl text-suii-lime">{syncState === "syncing" ? "Syncing..." : syncMessage || (queue.pending.length === 0 && queue.failed.length === 0 && queue.lastSyncAt ? "All Caught Up" : "Sync Needs Attention")}</h2>
              <p className="text-suii-muted">Last synced {queue.lastSyncAt ? new Date(queue.lastSyncAt).toLocaleString() : "not yet"}</p>
              <span className="mt-2 inline-flex rounded border border-suii-lime px-3 py-1 display text-suii-lime">Online</span>
            </div>
          </div>
          <button onClick={syncNow} disabled={syncState === "syncing"} className="focus-ring rounded-lg border border-suii-lime px-4 py-3 display text-suii-lime disabled:opacity-60">Sync Now</button>
        </section>
        <section className="card mt-4 p-4">
          <p className="display text-suii-gold">Private Account</p>
          <h2 className="display text-3xl">J.M. Mubasshir Rahman</h2>
          <p className="text-suii-muted">mubasshir@example.com</p>
          <p className="display mt-2 text-suii-gold">This device · {queue.deviceName}</p>
        </section>
        <section className="card mt-4 divide-y divide-white/10 p-4">
          <SyncRow icon={<Utensils />} title="Meals" detail={`${summary?.categories.find((item) => item.id === "nutrition")?.total ?? 0} cached · ${preview.meal_logs} legacy`} />
          <SyncRow icon={<Dumbbell />} title="Workouts" detail={`${summary?.categories.find((item) => item.id === "workouts")?.total ?? 0} cached · ${preview.workout_sessions} legacy`} />
          <SyncRow icon={<Droplets />} title="Daily Tracking" detail="Water · Cigarettes · Sleep" />
          <SyncRow icon={<Target />} title="Profile & Goals" detail="Weight · Waist · Targets" />
        </section>
        <section className="card mt-4 flex gap-4 border-suii-blue/40 p-4">
          <Cloud className="size-16 text-suii-blue" />
          <div>
            <h2 className="display text-2xl text-suii-blue">Offline Ready</h2>
            <p className="text-suii-muted">You can log meals and workouts without internet. Changes upload automatically when you reconnect.</p>
            <p className="display mt-3 text-suii-blue">{queue.pending.length} Pending Sync Changes</p>
          </div>
        </section>
        <section className="card mt-4 p-4">
          <h2 className="display text-2xl">Recent Activity</h2>
          {(queue.recentActivity.length ? queue.recentActivity : ["Workout feedback updated", "Full Body A uploaded", "Evening snack uploaded"]).map((item) => <p key={item} className="mt-3 text-suii-muted">✓ {item}</p>)}
        </section>
        <section className="card mt-4 divide-y divide-white/10 p-4">
          <h2 className="display pb-3 text-2xl">Device Data</h2>
          {summary ? <p className="pb-3 text-suii-muted">{summary.totalSupportedRecords} local cached records · {summary.pendingSyncChanges} pending sync changes · {summary.legacyRecordsAwaitingImport} legacy records awaiting import</p> : null}
          <Action icon={<Database />} label="Export My Data" onClick={exportData} />
          <Action icon={<RefreshCcw />} label="Retry Failed Changes" muted />
          <Action icon={<Database />} label="Review Device Data" onClick={() => { refreshDeviceData(); setReviewing(true); }} />
          <button className="flex min-h-14 w-full items-center gap-3 py-3 text-left display text-suii-gold" onClick={signOut}><LogOut className="size-6" />Sign Out</button>
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

function SyncRow({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return <div className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 py-4 text-suii-lime">{icon}<p className="display text-xl text-white">{title}</p><p className="text-right text-suii-muted">{detail}<br /><span className="display text-suii-lime">Synced</span></p></div>;
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
