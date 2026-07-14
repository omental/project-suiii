"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export function ProgressChrome({ children, title, step, percent }: { children: React.ReactNode; title?: string; step?: string; percent?: string }) {
  return (
    <AppShell hideNavigation>
      <div className="px-4 py-5">
        <header className="flex items-center justify-between">
          <Link href="/progress" className="focus-ring rounded p-1" aria-label="Back to progress">
            <X className="size-8" />
          </Link>
          <p className="display text-xl tracking-normal text-white">{title ?? "Project SUIII"}</p>
          <Link href="/progress" className="focus-ring display text-lg text-suii-lime">Save & Exit</Link>
        </header>
        {step ? (
          <div className="mt-6">
            <div className="flex justify-between display text-suii-lime">
              <span>{step}</span>
              <span>{percent}</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-white/15">
              <div className="h-2 rounded-full bg-suii-lime" style={{ width: percent ?? "33%" }} />
            </div>
          </div>
        ) : null}
        {children}
      </div>
    </AppShell>
  );
}
