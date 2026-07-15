const dismissalKey = "project-suiii:pwa-install-dismissed-at";

export type InstallState = "install_available" | "installed" | "not_supported" | "browser" | "dismissed";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function getInstallState(promptEvent: BeforeInstallPromptEvent | null, now = Date.now()): InstallState {
  if (isStandaloneDisplay()) return "installed";
  if (typeof window === "undefined") return "not_supported";
  const dismissedAt = Number(window.localStorage.getItem(dismissalKey) ?? 0);
  if (dismissedAt && now - dismissedAt < 7 * 24 * 60 * 60 * 1000) return "dismissed";
  if (promptEvent) return "install_available";
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ? "browser" : "not_supported";
}

export function dismissInstallPrompt(now = Date.now()) {
  if (typeof window !== "undefined") window.localStorage.setItem(dismissalKey, String(now));
}

export async function runInstallPrompt(event: BeforeInstallPromptEvent) {
  await event.prompt();
  const choice = await event.userChoice;
  if (choice.outcome === "dismissed") dismissInstallPrompt();
  return choice.outcome;
}
