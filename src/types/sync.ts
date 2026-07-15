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

export type UserProfile = {
  user_id: string;
  height_cm: string;
  starting_weight_kg: string;
  target_weight_min_kg: string;
  target_weight_max_kg: string;
  starting_waist_in: string;
  target_waist_in: string;
  calorie_target: number;
  protein_target_g: number;
  water_target_ml: number;
  timezone: string;
  unit_system: "metric" | "imperial";
  programme_start_date: string | null;
  profile_configured: boolean;
  preferred_rest_day: string | null;
  preferred_workout_time: string | null;
  equipment_csv: string | null;
  badminton_enabled: boolean;
  badminton_days_csv: string | null;
  badminton_start_time: string | null;
  badminton_end_time: string | null;
  badminton_intensity: "easy" | "moderate" | "hard" | null;
  show_exercise_illustrations: boolean;
  rest_timer_sound: boolean;
  default_rest_seconds: number | null;
  exercise_substitutions_enabled: boolean;
  planned_meals: number | null;
  kitchen_scale_enabled: boolean;
  measurement_unit: "metric" | "imperial";
  meal_reminders_enabled: boolean;
  sleep_target_minutes: number | null;
  readiness_check_in_enabled: boolean;
  weekly_check_in_day: string | null;
  smoking_tracking_enabled: boolean;
  cigarette_baseline: number | null;
  cigarette_reduction_target: number | null;
  first_cigarette_delay_minutes: number | null;
  updated_at: string;
  version: number;
};

export type UserProfileUpdate = Partial<Omit<UserProfile, "user_id" | "updated_at" | "version" | "equipment_csv" | "badminton_days_csv">> & {
  full_name?: string;
  equipment?: string[];
  badminton_days?: string[];
  expected_version?: number;
};

export type SyncDevice = {
  id: string;
  device_id: string;
  device_id_display: string;
  device_name: string;
  first_seen_at: string;
  last_seen_at: string;
  last_sync_at: string | null;
  revoked_at: string | null;
  current: boolean;
};

export type SyncStatus = {
  online: boolean;
  pending_mutations: number;
  last_sync_at: string | null;
  device_name: string | null;
  recent_activity: string[];
};
