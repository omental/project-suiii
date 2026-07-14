"use client";

import { Activity, AlertTriangle, CheckCircle2, ListChecks, XCircle } from "lucide-react";
import Link from "next/link";
import type React from "react";
import { AppShell } from "@/components/AppShell";
import { formGuides, getExerciseDefinition, getWorkoutDefinition } from "@/data/training";
import { useTrainingRepository } from "@/hooks/useTrainingRepository";
import { TrainingButton, TrainingTopBar } from "@/components/training/TrainingChrome";

export function FormGuidePage({ sessionId, exerciseId }: { sessionId: string; exerciseId: string }) {
  const { repository, markExerciseUncomfortable } = useTrainingRepository();
  const session = repository.getSession(sessionId);
  const exercise = getExerciseDefinition(exerciseId);
  const guide = formGuides.find((item) => item.exerciseId === exercise.id) ?? formGuides[0];
  const prescription = session ? getWorkoutDefinition(session.workoutDefinitionId).exercises.find((item) => item.exerciseId === exercise.id) : null;

  return (
    <AppShell hideNavigation>
      <TrainingTopBar title="Form Guide" href={`/train/session/${sessionId}`} action={<Link className="focus-ring rounded-lg px-2 py-2 font-black uppercase text-suii-lime" href={`/train/session/${sessionId}`}>Close</Link>} />
      <div className="px-4 py-5">
        <p className="display text-sm text-suii-muted">{exercise.muscles.join(" · ")}</p>
        <h1 className="display text-6xl leading-none text-white">{exercise.name}</h1>
        <span className="mt-3 inline-flex rounded-full border border-suii-gold px-4 py-2 display text-suii-gold">{exercise.difficulty}</span>

        <section className="card mt-5 p-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            {["Start", "Move", "Finish"].map((label, index) => (
              <div key={label} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className={`mx-auto h-28 w-16 rounded-t-full border ${index === 1 ? "border-suii-lime bg-suii-lime/10" : "border-white/20 bg-white/5"}`} />
                <p className="display mt-3 text-suii-lime">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <GuideList icon={<ListChecks className="size-8 text-suii-lime" />} title="Setup" items={guide.setup} />
        <GuideList icon={<CheckCircle2 className="size-8 text-suii-lime" />} title="Movement" items={guide.movement} ordered />

        <section className="card mt-3 grid grid-cols-3 divide-x divide-white/10 p-4 text-center">
          <div>
            <Activity className="mx-auto size-8 text-suii-blue" aria-hidden="true" />
            <p className="display mt-2 text-xs text-suii-blue">Breathing</p>
            <p className="mt-1 text-xs text-white">{guide.breathing}</p>
          </div>
          <div>
            <p className="display text-xs text-suii-blue">Tempo</p>
            <p className="display mt-2 text-3xl text-white">{prescription?.tempo ?? guide.tempo}</p>
          </div>
          <div>
            <p className="display text-xs text-suii-blue">Cue</p>
            <p className="mt-2 text-xs text-white">{guide.quickCues[0]}</p>
          </div>
        </section>

        <GuideList icon={<XCircle className="size-8 text-suii-lime" />} title="Avoid" items={guide.commonMistakes} />
        <GuideList icon={<AlertTriangle className="size-8 text-suii-amber" />} title="Stop If" items={guide.stopConditions} tone="gold" />

        <div className="mt-4 grid gap-2">
          <Link href={`/train/session/${sessionId}`} className="focus-ring rounded-lg bg-suii-lime px-4 py-4 text-center font-black uppercase text-black">Return to Workout</Link>
          {prescription ? <TrainingButton variant="outline" onClick={() => markExerciseUncomfortable(sessionId, prescription.id)}>Mark Exercise Uncomfortable</TrainingButton> : null}
        </div>
      </div>
    </AppShell>
  );
}

function GuideList({ icon, title, items, ordered = false, tone = "lime" }: { icon: React.ReactNode; title: string; items: string[]; ordered?: boolean; tone?: "lime" | "gold" }) {
  const List = ordered ? "ol" : "ul";
  return (
    <section className={`card mt-3 p-4 ${tone === "gold" ? "border-suii-gold/50" : ""}`}>
      <div className="flex gap-4">
        <div>{icon}</div>
        <div className="min-w-0 flex-1">
          <h2 className={`display text-2xl ${tone === "gold" ? "text-suii-gold" : "text-suii-lime"}`}>{title}</h2>
          <List className="mt-2 space-y-2 text-sm text-white">
            {items.map((item) => <li key={item}>{ordered ? null : "• "}{item}</li>)}
          </List>
        </div>
      </div>
    </section>
  );
}
