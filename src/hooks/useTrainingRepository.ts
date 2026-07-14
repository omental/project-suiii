"use client";

import { useEffect, useMemo, useState } from "react";
import {
  adjustRest,
  clearRest,
  completeSession,
  createReadiness,
  createWorkoutSession,
  defaultPhase3TrainingState,
  discardSession,
  makeTrainingRepository,
  markExerciseUncomfortable,
  pauseSession,
  readTrainingState,
  resumeSession,
  saveAndExit,
  saveFeedback,
  saveSet,
  skipSet,
  writeTrainingState
} from "@/lib/trainingRepository";
import type { Phase3TrainingState, ReadinessCheckIn, RirChoice, SessionFeedback } from "@/types/training";

export function useTrainingRepository() {
  const [state, setState] = useState<Phase3TrainingState>(defaultPhase3TrainingState);
  const [isHydrated, setIsHydrated] = useState(false);
  const repository = useMemo(() => makeTrainingRepository(state), [state]);

  const commit = (next: Phase3TrainingState) => {
    setState(next);
  };

  useEffect(() => {
    // Local storage is read only after hydration to avoid server/client markup drift.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(readTrainingState());
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) writeTrainingState(state);
  }, [isHydrated, state]);

  return {
    state,
    isHydrated,
    repository,
    createReadiness: (date: string, input: Partial<ReadinessCheckIn>) => createReadiness(date, input),
    startSession: (date: string, workoutId: string, readiness: ReadinessCheckIn | null, adjustmentKind?: "planned" | "reduced_accessories" | "recovery") => {
      const next = createWorkoutSession(state, date, workoutId, readiness, adjustmentKind);
      commit(next);
      return next.activeSessionId;
    },
    saveSet: (sessionId: string, input: Parameters<typeof saveSet>[2]) => commit(saveSet(state, sessionId, input)),
    skipSet: (sessionId: string) => commit(skipSet(state, sessionId)),
    adjustRest: (sessionId: string, deltaSeconds: number) => commit(adjustRest(state, sessionId, deltaSeconds)),
    clearRest: (sessionId: string) => commit(clearRest(state, sessionId)),
    pauseSession: (sessionId: string) => commit(pauseSession(state, sessionId)),
    resumeSession: (sessionId: string) => commit(resumeSession(state, sessionId)),
    saveAndExit: (sessionId: string) => commit(saveAndExit(state, sessionId)),
    discardSession: (sessionId: string) => commit(discardSession(state, sessionId)),
    markExerciseUncomfortable: (sessionId: string, prescriptionId: string) => commit(markExerciseUncomfortable(state, sessionId, prescriptionId)),
    completeSession: (sessionId: string, feedback?: SessionFeedback, partial?: boolean) => commit(completeSession(state, sessionId, feedback, partial)),
    saveFeedback: (sessionId: string, feedback: SessionFeedback) => commit(saveFeedback(state, sessionId, feedback)),
    quickSet: (sessionId: string, reps: number, rir: RirChoice) => commit(saveSet(state, sessionId, { reps, rir }))
  };
}
