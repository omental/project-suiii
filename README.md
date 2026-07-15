# Project SUIII

**Project SUIII** is a private, premium mobile-first fitness transformation PWA.

Tagline: **Build Your Ultimate Form**

Phase 4 adds the FastAPI/PostgreSQL backend foundation, private authentication, local-data migration, offline mutation queue, and sync-status UI. Phase 5 adds private progress tracking: measurements, weekly check-ins, local progress-photo capture, deterministic transformation analytics, conservative forecasting, milestones and backend-generated PDF reports. Production deployment, Nginx and SSL are still reserved for a later phase.

## Phase 1 Scope

- Next.js App Router frontend foundation
- TypeScript strict mode
- Tailwind CSS visual system
- Mobile application shell with fixed bottom navigation
- Today dashboard matching the supplied reference hierarchy
- Typed mock-data architecture
- Disposable local UI state for Phase 1 interactions
- Initial PWA manifest and placeholder icons
- Focused component tests

## Phase 2 Capabilities

- Today's Meals dashboard
- Seven-day meal plan
- Meal detail screens
- Controlled predefined substitutions
- Step-by-step kitchen-scale weighing
- Actual gram entry and validation
- Automatic nutrition recalculation
- Meal completion summaries
- Measurement editing
- Skipped meal and skipped ingredient states
- Local nutrition history
- Today dashboard integration

## Phase 3 Capabilities

- Train dashboard with weekly schedule and readiness status
- Guided workout player with hidden app navigation
- Set, repetition, resistance and RIR logging
- Absolute timestamp rest timer using `restEndsAt`
- Pause, resume, save and exit, partial-session handling
- Structured form guides for the Phase 3 exercise catalogue
- Workout completion summary with effort and soreness feedback
- Training history, accessible trend values and progression recommendations
- Equipment-aware progression for fixed dumbbells and bands
- Today dashboard workout integration

## Phase 4 Capabilities

- FastAPI backend project under `backend/`
- PostgreSQL-only SQLAlchemy async models
- Alembic initial migration for Phase 4 tables
- Private email/password sign-in with Argon2 password hashing
- Revocable opaque server sessions in HTTP-only cookies
- CSRF token cookie plus `X-CSRF-Token` validation for state changes
- Profile, daily tracking, meal log and workout session persistence models
- Idempotent sync mutation endpoints and migration batches
- Frontend API client that uses credentialed cookie transport
- Versioned offline mutation queue
- Local-to-server migration preview screen
- Sync & Data screen
- Rest timer beep/vibration completion polish

## Phase 5 Capabilities

- Progress dashboard and enabled Progress bottom navigation
- Weight and waist-at-navel logging with optional chest, arm and thigh values
- Three-step weekly check-in: measure, photos, review
- Private local progress-photo capture and comparison controls
- Measurement history with accessible chart values and deletion confirmation
- Deterministic adherence, smoking trend, milestone and coaching-insight calculations
- Conservative target-range forecast only when enough reliable data exists
- Weekly and monthly report requests backed by private backend PDF generation
- Backend persistence for measurements, check-ins, photos, milestones and reports
- Offline mutation queue entries for measurements and check-ins

## Sprint 4 PWA And Offline Model

- Custom service worker at `/sw.js` caches only static app assets, icons, manifest and a neutral `/offline.html` shell.
- Authenticated API responses, profile data, sync payloads, progress data, reports, photos, cookies, CSRF values and private HTML are network-only and marked no-store/private where Next headers apply.
- Active workouts can continue from local device state, complete offline, and queue a `workout_session` sync mutation.
- Reconnect sync runs only while the app is open, after browser reconnection, with bounded attempts and no `/sync/migrate` calls.
- Install and update state is shown under Settings/About; storage/cache health and offline backup export are shown under Settings/Data.
- Timer alerts are limited to Project SUIII being open; reliable background notification delivery is not claimed.

See `docs/pwa.md`, `docs/offline-model.md`, `docs/sync-model.md`, and `docs/privacy-cache-boundaries.md`.

## Routes

- `/` - Today dashboard
- `/meals` - Today's Meals dashboard
- `/meals/plan` - Seven-day meal plan
- `/meals/[date]/[mealId]` - Meal detail
- `/meals/[date]/[mealId]/weigh` - Kitchen-scale workflow
- `/meals/[date]/[mealId]/complete` - Meal completion summary
- `/train` - Train dashboard
- `/train/history` - Training history and progression
- `/train/session/[sessionId]` - Guided workout player
- `/train/session/[sessionId]/exercise/[exerciseId]/form` - Exercise form guide
- `/train/session/[sessionId]/complete` - Workout completion summary
- `/sign-in` - Private account sign-in
- `/sync/migrate` - Local-data migration flow
- `/sync` - Sync & Data status
- `/progress` - Progress dashboard
- `/progress/history` - Measurement and check-in history
- `/progress/check-in` - Weekly check-in measure step
- `/progress/photos` - Private progress photo capture
- `/progress/photos/compare` - Private photo comparison
- `/progress/review/[checkInId]` - Weekly review and insight
- `/progress/reports` - Weekly/monthly PDF report requests

Dates use stable `YYYY-MM-DD` strings.

## Final Architecture

Frontend:

- Next.js latest stable
- React
- TypeScript
- Tailwind CSS
- Lucide React
- `next/font`
- PWA support
- npm

Backend:

- FastAPI
- Python 3.12+
- SQLAlchemy 2.x async
- Alembic migrations
- Pydantic
- HTTP-only cookie authentication

Database:

- PostgreSQL only
- Required database name: `suii`

Production target:

- Private HTTPS host configured outside the repository
- Nginx reverse proxy
- Let's Encrypt SSL

## Development

```bash
npm install
npm run dev
```

Open the app at `http://localhost:3000`.

## Verification Commands

```bash
npm run lint
npm run typecheck
npm run typecheck:e2e
npm run test
npm run test:integration
npm run build
npm run test:e2e
```

## Production Build Workflow

The Next.js application TypeScript project is intentionally limited to application source, Next generated types and app configuration. Playwright configuration, E2E specs, browser mock fixtures, reports and test results are excluded from the main `tsconfig.json` and covered by `tsconfig.playwright.json` plus `npm run typecheck:e2e`.

Production builds may install dev dependencies during the build phase if the host requires them for compilation, but the running application must not depend on Playwright. Keep `@playwright/test` in `devDependencies`; do not move it to production dependencies. Playwright browsers, `playwright-report/` and `test-results/` are test artifacts and must not be deployed or committed.

Use `npm run build` for the production app build. Use `npm run test:e2e` only in CI/development environments with dev dependencies and Playwright browsers available.

Backend:

```bash
cd backend
pip install -e ".[test]"
alembic upgrade head
pytest
```

## PWA Notes

Phase 1 includes `public/manifest.webmanifest`, mobile metadata, theme colour, standalone display mode, portrait orientation preference, and placeholder icons.

Full installability will require HTTPS in production and a correctly configured service worker. A service worker is intentionally not added in Phase 1 to avoid stale development assets.

## Local Mock-State Limitations

Water increments, cigarette increments, nutrition logs, weighing sessions, substitutions, skipped meals, completed meals, workout sessions, readiness checks, rest timers, set logs, feedback and training history still work locally first. Phase 4 adds migration and sync adapters so this state can be uploaded to the private PostgreSQL backend after sign-in. Phase 5 stores measurements and weekly check-ins locally first and queues them as `body_measurement` and `weekly_check_in` mutations. Photo blobs are treated differently: local previews are never called backed up until the server acknowledges an authenticated upload.

## Phase 5 Measurement Rules

- Weight is stored and displayed in kilograms.
- Circumferences are stored and displayed in inches.
- Waist means waist at navel.
- Values must be positive and realistically bounded.
- One measurement is not treated as proof of progress or regression.
- Weekly guidance: same scale, same location, after using the toilet, before food or water, same tape position, tape level and not pulled excessively tight.

## Phase 5 Analytics

- Weight change is current minus starting weight.
- Waist change is current minus starting waist.
- Meal adherence is completed planned meals divided by eligible planned meals.
- Protein target days use a consistent 100% target rule.
- Water target days require reaching the configured daily water target.
- Smoking trend shows baseline when established, daily limit, today and seven-day average. Ordinary misses are not framed as failure.
- Milestones are deterministic and based on actual persisted or local data.
- Forecasting requires at least three sufficiently separated weight measurements, a trend toward the target range and a plausible weekly rate. Forecasts are ranges and never guarantees.

## Phase 5 Photo Privacy

Progress photos are private by design. The frontend uses camera APIs only when supported and permission is granted, always offers file input fallback, and does not claim local photos are backed up before upload succeeds. The backend decodes and re-encodes accepted images, strips metadata, stores files outside `public/`, and serves them only through authenticated `private, no-store` endpoints.

The local repositories are versioned. Phase 2 migrates preserved Phase 1 water, cigarette, timeline, and weighing values where possible. Phase 3 stores training state separately under a versioned key and falls back to safe defaults when local data is malformed.

## Data Model

Core nutrition concepts are centralized in TypeScript:

- `FoodItem`
- `NutritionValues`
- `WeightBasis`
- `IngredientPortion`
- `SubstitutionOption`
- `MealDefinition`
- `MealPlanDay`
- `WeeklyMealPlan`
- `MealLog`
- `IngredientLog`
- `WeighingSession`
- `DailyNutritionSummary`
- `NutritionTargets`

Food definitions live in one catalogue and meal logs reference stable IDs instead of duplicating full food definitions.

Training concepts are centralized in TypeScript:

- `EquipmentType`
- `ResistanceSelection`
- `ExerciseDefinition`
- `ExercisePrescription`
- `WorkoutDefinition`
- `WorkoutScheduleEntry`
- `WorkoutSession`
- `ExerciseSession`
- `SetLog`
- `RestTimerState`
- `ReadinessCheckIn`
- `SessionAdjustment`
- `ExerciseFormGuide`
- `SessionFeedback`
- `ProgressionRecommendation`

Workout logs reference stable exercise and workout IDs instead of duplicating the full exercise catalogue.

## Weighing Rules

- Rice, meat, fish, potato and roti use cooked edible weight.
- Oats use dry weight.
- Fruit uses raw edible weight.
- Vegetables use raw edible weight unless marked cooked.
- Egg uses edible portion without shell.
- Oil is weighed separately and is never estimated.

## Substitution Behaviour

Substitutions are controlled and predefined. Phase 2 supports carbohydrate, protein, fruit, and treat replacement groups. The UI shows target grams, estimated calories and protein, the calorie difference, and a revert action. Free-text substitutions are intentionally not supported.

## Nutrition Calculation

Nutrition values are calculated centrally from per-100 g food data:

```text
actualAmount / 100 * nutritionPer100g
```

Daily totals are derived from completed meal logs only. Skipped meals and skipped ingredients do not count. Editing a completed meal updates the existing log instead of duplicating totals.

Nutrition values are planning estimates. Packaged-food labels and preparation methods may produce different values.

## Phase 3 Workout Programme

- Saturday: Full Body A
- Sunday: Mobility
- Monday: Full Body B
- Tuesday: Shoulder Care
- Wednesday: Full Body C
- Thursday: Active Recovery
- Friday: Complete Rest

Available equipment is fixed to bodyweight, one or paired 5 kg dumbbells, one or paired 7.5 kg dumbbells, resistance bands, mini-loop bands, mat, foam roller and chair. The app does not recommend unavailable fractional dumbbell jumps.

## Timer Architecture

Workout duration is derived from `startedAt`, `pausedAt`, `totalPausedDurationMs` and `completedAt`. Rest duration is derived from an absolute `restEndsAt` timestamp rather than a decrement-only counter, so refreshes and background tabs restore the remaining time more reliably. Pausing the session also freezes active rest by storing the remaining seconds, then resume writes a new `restEndsAt`.

## Volume Calculation

External-load volume is calculated only where it is meaningful:

- One dumbbell: `kg * repetitions`
- Dumbbell pair: combined pair load per repetition
- Unilateral work counts left and right repetitions separately

Bodyweight, bands, holds, mobility and stretches track repetitions, duration or completion without invented kilogram volume.

## Progression Rules

Recommendations are deterministic and review-only. If all working sets reach the top of a repetition range with controlled form and approximately 1-2 RIR, the app recommends adding 1-2 total repetitions, slowing tempo or using an available band when appropriate. One weaker session is treated as a repeat target. Repeated decline with high soreness recommends maintaining or reducing volume for review. Future plans are never altered silently.

## Safety Limitations

Project SUIII does not diagnose injuries or medical conditions. Readiness red flags such as sharp pain, dizziness, chest pain or unusual breathlessness produce calm stop-and-seek-assessment language. Training to failure is not required.

## Phase 4 Backend

Backend files live in `backend/`. Application startup does not create tables; use Alembic migrations. The initial schema includes:

- `users`
- `user_sessions`
- `user_profiles`
- `daily_tracking`
- `meal_logs`
- `workout_sessions`
- `sync_mutations`
- `sync_devices`
- `migration_batches`

All user-owned records include `user_id` scoping. Meal and workout logs store versioned frontend domain payloads in PostgreSQL JSONB and use optimistic integer versions. Sync mutations are idempotent by `user_id + client_mutation_id`.

Authentication uses private sign-in only. There is no public registration route. Session tokens are opaque random values stored only in secure HTTP-only cookies and stored in the database as hashes. CSRF protection uses a separate token sent by the frontend in `X-CSRF-Token`.

## Environment Variables

Use `.env.example` as the safe template for future phases. Do not commit real credentials.

The Phase 1 frontend does not require an active database connection.

## Planned Phases

Phase 2:

- Complete gram-based meal plan - implemented
- Meal weighing workflow - implemented
- Food substitutions - implemented
- Calories and macronutrients - implemented
- Daily meal completion - implemented

Phase 3:

- Guided workout player - implemented
- Sets and repetitions - implemented
- Rest timer - implemented
- Dumbbell and band resistance - implemented
- Progressive overload - implemented
- Exercise history - implemented

Phase 4:

- FastAPI application - implemented
- PostgreSQL database named `suii` - implemented
- SQLAlchemy models - implemented
- Alembic migrations - implemented
- Authentication - implemented
- API integration - implemented

Phase 5:

- Weight and waist history - implemented
- Progress photographs - implemented privately
- Dashboard charts - implemented with accessible values
- Weekly reports - implemented
- Sleep, recovery and readiness - implemented in weekly check-ins

Phase 6:

- KC10 watch bridge integration
- Heart rate
- Steps
- Badminton data
- Automated activity syncing
- Photo upload retry dashboard and richer conflict review

Phase 7:

- Production deployment
- Nginx
- SSL
- Backups
- Monitoring
- Private production hostname
