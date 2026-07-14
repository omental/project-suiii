export type SyncEntityType = "daily_tracking" | "meal_log" | "workout_session" | "profile" | "body_measurement" | "weekly_check_in";

export type SyncMutation = {
  client_mutation_id: string;
  device_id: string;
  entity_type: SyncEntityType;
  entity_id: string;
  mutation_type: "upsert" | "delete";
  payload: Record<string, unknown>;
  created_at: string;
};

export type SyncQueueState = {
  version: 4;
  deviceId: string;
  deviceName: string;
  csrfToken: string | null;
  pending: SyncMutation[];
  failed: SyncMutation[];
  lastSyncAt: string | null;
  recentActivity: string[];
};

export type MigrationPreview = {
  meal_logs: number;
  workout_sessions: number;
  daily_check_ins: number;
  sets: number;
  date_range: string;
  total_records: number;
};

export type AuthUser = {
  id: string;
  email: string;
  full_name: string;
  timezone: string;
  is_active: boolean;
  is_admin: boolean;
};

export type SyncStatus = {
  online: boolean;
  pending_mutations: number;
  last_sync_at: string | null;
  device_name: string | null;
  recent_activity: string[];
};
