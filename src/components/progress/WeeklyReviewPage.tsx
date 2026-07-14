"use client";

import { Check, Download, Target } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ProgressChrome } from "@/components/progress/ProgressChrome";
import { buildProgressSummary } from "@/lib/progressAnalytics";
import { completeDraftCheckIn, defaultProgressState, readProgressState, writeProgressState } from "@/lib/progressRepository";

export function WeeklyReviewPage({ checkInId }: { checkInId: string }) {
  const [state, setState] = useState(defaultProgressState);
  useEffect(() => {
    const current = readProgressState();
    const checkIn = current.checkIns[checkInId];
    if (checkIn?.status === "draft") {
      const next = completeDraftCheckIn(current, checkInId);
      writeProgressState(next);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(next);
      return;
    }
    setState(current);
  }, [checkInId]);
  const summary = useMemo(() => buildProgressSummary(state), [state]);
  const checkIn = state.checkIns[checkInId];
  return (
    <ProgressChrome title="Project SUIII">
      <div className="mt-6 flex items-center gap-4"><div className="grid size-24 place-items-center rounded-full border-8 border-suii-lime"><Check className="size-12 text-suii-lime" /></div><div><h1 className="display text-5xl text-suii-lime">Week {checkIn?.weekNumber ?? ""} Complete</h1><p className="text-suii-muted">Consistency is building your result.</p></div></div>
      <section className="card mt-6 grid grid-cols-2 gap-px overflow-hidden p-1">
        <ReviewMetric label="Weight" value={`${summary.currentWeightKg ?? "--"} kg`} detail={`${summary.weightChangeKg ?? "--"} kg`} />
        <ReviewMetric label="Waist" value={`${summary.currentWaistIn ?? "--"} in`} detail={`${summary.waistChangeIn ?? "--"} in`} />
        <ReviewMetric label="Workouts" value={`${summary.workoutAdherence.completed}/${summary.workoutAdherence.planned}`} />
        <ReviewMetric label="Meal Adherence" value={`${Math.round((summary.mealAdherence.completed / summary.mealAdherence.planned) * 100)}%`} />
      </section>
      <section className="card mt-4 p-4">
        <h2 className="display text-2xl">Coaching Insight</h2>
        <p className="mt-3 text-white">{summary.insight}</p>
        <ul className="mt-3 space-y-2 text-suii-muted">
          <li>Protein target uses a consistent 100% threshold.</li>
          <li>Smoking trend improved only when the seven-day average falls.</li>
          <li>Programme changes require explicit review and confirmation.</li>
        </ul>
      </section>
      <section className="card mt-4 p-4">
        <h2 className="display flex items-center gap-2 text-2xl"><Target className="text-suii-gold" /> Current Trend</h2>
        <p className="mt-3 display text-2xl text-suii-gold">{summary.forecast.available ? `Target range estimated ${summary.forecast.estimatedWeeks}` : "Forecast unavailable"}</p>
        <p className="text-suii-muted">{summary.forecast.reason}</p>
      </section>
      <section className="card mt-4 p-4">
        <h2 className="display text-2xl">Next Week Focus</h2>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center"><p className="rounded border border-white/10 p-2">Hit protein<br />6 of 7 days</p><p className="rounded border border-white/10 p-2">Keep 3 strength sessions</p><p className="rounded border border-white/10 p-2">Daily cigarette limit {summary.smoking.dailyLimit}</p></div>
      </section>
      <Link href="/progress/reports" className="focus-ring mt-4 flex items-center justify-center gap-2 rounded-lg bg-suii-lime p-4 display text-black"><Download /> Download Weekly Report</Link>
      <Link href="/progress" className="focus-ring mt-3 block rounded-lg border border-suii-lime p-4 text-center display text-suii-lime">Back to Progress</Link>
    </ProgressChrome>
  );
}

function ReviewMetric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="bg-black/30 p-4"><p className="display text-suii-muted">{label}</p><p className="display text-4xl text-suii-lime">{value}</p>{detail ? <p className="display text-suii-gold">{detail}</p> : null}</div>;
}
