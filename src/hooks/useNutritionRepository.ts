"use client";

import { useEffect, useMemo, useState } from "react";
import {
  applySubstitution,
  completeMeal,
  defaultPhase2State,
  makeRepository,
  readNutritionState,
  saveWeighingSession,
  skipMeal,
  startWeighingSession,
  writeNutritionState
} from "@/lib/nutritionRepository";
import type { IngredientLog, Phase2LocalState, SubstitutionOption } from "@/types/nutrition";

export function useNutritionRepository() {
  const [state, setState] = useState<Phase2LocalState>(defaultPhase2State);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Local storage is read only after hydration to avoid server/client markup drift.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(readNutritionState());
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) writeNutritionState(state);
  }, [isHydrated, state]);

  const repository = useMemo(() => makeRepository(state), [state]);

  return {
    state,
    setState,
    isHydrated,
    repository,
    startWeighing(date: string, mealId: string) {
      setState((current) => startWeighingSession(current, date, mealId));
    },
    saveSession(date: string, mealId: string, logs: IngredientLog[], index: number) {
      setState((current) => saveWeighingSession(current, date, mealId, logs, index));
    },
    completeMeal(date: string, mealId: string, logs: IngredientLog[]) {
      setState((current) => completeMeal(current, date, mealId, logs));
    },
    skipMeal(date: string, mealId: string) {
      setState((current) => skipMeal(current, date, mealId));
    },
    applySubstitution(date: string, mealId: string, ingredientId: string, option: SubstitutionOption) {
      setState((current) => applySubstitution(current, date, mealId, ingredientId, option));
    },
    addWater() {
      setState((current) => ({ ...current, waterIncrementsMl: [...current.waterIncrementsMl, 250] }));
    },
    undoWater() {
      setState((current) => ({ ...current, waterIncrementsMl: current.waterIncrementsMl.slice(0, -1) }));
    },
    addCigarette() {
      setState((current) => ({ ...current, cigaretteIncrements: [...current.cigaretteIncrements, 1] }));
    },
    undoCigarette() {
      setState((current) => ({ ...current, cigaretteIncrements: current.cigaretteIncrements.slice(0, -1) }));
    }
  };
}
