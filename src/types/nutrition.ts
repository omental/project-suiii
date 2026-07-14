export type NutritionValues = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type WeightBasis = "cooked_edible" | "raw_edible" | "dry" | "packaged" | "unit";

export type FoodCategory =
  | "carb"
  | "protein"
  | "fruit"
  | "vegetable"
  | "fat"
  | "dairy"
  | "legume"
  | "treat";

export type FoodItem = {
  id: string;
  name: string;
  shortName: string;
  category: FoodCategory;
  defaultWeightBasis: WeightBasis;
  nutritionPer100g: NutritionValues;
  iconKey: string;
};

export type SubstitutionOption = {
  id: string;
  foodId: string;
  targetAmount: number;
  unit: "g";
};

export type IngredientPortion = {
  id: string;
  foodId: string;
  targetAmount: number;
  unit: "g";
  weightBasis: WeightBasis;
  preparationNote?: string;
  substitutionGroupId?: string;
  options?: SubstitutionOption[];
};

export type MealStatus = "scheduled" | "up_next" | "in_progress" | "completed" | "skipped";

export type MealDefinition = {
  id: string;
  mealNumber: number;
  name: string;
  time: string;
  shortLabel: string;
  ingredients: IngredientPortion[];
};

export type NutritionTargets = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  waterLitres: number;
};

export type MealPlanDay = {
  date: string;
  dayLabel: string;
  dayName: string;
  classification: string;
  targets: NutritionTargets;
  meals: MealDefinition[];
};

export type WeeklyMealPlan = {
  id: string;
  weekLabel: string;
  days: MealPlanDay[];
};

export type IngredientLog = {
  ingredientPortionId: string;
  selectedFoodId: string;
  targetAmount: number;
  actualAmount: number | null;
  skipped: boolean;
  completedAt: string | null;
};

export type MealLog = {
  id: string;
  date: string;
  mealDefinitionId: string;
  status: MealStatus;
  ingredientLogs: IngredientLog[];
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
};

export type WeighingSession = {
  id: string;
  date: string;
  mealDefinitionId: string;
  currentIngredientIndex: number;
  ingredientLogs: IngredientLog[];
  updatedAt: string;
};

export type DailyNutritionSummary = {
  date: string;
  targets: NutritionTargets;
  consumed: NutritionValues;
  planned: NutritionValues;
  mealsCompleted: number;
  mealsTotal: number;
};

export type DifferenceStatus =
  | "on_target"
  | "slightly_under"
  | "slightly_over"
  | "materially_under"
  | "materially_over";

export type Phase2LocalState = {
  version: 2;
  waterIncrementsMl: number[];
  cigaretteIncrements: number[];
  completedTimelineIds: string[];
  weighing: {
    actionId: string;
    actualGrams: number | null;
    completed: boolean;
  };
  mealLogs: Record<string, MealLog>;
  weighingSessions: Record<string, WeighingSession>;
};
