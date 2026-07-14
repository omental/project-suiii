"use client";

import Link from "next/link";
import { Pause, Play, TimerReset, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { getExerciseDefinition } from "@/data/training";
import { plannedSets, remainingRestSeconds } from "@/lib/trainingCalc";
import { useTrainingRepository } from "@/hooks/useTrainingRepository";
import { StatTile, TrainingButton } from "@/components/training/TrainingChrome";

function mmss(seconds: number) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function WorkoutPlayer({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { repository, saveSet, skipSet, clearRest, adjustRest, pauseSession, resumeSession, saveAndExit, discardSession, completeSession } = useTrainingRepository();
  const session = repository.getSession(sessionId);
  const [reps, setReps] = useState(12);
  const [rir, setRir] = useState<0 | 1 | 2 | 3 | 4>(2);
  const [exitOpen, setExitOpen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [vibrationEnabled, setVibrationEnabled] = useState(false);
  const notifiedRestKey = useRef<string | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const restTimerForNotification = session?.restTimer ?? null;
  const restRemainingForNotification = restTimerForNotification ? (now ? remainingRestSeconds(restTimerForNotification, now) : restTimerForNotification.originalSeconds) : 0;

  useEffect(() => {
    if (!restTimerForNotification || restRemainingForNotification > 0) return;
    const key = `${restTimerForNotification.exercisePrescriptionId}-${restTimerForNotification.setNumber}-${restTimerForNotification.restEndsAt}`;
    if (notifiedRestKey.current === key) return;
    notifiedRestKey.current = key;
    if (vibrationEnabled && "vibrate" in navigator) {
      try {
        navigator.vibrate([120, 80, 120]);
      } catch {
        // Haptics are optional and must never block workout completion.
      }
    }
    if (soundEnabled) {
      try {
        const AudioContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextCtor) return;
        const context = new AudioContextCtor();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = 880;
        gain.gain.value = 0.05;
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        window.setTimeout(() => {
          oscillator.stop();
          void context.close();
        }, 180);
      } catch {
        // Browsers may require a user gesture for audio; visible timer completion remains sufficient.
      }
    }
  }, [restRemainingForNotification, restTimerForNotification, soundEnabled, vibrationEnabled]);

  if (!session) {
    return (
      <AppShell hideNavigation>
        <div className="p-6">
          <h1 className="display text-4xl">Workout not found</h1>
          <Link href="/train" className="mt-4 block rounded-lg bg-suii-lime px-4 py-3 text-center font-black uppercase text-black">Back to Train</Link>
        </div>
      </AppShell>
    );
  }

  const workout = repository.getWorkoutDefinition(session.workoutDefinitionId);
  const prescription = workout.exercises[session.currentExerciseIndex];
  const exercise = getExerciseDefinition(prescription.exerciseId);
  const exerciseSession = session.exerciseSessions.find((item) => item.exercisePrescriptionId === prescription.id);
  const totalSets = plannedSets(prescription, 1, session.adjustment?.kind);
  const completedCount = session.exerciseSessions.flatMap((item) => item.setLogs).filter((set) => set.status === "completed").length;
  const plannedCount = workout.exercises.reduce((sum, item) => sum + plannedSets(item, 1, session.adjustment?.kind), 0);
  const restRemaining = session.restTimer ? (now ? remainingRestSeconds(session.restTimer, now) : session.restTimer.originalSeconds) : 0;
  const target = prescription.targetReps ?? `${prescription.targetSeconds} seconds`;
  const durationSeconds = Math.floor(repository.getSessionTotals(session).durationMs / 1000);
  const isLastPosition = session.currentExerciseIndex === workout.exercises.length - 1 && session.currentSetNumber >= totalSets;

  const completeCurrentSet = () => {
    const sideLogs = exercise.unilateral ? [{ side: "left" as const, reps }, { side: "right" as const, reps }] : undefined;
    saveSet(sessionId, { reps: exercise.hold ? undefined : reps, seconds: exercise.hold ? reps : undefined, rir, sideLogs });
  };

  const finish = (partial = false) => {
    completeSession(sessionId, { effort: 7, soreness: "mild", note: "", updatedAt: new Date().toISOString() }, partial);
    router.push(`/train/session/${sessionId}/complete`);
  };

  return (
    <AppShell hideNavigation>
      <div className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(198,255,36,0.12),transparent_18rem)]">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-suii-black/95 px-3 py-3 backdrop-blur">
          <button className="focus-ring rounded-full p-2" aria-label="Close workout" onClick={() => setExitOpen(true)}>
            <X className="size-7" aria-hidden="true" />
          </button>
          <div className="text-center">
            <p className="display text-xs text-suii-muted">{mmss(durationSeconds)}</p>
            <h1 className="display text-xl text-white">{workout.name}</h1>
          </div>
          <button className="focus-ring rounded-full p-2 text-suii-lime" onClick={() => session.status === "paused" ? resumeSession(sessionId) : pauseSession(sessionId)} aria-label={session.status === "paused" ? "Resume workout" : "Pause workout"}>
            {session.status === "paused" ? <Play className="size-7" aria-hidden="true" /> : <Pause className="size-7" aria-hidden="true" />}
          </button>
        </header>

        <div className="px-4 py-4">
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs font-bold uppercase text-suii-muted">
              <span>Exercise {session.currentExerciseIndex + 1} of {workout.exercises.length}</span>
              <span>Set {session.currentSetNumber} of {totalSets}</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-white/10" role="progressbar" aria-label="Workout progress" aria-valuenow={completedCount} aria-valuemin={0} aria-valuemax={plannedCount}>
              <div className="h-full rounded-full bg-suii-lime" style={{ width: `${Math.min(100, (completedCount / Math.max(1, plannedCount)) * 100)}%` }} />
            </div>
          </div>

          {session.restTimer ? (
            <section className="card p-5 text-center" aria-live="polite">
              <TimerReset className="mx-auto size-12 text-suii-lime" aria-hidden="true" />
              <p className="display mt-3 text-7xl text-suii-lime">{mmss(restRemaining)}</p>
              <p className="mt-2 text-sm text-suii-muted">Original rest {session.restTimer.originalSeconds}s · next target {target}</p>
              <div className="mt-5 grid grid-cols-3 gap-2">
                <TrainingButton variant="outline" onClick={() => adjustRest(sessionId, -15)}>-15s</TrainingButton>
                <TrainingButton onClick={() => clearRest(sessionId)}>Start Set</TrainingButton>
                <TrainingButton variant="outline" onClick={() => adjustRest(sessionId, 15)}>+15s</TrainingButton>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button className={`focus-ring rounded-lg border px-3 py-3 text-sm font-black uppercase ${soundEnabled ? "border-suii-lime text-suii-lime" : "border-white/10 text-suii-muted"}`} onClick={() => setSoundEnabled((value) => !value)}>Sound {soundEnabled ? "on" : "off"}</button>
                <button className={`focus-ring rounded-lg border px-3 py-3 text-sm font-black uppercase ${vibrationEnabled ? "border-suii-lime text-suii-lime" : "border-white/10 text-suii-muted"}`} onClick={() => setVibrationEnabled((value) => !value)}>Vibration {vibrationEnabled ? "on" : "off"}</button>
              </div>
              <p className="mt-4 text-xs text-suii-muted">Timer uses the saved `restEndsAt` clock time and restores after refresh. Sound and vibration are optional, require browser support, and never block completion.</p>
            </section>
          ) : (
            <>
              <section className="card overflow-hidden">
                <div className="flex min-h-48 items-center justify-center border-b border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent p-6">
                  <div className="grid h-36 w-full grid-cols-3 items-end gap-3" aria-hidden="true">
                    <div className="h-24 rounded-t-full border border-suii-gold/50 bg-suii-gold/10" />
                    <div className="h-32 rounded-t-full border border-suii-lime/60 bg-suii-lime/10" />
                    <div className="h-20 rounded-t-full border border-suii-blue/50 bg-suii-blue/10" />
                  </div>
                </div>
                <div className="p-4">
                  <p className="display text-sm text-suii-gold">{exercise.muscles.join(" · ")}</p>
                  <h2 className="display text-5xl leading-none text-white">{exercise.name}</h2>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <StatTile label="Target" value={target} />
                    <StatTile label="Rest" value={`${prescription.restSeconds}s`} tone="blue" />
                    <StatTile label="Tempo" value={prescription.tempo ?? "Easy"} tone="gold" />
                  </div>
                  <Link href={`/train/session/${sessionId}/exercise/${prescription.exerciseId}/form`} className="focus-ring mt-4 block rounded-lg border border-suii-lime px-4 py-3 text-center font-black uppercase text-suii-lime">
                    Form Guide
                  </Link>
                </div>
              </section>

              <section className="card mt-3 p-4">
                <h3 className="display text-2xl text-white">Set Logging</h3>
                <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-sm text-suii-muted">Previous sets</p>
                  <p className="mt-1 text-white">{exerciseSession?.setLogs.length ? exerciseSession.setLogs.map((set) => set.status === "completed" ? `${set.reps ?? set.seconds}${set.seconds ? "s" : " reps"} @ RIR ${set.rir === 4 ? "4+" : set.rir}` : "Skipped").join(" · ") : "None yet"}</p>
                </div>
                <label className="mt-4 block text-sm font-bold uppercase text-suii-muted" htmlFor="reps">{exercise.hold ? "Seconds" : "Repetitions"}</label>
                <input id="reps" inputMode="numeric" type="number" min={0} max={exercise.hold ? 1800 : 300} value={reps} onChange={(event) => setReps(Math.max(0, Math.min(exercise.hold ? 1800 : 300, Number(event.target.value))))} className="focus-ring mt-2 h-14 w-full rounded-lg border border-white/10 bg-black px-4 text-2xl font-black text-white" aria-describedby="reps-help" />
                <p id="reps-help" className="mt-1 text-xs text-suii-muted">Negative, NaN and unrealistic values are rejected.</p>
                <div className="mt-4">
                  <p className="text-sm font-bold uppercase text-suii-muted">RIR: reps in reserve</p>
                  <div className="mt-2 grid grid-cols-5 gap-2">
                    {([0, 1, 2, 3, 4] as const).map((choice) => (
                      <button key={choice} type="button" className={`focus-ring min-h-12 rounded-lg border text-lg font-black ${rir === choice ? "border-suii-lime bg-suii-lime text-black" : "border-white/10 text-white"}`} onClick={() => setRir(choice)}>{choice === 4 ? "4+" : choice}</button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-suii-muted">Leave good repetitions in reserve; training to failure is not required.</p>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <TrainingButton onClick={completeCurrentSet}>Complete Set</TrainingButton>
                  <TrainingButton variant="outline" onClick={() => skipSet(sessionId)}>Skip Set</TrainingButton>
                </div>
                <TrainingButton className="mt-2 w-full" variant="ghost" onClick={() => finish(!isLastPosition)}>{isLastPosition ? "Finish Workout" : "Complete Partial Session"}</TrainingButton>
              </section>
            </>
          )}
        </div>

        {exitOpen ? (
          <div className="fixed inset-0 z-40 flex items-end bg-black/70 p-4">
            <div className="card w-full max-w-[430px] p-4">
              {confirmDiscard ? (
                <>
                  <h2 className="display text-3xl">Discard session?</h2>
                  <p className="mt-2 text-sm text-suii-muted">This removes the active workout from local storage. Completed historical sessions are not changed.</p>
                  <div className="mt-4 grid gap-2">
                    <TrainingButton variant="outline" onClick={() => setConfirmDiscard(false)}>Keep Workout</TrainingButton>
                    <TrainingButton variant="ghost" onClick={() => { discardSession(sessionId); router.push("/train"); }}>Confirm Discard</TrainingButton>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="display text-3xl">Save workout?</h2>
                  <p className="mt-2 text-sm text-suii-muted">Save and exit preserves sets, resistance, RIR, skipped sets, discomfort flags, timer state, adjustment and notes.</p>
                  <div className="mt-4 grid gap-2">
                    <TrainingButton onClick={() => setExitOpen(false)}>Continue Workout</TrainingButton>
                    <TrainingButton variant="outline" onClick={() => { saveAndExit(sessionId); router.push("/train"); }}>Save and Exit</TrainingButton>
                    <TrainingButton variant="ghost" onClick={() => setConfirmDiscard(true)}>Discard Session</TrainingButton>
                    <TrainingButton variant="ghost" onClick={() => finish(true)}>Complete as Partial</TrainingButton>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
