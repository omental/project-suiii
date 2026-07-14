import type {
  FoodItem,
  IngredientPortion,
  MealDefinition,
  MealPlanDay,
  NutritionTargets,
  WeeklyMealPlan,
  WeightBasis
} from "@/types/nutrition";

export const nutritionTargets: NutritionTargets = {
  calories: 2200,
  protein: 145,
  carbs: 230,
  fat: 65,
  waterLitres: 3
};

export const foodCatalogue: Record<string, FoodItem> = {
  banana: food("banana", "Banana", "Banana", "fruit", "raw_edible", { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 }, "banana"),
  papaya: food("papaya", "Papaya", "Papaya", "fruit", "raw_edible", { calories: 43, protein: 0.5, carbs: 11, fat: 0.3 }, "fruit"),
  apple: food("apple", "Apple", "Apple", "fruit", "raw_edible", { calories: 52, protein: 0.3, carbs: 14, fat: 0.2 }, "apple"),
  guava: food("guava", "Guava", "Guava", "fruit", "raw_edible", { calories: 68, protein: 2.6, carbs: 14, fat: 1 }, "fruit"),
  orange: food("orange", "Orange", "Orange", "fruit", "raw_edible", { calories: 47, protein: 0.9, carbs: 12, fat: 0.1 }, "fruit"),
  fruit: food("fruit", "Fruit", "Fruit", "fruit", "raw_edible", { calories: 55, protein: 0.8, carbs: 14, fat: 0.2 }, "fruit"),
  whole_egg: food("whole_egg", "Whole egg", "Egg", "protein", "unit", { calories: 143, protein: 13, carbs: 1.1, fat: 9.5 }, "egg"),
  egg_white: food("egg_white", "Egg white", "Egg white", "protein", "unit", { calories: 52, protein: 11, carbs: 0.7, fat: 0.2 }, "egg"),
  oats: food("oats", "Oats", "Oats", "carb", "dry", { calories: 389, protein: 16.9, carbs: 66, fat: 6.9 }, "oats"),
  milk: food("milk", "Low-fat milk", "Milk", "dairy", "packaged", { calories: 42, protein: 3.4, carbs: 5, fat: 1 }, "milk"),
  yoghurt: food("yoghurt", "Plain yoghurt", "Yoghurt", "dairy", "packaged", { calories: 61, protein: 3.5, carbs: 4.7, fat: 3.3 }, "yoghurt"),
  rice: food("rice", "Cooked rice", "Rice", "carb", "cooked_edible", { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 }, "rice"),
  roti: food("roti", "Cooked roti", "Roti", "carb", "cooked_edible", { calories: 237, protein: 6.5, carbs: 46, fat: 3.2 }, "roti"),
  potato: food("potato", "Cooked potato", "Potato", "carb", "cooked_edible", { calories: 87, protein: 1.9, carbs: 20, fat: 0.1 }, "potato"),
  chicken: food("chicken", "Cooked skinless chicken", "Chicken", "protein", "cooked_edible", { calories: 165, protein: 31, carbs: 0, fat: 3.6 }, "chicken"),
  fish: food("fish", "Cooked fish", "Fish", "protein", "cooked_edible", { calories: 128, protein: 26, carbs: 0, fat: 2.7 }, "fish"),
  beef: food("beef", "Cooked lean beef", "Lean beef", "protein", "cooked_edible", { calories: 217, protein: 26, carbs: 0, fat: 12 }, "beef"),
  dal: food("dal", "Cooked dal", "Dal", "legume", "cooked_edible", { calories: 116, protein: 9, carbs: 20, fat: 0.4 }, "dal"),
  vegetables: food("vegetables", "Mixed vegetables", "Vegetables", "vegetable", "raw_edible", { calories: 35, protein: 2, carbs: 7, fat: 0.3 }, "vegetables"),
  salad: food("salad", "Salad", "Salad", "vegetable", "raw_edible", { calories: 17, protein: 0.8, carbs: 3.2, fat: 0.2 }, "salad"),
  oil: food("oil", "Cooking oil", "Oil", "fat", "unit", { calories: 900, protein: 0, carbs: 0, fat: 100 }, "oil"),
  peanuts: food("peanuts", "Peanuts", "Peanuts", "fat", "dry", { calories: 567, protein: 26, carbs: 16, fat: 49 }, "peanuts"),
  chickpeas: food("chickpeas", "Roasted chickpeas", "Chickpeas", "legume", "dry", { calories: 364, protein: 19, carbs: 61, fat: 6 }, "chickpeas"),
  singara: food("singara", "Singara", "Singara", "treat", "packaged", { calories: 310, protein: 6, carbs: 34, fat: 16 }, "treat"),
  samosa: food("samosa", "Samosa", "Samosa", "treat", "packaged", { calories: 320, protein: 6, carbs: 32, fat: 18 }, "treat")
};

export const weightBasisLabels: Record<WeightBasis, string> = {
  cooked_edible: "Cooked edible weight",
  raw_edible: "Raw edible weight",
  dry: "Dry weight",
  packaged: "Packaged weight",
  unit: "Exact edible portion"
};

export const weightBasisInstructions: Record<WeightBasis, string> = {
  cooked_edible: "Weigh the cooked edible portion only.",
  raw_edible: "Weigh the raw edible portion.",
  dry: "Weigh before adding liquid or cooking.",
  packaged: "Use packaged weight or the label serving weight.",
  unit: "Weigh the edible portion exactly."
};

export const weighingRules = [
  "Rice, meat, fish, potato and roti use cooked edible weight.",
  "Oats use dry weight. Fruit uses raw edible weight.",
  "Vegetables use raw edible weight unless marked cooked.",
  "Egg uses edible portion without shell.",
  "Oil must be weighed separately. Never estimate cooking oil."
];

export const weeklyMealPlan: WeeklyMealPlan = {
  id: "week-1-2026-07-14",
  weekLabel: "Week 1 · 14-20 July",
  days: [
    day("2026-07-14", "TUE", "Tuesday", "Badminton / Shoulder Care", [
      meal("pre-badminton", 1, "Pre-badminton", "8:15 AM", [["banana", 100], ["milk", 150]]),
      meal("breakfast", 2, "Breakfast", "10:45 AM", [["whole_egg", 150], ["egg_white", 100], ["roti", 120], ["vegetables", 150], ["oil", 5], ["papaya", 150]]),
      meal("lunch", 3, "Lunch", "2:30 PM", [["rice", 230], ["chicken", 170], ["dal", 120], ["vegetables", 250], ["oil", 10], ["salad", 150]]),
      meal("snack", 4, "Snack", "6:30 PM", [["apple", 180, "fruit-choice"], ["yoghurt", 200], ["peanuts", 15]]),
      meal("dinner", 5, "Dinner", "10:00 PM", [["fish", 200], ["potato", 180], ["vegetables", 300], ["oil", 8]])
    ]),
    day("2026-07-15", "WED", "Wednesday", "Strength Day", [
      meal("pre-badminton", 1, "Pre-badminton", "8:15 AM", [["banana", 120]]),
      meal("breakfast", 2, "Breakfast", "10:45 AM", [["oats", 50], ["milk", 250], ["whole_egg", 100], ["egg_white", 150], ["papaya", 150]]),
      meal("lunch", 3, "Lunch", "2:30 PM", [["rice", 220], ["beef", 150], ["dal", 150], ["vegetables", 250], ["oil", 10], ["salad", 150]]),
      meal("snack", 4, "Snack", "6:30 PM", [["yoghurt", 200], ["orange", 180], ["chickpeas", 25]]),
      meal("dinner", 5, "Dinner", "10:00 PM", [["roti", 120], ["chicken", 180], ["vegetables", 300], ["oil", 8]])
    ]),
    day("2026-07-16", "THU", "Thursday", "Active Recovery", [
      meal("pre-badminton", 1, "Pre-badminton", "8:15 AM", [["banana", 100], ["yoghurt", 100]]),
      meal("breakfast", 2, "Breakfast", "10:45 AM", [["whole_egg", 150], ["egg_white", 100], ["roti", 120], ["vegetables", 150], ["oil", 5], ["fruit", 150]]),
      meal("lunch", 3, "Lunch", "2:30 PM", [["rice", 220], ["fish", 200], ["dal", 120], ["vegetables", 250], ["oil", 10], ["salad", 150]]),
      meal("snack", 4, "Snack", "6:30 PM", [["milk", 250], ["apple", 150], ["peanuts", 15]]),
      meal("dinner", 5, "Dinner", "10:00 PM", [["chicken", 180], ["potato", 180], ["vegetables", 300], ["oil", 8]])
    ]),
    day("2026-07-17", "FRI", "Friday", "Complete Rest", [
      meal("breakfast", 1, "Breakfast", "10:45 AM", [["whole_egg", 150], ["egg_white", 100], ["roti", 100], ["vegetables", 200], ["oil", 5], ["fruit", 150]]),
      meal("morning-snack", 2, "Morning snack", "12:30 PM", [["yoghurt", 200], ["guava", 150, "fruit-choice"]]),
      meal("lunch", 3, "Lunch", "2:30 PM", [["rice", 180], ["chicken", 180, "protein-choice"], ["dal", 120], ["vegetables", 300], ["oil", 10], ["salad", 150]]),
      meal("treat-snack", 4, "Treat snack", "6:30 PM", [["singara", 70, "treat-choice"]]),
      meal("dinner", 5, "Dinner", "10:00 PM", [["roti", 100], ["fish", 180, "protein-choice"], ["vegetables", 300], ["oil", 8]])
    ]),
    day("2026-07-18", "SAT", "Saturday", "Strength Day", [
      meal("pre-badminton", 1, "Pre-badminton", "8:15 AM", [["banana", 120]]),
      meal("breakfast", 2, "Breakfast", "10:45 AM", [["whole_egg", 100], ["egg_white", 150], ["oats", 50], ["milk", 200], ["papaya", 150], ["oil", 5]]),
      meal("lunch", 3, "Lunch", "2:30 PM", [["rice", 220], ["chicken", 170], ["vegetables", 250], ["oil", 10], ["salad", 150]]),
      meal("snack", 4, "Snack", "6:30 PM", [["yoghurt", 200], ["apple", 150], ["peanuts", 15]]),
      meal("dinner", 5, "Dinner", "10:00 PM", [["roti", 120], ["fish", 180], ["vegetables", 250], ["oil", 8]])
    ]),
    day("2026-07-19", "SUN", "Sunday", "Badminton / Recovery", [
      meal("pre-badminton", 1, "Pre-badminton", "8:15 AM", [["banana", 100], ["yoghurt", 100]]),
      meal("breakfast", 2, "Breakfast", "10:45 AM", [["whole_egg", 150], ["roti", 120], ["vegetables", 150], ["oil", 5], ["orange", 150]]),
      meal("lunch", 3, "Lunch", "2:30 PM", [["rice", 220], ["beef", 150], ["dal", 150], ["vegetables", 200], ["oil", 10], ["salad", 150]]),
      meal("snack", 4, "Snack", "6:30 PM", [["milk", 250], ["chickpeas", 30], ["guava", 150]]),
      meal("dinner", 5, "Dinner", "10:00 PM", [["chicken", 180], ["potato", 180], ["vegetables", 300], ["oil", 8]])
    ]),
    day("2026-07-20", "MON", "Monday", "Strength Day", [
      meal("pre-badminton", 1, "Pre-badminton", "8:15 AM", [["banana", 120]]),
      meal("breakfast", 2, "Breakfast", "10:45 AM", [["oats", 60], ["milk", 250], ["whole_egg", 100], ["egg_white", 150], ["apple", 120]]),
      meal("lunch", 3, "Lunch", "2:30 PM", [["rice", 220], ["fish", 200], ["dal", 120], ["vegetables", 250], ["oil", 10], ["salad", 150]]),
      meal("snack", 4, "Snack", "6:30 PM", [["yoghurt", 200], ["banana", 100], ["peanuts", 15]]),
      meal("dinner", 5, "Dinner", "10:00 PM", [["roti", 120], ["chicken", 180], ["vegetables", 300], ["oil", 8]])
    ])
  ]
};

export function getPlanDay(date: string) {
  return weeklyMealPlan.days.find((dayItem) => dayItem.date === date) ?? weeklyMealPlan.days[0];
}

export function getMealDefinition(date: string, mealId: string) {
  return getPlanDay(date).meals.find((mealItem) => mealItem.id === mealId);
}

function food(
  id: string,
  name: string,
  shortName: string,
  category: FoodItem["category"],
  basis: WeightBasis,
  nutritionPer100g: FoodItem["nutritionPer100g"],
  iconKey: string
): FoodItem {
  return { id, name, shortName, category, defaultWeightBasis: basis, nutritionPer100g, iconKey };
}

function day(date: string, dayLabel: string, dayName: string, classification: string, meals: MealDefinition[]): MealPlanDay {
  return { date, dayLabel, dayName, classification, targets: nutritionTargets, meals };
}

function meal(
  id: string,
  mealNumber: number,
  name: string,
  time: string,
  portions: Array<[string, number] | [string, number, string]>
): MealDefinition {
  return {
    id,
    mealNumber,
    name,
    time,
    shortLabel: name,
    ingredients: portions.map(([foodId, amount, groupId], index) => ingredient(id, index + 1, foodId, amount, groupId))
  };
}

function ingredient(mealId: string, index: number, foodId: string, targetAmount: number, groupId?: string): IngredientPortion {
  const foodItem = foodCatalogue[foodId];
  const options = optionsFor(groupId, foodId);
  return {
    id: `${mealId}-${index}-${foodId}`,
    foodId,
    targetAmount,
    unit: "g",
    weightBasis: foodItem.defaultWeightBasis,
    preparationNote: noteFor(foodId, foodItem.defaultWeightBasis),
    substitutionGroupId: groupId ?? substitutionGroupFor(foodId),
    options
  };
}

function substitutionGroupFor(foodId: string) {
  if (["rice", "roti", "potato"].includes(foodId)) return "carb-choice";
  if (["chicken", "fish", "beef", "whole_egg"].includes(foodId)) return "protein-choice";
  return undefined;
}

function optionsFor(groupId: string | undefined, originalFoodId: string) {
  const group = groupId ?? substitutionGroupFor(originalFoodId);
  if (group === "carb-choice") {
    return [
      { id: "rice-220", foodId: "rice", targetAmount: 220, unit: "g" as const },
      { id: "roti-120", foodId: "roti", targetAmount: 120, unit: "g" as const },
      { id: "potato-260", foodId: "potato", targetAmount: 260, unit: "g" as const }
    ];
  }
  if (group === "protein-choice") {
    return [
      { id: "chicken-170", foodId: "chicken", targetAmount: 170, unit: "g" as const },
      { id: "fish-200", foodId: "fish", targetAmount: 200, unit: "g" as const },
      { id: "beef-150", foodId: "beef", targetAmount: 150, unit: "g" as const },
      { id: "eggs-250", foodId: "whole_egg", targetAmount: 250, unit: "g" as const }
    ];
  }
  if (group === "fruit-choice") {
    return [
      { id: "apple-150", foodId: "apple", targetAmount: 150, unit: "g" as const },
      { id: "guava-150", foodId: "guava", targetAmount: 150, unit: "g" as const }
    ];
  }
  if (group === "treat-choice") {
    return [
      { id: "singara-70", foodId: "singara", targetAmount: 70, unit: "g" as const },
      { id: "samosa-70", foodId: "samosa", targetAmount: 70, unit: "g" as const },
      { id: "chickpeas-30", foodId: "chickpeas", targetAmount: 30, unit: "g" as const }
    ];
  }
  return undefined;
}

function noteFor(foodId: string, basis: WeightBasis) {
  if (foodId === "oil") return "Weigh separately. Never estimate cooking oil.";
  if (["chicken", "fish", "beef"].includes(foodId)) return "Cooked edible weight without bones.";
  if (basis === "unit") return "Edible portion without shell or waste.";
  return undefined;
}
