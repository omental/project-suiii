"use client";

import { ArrowDown, ArrowRight, ArrowUp, RotateCw } from "lucide-react";
import { getExerciseDefinition } from "@/data/training";
import type { MovementPattern } from "@/types/training";

const bodyColor = "#F8FAFC";
const accentColor = "#C6FF24";
const blueColor = "#38BDF8";

function directionIcon(direction?: string) {
  if (direction === "up") return <ArrowUp className="size-5" aria-hidden="true" />;
  if (direction === "down") return <ArrowDown className="size-5" aria-hidden="true" />;
  if (direction === "rotate") return <RotateCw className="size-5" aria-hidden="true" />;
  return <ArrowRight className="size-5" aria-hidden="true" />;
}

function poseFor(pattern?: MovementPattern) {
  switch (pattern) {
    case "squat":
      return { torso: "M75 48 L75 86", legsA: "M75 86 L55 118 M75 86 L96 118", legsB: "M75 86 L48 112 M75 86 L104 112", armsA: "M75 58 L58 75 M75 58 L92 75", armsB: "M75 61 L55 80 M75 61 L95 80", equipmentA: "M62 72 h26 v14 h-26 z", equipmentB: "M61 78 h28 v15 h-28 z" };
    case "hinge":
      return { torso: "M72 48 L98 82", legsA: "M98 82 L80 118 M98 82 L116 118", legsB: "M98 82 L75 118 M98 82 L119 118", armsA: "M96 70 L82 96 M101 73 L108 100", armsB: "M94 74 L74 104 M102 76 L110 106", equipmentA: "M74 96 h14 v13 h-14 z M102 100 h14 v13 h-14 z", equipmentB: "M66 104 h14 v13 h-14 z M104 106 h14 v13 h-14 z" };
    case "horizontal_pull":
      return { torso: "M66 50 L102 78", legsA: "M102 78 L82 118 M102 78 L118 116", legsB: "M102 78 L78 116 M102 78 L120 112", armsA: "M78 60 L56 82 M96 74 L115 88", armsB: "M78 60 L56 82 M96 74 L106 67", equipmentA: "M114 86 h15 v13 h-15 z", equipmentB: "M104 62 h15 v13 h-15 z" };
    case "horizontal_push":
      return { torso: "M45 77 L110 77", legsA: "M110 77 L135 98 M110 77 L136 68", legsB: "M110 77 L133 100 M110 77 L136 70", armsA: "M58 77 L42 103 M68 77 L55 103", armsB: "M58 77 L42 91 M68 77 L55 91", equipmentA: "M35 103 h28", equipmentB: "M36 91 h28" };
    case "vertical_push":
      return { torso: "M76 48 L76 92", legsA: "M76 92 L60 122 M76 92 L94 122", legsB: "M76 92 L60 122 M76 92 L94 122", armsA: "M76 58 L58 72 M76 58 L94 72", armsB: "M76 56 L58 34 M76 56 L94 34", equipmentA: "M51 66 h14 v12 h-14 z M87 66 h14 v12 h-14 z", equipmentB: "M51 25 h14 v12 h-14 z M87 25 h14 v12 h-14 z" };
    case "lunge":
      return { torso: "M76 48 L76 88", legsA: "M76 88 L56 122 M76 88 L98 120", legsB: "M76 88 L48 111 M76 88 L108 112", armsA: "M76 58 L58 80 M76 58 L94 80", armsB: "M76 58 L57 80 M76 58 L96 80", equipmentA: "M50 80 h14 v13 h-14 z M88 80 h14 v13 h-14 z", equipmentB: "M49 81 h14 v13 h-14 z M90 81 h14 v13 h-14 z" };
    case "core_anti_extension":
    case "core_anti_rotation":
      return { torso: "M44 82 L112 82", legsA: "M112 82 L140 95 M112 82 L140 72", legsB: "M112 82 L142 92 M112 82 L138 68", armsA: "M55 82 L40 102 M65 82 L54 102", armsB: "M55 82 L38 101 M65 82 L86 62", equipmentA: "M31 107 h118", equipmentB: "M31 107 h118" };
    case "shoulder_care":
      return { torso: "M76 48 L76 96", legsA: "M76 96 L61 123 M76 96 L92 123", legsB: "M76 96 L61 123 M76 96 L92 123", armsA: "M76 61 L54 74 M76 61 L98 74", armsB: "M76 61 L35 61 M76 61 L117 61", equipmentA: "M54 72 C68 64 84 64 98 72", equipmentB: "M35 58 C58 50 94 50 117 58" };
    case "arm_isolation":
      return { torso: "M76 48 L76 96", legsA: "M76 96 L61 123 M76 96 L92 123", legsB: "M76 96 L61 123 M76 96 L92 123", armsA: "M76 62 L58 89 M76 62 L94 89", armsB: "M76 62 L60 73 M76 62 L92 73", equipmentA: "M52 88 h14 v12 h-14 z M88 88 h14 v12 h-14 z", equipmentB: "M54 68 h14 v12 h-14 z M86 68 h14 v12 h-14 z" };
    default:
      return { torso: "M76 50 L76 95", legsA: "M76 95 L61 123 M76 95 L93 123", legsB: "M76 95 L58 118 M76 95 L96 118", armsA: "M76 62 L58 82 M76 62 L94 82", armsB: "M76 62 L42 72 M76 62 L110 72", equipmentA: "M31 126 h118", equipmentB: "M31 126 h118" };
  }
}

function Figure({ variant, pattern }: { variant: "start" | "finish"; pattern?: MovementPattern }) {
  const pose = poseFor(pattern);
  const suffix = variant === "start" ? "A" : "B";
  const legs = suffix === "A" ? pose.legsA : pose.legsB;
  const arms = suffix === "A" ? pose.armsA : pose.armsB;
  const equipment = suffix === "A" ? pose.equipmentA : pose.equipmentB;
  return (
    <svg viewBox="0 0 156 140" role="img" className="h-36 w-full" aria-hidden="true">
      <rect x="18" y="125" width="120" height="3" rx="1.5" fill="#334155" />
      <circle cx="76" cy="31" r="13" fill="none" stroke={bodyColor} strokeWidth="6" />
      <path d={pose.torso} stroke={bodyColor} strokeWidth="7" strokeLinecap="round" />
      <path d={legs} stroke={bodyColor} strokeWidth="7" strokeLinecap="round" />
      <path d={arms} stroke={bodyColor} strokeWidth="7" strokeLinecap="round" />
      <path d={equipment} stroke={accentColor} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="76" cy="31" r="3" fill={blueColor} />
    </svg>
  );
}

export function ExerciseFormDiagram({ exerciseId, compact = false }: { exerciseId: string; compact?: boolean }) {
  const exercise = getExerciseDefinition(exerciseId);
  const illustration = exercise.illustration;
  return (
    <figure className="rounded-lg border border-white/10 bg-white/[0.03] p-3" aria-label={exercise.accessibilityDescription ?? `${exercise.name} movement diagram`}>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div>
          <Figure variant="start" pattern={exercise.movementPattern} />
          <figcaption className="display text-center text-xs text-suii-muted">{illustration?.startLabel ?? "Start"}</figcaption>
        </div>
        <div className="grid place-items-center rounded-full border border-suii-lime/40 bg-suii-lime/10 p-2 text-suii-lime">
          {directionIcon(illustration?.direction)}
        </div>
        <div>
          <Figure variant="finish" pattern={exercise.movementPattern} />
          <figcaption className="display text-center text-xs text-suii-lime">{illustration?.finishLabel ?? "Finish"}</figcaption>
        </div>
      </div>
      {!compact ? <p className="mt-3 text-center text-xs text-suii-muted">{illustration?.equipmentFocus ?? exercise.defaultResistance.label}</p> : null}
    </figure>
  );
}
