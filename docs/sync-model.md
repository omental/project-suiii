# Sync Model

Manual and reconnect sync share the same guarded workflow:

1. verify session with the backend
2. `POST /sync/push`
3. `GET /sync/pull`
4. merge safely around pending and failed local mutations
5. `GET /sync/status`
6. update `lastSyncAt` only after full success

The reconnect path runs only while the app is open, after a browser online event, with pending mutations and no existing sync in flight.

Retry policy:

- retryable: network failure, 408, 502, 503, 504
- not retried automatically: 401, 403, 409, 422, revoked device
- bounded automatic attempts: three per app session
- no `/sync/migrate` call from reconnect or manual Sync Now

Failed or conflicting mutations are retained for user review. Conflicts are not auto-resolved.

Workout completion queues a `workout_session` mutation containing the full JSON payload: reps, actual load, RIR, form rating, notes, skipped status, substitutions, readiness, duration, and recommendation state.
