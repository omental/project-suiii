export type ProgressPose = "front" | "side" | "back";
export type CheckInStatus = "draft" | "completed";
export type WellbeingLevel = "low" | "normal" | "high";
export type DigestionLevel = "good" | "some_gas" | "difficult";

export interface BodyMeasurement {
  id: string;
  clientRecordId: string;
  measuredAt: string;
  localDate: string;
  weightKg: number | null;
  waistIn: number | null;
  chestIn: number | null;
  armIn: number | null;
  thighIn: number | null;
  source: "manual" | "check_in" | "imported";
  note: string;
  version: number;
  deletedAt: string | null;
}

export interface ProgressPhotoLocal {
  id: string;
  checkInId: string;
  pose: ProgressPose;
  previewUrl: string | null;
  uploaded: boolean;
  uploadState: "local_only" | "pending" | "uploaded" | "failed";
  createdAt: string;
}

export interface WeeklyCheckIn {
  id: string;
  clientRecordId: string;
  weekNumber: number;
  checkInDate: string;
  status: CheckInStatus;
  energy: WellbeingLevel | null;
  hunger: WellbeingLevel | null;
  digestion: DigestionLevel | null;
  averageSleepMinutes: number | null;
  privateNote: string;
  measurementId: string | null;
  completedAt: string | null;
  version: number;
  deletedAt: string | null;
}

export interface ProgressLocalState {
  version: 5;
  measurements: Record<string, BodyMeasurement>;
  checkIns: Record<string, WeeklyCheckIn>;
  photos: Record<string, ProgressPhotoLocal>;
  smokingBaseline: number | null;
  smokingDailyLimit: number;
  currentDraftCheckInId: string | null;
}

export interface ProgressSummaryLocal {
  programmeDay: number;
  programmeTotalDays: number;
  currentWeightKg: number | null;
  startingWeightKg: number;
  targetWeightMinKg: number;
  targetWeightMaxKg: number;
  weightChangeKg: number | null;
  currentWaistIn: number | null;
  startingWaistIn: number;
  targetWaistIn: number;
  waistChangeIn: number | null;
  trendStatus: string;
  workoutAdherence: { completed: number; planned: number };
  mealAdherence: { completed: number; planned: number };
  proteinDays: number;
  waterDays: number;
  badmintonDays: number;
  fridayRest: boolean;
  smoking: {
    baseline: number | null;
    dailyLimit: number;
    today: number | null;
    sevenDayAverage: number | null;
    previousSevenDayAverage: number | null;
    percentageChange: number | null;
  };
  checkInDue: boolean;
  recentMilestones: string[];
  insight: string;
  forecast: {
    available: boolean;
    reason: string;
    estimatedWeeks: string | null;
    weeklyRateKg: number | null;
  };
}
