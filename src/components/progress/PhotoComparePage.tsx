"use client";

import { Lock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { defaultProgressState, readProgressState } from "@/lib/progressRepository";
import type { ProgressPose } from "@/types/progress";

export function PhotoComparePage() {
  const [state, setState] = useState(defaultProgressState);
  const [pose, setPose] = useState<ProgressPose>("front");
  const [mode, setMode] = useState<"side" | "overlay">("side");
  const [opacity, setOpacity] = useState(50);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(readProgressState());
  }, []);
  const photos = useMemo(() => Object.values(state.photos).filter((photo) => photo.pose === pose && photo.previewUrl), [state, pose]);
  const first = photos[0];
  const second = photos[photos.length - 1];
  return (
    <AppShell>
      <div className="px-4 py-5">
        <h1 className="display text-5xl">Compare Photos</h1>
        <p className="mt-2 text-suii-muted"><Lock className="inline size-4" /> Private comparison only. No public export.</p>
        <div className="mt-5 grid grid-cols-3 rounded-lg border border-white/15">{(["front", "side", "back"] as ProgressPose[]).map((item) => <button key={item} className={`display ${pose === item ? "bg-suii-lime text-black" : "text-suii-muted"}`} onClick={() => setPose(item)}>{item}</button>)}</div>
        <div className="mt-3 grid grid-cols-2 rounded-lg border border-white/15">{(["side", "overlay"] as const).map((item) => <button key={item} className={`display ${mode === item ? "bg-suii-blue text-black" : "text-suii-muted"}`} onClick={() => setMode(item)}>{item}</button>)}</div>
        <section className="card mt-4 p-4">
          {photos.length < 2 ? <p className="text-suii-muted">Add at least two {pose} photos from different check-ins to compare.</p> : mode === "side" ? (
            <div className="grid grid-cols-2 gap-3"><Photo img={first.previewUrl!} label="Earlier" /><Photo img={second.previewUrl!} label="Later" /></div>
          ) : (
            <div className="relative min-h-80 overflow-hidden rounded border border-white/10"><img src={first.previewUrl!} alt="Earlier progress" className="absolute inset-0 h-full w-full object-contain" /><img src={second.previewUrl!} alt="Later progress overlay" className="absolute inset-0 h-full w-full object-contain" style={{ opacity: opacity / 100 }} /></div>
          )}
        </section>
        <label className="mt-4 block display text-suii-muted">Overlay opacity<input className="mt-2 w-full" type="range" min={0} max={100} value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} /></label>
        <p className="mt-4 text-suii-muted">Images preserve aspect ratio. No filters, reshaping or body-fat inference are applied.</p>
      </div>
    </AppShell>
  );
}

function Photo({ img, label }: { img: string; label: string }) {
  return <figure><img src={img} alt={`${label} progress`} className="aspect-[3/4] rounded border border-white/10 object-contain" /><figcaption className="mt-2 display text-center text-suii-muted">{label}</figcaption></figure>;
}
