# Project SUIII Backend

FastAPI backend for Project SUIII. It uses PostgreSQL only; the required database name is `suii`.

## Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -e ".[test]"
copy .env.example .env
alembic upgrade head
```

Create the private user:

```bash
python -m app.scripts.create_user --email mubasshir@example.com --name "J.M. Mubasshir Rahman"
```

## Run

```bash
uvicorn app.main:create_app --factory --reload
```

## Verify

```bash
pytest
alembic upgrade head
alembic downgrade -1
```

No tables are created at application startup. Use Alembic migrations.

## Phase 5 Progress Backend

Phase 5 adds:

- `body_measurements`
- `weekly_check_ins`
- `progress_photos`
- `progress_milestones`
- `generated_reports`

Routes are authenticated and user-scoped under `/api/v1`:

- `/measurements`
- `/check-ins`
- `/check-ins/{id}/photos`
- `/photos/{photo_id}`
- `/progress/summary`
- `/progress/history`
- `/progress/adherence`
- `/progress/forecast`
- `/progress/milestones`
- `/reports/weekly`
- `/reports/monthly`
- `/reports/{report_id}/download`

## Measurement Conventions

Weight is stored in kilograms. Circumferences are stored in inches, with waist defined as waist at navel. Validation rejects zero, negative, non-finite and clearly unrealistic values while allowing normal human variation.

## Photo Security

Configure private storage with:

```env
PRIVATE_UPLOAD_ROOT=private_uploads
MAX_PROGRESS_PHOTO_BYTES=8388608
MAX_IMAGE_PIXELS=16000000
PROCESSED_PHOTO_MAX_WIDTH=1600
PROCESSED_PHOTO_QUALITY=82
```

Uploads require authentication and CSRF. The backend verifies image structure with Pillow, rejects malformed/animated/oversized/non-image content, applies EXIF orientation, strips metadata by re-encoding to WebP, stores application-generated UUID filenames outside the webroot, and serves photos only through authorization-checked `private, no-store` responses.

## Reports

ReportLab generates weekly and monthly PDFs into private storage. Reports exclude progress photos by default and are idempotent per user, report type and period.

## Analytics and Forecasts

Analytics are deterministic. Forecasts are conservative and unavailable unless at least three sufficiently separated measurements trend toward the target at a plausible rate. Forecasts are estimates, not guarantees, and never change programme targets automatically.

## Verify

```bash
python -m ruff check .
python -m pytest -q
alembic upgrade head
alembic current
alembic check
```

Known limitations: Phase 5 keeps frontend photo previews local until authenticated upload succeeds, and richer conflict-review UX is reserved for Phase 6.
