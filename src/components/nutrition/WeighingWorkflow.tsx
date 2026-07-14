"use client";

import Link from "next/link";
import { ArrowLeft, Calculator, Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { foodCatalogue, getMealDefinition, getPlanDay, weightBasisInstructions } from "@/data/nutrition";
import { differenceLabel, mealPlannedNutrition, roundNutrition, validateActualAmount } from "@/lib/nutritionCalc";
import { useNutritionRepository } from "@/hooks/useNutritionRepository";
import type { IngredientLog } from "@/types/nutrition";

export function WeighingWorkflow({ date, mealId }: { date: string; mealId: string }) {
  const router = useRouter();
  const { repository, startWeighing, saveSession, completeMeal } = useNutritionRepository();
  const meal = getMealDefinition(date, mealId);
  const day = getPlanDay(date);
  const [index, setIndex] = useState(0);
  const [logs, setLogs] = useState<IngredientLog[]>([]);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!meal) return;
    const session = repository.getWeighingSession(date, mealId);
    const log = repository.getMealLog(date, mealId);
    if (!session && log?.status !== "completed") {
      startWeighing(date, mealId);
    }
    const source = session?.ingredientLogs ?? log?.ingredientLogs;
    if (source) {
      // This synchronizes local form state with the persisted session after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLogs(source);
      setIndex(session?.currentIngredientIndex ?? 0);
    }
  }, [date, mealId, meal, repository, startWeighing]);

  const current = meal?.ingredients[index];
  const currentLog = current ? logs.find((entry) => entry.ingredientPortionId === current.id) : null;

  useEffect(() => {
    if (currentLog) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(currentLog.actualAmount ? String(currentLog.actualAmount) : String(currentLog.targetAmount));
      setError("");
    }
  }, [currentLog]);

  const planned = useMemo(() => (meal ? roundNutrition(mealPlannedNutrition(meal)) : { calories: 0, protein: 0, carbs: 0, fat: 0 }), [meal]);

  if (!meal || !current || !currentLog) {
    return (
      <AppShell hideNavigation>
        <div className="p-6 text-white">Preparing weighing session...</div>
      </AppShell>
    );
  }

  const activeMeal = meal;
  const activeLog = currentLog;
  const food = foodCatalogue[currentLog.selectedFoodId];
  const actual = Number(value);
  const progress = ((index + 1) / meal.ingredients.length) * 100;
  const diffText = Number.isFinite(actual) ? differenceLabel(actual, currentLog.targetAmount) : "Enter grams";

  function updateCurrent(nextLog: IngredientLog) {
    const nextLogs = logs.map((log) => (log.ingredientPortionId === nextLog.ingredientPortionId ? nextLog : log));
    setLogs(nextLogs);
    saveSession(date, mealId, nextLogs, index);
    return nextLogs;
  }

  function confirmCurrent() {
    const validation = validateActualAmount(actual, activeLog.targetAmount);
    if (validation) {
      setError(validation);
      return;
    }
    const nextLogs = updateCurrent({
      ...activeLog,
      actualAmount: Math.round(actual * 10) / 10,
      skipped: false,
      completedAt: new Date().toISOString()
    });
    if (index === activeMeal.ingredients.length - 1) {
      completeMeal(date, mealId, nextLogs);
      window.setTimeout(() => router.push(`/meals/${date}/${mealId}/complete`), 0);
      return;
    }
    setIndex(index + 1);
    saveSession(date, mealId, nextLogs, index + 1);
  }

  function skipIngredient() {
    const nextLogs = updateCurrent({ ...activeLog, actualAmount: null, skipped: true, completedAt: new Date().toISOString() });
    if (index === activeMeal.ingredients.length - 1) {
      completeMeal(date, mealId, nextLogs);
      window.setTimeout(() => router.push(`/meals/${date}/${mealId}/complete`), 0);
      return;
    }
    setIndex(index + 1);
    saveSession(date, mealId, nextLogs, index + 1);
  }

  return (
    <AppShell hideNavigation>
      <header className="px-4 pt-[calc(1.25rem+env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <Link href={`/meals/${date}/${mealId}`} className="focus-ring grid size-11 place-items-center rounded-full text-white" aria-label="Back to meal detail">
            <ArrowLeft className="size-7" aria-hidden="true" />
          </Link>
          <p className="display text-lg text-suii-muted">{meal.name}</p>
          <button
            type="button"
            className="focus-ring min-h-11 rounded-xl px-2 text-sm font-black uppercase text-suii-lime"
            onClick={() => {
              saveSession(date, mealId, logs, index);
              router.push(`/meals/${date}/${mealId}`);
            }}
          >
            Save & Exit
          </button>
        </div>
        <h1 className="display mt-8 text-[3.3rem] leading-none text-white">Weigh Your Meal</h1>
        <p className="mt-2 text-lg font-bold text-suii-muted">
          Ingredient {index + 1} of {meal.ingredients.length}
        </p>
        <div className="mt-5 flex items-center gap-3">
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-suii-lime" style={{ width: `${progress}%` }} />
          </div>
          <span className="font-black text-suii-muted">{Math.round(progress)}%</span>
        </div>
        <p className="display mt-5 text-lg text-suii-gold">{planned.calories} kcal · {planned.protein} g protein</p>
      </header>

      <div className="grid gap-3 px-3 pt-6 sm:px-4">
        <section className="card p-4" aria-labelledby="current-ingredient-title">
          <p className="text-sm font-bold text-suii-muted">{day.classification}</p>
          <h2 id="current-ingredient-title" className="display mt-2 text-4xl text-white">{food.name}</h2>
          <p className="mt-2 text-lg text-suii-muted">{current.preparationNote ?? weightBasisInstructions[current.weightBasis]}</p>
          <p className="display mt-5 text-sm text-suii-muted">Target</p>
          <p className="display text-[4.5rem] leading-none text-white">{currentLog.targetAmount}<span className="text-3xl text-suii-muted"> g</span></p>

          <div className="mt-5 rounded-2xl border border-white/15 p-4">
            <label htmlFor="actual-weight" className="display text-lg text-suii-muted">Actual Weight</label>
            <div className="mt-2 grid grid-cols-[1fr_auto] gap-3">
              <input
                id="actual-weight"
                data-autofocus
                inputMode="decimal"
                value={value}
                onChange={(event) => {
                  setValue(event.target.value);
                  setError("");
                }}
                className="focus-ring min-h-20 w-full rounded-xl bg-black/30 px-4 text-5xl font-black text-white"
                aria-describedby="actual-weight-help actual-weight-error"
              />
              <div className="grid gap-2">
                <button type="button" className="focus-ring grid size-14 place-items-center rounded-xl border border-white/15 text-suii-lime" aria-label="Decrease by one gram" onClick={() => setValue(String(Math.max(0, (Number(value) || 0) - 1)))}>
                  <Minus className="size-6" aria-hidden="true" />
                </button>
                <button type="button" className="focus-ring grid size-14 place-items-center rounded-xl border border-white/15 text-suii-lime" aria-label="Increase by one gram" onClick={() => setValue(String((Number(value) || 0) + 1))}>
                  <Plus className="size-6" aria-hidden="true" />
                </button>
              </div>
            </div>
            <p id="actual-weight-help" className="mt-3 text-sm font-bold text-suii-lime">{diffText}</p>
            <p id="actual-weight-error" className="mt-2 min-h-5 text-sm font-bold text-suii-amber" role="alert">{error}</p>
          </div>

          <button type="button" className="focus-ring mt-4 flex w-full min-h-16 items-center justify-center rounded-2xl bg-suii-lime px-4 text-xl font-black uppercase text-black" onClick={confirmCurrent}>
            Confirm {Number.isFinite(actual) ? `${actual} g` : "Weight"}
          </button>
          <button type="button" className="focus-ring mx-auto mt-3 block min-h-11 px-4 text-sm font-black uppercase text-suii-muted underline" onClick={skipIngredient}>
            Skip Ingredient
          </button>
        </section>

        <section className="card p-4" aria-label="Ingredient list">
          <div className="grid gap-2">
            {meal.ingredients.map((ingredient, ingredientIndex) => {
              const log = logs.find((entry) => entry.ingredientPortionId === ingredient.id);
              return (
                <button
                  type="button"
                  key={ingredient.id}
                  className={`focus-ring flex items-center justify-between rounded-xl border p-3 text-left ${
                    ingredientIndex === index ? "border-suii-lime text-white" : "border-white/10 text-suii-muted"
                  }`}
                  onClick={() => {
                    setIndex(ingredientIndex);
                    saveSession(date, mealId, logs, ingredientIndex);
                  }}
                >
                  <span className="font-black">{ingredientIndex + 1}. {foodCatalogue[log?.selectedFoodId ?? ingredient.foodId].shortName}</span>
                  <span>{log?.skipped ? "Skipped" : `${log?.actualAmount ?? log?.targetAmount ?? ingredient.targetAmount} g`}</span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <button type="button" className="focus-ring min-h-12 rounded-xl border border-white/10 font-black uppercase text-white disabled:opacity-40" disabled={index === 0} onClick={() => setIndex(index - 1)}>
            Previous
          </button>
          <button type="button" className="focus-ring min-h-12 rounded-xl border border-white/10 font-black uppercase text-white disabled:opacity-40" disabled={index === meal.ingredients.length - 1} onClick={() => setIndex(index + 1)}>
            Next
          </button>
        </div>

        <section className="card flex items-center gap-4 p-4">
          <Calculator className="size-12 text-suii-lime" aria-hidden="true" />
          <p className="text-sm leading-6 text-suii-muted">
            Scale tip: tare the container before adding each ingredient.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
