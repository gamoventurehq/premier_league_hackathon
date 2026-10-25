"""Tests for /health endpoint simulation liveness, heartbeat freshness, and worker state.

Covers Milestone 3 requirements:
- /health and /api/health accurately reflect simulation state: status, alive, heartbeat_fresh, worker_errors, matchSeconds, matchClock.
- Heartbeat freshness remains fresh (<=15s) even while paused.
- Worker errors and degraded states are correctly reported.
"""

from __future__ import annotations

import time

import pytest
from app.main import create_app
from app.runtime import MatchRuntime
from fastapi.testclient import TestClient


@pytest.fixture
def app_client():
    app = create_app()
    with TestClient(app) as client:
        runtime: MatchRuntime = app.state.runtime
        assert runtime._ready.wait(timeout=10.0)
        yield client, runtime


def test_health_endpoint_contract_and_liveness(app_client) -> None:
    """GET /health and GET /api/health return HTTP 200 with all required liveness fields."""
    client, runtime = app_client

    for endpoint in ("/health", "/api/health"):
        res = client.get(endpoint)
        assert res.status_code == 200
        data = res.json()

        # Service & status
        assert data["service"] == "Premier League Studio Backend"
        assert data["status"] in ("ok", "healthy")
        assert data["ready"] is True

        # Liveness & worker state
        assert data["simulationAlive"] is True
        assert data["alive"] is True
        assert data["heartbeat_fresh"] is True
        assert data["worker_errors"] == 0
        assert data["workerError"] is None

        # Clock & simulation progress
        assert "matchClock" in data
        assert "matchSeconds" in data
        assert isinstance(data["matchSeconds"], (int, float))
        assert data["matchSeconds"] >= 0.0

        # Heartbeat timestamp
        now = time.time()
        assert "lastTickAt" in data
        assert (now - data["lastTickAt"]) <= runtime.HEARTBEAT_STALE_SECONDS


def test_health_heartbeat_freshness_while_paused(app_client) -> None:
    """Verify heartbeat freshness is maintained (<=15s) when simulation is paused."""
    client, runtime = app_client

    # Pause simulation
    pause_res = client.post("/api/playback/pause")
    assert pause_res.status_code == 200
    assert runtime.is_paused is True

    frozen_seconds = runtime.engine.match_seconds

    # Sleep for a few ticks to verify loop continues updating heartbeat
    time.sleep(1.0)

    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()

    assert data["status"] == "ok"
    assert data["ready"] is True
    assert data["alive"] is True
    assert data["simulationAlive"] is True
    assert data["heartbeat_fresh"] is True
    assert data["worker_errors"] == 0

    # Tick age should be under 0.5s, well within 15s limit
    now = time.time()
    tick_age = now - data["lastTickAt"]
    assert tick_age <= 2.0, f"Tick age {tick_age} exceeds 2.0s while paused"

    # Match time remained frozen
    assert abs(runtime.engine.match_seconds - frozen_seconds) <= 0.01

    # Resume simulation
    resume_res = client.post("/api/playback/resume")
    assert resume_res.status_code == 200
    assert runtime.is_paused is False

    time.sleep(0.3)
    assert runtime.engine.match_seconds > frozen_seconds


def test_health_degraded_state_when_worker_dies(app_client) -> None:
    """Verify /health reports degraded status and errors if worker thread dies."""
    _, runtime = app_client

    # Simulate worker error and dead worker
    runtime._worker_error = "Synthetic test failure"
    runtime._ready.clear()

    # Create dummy request with app state
    from fastapi import Request

    class DummyApp:
        class DummyState:
            pass

        state = DummyState()

    dummy_app = DummyApp()
    dummy_app.state.runtime = runtime

    import asyncio

    from app.api.routes import health

    scope = {"type": "http", "app": dummy_app}
    req = Request(scope)

    resp = asyncio.run(health(req))
    assert resp.status == "degraded"
    assert resp.ready is False
    assert resp.worker_errors == 1
    assert resp.workerError == "Synthetic test failure"
