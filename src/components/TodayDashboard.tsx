"use client";

import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { DailyTargets } from "@/components/DailyTargets";
import { NextActionCard } from "@/components/NextActionCard";
import { Timeline } from "@/components/Timeline";
import { TransformationCard } from "@/components/TransformationCard";
import { WorkoutPreviewCard } from "@/components/WorkoutPreviewCard";
import { dashboardData } from "@/data/dashboard";
import { getPlanDay } from "@/data/nutrition";
import { equipmentLabels, getExerciseDefinition, getWorkoutForDate } from "@/data/training";
import { roundNutrition } from "@/lib/nutritionCalc";
import { useNutritionRepository } from "@/hooks/useNutritionRepository";
import { useTrainingRepository } from "@/hooks/useTrainingRepository";

export function TodayDashboard() {
  const {
    state,
    repository,
    addWater,
    undoWater,
    addCigarette,
    undoCigarette
  } = useNutritionRepository();
  const training = useTrainingRepository();
  const todayDate = dashboardData.dateISO;
  const day = getPlanDay(todayDate);
  const activeTrainingSession = training.repository.getActiveSession();
  const todayWorkout = activeTrainingSession ? training.repository.getWorkoutDefinition(activeTrainingSession.workoutDefinitionId) : getWorkoutForDate(todayDate);
  const completedWorkout = training.repository.getSessionHistory().find((session) => session.date === todayDate && session.status === "completed");
  const summary = repository.getDailyNutritionSummary(todayDate);
  const consumed = roundNutrition(summary.consumed);
  const waterBase = dashboardData.metrics.find((metric) => metric.id === "water")?.value ?? 0;
  const cigaretteBase = dashboardData.metrics.find((metric) => metric.id === "cigarettes")?.value ?? 0;
  const waterLitres = Number((waterBase + state.waterIncrementsMl.reduce((total, amount) => total + amount, 0) / 1000).toFixed(2));
  const cigarettes = Math.max(0, cigaretteBase + state.cigaretteIncrements.reduce((total, amount) => total + amount, 0));
  const nextMeal = day.meals.find((meal) => {
    const status = repository.getMealStatus(todayDate, meal.id);
    return status === "up_next" || status === "in_progress";
  }) ?? day.meals[0];
  const metrics = dashboardData.metrics.map((metric) => {
    if (metric.id === "calories") return { ...metric, value: consumed.calories };
    if (metric.id === "protein") return { ...metric, value: consumed.protein };
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
      <AppHeader dashboard={dashboardData} />
      <div className="grid gap-3 px-3 pt-6 sm:px-4">
        <TransformationCard dashboard={dashboardData} />
        <NextActionCard
          action={{
            id: nextMeal.id,
            time: nextMeal.time,
            label: "Next",
            title: nextMeal.name,
            ingredient: nextMeal.ingredients[0]?.foodId ?? "Meal",
            targetGrams: nextMeal.ingredients[0]?.targetAmount ?? 0
          }}
          actualGrams={null}
          completed={repository.getMealStatus(todayDate, nextMeal.id) === "completed"}
          onComplete={() => undefined}
          href={`/meals/${todayDate}/${nextMeal.id}/weigh`}
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
