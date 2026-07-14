"use client";

import { Camera, HeartPulse, Ruler, Scale } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ProgressChrome } from "@/components/progress/ProgressChrome";
import { validateMeasurementInput } from "@/lib/progressAnalytics";
import { defaultProgressState, readProgressState, startOrUpdateDraftCheckIn, writeProgressState } from "@/lib/progressRepository";
import type { DigestionLevel, ProgressLocalState, WellbeingLevel } from "@/types/progress";

export function WeeklyCheckInPage() {
  const [state, setState] = useState<ProgressLocalState>(defaultProgressState);
  const [weightKg, setWeightKg] = useState("76.8");
  const [waistIn, setWaistIn] = useState("36.9");
  const [chestIn, setChestIn] = useState("");
  const [armIn, setArmIn] = useState("");
  const [thighIn, setThighIn] = useState("");
  const [energy, setEnergy] = useState<WellbeingLevel>("normal");
  const [hunger, setHunger] = useState<WellbeingLevel>("normal");
  const [digestion, setDigestion] = useState<DigestionLevel>("some_gas");
  const [sleep, setSleep] = useState("430");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(readProgressState());
  }, []);

  function saveDraft() {
    const payload = {
      weightKg: weightKg ? Number(weightKg) : null,
      waistIn: waistIn ? Number(waistIn) : null,
      chestIn: chestIn ? Number(chestIn) : null,
      armIn: armIn ? Number(armIn) : null,
      thighIn: thighIn ? Number(thighIn) : null
    };
    const validation = validateMeasurementInput(payload);
    if (validation) {
      setError(validation);
      return null;
    }
    const next = startOrUpdateDraftCheckIn(state, { ...payload, energy, hunger, digestion, averageSleepMinutes: sleep ? Number(sleep) : null, privateNote: note });
    writeProgressState(next);
    setState(next);
    setError("");
    return next.currentDraftCheckInId;
  }

  return (
    <ProgressChrome title="Week Check-In" step="Step 1 of 3 · Measure" percent="33%">
      <p className="display mt-6 text-suii-gold">Saturday morning</p>
      <h1 className="display mt-2 text-5xl leading-none">Measure Your Progress</h1>
      <p className="mt-2 text-suii-muted">After using the toilet, before food or water. Use the same scale and tape position each week.</p>
      {error ? <p role="alert" className="mt-4 rounded border border-red-400 p-3 text-red-200">{error}</p> : null}
      <section className="card mt-5 p-4">
        <NumberField icon={<Scale />} label="Weight" value={weightKg} setValue={setWeightKg} unit="kg" />
        <NumberField icon={<Ruler />} label="Waist at navel" value={waistIn} setValue={setWaistIn} unit="in" help="Tape level, at navel, not pulled excessively tight." />
      </section>
      <section className="card mt-4 p-4">
        <h2 className="display flex items-center gap-2 text-2xl"><Ruler className="text-suii-gold" /> Other Measurements · Optional</h2>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <MiniField label="Chest" value={chestIn} setValue={setChestIn} />
          <MiniField label="Arm" value={armIn} setValue={setArmIn} />
          <MiniField label="Thigh" value={thighIn} setValue={setThighIn} />
        </div>
      </section>
      <section className="card mt-4 p-4">
        <h2 className="display flex items-center gap-2 text-2xl"><HeartPulse className="text-suii-gold" /> How Was This Week?</h2>
        <Segment label="Energy" value={energy} setValue={setEnergy} options={["low", "normal", "high"]} />
        <Segment label="Hunger" value={hunger} setValue={setHunger} options={["low", "normal", "high"]} />
        <Segment label="Digestion" value={digestion} setValue={setDigestion} options={["good", "some_gas", "difficult"]} />
        <label className="mt-3 block display text-suii-muted">Average Sleep Minutes<input className="mt-2 w-full rounded-lg border border-white/15 bg-black p-3 text-white" value={sleep} onChange={(e) => setSleep(e.target.value)} inputMode="numeric" /></label>
        <textarea className="mt-3 min-h-24 w-full rounded-lg border border-white/15 bg-black p-3" placeholder="Add a private note" value={note} onChange={(event) => setNote(event.target.value)} />
      </section>
      <section className="card mt-4 p-4">
        <h2 className="display flex items-center gap-2 text-2xl"><Camera className="text-suii-gold" /> Progress Photos</h2>
        <p className="mt-2 text-suii-muted">Photos are private and never shown publicly. You can skip any pose.</p>
        <button className="focus-ring mt-4 w-full rounded-lg bg-suii-lime p-4 display text-black" onClick={() => { const draftId = saveDraft(); if (draftId) window.location.href = "/progress/photos"; }}>Continue to Photos</button>
        <button className="focus-ring mt-3 w-full rounded-lg border border-suii-lime p-4 display text-suii-lime" onClick={() => { const draftId = saveDraft(); if (draftId) window.location.href = `/progress/review/${draftId}`; }}>Save Without Photos</button>
      </section>
    </ProgressChrome>
  );
}

function NumberField({ icon, label, value, setValue, unit, help }: { icon: React.ReactNode; label: string; value: string; setValue: (value: string) => void; unit: string; help?: string }) {
  return <label className="mb-4 block"><span className="display flex items-center gap-2 text-2xl">{icon}{label}</span><span className="mt-3 flex rounded-lg border border-suii-lime bg-black"><input className="w-full bg-transparent p-4 display text-5xl" value={value} onChange={(event) => setValue(event.target.value)} inputMode="decimal" /><span className="self-center pr-4 display text-2xl text-suii-muted">{unit}</span></span>{help ? <span className="mt-2 block text-suii-blue">{help}</span> : null}</label>;
}

function MiniField({ label, value, setValue }: { label: string; value: string; setValue: (value: string) => void }) {
  return <label className="display text-suii-muted">{label}<input className="mt-2 w-full rounded-lg border border-white/15 bg-black p-3 text-white" value={value} onChange={(event) => setValue(event.target.value)} inputMode="decimal" placeholder="in" /></label>;
}

function Segment<T extends string>({ label, value, setValue, options }: { label: string; value: T; setValue: (value: T) => void; options: T[] }) {
  return <div className="mt-3 grid grid-cols-[88px_1fr] items-center gap-2"><p className="display">{label}</p><div className="grid grid-cols-3 rounded-lg border border-white/15">{options.map((option) => <button type="button" key={option} className={`display ${value === option ? "bg-suii-lime text-black" : "text-suii-muted"}`} onClick={() => setValue(option)}>{option.replace("_", " ")}</button>)}</div></div>;
}
