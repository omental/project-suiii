import { getExerciseDefinition, getWorkoutDefinition } from "@/data/training";
import type {
  ExercisePrescription,
  Phase3TrainingState,
  ProgressionRecommendation,
  ReadinessCheckIn,
  ResistanceSelection,
  RestTimerState,
  SetLog,
  TrainingHistorySummary,
  WorkoutSession
} from "@/types/training";

export function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function plannedSets(prescription: ExercisePrescription, week = 1, adjustmentKind?: string) {
  const base = week === 1 ? prescription.week1Sets : prescription.standardSets;
  if (adjustmentKind === "reduced_accessories" && prescription.accessory) {
    return Math.max(1, base - 1);
  }
  return base;
}

export function parseTopReps(target: string | undefined) {
  if (!target) return null;
  const matches = target.match(/\d+/g);
  if (!matches?.length) return null;
  return Number(matches[matches.length - 1]);
}

export function setTotalReps(set: SetLog) {
  if (set.status !== "completed") return 0;
  if (set.sideLogs?.length) return set.sideLogs.reduce((sum, side) => sum + side.reps, 0);
  return set.reps ?? 0;
}

export function externalLoadPerRep(resistance: ResistanceSelection) {
  if (resistance.kind !== "dumbbell") return 0;
  return resistance.kgPerUnit * resistance.units;
}

export function setExternalLoadVolumeKg(set: SetLog) {
  return externalLoadPerRep(set.resistance) * setTotalReps(set);
}

export function sessionCompletedSets(session: WorkoutSession) {
  return session.exerciseSessions.flatMap((exercise) => exercise.setLogs).filter((set) => set.status === "completed");
}

export function sessionTotalReps(session: WorkoutSession) {
  return sessionCompletedSets(session).reduce((sum, set) => sum + setTotalReps(set), 0);
}

export function sessionExternalLoadVolumeKg(session: WorkoutSession) {
  return Math.round(sessionCompletedSets(session).reduce((sum, set) => sum + setExternalLoadVolumeKg(set), 0));
}

export function deriveSessionDurationMs(session: WorkoutSession, nowMs = Date.now()) {
  const end = session.completedAt ? new Date(session.completedAt).getTime() : session.pausedAt ? new Date(session.pausedAt).getTime() : nowMs;
  return Math.max(0, end - new Date(session.startedAt).getTime() - session.totalPausedDurationMs);
}

export function remainingRestSeconds(timer: RestTimerState | null, nowMs = Date.now()) {
  if (!timer) return 0;
  if (timer.pausedRemainingSeconds !== null) return timer.pausedRemainingSeconds;
  return Math.max(0, Math.ceil((new Date(timer.restEndsAt).getTime() - nowMs) / 1000));
}

export function addRestSeconds(timer: RestTimerState, deltaSeconds: number, nowMs = Date.now()): RestTimerState {
  const remaining = clampNumber(remainingRestSeconds(timer, nowMs) + deltaSeconds, 0, 30 * 60);
  return {
    ...timer,
    restEndsAt: new Date(nowMs + remaining * 1000).toISOString(),
    originalSeconds: Math.max(timer.originalSeconds, remaining),
    pausedRemainingSeconds: timer.pausedRemainingSeconds === null ? null : remaining
  };
}

export function suggestAdjustment(readiness: ReadinessCheckIn, workoutName: string) {
  const hasStopFlag = readiness.warningFlags.length > 0;
  const hardBadminton = readiness.badmintonIntensity === "hard" || readiness.badmintonGames >= 3 || (readiness.badmintonDurationMinutes ?? 0) >= 90;
  const shoulderFatigue = hardBadminton && (readiness.shoulderSoreness ?? readiness.soreness) >= 5;
  const legFatigue = hardBadminton && (readiness.legSoreness ?? readiness.soreness) >= 5;
  if (hasStopFlag) {
    return {
      kind: "recovery" as const,
      suggestion: "Stop the workout and seek appropriate medical assessment before training.",
      reason: "You logged a red-flag symptom. Project SUIII should not push through those symptoms."
    };
  }
  if (readiness.energy === "low" || readiness.soreness >= 8) {
    return {
      kind: "recovery" as const,
      suggestion: "Choose a short recovery session with mobility, breathing and no loaded strength work.",
      reason: "Low energy or high soreness calls for a conservative day."
    };
  }
  if (readiness.unusualPainAcknowledged) {
    return {
      kind: "recovery" as const,
      suggestion: "Choose recovery work today and do not treat this as a diagnosis.",
      reason: "Unusual pain was acknowledged, so the safest workout choice is a conservative recovery day."
    };
  }
  if (legFatigue || shoulderFatigue) {
    return {
      kind: "reduced_accessories" as const,
      suggestion: "Keep the plan available for review, but reduce accessory volume only if you approve.",
      reason: legFatigue ? "Hard badminton plus leg soreness suggests lowering today's strength dose." : "Hard badminton plus shoulder soreness suggests lowering today's upper-body dose."
    };
  }
  if (readiness.badmintonGames >= 3 || readiness.soreness >= 5) {
    return {
      kind: "reduced_accessories" as const,
      suggestion: "Keep the main lifts and remove one set from accessory exercises.",
      reason: "Badminton load or moderate soreness suggests a smaller strength dose."
    };
  }
  return {
    kind: "planned" as const,
    suggestion: `Use the planned ${workoutName} session.`,
    reason: "Readiness is normal."
  };
}

export function makeProgressionRecommendation(session: WorkoutSession, exercisePrescriptionId?: string): ProgressionRecommendation {
  const workout = getWorkoutDefinition(session.workoutDefinitionId);
  const prescription = workout.exercises.find((item) => item.id === exercisePrescriptionId) ?? workout.exercises[0];
  const exercise = getExerciseDefinition(prescription.exerciseId);
  const exerciseSession = session.exerciseSessions.find((item) => item.exercisePrescriptionId === prescription.id);
  const sets = exerciseSession?.setLogs.filter((set) => set.status === "completed") ?? [];
  const top = parseTopReps(prescription.targetReps);
  const uncomfortable = exerciseSession?.uncomfortable ?? false;
  const highSoreness = session.feedback?.soreness === "high";
  const badmintonLoad = (session.readiness?.badmintonGames ?? 0) >= 3;
  const skipped = exerciseSession?.setLogs.some((set) => set.status === "skipped") ?? false;
  const needsFormReview = sets.some((set) => set.formRating === "needs_adjustment");
  const allAtTop = top !== null && sets.length > 0 && sets.every((set) => {
    const divisor = set.sideLogs?.length ? set.sideLogs.length : 1;
    return Math.floor(setTotalReps(set) / divisor) >= top && (set.rir === 1 || set.rir === 2);
  });

  const base = { exerciseId: exercise.id, title: exercise.name, createdAt: new Date().toISOString(), status: "pending" as const };
  const requiredSetsCompleted = sets.length >= plannedSets(prescription, 1, session.adjustment?.kind);
  const averageRir = sets.reduce((sum, set) => sum + (set.rir ?? 0), 0) / Math.max(1, sets.length);
  const repeatedFailure = sets.filter((set) => set.rir === 0).length >= 2;

  if (uncomfortable) {
    return { ...base, action: "review" as const, proposedPrescription: "Review form before progressing", reason: "This exercise was marked uncomfortable. Review form before changing targets." };
  }
  if (highSoreness) {
    return { ...base, action: "reduce_volume" as const, proposedPrescription: "Maintain or reduce one set after review", reason: "High soreness was logged. Maintain or reduce volume for review." };
  }
  if (badmintonLoad) {
    return { ...base, action: "repeat" as const, proposedPrescription: "Repeat current target", reason: "Badminton load was high. Repeat the target before progressing." };
  }
  if (skipped || needsFormReview || !requiredSetsCompleted || repeatedFailure || averageRir < 2) {
    return { ...base, action: "review" as const, proposedPrescription: "Keep current target until controlled sets are complete", reason: "Skipped, incomplete, low-RIR, or form-limited work was logged. Review technique before changing targets." };
  }
  if (allAtTop) {
    const hasBand = exercise.equipment.includes("band");
    return {
      ...base,
      action: hasBand ? "add_band" : "add_reps",
      proposedPrescription: hasBand ? "Review a slightly stronger band option" : "Add 1-2 total reps or slow the tempo",
      reason: hasBand ? "All sets reached the top of the range with 1-2 RIR. A reviewed band option is available." : "All sets reached the top of the range with 1-2 RIR. Add 1-2 total reps or slow the tempo next time."
    };
  }
  return { ...base, action: "repeat" as const, proposedPrescription: "Repeat current target", reason: "Repeat the same target until controlled reps are consistent." };
}

export type WorkoutHistoryFilters = {
  workoutId?: string;
  exerciseId?: string;
  dateFrom?: string;
  dateTo?: string;
  statuses?: WorkoutSession["status"][];
};

export function filterWorkoutHistory(sessions: WorkoutSession[], filters: WorkoutHistoryFilters = {}) {
  return sessions.filter((session) => {
    if (filters.workoutId && session.workoutDefinitionId !== filters.workoutId) return false;
    if (filters.dateFrom && session.date < filters.dateFrom) return false;
    if (filters.dateTo && session.date > filters.dateTo) return false;
    if (filters.statuses?.length && !filters.statuses.includes(session.status)) return false;
    if (filters.exerciseId) {
      const workout = getWorkoutDefinition(session.workoutDefinitionId);
      const hasExercise = session.exerciseSessions.some((exerciseSession) => {
        const prescription = workout.exercises.find((item) => item.id === exerciseSession.exercisePrescriptionId);
        return (exerciseSession.performedExerciseId ?? prescription?.exerciseId) === filters.exerciseId;
      });
      if (!hasExercise) return false;
    }
    return true;
  });
}

export function calculatePersonalRecords(sessions: WorkoutSession[]) {
  const records = new Map<string, { exerciseId: string; highestControlledLoadKg: number; highestRepsAtLoad: number; highestSessionVolumeKg: number; longestTimedHoldSeconds: number }>();
  for (const session of sessions.filter((item) => item.status === "completed" || item.status === "partial")) {
    const workout = getWorkoutDefinition(session.workoutDefinitionId);
    for (const exerciseSession of session.exerciseSessions) {
      const prescription = workout.exercises.find((item) => item.id === exerciseSession.exercisePrescriptionId);
      const exerciseId = exerciseSession.performedExerciseId ?? prescription?.exerciseId;
      if (!exerciseId) continue;
      const current = records.get(exerciseId) ?? { exerciseId, highestControlledLoadKg: 0, highestRepsAtLoad: 0, highestSessionVolumeKg: 0, longestTimedHoldSeconds: 0 };
      const validSets = exerciseSession.setLogs.filter((set) => set.status === "completed" && set.formRating !== "needs_adjustment");
      const sessionVolume = validSets.reduce((sum, set) => sum + setExternalLoadVolumeKg(set), 0);
      for (const set of validSets) {
        const load = set.actualWeightKg ?? externalLoadPerRep(set.resistance);
        current.highestControlledLoadKg = Math.max(current.highestControlledLoadKg, load);
        if (load >= current.highestControlledLoadKg) current.highestRepsAtLoad = Math.max(current.highestRepsAtLoad, setTotalReps(set));
        current.longestTimedHoldSeconds = Math.max(current.longestTimedHoldSeconds, set.seconds ?? 0);
      }
      current.highestSessionVolumeKg = Math.max(current.highestSessionVolumeKg, sessionVolume);
      records.set(exerciseId, current);
    }
  }
  return Array.from(records.values());
}

export function summarizeTrainingHistory(state: Phase3TrainingState, range: "4w" | "12w" | "all" = "4w"): TrainingHistorySummary {
  const sessions = Object.values(state.sessions).filter((session) => session.status === "completed" || session.status === "partial");
  const completed = sessions.filter((session) => session.status === "completed");
  const plannedCount = range === "4w" ? 12 : range === "12w" ? 36 : Math.max(12, sessions.length);
  return {
    range,
    workoutCount: sessions.length,
    plannedCount,
    completionPercent: plannedCount ? Math.round((completed.length / plannedCount) * 100) : 0,
    streakWeeks: completed.length >= 3 ? 1 : 0,
    fridayRecoveryProtected: true,
    totalReps: sessions.reduce((sum, session) => sum + sessionTotalReps(session), 0),
    externalLoadVolumeKg: sessions.reduce((sum, session) => sum + sessionExternalLoadVolumeKg(session), 0)
  };
}
