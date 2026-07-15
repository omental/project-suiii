"use client";

import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { SettingsChrome } from "@/components/settings/SettingsChrome";
import { apiRequest } from "@/lib/apiClient";
import { readSyncQueue, writeSyncQueue } from "@/lib/syncQueue";

export function ConflictCenterPage() {
  const [queue, setQueue] = useState(readSyncQueue());
  const conflicts = useMemo(() => queue.failed.map((mutation) => ({
    id: mutation.client_mutation_id,
    category: mutation.entity_type.replaceAll("_", " "),
    title: `${mutation.entity_type.replaceAll("_", " ")} · ${mutation.entity_id}`,
    localSummary: summarize(mutation.payload),
    serverSummary: summarize(mutation.payload.server ?? mutation.payload),
    reason: String(mutation.payload.code ?? "Needs review"),
    localVersion: Number(mutation.payload.version ?? 1),
    serverVersion: Number(mutation.payload.server_version ?? mutation.payload.version ?? 1),
    updatedAt: mutation.created_at
  })), [queue.failed]);

  const resolveLater = (id: string) => setQueue(readSyncQueue());
  const keepServer = (id: string) => {
    const next = { ...queue, failed: queue.failed.filter((item) => item.client_mutation_id !== id), recentActivity: [`Conflict ${id} kept server copy`, ...queue.recentActivity].slice(0, 5) };
    writeSyncQueue(next);
    setQueue(next);
  };
  const keepDevice = async (id: string) => {
    const mutation = queue.failed.find((item) => item.client_mutation_id === id);
    if (!mutation) return;
    const result = await apiRequest("/sync/push", { method: "POST", body: JSON.stringify({ mutations: [{ ...mutation, client_mutation_id: `${mutation.client_mutation_id}-resolve-${Date.now()}` }] }) });
    const next = { ...queue, recentActivity: [`Conflict ${id} sent for version-aware sync`, ...queue.recentActivity].slice(0, 5) };
    void result;
    writeSyncQueue(next);
    setQueue(next);
  };
  const exportBoth = (id: string) => {
    const conflict = conflicts.find((item) => item.id === id);
    if (!conflict) return;
    const blob = new Blob([JSON.stringify({ application: "Project SUIII", exportType: "conflict-comparison", conflict }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `project-suiii-conflict-${id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SettingsChrome title="Sync Conflicts">
      <div className="grid gap-3">
        {!conflicts.length ? <p className="card p-4 text-suii-muted">No conflicts need review.</p> : conflicts.map((conflict) => (
          <section key={conflict.id} className="card p-4">
            <p className="display text-suii-gold">{conflict.category}</p>
            <h2 className="display text-2xl">{conflict.title}</h2>
            <p className="mt-2 text-sm text-suii-muted">Reason: {conflict.reason}</p>
            <div className="mt-3 grid gap-2">
              <Compare label="Device" value={conflict.localSummary} version={conflict.localVersion} updated={conflict.updatedAt} />
              <Compare label="Server" value={conflict.serverSummary} version={conflict.serverVersion} updated="Server updated time unavailable locally" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button className="focus-ring rounded-lg border border-white/15 px-3 py-3 display" onClick={() => keepServer(conflict.id)}>Keep Server</button>
              <button className="focus-ring rounded-lg bg-suii-lime px-3 py-3 display text-black" onClick={() => void keepDevice(conflict.id)}>Keep Device</button>
              <button className="focus-ring rounded-lg border border-suii-blue px-3 py-3 display text-suii-blue" onClick={() => exportBoth(conflict.id)}><Download className="mr-2 inline size-4" />Export Both</button>
              <button className="focus-ring rounded-lg border border-white/15 px-3 py-3 display" onClick={() => resolveLater(conflict.id)}>Resolve Later</button>
            </div>
          </section>
        ))}
      </div>
    </SettingsChrome>
  );
}

function summarize(value: unknown) {
  if (!value || typeof value !== "object") return "No summary available";
  const object = value as Record<string, unknown>;
  return Object.entries(object).filter(([key]) => !/token|cookie|password|csrf|secret/i.test(key)).slice(0, 4).map(([key, val]) => `${key}: ${String(val)}`).join(" · ");
}

function Compare({ label, value, version, updated }: { label: string; value: string; version: number; updated: string }) {
  return <div className="rounded border border-white/10 p-3"><p className="display text-suii-lime">{label}</p><p className="text-sm text-suii-muted">{value}</p><p className="mt-2 text-xs text-suii-muted">Version {version} · {updated}</p></div>;
}
