"use client";

import Link from "next/link";
import { Check, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getExerciseDefinition, getWorkoutDefinition } from "@/data/training";
import { useNutritionRepository } from "@/hooks/useNutritionRepository";
import { roundNutrition } from "@/lib/nutritionCalc";
import { useTrainingRepository } from "@/hooks/useTrainingRepository";
import { StatTile, TrainingButton } from "@/components/training/TrainingChrome";
import { dashboardData } from "@/data/dashboard";

function fmtDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function WorkoutCompletePage({ sessionId }: { sessionId: string }) {
  const { repository, saveFeedback } = useTrainingRepository();
  const nutrition = useNutritionRepository();
  const session = repository.getSession(sessionId);
  const summary = nutrition.repository.getDailyNutritionSummary(dashboardData.dateISO);
  const consumed = roundNutrition(summary.consumed);

  if (!session) {
    return (
      <AppShell hideNavigation>
        <div className="p-6">
          <h1 className="display text-4xl">Session not found</h1>
          <Link href="/train" className="mt-4 block rounded-lg bg-suii-lime px-4 py-3 text-center font-black uppercase text-black">Back to Train</Link>
        </div>
      </AppShell>
    );
  }

  const workout = getWorkoutDefinition(session.workoutDefinitionId);
  const totals = repository.getSessionTotals(session);
  const recommendation = repository.getRecommendations(sessionId);

  return (
    <AppShell hideNavigation>
      <div className="px-4 py-6">
        <Link href="/train" className="focus-ring inline-flex rounded-full p-2 text-white" aria-label="Close completion"><span className="text-4xl leading-none">×</span></Link>
        <div className="text-center">
          <div className="mx-auto flex size-24 items-center justify-center rounded-full border-4 border-suii-lime text-suii-lime shadow-[0_0_34px_rgba(198,255,36,0.35)]">
            <Check className="size-14" aria-hidden="true" />
          </div>
          <p className="display mt-4 text-sm text-suii-muted">Project SUIII</p>
          <h1 className="display mt-2 text-5xl text-suii-lime">{session.status === "partial" ? "Workout Saved" : "Workout Complete"}</h1>
          <p className="display mt-1 text-suii-muted">{workout.name} · {workout.dayName}</p>
        </div>

        <section className="card mt-6 grid grid-cols-4 gap-2 p-3">
          <StatTile label="Duration" value={fmtDuration(totals.durationMs)} />
          <StatTile label="Sets" value={totals.completedSets} />
          <StatTile label="Reps" value={totals.reps} />
          <StatTile label="Kg Volume" value={totals.volumeKg} />
        </section>

        <section className="card mt-3 p-4">
          <h2 className="display text-2xl text-suii-muted">Exercise Results</h2>
          <div className="mt-2 divide-y divide-white/10">
            {session.exerciseSessions.slice(0, 5).map((exerciseSession, index) => {
              const prescription = workout.exercises.find((item) => item.id === exerciseSession.exercisePrescriptionId)!;
              const exercise = getExerciseDefinition(prescription.exerciseId);
              const reps = exerciseSession.setLogs.reduce((sum, set) => sum + (set.reps ?? set.seconds ?? 0) + (set.sideLogs?.reduce((sideSum, side) => sideSum + side.reps, 0) ?? 0), 0);
              return (
                <div key={exerciseSession.exercisePrescriptionId} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 py-3">
                  <span className="grid size-8 place-items-center rounded-full border border-white/20 text-sm">{index + 1}</span>
                  <div>
                    <p className="display text-lg text-white">{exercise.name}</p>
                    <p className="text-xs text-suii-muted">{exercise.defaultResistance.label}</p>
                  </div>
                  <span className="display text-suii-lime">{reps} reps</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card mt-3 p-4">
          <div className="flex gap-3">
            <TrendingUp className="size-10 text-suii-blue" aria-hidden="true" />
            <div>
              <p className="display text-suii-blue">Next Time</p>
              <p className="text-white">{recommendation?.reason ?? "Repeat the planned targets with controlled form."}</p>
              <p className="mt-1 text-xs uppercase text-suii-muted">Recommendation · review before applying</p>
            </div>
          </div>
        </section>

        <section className="card mt-3 p-4">
          <h2 className="display text-2xl text-suii-muted">How did it feel?</h2>
          <div className="mt-3 grid grid-cols-5 gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((effort) => (
              <button key={effort} className={`focus-ring min-h-11 rounded border text-sm font-black ${session.feedback?.effort === effort ? "border-suii-lime bg-suii-lime text-black" : "border-white/10 text-white"}`} onClick={() => saveFeedback(sessionId, { effort, soreness: session.feedback?.soreness ?? "mild", note: session.feedback?.note ?? "", updatedAt: new Date().toISOString() })}>{effort}</button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(["none", "mild", "high"] as const).map((level) => (
              <TrainingButton key={level} variant={session.feedback?.soreness === level ? "primary" : "outline"} onClick={() => saveFeedback(sessionId, { effort: session.feedback?.effort ?? 7, soreness: level, note: session.feedback?.note ?? "", updatedAt: new Date().toISOString() })}>{level}</TrainingButton>
            ))}
          </div>
        </section>

        <section className="card mt-3 grid grid-cols-3 gap-2 p-3">
          <div className="rounded-lg border border-white/10 p-3"><p className="display text-white">Badminton</p><Check className="mt-1 size-5 text-suii-lime" /></div>
          <div className="rounded-lg border border-white/10 p-3"><p className="display text-white">Workout</p><Check className="mt-1 size-5 text-suii-lime" /></div>
          <div className="rounded-lg border border-white/10 p-3"><p className="display text-white">Protein</p><p className="mt-1 text-suii-blue">{consumed.protein} / 145g</p></div>
        </section>

        <div className="mt-4 grid gap-2">
          <Link href="/train" className="focus-ring rounded-lg bg-suii-lime px-4 py-4 text-center font-black uppercase text-black">Back to Train</Link>
          <Link href={`/train/session/${sessionId}`} className="focus-ring rounded-lg border border-suii-lime px-4 py-4 text-center font-black uppercase text-suii-lime">View Full Session</Link>
        </div>
      </div>
    </AppShell>
  );
}
