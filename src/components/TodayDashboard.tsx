"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { DailyTargets } from "@/components/DailyTargets";
import { NextActionCard } from "@/components/NextActionCard";
import { Timeline } from "@/components/Timeline";
import { TransformationCard } from "@/components/TransformationCard";
import { WorkoutPreviewCard } from "@/components/WorkoutPreviewCard";
import { useAuthenticatedUser } from "@/components/auth/AuthenticatedUserProvider";
import { dashboardData } from "@/data/dashboard";
import { getPlanDay } from "@/data/nutrition";
import { equipmentLabels, getExerciseDefinition, getWorkoutForDate } from "@/data/training";
import { buildProgrammeSnapshot, selectNextDashboardAction } from "@/lib/dashboardSelectors";
import { useDhakaClock } from "@/lib/dhakaClock";
import { roundNutrition } from "@/lib/nutritionCalc";
import { defaultProgressState, readProgressState } from "@/lib/progressRepository";
import { useNutritionRepository } from "@/hooks/useNutritionRepository";
import { useTrainingRepository } from "@/hooks/useTrainingRepository";
import type { ProgressLocalState } from "@/types/progress";

export function TodayDashboard() {
  const authUser = useAuthenticatedUser();
  const {
    state,
    repository,
    addWater,
    undoWater,
    addCigarette,
    undoCigarette
  } = useNutritionRepository();
  const training = useTrainingRepository();
  const clock = useDhakaClock();
  const [progressState, setProgressState] = useState<ProgressLocalState>(defaultProgressState);
  const displayName = authUser.full_name.trim() || authUser.email || "Athlete";
  const shortName = displayName.split(/\s+/)[0] || "Athlete";
  const authenticatedDashboard = {
    ...dashboardData,
    user: {
      ...dashboardData.user,
      name: displayName,
      shortName,
      avatarInitial: shortName.charAt(0).toUpperCase()
    }
  };
  useEffect(() => {
    const timeoutId = window.setTimeout(() => setProgressState(readProgressState()), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);
  if (!clock.hydrated) {
    return (
      <AppShell>
        <AppHeader dashboard={authenticatedDashboard} displayDate="" greeting="" streakDays={0} />
      </AppShell>
    );
  }
  const todayDate = clock.dateKey;
  const day = getPlanDay(todayDate);
  const activeTrainingSession = training.repository.getActiveSession();
  const todayWorkout = activeTrainingSession ? training.repository.getWorkoutDefinition(activeTrainingSession.workoutDefinitionId) : getWorkoutForDate(todayDate);
  const completedWorkout = training.repository.getSessionHistory().find((session) => session.date === todayDate && session.status === "completed");
  const summary = repository.getDailyNutritionSummary(todayDate);
  const consumed = roundNutrition(summary.consumed);
  const waterLitres = Number((state.waterIncrementsMl.reduce((total, amount) => total + amount, 0) / 1000).toFixed(2));
  const cigarettes = Math.max(0, state.cigaretteIncrements.reduce((total, amount) => total + amount, 0));
  const dhakaMinuteOfDay = clock.parts ? clock.parts.hour * 60 + clock.parts.minute : 0;
  const nextAction = selectNextDashboardAction(todayDate, dhakaMinuteOfDay, state, training.state);
  const programme = buildProgrammeSnapshot(todayDate, state, training.state, progressState);
  const dashboard = {
    ...authenticatedDashboard,
    dateISO: todayDate,
    streakDays: programme.activeStreak,
    transformation: {
      ...authenticatedDashboard.transformation,
      week: programme.week,
      day: programme.day,
      progressPercent: programme.progressPercent
    }
  };
  const metrics = dashboardData.metrics.map((metric) => {
    if (metric.id === "calories") return { ...metric, value: consumed.calories };
    if (metric.id === "protein") return { ...metric, value: consumed.protein };
    if (metric.id === "water") return { ...metric, value: waterLitres };
    if (metric.id === "cigarettes") return { ...metric, value: cigarettes };
    return metric;
  });
  const timelineEntries = day.meals.slice(0, 3).map((meal) => {
    const status = repository.getMealStatus(todayDate, meal.id);
    return {
      id: meal.id,
      time: meal.time,
      title: meal.name,
      description: meal.ingredients.map((ingredient) => ingredient.foodId).slice(0, 3).join(" · "),
      status: status === "completed" ? "done" as const : status === "up_next" || status === "in_progress" ? "up-next" as const : "scheduled" as const
    };
  }).concat(todayWorkout ? [{
    id: `workout-${todayWorkout.id}`,
    time: todayWorkout.scheduledTime,
    title: todayWorkout.name,
    description: `${todayWorkout.exercises.length} exercises`,
    status: completedWorkout ? "done" as const : activeTrainingSession ? "up-next" as const : "scheduled" as const
  }] : [{
    id: "workout-rest",
    time: "Friday",
    title: "Recovery Protected",
    description: "No make-up workout required",
    status: "scheduled" as const
  }]);
  const workoutSummary = todayWorkout ? {
    id: todayWorkout.id,
    label: activeTrainingSession ? "Active Workout" : todayWorkout.category === "rest" ? "Recovery" : "Evening Workout",
    title: todayWorkout.name,
    exerciseCount: todayWorkout.exercises.length,
    estimatedMinutes: todayWorkout.estimatedMinutes,
    equipment: todayWorkout.equipment.slice(0, 2).map((item) => ({ id: item, label: equipmentLabels[item].replace(" dumbbell", "").replace("Adjustable resistance bands", "Bands") })),
    exercises: todayWorkout.exercises.map((exercise) => getExerciseDefinition(exercise.exerciseId).name)
  } : null;

  return (
    <AppShell>
      <AppHeader dashboard={dashboard} displayDate={clock.displayDate} greeting={clock.greeting} streakDays={programme.activeStreak} />
      <div className="grid gap-3 px-3 pt-6 sm:px-4">
        <TransformationCard dashboard={dashboard} />
        <NextActionCard
          action={{
            id: nextAction.id,
            time: nextAction.time,
            label: nextAction.label,
            title: nextAction.title,
            ingredient: nextAction.ingredient,
            targetGrams: nextAction.targetGrams
          }}
          actualGrams={null}
          completed={nextAction.type === "complete"}
          onComplete={() => undefined}
          href={nextAction.href}
          ctaLabel={nextAction.type === "workout" ? "Start Workout" : nextAction.type === "complete" ? "Complete" : undefined}
        />
        <DailyTargets
          metrics={metrics}
          waterLitres={waterLitres}
          cigarettes={cigarettes}
          waterUndoDisabled={state.waterIncrementsMl.length === 0}
          cigaretteUndoDisabled={state.cigaretteIncrements.length === 0}
          onAddWater={addWater}
          onUndoWater={undoWater}
          onAddCigarette={addCigarette}
          onUndoCigarette={undoCigarette}
        />
        <Timeline entries={timelineEntries} completedIds={timelineEntries.filter((entry) => entry.status === "done").map((entry) => entry.id)} onToggle={() => undefined} />
        {workoutSummary ? <WorkoutPreviewCard workout={workoutSummary} href={activeTrainingSession ? `/train/session/${activeTrainingSession.id}` : "/train"} ctaLabel={activeTrainingSession ? "Resume Workout" : "Start Workout"} /> : null}
      </div>
    </AppShell>
  );
}
