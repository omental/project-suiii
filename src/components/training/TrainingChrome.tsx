import Link from "next/link";
import { ArrowLeft, CalendarClock } from "lucide-react";
import type React from "react";

export function TrainingTopBar({ title, href = "/train", action }: { title: string; href?: string; action?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-suii-black/95 px-4 py-4 backdrop-blur">
      <Link href={href} className="focus-ring rounded-full p-2 text-white" aria-label="Go back">
        <ArrowLeft className="size-7" aria-hidden="true" />
      </Link>
      <div className="text-center">
        <p className="display text-xs text-suii-gold">Project SUIII</p>
        <h1 className="display text-xl text-white">{title}</h1>
      </div>
      <div className="flex min-w-11 justify-end">{action ?? <CalendarClock className="size-7 text-suii-muted" aria-hidden="true" />}</div>
    </header>
  );
}

export function StatTile({ label, value, tone = "lime" }: { label: string; value: string | number; tone?: "lime" | "gold" | "blue" | "white" }) {
  const toneClass = tone === "gold" ? "text-suii-gold" : tone === "blue" ? "text-suii-blue" : tone === "white" ? "text-white" : "text-suii-lime";
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-center">
      <p className={`display text-2xl ${toneClass}`}>{value}</p>
      <p className="display mt-1 text-[0.68rem] text-suii-muted">{label}</p>
    </div>
  );
}

export function TrainingButton({ children, variant = "primary", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" | "ghost" }) {
  const className =
    variant === "primary"
      ? "focus-ring min-h-12 rounded-lg bg-suii-lime px-4 py-3 text-center font-black uppercase text-black"
      : variant === "outline"
        ? "focus-ring min-h-12 rounded-lg border border-suii-lime px-4 py-3 text-center font-black uppercase text-suii-lime"
        : "focus-ring min-h-12 rounded-lg px-4 py-3 text-center font-black uppercase text-suii-muted";
  return (
    <button {...props} className={`${className} ${props.className ?? ""}`}>
      {children}
    </button>
  );
}
