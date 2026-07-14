"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MealCard } from "@/components/nutrition/MealCard";
import { NutritionHeader } from "@/components/nutrition/NutritionHeader";
import { foodCatalogue, weeklyMealPlan, weighingRules } from "@/data/nutrition";
import { mealPlannedNutrition, roundNutrition } from "@/lib/nutritionCalc";
import { useNutritionRepository } from "@/hooks/useNutritionRepository";

export function SevenDayPlan() {
  const { state, repository } = useNutritionRepository();
  const [activeDate, setActiveDate] = useState("2026-07-14");
  const activeDay = weeklyMealPlan.days.find((day) => day.date === activeDate) ?? weeklyMealPlan.days[0];
  const summary = repository.getDailyNutritionSummary(activeDay.date);

  return (
    <AppShell>
      <NutritionHeader
        title="7-Day Meal Plan"
        subtitle={weeklyMealPlan.weekLabel}
        action={<CalendarDays className="size-9 text-suii-lime" aria-hidden="true" />}
      />
      <div className="grid gap-3 px-3 pt-6 sm:px-4">
        <div className="card p-3">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" className="focus-ring grid size-11 place-items-center rounded-full text-suii-lime" aria-label="Previous week">
              <ArrowLeft className="size-6" aria-hidden="true" />
            </button>
            <p className="display text-xl text-suii-lime">{weeklyMealPlan.weekLabel}</p>
            <button type="button" className="focus-ring grid size-11 place-items-center rounded-full text-suii-lime" aria-label="Next week">
              <ArrowRight className="size-6" aria-hidden="true" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weeklyMealPlan.days.map((day) => (
              <button
                type="button"
                key={day.date}
                onClick={() => setActiveDate(day.date)}
                className={`focus-ring rounded-xl border p-2 text-center ${
                  day.date === activeDate ? "border-suii-lime bg-suii-lime text-black" : "border-white/10 bg-white/5 text-white"
                }`}
                aria-pressed={day.date === activeDate}
              >
                <span className="display block text-sm">{day.dayLabel}</span>
                <span className="display block text-2xl">{Number(day.date.slice(-2))}</span>
              </button>
            ))}
          </div>
        </div>

        <section className="card p-4" aria-labelledby="day-summary-title">
          <h2 id="day-summary-title" className="display text-2xl text-white">
            {activeDay.dayName} · {activeDay.classification}
          </h2>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <Stat value={activeDay.targets.calories.toLocaleString()} label="Kcal" />
            <Stat value={`${activeDay.targets.protein} g`} label="Protein" />
            <Stat value={`${activeDay.targets.waterLitres.toFixed(1)} L`} label="Water" />
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-suii-lime" style={{ width: `${(summary.mealsCompleted / summary.mealsTotal) * 100}%` }} />
          </div>
          <p className="display mt-2 text-center text-lg text-suii-muted">
            {summary.mealsCompleted} of {summary.mealsTotal} meals complete
          </p>
        </section>

        <section className="grid gap-3" aria-labelledby="day-meals-title">
          <h2 id="day-meals-title" className="sr-only">Chronological meals</h2>
          {activeDay.meals.map((meal) => {
            const nutrition = roundNutrition(mealPlannedNutrition(meal));
            return (
              <div key={meal.id} className="grid gap-2">
                <MealCard date={activeDay.date} meal={meal} status={repository.getMealStatus(activeDay.date, meal.id)} state={state} actionLabel="Weigh" />
                <p className="px-4 text-xs font-bold text-suii-muted">
                  Exact: {meal.ingredients.map((ingredient) => `${foodCatalogue[ingredient.foodId].shortName} ${ingredient.targetAmount} g`).join(" · ")} · {nutrition.calories} kcal
                </p>
              </div>
            );
          })}
        </section>

        <section className="card p-4" aria-labelledby="weighing-rule-title">
          <h2 id="weighing-rule-title" className="display text-2xl text-suii-lime">Weighing Rule</h2>
          <p className="mt-2 text-sm leading-6 text-suii-muted">{weighingRules.join(" ")}</p>
        </section>

        <Link href="/meals" className="focus-ring flex min-h-16 items-center justify-center rounded-2xl bg-suii-lime px-4 text-xl font-black uppercase text-black">
          Start Today&apos;s Plan
        </Link>
      </div>
    </AppShell>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="display text-3xl text-suii-gold">{value}</p>
      <p className="display text-sm text-suii-muted">{label}</p>
    </div>
  );
}
