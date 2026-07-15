"use client";

import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { useAuthenticatedUser } from "@/components/auth/AuthenticatedUserProvider";
import { SettingsChrome } from "@/components/settings/SettingsChrome";
import { fetchProfile, updateProfile, userFacingApiError } from "@/lib/apiClient";
import { markProfileMigration, needsProfileMigration, readLocalProgrammeProfile } from "@/lib/profileMigration";
import type { UserProfile, UserProfileUpdate } from "@/types/sync";

type ProfileForm = {
  full_name: string;
  height_cm: string;
  programme_start_date: string;
  starting_weight_kg: string;
  target_weight_min_kg: string;
  target_weight_max_kg: string;
  starting_waist_in: string;
  target_waist_in: string;
  preferred_rest_day: string;
  preferred_workout_time: string;
  timezone: string;
};

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function ProfileSettingsPage() {
  const user = useAuthenticatedUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchProfile().then((next) => {
      if (cancelled) return;
      setProfile(next);
      setForm(profileToForm(next, user.full_name));
    }).catch((err) => setError(userFacingApiError(err)));
    return () => { cancelled = true; };
  }, [user.full_name]);

  const migrationNeeded = useMemo(() => profile ? needsProfileMigration(profile, user.id) : false, [profile, user.id]);
  const localProgramme = readLocalProgrammeProfile();

  const save = async () => {
    if (!form || !profile) return;
    setError("");
    const validation = validateProfileForm(form);
    if (validation) {
      setError(validation);
      return;
    }
    const payload: UserProfileUpdate = {
      ...decimalPayload(form),
      full_name: form.full_name,
      timezone: form.timezone,
      unit_system: "metric",
      programme_start_date: form.programme_start_date || null,
      preferred_rest_day: form.preferred_rest_day || null,
      preferred_workout_time: form.preferred_workout_time || null,
      expected_version: profile.version
    };
    try {
      const next = await updateProfile(payload);
      setProfile(next);
      setForm(profileToForm(next, form.full_name));
      setStatus("Profile saved.");
    } catch (err) {
      setError(userFacingApiError(err));
    }
  };

  const useDeviceProfile = async () => {
    if (!profile || !localProgramme?.programmeStartDate) return;
    try {
      const next = await updateProfile({ programme_start_date: localProgramme.programmeStartDate, expected_version: profile.version });
      markProfileMigration(user.id, "use_device");
      setProfile(next);
      setForm(profileToForm(next, user.full_name));
      setStatus("Device programme date adopted.");
    } catch (err) {
      setError(userFacingApiError(err));
    }
  };

  return (
    <SettingsChrome title="Profile & Goals">
      {!form ? <p className="card p-4 text-suii-muted">Loading profile...</p> : (
        <div className="grid gap-4">
          {!profile?.profile_configured ? <p className="card border-suii-gold/40 p-4 text-suii-muted">Neutral setup state: add your height, set your weight target, and choose your recovery day when ready.</p> : null}
          {migrationNeeded ? (
            <section className="card border-suii-blue/40 p-4">
              <h2 className="display text-2xl text-suii-blue">Device programme profile found</h2>
              <p className="mt-2 text-suii-muted">This device has a local programme start date of {localProgramme?.programmeStartDate}. It will not overwrite the server profile unless you choose it.</p>
              <div className="mt-3 grid gap-2">
                <button className="focus-ring rounded-lg border border-white/15 px-4 py-3 display" onClick={() => { markProfileMigration(user.id, "keep_server"); setStatus("Server profile kept."); }}>Keep Server</button>
                <button className="focus-ring rounded-lg bg-suii-lime px-4 py-3 display text-black" onClick={useDeviceProfile}>Use Device Profile</button>
                <button className="focus-ring rounded-lg border border-suii-blue px-4 py-3 display text-suii-blue" onClick={() => markProfileMigration(user.id, "manual_review")}>Review Manually</button>
              </div>
            </section>
          ) : null}
          <section className="card grid gap-3 p-4">
            <Input label="Display name" value={form.full_name} onChange={(value) => setForm({ ...form, full_name: value })} />
            <Input label="Height in centimetres" inputMode="decimal" value={form.height_cm} onChange={(value) => setForm({ ...form, height_cm: value })} />
            <Input label="Programme start date" type="date" value={form.programme_start_date} onChange={(value) => setForm({ ...form, programme_start_date: value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Starting weight" inputMode="decimal" value={form.starting_weight_kg} onChange={(value) => setForm({ ...form, starting_weight_kg: value })} />
              <Input label="Target min" inputMode="decimal" value={form.target_weight_min_kg} onChange={(value) => setForm({ ...form, target_weight_min_kg: value })} />
              <Input label="Target max" inputMode="decimal" value={form.target_weight_max_kg} onChange={(value) => setForm({ ...form, target_weight_max_kg: value })} />
              <Input label="Starting waist" inputMode="decimal" value={form.starting_waist_in} onChange={(value) => setForm({ ...form, starting_waist_in: value })} />
              <Input label="Target waist" inputMode="decimal" value={form.target_waist_in} onChange={(value) => setForm({ ...form, target_waist_in: value })} />
              <Input label="Workout time" type="time" value={form.preferred_workout_time} onChange={(value) => setForm({ ...form, preferred_workout_time: value })} />
            </div>
            <label className="grid gap-1">
              <span className="text-sm font-bold text-suii-muted">Preferred recovery day</span>
              <select className="focus-ring h-12 rounded-lg border border-white/10 bg-black px-3" value={form.preferred_rest_day} onChange={(event) => setForm({ ...form, preferred_rest_day: event.target.value })}>
                <option value="">Choose your recovery day</option>
                {weekdays.map((day) => <option key={day}>{day}</option>)}
              </select>
            </label>
          </section>
          {error ? <p role="alert" className="card border-suii-amber/50 p-4 text-suii-amber">{error}</p> : null}
          <p aria-live="polite" className="text-sm text-suii-lime">{status}</p>
          <button className="focus-ring rounded-lg bg-suii-lime px-4 py-4 display text-2xl text-black" onClick={save}>Save Changes</button>
        </div>
      )}
    </SettingsChrome>
  );
}

function profileToForm(profile: UserProfile, fullName: string): ProfileForm {
  return {
    full_name: fullName || "Athlete",
    height_cm: String(profile.height_cm ?? ""),
    programme_start_date: profile.programme_start_date ?? "",
    starting_weight_kg: String(profile.starting_weight_kg ?? ""),
    target_weight_min_kg: String(profile.target_weight_min_kg ?? ""),
    target_weight_max_kg: String(profile.target_weight_max_kg ?? ""),
    starting_waist_in: String(profile.starting_waist_in ?? ""),
    target_waist_in: String(profile.target_waist_in ?? ""),
    preferred_rest_day: profile.preferred_rest_day ?? "",
    preferred_workout_time: profile.preferred_workout_time ?? "",
    timezone: profile.timezone || "Asia/Dhaka"
  };
}

function decimalPayload(form: ProfileForm) {
  return {
    height_cm: form.height_cm,
    starting_weight_kg: form.starting_weight_kg,
    target_weight_min_kg: form.target_weight_min_kg,
    target_weight_max_kg: form.target_weight_max_kg,
    starting_waist_in: form.starting_waist_in,
    target_waist_in: form.target_waist_in
  };
}

function validateProfileForm(form: ProfileForm) {
  const min = Number(form.target_weight_min_kg);
  const max = Number(form.target_weight_max_kg);
  if (Number.isFinite(min) && Number.isFinite(max) && min > max) return "Target minimum cannot be greater than target maximum.";
  if (form.programme_start_date && form.programme_start_date > new Date().toISOString().slice(0, 10)) return "Programme start date cannot be in the future.";
  return "";
}

function Input({ label, value, onChange, type = "text", inputMode }: { label: string; value: string; onChange: (value: string) => void; type?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"] }) {
  return (
    <label className="grid gap-1">
      <span className="text-sm font-bold text-suii-muted">{label}</span>
      <input className="focus-ring h-12 rounded-lg border border-white/10 bg-black px-3" type={type} inputMode={inputMode} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
