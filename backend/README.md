# Project SUIII Backend

FastAPI backend for Phase 4. It uses PostgreSQL only; the required database name is `suii`.

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
