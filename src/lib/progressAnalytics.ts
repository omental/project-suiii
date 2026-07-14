import { dashboardData } from "@/data/dashboard";
import { nutritionTargets } from "@/data/nutrition";
import { collectActivityDates, getProgrammeStartDate } from "@/lib/dashboardSelectors";
import { daysBetween as dhakaDaysBetween, getDhakaDateKey, getWeekdayName } from "@/lib/dhakaClock";
import { readNutritionState } from "@/lib/nutritionRepository";
import { readTrainingState } from "@/lib/trainingRepository";
import type { BodyMeasurement, ProgressLocalState, ProgressSummaryLocal } from "@/types/progress";

export const programmeTotalDays = 90;

export function todayISO() {
  return getDhakaDateKey();
}

export function daysBetween(start: string, end: string) {
  return dhakaDaysBetween(start, end);
}

export function sortedMeasurements(state: ProgressLocalState) {
  return Object.values(state.measurements)
    .filter((item) => !item.deletedAt)
    .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
}

function round(value: number | null, digits = 1) {
  if (value === null || Number.isNaN(value) || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function latestMeasurement(state: ProgressLocalState) {
  return sortedMeasurements(state).at(-1) ?? null;
}

export function validateMeasurementInput(values: Partial<Pick<BodyMeasurement, "weightKg" | "waistIn" | "chestIn" | "armIn" | "thighIn">>) {
  const ranges = {
    weightKg: [20, 350],
    waistIn: [10, 100],
    chestIn: [10, 100],
    armIn: [4, 40],
    thighIn: [8, 60]
  } as const;
  const hasValue = Object.values(values).some((value) => value !== null && value !== undefined);
  if (!hasValue) return "Enter at least weight, waist, chest, arm or thigh.";
  for (const [field, value] of Object.entries(values) as Array<[keyof typeof ranges, number | null | undefined]>) {
    if (value === null || value === undefined) continue;
    const [min, max] = ranges[field];
    if (!Number.isFinite(value) || value <= min || value >= max) return "Measurements must be positive and realistically bounded.";
  }
  return null;
}

export function buildForecast(measurements: BodyMeasurement[]) {
  const weightPoints = measurements.filter((item) => item.weightKg !== null);
  if (weightPoints.length < 3) return { available: false, reason: "At least three weekly measurements are required.", estimatedWeeks: null, weeklyRateKg: null };
  const first = weightPoints[0];
  const last = weightPoints.at(-1)!;
  const span = Math.max(1, daysBetween(first.localDate, last.localDate));
  if (span < 14) return { available: false, reason: "Measurements must be separated by enough time.", estimatedWeeks: null, weeklyRateKg: null };
  const rate = ((last.weightKg! - first.weightKg!) / span) * 7;
  if (rate >= -0.05) return { available: false, reason: "Trend is flat or away from the target range.", estimatedWeeks: null, weeklyRateKg: round(rate, 2) };
  if (Math.abs(rate) > 1.25) return { available: false, reason: "Recent rate is too noisy for a conservative estimate.", estimatedWeeks: null, weeklyRateKg: round(rate, 2) };
  const remaining = Math.max(0, last.weightKg! - 74);
  const weeks = remaining / Math.abs(rate);
  return { available: true, reason: "Trend estimate, not a guarantee.", estimatedWeeks: `${Math.max(1, Math.floor(weeks - 1))}-${Math.ceil(weeks + 2)} weeks`, weeklyRateKg: round(rate, 2) };
}

export function buildProgressSummary(state: ProgressLocalState): ProgressSummaryLocal {
  const measurements = sortedMeasurements(state);
  const latest = measurements.at(-1) ?? null;
  const previous = measurements.length > 1 ? measurements.at(-2)! : null;
  const nutrition = readNutritionState();
  const training = readTrainingState();
  const today = todayISO();
  const programmeStartDate = getProgrammeStartDate(today, collectActivityDates(nutrition, training, state));
  const completedMeals = Object.values(nutrition.mealLogs).filter((meal) => meal.status === "completed").length;
  const completedWorkouts = Object.values(training.sessions).filter((session) => session.status === "completed").length;
  const waterAdded = nutrition.waterIncrementsMl.reduce((sum, amount) => sum + amount, 0) / 1000;
  const cigaretteToday = nutrition.cigaretteIncrements.reduce((sum, amount) => sum + amount, 0);
  const weightChange = latest?.weightKg === null || !latest ? null : latest.weightKg - dashboardData.user.startingWeightKg;
  const waistChange = latest?.waistIn === null || !latest ? null : latest.waistIn - dashboardData.user.startingWaistIn;
  const recentMilestones = [];
  if (weightChange !== null && weightChange <= -1) recentMilestones.push("First kilogram lost");
  if (weightChange !== null && weightChange <= -2) recentMilestones.push("First 2 kg lost");
  if (waistChange !== null && waistChange <= -1) recentMilestones.push("First inch off waist");
  if (Object.values(state.checkIns).some((item) => item.status === "completed")) recentMilestones.push("First weekly check-in complete");
  const forecast = buildForecast(measurements);
  const proteinDays = completedMeals >= 5 ? 1 : 0;
  const trendStatus = measurements.length < 2 ? "Not enough data for a trend" : weightChange !== null && weightChange < 0 ? "On track" : "Review adherence";
  const insight = measurements.length <= 1
    ? "One measurement is not enough to establish progress or regression."
    : waistChange !== null && waistChange < 0 && completedWorkouts >= 2
      ? "Current approach appears consistent with the goal."
      : "Review adherence before changing targets.";
  return {
    programmeDay: Math.max(1, Math.min(programmeTotalDays, daysBetween(programmeStartDate, today) + 1)),
    programmeTotalDays,
    currentWeightKg: latest?.weightKg ?? null,
    startingWeightKg: dashboardData.user.startingWeightKg,
    targetWeightMinKg: 73,
    targetWeightMaxKg: 74,
    weightChangeKg: round(weightChange),
    currentWaistIn: latest?.waistIn ?? null,
    startingWaistIn: dashboardData.user.startingWaistIn,
    targetWaistIn: dashboardData.user.targetWaistIn,
    waistChangeIn: round(waistChange),
    trendStatus,
    workoutAdherence: { completed: completedWorkouts, planned: 3 },
    mealAdherence: { completed: completedMeals, planned: 35 },
    proteinDays,
    waterDays: waterAdded >= nutritionTargets.waterLitres ? 1 : 0,
    badmintonDays: nutrition.completedTimelineIds.includes("badminton-0900") ? 1 : 0,
    fridayRest: true,
    smoking: {
      baseline: state.smokingBaseline,
      dailyLimit: state.smokingDailyLimit,
      today: cigaretteToday,
      sevenDayAverage: cigaretteToday,
      previousSevenDayAverage: state.smokingBaseline,
      percentageChange: state.smokingBaseline ? round(((cigaretteToday - state.smokingBaseline) / state.smokingBaseline) * 100, 0) : null
    },
    checkInDue: getWeekdayName(today) === "Saturday",
    recentMilestones,
    insight: previous ? insight : "One week is not enough to establish a plateau.",
    forecast
  };
}
