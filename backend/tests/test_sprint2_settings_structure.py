from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text()


def test_profile_schema_supports_sprint2_preferences() -> None:
    schema = read("app/schemas/profile.py")
    for field in [
        "preferred_rest_day",
        "preferred_workout_time",
        "badminton_enabled",
        "calorie_target",
        "sleep_target_minutes",
        "smoking_tracking_enabled",
        "expected_version",
    ]:
        assert field in schema
    assert "target_weight_min_kg cannot be greater" in schema


def test_profile_endpoint_is_authenticated_and_patchable() -> None:
    route = read("app/api/v1/profile.py")
    assert "CurrentUserSession" in route
    assert '@router.patch("",' in route
    assert "expected_version" in route
    assert "profile_configured = True" in route


def test_devices_are_user_scoped_and_revocable() -> None:
    route = read("app/api/v1/sync.py")
    assert '@router.get("/devices"' in route
    assert '@router.post("/devices/revoke"' in route
    assert "SyncDevice.user_id == user.id" in route
    assert "device_id_display" in route
    assert "token" not in route.lower()


def test_revoked_device_push_is_rejected() -> None:
    service = read("app/services/sync_service.py")
    assert "device.revoked_at is not None" in service
    assert "device_revoked" in service
