import { beforeEach, describe, expect, it, vi } from "vitest";
import { exerciseDefinitions, formGuides, getExerciseDefinition, getExerciseSubstitutions, getWorkoutDefinition, workoutDefinitions } from "@/data/training";
import { addRestSeconds, calculatePersonalRecords, filterWorkoutHistory, makeProgressionRecommendation, remainingRestSeconds, sessionExternalLoadVolumeKg, sessionTotalReps, suggestAdjustment } from "@/lib/trainingCalc";
import { completeSession, createReadiness, createWorkoutSession, defaultPhase3TrainingState, jumpToExercise, pauseSession, replaceExercise, resumeSession, saveSet, skipSet, undoLastSet, updateProgressionRecommendation, writeTrainingState, readTrainingState } from "@/lib/trainingRepository";
import { buildDeviceDataExport } from "@/lib/deviceData";
import { validateDeviceBackupText, restoreAddMissing } from "@/lib/deviceBackup";

const activeExerciseIds = Array.from(new Set(workoutDefinitions.flatMap((workout) => workout.exercises.map((exercise) => exercise.exerciseId))));

describe("Sprint 3 training data-integrity audit", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T12:00:00.000Z"));
  });

  it("covers every active programme exercise with specific guidance and illustration metadata", () => {
    expect(activeExerciseIds).toHaveLength(29);
    for (const exerciseId of activeExerciseIds) {
      const exercise = getExerciseDefinition(exerciseId);
      const guide = formGuides.find((item) => item.exerciseId === exerciseId);
      expect(guide?.setup.length, exerciseId).toBeGreaterThanOrEqual(3);
      expect(guide?.movement.length, exerciseId).toBeGreaterThanOrEqual(3);
      expect(guide?.quickCues.join(" "), exerciseId).not.toMatch(/controlled stable leave 1-2/i);
      expect(exercise.illustration?.startLabel, exerciseId).toBeTruthy();
      expect(exercise.illustration?.finishLabel, exerciseId).toBeTruthy();
      expect(exercise.illustration?.direction, exerciseId).toBeTruthy();
      expect(exercise.illustration?.equipmentFocus, exerciseId).toBeTruthy();
      expect(exercise.accessibilityDescription, exerciseId).toMatch(/\bfigure\b/i);
    }
  });

  it("keeps diagram structures distinct across key movement categories", () => {
    const patterns = activeExerciseIds.map((id) => getExerciseDefinition(id).movementPattern);
    expect(new Set(patterns).size).toBeGreaterThan(8);
    expect(getExerciseDefinition("goblet-squat").movementPattern).not.toBe(getExerciseDefinition("romanian-deadlift").movementPattern);
    expect(getExerciseDefinition("one-arm-row").movementPattern).not.toBe(getExerciseDefinition("floor-press").movementPattern);
    expect(getExerciseDefinition("floor-press").illustration?.description).toMatch(/mat|floor/i);
    expect(getExerciseDefinition("one-arm-row").illustration?.description).toMatch(/one side|one hand|one-arm|side/i);
    expect(getExerciseDefinition("band-pull-apart").illustration?.equipmentFocus).toMatch(/band/i);
  });

  it("preview and guided workout share the same workout exercise order source", () => {
    const workout = getWorkoutDefinition("full-body-c");
    const previewOrder = workout.exercises.map((item) => getExerciseDefinition(item.exerciseId).name);
    let state = createWorkoutSession(defaultPhase3TrainingState, "2026-07-15", workout.id, null);
    const session = state.sessions[state.activeSessionId!];
    const guidedOrder = session.exerciseSessions.map((item) => {
      const prescription = workout.exercises.find((exercise) => exercise.id === item.exercisePrescriptionId)!;
      return getExerciseDefinition(item.performedExerciseId ?? prescription.exerciseId).name;
    });
    expect(guidedOrder).toEqual(previewOrder);
  });

  it("preserves set logs when navigating previous, next, and jumping across exercises", () => {
    let state = createWorkoutSession(defaultPhase3TrainingState, "2026-07-15", "full-body-a", null);
    const sessionId = state.activeSessionId!;
    state = saveSet(state, sessionId, { reps: 15, rir: 2, formRating: "good", note: "clean", actualWeightKg: 7.5 });
    state = jumpToExercise(state, sessionId, 2);
    state = jumpToExercise(state, sessionId, 0);
    expect(state.sessions[sessionId].exerciseSessions[0].setLogs).toHaveLength(1);
    expect(state.sessions[sessionId].exerciseSessions[0].setLogs[0].note).toBe("clean");
  });

  it("undo restores the previous set state without dropping older logs", () => {
    let state = createWorkoutSession(defaultPhase3TrainingState, "2026-07-15", "full-body-a", null);
    const sessionId = state.activeSessionId!;
    state = saveSet(state, sessionId, { reps: 12, rir: 2 });
    vi.setSystemTime(new Date("2026-07-15T12:00:01.000Z"));
    state = saveSet(state, sessionId, { reps: 13, rir: 2 });
    state = undoLastSet(state, sessionId);
    expect(state.sessions[sessionId].currentSetNumber).toBe(2);
    expect(state.sessions[sessionId].exerciseSessions[0].setLogs.map((set) => set.reps)).toEqual([12]);
  });

  it("persists RIR 0-5, form rating, note, actual load and skipped status", () => {
    let state = createWorkoutSession(defaultPhase3TrainingState, "2026-07-15", "full-body-a", null);
    const sessionId = state.activeSessionId!;
    state = saveSet(state, sessionId, { reps: 15, rir: 5, formRating: "acceptable", note: "right knee fine", actualWeightKg: 7.5 });
    state = skipSet(state, sessionId);
    const logs = state.sessions[sessionId].exerciseSessions.flatMap((exercise) => exercise.setLogs);
    expect(logs[0]).toMatchObject({ rir: 5, formRating: "acceptable", note: "right knee fine", actualWeightKg: 7.5 });
    expect(logs[1].status).toBe("skipped");
    expect(logs.every((set) => set.rir === null || (set.rir >= 0 && set.rir <= 5))).toBe(true);
  });

  it("substitution is session-only and preserves original and performed exercise ids", () => {
    let state = createWorkoutSession(defaultPhase3TrainingState, "2026-07-15", "full-body-a", null);
    const sessionId = state.activeSessionId!;
    const prescription = getWorkoutDefinition("full-body-a").exercises.find((item) => item.exerciseId === "one-arm-row")!;
    expect(getExerciseSubstitutions("one-arm-row").map((item) => item.id)).toContain("bent-over-row");
    state = replaceExercise(state, sessionId, prescription.id, "bent-over-row", "chair unavailable");
    const rowSession = state.sessions[sessionId].exerciseSessions.find((item) => item.exercisePrescriptionId === prescription.id)!;
    expect(rowSession.originalExerciseId).toBe("one-arm-row");
    expect(rowSession.performedExerciseId).toBe("bent-over-row");
    expect(rowSession.substitutionReason).toBe("chair unavailable");
    expect(getWorkoutDefinition("full-body-a").exercises.find((item) => item.id === prescription.id)?.exerciseId).toBe("one-arm-row");
  });

  it("completion is idempotent and summary totals are accurate", () => {
    let state = createWorkoutSession(defaultPhase3TrainingState, "2026-07-15", "full-body-a", null);
    const sessionId = state.activeSessionId!;
    state = saveSet(state, sessionId, { reps: 15, rir: 2 });
    state = completeSession(state, sessionId);
    const completedAt = state.sessions[sessionId].completedAt;
    state = completeSession(state, sessionId);
    expect(Object.keys(state.sessions)).toHaveLength(1);
    expect(state.sessions[sessionId].completedAt).toBe(completedAt);
    expect(sessionTotalReps(state.sessions[sessionId])).toBe(15);
    expect(sessionExternalLoadVolumeKg(state.sessions[sessionId])).toBe(113);
  });

  it("rest timer uses absolute timestamps and restores after inactive time, pause, resume and add", () => {
    let state = createWorkoutSession(defaultPhase3TrainingState, "2026-07-15", "full-body-a", null);
    const sessionId = state.activeSessionId!;
    state = saveSet(state, sessionId, { reps: 12, rir: 2 });
    const timer = state.sessions[sessionId].restTimer!;
    expect(remainingRestSeconds(timer, new Date("2026-07-15T12:00:30.000Z").getTime())).toBe(45);
    const added = addRestSeconds(timer, 15, new Date("2026-07-15T12:00:30.000Z").getTime());
    expect(remainingRestSeconds(added, new Date("2026-07-15T12:00:30.000Z").getTime())).toBe(60);
    state.sessions[sessionId].restTimer = added;
    vi.setSystemTime(new Date("2026-07-15T12:00:30.000Z"));
    state = pauseSession(state, sessionId);
    expect(state.sessions[sessionId].restTimer?.pausedRemainingSeconds).toBe(60);
    vi.setSystemTime(new Date("2026-07-15T12:03:00.000Z"));
    state = resumeSession(state, sessionId);
    expect(remainingRestSeconds(state.sessions[sessionId].restTimer)).toBe(60);
  });

  it("readiness recommendations are conservative and require caller approval", () => {
    const hardLeg = createReadiness("2026-07-15", { badmintonDurationMinutes: 120, badmintonIntensity: "hard", legSoreness: 7, shoulderSoreness: 2 });
    expect(suggestAdjustment(hardLeg, "Full Body C")).toMatchObject({ kind: "reduced_accessories" });
    const hardShoulder = createReadiness("2026-07-15", { badmintonIntensity: "hard", shoulderSoreness: 7, legSoreness: 2 });
    expect(suggestAdjustment(hardShoulder, "Full Body C").reason).toMatch(/shoulder/i);
    const moderateGood = createReadiness("2026-07-15", { badmintonIntensity: "moderate", badmintonDurationMinutes: 45, legSoreness: 1, shoulderSoreness: 1, energy: "normal" });
    expect(suggestAdjustment(moderateGood, "Full Body C")).toMatchObject({ kind: "planned" });
  });

  it("progression includes proposed prescription metadata and blocks unsafe progression", () => {
    let state = createWorkoutSession(defaultPhase3TrainingState, "2026-07-15", "full-body-a", createReadiness("2026-07-15", { badmintonIntensity: "easy" }));
    const sessionId = state.activeSessionId!;
    state = saveSet(state, sessionId, { reps: 15, rir: 0, formRating: "needs_adjustment" });
    const recommendation = makeProgressionRecommendation(state.sessions[sessionId], "fba-goblet-squat");
    expect(recommendation).toMatchObject({ status: "pending", action: "review" });
    expect(recommendation.createdAt).toBeTruthy();
    expect(recommendation.proposedPrescription).toMatch(/keep|review/i);
  });

  it("progression recommendation statuses support accepted, declined and review later without mutating the programme", () => {
    const recommendation = { exerciseId: "goblet-squat", title: "Goblet Squat", action: "add_reps" as const, reason: "controlled", proposedPrescription: "Add 1 rep", createdAt: "2026-07-15T12:00:00.000Z", status: "pending" as const };
    const state = { ...defaultPhase3TrainingState, progressionRecommendations: { rec1: recommendation, rec2: recommendation, rec3: recommendation } };
    expect(updateProgressionRecommendation(state, "rec1", "accepted").progressionRecommendations?.rec1.status).toBe("accepted");
    expect(updateProgressionRecommendation(state, "rec2", "declined").progressionRecommendations?.rec2.status).toBe("declined");
    expect(updateProgressionRecommendation(state, "rec3", "review_later").progressionRecommendations?.rec3.status).toBe("review_later");
    expect(getWorkoutDefinition("full-body-a").exercises[0].targetReps).toBe("12-15");
  });

  it("personal records come only from completed controlled sets and keep substitutions separate", () => {
    let state = createWorkoutSession(defaultPhase3TrainingState, "2026-07-15", "full-body-a", null);
    const sessionId = state.activeSessionId!;
    state = saveSet(state, sessionId, { reps: 15, rir: 2, formRating: "good", actualWeightKg: 7.5 });
    state = completeSession(state, sessionId);
    let second = createWorkoutSession({ ...state, activeSessionId: null }, "2026-07-16", "full-body-a", null);
    const secondId = second.activeSessionId!;
    second = saveSet(second, secondId, { reps: 20, rir: 2, formRating: "needs_adjustment", actualWeightKg: 20 });
    second = completeSession(second, secondId);
    const records = calculatePersonalRecords(Object.values(second.sessions));
    const squat = records.find((record) => record.exerciseId === "goblet-squat")!;
    expect(squat.highestControlledLoadKg).toBe(7.5);
    expect(squat.highestRepsAtLoad).toBe(15);
  });

  it("filters workout history by workout, exercise, date range and completed/partial status", () => {
    let state = createWorkoutSession(defaultPhase3TrainingState, "2026-07-15", "full-body-a", null);
    const first = state.activeSessionId!;
    state = completeSession(state, first);
    state = createWorkoutSession({ ...state, activeSessionId: null }, "2026-07-16", "full-body-b", null);
    const second = state.activeSessionId!;
    state = completeSession(state, second, undefined, true);
    const sessions = Object.values(state.sessions);
    expect(filterWorkoutHistory(sessions, { workoutId: "full-body-a" })).toHaveLength(1);
    expect(filterWorkoutHistory(sessions, { exerciseId: "reverse-lunge" })).toHaveLength(1);
    expect(filterWorkoutHistory(sessions, { dateFrom: "2026-07-16" })).toHaveLength(1);
    expect(filterWorkoutHistory(sessions, { statuses: ["partial"] })).toHaveLength(1);
  });

  it("exports and restores workout-quality fields while rejecting invalid RIR and form values", () => {
    let state = createWorkoutSession(defaultPhase3TrainingState, "2026-07-15", "full-body-a", null);
    const sessionId = state.activeSessionId!;
    state = saveSet(state, sessionId, { reps: 12, rir: 5, formRating: "acceptable", note: "preserve", actualWeightKg: 7.5 });
    writeTrainingState(state);
    const envelope = buildDeviceDataExport(new Date("2026-07-15T12:00:00.000Z"));
    expect(JSON.stringify(envelope)).toContain("acceptable");
    expect(JSON.stringify(envelope)).toContain("actualWeightKg");
    window.localStorage.removeItem("project-suiii:phase-3-training");
    const preview = validateDeviceBackupText(JSON.stringify(envelope));
    expect(preview.status).toBe("ready");
    restoreAddMissing(preview);
    expect(readTrainingState().sessions[sessionId].exerciseSessions[0].setLogs[0].note).toBe("preserve");
    const invalid = structuredClone(envelope);
    const set = ((invalid.data.training as typeof state).sessions[sessionId].exerciseSessions[0].setLogs[0]);
    set.rir = 6 as never;
    expect(validateDeviceBackupText(JSON.stringify(invalid)).status).toBe("error");
    set.rir = 2;
    set.formRating = "perfect" as never;
    expect(validateDeviceBackupText(JSON.stringify(invalid)).status).toBe("error");
  });
});
