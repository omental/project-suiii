"use client";

import { ChevronRight, Database, Dumbbell, HeartPulse, Info, RefreshCw, Shield, SlidersHorizontal, Target, UserRound } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";

const sections = [
  { href: "/settings/profile", title: "Profile & Goals", detail: "Identity, programme dates and target ranges", icon: UserRound },
  { href: "/settings/training", title: "Training Preferences", detail: "Equipment, rest day, badminton and timers", icon: Dumbbell },
  { href: "/settings/nutrition", title: "Nutrition Targets", detail: "Calories, protein, water and meal workflow", icon: Target },
  { href: "/settings/recovery", title: "Recovery & Habits", detail: "Sleep, check-ins and smoking-reduction tracking", icon: HeartPulse },
  { href: "/settings/data", title: "Data & Privacy", detail: "Export and restore safe device backups", icon: Shield },
  { href: "/settings/devices", title: "Devices & Sessions", detail: "Review sync devices and browser sessions", icon: SlidersHorizontal },
  { href: "/sync/conflicts", title: "Sync & Conflicts", detail: "Review records that need a decision", icon: RefreshCw },
  { href: "/sync", title: "Sync & Data", detail: "Manual sync, local export and device review", icon: Database },
  { href: "/settings/about", title: "About Project SUIII", detail: "Private fitness system details", icon: Info }
];

export function SettingsHub() {
  return (
    <AppShell>
      <div className="px-4 py-5">
        <header className="text-center">
          <p className="display text-suii-gold">Project SUIII</p>
          <h1 className="display text-5xl leading-none">Settings</h1>
        </header>
        <div className="mt-5 grid gap-3">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Link key={section.href} href={section.href} className="focus-ring card grid min-h-20 grid-cols-[2.75rem_1fr_auto] items-center gap-3 p-4">
                <Icon className="size-8 text-suii-lime" aria-hidden="true" />
                <span>
                  <span className="display block text-xl text-white">{section.title}</span>
                  <span className="block text-sm text-suii-muted">{section.detail}</span>
                </span>
                <ChevronRight className="size-6 text-suii-muted" aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
