import { Flame } from "lucide-react";
import type { DailyDashboard } from "@/types/dashboard";

export function AppHeader({
  dashboard,
  displayDate,
  greeting,
  streakDays
}: {
  dashboard: DailyDashboard;
  displayDate: string;
  greeting: string;
  streakDays: number;
}) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_4.75rem] items-start gap-3 px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] min-[390px]:grid-cols-[minmax(0,1fr)_6rem] sm:px-5">
      <div className="min-w-0">
        <h1 className="display text-[2.1rem] leading-[0.95] text-white min-[360px]:text-[2.35rem] min-[390px]:text-[2.55rem] sm:text-5xl">
          {greeting ? `${greeting}, ${dashboard.user.shortName}` : dashboard.user.shortName}
        </h1>
        <p className="mt-3 text-sm font-semibold uppercase tracking-normal text-suii-muted">
          {displayDate || "Loading Dhaka date"}
        </p>
      </div>
      <div className="flex min-w-0 shrink-0 flex-col items-center gap-3">
        <div className="grid size-14 place-items-center rounded-full border-2 border-suii-lime text-xl font-black min-[390px]:size-16 min-[390px]:text-2xl">
          {dashboard.user.avatarInitial}
        </div>
        <div className="flex items-center gap-1 whitespace-nowrap text-[0.62rem] font-black uppercase text-white min-[390px]:gap-2 min-[390px]:text-xs">
          <Flame className="size-4 fill-suii-lime text-suii-lime min-[390px]:size-5" aria-hidden="true" />
          {streakDays} Day Streak
        </div>
      </div>
    </header>
  );
}
