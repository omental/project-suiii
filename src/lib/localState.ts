import { defaultLocalState } from "@/data/dashboard";
import type { DashboardLocalState } from "@/types/dashboard";

const storageKey = "project-suiii:phase-1-dashboard";

function isLocalState(value: unknown): value is DashboardLocalState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<DashboardLocalState>;
  return (
    candidate.version === 1 &&
    Array.isArray(candidate.waterIncrementsMl) &&
    Array.isArray(candidate.cigaretteIncrements) &&
    Array.isArray(candidate.completedTimelineIds) &&
    typeof candidate.weighing === "object" &&
    candidate.weighing !== null
  );
}

export function readLocalState(): DashboardLocalState {
  if (typeof window === "undefined") {
    return defaultLocalState;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return defaultLocalState;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!isLocalState(parsed)) {
      return defaultLocalState;
    }

    return {
      ...defaultLocalState,
      ...parsed,
      weighing: {
        ...defaultLocalState.weighing,
        ...parsed.weighing
      }
    };
  } catch {
    return defaultLocalState;
  }
}

export function writeLocalState(state: DashboardLocalState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(state));
}

export function resetLocalStateForTests() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(storageKey);
  }
}
