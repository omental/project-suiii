# Project SUIII

**Project SUIII** is a private, premium mobile-first fitness transformation PWA for J.M. Mubasshir Rahman.

Tagline: **Build Your Ultimate Form**

Phase 2 delivers the frontend nutrition and kitchen-scale workflow. It does not include a backend, database connection, authentication, deployment, or production persistence.

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

## Routes

- `/` - Today dashboard
- `/meals` - Today's Meals dashboard
- `/meals/plan` - Seven-day meal plan
- `/meals/[date]/[mealId]` - Meal detail
- `/meals/[date]/[mealId]/weigh` - Kitchen-scale workflow
- `/meals/[date]/[mealId]/complete` - Meal completion summary

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

Backend planned for a later phase:

- FastAPI
- Python
- SQLAlchemy 2.x async
- Alembic migrations
- Pydantic
- HTTP-only cookie authentication

Database planned for a later phase:

- PostgreSQL only
- Required database name: `suii`

Production target:

- `https://suiii.muba.me`
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
npm run test
npm run build
```

## PWA Notes

Phase 1 includes `public/manifest.webmanifest`, mobile metadata, theme colour, standalone display mode, portrait orientation preference, and placeholder icons.

Full installability will require HTTPS in production and a correctly configured service worker. A service worker is intentionally not added in Phase 1 to avoid stale development assets.

## Local Mock-State Limitations

Water increments, cigarette increments, nutrition logs, weighing sessions, substitutions, skipped meals, and completed meals are stored in browser local storage only. This data is disposable frontend state and is not saved to PostgreSQL.

The local repository is versioned. Phase 2 migrates preserved Phase 1 water, cigarette, timeline, and weighing values where possible. Malformed local data falls back to safe defaults.

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

- Guided workout player
- Sets and repetitions
- Rest timer
- Dumbbell and band resistance
- Progressive overload
- Exercise history

Phase 4:

- FastAPI application
- PostgreSQL database named `suii`
- SQLAlchemy models
- Alembic migrations
- Authentication
- API integration

Phase 5:

- Weight and waist history
- Progress photographs
- Dashboard charts
- Weekly reports
- Sleep, recovery and readiness

Phase 6:

- KC10 watch bridge integration
- Heart rate
- Steps
- Badminton data
- Automated activity syncing

Phase 7:

- Production deployment
- Nginx
- SSL
- Backups
- Monitoring
- `suiii.muba.me`
