"use client";

import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { NutritionBars } from "@/components/nutrition/NutritionBars";
import { foodCatalogue, getMealDefinition, getPlanDay } from "@/data/nutrition";
import { nextMealAfter, mealLogNutrition, mealPlannedNutrition, roundNutrition } from "@/lib/nutritionCalc";
import { useNutritionRepository } from "@/hooks/useNutritionRepository";

export function MealComplete({ date, mealId }: { date: string; mealId: string }) {
  const { repository } = useNutritionRepository();
  const meal = getMealDefinition(date, mealId);
  const day = getPlanDay(date);
  const log = repository.getMealLog(date, mealId);

  if (!meal || !log) {
    return (
      <AppShell hideNavigation>
        <div className="p-6 text-white">No completed meal found yet.</div>
      </AppShell>
    );
  }

  const actual = roundNutrition(mealLogNutrition(log));
  const planned = roundNutrition(mealPlannedNutrition(meal));
  const diff = actual.calories - planned.calories;
  const summary = repository.getDailyNutritionSummary(date);
  const consumed = roundNutrition(summary.consumed);
  const nextMeal = nextMealAfter(date, mealId);

  return (
    <AppShell hideNavigation>
      <div className="px-4 pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <Link href="/meals" className="focus-ring grid size-11 place-items-center rounded-full text-white" aria-label="Close completion">
          <span className="text-4xl leading-none">×</span>
        </Link>
        <div className="mt-6 grid grid-cols-[7rem_1fr] items-center gap-4">
          <div className="grid size-28 place-items-center rounded-full border-[12px] border-suii-lime text-suii-lime">
            <Check className="size-14" aria-hidden="true" />
          </div>
          <div>
            <p className="display text-sm tracking-[0.25em] text-white">Project <span className="text-suii-lime">SUIII</span></p>
            <h1 className="display mt-3 text-5xl leading-none text-white">{meal.name} Complete</h1>
            <p className="mt-2 text-lg text-suii-muted">{day.dayName} · {meal.time}</p>
            <p className="mt-1 text-lg text-suii-lime">Fuel logged. Stay consistent.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 px-3 pt-6 sm:px-4">
        <section className="card p-4" aria-label="Completion nutrition">
          <div className="grid grid-cols-[1fr_1fr] gap-4">
            <div>
              <p className="display text-[4rem] leading-none text-suii-gold">{actual.calories}</p>
              <p className="display text-2xl text-suii-gold">Kcal</p>
              <p className="mt-3 rounded-xl border border-suii-lime/60 px-3 py-2 text-sm font-black uppercase text-suii-lime">
                {Math.abs(diff)} kcal {diff <= 0 ? "under" : "over"} plan
              </p>
            </div>
            <div className="grid gap-3">
              <p className="text-sm font-bold uppercase text-suii-muted">Planned <span className="text-suii-gold">{planned.calories}</span></p>
              <p className="display text-3xl text-suii-blue">{actual.protein} g <span className="text-base text-suii-muted">protein</span></p>
              <p className="display text-2xl text-white">Carbs {actual.carbs} g</p>
              <p className="display text-2xl text-white">Fat {actual.fat} g</p>
            </div>
          </div>
        </section>

        <section className="card p-4" aria-labelledby="ingredient-summary-title">
          <h2 id="ingredient-summary-title" className="display text-xl text-white">Ingredient Summary</h2>
          <div className="mt-3 grid gap-2">
            {meal.ingredients.map((ingredient, index) => {
              const ingredientLog = log.ingredientLogs.find((entry) => entry.ingredientPortionId === ingredient.id);
              return (
                <div key={ingredient.id} className="grid grid-cols-[1.5rem_1fr_4rem_4rem] gap-2 border-b border-white/10 py-2 text-sm">
                  <span className="font-black text-suii-lime">{index + 1}</span>
                  <span className="font-black uppercase text-white">{foodCatalogue[ingredientLog?.selectedFoodId ?? ingredient.foodId].name}</span>
                  <span className="text-suii-muted">{ingredientLog?.targetAmount ?? ingredient.targetAmount} g</span>
                  <span className="text-right text-white">{ingredientLog?.skipped ? "Skipped" : `${ingredientLog?.actualAmount ?? 0} g`}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card p-4">
          <h2 className="display text-xl text-suii-lime">Today&apos;s Progress</h2>
          <p className="display mt-2 text-2xl text-white">{summary.mealsCompleted} of {summary.mealsTotal} meals complete</p>
          <div className="mt-4">
            <NutritionBars values={consumed} targets={day.targets} compact />
          </div>
        </section>

        {nextMeal ? (
          <Link href={`/meals/${date}/${nextMeal.id}`} className="focus-ring card flex items-center justify-between p-4">
            <span>
              <span className="display block text-suii-muted">Next · {nextMeal.time}</span>
              <span className="display block text-2xl text-white">{nextMeal.name}</span>
            </span>
            <ChevronRight className="size-7 text-suii-lime" aria-hidden="true" />
          </Link>
        ) : null}

        <Link href="/meals" className="focus-ring flex min-h-16 items-center justify-center rounded-2xl bg-suii-lime px-4 text-xl font-black uppercase text-black">
          Back to Today&apos;s Meals
        </Link>
        <Link href={`/meals/${date}/${mealId}/weigh`} className="focus-ring text-center font-black uppercase text-suii-lime underline">
          Edit Measurements
        </Link>
      </div>
    </AppShell>
  );
}
