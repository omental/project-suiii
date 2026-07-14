"use client";

import { CheckCircle2, ChevronRight } from "lucide-react";
import { useState } from "react";
import { WeighingSheet } from "@/components/WeighingSheet";
import type { MealAction } from "@/types/dashboard";

type NextActionCardProps = {
  action: MealAction;
  actualGrams: number | null;
  completed: boolean;
  onComplete: (actualGrams: number) => void;
};

export function NextActionCard({ action, actualGrams, completed, onComplete }: NextActionCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <section className="card enter-card p-4" aria-labelledby="next-action-title">
        <div className="flex items-center gap-4">
          <div
            className="grid size-24 shrink-0 place-items-center rounded-full border border-white/10 bg-gradient-to-br from-white/10 to-black"
            aria-hidden="true"
          >
            <span className="display text-xl text-suii-gold">Fuel</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="display text-lg text-suii-lime">
              {action.label} · {action.time}
            </p>
            <h2 id="next-action-title" className="display text-[2rem] leading-none text-white">
              {action.title}
            </h2>
            <p className="mt-1 text-sm font-semibold text-suii-muted">
              {completed && actualGrams ? `${action.ingredient} ${actualGrams} g logged locally` : `${action.ingredient} ${action.targetGrams} g`}
            </p>
          </div>
          <ChevronRight className="hidden size-6 shrink-0 text-white min-[390px]:block" aria-hidden="true" />
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="focus-ring mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-suii-lime px-5 py-3 font-black uppercase text-black transition active:scale-[0.99]"
        >
          {completed ? <CheckCircle2 className="size-5" aria-hidden="true" /> : null}
          {completed ? "Edit Weight" : "Start Weighing"}
        </button>
      </section>
      {open ? (
        <WeighingSheet
          action={action}
          open={open}
          initialValue={actualGrams}
          onClose={() => setOpen(false)}
          onComplete={onComplete}
        />
      ) : null}
    </>
  );
}
