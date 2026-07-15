"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { classifyConnectivity, maybeRunReconnectSync, type ConnectivityKind } from "@/lib/connectivity";
import { getServiceWorkerController, type ServiceWorkerSnapshot } from "@/lib/pwaServiceWorker";
import { readSyncQueue } from "@/lib/syncQueue";

type PwaContextValue = {
  serviceWorker: ServiceWorkerSnapshot;
  connectivity: ConnectivityKind;
  activateUpdate: () => Promise<boolean>;
  clearOfflineCache: () => Promise<boolean>;
};

const fallbackSnapshot: ServiceWorkerSnapshot = { supported: false, registered: false, active: false, updateAvailable: false, error: null };
const PwaContext = createContext<PwaContextValue>({
  serviceWorker: fallbackSnapshot,
  connectivity: "connection_unknown",
  activateUpdate: async () => false,
  clearOfflineCache: async () => false
});

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const controller = useMemo(() => getServiceWorkerController(), []);
  const [serviceWorker, setServiceWorker] = useState(controller.getSnapshot());
  const [browserOnline, setBrowserOnline] = useState(true);
  const [serverReachable, setServerReachable] = useState<boolean | null>(null);

  useEffect(() => {
    const listener = (event: Event) => setServiceWorker((event as CustomEvent<ServiceWorkerSnapshot>).detail);
    window.addEventListener("project-suiii:pwa-state", listener);
    void controller.register().then(setServiceWorker);
    return () => window.removeEventListener("project-suiii:pwa-state", listener);
  }, [controller]);

  useEffect(() => {
    const update = () => {
      const online = navigator.onLine;
      setBrowserOnline(online);
      if (!online) setServerReachable(false);
      if (online) void maybeRunReconnectSync();
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const queue = readSyncQueue();
  const connectivity = classifyConnectivity(browserOnline, serverReachable, queue.pending.length, queue.failed.length);

  return (
    <PwaContext.Provider value={{ serviceWorker, connectivity, activateUpdate: controller.activateUpdate, clearOfflineCache: controller.clearOfflineCache }}>
      {children}
      <span className="sr-only" data-connectivity={connectivity} data-pending={queue.pending.length} data-failed={queue.failed.length}>PWA status {connectivity}</span>
    </PwaContext.Provider>
  );
}

export function usePwaStatus() {
  return useContext(PwaContext);
}
