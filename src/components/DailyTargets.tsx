import { MetricRing } from "@/components/MetricRing";
import { QuickIncrementControl } from "@/components/QuickIncrementControl";
import type { DailyMetric } from "@/types/dashboard";

type DailyTargetsProps = {
  metrics: DailyMetric[];
  waterLitres: number;
  cigarettes: number;
  waterUndoDisabled: boolean;
  cigaretteUndoDisabled: boolean;
  onAddWater: () => void;
  onUndoWater: () => void;
  onAddCigarette: () => void;
  onUndoCigarette: () => void;
};

export function DailyTargets({
  metrics,
  waterLitres,
  cigarettes,
  waterUndoDisabled,
  cigaretteUndoDisabled,
  onAddWater,
  onUndoWater,
  onAddCigarette,
  onUndoCigarette
}: DailyTargetsProps) {
  const displayMetrics = metrics.map((metric) => {
    if (metric.id === "water") {
      return { ...metric, value: waterLitres };
    }
    if (metric.id === "cigarettes") {
      return { ...metric, value: cigarettes };
    }
    return metric;
  });

  return (
    <section className="card enter-card p-4" aria-labelledby="daily-targets-title">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="daily-targets-title" className="display text-xl text-white">
          Daily Targets
        </h2>
        <span className="text-sm font-black uppercase text-suii-lime">Details</span>
      </div>
      <div className="grid grid-cols-2 gap-3 min-[370px]:grid-cols-4">
        {displayMetrics.map((metric) => (
          <MetricRing key={metric.id} metric={metric} />
        ))}
      </div>
      <div className="mt-3 grid gap-2">
        <QuickIncrementControl
          label="Water"
          addLabel="+250 ml"
          undoLabel="Undo"
          onAdd={onAddWater}
          onUndo={onUndoWater}
          undoDisabled={waterUndoDisabled}
        />
        <QuickIncrementControl
          label="Cigarettes"
          addLabel="+1"
          undoLabel="Undo"
          onAdd={onAddCigarette}
          onUndo={onUndoCigarette}
          undoDisabled={cigaretteUndoDisabled}
        />
      </div>
    </section>
  );
}
