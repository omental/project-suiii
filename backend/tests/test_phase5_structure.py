from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_phase5_migration_contains_required_tables_and_private_indexes() -> None:
    migration = read("alembic/versions/72c6315c31e9_add_phase_5_progress_tracking.py")
    for table in ["body_measurements", "weekly_check_ins", "progress_photos", "progress_milestones", "generated_reports"]:
        assert table in migration
    assert "ck_body_measurements_one_value" in migration
    assert "uq_weekly_check_ins_user_completed_week" in migration
    assert "uq_progress_photos_user_check_in_pose_active" in migration
    assert "public/" not in migration


def test_photo_service_reencodes_and_never_serves_public_paths() -> None:
    service = read("app/services/photo_service.py")
    assert "ImageOps.exif_transpose" in service
    assert 'format="WEBP"' in service
    assert "sha256" in service
    assert "max_progress_photo_bytes" in service
    assert "max_image_pixels" in service
    assert "public" not in service.casefold()


def test_progress_routes_are_authenticated_and_no_store() -> None:
    router = read("app/api/v1/progress.py")
    assert "CurrentUserSession" in router
    assert "Cache-Control" in router
    assert "private, no-store" in router
    assert "/progress/forecast" in router
    assert "/reports/{report_id}/download" in router


def test_report_service_excludes_photos_by_default() -> None:
    report_service = read("app/services/report_service.py")
    assert "Photos are not included" in report_service
    assert "application/pdf" not in report_service
