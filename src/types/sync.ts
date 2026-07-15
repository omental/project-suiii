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

export type SyncMutationResultStatus = "applied" | "duplicate" | "already_exists" | "server_newer" | "conflict" | "rejected";

export type SyncMutationResult = {
  mutation_id: string;
  entity_type: SyncEntityType;
  entity_id: string;
  status: SyncMutationResultStatus;
  server_version?: number | null;
  payload: Record<string, unknown>;
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

export type MigrationRejectedItem = {
  record_type: SyncEntityType;
  client_record_id: string;
  status: "rejected" | "server_newer" | "conflict";
  code: string;
  message: string;
};

export type MigrationOutcomeItem = {
  record_type: SyncEntityType;
  client_record_id: string;
  status: "migrated" | "already_exists" | "server_newer" | "conflict" | "rejected";
  code?: string;
};

export type MigrationResponse = {
  batch_id: string;
  status: string;
  imported_records: number;
  skipped_records: number;
  conflict_records: number;
  error_records: number;
  summary: MigrationPreview & {
    rejected_items?: MigrationRejectedItem[];
    outcome_items?: MigrationOutcomeItem[];
  } & Record<string, unknown>;
};

export type SyncPushResponse = {
  results: SyncMutationResult[];
  server_time: string;
};

export type SyncPullRecord = {
  entity_type: SyncEntityType;
  entity_id: string;
  client_record_id: string;
  server_version: number;
  server_updated_at: string;
  deleted_at?: string | null;
  payload: Record<string, unknown>;
};

export type SyncPullResponse = {
  records: SyncPullRecord[];
  server_time: string;
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
