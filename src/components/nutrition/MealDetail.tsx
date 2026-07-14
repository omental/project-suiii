"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw, Scale } from "lucide-react";
import { Dialog } from "@/components/Dialog";
import { AppShell } from "@/components/AppShell";
import { NutritionBars } from "@/components/nutrition/NutritionBars";
import { NutritionHeader } from "@/components/nutrition/NutritionHeader";
import { foodCatalogue, getMealDefinition, getPlanDay, weightBasisInstructions, weightBasisLabels } from "@/data/nutrition";
import { nutritionText } from "@/lib/format";
import { mealPlannedNutrition, nutritionFor, roundNutrition } from "@/lib/nutritionCalc";
import { getDisplayedMealNutrition } from "@/lib/nutritionRepository";
import { useNutritionRepository } from "@/hooks/useNutritionRepository";
import type { IngredientPortion, SubstitutionOption } from "@/types/nutrition";
import { useState } from "react";

export function MealDetail({ date, mealId }: { date: string; mealId: string }) {
  const { state, repository, applySubstitution, skipMeal } = useNutritionRepository();
  const [skipOpen, setSkipOpen] = useState(false);
  const meal = getMealDefinition(date, mealId);
  const day = getPlanDay(date);

  if (!meal) {
    return (
      <AppShell>
        <div className="p-6 text-white">Meal not found.</div>
      </AppShell>
    );
  }

  const nutrition = getDisplayedMealNutrition(date, meal.id, state);
  const planned = roundNutrition(mealPlannedNutrition(meal));
  const log = repository.getMealLog(date, meal.id);

  return (
    <AppShell>
      <NutritionHeader title={meal.name} eyebrow={`${day.dayName} · ${meal.time}`} subtitle={`${day.classification} · Meal ${meal.mealNumber} of ${day.meals.length}`} />
      <div className="grid gap-3 px-3 pt-6 sm:px-4">
        <section className="card p-4" aria-label="Meal macros">
          <div className="grid grid-cols-4 gap-2 text-center">
            <Macro value={nutrition.calories} label="Kcal" tone="text-suii-gold" />
            <Macro value={`${nutrition.protein} g`} label="Protein" tone="text-suii-blue" />
            <Macro value={`${nutrition.carbs} g`} label="Carbs" tone="text-suii-lime" />
            <Macro value={`${nutrition.fat} g`} label="Fat" tone="text-suii-gold" />
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/3 bg-suii-blue" />
          </div>
          <p className="mt-3 text-sm text-suii-muted">Nutrition values are planning estimates. Packaged-food labels and preparation methods may produce different values.</p>
        </section>

        <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-suii-lime/50 px-3 py-2 text-xs font-black uppercase text-suii-lime">
          <Scale className="size-4" aria-hidden="true" />
          Weight basis shown per ingredient
        </div>

        <section className="grid gap-3" aria-labelledby="ingredients-title">
          <h2 id="ingredients-title" className="display px-1 text-xl text-white">Ingredients</h2>
          {meal.ingredients.map((ingredient, index) => (
            <IngredientDetail
              key={ingredient.id}
              ingredient={ingredient}
              index={index}
              date={date}
              mealId={meal.id}
              selectedFoodId={log?.ingredientLogs.find((entry) => entry.ingredientPortionId === ingredient.id)?.selectedFoodId ?? ingredient.foodId}
              selectedTarget={log?.ingredientLogs.find((entry) => entry.ingredientPortionId === ingredient.id)?.targetAmount ?? ingredient.targetAmount}
              onApply={(option) => applySubstitution(date, meal.id, ingredient.id, option)}
            />
          ))}
        </section>

        <Link href={`/meals/${date}/${meal.id}/weigh`} className="focus-ring flex min-h-16 items-center justify-center rounded-2xl bg-suii-lime px-4 text-xl font-black uppercase text-black">
          Start Weighing · {meal.ingredients.length} Items
        </Link>
        <button type="button" onClick={() => setSkipOpen(true)} className="focus-ring min-h-14 rounded-2xl border border-suii-lime/70 px-4 font-black uppercase text-suii-lime">
          Mark Meal as Skipped
        </button>
        <p className="text-center text-sm text-suii-muted">Planned: {nutritionText(planned)}</p>
      </div>
      <Dialog open={skipOpen} title="Skip Meal?" description="This stores an explicit skipped state and does not count nutrition." onClose={() => setSkipOpen(false)}>
        <div className="grid gap-3">
          <button
            type="button"
            className="focus-ring rounded-xl bg-suii-lime px-4 py-3 font-black uppercase text-black"
            onClick={() => {
              skipMeal(date, meal.id);
              setSkipOpen(false);
            }}
          >
            Confirm Skip
          </button>
          <button type="button" className="focus-ring rounded-xl border border-white/10 px-4 py-3 font-black uppercase text-white" onClick={() => setSkipOpen(false)}>
            Cancel
          </button>
        </div>
      </Dialog>
    </AppShell>
  );
}

function Macro({ value, label, tone }: { value: number | string; label: string; tone: string }) {
  return (
    <div>
      <p className={`display text-3xl ${tone}`}>{value}</p>
      <p className="display text-sm text-suii-muted">{label}</p>
    </div>
  );
}

function IngredientDetail({
  ingredient,
  index,
  selectedFoodId,
  selectedTarget,
  onApply
}: {
  ingredient: IngredientPortion;
  index: number;
  date: string;
  mealId: string;
  selectedFoodId: string;
  selectedTarget: number;
  onApply: (option: SubstitutionOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedFood = foodCatalogue[selectedFoodId];
  const selectedNutrition = roundNutrition(nutritionFor(selectedFoodId, selectedTarget));
  const originalNutrition = roundNutrition(nutritionFor(ingredient.foodId, ingredient.targetAmount));

  return (
    <article className="card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="display text-xs text-suii-muted">{index + 1} · {weightBasisLabels[ingredient.weightBasis]}</p>
          <h3 className="display text-2xl text-white">{selectedFood.name}</h3>
          <p className="text-sm text-suii-muted">{selectedNutrition.calories} kcal · {selectedNutrition.protein} g protein</p>
          <p className="mt-1 text-xs text-suii-muted">{weightBasisInstructions[ingredient.weightBasis]}</p>
          {selectedFoodId === "oil" ? (
            <p className="mt-2 flex items-center gap-2 text-sm text-suii-amber">
              <AlertTriangle className="size-4" aria-hidden="true" />
              Weigh separately. Never estimate.
            </p>
          ) : null}
        </div>
        <div className="grid justify-items-end gap-2">
          <p className="display text-2xl text-white">{selectedTarget} g</p>
          {ingredient.options ? (
            <button type="button" className="focus-ring rounded-xl border border-suii-lime/60 px-3 py-2 text-sm font-black uppercase text-suii-lime" onClick={() => setOpen((value) => !value)}>
              Swap
            </button>
          ) : null}
        </div>
      </div>
      {open && ingredient.options ? (
        <div className="mt-4 rounded-2xl border border-white/10 p-3">
          <h4 className="display text-lg text-suii-lime">Controlled Substitutions</h4>
          <div className="mt-3 grid gap-2">
            {ingredient.options.map((option) => {
              const optionFood = foodCatalogue[option.foodId];
              const optionNutrition = roundNutrition(nutritionFor(option.foodId, option.targetAmount));
              const diff = optionNutrition.calories - originalNutrition.calories;
              const active = option.foodId === selectedFoodId && option.targetAmount === selectedTarget;
              return (
                <button
                  type="button"
                  key={option.id}
                  onClick={() => onApply(option)}
                  className={`focus-ring rounded-xl border p-3 text-left ${active ? "border-suii-lime bg-suii-lime/10" : "border-white/10 bg-white/5"}`}
                >
                  <span className="display block text-xl text-white">{optionFood.name} · {option.targetAmount} g</span>
                  <span className="text-sm text-suii-muted">{optionNutrition.calories} kcal · {optionNutrition.protein} g protein · {diff >= 0 ? "+" : ""}{diff} kcal</span>
                </button>
              );
            })}
            <button
              type="button"
              className="focus-ring flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-3 font-black uppercase text-white"
              onClick={() => onApply({ id: "revert", foodId: ingredient.foodId, targetAmount: ingredient.targetAmount, unit: "g" })}
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Revert Original
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
