import { beforeEach, describe, expect, it, vi } from "vitest";
import { getWorkoutDefinition } from "@/data/training";
import {
  addRestSeconds,
  remainingRestSeconds,
  sessionExternalLoadVolumeKg,
  sessionTotalReps,
  suggestAdjustment
} from "@/lib/trainingCalc";
import {
  completeSession,
  createReadiness,
  createWorkoutSession,
  defaultPhase3TrainingState,
  markExerciseUncomfortable,
  pauseSession,
  resumeSession,
  saveAndExit,
  saveFeedback,
  saveSet,
  skipSet
} from "@/lib/trainingRepository";
import type { RestTimerState } from "@/types/training";

describe("Phase 3 training calculations and repository", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("suggests conservative readiness adjustments and never changes silently", () => {
    const readiness = createReadiness("2026-07-14", { badmintonGames: 4, soreness: 6, energy: "normal" });
    const suggestion = suggestAdjustment(readiness, "Full Body A");
    expect(suggestion.kind).toBe("reduced_accessories");
    expect(suggestion.reason).toMatch(/moderate soreness|Badminton/i);

    const redFlag = createReadiness("2026-07-14", { warningFlags: ["chest pain"] });
    expect(suggestAdjustment(redFlag, "Full Body A").suggestion).toMatch(/medical assessment/i);
  });

  it("creates one active workout session and prevents duplicates", () => {
    const readiness = createReadiness("2026-07-14", {});
    const first = createWorkoutSession(defaultPhase3TrainingState, "2026-07-14", "full-body-a", readiness);
    const second = createWorkoutSession(first, "2026-07-14", "full-body-a", readiness);
    expect(Object.keys(first.sessions)).toHaveLength(1);
    expect(Object.keys(second.sessions)).toHaveLength(1);
    expect(second.activeSessionId).toBe(first.activeSessionId);
  });

  it("logs reps, RIR, unilateral totals and pair-weight external volume", () => {
    const start = createWorkoutSession(defaultPhase3TrainingState, "2026-07-14", "full-body-a", null);
    const sessionId = start.activeSessionId!;
    const withSquat = saveSet(start, sessionId, { reps: 15, rir: 2 });
    const withSecondSquat = saveSet(withSquat, sessionId, { reps: 15, rir: 2 });
    const withPress = saveSet(withSecondSquat, sessionId, { reps: 12, rir: 1 });
    const session = withPress.sessions[sessionId];
    expect(session.exerciseSessions[0].setLogs[0].rir).toBe(2);
    expect(sessionTotalReps(session)).toBe(42);
    expect(sessionExternalLoadVolumeKg(session)).toBe(405);

    const rowState = saveSet(saveSet(withPress, sessionId, { reps: 12, rir: 2 }), sessionId, { reps: 12, rir: 2, sideLogs: [{ side: "left", reps: 12 }, { side: "right", reps: 12 }] });
    expect(sessionTotalReps(rowState.sessions[sessionId])).toBeGreaterThan(50);
  });

  it("excludes bodyweight volume while tracking completed work", () => {
    let state = createWorkoutSession(defaultPhase3TrainingState, "2026-07-14", "full-body-a", null);
    const sessionId = state.activeSessionId!;
    const workout = getWorkoutDefinition("full-body-a");
    for (let index = 0; index < workout.exercises.length - 1; index += 1) {
      state = saveSet(state, sessionId, { reps: 10, rir: 2 });
      state.sessions[sessionId].restTimer = null;
    }
    state = saveSet(state, sessionId, { seconds: 45, rir: 2 });
    const session = state.sessions[sessionId];
    expect(sessionTotalReps(session)).toBeGreaterThan(0);
    expect(sessionExternalLoadVolumeKg(session)).toBeGreaterThan(0);
  });

  it("derives rest from absolute timestamps and supports add/subtract", () => {
    const timer: RestTimerState = {
      exercisePrescriptionId: "fba-goblet-squat",
      setNumber: 1,
      originalSeconds: 75,
      restEndsAt: "2026-07-14T12:01:15.000Z",
      pausedRemainingSeconds: null,
      soundEnabled: false,
      vibrationEnabled: false
    };
    expect(remainingRestSeconds(timer, new Date("2026-07-14T12:00:30.000Z").getTime())).toBe(45);
    const added = addRestSeconds(timer, 15, new Date("2026-07-14T12:00:30.000Z").getTime());
    expect(remainingRestSeconds(added, new Date("2026-07-14T12:00:30.000Z").getTime())).toBe(60);
  });

  it("pauses, resumes, saves, skips, marks discomfort, completes idempotently and stores feedback", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-14T12:00:00.000Z"));
    let state = createWorkoutSession(defaultPhase3TrainingState, "2026-07-14", "full-body-a", null);
    const sessionId = state.activeSessionId!;
    state = saveSet(state, sessionId, { reps: 12, rir: 2 });
    vi.setSystemTime(new Date("2026-07-14T12:00:30.000Z"));
    state = pauseSession(state, sessionId);
    expect(state.sessions[sessionId].status).toBe("paused");
    expect(state.sessions[sessionId].restTimer?.pausedRemainingSeconds).toBeGreaterThan(0);
    vi.setSystemTime(new Date("2026-07-14T12:01:00.000Z"));
    state = resumeSession(state, sessionId);
    expect(state.sessions[sessionId].status).toBe("active");
    state = saveAndExit(state, sessionId);
    expect(state.activeSessionId).toBe(sessionId);
    state = skipSet(state, sessionId);
    state = markExerciseUncomfortable(state, sessionId, "fba-floor-press");
    expect(state.uncomfortableExerciseIds).toContain("floor-press");
    state = saveFeedback(state, sessionId, { effort: 7, soreness: "mild", note: "Controlled", updatedAt: new Date().toISOString() });
    state = completeSession(state, sessionId);
    const once = state.sessions[sessionId].completedAt;
    state = completeSession(state, sessionId);
    expect(state.sessions[sessionId].completedAt).toBe(once);
    expect(state.sessions[sessionId].feedback?.effort).toBe(7);
  });
});
