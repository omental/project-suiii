"use client";

import { Dumbbell, Home, MoreHorizontal, Soup, TrendingUp } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const items = [
  { label: "Today", icon: Home, href: "/", enabled: true },
  { label: "Meals", icon: Soup, href: "/meals", enabled: true },
  { label: "Train", icon: Dumbbell, href: "/train", enabled: true },
  { label: "Progress", icon: TrendingUp, href: "/progress", enabled: false },
  { label: "More", icon: MoreHorizontal, href: "/sync", enabled: true }
];

export function BottomNavigation() {
  const [message, setMessage] = useState("");
  const pathname = usePathname() ?? "/";

  return (
    <nav
      className="fixed inset-x-3 bottom-0 z-30 mx-auto max-w-[430px] rounded-t-[18px] border border-white/10 bg-[#111211]/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur sm:bottom-8 sm:rounded-[18px]"
      aria-label="Primary"
    >
      <div className="grid grid-cols-5 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const className = `focus-ring flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl text-[0.7rem] font-black uppercase transition ${
            active ? "bg-suii-lime/10 text-suii-lime" : "text-suii-muted hover:bg-white/5 hover:text-white"
          }`;
          return item.enabled ? (
            <Link key={item.label} href={item.href} aria-current={active ? "page" : undefined} aria-label={active ? `${item.label}, current page` : item.label} className={className}>
              <Icon className="size-6" aria-hidden="true" />
              {item.label}
            </Link>
          ) : (
            <button
              type="button"
              key={item.label}
              aria-label={`${item.label}, coming in the next phase`}
              className={className}
              onClick={() => {
                setMessage("Coming in the next phase.");
                window.setTimeout(() => setMessage(""), 1800);
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
