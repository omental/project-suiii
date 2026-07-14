"use client";

import { ChevronRight, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { sortedMeasurements } from "@/lib/progressAnalytics";
import { defaultProgressState, deleteMeasurementLocal, readProgressState, writeProgressState } from "@/lib/progressRepository";

export function ProgressHistoryPage() {
  const [filter, setFilter] = useState<"4" | "12" | "all">("12");
  const [state, setState] = useState(defaultProgressState);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(readProgressState());
  }, []);
  const points = useMemo(() => {
    const all = sortedMeasurements(state);
    if (filter === "all") return all;
    return all.slice(-Number(filter));
  }, [filter, state]);
  function remove(id: string) {
    if (!window.confirm("Delete this measurement? It will be queued for sync deletion.")) return;
    const next = deleteMeasurementLocal(state, id);
    writeProgressState(next);
    setState(next);
  }
  return (
    <AppShell>
      <div className="px-4 py-5">
        <header className="flex items-center justify-between"><h1 className="display text-5xl">History</h1><Link href="/progress" className="display text-suii-lime">Back</Link></header>
        <div className="mt-5 grid grid-cols-3 rounded-lg border border-white/15">
          {(["4", "12", "all"] as const).map((item) => <button key={item} className={`display ${filter === item ? "bg-suii-lime text-black" : "text-suii-muted"}`} onClick={() => setFilter(item)}>{item === "all" ? "All" : `${item} weeks`}</button>)}
        </div>
        <section className="card mt-4 p-4">
          <h2 className="display text-2xl">Accessible Chart Values</h2>
          {points.length === 0 ? <p className="mt-3 text-suii-muted">No measurements yet. Add weight or waist to start history.</p> : <div className="mt-4 space-y-3">{points.map((point) => <div key={point.id} className="grid grid-cols-[1fr_auto] gap-3 rounded border border-white/10 p-3"><div><p className="display text-xl">{point.localDate}</p><p className="text-suii-muted">Weight {point.weightKg ?? "not logged"} kg · Waist {point.waistIn ?? "not logged"} in · Chest {point.chestIn ?? "not logged"} in</p></div><button aria-label={`Delete measurement ${point.localDate}`} className="focus-ring text-red-200" onClick={() => remove(point.id)}><Trash2 /></button></div>)}</div>}
        </section>
        <section className="card mt-4 p-4">
          <h2 className="display text-2xl">Check-Ins</h2>
          {Object.values(state.checkIns).length === 0 ? <p className="mt-3 text-suii-muted">No weekly check-ins yet.</p> : Object.values(state.checkIns).map((item) => <Link key={item.id} href={`/progress/review/${item.id}`} className="mt-3 flex items-center justify-between rounded border border-white/10 p-3"><span>Week {item.weekNumber} · {item.status}</span><ChevronRight /></Link>)}
        </section>
      </div>
    </AppShell>
  );
}
