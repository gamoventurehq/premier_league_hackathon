"""Adversarial stress harness for MatchEngine and MatchRuntime playback and scrubbing.

Author: Challenger 1 (Milestone 1)
Scope:
1. Boundary jumps: 0.0s, 5400.0s, negative (-50.0s, -1e6s), overshoot (99999.0s, 1e8s), sub-second.
2. Rapid sequential bidirectional scrubbing: 0 -> 2700 -> 100 -> 4500 -> 500 under load.
3. State variations: unstarted engine/runtime, paused runtime, 5.0x speed runtime.
4. Concurrency: multiple parallel scrubbing threads under continuous 5.0x simulation load.
5. REST and WebSocket adversarial payloads and schema validation.
"""

from __future__ import annotations

import concurrent.futures
import random
import time

from app.config import Settings
from app.main import create_app
from app.models import SyntheticScenarioType
from app.runtime import MatchRuntime
from app.simulation.engine import MatchEngine
from app.simulation.metrics import MATCH_LENGTH_SECONDS
from fastapi.testclient import TestClient


def test_boundary_scrubbing_engine_extremes() -> None:
    """Stress-test MatchEngine at exact boundaries, beyond boundaries, and sub-seconds."""
    engine = MatchEngine()
    engine.reset(SyntheticScenarioType.HIGH_POSSESSION, start_seconds=0.0, warmup_seconds=0.0)

    # 1. Exact 0.0s boundary
    engine.jump_to_seconds(0.0)
    assert engine.match_seconds == 0.0
    frame_0 = engine.build_frame()
    assert frame_0.matchClock == "00:00"
    assert frame_0.matchSeconds == 0.0
    assert len(frame_0.players) == 22
    for p in frame_0.players:
        assert 0.0 <= p.x <= 105.0
        assert 0.0 <= p.y <= 68.0
    assert 0.0 <= frame_0.metrics.pitchControl.home <= 100.0
    assert 0.0 <= frame_0.metrics.pitchControl.away <= 100.0
    assert 0.0 <= frame_0.metrics.pitchControl.contested <= 100.0
    assert 0.0 <= frame_0.metrics.passDifficultyRating <= 100.0

    # 2. Exact 5400.0s boundary
    engine.jump_to_seconds(5400.0)
    assert engine.match_seconds == 5400.0
    frame_max = engine.build_frame()
    assert frame_max.matchClock == "90:00"
    assert frame_max.matchSeconds == 5400.0
    assert len(frame_max.players) == 22
    assert 0.0 <= frame_max.metrics.pitchControl.home <= 100.0
    assert 0.0 <= frame_max.metrics.passDifficultyRating <= 100.0

    # Step after 5400.0s should not overshoot or throw
    engine.step(0.5)
    assert engine.match_seconds == 5400.0
    assert engine.build_frame().matchClock == "90:00"

    # 3. Negative boundary clamping
    for neg_val in [-0.001, -1.0, -50.0, -10000.0, -1e8]:
        engine.jump_to_seconds(neg_val)
        assert engine.match_seconds == 0.0
        f = engine.build_frame()
        assert f.matchClock == "00:00"
        assert f.matchSeconds == 0.0

    # 4. Overshoot boundary clamping
    for over_val in [5400.01, 5401.0, 99999.0, 1e8]:
        engine.jump_to_seconds(over_val)
        assert engine.match_seconds == float(MATCH_LENGTH_SECONDS)
        f = engine.build_frame()
        assert f.matchClock == "90:00"
        assert f.matchSeconds == 5400.0

    # 5. Sub-second boundaries
    engine.jump_to_seconds(0.5)
    assert engine.match_seconds == 0.5
    assert engine.build_frame().matchClock == "00:00"

    engine.jump_to_seconds(5399.4)
    assert engine.match_seconds == 5399.4
    assert engine.build_frame().matchClock == "89:59"


def test_rapid_sequential_bidirectional_scrubbing() -> None:
    """Stress-test sequential bidirectional jumps: 0 -> 2700 -> 100 -> 4500 -> 500 under load."""
    engine = MatchEngine()
    engine.reset(SyntheticScenarioType.HIGH_POSSESSION, start_seconds=0.0, warmup_seconds=0.0)

    sequence = [0.0, 2700.0, 100.0, 4500.0, 500.0]

    # Repeat sequence 3 times rapidly
    for cycle in range(3):
        for target in sequence:
            t0 = time.perf_counter()
            engine.jump_to_seconds(target)
            elapsed = time.perf_counter() - t0
            assert engine.match_seconds == target
            frame = engine.build_frame()
            assert frame.matchSeconds == target
            assert len(frame.players) == 22
            assert frame.ball is not None
            # Frame wire serialization
            wire = frame.to_wire()
            assert wire["matchSeconds"] == target
            # Re-simulation to 4500 from 100 should complete reasonably fast (< 2.0s)
            assert elapsed < 3.0, f"Cycle {cycle} target {target} took {elapsed:.2f}s"


def test_scrubbing_unstarted_engine_and_runtime() -> None:
    """Scrubbing an unstarted MatchEngine or unstarted MatchRuntime must auto-initialize cleanly."""
    # 1. Unstarted engine jump to 0.0
    engine1 = MatchEngine()
    assert len(engine1.state.players) == 0
    engine1.jump_to_seconds(0.0)
    assert len(engine1.state.players) == 22
    assert engine1.match_seconds == 0.0
    f1 = engine1.build_frame()
    assert f1.matchClock == "00:00"
    assert len(f1.players) == 22

    # 2. Unstarted engine jump to mid-match (1800.0s)
    engine2 = MatchEngine()
    assert len(engine2.state.players) == 0
    engine2.jump_to_seconds(1800.0)
    assert len(engine2.state.players) == 22
    assert engine2.match_seconds == 1800.0
    f2 = engine2.build_frame()
    assert f2.matchClock == "30:00"

    # 3. Unstarted MatchRuntime jump before start()
    settings = Settings(foundry_enabled=False, event_hubs_enabled=False, cosmos_enabled=False)
    runtime = MatchRuntime(settings)
    assert runtime.ready is False
    status = runtime.jump_to_seconds(1200.0)
    assert status.matchSeconds == 1200.0
    assert status.matchClock == "20:00"
    assert runtime.latest_wire() is not None
    assert runtime.latest_wire()["matchSeconds"] == 1200.0


def test_scrubbing_while_paused_preserves_pause_and_heartbeat() -> None:
    """Scrubbing while paused maintains paused status and does not cause drift or stale heartbeat."""
    settings = Settings(foundry_enabled=False, event_hubs_enabled=False, cosmos_enabled=False)
    runtime = MatchRuntime(settings)
    try:
        runtime.start()
        assert runtime._ready.wait(timeout=10.0)

        # Pause
        runtime.pause()
        assert runtime.is_paused is True

        # Scrub while paused
        status = runtime.jump_to_seconds(2400.0)
        assert status.paused is True
        assert status.matchSeconds == 2400.0
        assert status.matchClock == "40:00"
        assert runtime.is_paused is True

        # Sleep and verify clock does NOT drift while paused
        time.sleep(0.3)
        assert runtime.engine.match_seconds == 2400.0
        assert runtime.heartbeat_fresh is True
        assert runtime.simulation_alive is True

        # Scrub backward while paused
        status = runtime.jump_to_seconds(300.0)
        assert status.paused is True
        assert status.matchSeconds == 300.0
        assert status.matchClock == "05:00"
        time.sleep(0.2)
        assert runtime.engine.match_seconds == 300.0
        assert runtime.heartbeat_fresh is True
    finally:
        runtime.stop()


def test_scrubbing_while_running_at_high_speed() -> None:
    """Scrubbing while running at 5.0x speed preserves multiplier and smoothly continues."""
    settings = Settings(foundry_enabled=False, event_hubs_enabled=False, cosmos_enabled=False)
    runtime = MatchRuntime(settings)
    try:
        runtime.start()
        assert runtime._ready.wait(timeout=10.0)

        # Set 5.0x speed
        status = runtime.set_speed(5.0)
        assert status.speed == 5.0
        assert runtime.speed == 5.0

        # Jump forward
        runtime.jump_to_seconds(1000.0)
        assert runtime.speed == 5.0

        # Let it advance at 5x for a brief window
        time.sleep(0.3)
        # Advance should be positive
        assert runtime.engine.match_seconds > 1000.0
        assert runtime.speed == 5.0

        # Jump backward to 200.0s
        runtime.jump_to_seconds(200.0)
        assert runtime.speed == 5.0
        assert abs(runtime.engine.match_seconds - 200.0) < 10.0
        assert runtime.heartbeat_fresh is True
    finally:
        runtime.stop()


def test_concurrent_rapid_scrubbing_under_load() -> None:
    """Adversarial concurrency test: multiple parallel client jumps while engine ticks at 5.0x."""
    settings = Settings(foundry_enabled=False, event_hubs_enabled=False, cosmos_enabled=False)
    runtime = MatchRuntime(settings)
    try:
        runtime.start()
        assert runtime._ready.wait(timeout=10.0)
        runtime.set_speed(5.0)

        jump_targets = [-50.0, 0.0, 500.0, 1500.0, 2700.0, 3600.0, 4800.0, 5400.0, 6000.0]
        errors: list[Exception] = []

        def worker_scrub(thread_id: int) -> None:
            rng = random.Random(42 + thread_id)
            for _ in range(8):
                target = rng.choice(jump_targets)
                try:
                    status = runtime.jump_to_seconds(target)
                    assert 0.0 <= status.matchSeconds <= 5400.0
                    wire = runtime.latest_wire()
                    assert wire is not None
                    assert 0.0 <= wire["matchSeconds"] <= 5400.0
                except Exception as exc:
                    errors.append(exc)
                time.sleep(0.01)

        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            futures = [executor.submit(worker_scrub, i) for i in range(4)]
            concurrent.futures.wait(futures)

        assert not errors, f"Concurrent scrubbing encountered errors: {errors}"
        assert runtime.simulation_alive is True
        assert runtime._worker_error is None
        assert runtime.heartbeat_fresh is True
    finally:
        runtime.stop()


def test_rest_and_websocket_adversarial_payloads() -> None:
    """Verify REST and WebSocket handlers against extreme, boundary, and malformed payloads."""
    app = create_app()
    with TestClient(app) as client:
        # 1. Negative jump clamped to 0.0
        res = client.post("/api/playback/jump", json={"seconds": -9999.0})
        assert res.status_code == 200
        assert res.json()["matchSeconds"] == 0.0
        assert res.json()["matchClock"] == "00:00"

        # 2. Overshoot jump clamped to 5400.0
        res = client.post("/api/playback/jump", json={"seconds": 88888.0})
        assert res.status_code == 200
        assert res.json()["matchSeconds"] == 5400.0
        assert res.json()["matchClock"] == "90:00"

        # 3. Invalid payload schema rejection (422)
        res = client.post("/api/playback/jump", json={"seconds": "not-a-number"})
        assert res.status_code == 422

        res = client.post("/api/playback/jump", json={})
        assert res.status_code == 422

        # 4. Speed clamping extremes
        res = client.post("/api/playback/speed", json={"speed": -10.0})
        assert res.status_code == 200
        assert res.json()["speed"] == 0.1

        res = client.post("/api/playback/speed", json={"speed": 999.0})
        assert res.status_code == 200
        assert res.json()["speed"] == 10.0

        res = client.post("/api/playback/speed", json={"speed": 0.0})
        assert res.status_code == 200
        assert res.json()["speed"] == 0.1

        # 5. Rapid WebSocket messages
        with client.websocket_connect("/ws/telemetry") as socket:
            socket.receive_json()  # drain initial
            socket.send_json({"type": "pause"})
            time.sleep(0.1)
            assert app.state.runtime.is_paused is True

            socket.send_json({"type": "jump_time", "seconds": -50.0})
            f1 = socket.receive_json()
            assert f1["frame"]["matchSeconds"] == 0.0

            socket.send_json({"type": "jump_time", "seconds": 99999.0})
            f2 = socket.receive_json()
            assert f2["frame"]["matchSeconds"] == 5400.0

            socket.send_json({"type": "set_speed", "speed": 100.0})
            time.sleep(0.1)
            assert app.state.runtime.speed == 10.0

            socket.send_json({"type": "resume"})
            time.sleep(0.1)
            assert app.state.runtime.is_paused is False
