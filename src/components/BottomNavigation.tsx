"use client";

import { Dumbbell, Home, MoreHorizontal, Soup, TrendingUp } from "lucide-react";
import { useState } from "react";

const items = [
  { label: "Today", icon: Home, active: true },
  { label: "Meals", icon: Soup, active: false },
  { label: "Train", icon: Dumbbell, active: false },
  { label: "Progress", icon: TrendingUp, active: false },
  { label: "More", icon: MoreHorizontal, active: false }
];

export function BottomNavigation() {
  const [message, setMessage] = useState("");

  return (
    <nav
      className="fixed inset-x-3 bottom-0 z-30 mx-auto max-w-[430px] rounded-t-[18px] border border-white/10 bg-[#111211]/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur sm:bottom-8 sm:rounded-[18px]"
      aria-label="Primary"
    >
      <div className="grid grid-cols-5 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              type="button"
              key={item.label}
              aria-current={item.active ? "page" : undefined}
              aria-label={item.active ? `${item.label}, current page` : `${item.label}, coming in the next phase`}
              className={`focus-ring flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl text-[0.7rem] font-black uppercase transition ${
                item.active
                  ? "bg-suii-lime/10 text-suii-lime"
                  : "text-suii-muted hover:bg-white/5 hover:text-white"
              }`}
              onClick={() => {
                if (!item.active) {
                  setMessage("Coming in the next phase.");
                  window.setTimeout(() => setMessage(""), 1800);
                }
              }}
            >
              <Icon className="size-6" aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {message}
      </p>
    </nav>
  );
}
