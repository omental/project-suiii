"use client";

import { Eye, Lock, Mail, ShieldCheck, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";
import { login, userFacingApiError } from "@/lib/apiClient";
import { buildMigrationPreview, hasCompletedMigration } from "@/lib/localMigration";
import { recordAuthenticatedAccount } from "@/lib/offlineAccount";
import { readSyncQueue } from "@/lib/syncQueue";

export function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await login(email, password, remember, "This device");
      recordAuthenticatedAccount(response.user.id);
      const queue = readSyncQueue();
      const needsMigration = !hasCompletedMigration(response.user.id, queue.deviceId) && buildMigrationPreview().total_records > 0;
      router.push(needsMigration ? "/sync/migrate" : "/");
    } catch (error) {
      setError(userFacingApiError(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-suii-black px-5 py-10 text-white">
      <div className="mx-auto max-w-[430px]">
        <section className="text-center">
          <div className="mx-auto mb-6 grid size-20 place-items-center text-suii-gold">
            <span className="display text-6xl">S</span>
          </div>
          <p className="display text-suii-gold">Project</p>
          <h1 className="display text-6xl leading-none text-suii-gold">SUIII</h1>
          <p className="display mt-2 text-sm text-suii-gold">Build Your Ultimate Form</p>
          <h2 className="display mt-12 text-6xl leading-none">Welcome Back</h2>
          <p className="mt-3 text-suii-muted">Your private training space continues here.</p>
        </section>

        <form onSubmit={submit} className="card mt-8 border-suii-lime/60 p-5">
          <h3 className="display flex items-center gap-3 text-2xl text-suii-lime"><Lock className="size-7" />Private Access</h3>
          <label className="mt-5 block">
            <span className="sr-only">Email</span>
            <span className="flex h-16 items-center gap-3 rounded-lg border border-suii-lime bg-black px-4">
              <Mail className="size-6 text-suii-muted" />
              <input className="min-w-0 flex-1 bg-transparent text-lg outline-none" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
            </span>
          </label>
          <label className="mt-3 block">
            <span className="sr-only">Password</span>
            <span className="flex h-16 items-center gap-3 rounded-lg border border-white/15 bg-black px-4">
              <Lock className="size-6 text-suii-muted" />
              <input className="min-w-0 flex-1 bg-transparent text-lg outline-none" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
              <Eye className="size-6 text-suii-muted" aria-hidden="true" />
            </span>
          </label>
          <div className="mt-4 flex items-center justify-between gap-3">
            <label className="flex items-center gap-3 text-sm">
              <input className="size-6 accent-suii-lime" type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
              Keep me signed in on this device
            </label>
            <span className="text-sm font-black uppercase text-suii-lime">Forgot password?</span>
          </div>
          {error ? <p className="mt-3 text-sm text-suii-amber" role="alert">{error}</p> : null}
          <button className="focus-ring mt-5 w-full rounded-lg bg-suii-lime px-4 py-4 display text-3xl text-black" disabled={busy}>{busy ? "Signing in" : "Sign In"} ›</button>
          <div className="mt-5 flex items-center gap-3 rounded-lg border border-white/10 p-4 text-sm text-suii-muted">
            <ShieldCheck className="size-10 text-suii-lime" />
            <p><span className="text-white">Your meals, workouts and progress stay private.</span><br />Secure session · Encrypted connection</p>
          </div>
        </form>

        <section className="card mt-5 flex items-center gap-4 border-suii-gold/40 p-5">
          <Smartphone className="size-10 text-suii-gold" />
          <div>
            <p className="display text-xl text-suii-gold">Install Project SUIII</p>
            <p className="text-sm text-suii-muted">Add it to your home screen after signing in.</p>
          </div>
        </section>
        <p className="display mt-10 text-center text-suii-gold">Private Fitness System</p>
        <p className="mt-2 text-center text-suii-muted">Private account access</p>
      </div>
    </main>
  );
}
