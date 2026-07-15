import type {
  EquipmentType,
  ExerciseDefinition,
  ExerciseFormGuide,
  WorkoutDefinition,
  WorkoutScheduleEntry
} from "@/types/training";

export const equipmentLabels: Record<EquipmentType, string> = {
  bodyweight: "Bodyweight",
  dumbbell_5_single: "One 5 kg dumbbell",
  dumbbell_5_pair: "5 kg dumbbell pair",
  dumbbell_7_5_single: "One 7.5 kg dumbbell",
  dumbbell_7_5_pair: "7.5 kg dumbbell pair",
  band: "Adjustable resistance bands",
  mini_loop: "Cloth mini-loop bands",
  mat: "Exercise mat",
  foam_roller: "Foam roller",
  chair: "Chair"
};

export const exerciseDefinitions: ExerciseDefinition[] = [
  { id: "goblet-squat", name: "Goblet Squat", muscles: ["Legs", "Glutes", "Core"], difficulty: "foundation", equipment: ["dumbbell_7_5_single"], defaultResistance: { kind: "dumbbell", equipment: "dumbbell_7_5_single", kgPerUnit: 7.5, units: 1, label: "7.5 kg" } },
  { id: "floor-press", name: "Dumbbell Floor Press", muscles: ["Chest", "Triceps"], difficulty: "foundation", equipment: ["dumbbell_7_5_pair"], defaultResistance: { kind: "dumbbell", equipment: "dumbbell_7_5_pair", kgPerUnit: 7.5, units: 2, label: "7.5 kg pair" } },
  { id: "one-arm-row", name: "One-Arm Dumbbell Row", muscles: ["Back", "Biceps"], difficulty: "foundation", equipment: ["dumbbell_7_5_single", "chair"], unilateral: true, defaultResistance: { kind: "dumbbell", equipment: "dumbbell_7_5_single", kgPerUnit: 7.5, units: 1, label: "7.5 kg" } },
  { id: "romanian-deadlift", name: "Dumbbell Romanian Deadlift", muscles: ["Hamstrings", "Glutes"], difficulty: "foundation", equipment: ["dumbbell_7_5_pair"], defaultResistance: { kind: "dumbbell", equipment: "dumbbell_7_5_pair", kgPerUnit: 7.5, units: 2, label: "7.5 kg pair" } },
  { id: "shoulder-press", name: "Standing Shoulder Press", muscles: ["Shoulders", "Triceps"], difficulty: "foundation", equipment: ["dumbbell_5_pair"], defaultResistance: { kind: "dumbbell", equipment: "dumbbell_5_pair", kgPerUnit: 5, units: 2, label: "5 kg pair" } },
  { id: "plank", name: "Plank", muscles: ["Core"], difficulty: "foundation", equipment: ["mat"], hold: true, defaultResistance: { kind: "bodyweight", label: "Bodyweight" } },
  { id: "reverse-lunge", name: "Reverse Lunge", muscles: ["Legs", "Glutes"], difficulty: "foundation", equipment: ["dumbbell_5_pair"], unilateral: true, defaultResistance: { kind: "dumbbell", equipment: "dumbbell_5_pair", kgPerUnit: 5, units: 2, label: "5 kg pair" } },
  { id: "bent-over-row", name: "Dumbbell Bent-Over Row", muscles: ["Back", "Biceps"], difficulty: "foundation", equipment: ["dumbbell_7_5_pair"], defaultResistance: { kind: "dumbbell", equipment: "dumbbell_7_5_pair", kgPerUnit: 7.5, units: 2, label: "7.5 kg pair" } },
  { id: "push-up", name: "Push-Up", muscles: ["Chest", "Core"], difficulty: "foundation", equipment: ["bodyweight", "mat"], defaultResistance: { kind: "bodyweight", label: "Bodyweight" } },
  { id: "hip-bridge", name: "Dumbbell Hip Bridge", muscles: ["Glutes", "Hamstrings"], difficulty: "foundation", equipment: ["dumbbell_7_5_single", "mat"], defaultResistance: { kind: "dumbbell", equipment: "dumbbell_7_5_single", kgPerUnit: 7.5, units: 1, label: "7.5 kg" } },
  { id: "lateral-raise", name: "Lateral Raise", muscles: ["Shoulders"], difficulty: "foundation", equipment: ["dumbbell_5_pair", "band"], defaultResistance: { kind: "dumbbell", equipment: "dumbbell_5_pair", kgPerUnit: 5, units: 2, label: "5 kg pair" } },
  { id: "biceps-curl", name: "Dumbbell Biceps Curl", muscles: ["Biceps"], difficulty: "foundation", equipment: ["dumbbell_5_pair"], defaultResistance: { kind: "dumbbell", equipment: "dumbbell_5_pair", kgPerUnit: 5, units: 2, label: "5 kg pair" } },
  { id: "dead-bug", name: "Dead Bug", muscles: ["Core"], difficulty: "foundation", equipment: ["mat"], unilateral: true, defaultResistance: { kind: "bodyweight", label: "Bodyweight" } },
  { id: "band-pull-apart", name: "Band Pull-Apart", muscles: ["Upper back", "Rear shoulders"], difficulty: "restorative", equipment: ["band"], defaultResistance: { kind: "band", load: "light", label: "Light band" } },
  { id: "band-external-rotation", name: "Band External Rotation", muscles: ["Rotator cuff"], difficulty: "restorative", equipment: ["band"], unilateral: true, defaultResistance: { kind: "band", load: "light", label: "Light band" } },
  { id: "wall-slide", name: "Wall Slide", muscles: ["Shoulders", "Upper back"], difficulty: "restorative", equipment: ["bodyweight"], defaultResistance: { kind: "bodyweight", label: "Bodyweight" } },
  { id: "bird-dog", name: "Bird Dog", muscles: ["Core", "Glutes"], difficulty: "restorative", equipment: ["mat"], unilateral: true, defaultResistance: { kind: "bodyweight", label: "Bodyweight" } },
  { id: "sumo-squat", name: "Dumbbell Sumo Squat", muscles: ["Legs", "Glutes"], difficulty: "foundation", equipment: ["dumbbell_7_5_single"], defaultResistance: { kind: "dumbbell", equipment: "dumbbell_7_5_single", kgPerUnit: 7.5, units: 1, label: "7.5 kg" } },
  { id: "arnold-press", name: "Arnold Press", muscles: ["Shoulders"], difficulty: "moderate", equipment: ["dumbbell_5_pair"], defaultResistance: { kind: "dumbbell", equipment: "dumbbell_5_pair", kgPerUnit: 5, units: 2, label: "5 kg pair" } },
  { id: "triceps-extension", name: "Overhead Triceps Extension", muscles: ["Triceps"], difficulty: "foundation", equipment: ["dumbbell_7_5_single"], defaultResistance: { kind: "dumbbell", equipment: "dumbbell_7_5_single", kgPerUnit: 7.5, units: 1, label: "7.5 kg" } },
  { id: "side-plank", name: "Side Plank", muscles: ["Core"], difficulty: "foundation", equipment: ["mat"], unilateral: true, hold: true, defaultResistance: { kind: "bodyweight", label: "Bodyweight" } },
  { id: "hip-flexor-stretch", name: "Hip-Flexor Stretch", muscles: ["Hips"], difficulty: "restorative", equipment: ["mat"], unilateral: true, mobility: true, defaultResistance: { kind: "none", label: "Mobility" } },
  { id: "calf-stretch", name: "Calf Stretch", muscles: ["Calves"], difficulty: "restorative", equipment: ["bodyweight"], unilateral: true, mobility: true, defaultResistance: { kind: "none", label: "Mobility" } },
  { id: "hamstring-stretch", name: "Hamstring Stretch", muscles: ["Hamstrings"], difficulty: "restorative", equipment: ["mat"], unilateral: true, mobility: true, defaultResistance: { kind: "none", label: "Mobility" } },
  { id: "thoracic-rotation", name: "Thoracic Rotation", muscles: ["Upper back"], difficulty: "restorative", equipment: ["mat"], unilateral: true, mobility: true, defaultResistance: { kind: "none", label: "Mobility" } },
  { id: "foam-rolling", name: "Foam Rolling", muscles: ["Recovery"], difficulty: "restorative", equipment: ["foam_roller"], hold: true, mobility: true, defaultResistance: { kind: "none", label: "Recovery" } },
  { id: "quad-stretch", name: "Quadriceps Stretch", muscles: ["Quads"], difficulty: "restorative", equipment: ["bodyweight"], mobility: true, defaultResistance: { kind: "none", label: "Mobility" } },
  { id: "chest-shoulder-stretch", name: "Chest and Shoulder Stretch", muscles: ["Chest", "Shoulders"], difficulty: "restorative", equipment: ["bodyweight"], mobility: true, defaultResistance: { kind: "none", label: "Mobility" } },
  { id: "slow-breathing", name: "Slow Breathing", muscles: ["Recovery"], difficulty: "restorative", equipment: ["mat"], hold: true, mobility: true, defaultResistance: { kind: "none", label: "Recovery" } }
];

const p = (id: string, exerciseId: string, week1Sets: number, standardSets: number, targetReps: string | undefined, restSeconds: number, tempo?: string, note?: string, accessory = false, targetSeconds?: string) => ({
  id,
  exerciseId,
  week1Sets,
  standardSets,
  targetReps,
  targetSeconds,
  restSeconds,
  tempo,
  note,
  accessory,
  restAfterBothSides: exerciseDefinitions.find((exercise) => exercise.id === exerciseId)?.unilateral ?? false
});

export const workoutDefinitions: WorkoutDefinition[] = [
  {
    id: "full-body-a",
    name: "Full Body A",
    dayName: "Saturday",
    scheduledTime: "6:30 PM",
    category: "strength",
    estimatedMinutes: 34,
    summary: "Squat, press, row, hinge, shoulders and core.",
    equipment: ["dumbbell_7_5_single", "dumbbell_7_5_pair", "dumbbell_5_pair", "mat"],
    exercises: [
      p("fba-goblet-squat", "goblet-squat", 2, 3, "12-15", 75, "3-1-1"),
      p("fba-floor-press", "floor-press", 2, 3, "8-12", 90, "2-1-1"),
      p("fba-one-arm-row", "one-arm-row", 2, 3, "12 each side", 60, "2-1-2"),
      p("fba-rdl", "romanian-deadlift", 2, 3, "12-15", 90, "3-1-1"),
      p("fba-shoulder-press", "shoulder-press", 2, 3, "8-12", 75, "2-0-2", undefined, true),
      p("fba-plank", "plank", 2, 3, undefined, 45, undefined, undefined, true, "30-45")
    ]
  },
  {
    id: "mobility",
    name: "Mobility",
    dayName: "Sunday",
    scheduledTime: "10:00 AM",
    category: "mobility",
    estimatedMinutes: 22,
    summary: "Gentle mobility and tissue work.",
    equipment: ["mat", "foam_roller"],
    exercises: [
      p("mob-hip-flexor", "hip-flexor-stretch", 2, 2, undefined, 20, undefined, undefined, false, "30 each side"),
      p("mob-calf", "calf-stretch", 2, 2, undefined, 20, undefined, undefined, false, "30 each side"),
      p("mob-hamstring", "hamstring-stretch", 2, 2, undefined, 20, undefined, undefined, false, "30 each side"),
      p("mob-thoracic", "thoracic-rotation", 2, 2, "8 each side", 20),
      p("mob-foam", "foam-rolling", 1, 1, undefined, 20, undefined, undefined, false, "5-8 minutes")
    ]
  },
  {
    id: "full-body-b",
    name: "Full Body B",
    dayName: "Monday",
    scheduledTime: "6:30 PM",
    category: "strength",
    estimatedMinutes: 36,
    summary: "Single-leg work, push, pull, glutes, arms and core.",
    equipment: ["dumbbell_5_pair", "dumbbell_7_5_pair", "dumbbell_7_5_single", "mat", "band"],
    exercises: [
      p("fbb-reverse-lunge", "reverse-lunge", 2, 3, "8-10 each leg", 90),
      p("fbb-bent-row", "bent-over-row", 2, 3, "10-12", 75),
      p("fbb-push-up", "push-up", 2, 3, "Stop with 2 good reps remaining", 90),
      p("fbb-hip-bridge", "hip-bridge", 2, 3, "15", 60),
      p("fbb-lateral-raise", "lateral-raise", 2, 3, "10-15", 60, undefined, undefined, true),
      p("fbb-curl", "biceps-curl", 2, 3, "10-15", 60, undefined, undefined, true),
      p("fbb-dead-bug", "dead-bug", 2, 3, "10 each side", 45, undefined, undefined, true)
    ]
  },
  {
    id: "shoulder-care",
    name: "Shoulder Care",
    dayName: "Tuesday",
    scheduledTime: "7:00 PM",
    category: "recovery",
    estimatedMinutes: 20,
    summary: "Restorative shoulder control and light core.",
    equipment: ["band", "mat"],
    exercises: [
      p("sc-pull-apart", "band-pull-apart", 3, 3, "15", 45),
      p("sc-external-rotation", "band-external-rotation", 3, 3, "12 each arm", 45),
      p("sc-wall-slide", "wall-slide", 2, 2, "12", 30),
      p("sc-bird-dog", "bird-dog", 3, 3, "10 each side", 45),
      p("sc-stretch", "chest-shoulder-stretch", 1, 1, undefined, 20, undefined, "Restorative, not exhausting.", false, "5 minutes")
    ]
  },
  {
    id: "full-body-c",
    name: "Full Body C",
    dayName: "Wednesday",
    scheduledTime: "6:30 PM",
    category: "strength",
    estimatedMinutes: 37,
    summary: "Sumo squat, hinge, press, row, shoulders, arms and core.",
    equipment: ["dumbbell_7_5_single", "dumbbell_7_5_pair", "dumbbell_5_pair", "mat"],
    exercises: [
      p("fbc-sumo", "sumo-squat", 2, 3, "15", 75),
      p("fbc-rdl", "romanian-deadlift", 2, 3, "12", 90),
      p("fbc-floor-press", "floor-press", 2, 3, "10-12", 90),
      p("fbc-row", "one-arm-row", 2, 3, "12 each arm", 60),
      p("fbc-arnold", "arnold-press", 2, 3, "8-12", 75),
      p("fbc-triceps", "triceps-extension", 2, 3, "12", 60, undefined, undefined, true),
      p("fbc-side-plank", "side-plank", 2, 3, undefined, 45, undefined, undefined, true, "20-30 each side")
    ]
  },
  {
    id: "active-recovery",
    name: "Active Recovery",
    dayName: "Thursday",
    scheduledTime: "7:00 PM",
    category: "recovery",
    estimatedMinutes: 18,
    summary: "Foam rolling, stretching and slow breathing.",
    equipment: ["foam_roller", "mat"],
    exercises: [
      p("ar-foam", "foam-rolling", 1, 1, undefined, 20, undefined, undefined, false, "8 minutes"),
      p("ar-calf", "calf-stretch", 2, 2, undefined, 20, undefined, undefined, false, "30 seconds"),
      p("ar-quad", "quad-stretch", 2, 2, undefined, 20, undefined, undefined, false, "30 seconds"),
      p("ar-chest", "chest-shoulder-stretch", 2, 2, undefined, 20, undefined, undefined, false, "30 seconds"),
      p("ar-breathing", "slow-breathing", 1, 1, undefined, 20, undefined, undefined, false, "3 minutes")
    ]
  }
];

export const weeklyTrainingSchedule: WorkoutScheduleEntry[] = [
  { id: "sat", dayName: "Saturday", workoutId: "full-body-a", label: "Full Body A", category: "strength" },
  { id: "sun", dayName: "Sunday", workoutId: "mobility", label: "Mobility", category: "mobility" },
  { id: "mon", dayName: "Monday", workoutId: "full-body-b", label: "Full Body B", category: "strength" },
  { id: "tue", dayName: "Tuesday", workoutId: "shoulder-care", label: "Shoulder Care", category: "recovery" },
  { id: "wed", dayName: "Wednesday", workoutId: "full-body-c", label: "Full Body C", category: "strength" },
  { id: "thu", dayName: "Thursday", workoutId: "active-recovery", label: "Recovery", category: "recovery" },
  { id: "fri", dayName: "Friday", workoutId: null, label: "Complete Rest", category: "rest" }
];

const genericGuide = (exerciseId: string, tempo = "Controlled"): ExerciseFormGuide => ({
  exerciseId,
  setup: ["Set your stance before loading.", "Brace gently and keep the first repetition easy.", "Use only available Project SUIII equipment."],
  movement: ["Move through a controlled range.", "Stop each rep before form breaks.", "Finish tall and reset before the next rep."],
  breathing: "Breathe in before the hardest phase, breathe out as you complete the rep.",
  tempo,
  quickCues: ["Controlled", "Stable", "Leave 1-2 reps in reserve"],
  commonMistakes: ["Rushing the descent", "Holding breath too long", "Chasing fatigue over form"],
  stopConditions: ["Sharp pain", "Dizziness", "Chest pain or unusual breathlessness", "Loss of control"]
});

export const formGuides: ExerciseFormGuide[] = exerciseDefinitions.map((exercise) => genericGuide(exercise.id));

Object.assign(formGuides.find((guide) => guide.exerciseId === "goblet-squat")!, {
  setup: ["Hold one dumbbell vertically at your chest.", "Stand with feet around shoulder-width apart.", "Brace your core before moving."],
  movement: ["Push hips slightly back and bend your knees.", "Lower under control while keeping your chest tall.", "Drive through your full foot to stand."],
  breathing: "Breathe in as you descend. Breathe out as you drive up.",
  tempo: "3-1-1",
  quickCues: ["Chest tall", "Knees track over toes", "Full foot pressure"],
  commonMistakes: ["Knees collapsing inward", "Heels lifting", "Rounding the lower back", "Dropping too quickly"],
  stopConditions: ["Sharp knee, hip or back pain", "Dizziness", "Loss of control"]
});

export function getExerciseDefinition(id: string) {
  return exerciseDefinitions.find((exercise) => exercise.id === id) ?? exerciseDefinitions[0];
}

export function getWorkoutDefinition(id: string) {
  return workoutDefinitions.find((workout) => workout.id === id) ?? workoutDefinitions[0];
}

export function getWorkoutForDate(dateISO: string, preferredRestDay?: string | null) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return null;
  const date = new Date(`${dateISO}T12:00:00`);
  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
  if (preferredRestDay && dayName === preferredRestDay) return null;
  const schedule = weeklyTrainingSchedule.find((entry) => entry.dayName === dayName) ?? weeklyTrainingSchedule[0];
  return schedule.workoutId ? getWorkoutDefinition(schedule.workoutId) : null;
}
