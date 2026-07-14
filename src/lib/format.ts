import type { NutritionValues } from "@/types/nutrition";

export function formatDateLabel(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC"
  })
    .format(new Date(`${date}T00:00:00Z`))
    .toUpperCase();
}

export function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC"
  }).format(new Date(`${date}T00:00:00Z`));
}

export function nutritionText(values: NutritionValues) {
  return `${Math.round(values.calories)} kcal · ${Math.round(values.protein)} g protein`;
}

export function clampPercent(value: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, (value / target) * 100));
}
