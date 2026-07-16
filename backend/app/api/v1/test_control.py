from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.core.config import get_settings

router = APIRouter(prefix="/__test", tags=["test-control"])

fail_next_sync_pull = False


def require_test_environment() -> None:
    if get_settings().environment != "test":
        raise HTTPException(status_code=404, detail="Not found")


@router.post("/fail-next-sync-pull")
async def fail_next_pull() -> dict[str, bool]:
    require_test_environment()
    global fail_next_sync_pull
    fail_next_sync_pull = True
    return {"fail_next_sync_pull": True}


def consume_fail_next_sync_pull() -> bool:
    require_test_environment()
    global fail_next_sync_pull
    if not fail_next_sync_pull:
        return False
    fail_next_sync_pull = False
    return True
