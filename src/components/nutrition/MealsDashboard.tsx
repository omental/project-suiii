"use client";

import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { NutritionBars } from "@/components/nutrition/NutritionBars";
import { MealCard } from "@/components/nutrition/MealCard";
import { NutritionHeader } from "@/components/nutrition/NutritionHeader";
import { getPlanDay } from "@/data/nutrition";
import { clampPercent, formatDateLabel, nutritionText } from "@/lib/format";
import { mealPlannedNutrition, roundNutrition } from "@/lib/nutritionCalc";
import { useNutritionRepository } from "@/hooks/useNutritionRepository";

const todayDate = "2026-07-14";

export function MealsDashboard() {
  const { state, repository } = useNutritionRepository();
  const day = getPlanDay(todayDate);
  const summary = repository.getDailyNutritionSummary(todayDate);
  const consumed = roundNutrition(summary.consumed);
  const nextMeal = day.meals.find((meal) => {
    const status = repository.getMealStatus(todayDate, meal.id);
    return status === "up_next" || status === "in_progress";
  }) ?? day.meals[0];
  const nextNutrition = roundNutrition(mealPlannedNutrition(nextMeal));

  return (
    <AppShell>
      <NutritionHeader
        title="Today's Meals"
        subtitle={formatDateLabel(todayDate)}
        action={
          <Link href="/meals/plan" className="focus-ring grid size-12 place-items-center rounded-xl border border-white/10 bg-white/5 text-suii-lime" aria-label="Meal history and plan">
            <CalendarClock className="size-6" aria-hidden="true" />
          </Link>
        }
      />
      <div className="grid gap-3 px-3 pt-6 sm:px-4">
        <section className="card p-4" aria-labelledby="daily-nutrition-title">
          <h2 id="daily-nutrition-title" className="display text-xl text-white">
            Daily Nutrition
          </h2>
          <div className="mt-4 grid gap-4 min-[390px]:grid-cols-[7.5rem_1fr]">
            <div
              className="grid aspect-square place-items-center rounded-full border-[12px] border-suii-lime/90 bg-black/20 text-center"
              role="progressbar"
              aria-label={`Calories: ${consumed.calories} of ${day.targets.calories} kcal`}
              aria-valuemin={0}
              aria-valuemax={day.targets.calories}
              aria-valuenow={consumed.calories}
              style={{
                background: `conic-gradient(#c6ff24 ${clampPercent(consumed.calories, day.targets.calories)}%, rgba(255,255,255,.12) 0)`
              }}
            >
              <p className="display text-3xl text-white">
                {consumed.calories}
                <span className="block text-base text-suii-muted">/ {day.targets.calories} kcal</span>
              </p>
            </div>
            <NutritionBars values={consumed} targets={day.targets} />
          </div>
        </section>

        <section className="card border-suii-lime/70 p-4" aria-labelledby="next-meal-title">
          <p className="display text-lg text-suii-lime">Next · {nextMeal.time}</p>
          <h2 id="next-meal-title" className="display text-3xl text-white">{nextMeal.name}</h2>
          <p className="mt-1 text-sm font-semibold text-suii-muted">{nextMeal.ingredients.map((item) => item.foodId).slice(0, 3).join(" · ")}</p>
          <p className="mt-2 text-sm font-black uppercase text-white">{nutritionText(nextNutrition)}</p>
          <Link href={`/meals/${todayDate}/${nextMeal.id}/weigh`} className="focus-ring mt-4 flex min-h-14 items-center justify-center rounded-2xl bg-suii-lime px-5 font-black uppercase text-black">
            Start Weighing
          </Link>
        </section>

        <section className="grid gap-3" aria-labelledby="meal-timeline-title">
          <h2 id="meal-timeline-title" className="display px-1 text-xl text-white">Meal Timeline</h2>
          {day.meals.map((meal) => (
            <MealCard key={meal.id} date={todayDate} meal={meal} status={repository.getMealStatus(todayDate, meal.id)} state={state} />
          ))}
        </section>

        <Link href="/meals/plan" className="focus-ring card flex min-h-16 items-center justify-center text-lg font-black uppercase text-suii-lime">
          View 7-Day Plan
        </Link>
      </div>
    </AppShell>
  );
}
