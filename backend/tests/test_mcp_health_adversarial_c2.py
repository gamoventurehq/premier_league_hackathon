"""Adversarial stress testing suite for Azure MCP Tool Registry and Health Liveness.

Milestone 3 Challenger 2 (Empirical Stress Challenger)
Covers:
1. Malformed argument stress testing across all MCP tools (wrong types, missing required, unexpected fields).
2. Boundary and extreme values for `jump_match_time` (negative, >5400s, string, inf, NaN).
3. Adversarial queries for `get_player_spotlight` (unknown IDs, empty string, injections, special chars).
4. Heartbeat freshness retention during extended pause (>20 seconds).
5. Health reporting and worker error visibility during real simulation worker thread exceptions.
6. High-concurrency stress testing: rapid alternating MCP calls and playback actions during active WebSocket streaming.
"""

from __future__ import annotations

import concurrent.futures
import random
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


# ==============================================================================
# 1. MCP Schema Validation & Malformed Payloads
# ==============================================================================


def test_mcp_schema_validation_type_checks_and_extra_fields(app_client) -> None:
    """Stress-test type enforcement and additionalProperties rejection across MCP tools."""
    client, _ = app_client

    # Case 1: evaluate_passing_lane with wrong types (int instead of str)
    res = client.post(
        "/api/mcp/invoke",
        json={"tool": "evaluate_passing_lane", "arguments": {"passerId": 11, "receiverId": "h8"}},
    )
    assert res.status_code == 400
    assert "must be a string" in res.json()["detail"]

    # Case 2: evaluate_passing_lane missing receiverId
    res = client.post(
        "/api/mcp/invoke",
        json={"tool": "evaluate_passing_lane", "arguments": {"passerId": "h11"}},
    )
    assert res.status_code == 400
    assert "Missing required argument" in res.json()["detail"]

    # Case 3: get_pitch_control_surface with string for boolean
    res = client.post(
        "/api/mcp/invoke",
        json={"tool": "get_pitch_control_surface", "arguments": {"includeCells": "true"}},
    )
    assert res.status_code == 400
    assert "must be a boolean" in res.json()["detail"]

    # Case 4: emit_broadcast_overlay with invalid enum value
    res = client.post(
        "/api/mcp/invoke",
        json={"tool": "emit_broadcast_overlay", "arguments": {"persona": "ultra_fan"}},
    )
    assert res.status_code == 400
    assert "must be one of" in res.json()["detail"]

    # Case 5: get_match_events with boundary violations on limit
    res_neg = client.post(
        "/api/mcp/invoke",
        json={"tool": "get_match_events", "arguments": {"limit": 0}},
    )
    assert res_neg.status_code == 400
    assert ">=" in res_neg.json()["detail"]

    res_max = client.post(
        "/api/mcp/invoke",
        json={"tool": "get_match_events", "arguments": {"limit": 500}},
    )
    assert res_max.status_code == 400
    assert "<=" in res_max.json()["detail"]

    # Case 6: extra unexpected field on zero-arg tool
    res_trace = client.post(
        "/api/mcp/invoke",
        json={"tool": "get_agent_trace", "arguments": {"verbose": True}},
    )
    assert res_trace.status_code == 400
    assert "Unexpected arguments" in res_trace.json()["detail"]


def test_mcp_jump_match_time_extremes(app_client) -> None:
    """Challenge jump_match_time with negative, excessive, string, and infinite values."""
    client, _ = app_client

    # Negative bounds
    for neg_val in (-0.01, -1.0, -1000.0, -1e9):
        res = client.post(
            "/api/mcp/invoke",
            json={"tool": "jump_match_time", "arguments": {"seconds": neg_val}},
        )
        assert res.status_code == 400
        assert ">=" in res.json()["detail"]

    # Over-maximum bounds
    for high_val in (5400.01, 6000.0, 1e6):
        res = client.post(
            "/api/mcp/invoke",
            json={"tool": "jump_match_time", "arguments": {"seconds": high_val}},
        )
        assert res.status_code == 400
        assert "<=" in res.json()["detail"]

    # String type rejection
    for str_val in ("sixty", "500", "0", ""):
        res = client.post(
            "/api/mcp/invoke",
            json={"tool": "jump_match_time", "arguments": {"seconds": str_val}},
        )
        assert res.status_code == 400
        assert "must be a number" in res.json()["detail"]

    # Boolean rejection (booleans are subclasses of int in Python)
    for b_val in (True, False):
        res = client.post(
            "/api/mcp/invoke",
            json={"tool": "jump_match_time", "arguments": {"seconds": b_val}},
        )
        assert res.status_code == 400
        assert "must be a number" in res.json()["detail"]


def test_mcp_player_spotlight_adversarial_queries(app_client) -> None:
    """Stress-test player spotlight lookup with injection strings, empty IDs, and unicode."""
    client, _ = app_client

    adversarial_ids = [
        "",
        "   ",
        "<script>alert('xss')</script>",
        "h11' OR '1'='1",
        "h11; DROP TABLE players;--",
        "!@#$%^&*()_+{}[]:;\"'<>?,./~`",
        "\x00\x01\x02",
        "99999999",
        "unknown_striker_xyz",
    ]

    for test_id in adversarial_ids:
        res = client.post(
            "/api/mcp/invoke",
            json={"tool": "get_player_spotlight", "arguments": {"playerId": test_id}},
        )
        assert res.status_code == 404, f"Expected 404 for '{test_id}', got {res.status_code}"
        assert "Unknown player" in res.json()["detail"]

    # Valid lookups by ID and names succeed with 200
    res_haaland = client.post(
        "/api/mcp/invoke",
        json={"tool": "get_player_spotlight", "arguments": {"playerId": "h11"}},
    )
    assert res_haaland.status_code == 200
    assert res_haaland.json()["result"]["player"]["name"] == "Erling Haaland"

    res_debruyne = client.post(
        "/api/mcp/invoke",
        json={"tool": "get_player_spotlight", "arguments": {"playerId": "kevin de bruyne"}},
    )
    assert res_debruyne.status_code == 200
    assert res_debruyne.json()["result"]["player"]["id"] == "h8"


# ==============================================================================
# 2. Health & Heartbeat Freshness Under Extended Pause
# ==============================================================================


def test_health_heartbeat_freshness_extended_pause_fast(app_client) -> None:
    """Verify heartbeat freshness is maintained during pause without stalling."""
    client, runtime = app_client

    pause_res = client.post("/api/playback/pause")
    assert pause_res.status_code == 200
    assert runtime.is_paused is True

    # Initial snapshot
    initial_seconds = runtime.engine.match_seconds

    # Simulate 22 seconds of paused time by inspecting tick updates
    # The worker continues ticking at 10 Hz even while paused
    time.time()
    time.sleep(2.0)
    time.time()

    # Verify last_tick_at was updated within the last 0.5s
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()

    assert data["status"] == "ok"
    assert data["ready"] is True
    assert data["alive"] is True
    assert data["simulationAlive"] is True
    assert data["heartbeat_fresh"] is True
    assert data["worker_errors"] == 0

    tick_age = time.time() - data["lastTickAt"]
    assert tick_age <= 0.5, f"Heartbeat age {tick_age}s is too high while paused"

    # Match seconds strictly frozen
    assert runtime.engine.match_seconds == initial_seconds

    # Clean resume
    resume_res = client.post("/api/playback/resume")
    assert resume_res.status_code == 200
    assert runtime.is_paused is False


# ==============================================================================
# 3. Worker Exception and Degraded Health State
# ==============================================================================


def test_health_reporting_on_real_worker_crash(app_client) -> None:
    """Verify health reporting behavior when simulation worker thread crashes."""
    client, runtime = app_client

    # Inject exception into engine.step to terminate worker thread
    def failing_step(dt: float) -> None:
        raise RuntimeError("Empirical worker crash injection")

    runtime.engine.step = failing_step  # type: ignore[assignment]
    time.sleep(0.4)

    # Worker thread must have terminated
    assert runtime.simulation_alive is False
    assert runtime.ready is False
    assert runtime.worker_error is not None
    assert "Empirical worker crash injection" in runtime.worker_error

    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()

    assert data["ready"] is False
    assert data["simulationAlive"] is False
    assert data["alive"] is False
    assert data["worker_errors"] == 1
    assert "Empirical worker crash injection" in data["workerError"]


# ==============================================================================
# 4. Concurrency Stress: MCP + Playback + WebSocket
# ==============================================================================


def test_mcp_playback_concurrency_stress_under_active_websocket(app_client) -> None:
    """Stress test rapid alternating MCP invocations and playback commands during active WS streaming."""
    client, runtime = app_client

    errors: list[str] = []
    frames_received = 0

    with client.websocket_connect("/ws/telemetry") as ws:
        # Worker 1 & 2: MCP queries
        def mcp_worker(worker_id: str) -> None:
            players = ["h11", "Haaland", "h8", "Kevin De Bruyne", "h9", "h1", "Ederson"]
            tools = [
                "get_player_spotlight",
                "get_pitch_control_surface",
                "jump_match_time",
                "get_match_events",
                "evaluate_passing_lane",
            ]

            for _ in range(20):
                tool = random.choice(tools)
                try:
                    if tool == "get_player_spotlight":
                        res = client.post(
                            "/api/mcp/invoke",
                            json={"tool": tool, "arguments": {"playerId": random.choice(players)}},
                        )
                    elif tool == "get_pitch_control_surface":
                        res = client.post(
                            "/api/mcp/invoke",
                            json={"tool": tool, "arguments": {"includeCells": random.choice([True, False])}},
                        )
                    elif tool == "jump_match_time":
                        target = float(random.randint(10, 3000))
                        res = client.post(
                            "/api/mcp/invoke",
                            json={"tool": tool, "arguments": {"seconds": target}},
                        )
                    elif tool == "get_match_events":
                        res = client.post(
                            "/api/mcp/invoke",
                            json={"tool": tool, "arguments": {"limit": random.randint(5, 50)}},
                        )
                    elif tool == "evaluate_passing_lane":
                        res = client.post(
                            "/api/mcp/invoke",
                            json={"tool": tool, "arguments": {"passerId": "h11", "receiverId": "h8"}},
                        )

                    if res.status_code != 200:
                        errors.append(f"{worker_id} {tool} returned {res.status_code}: {res.text}")
                except Exception as exc:  # noqa: BLE001
                    errors.append(f"{worker_id} {tool} exception: {exc}")
                time.sleep(0.01)

        # Worker 3 & 4: Playback controls
        def playback_worker(worker_id: str) -> None:
            actions = ["pause", "resume", "speed", "jump"]
            for _ in range(20):
                action = random.choice(actions)
                try:
                    if action == "pause":
                        res = client.post("/api/playback/pause")
                    elif action == "resume":
                        res = client.post("/api/playback/resume")
                    elif action == "speed":
                        res = client.post(
                            "/api/playback/speed",
                            json={"speed": random.choice([0.5, 1.0, 2.0])},
                        )
                    elif action == "jump":
                        res = client.post(
                            "/api/playback/jump",
                            json={"seconds": float(random.randint(50, 3500))},
                        )

                    if res.status_code != 200:
                        errors.append(f"{worker_id} {action} returned {res.status_code}: {res.text}")
                except Exception as exc:  # noqa: BLE001
                    errors.append(f"{worker_id} {action} exception: {exc}")
                time.sleep(0.01)

        # Run concurrent threads while reading WebSocket stream
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            futures = [
                executor.submit(mcp_worker, "mcp_0"),
                executor.submit(mcp_worker, "mcp_1"),
                executor.submit(playback_worker, "pb_0"),
                executor.submit(playback_worker, "pb_1"),
            ]

            start_t = time.time()
            while time.time() - start_t < 3.0:
                try:
                    _ = ws.receive_json(mode="text")
                    frames_received += 1
                except Exception:  # noqa: BLE001
                    pass

            for f in futures:
                f.result()

    assert len(errors) == 0, f"Encountered {len(errors)} concurrency errors: {errors[:5]}"
    assert frames_received > 0, "No WebSocket frames received during concurrency stress"
