import { defaultLocalState } from "@/data/dashboard";
import { getMealDefinition, getPlanDay, weeklyMealPlan } from "@/data/nutrition";
import {
  addNutrition,
  createInitialLogs,
  mealLogId,
  mealLogNutrition,
  mealPlannedNutrition,
  nutritionFor,
  requireMeal,
  roundNutrition,
  summarizeDay
} from "@/lib/nutritionCalc";
import { storageKeyFor } from "@/lib/accountStorage";
import type {
  IngredientLog,
  MealLog,
  MealStatus,
  Phase2LocalState,
  SubstitutionOption,
  WeighingSession
} from "@/types/nutrition";

const phase1Key = () => storageKeyFor("dashboard");
const phase2Key = () => storageKeyFor("nutrition");

export const defaultPhase2State: Phase2LocalState = {
  version: 2,
  waterIncrementsMl: [],
  cigaretteIncrements: [],
  completedTimelineIds: ["hydration-0645"],
  weighing: defaultLocalState.weighing,
  mealLogs: {},
  weighingSessions: {}
};

function nowISO() {
  return new Date().toISOString();
}

function isPhase2State(value: unknown): value is Phase2LocalState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Phase2LocalState>;
  return (
    candidate.version === 2 &&
    Array.isArray(candidate.waterIncrementsMl) &&
    Array.isArray(candidate.cigaretteIncrements) &&
    typeof candidate.mealLogs === "object" &&
    candidate.mealLogs !== null &&
    typeof candidate.weighingSessions === "object" &&
    candidate.weighingSessions !== null
  );
}

function readPhase1State() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(phase1Key());
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Phase2LocalState>;
    return {
      waterIncrementsMl: Array.isArray(parsed.waterIncrementsMl) ? parsed.waterIncrementsMl : [],
      cigaretteIncrements: Array.isArray(parsed.cigaretteIncrements) ? parsed.cigaretteIncrements : [],
      completedTimelineIds: Array.isArray(parsed.completedTimelineIds) ? parsed.completedTimelineIds : ["hydration-0645"],
      weighing:
        parsed.weighing && typeof parsed.weighing === "object"
          ? { ...defaultLocalState.weighing, ...parsed.weighing }
          : defaultLocalState.weighing
    };
  } catch {
    return null;
  }
}

export function readNutritionState(): Phase2LocalState {
  if (typeof window === "undefined") return defaultPhase2State;
  try {
    const raw = window.localStorage.getItem(phase2Key());
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isPhase2State(parsed)) {
        return { ...defaultPhase2State, ...parsed };
      }
    }
    const phase1 = readPhase1State();
    return phase1 ? { ...defaultPhase2State, ...phase1 } : defaultPhase2State;
  } catch {
    return defaultPhase2State;
  }
}

export function writeNutritionState(state: Phase2LocalState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(phase2Key(), JSON.stringify(state));
}

export function resetNutritionStateForTests() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(phase2Key());
  window.localStorage.removeItem(phase1Key());
}

export function makeRepository(state: Phase2LocalState) {
  return {
    getWeeklyMealPlan() {
      return weeklyMealPlan;
    },
    getMealPlanForDate(date: string) {
      return getPlanDay(date);
    },
    getMealLog(date: string, mealId: string) {
      return state.mealLogs[mealLogId(date, mealId)] ?? null;
    },
    getWeighingSession(date: string, mealId: string) {
      return state.weighingSessions[mealLogId(date, mealId)] ?? null;
    },
    getDailyNutritionSummary(date: string) {
      return summarizeDay(date, state.mealLogs);
    },
    getMealStatus(date: string, mealId: string): MealStatus {
      const log = state.mealLogs[mealLogId(date, mealId)];
      if (log) return log.status;
      const day = getPlanDay(date);
      const firstOpen = day.meals.find((meal) => {
        const candidate = state.mealLogs[mealLogId(date, meal.id)];
        return !candidate || candidate.status === "in_progress";
      });
      return firstOpen?.id === mealId ? "up_next" : "scheduled";
    }
  };
}

export function startWeighingSession(state: Phase2LocalState, date: string, mealId: string): Phase2LocalState {
  const meal = requireMeal(date, mealId);
  const id = mealLogId(date, mealId);
  const existingSession = state.weighingSessions[id];
  const existingLog = state.mealLogs[id];
  const ingredientLogs = existingSession?.ingredientLogs ?? existingLog?.ingredientLogs ?? createInitialLogs(meal);
  const session: WeighingSession = {
    id,
    date,
    mealDefinitionId: mealId,
    currentIngredientIndex: existingSession?.currentIngredientIndex ?? 0,
    ingredientLogs,
    updatedAt: nowISO()
  };
  const inProgressLog: MealLog = {
    id,
    date,
    mealDefinitionId: mealId,
    status: "in_progress",
    ingredientLogs,
    startedAt: existingLog?.startedAt ?? nowISO(),
    completedAt: existingLog?.completedAt ?? null,
    updatedAt: nowISO()
  };
  return {
    ...state,
    mealLogs: { ...state.mealLogs, [id]: inProgressLog },
    weighingSessions: { ...state.weighingSessions, [id]: session }
  };
}

export function saveWeighingSession(
  state: Phase2LocalState,
  date: string,
  mealId: string,
  ingredientLogs: IngredientLog[],
  currentIngredientIndex: number
): Phase2LocalState {
  const id = mealLogId(date, mealId);
  const existingLog = state.mealLogs[id];
  const session: WeighingSession = {
    id,
    date,
    mealDefinitionId: mealId,
    currentIngredientIndex,
    ingredientLogs,
    updatedAt: nowISO()
  };
  return {
    ...state,
    mealLogs: {
      ...state.mealLogs,
      [id]: {
        id,
        date,
        mealDefinitionId: mealId,
        status: "in_progress",
        ingredientLogs,
        startedAt: existingLog?.startedAt ?? nowISO(),
        completedAt: null,
        updatedAt: nowISO()
      }
    },
    weighingSessions: { ...state.weighingSessions, [id]: session }
  };
}

export function completeMeal(state: Phase2LocalState, date: string, mealId: string, ingredientLogs: IngredientLog[]): Phase2LocalState {
  const id = mealLogId(date, mealId);
  const existingLog = state.mealLogs[id];
  const nextSessions = { ...state.weighingSessions };
  delete nextSessions[id];
  return {
    ...state,
    mealLogs: {
      ...state.mealLogs,
      [id]: {
        id,
        date,
        mealDefinitionId: mealId,
        status: "completed",
        ingredientLogs,
        startedAt: existingLog?.startedAt ?? nowISO(),
        completedAt: nowISO(),
        updatedAt: nowISO()
      }
    },
    weighingSessions: nextSessions
  };
}

export function skipMeal(state: Phase2LocalState, date: string, mealId: string): Phase2LocalState {
  const meal = requireMeal(date, mealId);
  const id = mealLogId(date, mealId);
  const ingredientLogs = createInitialLogs(meal).map((log) => ({ ...log, skipped: true }));
  return {
    ...state,
    mealLogs: {
      ...state.mealLogs,
      [id]: {
        id,
        date,
        mealDefinitionId: mealId,
        status: "skipped",
        ingredientLogs,
        startedAt: null,
        completedAt: null,
        updatedAt: nowISO()
      }
    }
  };
}

export function applySubstitution(
  state: Phase2LocalState,
  date: string,
  mealId: string,
  ingredientPortionId: string,
  option: SubstitutionOption
): Phase2LocalState {
  const meal = getMealDefinition(date, mealId);
  if (!meal) return state;
  const id = mealLogId(date, mealId);
  const existing = state.mealLogs[id];
  const logs = existing?.ingredientLogs ?? createInitialLogs(meal);
  const ingredientLogs = logs.map((log) =>
    log.ingredientPortionId === ingredientPortionId
      ? {
          ...log,
          selectedFoodId: option.foodId,
          targetAmount: option.targetAmount,
          actualAmount: null,
          skipped: false,
          completedAt: null
        }
      : log
  );
  return {
    ...state,
    mealLogs: {
      ...state.mealLogs,
      [id]: {
        id,
        date,
        mealDefinitionId: mealId,
        status: existing?.status ?? "scheduled",
        ingredientLogs,
        startedAt: existing?.startedAt ?? null,
        completedAt: existing?.completedAt ?? null,
        updatedAt: nowISO()
      }
    }
  };
}

export function getDisplayedMealNutrition(date: string, mealId: string, state: Phase2LocalState) {
  const meal = requireMeal(date, mealId);
  const log = state.mealLogs[mealLogId(date, mealId)];
  if (log?.status === "completed") return roundNutrition(mealLogNutrition(log));
  if (log) {
    const total = log.ingredientLogs.reduce((sum, ingredientLog) => {
      const amount = ingredientLog.actualAmount ?? ingredientLog.targetAmount;
      if (ingredientLog.skipped) return sum;
      return addNutrition(sum, nutritionFor(ingredientLog.selectedFoodId, amount));
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
    return roundNutrition(total);
  }
  return roundNutrition(mealPlannedNutrition(meal));
}
