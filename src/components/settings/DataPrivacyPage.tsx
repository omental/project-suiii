"use client";

import { useState } from "react";
import { SettingsChrome } from "@/components/settings/SettingsChrome";
import { previewBackupFile, restoreAddMissing, type RestorePreview } from "@/lib/deviceBackup";

export function DataPrivacyPage() {
  const [preview, setPreview] = useState<RestorePreview | null>(null);
  const [message, setMessage] = useState("");

  const chooseFile = async (file: File | null) => {
    setMessage("");
    setPreview(file ? await previewBackupFile(file) : null);
  };

  const restore = () => {
    if (!preview || preview.status !== "ready") return;
    restoreAddMissing(preview);
    setMessage("Missing local records restored. Existing records were preserved.");
  };

  return (
    <SettingsChrome title="Data & Privacy">
      <div className="grid gap-4">
        <section className="card p-4">
          <h2 className="display text-2xl">Restore Device Backup</h2>
          <p className="mt-2 text-sm text-suii-muted">Choose a Project SUIII JSON backup. Cookies, CSRF tokens, passwords, API URLs, sessions and environment settings are never restored.</p>
          <label className="mt-4 grid gap-2">
            <span className="text-sm font-bold text-suii-muted">Backup JSON file</span>
            <input className="focus-ring rounded-lg border border-white/10 bg-black p-3" type="file" accept="application/json,.json" onChange={(event) => void chooseFile(event.target.files?.[0] ?? null)} />
          </label>
        </section>
        {preview ? (
          <section className={`card p-4 ${preview.status === "error" ? "border-suii-amber/50" : "border-suii-blue/40"}`}>
            <h2 className="display text-2xl">{preview.status === "error" ? "Backup Rejected" : "Dry-run Preview"}</h2>
            <p className="mt-2 text-suii-muted">{preview.message}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Tile label="Records found" value={preview.recordsFound} />
              <Tile label="New records" value={preview.newRecords} />
              <Tile label="Identical" value={preview.identicalRecords} />
              <Tile label="Conflicts" value={preview.conflicts} />
              <Tile label="Malformed" value={preview.malformedRecords} />
              <Tile label="Unsupported" value={preview.unsupportedRecords} />
            </div>
            {preview.status === "ready" ? <button className="focus-ring mt-4 w-full rounded-lg bg-suii-lime px-4 py-4 display text-black" onClick={restore}>Add Missing Records Only</button> : null}
          </section>
        ) : null}
        <p aria-live="polite" className="text-suii-lime">{message}</p>
      </div>
    </SettingsChrome>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return <div className="rounded border border-white/10 p-3"><p className="display text-2xl text-suii-lime">{value}</p><p className="text-xs text-suii-muted">{label}</p></div>;
}
