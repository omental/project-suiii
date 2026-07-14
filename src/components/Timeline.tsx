import { Check, Clock, Droplet, Dumbbell, Utensils } from "lucide-react";
import type { TimelineEntry } from "@/types/dashboard";

const icons = {
  "hydration-0645": Droplet,
  "badminton-0900": Dumbbell,
  "breakfast-1045": Utensils
};

type TimelineProps = {
  entries: TimelineEntry[];
  completedIds: string[];
  onToggle: (id: string) => void;
};

export function Timeline({ entries, completedIds, onToggle }: TimelineProps) {
  return (
    <section className="card enter-card p-4" aria-labelledby="timeline-title">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="timeline-title" className="display text-2xl text-white">
          Today
        </h2>
        <span className="text-sm font-black uppercase text-suii-lime">View Full Plan</span>
      </div>
      <div className="grid gap-1">
        {entries.map((entry, index) => {
          const completed = completedIds.includes(entry.id);
          const Icon = icons[entry.id as keyof typeof icons] ?? Clock;
          const active = entry.status === "up-next" && !completed;
          return (
            <article key={entry.id} className="grid grid-cols-[4rem_2.75rem_1fr] gap-3 py-3">
              <time className={`display pt-2 text-base ${active ? "text-suii-lime" : "text-suii-muted"}`}>
                {entry.time}
              </time>
              <div className="relative flex justify-center">
                {index < entries.length - 1 ? (
                  <span className="absolute top-11 h-full w-px bg-white/15" aria-hidden="true" />
                ) : null}
                <span
                  className={`relative z-10 grid size-10 place-items-center rounded-full border ${
                    completed
                      ? "border-suii-lime bg-suii-lime text-black"
                      : active
                        ? "border-suii-lime text-suii-lime"
                        : "border-white/20 text-suii-muted"
                  }`}
                >
                  {completed ? <Check className="size-5" aria-hidden="true" /> : <Icon className="size-5" aria-hidden="true" />}
                </span>
              </div>
              <div className="min-w-0 border-b border-white/10 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="display text-xl leading-none text-white">{entry.title}</h3>
                    <p className="mt-1 text-sm text-suii-muted">{entry.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggle(entry.id)}
                    className={`focus-ring min-h-10 shrink-0 rounded-full border px-3 text-xs font-black uppercase ${
                      completed
                        ? "border-transparent bg-white/10 text-suii-lime"
                        : active
                          ? "border-suii-lime text-suii-lime"
                          : "border-white/10 text-suii-muted"
                    }`}
                    aria-pressed={completed}
                  >
                    {completed ? "Done" : entry.status === "up-next" ? "Up Next" : "Scheduled"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
