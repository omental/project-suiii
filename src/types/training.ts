export type EquipmentType =
  | "bodyweight"
  | "dumbbell_5_single"
  | "dumbbell_5_pair"
  | "dumbbell_7_5_single"
  | "dumbbell_7_5_pair"
  | "band"
  | "mini_loop"
  | "mat"
  | "foam_roller"
  | "chair";

export type ResistanceSelection =
  | { kind: "bodyweight"; label: "Bodyweight" }
  | { kind: "dumbbell"; equipment: Extract<EquipmentType, "dumbbell_5_single" | "dumbbell_5_pair" | "dumbbell_7_5_single" | "dumbbell_7_5_pair">; kgPerUnit: number; units: 1 | 2; label: string }
  | { kind: "band"; load: "light" | "medium" | "heavy" | "extra_heavy" | "custom_combination"; label?: string }
  | { kind: "none"; label: string };

export type WorkoutStatus = "scheduled" | "active" | "paused" | "partial" | "completed" | "skipped" | "rest";
export type WorkoutCategory = "strength" | "mobility" | "recovery" | "rest";
export type SorenessLevel = "none" | "mild" | "high";
export type EnergyLevel = "low" | "normal" | "high";
export type RirChoice = 0 | 1 | 2 | 3 | 4;

export interface ExerciseDefinition {
  id: string;
  name: string;
  muscles: string[];
  difficulty: "foundation" | "moderate" | "restorative";
  equipment: EquipmentType[];
  unilateral?: boolean;
  hold?: boolean;
  mobility?: boolean;
  defaultResistance: ResistanceSelection;
}

export interface ExercisePrescription {
  id: string;
  exerciseId: string;
  week1Sets: number;
  standardSets: number;
  targetReps?: string;
  targetSeconds?: string;
  restSeconds: number;
  tempo?: string;
  note?: string;
  accessory?: boolean;
  restAfterBothSides?: boolean;
}

export interface WorkoutDefinition {
  id: string;
  name: string;
  dayName: string;
  scheduledTime: string;
  category: WorkoutCategory;
  estimatedMinutes: number;
  exercises: ExercisePrescription[];
  equipment: EquipmentType[];
  summary: string;
}

export interface WorkoutScheduleEntry {
  id: string;
  dayName: string;
  workoutId: string | null;
  label: string;
  category: WorkoutCategory;
}

export interface SideLog {
  side: "left" | "right";
  reps: number;
}

export interface SetLog {
  id: string;
  exercisePrescriptionId: string;
  setNumber: number;
  status: "completed" | "skipped";
  reps: number | null;
  seconds: number | null;
  sideLogs?: SideLog[];
  resistance: ResistanceSelection;
  rir: RirChoice | null;
  completedAt: string | null;
  note?: string;
}

export interface ExerciseSession {
  exercisePrescriptionId: string;
  uncomfortable: boolean;
  setLogs: SetLog[];
}

export interface RestTimerState {
  exercisePrescriptionId: string;
  setNumber: number;
  originalSeconds: number;
  restEndsAt: string;
  pausedRemainingSeconds: number | null;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export interface ReadinessCheckIn {
  id: string;
  date: string;
  badmintonGames: number;
  energy: EnergyLevel;
  soreness: number;
  soreAreas: string[];
  sleepHours: number | null;
  note: string;
  warningFlags: string[];
  createdAt: string;
}

export interface SessionAdjustment {
  id: string;
  kind: "planned" | "reduced_accessories" | "recovery";
  originalPlan: string;
  suggestion: string;
  reason: string;
  confirmed: boolean;
}

export interface SessionFeedback {
  effort: number;
  soreness: SorenessLevel;
  note: string;
  updatedAt: string;
}

export interface WorkoutSession {
  id: string;
  date: string;
  workoutDefinitionId: string;
  status: WorkoutStatus;
  currentExerciseIndex: number;
  currentSetNumber: number;
  startedAt: string;
  pausedAt: string | null;
  totalPausedDurationMs: number;
  completedAt: string | null;
  updatedAt: string;
  readiness: ReadinessCheckIn | null;
  adjustment: SessionAdjustment | null;
  exerciseSessions: ExerciseSession[];
  restTimer: RestTimerState | null;
  feedback: SessionFeedback | null;
}

export interface ExerciseFormGuide {
  exerciseId: string;
  setup: string[];
  movement: string[];
  breathing: string;
  tempo: string;
  quickCues: string[];
  commonMistakes: string[];
  stopConditions: string[];
}

export interface ProgressionRecommendation {
  exerciseId: string;
  title: string;
  action: "repeat" | "add_reps" | "slow_tempo" | "add_band" | "reduce_volume" | "review";
  reason: string;
}

export interface TrainingHistorySummary {
  range: "4w" | "12w" | "all";
  workoutCount: number;
  plannedCount: number;
  completionPercent: number;
  streakWeeks: number;
  fridayRecoveryProtected: boolean;
  totalReps: number;
  externalLoadVolumeKg: number;
}

export interface Phase3TrainingState {
  version: 3;
  sessions: Record<string, WorkoutSession>;
  activeSessionId: string | null;
  readinessByDate: Record<string, ReadinessCheckIn>;
  uncomfortableExerciseIds: string[];
}
