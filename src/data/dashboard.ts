import type { DailyDashboard, DashboardLocalState } from "@/types/dashboard";

export const dashboardData: DailyDashboard = {
  dateISO: "2026-07-14",
  streakDays: 7,
  user: {
    name: "J.M. Mubasshir Rahman",
    shortName: "Mubasshir",
    avatarInitial: "M",
    heightCm: 180,
    startingWeightKg: 79,
    targetWeightKg: "73-74",
    startingWaistIn: 38.5,
    targetWaistIn: 35,
    dailyCalorieTarget: 2200,
    dailyProteinTargetG: 145,
    dailyWaterTargetL: 3
  },
  transformation: {
    title: "Project SUIII",
    tagline: "Build Your Ultimate Form",
    week: 1,
    day: 1,
    progressPercent: 8
  },
  metrics: [
    { id: "calories", label: "Calories", value: 1420, target: 2200, unit: "kcal", tone: "lime" },
    { id: "protein", label: "Protein", value: 92, target: 145, unit: "g", tone: "lime" },
    { id: "water", label: "Water", value: 1.8, target: 3, unit: "L", tone: "blue" },
    { id: "cigarettes", label: "Cigarettes", value: 6, target: 12, unit: "", tone: "amber" }
  ],
  nextAction: {
    id: "pre-badminton-fuel",
    time: "8:15 AM",
    label: "Next",
    title: "Pre-Badminton Fuel",
    ingredient: "Banana",
    targetGrams: 120
  },
  timeline: [
    {
      id: "hydration-0645",
      time: "6:45 AM",
      title: "Hydration",
      description: "500 ml water",
      status: "done"
    },
    {
      id: "badminton-0900",
      time: "9:00 AM-10:30 AM",
      title: "Badminton",
      description: "Court Session",
      status: "up-next"
    },
    {
      id: "breakfast-1045",
      time: "10:45 AM",
      title: "Breakfast",
      description: "Post-badminton meal",
      status: "scheduled"
    }
  ],
  workout: {
    id: "full-body-a",
    label: "Evening Workout",
    title: "Full Body A",
    exerciseCount: 6,
    estimatedMinutes: 34,
    equipment: [
      { id: "5kg", label: "5 kg" },
      { id: "7-5kg", label: "7.5 kg" }
    ],
    exercises: [
      "Dumbbell goblet squat",
      "Dumbbell floor press",
      "One-arm dumbbell row",
      "Dumbbell Romanian deadlift",
      "Standing shoulder press",
      "Dead bug"
    ]
  }
};

export const defaultLocalState: DashboardLocalState = {
  version: 1,
  weighing: {
    actionId: "pre-badminton-fuel",
    actualGrams: null,
    completed: false
  },
  waterIncrementsMl: [],
  cigaretteIncrements: [],
  completedTimelineIds: ["hydration-0645"]
};
