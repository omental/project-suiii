"use client";

import { useEffect, useState } from "react";
import type React from "react";
import { equipmentLabels } from "@/data/training";
import { fetchProfile, updateProfile, userFacingApiError } from "@/lib/apiClient";
import type { EquipmentType } from "@/types/training";
import type { UserProfile } from "@/types/sync";
import { SettingsChrome } from "./SettingsChrome";

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const equipmentIds = Object.keys(equipmentLabels) as EquipmentType[];

export function TrainingSettingsPage() {
  const { profile, setProfile, message, error, setMessage, setError } = useProfileLoader();
  const selected = new Set((profile?.equipment_csv ?? "").split(",").filter(Boolean));
  const saveEquipment = async (equipment: string[]) => {
    if (!profile) return;
    try {
      const next = await updateProfile({ equipment, expected_version: profile.version });
      setProfile(next);
      setMessage("Training preferences saved.");
    } catch (err) {
      setError(userFacingApiError(err));
    }
  };
  return (
    <SettingsChrome title="Training Preferences">
      {!profile ? <Loading /> : (
        <div className="grid gap-4">
          <section className="card p-4">
            <h2 className="display text-2xl">Equipment</h2>
            <div className="mt-3 grid gap-2">
              {equipmentIds.map((id) => (
                <label key={id} className="flex min-h-12 items-center gap-3 rounded border border-white/10 px-3">
                  <input type="checkbox" className="size-5 accent-suii-lime" checked={selected.has(id)} onChange={(event) => {
                    const next = new Set(selected);
                    if (event.target.checked) next.add(id); else next.delete(id);
                    void saveEquipment([...next]);
                  }} />
                  <span>{equipmentLabels[id]}</span>
                </label>
              ))}
            </div>
          </section>
          <SettingsCard>
            <Select label="Weekly rest day" value={profile.preferred_rest_day ?? ""} options={["", ...weekdays]} onChange={(value) => save(profile, setProfile, setMessage, setError, { preferred_rest_day: value || null })} />
            <Input label="Preferred workout time" type="time" value={profile.preferred_workout_time ?? ""} onChange={(value) => save(profile, setProfile, setMessage, setError, { preferred_workout_time: value || null })} />
            <Toggle label="Badminton enabled" checked={profile.badminton_enabled} onChange={(value) => save(profile, setProfile, setMessage, setError, { badminton_enabled: value })} />
            <Input label="Badminton start" type="time" value={profile.badminton_start_time ?? ""} onChange={(value) => save(profile, setProfile, setMessage, setError, { badminton_start_time: value || null })} />
            <Input label="Badminton end" type="time" value={profile.badminton_end_time ?? ""} onChange={(value) => save(profile, setProfile, setMessage, setError, { badminton_end_time: value || null })} />
            <Select label="Default intensity" value={profile.badminton_intensity ?? ""} options={["", "easy", "moderate", "hard"]} onChange={(value) => save(profile, setProfile, setMessage, setError, { badminton_intensity: value as "easy" | "moderate" | "hard" || null })} />
            <Toggle label="Show exercise illustrations" checked={profile.show_exercise_illustrations} onChange={(value) => save(profile, setProfile, setMessage, setError, { show_exercise_illustrations: value })} />
            <Toggle label="Sound/vibration for rest timer" checked={profile.rest_timer_sound} onChange={(value) => save(profile, setProfile, setMessage, setError, { rest_timer_sound: value })} />
            <Input label="Default rest seconds" inputMode="numeric" value={String(profile.default_rest_seconds ?? "")} onChange={(value) => save(profile, setProfile, setMessage, setError, { default_rest_seconds: value ? Number(value) : null })} />
            <Toggle label="Exercise substitutions enabled" checked={profile.exercise_substitutions_enabled} onChange={(value) => save(profile, setProfile, setMessage, setError, { exercise_substitutions_enabled: value })} />
          </SettingsCard>
          <Status error={error} message={message} />
        </div>
      )}
    </SettingsChrome>
  );
}

export function NutritionSettingsPage() {
  const { profile, setProfile, message, error, setMessage, setError } = useProfileLoader();
  return (
    <SettingsChrome title="Nutrition Targets">
      {!profile ? <Loading /> : (
        <div className="grid gap-4">
          <p className="card border-suii-blue/40 p-4 text-suii-muted">Targets are personal planning values and are not medical advice. Historical meal records are not rewritten after target changes.</p>
          <SettingsCard>
            <Input label="Daily calories" inputMode="numeric" value={String(profile.calorie_target)} onChange={(value) => save(profile, setProfile, setMessage, setError, { calorie_target: Number(value) })} />
            <Input label="Daily protein grams" inputMode="numeric" value={String(profile.protein_target_g)} onChange={(value) => save(profile, setProfile, setMessage, setError, { protein_target_g: Number(value) })} />
            <Input label="Daily water millilitres" inputMode="numeric" value={String(profile.water_target_ml)} onChange={(value) => save(profile, setProfile, setMessage, setError, { water_target_ml: Number(value) })} />
            <Input label="Planned meals" inputMode="numeric" value={String(profile.planned_meals ?? "")} onChange={(value) => save(profile, setProfile, setMessage, setError, { planned_meals: value ? Number(value) : null })} />
            <Toggle label="Kitchen-scale workflow" checked={profile.kitchen_scale_enabled} onChange={(value) => save(profile, setProfile, setMessage, setError, { kitchen_scale_enabled: value })} />
            <Select label="Measurement unit" value={profile.measurement_unit} options={["metric", "imperial"]} onChange={(value) => save(profile, setProfile, setMessage, setError, { measurement_unit: value as "metric" | "imperial" })} />
            <Toggle label="Meal reminders" checked={profile.meal_reminders_enabled} onChange={(value) => save(profile, setProfile, setMessage, setError, { meal_reminders_enabled: value })} />
          </SettingsCard>
          <Status error={error} message={message} />
        </div>
      )}
    </SettingsChrome>
  );
}

export function RecoverySettingsPage() {
  const { profile, setProfile, message, error, setMessage, setError } = useProfileLoader();
  return (
    <SettingsChrome title="Recovery & Habits">
      {!profile ? <Loading /> : (
        <div className="grid gap-4">
          <SettingsCard>
            <Input label="Sleep target hours" inputMode="decimal" value={profile.sleep_target_minutes ? String(profile.sleep_target_minutes / 60) : ""} onChange={(value) => save(profile, setProfile, setMessage, setError, { sleep_target_minutes: value ? Math.round(Number(value) * 60) : null })} />
            <Toggle label="Readiness check-in enabled" checked={profile.readiness_check_in_enabled} onChange={(value) => save(profile, setProfile, setMessage, setError, { readiness_check_in_enabled: value })} />
            <Select label="Weekly check-in day" value={profile.weekly_check_in_day ?? ""} options={["", ...weekdays]} onChange={(value) => save(profile, setProfile, setMessage, setError, { weekly_check_in_day: value || null })} />
          </SettingsCard>
          <section className="card grid gap-3 p-4">
            <h2 className="display text-2xl">Smoking Reduction</h2>
            <p className="text-sm text-suii-muted">Use daily count, reduction target, delay target and progress language. No judgment, no shaming.</p>
            <Toggle label="Daily count tracking" checked={profile.smoking_tracking_enabled} onChange={(value) => save(profile, setProfile, setMessage, setError, { smoking_tracking_enabled: value })} />
            <Input label="Current cigarette baseline" inputMode="numeric" value={String(profile.cigarette_baseline ?? "")} onChange={(value) => save(profile, setProfile, setMessage, setError, { cigarette_baseline: value ? Number(value) : null })} />
            <Input label="Reduction target" inputMode="numeric" value={String(profile.cigarette_reduction_target ?? "")} onChange={(value) => save(profile, setProfile, setMessage, setError, { cigarette_reduction_target: value ? Number(value) : null })} />
            <Input label="Delay target minutes" inputMode="numeric" value={String(profile.first_cigarette_delay_minutes ?? "")} onChange={(value) => save(profile, setProfile, setMessage, setError, { first_cigarette_delay_minutes: value ? Number(value) : null })} />
          </section>
          <Status error={error} message={message} />
        </div>
      )}
    </SettingsChrome>
  );
}

function useProfileLoader() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    fetchProfile().then(setProfile).catch((err) => setError(userFacingApiError(err)));
  }, []);
  return { profile, setProfile, message, error, setMessage, setError };
}

async function save(profile: UserProfile, setProfile: (profile: UserProfile) => void, setMessage: (value: string) => void, setError: (value: string) => void, payload: Record<string, unknown>) {
  try {
    setError("");
    const next = await updateProfile({ ...payload, expected_version: profile.version });
    setProfile(next);
    setMessage("Saved.");
  } catch (err) {
    setError(userFacingApiError(err));
  }
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  return <section className="card grid gap-3 p-4">{children}</section>;
}

function Loading() {
  return <p className="card p-4 text-suii-muted">Loading settings...</p>;
}

function Status({ error, message }: { error: string; message: string }) {
  return <p aria-live="polite" role={error ? "alert" : "status"} className={error ? "text-suii-amber" : "text-suii-lime"}>{error || message}</p>;
}

function Input({ label, value, onChange, type = "text", inputMode }: { label: string; value: string; onChange: (value: string) => void; type?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"] }) {
  return <label className="grid gap-1"><span className="text-sm font-bold text-suii-muted">{label}</span><input className="focus-ring h-12 rounded-lg border border-white/10 bg-black px-3" type={type} inputMode={inputMode} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="grid gap-1"><span className="text-sm font-bold text-suii-muted">{label}</span><select className="focus-ring h-12 rounded-lg border border-white/10 bg-black px-3" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{option || "Not set"}</option>)}</select></label>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex min-h-12 items-center justify-between gap-3 rounded border border-white/10 px-3"><span>{label}</span><input type="checkbox" className="size-5 accent-suii-lime" checked={checked} onChange={(event) => onChange(event.target.checked)} /></label>;
}
