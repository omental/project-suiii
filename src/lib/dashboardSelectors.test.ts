import { describe, expect, it } from "vitest";
import { defaultPhase2State } from "@/lib/nutritionRepository";
import { defaultProgressState } from "@/lib/progressRepository";
import { defaultPhase3TrainingState } from "@/lib/trainingRepository";
import {
  calculateActiveStreak,
  calculateTransformationProgress,
  collectActivityDates,
  selectNextDashboardAction
} from "@/lib/dashboardSelectors";

describe("dashboardSelectors", () => {
  it("counts consecutive active Dhaka-local days ending today or yesterday", () => {
    expect(calculateActiveStreak([], "2026-07-15")).toBe(0);
    expect(calculateActiveStreak(["2026-07-13", "2026-07-14"], "2026-07-15")).toBe(2);
    expect(calculateActiveStreak(["2026-07-12", "2026-07-14"], "2026-07-15")).toBe(1);
    expect(calculateActiveStreak(["2026-07-13", "2026-07-14", "2026-07-15"], "2026-07-15")).toBe(3);
  });

  it("collects activity from meals, workouts, measurements and completed check-ins", () => {
    const dates = collectActivityDates(
      {
        ...defaultPhase2State,
        mealLogs: {
          "2026-07-15:breakfast": {
            id: "2026-07-15:breakfast",
            date: "2026-07-15",
            mealDefinitionId: "breakfast",
            status: "completed",
            ingredientLogs: [],
            startedAt: null,
            completedAt: "2026-07-15T05:00:00.000Z",
            updatedAt: "2026-07-15T05:00:00.000Z"
          }
        }
      },
      {
        ...defaultPhase3TrainingState,
        sessions: {
          s1: {
            id: "s1",
            date: "2026-07-14",
            workoutDefinitionId: "full-body-c",
            status: "completed",
            currentExerciseIndex: 0,
            currentSetNumber: 1,
            startedAt: "",
            pausedAt: null,
            totalPausedDurationMs: 0,
            completedAt: "",
            updatedAt: "",
            readiness: null,
            adjustment: null,
            exerciseSessions: [],
            restTimer: null,
            feedback: null
          }
        }
      },
      {
        ...defaultProgressState,
        measurements: {
          m1: {
            id: "m1",
            clientRecordId: "m1",
            measuredAt: "2026-07-13T00:00:00.000Z",
            localDate: "2026-07-13",
            weightKg: 78,
            waistIn: null,
            chestIn: null,
            armIn: null,
            thighIn: null,
            source: "manual",
            note: "",
            version: 1,
            deletedAt: null
          }
        },
        checkIns: {
          c1: {
            id: "c1",
            clientRecordId: "c1",
            weekNumber: 1,
            checkInDate: "2026-07-12",
            status: "completed",
            energy: null,
            hunger: null,
            digestion: null,
            averageSleepMinutes: null,
            privateNote: "",
            measurementId: null,
            completedAt: "",
            version: 1,
            deletedAt: null
          }
        }
      }
    );
    expect(dates).toEqual(["2026-07-12", "2026-07-13", "2026-07-14", "2026-07-15"]);
  });

  it("calculates transformation progress from latest saved measurement", () => {
    expect(calculateTransformationProgress(defaultProgressState)).toBe(0);
    expect(calculateTransformationProgress({
      ...defaultProgressState,
      measurements: {
        m1: {
          id: "m1",
          clientRecordId: "m1",
          measuredAt: "2026-07-15T00:00:00.000Z",
          localDate: "2026-07-15",
          weightKg: 76.25,
          waistIn: 36.75,
          chestIn: null,
          armIn: null,
          thighIn: null,
          source: "manual",
          note: "",
          version: 1,
          deletedAt: null
        }
      }
    })).toBe(50);
  });

  it("selects overdue, remaining and completion actions", () => {
    expect(selectNextDashboardAction("2026-07-15", 9 * 60, defaultPhase2State, defaultPhase3TrainingState)).toMatchObject({
      id: "pre-badminton",
      label: "Overdue",
      type: "meal"
    });

    const completedMeals = {
      ...defaultPhase2State,
      mealLogs: Object.fromEntries(["pre-badminton", "breakfast", "lunch", "snack", "dinner"].map((mealId) => [
        `2026-07-15:${mealId}`,
        {
          id: `2026-07-15:${mealId}`,
          date: "2026-07-15",
          mealDefinitionId: mealId,
          status: "completed" as const,
          ingredientLogs: [],
          startedAt: null,
          completedAt: "2026-07-15T00:00:00.000Z",
          updatedAt: "2026-07-15T00:00:00.000Z"
        }
      ]))
    };
    expect(selectNextDashboardAction("2026-07-15", 12 * 60, completedMeals, defaultPhase3TrainingState)).toMatchObject({
      type: "workout",
      title: "Full Body C"
    });
  });
});
