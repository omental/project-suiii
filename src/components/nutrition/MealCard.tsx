import Link from "next/link";
import { ChevronRight, Clock } from "lucide-react";
import { foodCatalogue } from "@/data/nutrition";
import { nutritionText } from "@/lib/format";
import { getDisplayedMealNutrition } from "@/lib/nutritionRepository";
import type { MealDefinition, MealStatus, Phase2LocalState } from "@/types/nutrition";

const statusLabels: Record<MealStatus, string> = {
  scheduled: "Scheduled",
  up_next: "Up next",
  in_progress: "In progress",
  completed: "Completed",
  skipped: "Skipped"
};

export function mealIngredientSummary(meal: MealDefinition) {
  return meal.ingredients
    .slice(0, 4)
    .map((ingredient) => `${foodCatalogue[ingredient.foodId].shortName} ${ingredient.targetAmount} g`)
    .join(" · ");
}

export function MealCard({
  date,
  meal,
  status,
  state,
  actionLabel = "Open"
}: {
  date: string;
  meal: MealDefinition;
  status: MealStatus;
  state: Phase2LocalState;
  actionLabel?: string;
}) {
  const nutrition = getDisplayedMealNutrition(date, meal.id, state);
  const active = status === "up_next" || status === "in_progress";
  return (
    <Link
      href={`/meals/${date}/${meal.id}`}
      className={`focus-ring card grid grid-cols-[2.25rem_1fr_auto] items-center gap-3 p-4 transition hover:border-suii-lime/60 ${
        active ? "border-suii-lime/70" : ""
      }`}
    >
      <span className={`display text-3xl ${status === "completed" ? "text-suii-lime" : "text-suii-muted"}`}>{meal.mealNumber}</span>
      <span className="min-w-0">
        <span className="display block text-lg text-suii-lime">
          {meal.time} · <span className="text-white">{meal.name}</span>
        </span>
        <span className="mt-1 block text-sm font-semibold text-suii-muted">{mealIngredientSummary(meal)}</span>
        <span className="mt-2 flex items-center gap-2 text-xs font-bold uppercase text-suii-muted">
          <Clock className="size-4" aria-hidden="true" />
          {nutritionText(nutrition)}
        </span>
      </span>
      <span className="grid justify-items-end gap-1">
        <span className={`text-xs font-black uppercase ${active ? "text-suii-lime" : "text-suii-muted"}`}>{statusLabels[status]}</span>
        <span className="flex items-center gap-1 text-sm font-black uppercase text-suii-lime">
          {actionLabel}
          <ChevronRight className="size-5" aria-hidden="true" />
        </span>
      </span>
    </Link>
  );
}
