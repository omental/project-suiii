import { Ruler, Weight } from "lucide-react";
import type { DailyDashboard } from "@/types/dashboard";

export function TransformationCard({ dashboard }: { dashboard: DailyDashboard }) {
  const { transformation, user } = dashboard;

  return (
    <section className="card enter-card relative overflow-hidden p-4" aria-labelledby="transformation-title">
      <div className="absolute right-4 top-12 hidden rotate-12 gap-2 opacity-70 min-[390px]:flex" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="block h-28 w-8 skew-x-[-12deg] rounded bg-gradient-to-b from-suii-gold to-[#6b4b16]"
          />
        ))}
      </div>
      <div className="relative">
        <h2 id="transformation-title" className="display text-[2.9rem] leading-none text-white">
          Project <span className="text-suii-lime">SUIII</span>
        </h2>
        <p className="display text-lg text-suii-gold">{transformation.tagline}</p>
        <div className="mt-4 flex items-center gap-3">
          <p className="display text-xl text-white">
            Week {transformation.week} · Day {transformation.day}
          </p>
          <span className="h-px flex-1 bg-white/20" aria-hidden="true" />
        </div>
        <dl className="mt-4 grid gap-4">
          <div className="flex items-center gap-4">
            <Weight className="size-7 text-suii-gold" aria-hidden="true" />
            <dt className="display w-20 text-lg text-suii-muted">Weight</dt>
            <dd className="text-base font-bold text-white">
              {user.startingWeightKg.toFixed(1)} kg <span className="text-suii-muted">→</span>{" "}
              <span className="text-suii-lime">{user.targetWeightKg} kg</span>
            </dd>
          </div>
          <div className="flex items-center gap-4">
            <Ruler className="size-7 text-suii-gold" aria-hidden="true" />
            <dt className="display w-20 text-lg text-suii-muted">Waist</dt>
            <dd className="text-base font-bold text-white">
              {user.startingWaistIn.toFixed(1)} in <span className="text-suii-muted">→</span>{" "}
              <span className="text-suii-lime">{user.targetWaistIn} in</span>
            </dd>
          </div>
        </dl>
        <div className="mt-5 flex items-center gap-3">
          <div
            className="h-3 flex-1 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-label="Transformation progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={transformation.progressPercent}
          >
            <div className="h-full rounded-full bg-suii-lime" style={{ width: `${transformation.progressPercent}%` }} />
          </div>
          <span className="w-10 text-right text-lg font-black text-white">{transformation.progressPercent}%</span>
        </div>
      </div>
    </section>
  );
}
