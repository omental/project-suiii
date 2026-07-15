"use client";

import { SettingsChrome } from "@/components/settings/SettingsChrome";
import { InstallAndUpdateCard } from "@/components/pwa/InstallAndUpdateCard";

export function AboutSettingsPage() {
  return (
    <SettingsChrome title="About Project SUIII">
      <section className="card p-4">
        <h2 className="display text-2xl">Private Fitness System</h2>
        <p className="mt-2 text-suii-muted">Project SUIII stores authenticated profile settings on the backend and keeps local device records private to this browser until sync or export actions are chosen.</p>
        <p className="mt-3 text-sm text-suii-muted">Production deployment details and credentials are intentionally not included in the app source.</p>
      </section>
      <div className="mt-4">
        <InstallAndUpdateCard />
      </div>
    </SettingsChrome>
  );
}
