"use client";

import { Dumbbell } from "lucide-react";
import { useState } from "react";
import { Dialog } from "@/components/Dialog";
import type { WorkoutSummary } from "@/types/dashboard";

export function WorkoutPreviewCard({ workout }: { workout: WorkoutSummary }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <section className="card enter-card p-4" aria-labelledby="workout-title">
        <div className="grid grid-cols-[5rem_1fr] gap-4">
          <div
            className="grid size-20 place-items-center rounded-full border border-white/10 bg-gradient-to-br from-suii-gold/30 to-black"
            aria-hidden="true"
          >
            <Dumbbell className="size-10 text-suii-gold" />
          </div>
          <div>
            <p className="display text-lg text-suii-gold">{workout.label}</p>
            <h2 id="workout-title" className="display text-[2.4rem] leading-none text-white">
              {workout.title}
            </h2>
            <p className="display mt-2 text-xl text-suii-muted">
              {workout.exerciseCount} Exercises · {workout.estimatedMinutes} Min
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-[1fr_1fr_2fr] gap-2">
          {workout.equipment.map((item) => (
            <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-2 text-center">
              <Dumbbell className="mx-auto size-5 text-suii-gold" aria-hidden="true" />
              <p className="mt-1 text-lg font-black uppercase text-white">{item.label}</p>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="focus-ring rounded-xl bg-suii-lime px-3 font-black uppercase text-black"
          >
            Start Workout
          </button>
        </div>
      </section>
      <Dialog
        open={open}
        title={workout.title}
        description="Workout preview for Phase 1."
        onClose={() => setOpen(false)}
      >
        <div className="grid gap-4">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-sm text-suii-muted">
              Estimated duration: <span className="font-black text-white">{workout.estimatedMinutes} minutes</span>
            </p>
            <p className="mt-2 text-sm text-suii-muted">
              Equipment: <span className="font-black text-white">5 kg and 7.5 kg dumbbells</span>
            </p>
          </div>
          <ol className="grid gap-2">
            {workout.exercises.map((exercise) => (
              <li key={exercise} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white">
                {exercise}
              </li>
            ))}
          </ol>
          <p className="text-sm text-suii-muted">The guided workout player arrives in Phase 2.</p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="focus-ring rounded-xl bg-suii-lime px-4 py-3 font-black uppercase text-black"
          >
            Close
          </button>
        </div>
      </Dialog>
    </>
  );
}
