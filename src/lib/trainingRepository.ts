import { getExerciseDefinition, getExerciseSubstitutions, getWorkoutDefinition, getWorkoutForDate, weeklyTrainingSchedule } from "@/data/training";
import { storageKeyFor } from "@/lib/accountStorage";
import { queueDailyTrackingMutation, queueWorkoutSessionMutation } from "@/lib/syncOutbox";
import {
  addRestSeconds,
  clampNumber,
  deriveSessionDurationMs,
  makeProgressionRecommendation,
  plannedSets,
  remainingRestSeconds,
  sessionExternalLoadVolumeKg,
  sessionTotalReps,
  suggestAdjustment,
  summarizeTrainingHistory
} from "@/lib/trainingCalc";
import type {
  Phase3TrainingState,
  ReadinessCheckIn,
  ResistanceSelection,
  RirChoice,
  SessionFeedback,
  SetLog,
  FormRating,
  WorkoutSession
} from "@/types/training";

const phase3Key = () => storageKeyFor("training");
const phase2Key = () => storageKeyFor("nutrition");

export const defaultPhase3TrainingState: Phase3TrainingState = {
  version: 3,
  sessions: {},
  activeSessionId: null,
  readinessByDate: {},
  uncomfortableExerciseIds: [],
  progressionRecommendations: {}
};

function nowISO() {
  return new Date().toISOString();
}

function isPhase3State(value: unknown): value is Phase3TrainingState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Phase3TrainingState>;
  return candidate.version === 3 && typeof candidate.sessions === "object" && candidate.sessions !== null && "activeSessionId" in candidate;
}

export function readTrainingState(): Phase3TrainingState {
  if (typeof window === "undefined") return defaultPhase3TrainingState;
  try {
    const raw = window.localStorage.getItem(phase3Key());
    if (!raw) return defaultPhase3TrainingState;
    const parsed: unknown = JSON.parse(raw);
    return isPhase3State(parsed) ? { ...defaultPhase3TrainingState, ...parsed } : defaultPhase3TrainingState;
  } catch {
    return defaultPhase3TrainingState;
  }
}

export function writeTrainingState(state: Phase3TrainingState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(phase3Key(), JSON.stringify(state));
}

export function resetTrainingStateForTests() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(phase3Key());
  window.localStorage.removeItem(phase2Key());
}

export function createReadiness(date: string, input: Partial<ReadinessCheckIn>): ReadinessCheckIn {
  return {
    id: `readiness-${date}`,
    date,
    badmintonGames: clampNumber(Number(input.badmintonGames ?? 0), 0, 10),
    badmintonPlayedToday: Boolean(input.badmintonPlayedToday ?? Number(input.badmintonGames ?? 0) > 0),
    badmintonDurationMinutes: input.badmintonDurationMinutes === undefined || input.badmintonDurationMinutes === null ? null : clampNumber(Number(input.badmintonDurationMinutes), 0, 300),
    badmintonIntensity: input.badmintonIntensity ?? null,
    energy: input.energy ?? "normal",
    soreness: clampNumber(Number(input.soreness ?? 2), 0, 10),
    legSoreness: clampNumber(Number(input.legSoreness ?? input.soreness ?? 2), 0, 10),
    shoulderSoreness: clampNumber(Number(input.shoulderSoreness ?? input.soreness ?? 2), 0, 10),
    sleepQuality: input.sleepQuality ?? "ok",
    unusualPainAcknowledged: Boolean(input.unusualPainAcknowledged ?? false),
    soreAreas: input.soreAreas ?? [],
    sleepHours: input.sleepHours ?? null,
    note: input.note ?? "",
    warningFlags: input.warningFlags ?? [],
    createdAt: nowISO()
  };
}

function createEmptyExerciseSessions(workoutId: string) {
  return getWorkoutDefinition(workoutId).exercises.map((prescription) => ({
    exercisePrescriptionId: prescription.id,
    originalExerciseId: prescription.exerciseId,
    performedExerciseId: prescription.exerciseId,
    uncomfortable: false,
    setLogs: []
  }));
}

export function createWorkoutSession(state: Phase3TrainingState, date: string, workoutId: string, readiness: ReadinessCheckIn | null, adjustmentKind?: "planned" | "reduced_accessories" | "recovery"): Phase3TrainingState {
  const existingActive = state.activeSessionId ? state.sessions[state.activeSessionId] : null;
  if (existingActive && (existingActive.status === "active" || existingActive.status === "paused")) {
    return state;
  }
  const workout = getWorkoutDefinition(workoutId);
  const suggestion = readiness ? suggestAdjustment(readiness, workout.name) : { kind: "planned" as const, suggestion: `Use the planned ${workout.name} session.`, reason: "No readiness changes." };
  const selectedKind = adjustmentKind ?? suggestion.kind;
  const id = `session-${date}-${workoutId}-${Date.now()}`;
  const session: WorkoutSession = {
    id,
    date,
    workoutDefinitionId: workoutId,
    status: "active",
    currentExerciseIndex: 0,
    currentSetNumber: 1,
    startedAt: nowISO(),
    pausedAt: null,
    totalPausedDurationMs: 0,
    completedAt: null,
    updatedAt: nowISO(),
    readiness,
    adjustment: {
      id: `adjustment-${id}`,
      kind: selectedKind,
      originalPlan: workout.name,
      suggestion: suggestion.suggestion,
      reason: suggestion.reason,
      confirmed: true
    },
    exerciseSessions: createEmptyExerciseSessions(workoutId),
    restTimer: null,
    feedback: null
  };
  if (readiness) queueDailyTrackingMutation(readiness);
  return {
    ...state,
    sessions: { ...state.sessions, [id]: session },
    activeSessionId: id,
    readinessByDate: readiness ? { ...state.readinessByDate, [date]: readiness } : state.readinessByDate
  };
}

export function currentPrescription(session: WorkoutSession) {
  return getWorkoutDefinition(session.workoutDefinitionId).exercises[session.currentExerciseIndex];
}

function updateSession(state: Phase3TrainingState, session: WorkoutSession): Phase3TrainingState {
  return { ...state, sessions: { ...state.sessions, [session.id]: { ...session, updatedAt: nowISO() } } };
}

export function saveSet(state: Phase3TrainingState, sessionId: string, input: { reps?: number; seconds?: number; rir?: RirChoice; resistance?: ResistanceSelection; sideLogs?: { side: "left" | "right"; reps: number }[]; formRating?: FormRating; note?: string; actualWeightKg?: number | null; status?: "completed" | "skipped" }) {
  const session = state.sessions[sessionId];
  if (!session || session.status === "completed") return state;
  const workout = getWorkoutDefinition(session.workoutDefinitionId);
  const prescription = workout.exercises[session.currentExerciseIndex];
  const exerciseSession = session.exerciseSessions.find((item) => item.exercisePrescriptionId === prescription.id);
  if (!exerciseSession) return state;
  const exercise = getExerciseDefinition(exerciseSession.performedExerciseId ?? prescription.exerciseId);
  const setNumber = session.currentSetNumber;
  const reps = input.reps === undefined ? null : clampNumber(Number(input.reps), 0, 300);
  const seconds = input.seconds === undefined ? null : clampNumber(Number(input.seconds), 0, 1800);
  const set: SetLog = {
    id: `${session.id}-${prescription.id}-${setNumber}-${Date.now()}`,
    exercisePrescriptionId: prescription.id,
    setNumber,
    status: input.status ?? "completed",
    reps,
    seconds,
    sideLogs: input.sideLogs?.map((side) => ({ ...side, reps: clampNumber(Number(side.reps), 0, 300) })),
    resistance: input.resistance ?? exercise.defaultResistance,
    rir: input.rir ?? 2,
    formRating: input.formRating ?? "good",
    actualWeightKg: input.actualWeightKg ?? (input.resistance?.kind === "dumbbell" ? input.resistance.kgPerUnit * input.resistance.units : exercise.defaultResistance.kind === "dumbbell" ? exercise.defaultResistance.kgPerUnit * exercise.defaultResistance.units : null),
    note: input.note?.trim() || undefined,
    completedAt: nowISO()
  };
  const nextExerciseSessions = session.exerciseSessions.map((item) => item.exercisePrescriptionId === prescription.id ? { ...item, setLogs: [...item.setLogs, set] } : item);
  const totalSets = plannedSets(prescription, 1, session.adjustment?.kind);
  let nextExerciseIndex = session.currentExerciseIndex;
  let nextSetNumber = setNumber + 1;
  if (nextSetNumber > totalSets) {
    nextExerciseIndex = Math.min(workout.exercises.length - 1, session.currentExerciseIndex + 1);
    nextSetNumber = 1;
  }
  const nextSession: WorkoutSession = {
    ...session,
    currentExerciseIndex: nextExerciseIndex,
    currentSetNumber: nextSetNumber,
    exerciseSessions: nextExerciseSessions,
    restTimer: {
      exercisePrescriptionId: prescription.id,
      setNumber,
      originalSeconds: prescription.restSeconds,
      restEndsAt: new Date(Date.now() + prescription.restSeconds * 1000).toISOString(),
      pausedRemainingSeconds: null,
      soundEnabled: false,
      vibrationEnabled: false
    }
  };
  return updateSession(state, nextSession);
}

export function skipSet(state: Phase3TrainingState, sessionId: string) {
  return saveSet(state, sessionId, { reps: 0, rir: 5, status: "skipped", note: "Skipped during workout." });
}

export function undoLastSet(state: Phase3TrainingState, sessionId: string) {
  const session = state.sessions[sessionId];
  if (!session || session.status === "completed") return state;
  const logged = session.exerciseSessions
    .flatMap((exerciseSession) => exerciseSession.setLogs.map((set) => ({ set, exerciseSession })))
    .sort((a, b) => (b.set.completedAt ?? "").localeCompare(a.set.completedAt ?? ""));
  const latest = logged[0];
  if (!latest) return state;
  const workout = getWorkoutDefinition(session.workoutDefinitionId);
  const exerciseIndex = workout.exercises.findIndex((item) => item.id === latest.exerciseSession.exercisePrescriptionId);
  const nextExerciseSessions = session.exerciseSessions.map((item) => item.exercisePrescriptionId === latest.exerciseSession.exercisePrescriptionId ? { ...item, setLogs: item.setLogs.filter((set) => set.id !== latest.set.id) } : item);
  return updateSession(state, {
    ...session,
    currentExerciseIndex: Math.max(0, exerciseIndex),
    currentSetNumber: latest.set.setNumber,
    exerciseSessions: nextExerciseSessions,
    restTimer: null
  });
}

export function jumpToExercise(state: Phase3TrainingState, sessionId: string, exerciseIndex: number) {
  const session = state.sessions[sessionId];
  if (!session || session.status === "completed") return state;
  const workout = getWorkoutDefinition(session.workoutDefinitionId);
  const index = clampNumber(Math.round(exerciseIndex), 0, workout.exercises.length - 1);
  const prescription = workout.exercises[index];
  const exerciseSession = session.exerciseSessions.find((item) => item.exercisePrescriptionId === prescription.id);
  const completedSets = exerciseSession?.setLogs.filter((set) => set.status === "completed" || set.status === "skipped").length ?? 0;
  const nextSet = clampNumber(completedSets + 1, 1, plannedSets(prescription, 1, session.adjustment?.kind));
  return updateSession(state, { ...session, currentExerciseIndex: index, currentSetNumber: nextSet, restTimer: null });
}

export function replaceExercise(state: Phase3TrainingState, sessionId: string, exercisePrescriptionId: string, replacementExerciseId: string, reason = "Equipment-aware substitution") {
  const session = state.sessions[sessionId];
  if (!session || session.status === "completed") return state;
  const workout = getWorkoutDefinition(session.workoutDefinitionId);
  const prescription = workout.exercises.find((item) => item.id === exercisePrescriptionId);
  const replacement = getExerciseDefinition(replacementExerciseId);
  const allowed = prescription ? getExerciseSubstitutions(prescription.exerciseId).some((item) => item.id === replacement.id) : false;
  if (!prescription || !allowed) return state;
  const nextExerciseSessions = session.exerciseSessions.map((item) => item.exercisePrescriptionId === exercisePrescriptionId ? { ...item, performedExerciseId: replacement.id, substitutionReason: reason } : item);
  return updateSession(state, { ...session, exerciseSessions: nextExerciseSessions });
}

export function adjustRest(state: Phase3TrainingState, sessionId: string, deltaSeconds: number) {
  const session = state.sessions[sessionId];
  if (!session?.restTimer) return state;
  return updateSession(state, { ...session, restTimer: addRestSeconds(session.restTimer, deltaSeconds) });
}

export function clearRest(state: Phase3TrainingState, sessionId: string) {
  const session = state.sessions[sessionId];
  if (!session) return state;
  return updateSession(state, { ...session, restTimer: null });
}

export function pauseSession(state: Phase3TrainingState, sessionId: string) {
  const session = state.sessions[sessionId];
  if (!session || session.status === "paused") return state;
  const restTimer = session.restTimer ? { ...session.restTimer, pausedRemainingSeconds: remainingRestSeconds(session.restTimer) } : null;
  return updateSession(state, { ...session, status: "paused", pausedAt: nowISO(), restTimer });
}

export function resumeSession(state: Phase3TrainingState, sessionId: string) {
  const session = state.sessions[sessionId];
  if (!session || session.status !== "paused" || !session.pausedAt) return state;
  const pausedMs = Date.now() - new Date(session.pausedAt).getTime();
  const restTimer = session.restTimer && session.restTimer.pausedRemainingSeconds !== null
    ? { ...session.restTimer, restEndsAt: new Date(Date.now() + session.restTimer.pausedRemainingSeconds * 1000).toISOString(), pausedRemainingSeconds: null }
    : session.restTimer;
  return updateSession(state, { ...session, status: "active", pausedAt: null, totalPausedDurationMs: session.totalPausedDurationMs + pausedMs, restTimer });
}

export function saveAndExit(state: Phase3TrainingState, sessionId: string) {
  const session = state.sessions[sessionId];
  if (!session) return state;
  return { ...updateSession(state, { ...session, status: "paused" }), activeSessionId: sessionId };
}

export function discardSession(state: Phase3TrainingState, sessionId: string) {
  const nextSessions = { ...state.sessions };
  delete nextSessions[sessionId];
  return { ...state, sessions: nextSessions, activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId };
}

export function markExerciseUncomfortable(state: Phase3TrainingState, sessionId: string, exercisePrescriptionId: string) {
  const session = state.sessions[sessionId];
  if (!session) return state;
  const next = session.exerciseSessions.map((item) => item.exercisePrescriptionId === exercisePrescriptionId ? { ...item, uncomfortable: true } : item);
  const exerciseId = getWorkoutDefinition(session.workoutDefinitionId).exercises.find((item) => item.id === exercisePrescriptionId)?.exerciseId;
  return {
    ...updateSession(state, { ...session, exerciseSessions: next }),
    uncomfortableExerciseIds: exerciseId && !state.uncomfortableExerciseIds.includes(exerciseId) ? [...state.uncomfortableExerciseIds, exerciseId] : state.uncomfortableExerciseIds
  };
}

export function completeSession(state: Phase3TrainingState, sessionId: string, feedback?: SessionFeedback, partial = false) {
  const session = state.sessions[sessionId];
  if (!session || session.status === "completed") return state;
  const nextSession: WorkoutSession = {
    ...session,
    status: partial ? "partial" : "completed",
    completedAt: nowISO(),
    pausedAt: null,
    restTimer: null,
    feedback: feedback ?? session.feedback
  };
  queueWorkoutSessionMutation(nextSession);
  return { ...updateSession(state, nextSession), activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId };
}

export function updateProgressionRecommendation(state: Phase3TrainingState, recommendationId: string, status: "accepted" | "declined" | "review_later") {
  const existing = state.progressionRecommendations?.[recommendationId];
  if (!existing) return state;
  return {
    ...state,
    progressionRecommendations: {
      ...(state.progressionRecommendations ?? {}),
      [recommendationId]: { ...existing, status }
    }
  };
}

export function saveFeedback(state: Phase3TrainingState, sessionId: string, feedback: SessionFeedback) {
  const session = state.sessions[sessionId];
  if (!session) return state;
  return updateSession(state, { ...session, feedback });
}

export function makeTrainingRepository(state: Phase3TrainingState) {
  return {
    getWeeklySchedule() {
      return weeklyTrainingSchedule;
    },
    getWorkoutDefinition,
    getWorkoutForDate,
    getActiveSession() {
      return state.activeSessionId ? state.sessions[state.activeSessionId] ?? null : null;
    },
    getSession(sessionId: string) {
      return state.sessions[sessionId] ?? null;
    },
    getSessionHistory() {
      return Object.values(state.sessions).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    },
    getHistorySummary: summarizeTrainingHistory.bind(null, state),
    getRecommendations(sessionId?: string) {
      const session = sessionId ? state.sessions[sessionId] : Object.values(state.sessions).find((item) => item.status === "completed" || item.status === "partial");
      if (!session) return null;
      const recommendation = makeProgressionRecommendation(session);
      const stored = state.progressionRecommendations?.[`${session.id}:${recommendation.exerciseId}`];
      return stored ?? recommendation;
    },
    getSessionTotals(session: WorkoutSession) {
      return {
        durationMs: deriveSessionDurationMs(session),
        reps: sessionTotalReps(session),
        volumeKg: sessionExternalLoadVolumeKg(session),
        completedSets: session.exerciseSessions.flatMap((exercise) => exercise.setLogs).filter((set) => set.status === "completed").length
      };
    }
  };
}
