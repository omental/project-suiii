"use client";

import { Cloud, Database, LogOut, RefreshCcw, Shield, Target, Utensils, Dumbbell, Droplets, Settings } from "lucide-react";
import Link from "next/link";
import type React from "react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { logout } from "@/lib/apiClient";
import { buildMigrationPreview } from "@/lib/localMigration";
import { readSyncQueue } from "@/lib/syncQueue";
import type { MigrationPreview } from "@/types/sync";

export function SyncDataPage() {
  const [preview, setPreview] = useState<MigrationPreview>({ meal_logs: 0, workout_sessions: 0, daily_check_ins: 0, sets: 0, date_range: "No local records", total_records: 0 });
  const [queue, setQueue] = useState(readSyncQueue());

  useEffect(() => {
    // Local sync queue data is only available after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreview(buildMigrationPreview());
    setQueue(readSyncQueue());
  }, []);

  const signOut = async () => {
    try {
      await logout();
    } finally {
      window.location.href = "/sign-in";
    }
  };

  return (
    <AppShell>
      <div className="px-4 py-5">
        <header className="flex items-start justify-between">
          <Link href="/" className="focus-ring text-4xl" aria-label="Back">‹</Link>
          <div className="text-center">
            <p className="display text-suii-gold">Project SUIII</p>
            <h1 className="display text-5xl leading-none">Sync & Data</h1>
          </div>
          <Settings className="size-8 text-suii-muted" />
        </header>
        <section className="card mt-5 flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Cloud className="size-20 text-suii-lime" />
            <div>
              <h2 className="display text-3xl text-suii-lime">All Caught Up</h2>
              <p className="text-suii-muted">Last synced {queue.lastSyncAt ? new Date(queue.lastSyncAt).toLocaleString() : "not yet"}</p>
              <span className="mt-2 inline-flex rounded border border-suii-lime px-3 py-1 display text-suii-lime">Online</span>
            </div>
          </div>
          <button className="focus-ring rounded-lg border border-suii-lime px-4 py-3 display text-suii-lime">Sync Now</button>
        </section>
        <section className="card mt-4 p-4">
          <p className="display text-suii-gold">Private Account</p>
          <h2 className="display text-3xl">J.M. Mubasshir Rahman</h2>
          <p className="text-suii-muted">mubasshir@example.com</p>
          <p className="display mt-2 text-suii-gold">This device · {queue.deviceName}</p>
        </section>
        <section className="card mt-4 divide-y divide-white/10 p-4">
          <SyncRow icon={<Utensils />} title="Meals" detail={`${preview.meal_logs} logs`} />
          <SyncRow icon={<Dumbbell />} title="Workouts" detail={`${preview.workout_sessions} sessions · ${preview.sets} sets`} />
          <SyncRow icon={<Droplets />} title="Daily Tracking" detail="Water · Cigarettes · Sleep" />
          <SyncRow icon={<Target />} title="Profile & Goals" detail="Weight · Waist · Targets" />
        </section>
        <section className="card mt-4 flex gap-4 border-suii-blue/40 p-4">
          <Cloud className="size-16 text-suii-blue" />
          <div>
            <h2 className="display text-2xl text-suii-blue">Offline Ready</h2>
            <p className="text-suii-muted">You can log meals and workouts without internet. Changes upload automatically when you reconnect.</p>
            <p className="display mt-3 text-suii-blue">{queue.pending.length} Changes Waiting</p>
          </div>
        </section>
        <section className="card mt-4 p-4">
          <h2 className="display text-2xl">Recent Activity</h2>
          {(queue.recentActivity.length ? queue.recentActivity : ["Workout feedback updated", "Full Body A uploaded", "Evening snack uploaded"]).map((item) => <p key={item} className="mt-3 text-suii-muted">✓ {item}</p>)}
        </section>
        <section className="card mt-4 divide-y divide-white/10 p-4">
          <h2 className="display pb-3 text-2xl">Local Offline Data · 1.8 MB</h2>
          <Action icon={<Database />} label="Export My Data" />
          <Action icon={<RefreshCcw />} label="Retry Failed Changes" muted />
          <Action icon={<Database />} label="Review Device Data" />
          <button className="flex min-h-14 w-full items-center gap-3 py-3 text-left display text-suii-gold" onClick={signOut}><LogOut className="size-6" />Sign Out</button>
        </section>
        <p className="card mt-4 flex gap-3 p-4 text-suii-muted"><Shield className="size-6 text-suii-gold" />Your fitness records are available only to your authenticated account.</p>
      </div>
    </AppShell>
  );
}

function SyncRow({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return <div className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 py-4 text-suii-lime">{icon}<p className="display text-xl text-white">{title}</p><p className="text-right text-suii-muted">{detail}<br /><span className="display text-suii-lime">Synced</span></p></div>;
}

function Action({ icon, label, muted = false }: { icon: React.ReactNode; label: string; muted?: boolean }) {
  return <button className={`flex min-h-14 w-full items-center gap-3 py-3 text-left display ${muted ? "text-suii-muted" : "text-white"}`}>{icon}{label}<span className="ml-auto">›</span></button>;
}
