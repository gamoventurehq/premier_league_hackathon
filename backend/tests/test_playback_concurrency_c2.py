"""Empirical Challenger 2 stress test suite for Milestone 1.

Verifies:
1. Concurrency: rapid parallel POST requests to /api/playback/jump, pause, resume, speed.
2. Heartbeat freshness: pause simulation for 30s and poll GET /health to verify
   simulationAlive=True, ready=True, and status="ok" throughout.
3. Speed limit fuzzing: multipliers 0.0, -1.0, 100.0, NaN, 0.5, 10.0 (and inf/-inf)
   to verify clamping and stability over REST, WebSocket, and runtime.
"""

from __future__ import annotations

import concurrent.futures
import math
import random
import time
from typing import Any

import pytest
from app.api.websocket import _handle_client_message
from app.config import Settings
from app.main import create_app
from app.runtime import MatchRuntime
from fastapi.testclient import TestClient


def test_concurrency_rapid_parallel_rest_playback_controls() -> None:
    """Fire rapid parallel POST requests to /api/playback/jump, pause, resume, speed."""
    app = create_app()
    with TestClient(app) as client:
        # Wait until runtime is ready
        runtime: MatchRuntime = app.state.runtime
        assert runtime._ready.wait(timeout=10.0)
        assert runtime.ready is True

        operations = [
            (
                "jump",
                lambda rng: {"seconds": rng.choice([0.0, 120.0, 450.0, 1200.0, 2700.0, 4500.0, 5400.0])},
            ),
            ("pause", lambda _: {}),
            ("resume", lambda _: {}),
            ("speed", lambda rng: {"speed": rng.choice([0.1, 0.5, 1.0, 2.0, 5.0, 10.0])}),
        ]

        errors: list[str] = []
        status_codes: list[int] = []

        def worker_task(thread_id: int) -> None:
            rng = random.Random(1000 + thread_id)
            for _ in range(25):
                op_name, payload_fn = rng.choice(operations)
                url = f"/api/playback/{op_name}"
                payload = payload_fn(rng)
                try:
                    res = client.post(url, json=payload)
                    status_codes.append(res.status_code)
                    if res.status_code != 200:
                        errors.append(f"HTTP {res.status_code} for {url} with {payload}: {res.text}")
                    else:
                        data = res.json()
                        if "paused" not in data or "speed" not in data or "matchSeconds" not in data:
                            errors.append(f"Malformed response schema from {url}: {data}")
                        if not (0.1 <= data["speed"] <= 10.0):
                            errors.append(f"Speed out of bounds: {data['speed']}")
                        if not (0.0 <= data["matchSeconds"] <= 5400.0):
                            errors.append(f"Match seconds out of bounds: {data['matchSeconds']}")
                except Exception as exc:
                    errors.append(f"Exception calling {url} with {payload}: {exc}")

        # 8 concurrent worker threads firing 25 requests each = 200 parallel requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
            futures = [executor.submit(worker_task, i) for i in range(8)]
            concurrent.futures.wait(futures)

        assert not errors, (
            f"Encountered {len(errors)} errors during concurrent playback requests:\n"
            + "\n".join(errors[:10])
        )
        assert len(status_codes) == 200
        assert all(code == 200 for code in status_codes)

        # Confirm runtime survived with zero errors
        assert runtime.simulation_alive is True
        assert runtime._worker_error is None
        assert runtime.ready is True
        assert runtime.heartbeat_fresh is True


def test_concurrency_interleaved_websocket_and_rest() -> None:
    """Interleave WebSocket client telemetry consumption with concurrent REST playback mutations."""
    app = create_app()
    with TestClient(app) as client, client.websocket_connect("/ws/telemetry") as ws:
        runtime: MatchRuntime = app.state.runtime
        assert runtime._ready.wait(timeout=10.0)

        # Drain initial envelope
        initial_env = ws.receive_json()
        assert "frame" in initial_env

        ws_frames_received: list[dict[str, Any]] = []
        rest_errors: list[str] = []
        stop_ws = False

        def ws_drain_loop() -> None:
            while not stop_ws:
                try:
                    env = ws.receive_json()
                    ws_frames_received.append(env)
                except Exception:
                    break

        import threading

        ws_thread = threading.Thread(target=ws_drain_loop, daemon=True)
        ws_thread.start()

        # Fire concurrent REST commands
        def rest_mutations() -> None:
            for s in [500.0, 1000.0, 1500.0, 2000.0]:
                r = client.post("/api/playback/jump", json={"seconds": s})
                if r.status_code != 200:
                    rest_errors.append(f"Jump {s} failed: {r.status_code}")
                client.post("/api/playback/speed", json={"speed": 4.0})
                client.post("/api/playback/pause")
                time.sleep(0.05)
                client.post("/api/playback/resume")

        rest_thread = threading.Thread(target=rest_mutations)
        rest_thread.start()
        rest_thread.join(timeout=10.0)
        time.sleep(0.3)
        stop_ws = True

        assert not rest_errors, f"REST mutations during WebSocket failed: {rest_errors}"
        assert len(ws_frames_received) > 0, "No frames received over WebSocket during concurrency"
        for env in ws_frames_received:
            assert "frame" in env
            assert "blackboard" in env
            assert 0.0 <= env["frame"]["matchSeconds"] <= 5400.0


def test_heartbeat_freshness_during_30s_pause() -> None:
    """Pause simulation for 30 seconds and poll GET /health to verify freshness and stability."""
    app = create_app()
    with TestClient(app) as client:
        runtime: MatchRuntime = app.state.runtime
        assert runtime._ready.wait(timeout=10.0)

        # Verify initial health
        res = client.get("/api/health")
        assert res.status_code == 200
        initial_health = res.json()
        assert initial_health["status"] == "ok"
        assert initial_health["ready"] is True
        assert initial_health["simulationAlive"] is True

        # Pause simulation
        pause_res = client.post("/api/playback/pause")
        assert pause_res.status_code == 200
        assert pause_res.json()["paused"] is True
        assert runtime.is_paused is True

        # Poll /health continuously for 30 full seconds
        poll_interval_seconds = 1.0
        duration_seconds = 30.5
        start_time = time.time()
        poll_count = 0

        stale_heartbeats: list[dict[str, Any]] = []
        frozen_seconds = runtime.engine.match_seconds

        while (time.time() - start_time) < duration_seconds:
            poll_res = client.get("/api/health")
            assert poll_res.status_code == 200
            h = poll_res.json()

            poll_count += 1
            now = time.time()
            last_tick = h.get("lastTickAt", 0.0)
            tick_age = now - last_tick

            # Heartbeat must never be stale (> 15s); in fact it should be < 2.0s
            if tick_age > runtime.HEARTBEAT_STALE_SECONDS or not h.get("ready") or h.get("status") != "ok":
                stale_heartbeats.append(
                    {
                        "poll": poll_count,
                        "elapsed": round(now - start_time, 2),
                        "tickAge": round(tick_age, 2),
                        "ready": h.get("ready"),
                        "status": h.get("status"),
                        "simulationAlive": h.get("simulationAlive"),
                    }
                )

            assert h["status"] == "ok", f"Health status degraded at poll {poll_count}: {h}"
            assert h["ready"] is True, f"Health ready became False at poll {poll_count}: {h}"
            assert h["simulationAlive"] is True, f"simulationAlive became False at poll {poll_count}: {h}"
            assert h["workerError"] is None, f"workerError encountered at poll {poll_count}: {h}"

            # Verify simulation time is frozen while paused
            assert abs(runtime.engine.match_seconds - frozen_seconds) <= 0.001

            time.sleep(poll_interval_seconds)

        assert not stale_heartbeats, f"Stale heartbeats detected during 30s pause: {stale_heartbeats}"
        assert poll_count >= 30, f"Expected at least 30 health polls, got {poll_count}"

        # Resume simulation and verify it continues stepping cleanly
        resume_res = client.post("/api/playback/resume")
        assert resume_res.status_code == 200
        assert resume_res.json()["paused"] is False
        assert runtime.is_paused is False

        # Sleep briefly and confirm match time resumes advancing
        time.sleep(0.5)
        assert runtime.engine.match_seconds > frozen_seconds

        # Final health check
        final_health = client.get("/api/health").json()
        assert final_health["status"] == "ok"
        assert final_health["ready"] is True
        assert final_health["simulationAlive"] is True


def test_speed_limit_fuzzing_rest_endpoints() -> None:
    """Fuzz speed multipliers: 0.0, -1.0, 100.0, NaN, 0.5, 10.0, inf, -inf."""
    app = create_app()
    with TestClient(app) as client:
        runtime: MatchRuntime = app.state.runtime
        assert runtime._ready.wait(timeout=10.0)

        # Multipliers and expected clamped speeds
        test_cases = [
            (0.0, 0.1),
            (-1.0, 0.1),
            (-9999.0, 0.1),
            (100.0, 10.0),
            (9999.0, 10.0),
            (0.5, 0.5),
            (1.0, 1.0),
            (10.0, 10.0),
            ("NaN", 10.0),
            ("nan", 10.0),
            ("inf", 10.0),
            ("-inf", 0.1),
        ]

        for input_val, expected_speed in test_cases:
            res = client.post("/api/playback/speed", json={"speed": input_val})
            assert res.status_code == 200, f"Failed for speed input {input_val}: {res.text}"
            data = res.json()
            assert data["speed"] == expected_speed, (
                f"Expected speed {expected_speed} for input {input_val}, got {data['speed']}"
            )
            assert not math.isnan(data["speed"])
            assert not math.isinf(data["speed"])

            # Verify status endpoint reflects clamped speed
            status_res = client.get("/api/playback/status")
            assert status_res.status_code == 200
            assert status_res.json()["speed"] == expected_speed

        # Verify invalid non-numeric inputs are rejected with 422
        for invalid_input in ["not_a_number", [1.0], None]:
            res = client.post("/api/playback/speed", json={"speed": invalid_input})
            assert res.status_code == 422, f"Expected 422 for {invalid_input}, got {res.status_code}"


@pytest.mark.anyio
async def test_speed_limit_fuzzing_websocket_and_runtime() -> None:
    """Directly fuzz speed multiplier on MatchRuntime and WebSocket message handler."""
    settings = Settings(foundry_enabled=False, event_hubs_enabled=False, cosmos_enabled=False)
    runtime = MatchRuntime(settings)

    # Direct runtime speed clamping
    cases = [
        (0.0, 0.1),
        (-1.0, 0.1),
        (100.0, 10.0),
        (float("nan"), 10.0),
        (0.5, 0.5),
        (10.0, 10.0),
        (float("inf"), 10.0),
        (float("-inf"), 0.1),
    ]

    for val, expected in cases:
        status = runtime.set_speed(val)
        assert status.speed == expected, f"runtime.set_speed({val}) expected {expected}, got {status.speed}"
        assert runtime.speed == expected
        assert not math.isnan(status.speed)

    # WebSocket client message handler fuzzing
    ws_cases = [
        ({"type": "set_speed", "speed": 0.0}, 0.1),
        ({"type": "set_speed", "speed": -1.0}, 0.1),
        ({"type": "set_speed", "speed": 100.0}, 10.0),
        ({"type": "set_speed", "speed": "NaN"}, 10.0),
        ({"type": "set_speed", "speed": 0.5}, 0.5),
        ({"type": "set_speed", "speed": 10.0}, 10.0),
        ({"type": "set_speed", "speed": "invalid_string"}, 10.0),  # Should be caught & ignored
        ({"type": "set_speed"}, 10.0),  # Missing speed key should be ignored
        ({"type": "set_speed", "speed": None}, 10.0),  # None should be ignored
    ]

    for msg, expected in ws_cases:
        await _handle_client_message(runtime, msg)
        assert runtime.speed == expected, f"WS message {msg} expected speed {expected}, got {runtime.speed}"
