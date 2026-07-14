import { foodCatalogue, getMealDefinition, getPlanDay } from "@/data/nutrition";
import type {
  DifferenceStatus,
  IngredientLog,
  IngredientPortion,
  MealDefinition,
  MealLog,
  NutritionValues
} from "@/types/nutrition";

export const zeroNutrition: NutritionValues = { calories: 0, protein: 0, carbs: 0, fat: 0 };

export function addNutrition(a: NutritionValues, b: NutritionValues): NutritionValues {
  return {
    calories: a.calories + b.calories,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat
  };
}

export function nutritionFor(foodId: string, amount: number): NutritionValues {
  const food = foodCatalogue[foodId];
  const factor = amount / 100;
  return {
    calories: food.nutritionPer100g.calories * factor,
    protein: food.nutritionPer100g.protein * factor,
    carbs: food.nutritionPer100g.carbs * factor,
    fat: food.nutritionPer100g.fat * factor
  };
}

export function plannedIngredientNutrition(ingredient: IngredientPortion) {
  return nutritionFor(ingredient.foodId, ingredient.targetAmount);
}

export function mealPlannedNutrition(meal: MealDefinition): NutritionValues {
  return meal.ingredients.reduce((total, ingredient) => addNutrition(total, plannedIngredientNutrition(ingredient)), zeroNutrition);
}

export function ingredientLogNutrition(log: IngredientLog): NutritionValues {
  if (log.skipped || log.actualAmount === null) return zeroNutrition;
  return nutritionFor(log.selectedFoodId, log.actualAmount);
}

export function mealLogNutrition(log: MealLog): NutritionValues {
  if (log.status === "skipped") return zeroNutrition;
  return log.ingredientLogs.reduce((total, ingredientLog) => addNutrition(total, ingredientLogNutrition(ingredientLog)), zeroNutrition);
}

export function roundNutrition(values: NutritionValues): NutritionValues {
  return {
    calories: Math.round(values.calories),
    protein: Math.round(values.protein),
    carbs: Math.round(values.carbs),
    fat: Math.round(values.fat)
  };
}

export function mealLogId(date: string, mealId: string) {
  return `${date}:${mealId}`;
}

export function createInitialLogs(meal: MealDefinition): IngredientLog[] {
  return meal.ingredients.map((ingredient) => ({
    ingredientPortionId: ingredient.id,
    selectedFoodId: ingredient.foodId,
    targetAmount: ingredient.targetAmount,
    actualAmount: null,
    skipped: false,
    completedAt: null
  }));
}

export function getMealStatus(date: string, meal: MealDefinition, log?: MealLog): MealLog["status"] {
  if (log) return log.status;
  const day = getPlanDay(date);
  const firstIncomplete = day.meals.find((mealItem) => {
    const id = mealLogId(date, mealItem.id);
    return !Object.prototype.hasOwnProperty.call({}, id);
  });
  if (firstIncomplete?.id === meal.id) return "up_next";
  return meal.mealNumber === 1 ? "up_next" : "scheduled";
}

export function summarizeDay(date: string, logs: Record<string, MealLog>) {
  const day = getPlanDay(date);
  const consumed = day.meals.reduce((total, meal) => {
    const log = logs[mealLogId(date, meal.id)];
    return log?.status === "completed" ? addNutrition(total, mealLogNutrition(log)) : total;
  }, zeroNutrition);
  const planned = day.meals.reduce((total, meal) => addNutrition(total, mealPlannedNutrition(meal)), zeroNutrition);
  const mealsCompleted = day.meals.filter((meal) => logs[mealLogId(date, meal.id)]?.status === "completed").length;
  return {
    date,
    targets: day.targets,
    consumed,
    planned,
    mealsCompleted,
    mealsTotal: day.meals.length
  };
}

export function validateActualAmount(value: number, target: number) {
  if (!Number.isFinite(value) || Number.isNaN(value)) return "Enter a valid number.";
  if (value <= 0) return "Enter a positive gram amount.";
  if (value > Math.max(1000, target * 4)) return "Check the measurement.";
  return "";
}

export function differenceStatus(actual: number, target: number): DifferenceStatus {
  const ratio = (actual - target) / target;
  if (Math.abs(ratio) <= 0.03) return "on_target";
  if (ratio < -0.15) return "materially_under";
  if (ratio > 0.15) return "materially_over";
  return ratio < 0 ? "slightly_under" : "slightly_over";
}

export function differenceLabel(actual: number, target: number) {
  const diff = Math.round(actual - target);
  if (diff === 0) return "On target";
  if (Math.abs(diff) > Math.max(20, target * 0.15)) return "Check the measurement";
  return `${Math.abs(diff)} g ${diff < 0 ? "under" : "over"} target`;
}

export function nextMealAfter(date: string, mealId: string) {
  const day = getPlanDay(date);
  const index = day.meals.findIndex((meal) => meal.id === mealId);
  return day.meals[index + 1] ?? null;
}

export function requireMeal(date: string, mealId: string) {
  const meal = getMealDefinition(date, mealId);
  if (!meal) throw new Error(`Unknown meal ${date}/${mealId}`);
  return meal;
}
