export type UserProfile = {
  name: string;
  shortName: string;
  avatarInitial: string;
  heightCm: number;
  startingWeightKg: number;
  targetWeightKg: string;
  startingWaistIn: number;
  targetWaistIn: number;
  dailyCalorieTarget: number;
  dailyProteinTargetG: number;
  dailyWaterTargetL: number;
};

export type TransformationGoal = {
  title: string;
  tagline: string;
  week: number;
  day: number;
  progressPercent: number;
};

export type DailyMetric = {
  id: "calories" | "protein" | "water" | "cigarettes";
  label: string;
  value: number;
  target: number;
  unit: string;
  tone: "lime" | "blue" | "amber";
};

export type TimelineEntry = {
  id: string;
  time: string;
  title: string;
  description: string;
  status: "done" | "up-next" | "scheduled";
};

export type MealAction = {
  id: string;
  time: string;
  label: string;
  title: string;
  ingredient: string;
  targetGrams: number;
};

export type EquipmentItem = {
  id: string;
  label: string;
};

export type WorkoutSummary = {
  id: string;
  label: string;
  title: string;
  exerciseCount: number;
  estimatedMinutes: number;
  equipment: EquipmentItem[];
  exercises: string[];
};

export type DailyDashboard = {
  dateISO: string;
  user: UserProfile;
  transformation: TransformationGoal;
  metrics: DailyMetric[];
  nextAction: MealAction;
  timeline: TimelineEntry[];
  workout: WorkoutSummary;
  streakDays: number;
};

export type DashboardLocalState = {
  version: 1;
  weighing: {
    actionId: string;
    actualGrams: number | null;
    completed: boolean;
  };
  waterIncrementsMl: number[];
  cigaretteIncrements: number[];
  completedTimelineIds: string[];
};
