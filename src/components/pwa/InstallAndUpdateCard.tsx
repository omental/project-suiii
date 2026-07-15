"use client";

import { useEffect, useState } from "react";
import { usePwaStatus } from "@/components/pwa/PwaProvider";
import { storageKeyFor } from "@/lib/accountStorage";
import { dismissInstallPrompt, getInstallState, runInstallPrompt, type BeforeInstallPromptEvent, type InstallState } from "@/lib/installPrompt";
import { readSyncQueue } from "@/lib/syncQueue";

export function InstallAndUpdateCard() {
  const pwa = usePwaStatus();
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installState, setInstallState] = useState<InstallState>(() => (typeof window === "undefined" ? "not_supported" : getInstallState(null)));
  const [message, setMessage] = useState("");

  useEffect(() => {
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setPrompt(event as BeforeInstallPromptEvent);
      setInstallState("install_available");
    };
    const installed = () => {
      setPrompt(null);
      setInstallState("installed");
      setMessage("Project SUIII is installed.");
    };
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  const install = async () => {
    if (!prompt) return;
    const outcome = await runInstallPrompt(prompt);
    setPrompt(null);
    setInstallState(outcome === "accepted" ? "installed" : "dismissed");
    setMessage(outcome === "accepted" ? "Install started." : "Installation dismissed.");
  };

  const dismiss = () => {
    dismissInstallPrompt();
    setInstallState("dismissed");
  };

  const update = async () => {
    const activeWorkout = window.localStorage.getItem(storageKeyFor("training"))?.includes("\"activeSessionId\":null") === false;
    if (activeWorkout) {
      setMessage("Update after workout. Your active workout stays saved on this device.");
      return;
    }
    const activated = await pwa.activateUpdate();
    if (activated) window.location.reload();
  };

  const queue = readSyncQueue();

  return (
    <section className="card p-4">
      <h2 className="display text-2xl">PWA & Offline</h2>
      <p className="mt-2 text-sm text-suii-muted">Mode: {installState.replace("_", " ")} - Service worker {pwa.serviceWorker.active ? "active" : pwa.serviceWorker.supported ? "available" : "unsupported"}</p>
      <p className="mt-1 text-sm text-suii-muted">Connection: {pwa.connectivity.replace("_", " ")} - Pending {queue.pending.length} - Failed {queue.failed.length}</p>
      {installState === "install_available" ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="focus-ring rounded-lg bg-suii-lime px-3 py-3 font-black uppercase text-black" onClick={install}>Install App</button>
          <button className="focus-ring rounded-lg border border-white/10 px-3 py-3 font-black uppercase text-suii-muted" onClick={dismiss}>Later</button>
        </div>
      ) : null}
      {installState === "browser" ? <p className="mt-3 text-sm text-suii-blue">On iOS, use Share, then Add to Home Screen. Browsers do not expose a programmatic iOS install prompt.</p> : null}
      {pwa.serviceWorker.updateAvailable ? (
        <div className="mt-3 rounded-lg border border-suii-blue/40 p-3">
          <p className="display text-suii-blue">An update is ready.</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button className="focus-ring rounded-lg bg-suii-lime px-3 py-3 font-black uppercase text-black" onClick={update}>Update now</button>
            <button className="focus-ring rounded-lg border border-white/10 px-3 py-3 font-black uppercase text-suii-muted" onClick={() => setMessage("Update deferred for this session.")}>Later</button>
          </div>
        </div>
      ) : null}
      {pwa.serviceWorker.error ? <p className="mt-2 text-sm text-suii-gold">{pwa.serviceWorker.error}</p> : null}
      {message ? <p className="mt-2 text-sm text-suii-lime" aria-live="polite">{message}</p> : null}
    </section>
  );
}
