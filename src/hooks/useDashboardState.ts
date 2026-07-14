"use client";

import { useEffect, useMemo, useState } from "react";
import { dashboardData, defaultLocalState } from "@/data/dashboard";
import { readLocalState, writeLocalState } from "@/lib/localState";
import type { DashboardLocalState } from "@/types/dashboard";

export function useDashboardState() {
  const [state, setState] = useState<DashboardLocalState>(defaultLocalState);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Local storage is read after hydration to keep server and client markup aligned.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(readLocalState());
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      writeLocalState(state);
    }
  }, [isHydrated, state]);

  const waterLitres = useMemo(() => {
    const added = state.waterIncrementsMl.reduce((total, amount) => total + amount, 0) / 1000;
    return Number(added.toFixed(2));
  }, [state.waterIncrementsMl]);

  const cigarettes = useMemo(() => {
    const added = state.cigaretteIncrements.reduce((total, amount) => total + amount, 0);
    return Math.max(0, added);
  }, [state.cigaretteIncrements]);

  return {
    state,
    isHydrated,
    waterLitres,
    cigarettes,
    completeWeighing(actualGrams: number) {
      setState((current) => ({
        ...current,
        weighing: {
          actionId: dashboardData.nextAction.id,
          actualGrams,
          completed: true
        }
      }));
    },
    addWater() {
      setState((current) => ({
        ...current,
        waterIncrementsMl: [...current.waterIncrementsMl, 250]
      }));
    },
    undoWater() {
      setState((current) => ({
        ...current,
        waterIncrementsMl: current.waterIncrementsMl.slice(0, -1)
      }));
    },
    addCigarette() {
      setState((current) => ({
        ...current,
        cigaretteIncrements: [...current.cigaretteIncrements, 1]
      }));
    },
    undoCigarette() {
      setState((current) => ({
        ...current,
        cigaretteIncrements: current.cigaretteIncrements.slice(0, -1)
      }));
    },
    toggleTimeline(id: string) {
      setState((current) => {
        const exists = current.completedTimelineIds.includes(id);
        return {
          ...current,
          completedTimelineIds: exists
            ? current.completedTimelineIds.filter((entryId) => entryId !== id)
            : [...current.completedTimelineIds, id]
        };
      });
    }
  };
}
