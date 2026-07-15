"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, Dumbbell, History, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { equipmentLabels, getExerciseDefinition, getWorkoutDefinition, getWorkoutForDate } from "@/data/training";
import { formatDhakaShortDate, getWeekdayName, useDhakaClock } from "@/lib/dhakaClock";
import { suggestAdjustment } from "@/lib/trainingCalc";
import { useTrainingRepository } from "@/hooks/useTrainingRepository";
import { StatTile, TrainingButton } from "@/components/training/TrainingChrome";

export function TrainDashboard() {
  const router = useRouter();
  const clock = useDhakaClock();
  const today = clock.dateKey;
  const { repository, createReadiness, startSession, discardSession } = useTrainingRepository();
  const [badmintonGames, setBadmintonGames] = useState(1);
  const [energy, setEnergy] = useState<"low" | "normal" | "high">("normal");
  const [soreness, setSoreness] = useState(2);
  const [sleepHours, setSleepHours] = useState(7);
  const [badmintonDurationMinutes, setBadmintonDurationMinutes] = useState(45);
  const [badmintonIntensity, setBadmintonIntensity] = useState<"easy" | "moderate" | "hard">("moderate");
  const [legSoreness, setLegSoreness] = useState(2);
  const [shoulderSoreness, setShoulderSoreness] = useState(2);
  const [sleepQuality, setSleepQuality] = useState<"poor" | "ok" | "good">("ok");
  const [unusualPainAcknowledged, setUnusualPainAcknowledged] = useState(false);
  const [readinessNote, setReadinessNote] = useState("");
  const [discardOpen, setDiscardOpen] = useState(false);
  if (!clock.hydrated) {
    return (
      <AppShell>
        <div className="px-4 pt-5">
          <p className="display text-sm text-suii-gold">Project SUIII</p>
          <h1 className="display text-6xl leading-none text-white">Train</h1>
          <p className="mt-1 text-sm text-suii-muted">Loading Dhaka date</p>
        </div>
      </AppShell>
    );
  }
  const activeSession = repository.getActiveSession();
  const workout = activeSession ? repository.getWorkoutDefinition(activeSession.workoutDefinitionId) : getWorkoutForDate(today);
  const history = repository.getSessionHistory();
  const readiness = activeSession?.readiness ?? createReadiness(today, {
    badmintonGames,
    badmintonPlayedToday: badmintonGames > 0,
    badmintonDurationMinutes,
    badmintonIntensity,
    energy,
    soreness,
    legSoreness,
    shoulderSoreness,
    sleepHours,
    sleepQuality,
    unusualPainAcknowledged,
    note: readinessNote,
    warningFlags: unusualPainAcknowledged ? ["unusual pain"] : []
  });
  const adjustment = workout ? suggestAdjustment(readiness, workout.name) : null;
  const recent = history.find((session) => session.status === "completed" || session.status === "partial");

  const handleStart = (adjustmentKind = adjustment?.kind) => {
    if (!workout || !today) return;
    const id = startSession(today, workout.id, readiness, adjustmentKind);
    if (id) router.push(`/train/session/${id}`);
  };

  return (
    <AppShell>
      <div className="px-4 pt-5">
        <header className="flex items-start justify-between">
          <div>
            <p className="display text-sm text-suii-gold">Project SUIII</p>
            <h1 className="display text-6xl leading-none text-white">Train</h1>
            <p className="mt-1 text-sm text-suii-muted">{today ? formatDhakaShortDate(today) : "Loading Dhaka date"}</p>
          </div>
          <Link href="/train/history" className="focus-ring rounded-full border border-white/10 bg-white/5 p-3 text-suii-lime" aria-label="Workout history">
            <History className="size-6" aria-hidden="true" />
          </Link>
        </header>

        <section className="card mt-5 overflow-hidden p-4">
          {workout ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="display text-sm text-suii-muted">{workout.scheduledTime}</p>
                  <h2 className="display mt-1 text-4xl leading-none text-white">{workout.name}</h2>
                  <p className="mt-2 text-sm text-suii-muted">{workout.summary}</p>
                </div>
                <div className="rounded-full border border-suii-lime/50 bg-suii-lime/10 p-4 text-suii-lime">
                  <Dumbbell className="size-8" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <StatTile label="Exercises" value={workout.exercises.length} />
                <StatTile label="Minutes" value={workout.estimatedMinutes} tone="blue" />
                <StatTile label={workout.category} value="Ready" tone="gold" />
              </div>
              <p className="mt-4 text-xs uppercase tracking-wide text-suii-muted">Equipment: {workout.equipment.map((item) => equipmentLabels[item]).join(", ")}</p>
              <div className="mt-4 grid gap-2">
                {activeSession ? (
                  <ActiveResumePanel
                    session={activeSession}
                    workoutName={workout.name}
                    currentExercise={getExerciseDefinition(workout.exercises[activeSession.currentExerciseIndex]?.exerciseId ?? workout.exercises[0].exerciseId).name}
                    completedSets={repository.getSessionTotals(activeSession).completedSets}
                    elapsedMinutes={Math.floor(repository.getSessionTotals(activeSession).durationMs / 60000)}
                    onDiscard={() => setDiscardOpen(true)}
                  />
                ) : (
                  <TrainingButton onClick={() => handleStart()}>Start Workout</TrainingButton>
                )}
              </div>
            </>
          ) : (
            <div>
              <h2 className="display text-4xl text-suii-lime">Complete Rest</h2>
              <p className="mt-2 text-suii-muted">Recovery is protected. No make-up workout required; an easy walk is optional.</p>
            </div>
          )}
        </section>

        <section className="card mt-3 p-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-8 text-suii-blue" aria-hidden="true" />
            <div>
              <h2 className="display text-2xl text-white">Readiness</h2>
              <p className="text-sm text-suii-muted">Badminton {readiness.badmintonGames} games · energy {readiness.energy} · soreness {readiness.soreness}/10</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <label className="text-xs font-bold uppercase text-suii-muted">
              Badminton games
              <input className="focus-ring mt-1 h-12 w-full rounded-lg border border-white/10 bg-black px-3 text-white" inputMode="numeric" min={0} max={10} type="number" value={badmintonGames} onChange={(event) => setBadmintonGames(Math.max(0, Math.min(10, Number(event.target.value))))} />
            </label>
            <label className="text-xs font-bold uppercase text-suii-muted">
              Energy
              <select className="focus-ring mt-1 h-12 w-full rounded-lg border border-white/10 bg-black px-3 text-white" value={energy} onChange={(event) => setEnergy(event.target.value as "low" | "normal" | "high")}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </label>
            <label className="text-xs font-bold uppercase text-suii-muted">
              Soreness 0-10
              <input className="focus-ring mt-1 h-12 w-full rounded-lg border border-white/10 bg-black px-3 text-white" inputMode="numeric" min={0} max={10} type="number" value={soreness} onChange={(event) => setSoreness(Math.max(0, Math.min(10, Number(event.target.value))))} />
            </label>
            <label className="text-xs font-bold uppercase text-suii-muted">
              Sleep hours
              <input className="focus-ring mt-1 h-12 w-full rounded-lg border border-white/10 bg-black px-3 text-white" inputMode="decimal" min={0} max={16} type="number" value={sleepHours} onChange={(event) => setSleepHours(Math.max(0, Math.min(16, Number(event.target.value))))} />
            </label>
            <label className="text-xs font-bold uppercase text-suii-muted">
              Badminton minutes
              <input className="focus-ring mt-1 h-12 w-full rounded-lg border border-white/10 bg-black px-3 text-white" inputMode="numeric" min={0} max={300} type="number" value={badmintonDurationMinutes} onChange={(event) => setBadmintonDurationMinutes(Math.max(0, Math.min(300, Number(event.target.value))))} />
            </label>
            <label className="text-xs font-bold uppercase text-suii-muted">
              Intensity
              <select className="focus-ring mt-1 h-12 w-full rounded-lg border border-white/10 bg-black px-3 text-white" value={badmintonIntensity} onChange={(event) => setBadmintonIntensity(event.target.value as "easy" | "moderate" | "hard")}>
                <option value="easy">Easy</option>
                <option value="moderate">Moderate</option>
                <option value="hard">Hard</option>
              </select>
            </label>
            <label className="text-xs font-bold uppercase text-suii-muted">
              Leg soreness
              <input className="focus-ring mt-1 h-12 w-full rounded-lg border border-white/10 bg-black px-3 text-white" inputMode="numeric" min={0} max={10} type="number" value={legSoreness} onChange={(event) => setLegSoreness(Math.max(0, Math.min(10, Number(event.target.value))))} />
            </label>
            <label className="text-xs font-bold uppercase text-suii-muted">
              Shoulder soreness
              <input className="focus-ring mt-1 h-12 w-full rounded-lg border border-white/10 bg-black px-3 text-white" inputMode="numeric" min={0} max={10} type="number" value={shoulderSoreness} onChange={(event) => setShoulderSoreness(Math.max(0, Math.min(10, Number(event.target.value))))} />
            </label>
            <label className="text-xs font-bold uppercase text-suii-muted">
              Sleep quality
              <select className="focus-ring mt-1 h-12 w-full rounded-lg border border-white/10 bg-black px-3 text-white" value={sleepQuality} onChange={(event) => setSleepQuality(event.target.value as "poor" | "ok" | "good")}>
                <option value="poor">Poor</option>
                <option value="ok">OK</option>
                <option value="good">Good</option>
              </select>
            </label>
            <label className="col-span-2 flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs font-bold uppercase text-suii-muted">
              <input type="checkbox" checked={unusualPainAcknowledged} onChange={(event) => setUnusualPainAcknowledged(event.target.checked)} />
              Unusual pain today
            </label>
            <label className="col-span-2 text-xs font-bold uppercase text-suii-muted">
              Optional note
              <input className="focus-ring mt-1 h-12 w-full rounded-lg border border-white/10 bg-black px-3 text-white" value={readinessNote} onChange={(event) => setReadinessNote(event.target.value)} aria-label="Body areas or context" />
            </label>
          </div>
          {adjustment ? (
            <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <p className="display text-suii-lime">{adjustment.kind.replace("_", " ")}</p>
              <p className="mt-1 text-sm text-white">{adjustment.suggestion}</p>
              <p className="mt-1 text-xs text-suii-muted">{adjustment.reason}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[0.68rem] font-black uppercase">
                <button className="focus-ring rounded border border-suii-lime/50 px-2 py-2 text-center text-suii-lime" onClick={() => handleStart(adjustment.kind)}>Accept</button>
                <button className="focus-ring rounded border border-white/10 px-2 py-2 text-center text-suii-muted" onClick={() => handleStart("planned")}>Keep</button>
                <button className="focus-ring rounded border border-suii-blue/50 px-2 py-2 text-center text-suii-blue" onClick={() => handleStart("recovery")}>Recovery</button>
              </div>
            </div>
          ) : null}
        </section>

        <section className="card mt-3 p-4">
          <h2 className="display text-2xl text-white">Weekly Schedule</h2>
          <div className="mt-3 grid gap-2">
            {repository.getWeeklySchedule().map((entry) => {
              const state = today && entry.dayName === getWeekdayName(today) ? "current" : entry.category === "rest" ? "rest" : "scheduled";
              return (
                <div key={entry.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3">
                  <div>
                    <p className="display text-white">{entry.dayName}</p>
                    <p className="text-sm text-suii-muted">{entry.label}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${state === "current" ? "border-suii-lime text-suii-lime" : state === "rest" ? "border-suii-blue text-suii-blue" : "border-white/10 text-suii-muted"}`}>{state}</span>
                </div>
              );
            })}
          </div>
        </section>

        {workout ? (
          <section className="card mt-3 p-4">
            <h2 className="display text-2xl text-white">Workout Preview</h2>
            <div className="mt-3 divide-y divide-white/10">
              {workout.exercises.map((prescription) => {
                const exercise = getExerciseDefinition(prescription.exerciseId);
                return (
                  <div key={prescription.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="font-bold text-white">{exercise.name}</p>
                      <p className="text-xs text-suii-muted">{formatPreviewPrescription(prescription, exercise)}</p>
                    </div>
                    <Clock3 className="size-5 text-suii-muted" aria-hidden="true" />
                  </div>
                );
              })}
            </div>
            {activeSession ? (
              <Link href={`/train/session/${activeSession.id}`} className="focus-ring mt-4 block rounded-lg bg-suii-lime px-4 py-4 text-center font-black uppercase text-black">
                Resume Workout
              </Link>
            ) : (
              <button type="button" onClick={() => handleStart()} className="focus-ring mt-4 w-full rounded-lg bg-suii-lime px-4 py-4 text-center font-black uppercase text-black">
                Start Today&apos;s Workout
              </button>
            )}
          </section>
        ) : null}

        <section className="card mt-3 p-4">
          <h2 className="display text-2xl text-white">Recent Performance</h2>
          {recent ? (
            <div className="mt-3 flex items-center gap-3">
              <CheckCircle2 className="size-8 text-suii-lime" aria-hidden="true" />
              <div>
                <p className="font-bold text-white">{getWorkoutDefinition(recent.workoutDefinitionId).name}</p>
                <p className="text-sm text-suii-muted">{repository.getSessionTotals(recent).completedSets} sets · {recent.status} · {repository.getSessionTotals(recent).reps} reps</p>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-3 text-suii-muted">
              <CalendarDays className="size-8" aria-hidden="true" />
              <p className="text-sm">No completed strength sessions yet. Your first log will appear here.</p>
            </div>
          )}
        </section>
        {discardOpen && activeSession ? (
          <div className="fixed inset-0 z-40 flex items-end bg-black/70 p-4">
            <div className="card w-full p-4">
              <h2 className="display text-3xl text-white">Discard saved workout?</h2>
              <p className="mt-2 text-sm text-suii-muted">This only removes the local active workout after confirmation. Completed history and failed sync records are preserved.</p>
              <div className="mt-4 grid gap-2">
                <TrainingButton onClick={() => setDiscardOpen(false)}>Keep Workout</TrainingButton>
                <TrainingButton variant="ghost" onClick={() => { discardSession(activeSession.id); setDiscardOpen(false); }}>Confirm Discard</TrainingButton>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

function ActiveResumePanel({ session, workoutName, currentExercise, completedSets, elapsedMinutes, onDiscard }: { session: { id: string; updatedAt: string }; workoutName: string; currentExercise: string; completedSets: number; elapsedMinutes: number; onDiscard: () => void }) {
  return (
    <div className="rounded-lg border border-suii-lime/40 bg-suii-lime/10 p-3">
      <h3 className="display text-2xl text-suii-lime">Resume {workoutName}</h3>
      <p className="mt-1 text-sm text-white">{completedSets} completed sets · current: {currentExercise}</p>
      <p className="mt-1 text-xs text-suii-muted">{elapsedMinutes} min elapsed · last saved {new Date(session.updatedAt).toLocaleString()}</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Link href={`/train/session/${session.id}`} className="focus-ring rounded-lg bg-suii-lime px-2 py-3 text-center font-black uppercase text-black">Resume</Link>
        <Link href={`/train/session/${session.id}/complete`} className="focus-ring rounded-lg border border-white/20 px-2 py-3 text-center font-black uppercase text-suii-muted">Review</Link>
        <button type="button" onClick={onDiscard} className="focus-ring rounded-lg border border-white/20 px-2 py-3 font-black uppercase text-suii-muted">Discard</button>
      </div>
    </div>
  );
}

function formatPreviewPrescription(
  prescription: ReturnType<typeof getWorkoutDefinition>["exercises"][number],
  exercise: ReturnType<typeof getExerciseDefinition>
) {
  const target = prescription.targetReps ?? (prescription.targetSeconds && /^\d+$/.test(prescription.targetSeconds) ? `${prescription.targetSeconds} sec` : prescription.targetSeconds);
  const sideInstruction = exercise.unilateral && !String(target).toLowerCase().includes("each") ? "each side" : null;
  return [`${prescription.week1Sets} sets`, target, exercise.defaultResistance.label, sideInstruction].filter(Boolean).join(" · ");
}
