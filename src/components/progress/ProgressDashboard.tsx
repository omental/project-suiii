"use client";

import { CalendarDays, Camera, ChevronRight, Dumbbell, Droplets, Ruler, Scale, Soup, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { buildProgressSummary, sortedMeasurements } from "@/lib/progressAnalytics";
import { defaultProgressState, readProgressState } from "@/lib/progressRepository";
import type { ProgressLocalState } from "@/types/progress";

function fmt(value: number | null, suffix = "") {
  return value === null ? "No data" : `${value.toFixed(1)}${suffix}`;
}

export function ProgressDashboard() {
  const [state, setState] = useState<ProgressLocalState>(defaultProgressState);
  useEffect(() => {
    // Phase 5 progress state is browser-local before sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(readProgressState());
  }, []);
  const summary = useMemo(() => buildProgressSummary(state), [state]);
  const points = sortedMeasurements(state).slice(-4);
  return (
    <AppShell>
      <div className="px-4 py-5">
        <header className="flex items-start justify-between">
          <div>
            <p className="display text-suii-muted">Project SUIII</p>
            <h1 className="display text-6xl leading-none">Progress</h1>
          </div>
          <Link href="/progress/history" className="focus-ring rounded-xl border border-white/15 p-3" aria-label="Progress history"><CalendarDays /></Link>
        </header>

        <section className="card mt-5 p-4">
          <div className="flex items-center justify-between">
            <p className="display text-xl text-suii-lime">Day {summary.programmeDay} of {summary.programmeTotalDays}</p>
            <span className="rounded-full border border-suii-lime px-3 py-1 display text-suii-lime">{summary.trendStatus}</span>
          </div>
          <h2 className="display mt-3 text-4xl">Your Transformation</h2>
          <MetricRow icon={<Scale />} value={fmt(summary.currentWeightKg, " kg")} start={`${summary.startingWeightKg} kg`} target={`${summary.targetWeightMinKg}-${summary.targetWeightMaxKg} kg`} delta={fmt(summary.weightChangeKg, " kg")} tone="text-suii-lime" />
          <MetricRow icon={<Ruler />} value={fmt(summary.currentWaistIn, " in")} start={`${summary.startingWaistIn} in`} target={`${summary.targetWaistIn} in`} delta={fmt(summary.waistChangeIn, " in")} tone="text-suii-gold" />
        </section>

        <section className="card mt-4 p-4">
          <div className="flex items-center justify-between">
            <h2 className="display text-2xl">Weight & Waist Trend</h2>
            <Link className="focus-ring display text-suii-blue" href="/progress/history">View Details <ChevronRight className="inline size-5" /></Link>
          </div>
          {points.length === 0 ? <p className="mt-4 text-suii-muted">No measurements yet. Add one to start a truthful trend.</p> : (
            <div className="mt-5 grid grid-cols-4 items-end gap-3 text-center">
              {points.map((point, index) => (
                <div key={point.id} className="min-h-24">
                  <p className="display text-suii-lime">{point.weightKg ?? "--"}</p>
                  <div className="mx-auto my-2 h-16 w-2 rounded-full bg-suii-lime/30" style={{ height: `${Math.max(24, (point.weightKg ?? 70) - 55)}px` }} />
                  <p className="display text-suii-gold">{point.waistIn ?? "--"}</p>
                  <p className="text-xs text-suii-muted">W{index + 1}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card mt-4 p-4">
          <h2 className="display text-2xl">This Week</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Tile icon={<Dumbbell />} label="Workouts" value={`${summary.workoutAdherence.completed} / ${summary.workoutAdherence.planned}`} />
            <Tile icon={<Soup />} label="Meals" value={`${summary.mealAdherence.completed} / ${summary.mealAdherence.planned}`} tone="text-suii-gold" />
            <Tile icon={<Droplets />} label="Water" value={`${summary.waterDays} / 7 days`} tone="text-suii-blue" />
            <Tile icon={<Camera />} label="Check-in" value={summary.checkInDue ? "Due" : "Not due"} tone="text-suii-lime" />
          </div>
        </section>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <section className="card p-4">
            <h2 className="display text-xl">Smoking Trend</h2>
            <p className="display mt-3 text-3xl">{summary.smoking.dailyLimit} <span className="text-sm text-suii-muted">daily limit</span></p>
            <p className="display text-3xl text-suii-lime">{summary.smoking.today ?? "Not logged"} <span className="text-sm text-suii-muted">today</span></p>
            <p className="mt-2 text-suii-muted">Baseline {summary.smoking.baseline ?? "Not established"}.</p>
          </section>
          <section className="card p-4">
            <h2 className="display text-xl">Weekly Check-In</h2>
            <p className="mt-3 text-suii-muted">Weight · Waist · Photos · Energy</p>
            <Link href="/progress/check-in" className="focus-ring mt-4 block rounded-lg bg-suii-lime px-3 py-3 text-center display text-black">Start Check-In</Link>
          </section>
        </div>

        <Link href="/progress/reports" className="card mt-4 flex items-center justify-between border-suii-gold/50 p-4">
          <div className="flex items-center gap-3"><Trophy className="text-suii-gold" /><div><p className="display text-2xl text-suii-gold">{summary.recentMilestones[0] ?? "Milestones unlock from real data"}</p><p className="text-suii-muted">{summary.insight}</p></div></div>
          <ChevronRight />
        </Link>
      </div>
    </AppShell>
  );
}

function MetricRow({ icon, value, start, target, delta, tone }: { icon: React.ReactNode; value: string; start: string; target: string; delta: string; tone: string }) {
  return <div className="mt-5 grid grid-cols-[48px_1fr] gap-4 border-t border-white/10 pt-5">{icon}<div><div className="flex items-end justify-between"><p className={`display text-5xl ${tone}`}>{value}</p><p className="display rounded-lg border border-white/15 px-3 py-2">{delta}</p></div><div className="mt-2 flex justify-between text-suii-muted"><span>Start {start}</span><span>Target {target}</span></div></div></div>;
}

function Tile({ icon, label, value, tone = "text-suii-lime" }: { icon: React.ReactNode; label: string; value: string; tone?: string }) {
  return <div className="rounded-lg border border-white/10 p-3"><div className={tone}>{icon}</div><p className="display mt-2 text-suii-muted">{label}</p><p className={`display text-2xl ${tone}`}>{value}</p></div>;
}
