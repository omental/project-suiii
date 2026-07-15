import type {
  EquipmentType,
  ExerciseDefinition,
  ExerciseFormGuide,
  MovementPattern,
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

const baseExerciseDefinitions: ExerciseDefinition[] = [
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

type CoachingSeed = {
  pattern: MovementPattern;
  setup: string[];
  movement: string[];
  breathing: string;
  tempo: string;
  cues: string[];
  mistakes: string[];
  stop: string[];
  regression?: string[];
  progression?: string[];
  illustration: ExerciseDefinition["illustration"];
  substitutions?: string[];
};

const sharedStop = ["Sharp pain", "Dizziness", "Chest pain or unusual breathlessness", "Numbness or loss of control"];

const coaching: Record<string, CoachingSeed> = {
  "goblet-squat": { pattern: "squat", setup: ["Hold one dumbbell vertically at your chest.", "Stand with feet around shoulder width and ribs stacked over hips.", "Brace before the first bend."], movement: ["Sit between your hips while knees track over toes.", "Pause lightly at the bottom without relaxing.", "Drive through the full foot to stand tall."], breathing: "Breathe in on the descent, then breathe out as you stand.", tempo: "3-1-1", cues: ["Chest tall", "Knees follow toes", "Full foot pressure"], mistakes: ["Knees collapsing inward", "Heels lifting", "Rounding the lower back"], stop: sharedStop, regression: ["Bodyweight box squat", "Reduce depth to a controlled range"], progression: ["Slower 4-second lowering", "Pause for 2 seconds at the bottom"], illustration: { startLabel: "Tall goblet hold", finishLabel: "Controlled squat depth", direction: "down", equipmentFocus: "single dumbbell at chest", description: "A front-facing figure holds one dumbbell at the chest, then lowers into a squat with knees tracking outward." }, substitutions: ["sumo-squat"] },
  "floor-press": { pattern: "horizontal_push", setup: ["Lie on the mat with knees bent and upper arms lightly touching the floor.", "Hold the dumbbells over elbows with wrists stacked.", "Set shoulder blades down before pressing."], movement: ["Press until arms are long without shrugging.", "Lower until upper arms return to the floor.", "Reset the shoulders before the next rep."], breathing: "Inhale as the elbows lower, exhale through the press.", tempo: "2-1-1", cues: ["Wrists stacked", "Shoulders quiet", "Controlled touch"], mistakes: ["Bouncing elbows", "Flaring wrists back", "Shrugging at lockout"], stop: sharedStop, regression: ["Single dumbbell floor press", "Bodyweight push-up from an elevated surface"], progression: ["Add a one-second floor pause", "Use slower lowering"], illustration: { startLabel: "Elbows grounded", finishLabel: "Press to stacked wrists", direction: "up", equipmentFocus: "pair of dumbbells", description: "A figure lies on a mat with dumbbells above the chest and presses from elbows-on-floor to straight arms." }, substitutions: ["push-up"] },
  "one-arm-row": { pattern: "horizontal_pull", setup: ["Support one hand on a chair or thigh.", "Keep the working shoulder lower than the ear.", "Let the dumbbell hang under the shoulder."], movement: ["Pull the elbow toward the back pocket.", "Pause with the shoulder blade gently squeezed.", "Lower until the arm is long before repeating."], breathing: "Exhale as the elbow rows back, inhale as the weight lowers.", tempo: "2-1-2", cues: ["Elbow to hip", "Flat back", "Each arm same reps"], mistakes: ["Twisting the torso", "Curling instead of rowing", "Yanking from the neck"], stop: sharedStop, regression: ["Lighter dumbbell", "Band row with both feet planted"], progression: ["Pause every rep at the top", "Add one rep each arm"], illustration: { startLabel: "Long arm support", finishLabel: "Elbow to hip", direction: "back", equipmentFocus: "single dumbbell and chair", description: "A hinged figure supports one hand and rows a dumbbell toward the ribs on one side." }, substitutions: ["bent-over-row", "band-pull-apart"] },
  "romanian-deadlift": { pattern: "hinge", setup: ["Stand tall with dumbbells close to thighs.", "Soften knees and brace your trunk.", "Keep shoulders broad and neck neutral."], movement: ["Push hips back while dumbbells slide close to legs.", "Stop when hamstrings limit the range.", "Squeeze glutes to return to tall standing."], breathing: "Inhale during the hinge, exhale as hips drive forward.", tempo: "3-1-1", cues: ["Hips back", "Weights close", "Long spine"], mistakes: ["Squatting the hinge", "Weights drifting forward", "Rounding to chase depth"], stop: sharedStop, regression: ["One dumbbell suitcase hinge", "Shorter range hinge"], progression: ["Slow eccentric", "Two-second hamstring stretch pause"], illustration: { startLabel: "Tall with weights close", finishLabel: "Hips back hinge", direction: "back", equipmentFocus: "pair of dumbbells", description: "A side-view figure hinges at the hips with dumbbells close to the thighs and a long back." }, substitutions: ["hip-bridge"] },
  "shoulder-press": { pattern: "vertical_push", setup: ["Stand tall with dumbbells at shoulder height.", "Squeeze glutes lightly so ribs do not flare.", "Start elbows slightly forward of the body."], movement: ["Press overhead in a smooth path.", "Finish with biceps near ears without leaning back.", "Lower to shoulders under control."], breathing: "Exhale as the dumbbells travel up, inhale as they lower.", tempo: "2-0-2", cues: ["Ribs down", "Press tall", "Control down"], mistakes: ["Arching the low back", "Pressing unevenly", "Shrugging early"], stop: sharedStop, regression: ["Seated shoulder press", "Single dumbbell press"], progression: ["Slower lowering", "Add one rep before adding load"], illustration: { startLabel: "Dumbbells at shoulders", finishLabel: "Overhead stack", direction: "up", equipmentFocus: "pair of dumbbells", description: "A standing figure presses two dumbbells from shoulder height to overhead while keeping the ribs down." }, substitutions: ["arnold-press", "wall-slide"] },
  "plank": { pattern: "core_anti_extension", setup: ["Place forearms on the mat under shoulders.", "Step feet back and make a straight line from head to heels.", "Tuck ribs and pelvis slightly."], movement: ["Hold steady pressure through forearms.", "Keep breathing without letting the hips sag.", "Stop before the low back takes over."], breathing: "Use slow nasal inhales and controlled exhales throughout the hold.", tempo: "Hold", cues: ["Long line", "Ribs down", "Breathe"], mistakes: ["Hips sagging", "Holding the breath", "Shoulders creeping to ears"], stop: sharedStop, regression: ["Knee plank", "Shorter holds"], progression: ["Longer hold", "Alternating shoulder taps"], illustration: { startLabel: "Forearms set", finishLabel: "Straight-line hold", direction: "hold", equipmentFocus: "mat", description: "A side-view figure holds a forearm plank with a straight line from shoulders to heels." }, substitutions: ["dead-bug"] },
  "reverse-lunge": { pattern: "lunge", setup: ["Stand tall with dumbbells at your sides.", "Keep feet hip width before stepping.", "Brace before the backward step."], movement: ["Step back and lower both knees with control.", "Keep the front foot fully planted.", "Push through the front foot to return."], breathing: "Inhale as you step and lower, exhale as you stand.", tempo: "2-1-1", cues: ["Front foot heavy", "Tall chest", "Each leg even"], mistakes: ["Front heel lifting", "Knee diving inward", "Pushing from the back foot"], stop: sharedStop, regression: ["Bodyweight reverse lunge", "Assisted split squat"], progression: ["Longer pause at the bottom", "Add one rep each leg"], illustration: { startLabel: "Tall split setup", finishLabel: "Back knee lowers", direction: "down", equipmentFocus: "dumbbells at sides", description: "A figure steps one leg backward into a lunge while holding dumbbells by the sides." }, substitutions: ["goblet-squat", "sumo-squat"] },
  "bent-over-row": { pattern: "horizontal_pull", setup: ["Hinge until dumbbells hang below shoulders.", "Keep knees soft and spine long.", "Set the neck in line with the back."], movement: ["Row both elbows toward the ribs.", "Pause without shrugging.", "Lower until arms are long."], breathing: "Exhale on the row, inhale as weights lower.", tempo: "2-1-2", cues: ["Elbows back", "Long spine", "Quiet neck"], mistakes: ["Standing up each rep", "Jerking the weights", "Shrugging"], stop: sharedStop, regression: ["One-arm supported row", "Band row"], progression: ["Top pause", "Slower lowering"], illustration: { startLabel: "Hinged hang", finishLabel: "Elbows by ribs", direction: "back", equipmentFocus: "pair of dumbbells", description: "A hinged figure rows two dumbbells toward the ribs while holding a steady torso angle." }, substitutions: ["one-arm-row", "band-pull-apart"] },
  "push-up": { pattern: "horizontal_push", setup: ["Hands under shoulders with fingers spread.", "Step back to a straight body line.", "Brace before bending elbows."], movement: ["Lower chest toward the floor with elbows angled back.", "Press the floor away until arms are long.", "Keep hips and shoulders rising together."], breathing: "Inhale down, exhale up.", tempo: "2-1-1", cues: ["Body moves as one", "Elbows back", "Press the floor"], mistakes: ["Hips sagging", "Head reaching forward", "Half reps after fatigue"], stop: sharedStop, regression: ["Incline push-up", "Knee push-up"], progression: ["Slower descent", "Add a bottom pause"], illustration: { startLabel: "High plank", finishLabel: "Chest lowers", direction: "down", equipmentFocus: "bodyweight on mat", description: "A side-view figure lowers from a high plank into a push-up while maintaining one body line." }, substitutions: ["floor-press"] },
  "hip-bridge": { pattern: "hinge", setup: ["Lie on the mat with knees bent.", "Place one dumbbell across the hips if comfortable.", "Set feet under knees."], movement: ["Drive through heels and lift hips.", "Pause with ribs down and glutes squeezed.", "Lower to the mat under control."], breathing: "Exhale as hips lift, inhale as they lower.", tempo: "2-1-2", cues: ["Heels down", "Ribs down", "Glutes finish"], mistakes: ["Low-back overextension", "Feet too far away", "Pushing through toes"], stop: sharedStop, regression: ["Bodyweight bridge", "Shorter range"], progression: ["Longer top pause", "Single-leg bridge without load"], illustration: { startLabel: "Hips on mat", finishLabel: "Bridge hold", direction: "up", equipmentFocus: "single dumbbell on hips", description: "A figure lies on a mat and lifts the hips into a bridge with a dumbbell resting across the pelvis." }, substitutions: ["romanian-deadlift"] },
  "lateral-raise": { pattern: "shoulder_care", setup: ["Stand tall with light dumbbells by your sides.", "Keep elbows softly bent.", "Set shoulders down away from ears."], movement: ["Raise arms out to shoulder height.", "Pause briefly without shrugging.", "Lower slowly to your sides."], breathing: "Exhale while raising, inhale while lowering.", tempo: "2-1-2", cues: ["Soft elbows", "Shoulders down", "Stop at shoulder height"], mistakes: ["Swinging the weights", "Shrugging", "Raising above control"], stop: sharedStop, regression: ["One arm at a time", "Band lateral raise"], progression: ["Slower lowering", "Add one clean rep"], illustration: { startLabel: "Weights at sides", finishLabel: "Arms to shoulder height", direction: "out", equipmentFocus: "light dumbbells", description: "A front-facing figure raises dumbbells out to the sides until the hands reach shoulder height." }, substitutions: ["wall-slide", "band-pull-apart"] },
  "biceps-curl": { pattern: "arm_isolation", setup: ["Stand tall with dumbbells at your sides.", "Keep elbows close to ribs.", "Set wrists straight."], movement: ["Curl without moving the upper arms forward.", "Squeeze briefly near the top.", "Lower until elbows are straight but not locked."], breathing: "Exhale on the curl, inhale on the lower.", tempo: "2-1-2", cues: ["Elbows still", "Wrists straight", "Control down"], mistakes: ["Swinging the torso", "Letting elbows drift", "Dropping the weights"], stop: sharedStop, regression: ["Alternating curls", "Use lighter dumbbells"], progression: ["Three-second lowering", "Add one rep each set"], illustration: { startLabel: "Arms long", finishLabel: "Curl to shoulders", direction: "up", equipmentFocus: "pair of dumbbells", description: "A standing figure curls two dumbbells while the elbows stay pinned near the ribs." }, substitutions: ["one-arm-row"] },
  "dead-bug": { pattern: "core_anti_extension", setup: ["Lie on your back with knees over hips and arms reaching up.", "Press low ribs gently toward the mat.", "Move slowly enough to keep the back quiet."], movement: ["Reach one arm and the opposite leg away.", "Return to the start before switching sides.", "Only move as far as you can control."], breathing: "Exhale as the limbs reach, inhale to return.", tempo: "Controlled alternating", cues: ["Back quiet", "Opposite limbs", "Each side even"], mistakes: ["Low-back lifting", "Moving too fast", "Holding breath"], stop: sharedStop, regression: ["Move legs only", "Shorten the reach"], progression: ["Longer reach", "Add a small pause"], illustration: { startLabel: "Tabletop start", finishLabel: "Opposite reach", direction: "forward", equipmentFocus: "mat", description: "A supine figure alternates opposite arm and leg reaches while keeping the torso still." }, substitutions: ["plank", "bird-dog"] },
  "band-pull-apart": { pattern: "shoulder_care", setup: ["Hold a light band at chest height.", "Stand tall with arms straight but not locked.", "Keep ribs stacked over hips."], movement: ["Pull hands apart until the band reaches the chest.", "Squeeze shoulder blades gently.", "Return slowly without snapping the band."], breathing: "Exhale as the band opens, inhale as it returns.", tempo: "2-1-2", cues: ["Tall chest", "Hands apart", "Slow return"], mistakes: ["Shrugging", "Rib flare", "Letting the band snap back"], stop: sharedStop, regression: ["Use a lighter band", "Narrow the range"], progression: ["Longer end-range pause", "Slightly heavier band"], illustration: { startLabel: "Band narrow", finishLabel: "Band wide", direction: "out", equipmentFocus: "resistance band", description: "A standing figure pulls a band apart at chest height until the hands are wide." }, substitutions: ["wall-slide"] },
  "band-external-rotation": { pattern: "shoulder_care", setup: ["Anchor the elbow at your side with a light band in hand.", "Keep the forearm parallel to the floor.", "Stand tall without leaning."], movement: ["Rotate the hand away from the body.", "Pause before the elbow drifts.", "Return slowly to the start."], breathing: "Exhale as the forearm opens, inhale as it returns.", tempo: "2-1-2", cues: ["Elbow pinned", "Small clean range", "Each arm"], mistakes: ["Elbow leaving ribs", "Torso twisting", "Using too much band tension"], stop: sharedStop, regression: ["Shorter range", "Lighter band"], progression: ["Longer pause", "Add one rep each arm"], illustration: { startLabel: "Elbow at ribs", finishLabel: "Forearm rotates out", direction: "rotate", equipmentFocus: "light resistance band", description: "A figure keeps one elbow pinned and rotates the forearm outward against a band." }, substitutions: ["wall-slide"] },
  "wall-slide": { pattern: "shoulder_care", setup: ["Stand with back near the wall.", "Keep ribs down and forearms lightly touching the wall if possible.", "Start with elbows bent."], movement: ["Slide arms upward without shrugging.", "Stop before the ribs flare.", "Return slowly to the start."], breathing: "Exhale while sliding up, inhale while lowering.", tempo: "Controlled", cues: ["Ribs down", "Slide tall", "No shrug"], mistakes: ["Rib flare", "Forcing painful range", "Neck tension"], stop: sharedStop, regression: ["Move a few inches from the wall", "Smaller range"], progression: ["Slower slide", "Add lift-off only if painless"], illustration: { startLabel: "Elbows bent on wall", finishLabel: "Arms slide overhead", direction: "up", equipmentFocus: "wall and bodyweight", description: "A standing figure slides bent arms upward on a wall while keeping the torso stacked." }, substitutions: ["band-pull-apart"] },
  "bird-dog": { pattern: "core_anti_rotation", setup: ["Start on hands and knees on the mat.", "Place hands under shoulders and knees under hips.", "Brace gently before moving."], movement: ["Reach opposite arm and leg long.", "Pause without rotating the hips.", "Return and switch sides."], breathing: "Exhale on the reach, inhale to return.", tempo: "Controlled alternating", cues: ["Hips level", "Reach long", "Each side"], mistakes: ["Twisting open", "Arching the back", "Rushing side to side"], stop: sharedStop, regression: ["Legs only", "Arms only"], progression: ["Longer pause", "Draw small squares with the hand"], illustration: { startLabel: "All-fours start", finishLabel: "Opposite reach", direction: "forward", equipmentFocus: "mat", description: "A quadruped figure reaches one arm and opposite leg while the hips remain level." }, substitutions: ["dead-bug"] },
  "sumo-squat": { pattern: "squat", setup: ["Hold one dumbbell vertically between the legs.", "Take a wider stance with toes slightly out.", "Brace with chest tall."], movement: ["Lower by bending knees and sitting straight down.", "Keep knees tracking over toes.", "Stand by driving the floor apart."], breathing: "Inhale down, exhale up.", tempo: "3-1-1", cues: ["Wide stance", "Knees out", "Tall torso"], mistakes: ["Folding forward", "Knees falling in", "Losing foot pressure"], stop: sharedStop, regression: ["Bodyweight sumo squat", "Goblet squat with smaller range"], progression: ["Longer bottom pause", "Slow eccentric"], illustration: { startLabel: "Wide dumbbell hold", finishLabel: "Knees track wide", direction: "down", equipmentFocus: "single dumbbell", description: "A front-facing figure squats in a wide stance while holding one dumbbell between the legs." }, substitutions: ["goblet-squat"] },
  "arnold-press": { pattern: "vertical_push", setup: ["Hold dumbbells in front of shoulders with palms facing you.", "Stand tall with ribs down.", "Keep elbows under wrists."], movement: ["Rotate palms forward as you press overhead.", "Finish tall without leaning back.", "Reverse the path under control."], breathing: "Exhale through the press, inhale during the return.", tempo: "2-0-2", cues: ["Rotate smooth", "Ribs down", "Control return"], mistakes: ["Arching back", "Rushing the rotation", "Pressing through shoulder pinch"], stop: sharedStop, regression: ["Standard shoulder press", "Seated press"], progression: ["Slower lowering", "Add one controlled rep"], illustration: { startLabel: "Palms face in", finishLabel: "Press and rotate", direction: "up", equipmentFocus: "pair of dumbbells", description: "A standing figure rotates dumbbells from palms-in at the shoulders to an overhead press." }, substitutions: ["shoulder-press", "wall-slide"] },
  "triceps-extension": { pattern: "arm_isolation", setup: ["Hold one dumbbell overhead with both hands.", "Keep elbows pointing forward.", "Brace ribs down."], movement: ["Lower the dumbbell behind the head under control.", "Stop before elbows flare wide.", "Extend arms overhead without locking harshly."], breathing: "Inhale as the weight lowers, exhale as arms extend.", tempo: "2-1-2", cues: ["Elbows narrow", "Ribs down", "Slow lower"], mistakes: ["Flaring elbows", "Arching low back", "Dropping too deep"], stop: sharedStop, regression: ["Lying triceps extension", "Use a lighter dumbbell"], progression: ["Longer bottom pause", "Add one rep"], illustration: { startLabel: "Dumbbell overhead", finishLabel: "Elbows bend behind head", direction: "down", equipmentFocus: "single dumbbell", description: "A standing figure lowers one dumbbell behind the head while keeping elbows narrow." }, substitutions: ["floor-press", "push-up"] },
  "side-plank": { pattern: "core_anti_rotation", setup: ["Place one forearm on the mat under the shoulder.", "Stack or stagger feet.", "Lift hips into a long side line."], movement: ["Hold hips high without rolling forward.", "Use calm breaths through the hold.", "Switch sides after the planned time."], breathing: "Use slow breaths and keep the ribs from flaring.", tempo: "Hold", cues: ["Hips high", "Long side line", "Each side"], mistakes: ["Shoulder sinking", "Hips drifting back", "Holding breath"], stop: sharedStop, regression: ["Knees-bent side plank", "Shorter holds"], progression: ["Longer hold", "Top-leg lift"], illustration: { startLabel: "Side forearm set", finishLabel: "Hips lifted", direction: "hold", equipmentFocus: "mat", description: "A side-view figure holds a side plank on one forearm with hips lifted." }, substitutions: ["plank", "dead-bug"] },
  "hip-flexor-stretch": { pattern: "mobility", setup: ["Kneel on the mat in a half-kneeling stance.", "Tuck the pelvis slightly before shifting.", "Keep the front foot fully planted."], movement: ["Shift hips forward until the rear hip feels a stretch.", "Reach the same-side arm up if comfortable.", "Hold without bouncing, then switch sides."], breathing: "Slow exhales help the hip settle without forcing range.", tempo: "Easy hold", cues: ["Tuck first", "Tall torso", "Each side"], mistakes: ["Arching the back", "Bouncing", "Forcing knee discomfort"], stop: sharedStop, regression: ["Standing hip-flexor stretch", "Use padding under the knee"], progression: ["Add a gentle side reach", "Longer relaxed hold"], illustration: { startLabel: "Half-kneeling", finishLabel: "Hips shift forward", direction: "forward", equipmentFocus: "mat", description: "A half-kneeling figure gently shifts forward to stretch the rear hip." } },
  "calf-stretch": { pattern: "mobility", setup: ["Stand facing a wall or stable surface.", "Step one foot back with heel down.", "Point toes forward."], movement: ["Lean forward until the back calf stretches.", "Keep heel grounded.", "Hold calmly and switch sides."], breathing: "Slow breathing keeps the stretch gentle.", tempo: "Easy hold", cues: ["Heel down", "Toes forward", "Each side"], mistakes: ["Turning the foot out", "Bouncing", "Forcing pain"], stop: sharedStop, regression: ["Shorter stance", "Seated calf stretch"], progression: ["Bend the back knee slightly for soleus", "Longer hold"], illustration: { startLabel: "Split stance", finishLabel: "Lean to wall", direction: "forward", equipmentFocus: "wall support", description: "A standing figure leans toward a wall with the back heel grounded for a calf stretch." } },
  "hamstring-stretch": { pattern: "mobility", setup: ["Sit or lie on the mat with one leg extended.", "Keep the knee softly unlocked.", "Square hips toward the working leg."], movement: ["Hinge or draw the leg until the hamstring stretches.", "Hold without rounding aggressively.", "Switch sides after the planned time."], breathing: "Exhale slowly as tension eases.", tempo: "Easy hold", cues: ["Soft knee", "Long spine", "Each side"], mistakes: ["Yanking into range", "Locking the knee hard", "Holding breath"], stop: sharedStop, regression: ["Use a bent knee", "Reduce the range"], progression: ["Longer hold", "Add ankle pumps"], illustration: { startLabel: "Leg extended", finishLabel: "Gentle hinge", direction: "forward", equipmentFocus: "mat", description: "A seated figure hinges toward one extended leg for a hamstring stretch." } },
  "thoracic-rotation": { pattern: "mobility", setup: ["Start side-lying or on hands and knees.", "Keep hips quiet.", "Reach one arm across the body."], movement: ["Rotate the upper back open.", "Follow the hand with your eyes if comfortable.", "Return and repeat each side."], breathing: "Exhale into the rotation, inhale to reset.", tempo: "Slow reps", cues: ["Upper back turns", "Hips quiet", "Each side"], mistakes: ["Twisting through the low back", "Rushing", "Forcing the shoulder"], stop: sharedStop, regression: ["Smaller range", "Keep head neutral"], progression: ["Longer open pause", "Add breath at end range"], illustration: { startLabel: "Reach across", finishLabel: "Open rotation", direction: "rotate", equipmentFocus: "mat", description: "A figure rotates the upper back open while the hips stay steady on the mat." } },
  "foam-rolling": { pattern: "recovery", setup: ["Place the foam roller under the target muscle.", "Support your weight with hands or feet.", "Start with light pressure."], movement: ["Roll slowly over tender areas.", "Pause and breathe on mild tension.", "Move to another area before discomfort becomes sharp."], breathing: "Use long exhales to reduce guarding.", tempo: "Slow tissue work", cues: ["Slow pressure", "Mild tension", "Breathe"], mistakes: ["Rolling over joints", "Pressing into sharp pain", "Holding breath"], stop: sharedStop, regression: ["Reduce bodyweight on the roller", "Use shorter passes"], progression: ["Longer easy passes", "Add gentle joint movement"], illustration: { startLabel: "Roller under muscle", finishLabel: "Slow pass", direction: "back", equipmentFocus: "foam roller", description: "A figure supports bodyweight while moving slowly across a foam roller." } },
  "quad-stretch": { pattern: "mobility", setup: ["Stand tall or lie side-lying.", "Bring one heel toward the glute.", "Keep knees close together."], movement: ["Tuck the pelvis slightly until the front thigh stretches.", "Hold without pulling the knee back hard.", "Switch sides."], breathing: "Slow breaths keep the stretch relaxed.", tempo: "Easy hold", cues: ["Knees close", "Tuck pelvis", "Each side"], mistakes: ["Arching the back", "Twisting the knee", "Forcing range"], stop: sharedStop, regression: ["Side-lying stretch", "Use a strap"], progression: ["Longer hold", "Gentle glute squeeze"], illustration: { startLabel: "Heel drawn back", finishLabel: "Tall quad stretch", direction: "hold", equipmentFocus: "bodyweight", description: "A standing figure holds one foot behind the body for a quadriceps stretch." } },
  "chest-shoulder-stretch": { pattern: "mobility", setup: ["Stand tall near a wall or doorway.", "Place the forearm or hand at a comfortable height.", "Set ribs down before turning away."], movement: ["Rotate gently until the chest and shoulder stretch.", "Hold without pinching.", "Repeat the other side if needed."], breathing: "Exhale slowly into the stretch.", tempo: "Easy hold", cues: ["Ribs down", "Gentle turn", "No pinch"], mistakes: ["Forcing shoulder pinch", "Rib flare", "Shrugging"], stop: sharedStop, regression: ["Lower the arm position", "Use a smaller turn"], progression: ["Longer relaxed hold", "Add slow head turns if comfortable"], illustration: { startLabel: "Hand on wall", finishLabel: "Gentle turn away", direction: "rotate", equipmentFocus: "wall or doorway", description: "A standing figure turns gently away from a wall-supported arm for a chest and shoulder stretch." } },
  "slow-breathing": { pattern: "recovery", setup: ["Lie or sit comfortably on the mat.", "Relax shoulders and jaw.", "Place one hand on the ribs if helpful."], movement: ["Inhale quietly through the nose.", "Exhale longer than the inhale.", "Continue until breathing feels easy."], breathing: "Use a comfortable inhale and a longer slow exhale.", tempo: "Calm cycles", cues: ["Soft shoulders", "Long exhale", "Easy pace"], mistakes: ["Forcing huge breaths", "Tensing the neck", "Chasing dizziness"], stop: ["Dizziness", "Chest pain", "Unusual breathlessness"], regression: ["Sit upright", "Use shorter exhales"], progression: ["Extend the exhale gradually", "Add a quiet pause after exhale"], illustration: { startLabel: "Comfortable rest", finishLabel: "Long exhale", direction: "hold", equipmentFocus: "mat", description: "A resting figure on a mat uses calm breathing with shoulders relaxed." } }
};

export const exerciseDefinitions: ExerciseDefinition[] = baseExerciseDefinitions.map((exercise) => {
  const seed = coaching[exercise.id];
  return {
    ...exercise,
    primaryMuscles: exercise.muscles.slice(0, 1),
    secondaryMuscles: exercise.muscles.slice(1),
    movementPattern: seed?.pattern,
    laterality: exercise.unilateral ? "left_right" : exercise.hold ? "hold" : "bilateral",
    defaultTempo: seed?.tempo,
    startInstructions: seed?.setup,
    movementInstructions: seed?.movement,
    breathingInstructions: seed?.breathing,
    coachingCues: seed?.cues,
    commonMistakes: seed?.mistakes,
    stopConditions: seed?.stop,
    regressionOptions: seed?.regression,
    progressionOptions: seed?.progression,
    substitutionIds: seed?.substitutions ?? [],
    illustration: seed?.illustration,
    accessibilityDescription: seed?.illustration?.description
  };
});

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

export const formGuides: ExerciseFormGuide[] = exerciseDefinitions.map((exercise) => ({
  exerciseId: exercise.id,
  setup: exercise.startInstructions ?? [],
  movement: exercise.movementInstructions ?? [],
  breathing: exercise.breathingInstructions ?? "",
  tempo: exercise.defaultTempo ?? "Controlled",
  quickCues: exercise.coachingCues ?? [],
  commonMistakes: exercise.commonMistakes ?? [],
  stopConditions: exercise.stopConditions ?? [],
  regressionOptions: exercise.regressionOptions,
  progressionOptions: exercise.progressionOptions
}));

export function getExerciseDefinition(id: string) {
  return exerciseDefinitions.find((exercise) => exercise.id === id) ?? exerciseDefinitions[0];
}

export function getWorkoutDefinition(id: string) {
  return workoutDefinitions.find((workout) => workout.id === id) ?? workoutDefinitions[0];
}

export function getExerciseSubstitutions(exerciseId: string, availableEquipment: EquipmentType[] = []) {
  const exercise = getExerciseDefinition(exerciseId);
  const available = new Set(availableEquipment);
  return (exercise.substitutionIds ?? [])
    .map(getExerciseDefinition)
    .filter((candidate) => candidate.id !== exercise.id)
    .filter((candidate) => !available.size || candidate.equipment.every((item) => available.has(item) || item === "bodyweight" || item === "mat"))
    .filter((candidate) => candidate.movementPattern === exercise.movementPattern || candidate.mobility === exercise.mobility);
}

export function getWorkoutForDate(dateISO: string, preferredRestDay?: string | null) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return null;
  const date = new Date(`${dateISO}T12:00:00`);
  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
  if (preferredRestDay && dayName === preferredRestDay) return null;
  const schedule = weeklyTrainingSchedule.find((entry) => entry.dayName === dayName) ?? weeklyTrainingSchedule[0];
  return schedule.workoutId ? getWorkoutDefinition(schedule.workoutId) : null;
}
