import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BottomNavigation } from "@/components/BottomNavigation";
import { SettingsHub } from "@/components/settings/SettingsHub";
import { ProfileSettingsPage } from "@/components/settings/ProfileSettingsPage";
import { DataPrivacyPage } from "@/components/settings/DataPrivacyPage";
import { ConflictCenterPage } from "@/components/settings/ConflictCenterPage";
import { DevicesSettingsPage } from "@/components/settings/DevicesSettingsPage";
import { resetSyncQueueForTests } from "@/lib/syncQueue";

const apiProfile = {
  user_id: "user-1",
  height_cm: "170",
  starting_weight_kg: "70",
  target_weight_min_kg: "65",
  target_weight_max_kg: "70",
  starting_waist_in: "34",
  target_waist_in: "32",
  calorie_target: 2000,
  protein_target_g: 120,
  water_target_ml: 2500,
  timezone: "Asia/Dhaka",
  unit_system: "metric",
  programme_start_date: null,
  profile_configured: false,
  preferred_rest_day: null,
  preferred_workout_time: null,
  equipment_csv: null,
  badminton_enabled: true,
  badminton_days_csv: null,
  badminton_start_time: null,
  badminton_end_time: null,
  badminton_intensity: null,
  show_exercise_illustrations: true,
  rest_timer_sound: true,
  default_rest_seconds: null,
  exercise_substitutions_enabled: true,
  planned_meals: null,
  kitchen_scale_enabled: true,
  measurement_unit: "metric",
  meal_reminders_enabled: false,
  sleep_target_minutes: null,
  readiness_check_in_enabled: true,
  weekly_check_in_day: null,
  smoking_tracking_enabled: false,
  cigarette_baseline: null,
  cigarette_reduction_target: null,
  first_cigarette_delay_minutes: null,
  updated_at: "2026-07-15T00:00:00Z",
  version: 1
};

const fetchProfileMock = vi.fn(() => Promise.resolve(apiProfile));
const updateProfileMock = vi.fn((payload) => Promise.resolve({ ...apiProfile, ...payload, profile_configured: true, version: 2 }));
const fetchDevicesMock = vi.fn(() => Promise.resolve([{ id: "device-row", device_id: "device-local", device_id_display: "device-local", device_name: "This device", first_seen_at: "2026-07-15T00:00:00Z", last_seen_at: "2026-07-15T01:00:00Z", last_sync_at: null, revoked_at: null, current: true }]));

vi.mock("next/navigation", () => ({
  usePathname: () => "/settings",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() })
}));

vi.mock("@/components/auth/AuthenticatedUserProvider", () => ({
  useAuthenticatedUser: () => ({ id: "user-1", email: "athlete@example.test", full_name: "Demo Athlete", timezone: "Asia/Dhaka", is_active: true, is_admin: false })
}));

vi.mock("@/lib/apiClient", () => ({
  apiRequest: vi.fn(() => Promise.resolve({ results: [] })),
  fetchProfile: () => fetchProfileMock(),
  updateProfile: (payload: unknown) => updateProfileMock(payload),
  fetchDevices: () => fetchDevicesMock(),
  renameDevice: vi.fn(() => Promise.resolve({})),
  revokeDevice: vi.fn(() => Promise.resolve({ id: "device-row", device_id: "device-local", device_id_display: "device-local", device_name: "This device", first_seen_at: "2026-07-15T00:00:00Z", last_seen_at: "2026-07-15T01:00:00Z", last_sync_at: null, revoked_at: "2026-07-15T02:00:00Z", current: true })),
  userFacingApiError: () => "Request failed"
}));

describe("Settings Sprint 2 flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSyncQueueForTests();
  });

  it("routes More to the Settings hub and keeps Sync accessible", () => {
    render(<><BottomNavigation /><SettingsHub /></>);
    expect(screen.getAllByRole("link", { name: /more, current page/i })[0]).toHaveAttribute("href", "/settings");
    expect(screen.getByRole("link", { name: /sync & data/i })).toHaveAttribute("href", "/sync");
    expect(screen.getByRole("link", { name: /profile & goals/i })).toHaveAttribute("href", "/settings/profile");
  });

  it("renders missing profile setup state and saves valid profile changes", async () => {
    render(<ProfileSettingsPage />);
    expect(await screen.findByText(/neutral setup state/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/target min/i), { target: { value: "75" } });
    fireEvent.change(screen.getByLabelText(/target max/i), { target: { value: "70" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/target minimum/i);
    fireEvent.change(screen.getByLabelText(/target min/i), { target: { value: "65" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    await waitFor(() => expect(updateProfileMock).toHaveBeenCalled());
  });

  it("previews valid backups and rejects wrong applications", async () => {
    render(<DataPrivacyPage />);
    const input = screen.getByLabelText(/backup json file/i);
    const backup = new File([JSON.stringify({ application: "Project SUIII", exportType: "device-backup", formatVersion: 1, exportedAt: "2026-07-15T00:00:00Z", device: { deviceId: "d", deviceName: "Device" }, summary: {}, data: { nutrition: { mealLogs: { a: { id: "a" } } } }, recovery: { malformedRecords: [] }, notes: [] })], "backup.json", { type: "application/json" });
    fireEvent.change(input, { target: { files: [backup] } });
    expect(await screen.findByText(/dry-run preview/i)).toBeInTheDocument();
    const bad = new File([JSON.stringify({ application: "Other", exportType: "device-backup", formatVersion: 1, exportedAt: "2026-07-15T00:00:00Z", data: {} })], "bad.json", { type: "application/json" });
    fireEvent.change(input, { target: { files: [bad] } });
    expect(await screen.findByText(/backup rejected/i)).toBeInTheDocument();
  });

  it("renders conflict summaries without secret fields", () => {
    window.localStorage.setItem("project-suiii:phase-4-sync-queue", JSON.stringify({ version: 4, deviceId: "device-local", deviceName: "This device", csrfToken: "secret", pending: [], failed: [{ client_mutation_id: "conflict-1", device_id: "device-local", entity_type: "meal_log", entity_id: "meal-1", mutation_type: "upsert", created_at: "2026-07-15T00:00:00Z", payload: { status: "completed", csrfToken: "hidden", version: 1, server_version: 2 } }], lastSyncAt: null, recentActivity: [] }));
    render(<ConflictCenterPage />);
    expect(screen.getByText(/meal log · meal-1/i)).toBeInTheDocument();
    expect(screen.queryByText(/hidden/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /keep device/i })).toBeInTheDocument();
  });

  it("lists devices and identifies current device without rendering tokens", async () => {
    render(<DevicesSettingsPage />);
    expect(await screen.findByText(/This device · Current/i)).toBeInTheDocument();
    expect(screen.queryByText(/suiii_session/i)).not.toBeInTheDocument();
  });
});
