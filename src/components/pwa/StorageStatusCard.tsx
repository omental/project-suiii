"use client";

import { useEffect, useState } from "react";
import { usePwaStatus } from "@/components/pwa/PwaProvider";
import { downloadDeviceDataBackup } from "@/lib/deviceData";
import { getStorageHealth, type StorageHealth } from "@/lib/storageHealth";

export function StorageStatusCard() {
  const pwa = usePwaStatus();
  const [health, setHealth] = useState<StorageHealth | null>(null);
  const [message, setMessage] = useState("");

  const refresh = async () => setHealth(await getStorageHealth());

  useEffect(() => {
    const id = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const clearCache = async () => {
    const ok = await pwa.clearOfflineCache();
    setMessage(ok ? "Offline app asset cache cleared. Local logs and server data were not deleted." : "Offline cache clearing is not supported in this browser.");
    await refresh();
  };

  const exportData = () => {
    try {
      const result = downloadDeviceDataBackup();
      setMessage(`${result.filename} exported while using local device data.`);
    } catch {
      setMessage("Export failed. Local records were not changed.");
    }
  };

  return (
    <section className="card p-4">
      <h2 className="display text-2xl">Offline Storage Health</h2>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Tile label="Local storage" value={health?.localStorageAvailable ? "Available" : "Unavailable"} />
        <Tile label="Cache storage" value={health?.cacheStorageAvailable ? "Available" : "Unavailable"} />
        <Tile label="Worker" value={health?.serviceWorkerActive ? "Active" : pwa.serviceWorker.registered ? "Registered" : "Inactive"} />
        <Tile label="Usage" value={health?.usageBytes ? `${Math.round(health.usageBytes / 1024)} KB` : "Unknown"} />
      </div>
      {health?.lastStorageError ? <p className="mt-2 text-sm text-suii-gold">Last storage error: {health.lastStorageError}</p> : null}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className="focus-ring rounded-lg border border-suii-lime px-3 py-3 font-black uppercase text-suii-lime" onClick={clearCache}>Clear offline app cache</button>
        <button className="focus-ring rounded-lg bg-suii-lime px-3 py-3 font-black uppercase text-black" onClick={exportData}>Export backup</button>
      </div>
      <p className="mt-2 text-xs text-suii-muted">Clearing offline app cache removes downloaded app assets only. It does not delete workout logs, meal logs, server data, or sign you out.</p>
      {message ? <p className="mt-2 text-sm text-suii-lime" aria-live="polite">{message}</p> : null}
    </section>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return <div className="rounded border border-white/10 p-3"><p className="display text-lg text-suii-lime">{value}</p><p className="text-xs text-suii-muted">{label}</p></div>;
}
