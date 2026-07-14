"use client";

import { Camera, Grid3X3, Lock, Timer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ProgressChrome } from "@/components/progress/ProgressChrome";
import { completeDraftCheckIn, defaultProgressState, readProgressState, saveLocalPhoto, writeProgressState } from "@/lib/progressRepository";
import type { ProgressLocalState, ProgressPose } from "@/types/progress";

const poses: ProgressPose[] = ["front", "side", "back"];

export function ProgressPhotosPage() {
  const [state, setState] = useState<ProgressLocalState>(defaultProgressState);
  const [pose, setPose] = useState<ProgressPose>("front");
  const [preview, setPreview] = useState<string | null>(null);
  const [cameraMessage, setCameraMessage] = useState("Camera not started. File input is always available.");
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(readProgressState());
    const video = videoRef.current;
    return () => {
      if (preview) URL.revokeObjectURL(preview);
      video?.srcObject && (video.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
    };
  }, [preview]);

  async function startCamera() {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraMessage("Camera is not supported here. Choose an image from the device.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraMessage("Camera active. Stop it before leaving capture mode.");
    } catch {
      setCameraMessage("Camera permission denied. Choose an image from the device.");
    }
  }

  function chooseFile(file: File | null) {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  function handlePhoto(skip = false) {
    const checkInId = state.currentDraftCheckInId ?? Object.values(state.checkIns).find((item) => item.status === "draft")?.id;
    if (!checkInId) {
      window.location.href = "/progress/check-in";
      return;
    }
    const next = skip ? state : saveLocalPhoto(state, checkInId, pose, preview);
    const poseIndex = poses.indexOf(pose);
    if (poseIndex < poses.length - 1) {
      writeProgressState(next);
      setState(next);
      setPose(poses[poseIndex + 1]);
      setPreview(null);
      return;
    }
    const completed = completeDraftCheckIn(next, checkInId);
    writeProgressState(completed);
    window.location.href = `/progress/review/${checkInId}`;
  }

  return (
    <ProgressChrome title="Week Check-In" step="Step 2 of 3 · Photos" percent="66%">
      <h1 className="display mt-8 text-5xl leading-none">Capture Consistently</h1>
      <p className="mt-2 text-suii-muted">Same place, distance, lighting and posture each week. Upload only after confirming the selected capture.</p>
      <div className="mt-6 grid grid-cols-3 rounded-lg border border-white/15">
        {poses.map((item) => <button key={item} className={`display ${pose === item ? "bg-suii-lime text-black" : "text-suii-muted"}`} onClick={() => setPose(item)}>{item}</button>)}
      </div>
      <section className="card mt-4 p-4">
        <div className="relative min-h-[380px] rounded-lg border border-white/15 bg-black/40 p-4 text-center">
          <video ref={videoRef} className="mx-auto max-h-80 w-full rounded object-contain" autoPlay muted playsInline />
          {preview ? <img src={preview} alt={`${pose} selected preview`} className="absolute inset-4 h-[calc(100%-2rem)] w-[calc(100%-2rem)] rounded object-contain" /> : <div className="flex h-72 items-center justify-center border border-dashed border-suii-blue text-suii-muted"><span className="display text-2xl">{pose} alignment guide</span></div>}
          <div className="pointer-events-none absolute inset-6 border border-dashed border-suii-blue/70" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button className="focus-ring rounded-lg border border-suii-lime p-3 display text-suii-lime" onClick={startCamera}><Camera className="inline" /> Camera</button>
          <label className="focus-ring rounded-lg border border-suii-blue p-3 text-center display text-suii-blue">Choose From Device<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/*" capture="user" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} /></label>
        </div>
        <p className="mt-3 text-suii-muted">{cameraMessage}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-suii-muted"><p><Timer className="inline" /> 3 sec timer where supported</p><p><Grid3X3 className="inline" /> Alignment grid</p></div>
      </section>
      <section className="card mt-4 p-4">
        <p className="display text-suii-gold"><Lock className="inline" /> Private by Design</p>
        <p className="mt-2 text-suii-muted">Photos remain private, are excluded from app caches, and are not considered backed up until server upload succeeds.</p>
      </section>
      <button className="focus-ring mt-4 w-full rounded-lg bg-suii-lime p-4 display text-black disabled:opacity-50" disabled={!preview} onClick={() => handlePhoto(false)}>Use This Photo</button>
      <button className="focus-ring mt-3 w-full rounded-lg border border-white/20 p-4 display text-white" onClick={() => handlePhoto(true)}>Skip {pose} Photo</button>
    </ProgressChrome>
  );
}
