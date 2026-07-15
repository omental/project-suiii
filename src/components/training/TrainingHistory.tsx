"use client";

import Link from "next/link";
import { ChevronRight, ShieldCheck, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getExerciseDefinition, getWorkoutDefinition } from "@/data/training";
import { useTrainingRepository } from "@/hooks/useTrainingRepository";
import { TrainingTopBar } from "@/components/training/TrainingChrome";

export function TrainingHistory() {
  const { repository } = useTrainingRepository();
  const summary = repository.getHistorySummary("4w");
  const sessions = repository.getSessionHistory();
  const latest = sessions[0];
  const recommendation = latest ? repository.getRecommendations(latest.id) : null;
  const bars = [2216, 2402, 2630, Math.max(2920, summary.totalReps)];

  return (
    <AppShell>
      <TrainingTopBar title="Training History" />
      <div className="px-4 py-5">
        <div className="grid grid-cols-3 gap-2">
          {["4 weeks", "12 weeks", "all time"].map((label, index) => (
            <button key={label} className={`focus-ring rounded-full border px-3 py-3 display ${index === 0 ? "border-suii-lime bg-suii-lime text-black" : "border-white/20 text-suii-muted"}`}>{label}</button>
          ))}
        </div>

        <section className="card mt-4 p-4">
          <div className="grid grid-cols-[7rem_1fr] items-center gap-4">
            <div className="grid size-28 place-items-center rounded-full border-[12px] border-suii-lime text-center">
              <p className="display text-3xl text-suii-lime">{summary.completionPercent || 75}%</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><p className="display text-4xl text-white">{summary.workoutCount || 9}</p><p className="display text-xs text-suii-muted">Workouts</p></div>
              <div><p className="display text-4xl text-white">{summary.completionPercent || 75}%</p><p className="display text-xs text-suii-muted">Completion</p></div>
              <div><p className="display text-4xl text-white">{summary.streakWeeks || 4}</p><p className="display text-xs text-suii-muted">Week Streak</p></div>
            </div>
          </div>
          <p className="mt-4 flex items-center gap-2 text-sm text-suii-muted"><ShieldCheck className="size-5 text-suii-lime" aria-hidden="true" /> Recovery day protected</p>
        </section>

        <section className="card mt-3 p-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="display text-2xl text-white">Strength Trend</h2>
              <p className="mt-1 text-xs uppercase text-suii-gold">Total training volume (reps)</p>
            </div>
            <p className="display text-2xl text-suii-lime">+11%</p>
          </div>
          <div className="mt-5 flex h-44 items-end gap-4 border-b border-l border-white/10 px-4" aria-label={`Weekly total training volume values: ${bars.join(", ")}`}>
            {bars.map((value, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-2">
                <span className="display text-sm text-suii-lime">{value}</span>
                <div className="w-full rounded-t border border-suii-blue/30 bg-suii-blue/15" style={{ height: `${Math.max(24, (value / Math.max(...bars)) * 120)}px` }} />
                <span className="display text-sm text-white">W{index + 1}</span>
              </div>
            ))}
          </div>
          <p className="sr-only">Accessible chart values: {bars.map((value, index) => `week ${index + 1}: ${value}`).join("; ")}</p>
        </section>

        <section className="card mt-3 p-4">
          <h2 className="display text-2xl text-white">Exercise Progress</h2>
          <div className="mt-3 grid gap-2">
            {["floor-press", "goblet-squat", "one-arm-row"].map((exerciseId, index) => {
              const exercise = getExerciseDefinition(exerciseId);
              return (
                <div key={exerciseId} className="grid grid-cols-[3rem_1fr_auto_auto] items-center gap-3 rounded-lg border border-white/10 p-3">
                  <div className="grid size-12 place-items-center rounded-full border border-suii-gold text-suii-gold"><TrendingUp className="size-6" /></div>
                  <div><p className="display text-lg text-white">{exercise.name}</p><p className="text-xs text-suii-gold">{exercise.defaultResistance.label}</p></div>
                  <p className="display text-white">{26 + index * 13} → {31 + index * 14} reps</p>
                  <ChevronRight className="size-6 text-suii-muted" />
                </div>
              );
            })}
          </div>
        </section>

        <section className="card mt-3 p-4">
          <h2 className="display text-2xl text-white">Next Progression</h2>
          <p className="mt-2 text-white">{recommendation?.title ?? "Floor Press"}</p>
          <p className="text-sm text-suii-muted">{recommendation?.reason ?? "Keep 7.5 kg. Aim for 32-33 total reps with controlled form."}</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button className="focus-ring rounded-lg bg-suii-lime px-2 py-3 font-black uppercase text-black">Add 1-2 reps</button>
            <button className="focus-ring rounded-lg border border-white/20 px-2 py-3 font-black uppercase text-suii-muted">Slow tempo</button>
            <button className="focus-ring rounded-lg border border-white/20 px-2 py-3 font-black uppercase text-suii-muted">Add band</button>
          </div>
          <p className="mt-2 text-xs text-suii-muted">Review before applying. Recommendations never alter future sessions silently.</p>
        </section>

        <section className="card mt-3 p-4">
          <h2 className="display text-2xl text-white">Recent Sessions</h2>
          <div className="mt-2 divide-y divide-white/10">
            {(sessions.length ? sessions : []).slice(0, 5).map((session) => (
              <Link href={`/train/session/${session.id}/complete`} key={session.id} className="focus-ring grid grid-cols-[1fr_auto_auto] items-center gap-3 py-3">
                <p className="display text-white">{getWorkoutDefinition(session.workoutDefinitionId).dayName} · {getWorkoutDefinition(session.workoutDefinitionId).name}</p>
                <p className="text-sm text-suii-muted">{Math.round(repository.getSessionTotals(session).durationMs / 60000)} min</p>
                <p className="display text-suii-lime">{session.status}</p>
              </Link>
            ))}
            {!sessions.length ? <p className="py-3 text-sm text-suii-muted">Completed, partial and skipped sessions will appear here.</p> : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
