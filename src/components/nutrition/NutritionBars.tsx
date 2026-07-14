import { clampPercent } from "@/lib/format";
import type { NutritionTargets, NutritionValues } from "@/types/nutrition";

type NutritionBarsProps = {
  values: NutritionValues;
  targets: NutritionTargets;
  compact?: boolean;
};

export function NutritionBars({ values, targets, compact = false }: NutritionBarsProps) {
  const rows = [
    { label: "Protein", value: values.protein, target: targets.protein, unit: "g", color: "bg-suii-blue" },
    { label: "Carbs", value: values.carbs, target: targets.carbs, unit: "g", color: "bg-suii-gold" },
    { label: "Fat", value: values.fat, target: targets.fat, unit: "g", color: "bg-suii-gold" }
  ];

  return (
    <div className={compact ? "grid gap-3" : "grid gap-4"}>
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-1 flex items-baseline justify-between">
            <span className="display text-base text-white">{row.label}</span>
            <span className="text-sm font-black text-suii-muted">
              <span className="text-white">{Math.round(row.value)}</span> / {row.target} {row.unit}
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-label={`${row.label}: ${Math.round(row.value)} of ${row.target} ${row.unit}`}
            aria-valuemin={0}
            aria-valuemax={row.target}
            aria-valuenow={Math.round(row.value)}
          >
            <div className={`h-full rounded-full ${row.color}`} style={{ width: `${clampPercent(row.value, row.target)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
