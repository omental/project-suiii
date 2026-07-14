"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { reportDownloadUrl, requestProgressReport } from "@/lib/apiClient";
import { addDays } from "@/lib/dhakaClock";
import { todayISO } from "@/lib/progressAnalytics";

export function ReportsPage() {
  const [message, setMessage] = useState("Reports are generated privately and do not include photos by default.");
  const [download, setDownload] = useState<string | null>(null);
  async function generate(kind: "weekly" | "monthly") {
    const end = todayISO();
    const start = addDays(end, kind === "weekly" ? -6 : -27);
    try {
      const report = await requestProgressReport(kind, start, end);
      setDownload(reportDownloadUrl(report.id));
      setMessage(`${kind} report generated. Authenticated download is ready.`);
    } catch (error) {
      setMessage(error instanceof Error ? `${kind} report queued locally: ${error.message}` : `${kind} report queued locally.`);
    }
  }
  return (
    <AppShell>
      <div className="px-4 py-5">
        <h1 className="display text-5xl">Reports</h1>
        <p className="mt-2 text-suii-muted">Weekly and monthly PDFs include measurements, adherence, smoking trends, milestones, insights and conservative forecasts.</p>
        <section className="card mt-5 p-4">
          <h2 className="display text-2xl">Privacy</h2>
          <p className="mt-2 text-suii-muted">No photos, passwords, sessions or internal IDs are included. Downloads use authenticated private/no-store backend routes.</p>
        </section>
        <button className="focus-ring mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-suii-lime p-4 display text-black" onClick={() => generate("weekly")}><Download /> Generate Weekly PDF</button>
        <button className="focus-ring mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-suii-gold p-4 display text-suii-gold" onClick={() => generate("monthly")}><Download /> Generate Monthly PDF</button>
        <p role="status" className="mt-4 rounded border border-white/10 p-3 text-suii-muted">{message}</p>
        {download ? <a className="focus-ring mt-4 block rounded-lg border border-suii-blue p-4 text-center display text-suii-blue" href={download}>Open Authenticated Download</a> : null}
      </div>
    </AppShell>
  );
}
