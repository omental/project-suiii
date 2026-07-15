export type ServiceWorkerSnapshot = {
  supported: boolean;
  registered: boolean;
  active: boolean;
  updateAvailable: boolean;
  error: string | null;
};

export type ServiceWorkerController = {
  getSnapshot: () => ServiceWorkerSnapshot;
  register: () => Promise<ServiceWorkerSnapshot>;
  activateUpdate: () => Promise<boolean>;
  clearOfflineCache: () => Promise<boolean>;
};

const workerPath = "/sw.js";
let controller: ServiceWorkerController | null = null;

export function createServiceWorkerController(): ServiceWorkerController {
  let registration: ServiceWorkerRegistration | null = null;
  let snapshot: ServiceWorkerSnapshot = {
    supported: typeof navigator !== "undefined" && "serviceWorker" in navigator,
    registered: false,
    active: false,
    updateAvailable: false,
    error: null
  };

  const setSnapshot = (patch: Partial<ServiceWorkerSnapshot>) => {
    snapshot = { ...snapshot, ...patch };
    window.dispatchEvent(new CustomEvent("project-suiii:pwa-state", { detail: snapshot }));
  };

  return {
    getSnapshot: () => snapshot,
    async register() {
      if (!snapshot.supported || typeof window === "undefined") return snapshot;
      if (registration) return snapshot;
      try {
        registration = await navigator.serviceWorker.register(workerPath, { scope: "/" });
        setSnapshot({ registered: true, active: Boolean(registration.active || navigator.serviceWorker.controller), error: null });
        registration.addEventListener("updatefound", () => {
          const installing = registration?.installing;
          installing?.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) setSnapshot({ updateAvailable: true });
            if (installing.state === "activated") setSnapshot({ active: true, updateAvailable: false });
          });
        });
        return snapshot;
      } catch (error) {
        setSnapshot({ error: error instanceof Error ? error.message : "Service worker registration failed" });
        return snapshot;
      }
    },
    async activateUpdate() {
      const waiting = registration?.waiting;
      if (!waiting) return false;
      waiting.postMessage({ type: "SKIP_WAITING" });
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true });
      });
      setSnapshot({ active: true, updateAvailable: false });
      return true;
    },
    async clearOfflineCache() {
      if (registration?.active) {
        registration.active.postMessage({ type: "CLEAR_OFFLINE_CACHE" });
        return true;
      }
      if (!("caches" in window)) return false;
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name.startsWith("project-suiii-")).map((name) => caches.delete(name)));
      return true;
    }
  };
}

export function getServiceWorkerController() {
  controller ??= createServiceWorkerController();
  return controller;
}

export function resetServiceWorkerControllerForTests() {
  controller = null;
}
