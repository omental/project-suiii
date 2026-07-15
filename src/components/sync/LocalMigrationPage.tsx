"use client";

import { CheckCircle2, CloudUpload, Eye, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/apiClient";
import { buildMigrationMutations, buildMigrationPreview } from "@/lib/localMigration";
import { readSyncQueue } from "@/lib/syncQueue";
import type { MigrationPreview } from "@/types/sync";

export function LocalMigrationPage() {
  const [preview, setPreview] = useState<MigrationPreview>({ meal_logs: 0, workout_sessions: 0, daily_check_ins: 0, sets: 0, date_range: "No local records", total_records: 0 });
  const [policy, setPolicy] = useState<"keep_latest" | "keep_server" | "review_each">("keep_latest");
  const [status, setStatus] = useState("Ready to import");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Local migration data is only available after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreview(buildMigrationPreview());
  }, []);

  const importData = async () => {
    if (busy) return;
    const queue = readSyncQueue();
    const records = buildMigrationMutations(queue.deviceId);
    setBusy(true);
    try {
      await apiRequest("/sync/migrate", {
        method: "POST",
        body: JSON.stringify({ device_id: queue.deviceId, device_name: queue.deviceName, conflict_policy: policy, preview, records })
      });
      setStatus("Import complete");
    } catch {
      setStatus("Import failed. Local data remains on this device.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-suii-black px-4 py-5 text-white">
      <div className="mx-auto max-w-[430px]">
        <header className="flex items-center justify-between border-b border-white/10 pb-4">
          <p className="display text-xl">Project SUIII</p>
          <Link href="/" className="focus-ring rounded px-2 py-2 display text-suii-gold">Do this later</Link>
        </header>
        <section className="py-8">
          <p className="display text-suii-lime">Setup · Step 1 of 2</p>
          <CloudUpload className="mt-8 size-28 text-suii-blue" />
          <h1 className="display mt-5 text-5xl leading-none">Bring your progress <span className="text-suii-lime">with you</span></h1>
          <p className="mt-3 text-suii-muted">We found Project SUIII data saved on this device.</p>
        </section>
        <section className="card p-4">
          <h2 className="display text-suii-lime">Local Data Found</h2>
          <div className="mt-4 grid grid-cols-5 gap-2 text-center">
            <Metric value={preview.meal_logs} label="Meal Logs" />
            <Metric value={preview.workout_sessions} label="Workout Sessions" />
            <Metric value={preview.sets} label="Sets" />
            <Metric value={preview.daily_check_ins} label="Daily Check-ins" />
            <Metric value={preview.date_range} label="Dates" gold />
          </div>
          <p className="mt-4 rounded-full border border-suii-blue px-4 py-2 text-center display text-suii-blue">{status}</p>
        </section>
        <section className="card mt-4 p-4">
          <h2 className="display text-suii-lime">What Happens</h2>
          {["Upload local records to your private account.", "Check existing server records to prevent duplicates.", "Confirm local data remains until migration succeeds."].map((item, index) => (
            <div key={item} className="mt-4 flex gap-4">
              <span className="grid size-10 place-items-center rounded-full border border-suii-lime display text-suii-lime">{index + 1}</span>
              <p className="text-suii-muted"><span className="display text-xl text-white">{["Upload", "Check", "Confirm"][index]}</span><br />{item}</p>
            </div>
          ))}
        </section>
        <section className="card mt-4 p-4">
          <h2 className="display text-suii-lime">If Records Already Exist</h2>
          {[
            ["keep_latest", "Keep the most recent version"],
            ["keep_server", "Keep server version"],
            ["review_each", "Review each conflict"]
          ].map(([value, label]) => (
            <label key={value} className="flex min-h-12 items-center gap-3 border-b border-white/10 py-2 last:border-b-0">
              <input type="radio" checked={policy === value} onChange={() => setPolicy(value as typeof policy)} className="size-5 accent-suii-lime" />
              <span className="display text-lg">{label}</span>
            </label>
          ))}
          <p className="mt-3 text-suii-gold">Nothing is deleted automatically.</p>
        </section>
        <p className="card mt-4 flex items-center gap-3 p-4 text-suii-muted"><ShieldCheck className="size-8 text-suii-lime" />Only your signed-in account can access this data.</p>
        <button onClick={importData} disabled={busy} className="focus-ring mt-4 w-full rounded-lg bg-suii-lime px-4 py-4 display text-3xl text-black disabled:opacity-60">{busy ? "Importing" : `Import ${preview.total_records} Records ›`}</button>
        <Link href="/" className="focus-ring mt-3 block rounded-lg border border-suii-lime px-4 py-4 text-center display text-2xl text-suii-lime">Start Fresh</Link>
        <p className="mt-3 flex gap-2 text-sm text-suii-muted"><Eye className="size-5 text-suii-blue" />You can review the import before final confirmation.</p>
      </div>
    </main>
  );
}

function Metric({ value, label, gold = false }: { value: number | string; label: string; gold?: boolean }) {
  return <div><p className={`display text-3xl ${gold ? "text-suii-gold" : "text-white"}`}>{value}</p><p className="display text-[0.62rem] text-suii-muted">{label}</p></div>;
}
