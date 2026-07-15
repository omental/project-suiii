"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, ShieldCheck, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { exerciseDefinitions, getExerciseDefinition, getWorkoutDefinition, workoutDefinitions } from "@/data/training";
import { useTrainingRepository } from "@/hooks/useTrainingRepository";
import { TrainingTopBar } from "@/components/training/TrainingChrome";
import { calculatePersonalRecords, filterWorkoutHistory, setTotalReps } from "@/lib/trainingCalc";

export function TrainingHistory() {
  const { repository } = useTrainingRepository();
  const [range, setRange] = useState<"4w" | "12w" | "all">("4w");
  const [workoutFilter, setWorkoutFilter] = useState("");
  const [exerciseFilter, setExerciseFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "partial">("all");
  const summary = repository.getHistorySummary(range);
  const sessions = repository.getSessionHistory();
  const latestDate = sessions[0]?.date;
  const dateFrom = range === "all" || !latestDate ? undefined : subtractDays(latestDate, range === "4w" ? 28 : 84);
  const completedSessions = filterWorkoutHistory(sessions, {
    workoutId: workoutFilter || undefined,
    exerciseId: exerciseFilter || undefined,
    dateFrom,
    statuses: statusFilter === "all" ? ["completed", "partial"] : [statusFilter]
  });
  const latest = completedSessions[0];
  const recommendation = latest ? repository.getRecommendations(latest.id) : null;
  const bars = completedSessions.slice(0, 4).reverse().map((session) => repository.getSessionTotals(session).reps);
  const personalRecords = calculatePersonalRecords(completedSessions).map((record) => ({ exercise: getExerciseDefinition(record.exerciseId), bestSet: Math.max(record.highestRepsAtLoad, record.longestTimedHoldSeconds), record }));
  const legacyBestSets = completedSessions.flatMap((session) => {
    const workout = getWorkoutDefinition(session.workoutDefinitionId);
    return session.exerciseSessions.map((exerciseSession) => {
      const prescription = workout.exercises.find((item) => item.id === exerciseSession.exercisePrescriptionId);
      const exercise = getExerciseDefinition(exerciseSession.performedExerciseId ?? prescription?.exerciseId ?? "");
      const bestSet = exerciseSession.setLogs.reduce((best, set) => Math.max(best, setTotalReps(set)), 0);
      return { exercise, bestSet };
    });
  }).filter((item) => item.bestSet > 0).sort((a, b) => b.bestSet - a.bestSet).slice(0, 5);

  return (
    <AppShell>
      <TrainingTopBar title="Training History" />
      <div className="px-4 py-5">
        <div className="grid grid-cols-3 gap-2">
          {(["4w", "12w", "all"] as const).map((value) => (
            <button key={value} onClick={() => setRange(value)} className={`focus-ring rounded-full border px-3 py-3 display ${range === value ? "border-suii-lime bg-suii-lime text-black" : "border-white/20 text-suii-muted"}`}>{value === "4w" ? "4 weeks" : value === "12w" ? "12 weeks" : "all time"}</button>
          ))}
        </div>
        <section className="card mt-3 grid gap-2 p-3">
          <label className="text-xs font-bold uppercase text-suii-muted">Workout filter
            <select value={workoutFilter} onChange={(event) => setWorkoutFilter(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-white/10 bg-black px-3 text-white">
              <option value="">All workouts</option>
              {workoutDefinitions.map((workout) => <option key={workout.id} value={workout.id}>{workout.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold uppercase text-suii-muted">Exercise filter
            <select value={exerciseFilter} onChange={(event) => setExerciseFilter(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-white/10 bg-black px-3 text-white">
              <option value="">All exercises</option>
              {exerciseDefinitions.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(["all", "completed", "partial"] as const).map((value) => <button key={value} onClick={() => setStatusFilter(value)} className={`focus-ring rounded-lg border px-2 py-3 text-xs font-black uppercase ${statusFilter === value ? "border-suii-lime bg-suii-lime text-black" : "border-white/10 text-suii-muted"}`}>{value}</button>)}
          </div>
        </section>

        <section className="card mt-4 p-4">
          <div className="grid grid-cols-[7rem_1fr] items-center gap-4">
            <div className="grid size-28 place-items-center rounded-full border-[12px] border-suii-lime text-center">
              <p className="display text-3xl text-suii-lime">{summary.completionPercent}%</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><p className="display text-4xl text-white">{summary.workoutCount}</p><p className="display text-xs text-suii-muted">Workouts</p></div>
              <div><p className="display text-4xl text-white">{summary.completionPercent}%</p><p className="display text-xs text-suii-muted">Completion</p></div>
              <div><p className="display text-4xl text-white">{summary.streakWeeks}</p><p className="display text-xs text-suii-muted">Week Streak</p></div>
            </div>
          </div>
          <p className="mt-4 flex items-center gap-2 text-sm text-suii-muted"><ShieldCheck className="size-5 text-suii-lime" aria-hidden="true" /> Recovery day protected</p>
        </section>

        <section className="card mt-3 p-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="display text-2xl text-white">Strength Trend</h2>
              <p className="mt-1 text-xs uppercase text-suii-gold">Total training volume in reps</p>
            </div>
            <p className="display text-2xl text-suii-lime">{summary.totalReps}</p>
          </div>
          <div className="mt-5 flex h-44 items-end gap-4 border-b border-l border-white/10 px-4" aria-label={`Weekly total training volume values: ${bars.join(", ") || "0"}`}>
            {(bars.length ? bars : [0]).map((value, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-2">
                <span className="display text-sm text-suii-lime">{value}</span>
                <div className="w-full rounded-t border border-suii-blue/30 bg-suii-blue/15" style={{ height: `${Math.max(12, (value / Math.max(1, ...bars)) * 120)}px` }} />
                <span className="display text-sm text-white">W{index + 1}</span>
              </div>
            ))}
          </div>
          <p className="sr-only">Accessible chart values: {(bars.length ? bars : [0]).map((value, index) => `week ${index + 1}: ${value}`).join("; ")}</p>
        </section>

        <section className="card mt-3 p-4">
          <h2 className="display text-2xl text-white">Personal Records</h2>
          <div className="mt-3 grid gap-2">
            {(personalRecords.length ? personalRecords : legacyBestSets).slice(0, 5).map(({ exercise, bestSet }) => (
              <div key={exercise.id} className="grid grid-cols-[3rem_1fr_auto_auto] items-center gap-3 rounded-lg border border-white/10 p-3">
                <div className="grid size-12 place-items-center rounded-full border border-suii-gold text-suii-gold"><TrendingUp className="size-6" /></div>
                <div><p className="display text-lg text-white">{exercise.name}</p><p className="text-xs text-suii-gold">{exercise.defaultResistance.label}</p></div>
                <p className="display text-white">{bestSet} best</p>
                <ChevronRight className="size-6 text-suii-muted" />
              </div>
            ))}
            {!personalRecords.length ? <p className="text-sm text-suii-muted">Personal records appear after you complete logged sets.</p> : null}
          </div>
        </section>

        <section className="card mt-3 p-4">
          <h2 className="display text-2xl text-white">Next Progression</h2>
          <p className="mt-2 text-white">{recommendation?.title ?? "No completed workout yet"}</p>
          <p className="text-sm text-suii-muted">{recommendation?.reason ?? "Complete a session to receive a reviewed progression recommendation."}</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button className="focus-ring rounded-lg bg-suii-lime px-2 py-3 font-black uppercase text-black">Accept</button>
            <button className="focus-ring rounded-lg border border-white/20 px-2 py-3 font-black uppercase text-suii-muted">Keep</button>
            <button className="focus-ring rounded-lg border border-white/20 px-2 py-3 font-black uppercase text-suii-muted">Review</button>
          </div>
          <p className="mt-2 text-xs text-suii-muted">Recommendations never alter future sessions silently.</p>
        </section>

        <section className="card mt-3 p-4">
          <h2 className="display text-2xl text-white">Recent Sessions</h2>
          <div className="mt-2 divide-y divide-white/10">
            {completedSessions.slice(0, 5).map((session) => (
              <Link href={`/train/session/${session.id}/complete`} key={session.id} className="focus-ring grid grid-cols-[1fr_auto_auto] items-center gap-3 py-3">
                <p className="display text-white">{getWorkoutDefinition(session.workoutDefinitionId).dayName} · {getWorkoutDefinition(session.workoutDefinitionId).name}</p>
                <p className="text-sm text-suii-muted">{Math.round(repository.getSessionTotals(session).durationMs / 60000)} min</p>
                <p className="display text-suii-lime">{session.status}</p>
              </Link>
            ))}
            {!completedSessions.length ? <p className="py-3 text-sm text-suii-muted">Completed and partial sessions will appear here.</p> : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function subtractDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}
