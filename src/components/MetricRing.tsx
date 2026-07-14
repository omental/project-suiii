import { Beef, Cigarette, Droplet, Flame } from "lucide-react";
import type { DailyMetric } from "@/types/dashboard";

const iconMap = {
  calories: Flame,
  protein: Beef,
  water: Droplet,
  cigarettes: Cigarette
};

const toneMap = {
  lime: "text-suii-lime stroke-suii-lime",
  blue: "text-suii-blue stroke-suii-blue",
  amber: "text-suii-amber stroke-suii-amber"
};

export function MetricRing({ metric }: { metric: DailyMetric }) {
  const Icon = iconMap[metric.id];
  const percent = Math.min(100, Math.max(0, (metric.value / metric.target) * 100));
  const circumference = 2 * Math.PI * 30;
  const dashOffset = circumference - (percent / 100) * circumference;
  const value = metric.id === "water" ? metric.value.toFixed(1) : metric.value.toLocaleString();
  const target = metric.id === "water" ? metric.target.toFixed(1) : metric.target.toLocaleString();

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-center">
      <div className="relative mx-auto grid size-[82px] place-items-center">
        <svg viewBox="0 0 72 72" className="size-[82px] -rotate-90" aria-hidden="true">
          <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="7" />
          <circle
            cx="36"
            cy="36"
            r="30"
            fill="none"
            className={toneMap[metric.tone]}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <Icon className={`absolute size-8 ${toneMap[metric.tone]}`} aria-hidden="true" />
      </div>
      <p className="sr-only">
        {metric.label}: {value} of {target} {metric.unit}
      </p>
      <p className="mt-2 whitespace-nowrap text-base font-black text-white min-[390px]:text-[0.95rem]" aria-hidden="true">
        {value} <span className="text-suii-muted">/ {target}</span>
      </p>
      <p className="display text-base text-suii-muted">{metric.unit || metric.label}</p>
    </article>
  );
}
