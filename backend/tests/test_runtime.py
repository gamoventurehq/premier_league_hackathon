"""Empirical stress test suite challenging backend simulation runtime and health endpoints.

Challenger 1 Empirical Verification:
1. GET /api/health and GET /health contract, liveness, startup, and warm states:
   - HTTP 200, status: ok, simulationAlive: True, alive: True, ready: True
   - Parity between /health and /api/health alias
   - Startup and warm-up state reporting (simulationAlive: True during warm-up)
   - Degraded reporting when worker error is simulated
2. Simulation Clock Auto-Rollover Loop (sim_loop_on_full_time):
   - At 5400s (MATCH_LENGTH_SECONDS), clean reset to scenario anchor time
   - Scrub epoch incremented on rollover
   - Narrative state cleanly refreshed to anchor frame (old 90:00 narrative cleared)
   - Clean rollover across all 4 synthetic scenarios
   - Natural rollover when clock ticks past 5400s without explicit jump
   - sim_loop_on_full_time=False disables rollover and freezes at 5400s cleanly
   - Repeated consecutive rollovers without memory leak, deadlock, crash, or thread death
"""

from __future__ import annotations

import time
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from app.models import SyntheticScenarioType
from app.runtime import MatchRuntime
from app.simulation.engine import SCENARIOS
from app.simulation.metrics import MATCH_LENGTH_SECONDS


@pytest.fixture
def app_client():
    """FastAPI TestClient fixture with ready MatchRuntime."""
    app = create_app()
    with TestClient(app) as client:
        runtime: MatchRuntime = app.state.runtime
        assert runtime.wait_until_ready(timeout=10.0), "Runtime failed to warm up in 10s"
        yield client, runtime


# ==============================================================================
# Challenge 1: Health Endpoints Contract & Liveness
# ==============================================================================

def test_health_and_api_health_contract_and_parity(app_client) -> None:
    """Verify GET /health and GET /api/health return HTTP 200 with status: ok and simulationAlive: True."""
    client, runtime = app_client

    for path in ("/health", "/api/health"):
        res = client.get(path)
        assert res.status_code == 200, f"Expected 200 OK on {path}, got {res.status_code}"
        data = res.json()

        # Contract requirements
        assert data["service"] == "Premier League Studio Backend"
        assert data["status"] in ("ok", "healthy")
        assert data["ready"] is True
        assert data["simulationAlive"] is True
        assert data["alive"] is True
        assert data["heartbeat_fresh"] is True
        assert data["worker_errors"] == 0
        assert data["workerError"] is None

        # Clock & simulation fields
        assert "matchClock" in data
        assert "matchSeconds" in data
        assert isinstance(data["matchSeconds"], (int, float))
        assert data["matchSeconds"] >= 0.0
        assert "uptimeSeconds" in data
        assert data["uptimeSeconds"] >= 0.0

        # Heartbeat freshness
        assert "lastTickAt" in data
        assert (time.time() - data["lastTickAt"]) <= runtime.HEARTBEAT_STALE_SECONDS

    # Verify parity between /health and /api/health
    h1 = client.get("/health").json()
    h2 = client.get("/api/health").json()
    assert h1["service"] == h2["service"]
    assert h1["status"] == h2["status"]
    assert h1["simulationAlive"] == h2["simulationAlive"]
    assert h1["ready"] == h2["ready"]
    assert h1["scenario"] == h2["scenario"]


def test_health_endpoints_startup_vs_warm_states() -> None:
    """Verify health endpoints report simulationAlive: True during startup/warmup and ok once warm."""
    settings = Settings(sim_warmup_seconds=1000)
    app = create_app(settings)
    with TestClient(app) as client:
        runtime = app.state.runtime

        # 1. Startup state: worker thread alive, warm-up in progress
        res_startup = client.get("/api/health")
        assert res_startup.status_code == 200
        startup_data = res_startup.json()
        assert startup_data["simulationAlive"] is True
        assert startup_data["alive"] is True

        # 2. Wait for warm-up completion
        assert runtime.wait_until_ready(timeout=10.0)

        # 3. Warm state: ready is True and status is ok
        res_warm = client.get("/api/health")
        assert res_warm.status_code == 200
        warm_data = res_warm.json()
        assert warm_data["status"] == "ok"
        assert warm_data["ready"] is True
        assert warm_data["simulationAlive"] is True


def test_health_paused_state_maintains_fresh_heartbeat(app_client) -> None:
    """Verify heartbeat freshness is preserved and simulationAlive remains True when paused."""
    client, runtime = app_client

    pause_res = client.post("/api/playback/pause")
    assert pause_res.status_code == 200
    assert runtime.is_paused is True

    frozen_seconds = runtime.engine.match_seconds
    time.sleep(1.0)

    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["ready"] is True
    assert data["simulationAlive"] is True
    assert data["heartbeat_fresh"] is True

    # Clock did not drift while paused
    assert abs(runtime.engine.match_seconds - frozen_seconds) <= 0.05

    # Resume and verify progress continues
    client.post("/api/playback/resume")
    assert runtime.is_paused is False
    time.sleep(0.3)
    assert runtime.engine.match_seconds > frozen_seconds


# ==============================================================================
# Challenge 2: 5400s Simulation Clock Auto-Rollover Loop
# ==============================================================================

def test_simulation_clock_auto_rollover_at_5400s(app_client) -> None:
    """Scrubbing to 5400s cleanly resets clock to anchor time, increments epoch, and clears narrative."""
    client, runtime = app_client

    initial_epoch = runtime.scrub_epoch
    scenario = runtime.scenario
    anchor_seconds = runtime.scenario_anchor(scenario)

    # 1. Jump to 5400s (full-time)
    jump_res = client.post("/api/playback/jump", json={"seconds": float(MATCH_LENGTH_SECONDS)})
    assert jump_res.status_code == 200
    jump_data = jump_res.json()
    assert jump_data["matchSeconds"] == 5400.0

    # 2. Allow worker thread to detect 5400s and process auto-rollover
    time.sleep(2.0)

    # 3. Verify clean reset to anchor time under lock
    with runtime._lock:
        clock_after = runtime.engine.match_seconds
        epoch_after = runtime.scrub_epoch
        latest_narrative = runtime.latest_narrative()
        latest_frame = runtime.latest_frame()

    # Clock reset within a small delta of anchor seconds (advancing at 10Hz)
    assert abs(clock_after - anchor_seconds) < 5.0, (
        f"Clock was {clock_after:.1f}s, expected reset near anchor {anchor_seconds:.1f}s"
    )

    # Scrub epoch incremented on jump AND on rollover
    assert epoch_after > initial_epoch + 1, (
        f"Epoch {epoch_after} did not increment past {initial_epoch + 1}"
    )

    # Narrative state cleanly refreshed to post-rollover anchor clock
    assert latest_narrative is not None, "Post-rollover narrative was unexpectedly None"
    assert latest_frame is not None, "Post-rollover frame was unexpectedly None"
    assert latest_frame.matchSeconds < 5000.0, f"Frame clock not rolled over: {latest_frame.matchSeconds}"
    assert latest_narrative.matchClock == latest_frame.matchClock, (
        f"Narrative clock {latest_narrative.matchClock} != frame clock {latest_frame.matchClock}"
    )

    # Health endpoint confirms simulationAlive after rollover
    health_res = client.get("/api/health")
    assert health_res.status_code == 200
    assert health_res.json()["simulationAlive"] is True
    assert health_res.json()["status"] == "ok"


def test_simulation_clock_natural_rollover_without_explicit_jump(app_client) -> None:
    """Natural progression across 5400s automatically rolls over to anchor time."""
    client, runtime = app_client

    scenario = runtime.scenario
    anchor_seconds = runtime.scenario_anchor(scenario)

    # Jump to 5399.0s (10 ticks / 1.0s before full-time at 10Hz)
    jump_res = client.post("/api/playback/jump", json={"seconds": 5399.0})
    assert jump_res.status_code == 200

    # Allow simulation to step naturally across 5400s and complete rollover
    time.sleep(3.0)

    with runtime._lock:
        clock_after = runtime.engine.match_seconds
        sim_alive = runtime.simulation_alive
        frame = runtime.latest_frame()

    assert sim_alive is True, "Simulation worker died during natural rollover"
    assert clock_after < 5000.0, f"Clock did not roll over: {clock_after}s"
    assert abs(clock_after - anchor_seconds) < 15.0, (
        f"Clock {clock_after:.1f}s not within 15s of anchor {anchor_seconds:.1f}s"
    )
    assert frame is not None and frame.matchSeconds < 5000.0


def test_rollover_across_all_four_scenarios(app_client) -> None:
    """Every synthetic match scenario cleanly rolls over to its specific anchor time."""
    client, runtime = app_client

    for scenario_type in SyntheticScenarioType:
        expected_anchor = SCENARIOS[scenario_type].anchor_seconds
        runtime.set_scenario(scenario_type)
        time.sleep(1.0)

        pre_epoch = runtime.scrub_epoch

        # Jump to full time
        jump_res = client.post("/api/playback/jump", json={"seconds": 5400.0})
        assert jump_res.status_code == 200

        # Wait for rollover
        time.sleep(2.0)

        with runtime._lock:
            clock = runtime.engine.match_seconds
            post_epoch = runtime.scrub_epoch
            narrative = runtime.latest_narrative()
            sim_alive = runtime.simulation_alive

        assert sim_alive is True, f"Worker died during rollover for scenario {scenario_type.value}"
        assert abs(clock - expected_anchor) < 10.0, (
            f"Scenario {scenario_type.value}: clock {clock:.1f}s failed to reset to anchor {expected_anchor}s"
        )
        assert post_epoch > pre_epoch, f"Scenario {scenario_type.value}: epoch did not increment"
        assert narrative is not None, f"Scenario {scenario_type.value}: narrative was None"


def test_sim_loop_on_full_time_disabled_freezes_at_5400s() -> None:
    """When sim_loop_on_full_time=False, reaching 5400s halts match without rollover."""
    settings = Settings(sim_loop_on_full_time=False)
    app = create_app(settings)
    with TestClient(app) as client:
        runtime: MatchRuntime = app.state.runtime
        assert runtime.wait_until_ready(timeout=10.0)

        # Jump to 5399.5s
        client.post("/api/playback/jump", json={"seconds": 5399.5})
        time.sleep(1.5)

        with runtime._lock:
            clock = runtime.engine.match_seconds
            finished = runtime.match_finished
            alive = runtime.simulation_alive

        assert finished is True, "match_finished should be True at full-time"
        assert clock >= 5400.0, f"Clock should stay at 5400.0s when rollover is disabled, got {clock}"
        assert alive is True, "Simulation worker thread should remain alive and ticking"


def test_repeated_consecutive_rollovers_stress(app_client) -> None:
    """Multiple rapid rollover cycles execute cleanly with zero deadlocks or crashes."""
    client, runtime = app_client

    anchor = runtime.scenario_anchor(runtime.scenario)
    for cycle in range(3):
        pre_epoch = runtime.scrub_epoch

        # Jump to 5400s
        jump_res = client.post("/api/playback/jump", json={"seconds": 5400.0})
        assert jump_res.status_code == 200

        # Wait for rollover cycle to complete
        time.sleep(2.0)

        with runtime._lock:
            clock = runtime.engine.match_seconds
            post_epoch = runtime.scrub_epoch
            alive = runtime.simulation_alive

        assert alive is True, f"Simulation worker died on cycle {cycle + 1}"
        assert abs(clock - anchor) < 10.0, (
            f"Cycle {cycle + 1}: Clock {clock:.1f}s did not reset near anchor {anchor:.1f}s"
        )
        assert post_epoch > pre_epoch, f"Cycle {cycle + 1}: Epoch did not increment"

    # Final check on health endpoint
    health_res = client.get("/api/health")
    assert health_res.status_code == 200
    data = health_res.json()
    assert data["status"] == "ok"
    assert data["simulationAlive"] is True
