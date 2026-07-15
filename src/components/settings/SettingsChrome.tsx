"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export function SettingsChrome({ title, eyebrow = "Settings", children }: { title: string; eyebrow?: string; children: React.ReactNode }) {
  return (
    <AppShell>
      <div className="px-4 py-5">
        <header className="grid grid-cols-[3rem_1fr_3rem] items-start">
          <Link href="/settings" className="focus-ring text-4xl" aria-label="Back to settings">‹</Link>
          <div className="text-center">
            <p className="display text-suii-gold">{eyebrow}</p>
            <h1 className="display text-4xl leading-none">{title}</h1>
          </div>
          <span />
        </header>
        <div className="mt-5">{children}</div>
      </div>
    </AppShell>
  );
}
