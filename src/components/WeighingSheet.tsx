"use client";

import { useId, useState } from "react";
import { Dialog } from "@/components/Dialog";
import type { MealAction } from "@/types/dashboard";

type WeighingSheetProps = {
  action: MealAction;
  open: boolean;
  initialValue: number | null;
  onClose: () => void;
  onComplete: (actualGrams: number) => void;
};

export function WeighingSheet({ action, open, initialValue, onClose, onComplete }: WeighingSheetProps) {
  const [value, setValue] = useState(initialValue ? String(initialValue) : "");
  const [error, setError] = useState("");
  const inputId = useId();

  const actual = Number(value);
  const hasActual = value.trim().length > 0 && Number.isFinite(actual);
  const difference = hasActual ? actual - action.targetGrams : 0;

  return (
    <Dialog
      open={open}
      title={action.title}
      description="Weigh the ingredient and mark this Phase 1 action complete."
      onClose={onClose}
    >
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!hasActual || actual <= 0 || actual > 1000) {
            setError("Enter a reasonable positive gram amount.");
            return;
          }
          onComplete(Math.round(actual));
          onClose();
        }}
      >
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-sm font-bold uppercase text-suii-muted">Ingredient</p>
          <p className="display mt-1 text-3xl text-white">{action.ingredient}</p>
          <p className="mt-3 text-sm text-suii-muted">
            Target weight: <span className="font-black text-white">{action.targetGrams} g</span>
          </p>
          <p className="mt-2 text-sm text-suii-muted">Place the edible portion on your kitchen scale.</p>
        </div>
        <div>
          <label htmlFor={inputId} className="text-sm font-black uppercase text-white">
            Actual measured grams
          </label>
          <div className="mt-2 flex items-center rounded-2xl border border-white/10 bg-white/5 px-4">
            <input
              id={inputId}
              inputMode="decimal"
              value={value}
              data-autofocus
              onChange={(event) => {
                setValue(event.target.value);
                setError("");
              }}
              className="focus-ring min-h-14 w-full bg-transparent text-2xl font-black text-white outline-none"
              aria-describedby="weighing-help weighing-error"
            />
            <span className="font-black text-suii-muted">g</span>
          </div>
          <p id="weighing-help" className="mt-2 text-sm text-suii-muted">
            Difference from target:{" "}
            <span className={difference === 0 ? "text-white" : difference > 0 ? "text-suii-amber" : "text-suii-blue"}>
              {hasActual ? `${difference > 0 ? "+" : ""}${Math.round(difference)} g` : "Enter grams"}
            </span>
          </p>
          <p id="weighing-error" className="mt-2 min-h-5 text-sm font-bold text-suii-amber" role="alert">
            {error}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className="focus-ring rounded-xl border border-white/10 px-4 font-black uppercase text-white"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="focus-ring rounded-xl bg-suii-lime px-4 font-black uppercase text-black"
          >
            Mark Complete
          </button>
        </div>
      </form>
    </Dialog>
  );
}
