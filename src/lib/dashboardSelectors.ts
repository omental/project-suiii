import { getPlanDay } from "@/data/nutrition";
import { getWorkoutForDate } from "@/data/training";
import { addDays, daysBetween, getProgrammePosition } from "@/lib/dhakaClock";
import { mealLogId } from "@/lib/nutritionCalc";
import type { Phase2LocalState } from "@/types/nutrition";
import type { ProgressLocalState } from "@/types/progress";
import type { Phase3TrainingState } from "@/types/training";

const programmeProfileKey = "project-suiii:programme-profile";
const startingWeightKg = 79;
const targetWeightMidpointKg = 73.5;
const startingWaistIn = 38.5;
const targetWaistIn = 35;

export type NextDashboardAction = {
  id: string;
  type: "meal" | "workout" | "complete";
  time: string;
  label: "Next" | "Overdue" | "Done";
  title: string;
  ingredient: string;
  targetGrams: number;
  href?: string;
};

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function earliestDate(dates: string[]) {
  return dates.filter(Boolean).sort()[0] ?? null;
}

export function collectActivityDates(nutrition: Phase2LocalState, training: Phase3TrainingState, progress: ProgressLocalState) {
  const dates = new Set<string>();
  Object.values(nutrition.mealLogs).forEach((meal) => {
    if (meal.status === "completed") dates.add(meal.date);
  });
  Object.values(training.sessions).forEach((session) => {
    if (session.status === "completed") dates.add(session.date);
  });
  Object.values(progress.measurements).forEach((measurement) => {
    if (!measurement.deletedAt) dates.add(measurement.localDate);
  });
  Object.values(progress.checkIns).forEach((checkIn) => {
    if (!checkIn.deletedAt && checkIn.status === "completed") dates.add(checkIn.checkInDate);
  });
  return [...dates].sort();
}

export function calculateActiveStreak(activityDates: string[], todayDateKey: string) {
  const active = new Set(activityDates);
  if (active.size === 0) return 0;
  let cursor = active.has(todayDateKey) ? todayDateKey : addDays(todayDateKey, -1);
  if (!active.has(cursor)) return 0;
  let streak = 0;
  while (active.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function calculateTransformationProgress(progress: ProgressLocalState) {
  const latest = Object.values(progress.measurements)
    .filter((measurement) => !measurement.deletedAt)
    .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))
    .at(-1);
  if (!latest) return 0;
  const values: number[] = [];
  if (latest.weightKg !== null) {
    values.push(((startingWeightKg - latest.weightKg) / (startingWeightKg - targetWeightMidpointKg)) * 100);
  }
  if (latest.waistIn !== null) {
    values.push(((startingWaistIn - latest.waistIn) / (startingWaistIn - targetWaistIn)) * 100);
  }
  if (values.length === 0) return 0;
  return clampPercent(values.reduce((sum, value) => sum + clampPercent(value), 0) / values.length);
}

export function getProgrammeStartDate(todayDateKey: string, activityDates: string[]) {
  const fallback = earliestDate(activityDates);
  if (typeof window === "undefined") return fallback ?? todayDateKey;
  try {
    const raw = window.localStorage.getItem(programmeProfileKey);
    const parsed = raw ? JSON.parse(raw) as { programmeStartDate?: string } : null;
    if (parsed?.programmeStartDate) return parsed.programmeStartDate;
    const programmeStartDate = fallback ?? todayDateKey;
    window.localStorage.setItem(programmeProfileKey, JSON.stringify({ programmeStartDate }));
    return programmeStartDate;
  } catch {
    return fallback ?? todayDateKey;
  }
}

function minutesFromClockTime(time: string) {
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  const hour12 = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3].toUpperCase();
  const hour = (hour12 % 12) + (meridiem === "PM" ? 12 : 0);
  return hour * 60 + minute;
}

export function selectNextDashboardAction(
  todayDateKey: string,
  dhakaMinuteOfDay: number,
  nutrition: Phase2LocalState,
  training: Phase3TrainingState
): NextDashboardAction {
  const day = getPlanDay(todayDateKey);
  const mealActions = day.meals
    .filter((meal) => {
      const log = nutrition.mealLogs[mealLogId(todayDateKey, meal.id)];
      return log?.status !== "completed" && log?.status !== "skipped";
    })
    .map((meal) => ({
      meal,
      minute: minutesFromClockTime(meal.time)
    }))
    .sort((a, b) => a.minute - b.minute);

  const workout = getWorkoutForDate(todayDateKey);
  const completedWorkout = Object.values(training.sessions).some((session) => session.date === todayDateKey && session.status === "completed");
  const workoutMinute = workout ? minutesFromClockTime(workout.scheduledTime) : Number.POSITIVE_INFINITY;

  const firstMeal = mealActions[0];
  if (firstMeal && firstMeal.minute <= workoutMinute) {
    const ingredient = firstMeal.meal.ingredients[0];
    return {
      id: firstMeal.meal.id,
      type: "meal",
      time: firstMeal.meal.time,
      label: firstMeal.minute < dhakaMinuteOfDay ? "Overdue" : "Next",
      title: firstMeal.meal.name,
      ingredient: ingredient?.foodId ?? "Meal",
      targetGrams: ingredient?.targetAmount ?? 0,
      href: `/meals/${todayDateKey}/${firstMeal.meal.id}/weigh`
    };
  }

  if (workout && !completedWorkout) {
    return {
      id: `workout-${workout.id}`,
      type: "workout",
      time: workout.scheduledTime,
      label: workoutMinute < dhakaMinuteOfDay ? "Overdue" : "Next",
      title: workout.name,
      ingredient: `${workout.exercises.length} exercises`,
      targetGrams: workout.estimatedMinutes,
      href: "/train"
    };
  }

  return {
    id: "today-complete",
    type: "complete",
    time: "Today",
    label: "Done",
    title: "All Core Actions Complete",
    ingredient: "Recovery",
    targetGrams: 0
  };
}

export function buildProgrammeSnapshot(todayDateKey: string, nutrition: Phase2LocalState, training: Phase3TrainingState, progress: ProgressLocalState) {
  const activityDates = collectActivityDates(nutrition, training, progress);
  const programmeStartDate = getProgrammeStartDate(todayDateKey, activityDates);
  return {
    programmeStartDate,
    ...getProgrammePosition(programmeStartDate, todayDateKey),
    activeStreak: calculateActiveStreak(activityDates, todayDateKey),
    progressPercent: calculateTransformationProgress(progress),
    elapsedDays: Math.max(0, daysBetween(programmeStartDate, todayDateKey))
  };
}
