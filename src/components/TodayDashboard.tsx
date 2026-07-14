"use client";

import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { DailyTargets } from "@/components/DailyTargets";
import { NextActionCard } from "@/components/NextActionCard";
import { Timeline } from "@/components/Timeline";
import { TransformationCard } from "@/components/TransformationCard";
import { WorkoutPreviewCard } from "@/components/WorkoutPreviewCard";
import { dashboardData } from "@/data/dashboard";
import { useDashboardState } from "@/hooks/useDashboardState";

export function TodayDashboard() {
  const {
    state,
    waterLitres,
    cigarettes,
    completeWeighing,
    addWater,
    undoWater,
    addCigarette,
    undoCigarette,
    toggleTimeline
  } = useDashboardState();

  return (
    <AppShell>
      <AppHeader dashboard={dashboardData} />
      <div className="grid gap-3 px-3 pt-6 sm:px-4">
        <TransformationCard dashboard={dashboardData} />
        <NextActionCard
          action={dashboardData.nextAction}
          actualGrams={state.weighing.actualGrams}
          completed={state.weighing.completed}
          onComplete={completeWeighing}
        />
        <DailyTargets
          metrics={dashboardData.metrics}
          waterLitres={waterLitres}
          cigarettes={cigarettes}
          waterUndoDisabled={state.waterIncrementsMl.length === 0}
          cigaretteUndoDisabled={state.cigaretteIncrements.length === 0}
          onAddWater={addWater}
          onUndoWater={undoWater}
          onAddCigarette={addCigarette}
          onUndoCigarette={undoCigarette}
        />
        <Timeline entries={dashboardData.timeline} completedIds={state.completedTimelineIds} onToggle={toggleTimeline} />
        <WorkoutPreviewCard workout={dashboardData.workout} />
      </div>
    </AppShell>
  );
}
