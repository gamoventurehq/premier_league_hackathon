"""Empirical Challenger 2 Adversarial Scrubbing & Live Telemetry Test Suite for Milestone M2.

Authoritative target:
- Live Backend: https://plstudio-backend.bluebeach-f4935620.eastus2.azurecontainerapps.io
- Live WebSocket: wss://plstudio-backend.bluebeach-f4935620.eastus2.azurecontainerapps.io/ws/telemetry

Adversarially tests:
1. Rapid timeline scrubbing back-and-forth across match timeline (0.0s, 2700.0s, 5400.0s, 100.0s, and rapid random jumps).
2. Pause followed immediately by jump sequences: verifying paused state persistence, exact matchClock repositioning, and multi-replica session affinity behavior.
3. Out-of-bounds boundary values: negative seconds (-10.0s, -500.0s), exceeding full-time (>5400.0s), zero, 5400.0s, and malformed inputs (HTTP 422).
4. Scrub epoch invalidation: verifying epoch increments, stale AI narrative discard, and post-scrub tactical state consistency.
5. Live WebSocket bidirectional interactive control: jump_time, pause, resume, set_speed over WebSocket stream at 5 Hz.
6. Multi-replica state consistency & concurrent scrub bombardment on Azure Container Apps.
"""

from __future__ import annotations

import asyncio
import concurrent.futures
import json
import random
import time
from typing import Any

import httpx
import pytest
import websockets

LIVE_BASE_URL = "https://plstudio-backend.bluebeach-f4935620.eastus2.azurecontainerapps.io"
LIVE_WS_URL = "wss://plstudio-backend.bluebeach-f4935620.eastus2.azurecontainerapps.io/ws/telemetry"


# ---------------------------------------------------------------------------
# Test 1: Rapid Timeline Scrubbing Back-and-Forth on Live Backend
# ---------------------------------------------------------------------------
def test_live_rapid_back_and_forth_scrubbing() -> None:
    """Adversarially stress live backend with rapid bidirectional jumps (0s, 2700s, 5400s, 100s)."""
    with httpx.Client(base_url=LIVE_BASE_URL, timeout=20.0) as client:
        # Pre-check health
        health = client.get("/health").json()
        assert health["status"] == "ok"
        assert health["simulationAlive"] is True

        # Target jumps from dispatch instructions
        target_jumps = [
            (0.0, "00:00", 0.0),
            (2700.0, "45:00", 2700.0),
            (5400.0, "90:00", 5400.0),
            (100.0, "01:40", 100.0),
            (3600.0, "60:00", 3600.0),
            (0.0, "00:00", 0.0),
            (1800.0, "30:00", 1800.0),
            (5400.0, "90:00", 5400.0),
        ]

        for target_sec, expected_clock, expected_sec in target_jumps:
            res = client.post("/api/playback/jump", json={"seconds": target_sec})
            assert res.status_code == 200, f"Jump to {target_sec} failed: {res.text}"
            data = res.json()
            assert data["matchClock"] == expected_clock, (
                f"Jump to {target_sec}s expected clock {expected_clock}, got {data['matchClock']}"
            )
            assert abs(data["matchSeconds"] - expected_sec) <= 1.0, (
                f"Jump to {target_sec}s expected {expected_sec}s, got {data['matchSeconds']}"
            )

        # High-frequency rapid succession jumps (10 rapid jumps within milliseconds)
        rapid_targets = [150.0, 4200.0, 50.0, 3100.0, 800.0, 5000.0, 1200.0, 200.0, 4800.0, 1000.0]
        for sec in rapid_targets:
            res = client.post("/api/playback/jump", json={"seconds": sec})
            assert res.status_code == 200
            data = res.json()
            assert abs(data["matchSeconds"] - sec) <= 1.5

        # Check status after rapid scrubbing
        status = client.get("/api/playback/status").json()
        assert status["speed"] >= 0.1
        assert "matchClock" in status

        # Ensure live backend remains healthy
        health_after = client.get("/health").json()
        assert health_after["status"] == "ok"
        assert health_after["simulationAlive"] is True
        assert health_after["heartbeat_fresh"] is True


# ---------------------------------------------------------------------------
# Test 2: Pause Followed Immediately by Jump & Multi-Replica Audit
# ---------------------------------------------------------------------------
def test_live_pause_and_jump_sequence_race_condition() -> None:
    """Pause simulation, immediately issue jump, verify paused state & multi-replica behavior."""
    with httpx.Client(base_url=LIVE_BASE_URL, timeout=20.0) as client:
        # Probe replica count by checking multiple GET /health responses
        uptimes = {client.get("/health").json()["uptimeSeconds"] for _ in range(4)}
        has_multiple_replicas = len(uptimes) > 1

        # 1. Pause playback
        res_pause = client.post("/api/playback/pause")
        assert res_pause.status_code == 200
        pause_data = res_pause.json()
        assert pause_data["paused"] is True

        # 2. Immediately jump to 1200.0s (20:00)
        res_jump = client.post("/api/playback/jump", json={"seconds": 1200.0})
        assert res_jump.status_code == 200
        jump_data = res_jump.json()
        assert jump_data["matchClock"] == "20:00"
        assert abs(jump_data["matchSeconds"] - 1200.0) <= 0.5

        # If only 1 replica is active, paused state must be preserved
        if not has_multiple_replicas:
            assert jump_data["paused"] is True

        # 3. Resume playback and verify clean HTTP 200
        res_resume = client.post("/api/playback/resume")
        assert res_resume.status_code == 200
        assert res_resume.json()["paused"] is False


# ---------------------------------------------------------------------------
# Test 3: Boundary Values & Clamping on Live Backend
# ---------------------------------------------------------------------------
def test_live_boundary_values_and_clamping() -> None:
    """Test out-of-range scrub bounds (negative, > 5400s) and malformed payloads on live backend."""
    with httpx.Client(base_url=LIVE_BASE_URL, timeout=20.0) as client:
        # Negative seconds: should clamp to 0.0s ("00:00")
        negative_cases = [-0.1, -10.0, -500.0, -99999.0]
        for neg in negative_cases:
            res = client.post("/api/playback/jump", json={"seconds": neg})
            assert res.status_code == 200, f"Failed on negative seconds {neg}: {res.text}"
            data = res.json()
            assert data["matchClock"] == "00:00", f"Negative {neg}s gave clock {data['matchClock']}"
            assert data["matchSeconds"] == 0.0

        # Exact boundary 0.0s
        res_zero = client.post("/api/playback/jump", json={"seconds": 0.0})
        assert res_zero.status_code == 200
        assert res_zero.json()["matchClock"] == "00:00"
        assert res_zero.json()["matchSeconds"] == 0.0

        # Exact boundary 5400.0s
        res_5400 = client.post("/api/playback/jump", json={"seconds": 5400.0})
        assert res_5400.status_code == 200
        assert res_5400.json()["matchClock"] == "90:00"
        assert res_5400.json()["matchSeconds"] == 5400.0

        # Beyond 5400.0s: should clamp to 5400.0s ("90:00")
        overshoot_cases = [5400.1, 5410.0, 6000.0, 99999.0, 1e7]
        for over in overshoot_cases:
            res = client.post("/api/playback/jump", json={"seconds": over})
            assert res.status_code == 200, f"Failed on overshoot {over}: {res.text}"
            data = res.json()
            assert data["matchClock"] == "90:00", f"Overshoot {over} gave clock {data['matchClock']}"
            assert data["matchSeconds"] == 5400.0

        # Malformed payloads: non-numeric string, missing body, bad types
        malformed_cases = [
            {"seconds": "not_a_number"},
            {"seconds": None},
            {"seconds": [1200.0]},
            {},
        ]
        for payload in malformed_cases:
            res = client.post("/api/playback/jump", json=payload)
            assert res.status_code == 422, f"Expected 422 for {payload}, got {res.status_code}"

        # Server must remain completely healthy after all invalid calls
        health = client.get("/health").json()
        assert health["status"] == "ok"
        assert health["simulationAlive"] is True


# ---------------------------------------------------------------------------
# Test 4: Scrub Epoch Invalidation & Narrative State Consistency
# ---------------------------------------------------------------------------
def test_scrub_epoch_invalidation_and_narrative_isolation() -> None:
    """Test scrub epoch mechanics, ensuring epoch increments and purges stale AI commentary."""
    from app.agents.base import AgentContext, BlackboardView
    from app.agents.broadcast_narrative import NarrativeDraft
    from app.config import Settings
    from app.models import MultilingualNarrative
    from app.runtime import MatchRuntime

    def make_draft(clock: str, text: str) -> NarrativeDraft:
        return NarrativeDraft(
            id=f"draft_{clock}",
            matchClock=clock,
            timestamp=int(time.time()),
            isTacticalInflectionPoint=False,
            headline=MultilingualNarrative(en=text, es=text, fr=text, ja=text, ar=text),
            tacticalExplanation=MultilingualNarrative(en=text, es=text, fr=text, ja=text, ar=text),
            commentatorCue=text,
        )

    settings = Settings(sim_warmup_seconds=0, foundry_enabled=False, event_hubs_enabled=False, cosmos_enabled=False)
    runtime = MatchRuntime(settings)

    def slow_llm(ctx: AgentContext) -> NarrativeDraft:
        clock = ctx.frame.matchClock if ctx.frame else "unknown"
        time.sleep(0.2)
        return make_draft(clock, f"Analysis for {clock}")

    runtime.model_service = slow_llm
    runtime.start()
    assert runtime._ready.wait(timeout=5.0)

    # 1. Pause runtime
    runtime.pause()
    initial_epoch = runtime.scrub_epoch
    assert initial_epoch >= 0

    # 2. Submit async narrative for initial clock (pre-jump epoch)
    context = AgentContext(
        frame=runtime.engine.build_frame(),
        view=BlackboardView(runtime.swarm.blackboard),
        persona=runtime._persona,
    )
    pre_jump_clock = context.frame.matchClock
    runtime.submit_async_narrative(context, epoch=runtime.scrub_epoch)

    # 3. Immediately jump to 2700.0s (45:00) while LLM is running
    time.sleep(0.02)
    runtime.jump_to_seconds(2700.0)
    assert runtime.scrub_epoch == initial_epoch + 1
    assert abs(runtime.engine.match_seconds - 2700.0) <= 0.2

    # 4. Wait for slow LLM inference to resolve
    time.sleep(0.5)

    # 5. Verify that stale pre-jump narrative was DISCARDED and post-jump narrative committed
    assert runtime._active_ai_narrative is not None
    assert "45:00" in runtime._active_ai_narrative.headline.en
    assert pre_jump_clock not in runtime._active_ai_narrative.headline.en

    runtime.stop()


# ---------------------------------------------------------------------------
# Test 5: Live WebSocket Playback Control & Telemetry Synchronization
# ---------------------------------------------------------------------------
def test_live_websocket_playback_scrubbing_and_telemetry() -> None:
    """Test interactive scrubbing over live secure WebSocket (wss://.../ws/telemetry)."""

    async def _runner() -> None:
        async with websockets.connect(LIVE_WS_URL, close_timeout=10.0, open_timeout=10.0) as ws:
            # 1. Receive initial live telemetry frame
            msg_raw = await asyncio.wait_for(ws.recv(), timeout=5.0)
            data = json.loads(msg_raw)
            assert "frame" in data
            assert "blackboard" in data
            assert "sentAtMs" in data
            assert data["sentAtMs"] > 0

            initial_frame = data["frame"]
            assert len(initial_frame["players"]) == 22
            assert "pitchControl" in initial_frame["metrics"]

            # 2. Send jump_time over WebSocket to 1800.0s (30:00)
            jump_msg = {
                "type": "jump_time",
                "seconds": 1800.0,
            }
            await ws.send(json.dumps(jump_msg))

            # Wait for jumped frame
            jumped_frame = None
            for _ in range(8):
                msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=5.0))
                frame = msg["frame"]
                if "30:" in frame["matchClock"] or abs(frame["matchSeconds"] - 1800.0) <= 5.0:
                    jumped_frame = frame
                    break

            assert jumped_frame is not None, "WebSocket did not receive jumped frame near 1800.0s"
            assert "30:" in jumped_frame["matchClock"]
            assert len(jumped_frame["players"]) == 22

            # 3. Send pause over WebSocket
            await ws.send(json.dumps({"type": "pause"}))
            await asyncio.sleep(0.3)

            # 4. Send resume over WebSocket
            await ws.send(json.dumps({"type": "resume"}))
            await ws.send(json.dumps({"type": "set_speed", "speed": 1.0}))

            # 5. Send jump_time to 100.0s (01:40)
            await ws.send(json.dumps({"type": "jump_time", "seconds": 100.0}))

            hundred_frame = None
            for _ in range(8):
                msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=5.0))
                frame = msg["frame"]
                if "01:" in frame["matchClock"] or abs(frame["matchSeconds"] - 100.0) <= 5.0:
                    hundred_frame = frame
                    break

            assert hundred_frame is not None, "WebSocket did not receive jumped frame at 100.0s"

            # Receive 3 continuous frames to confirm 5 Hz stream health
            received_frames = []
            for _ in range(3):
                msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=5.0))
                received_frames.append(msg)

            assert len(received_frames) == 3
            for item in received_frames:
                assert len(item["frame"]["players"]) == 22
                assert item["sentAtMs"] > 0

    asyncio.run(_runner())


# ---------------------------------------------------------------------------
# Test 6: Multi-Replica State Consistency & Concurrent Scrub Bombardment
# ---------------------------------------------------------------------------
def test_live_concurrent_scrub_bombardment_and_replica_affinity() -> None:
    """Stress live backend with concurrent playback requests and audit replica consistency."""
    base_client = httpx.Client(base_url=LIVE_BASE_URL, timeout=20.0)

    # Pre-check health
    assert base_client.get("/health").status_code == 200

    operations = [
        ("jump", lambda rng: {"seconds": rng.choice([0.0, 100.0, 1200.0, 2700.0, 4500.0, 5400.0])}),
        ("pause", lambda _: {}),
        ("resume", lambda _: {}),
        ("speed", lambda rng: {"speed": rng.choice([0.5, 1.0, 1.5, 2.0])}),
    ]

    errors: list[str] = []
    status_codes: list[int] = []

    def bombardment_worker(worker_id: int) -> None:
        rng = random.Random(7000 + worker_id)
        with httpx.Client(base_url=LIVE_BASE_URL, timeout=25.0) as client:
            for _ in range(8):
                op_name, payload_fn = rng.choice(operations)
                url = f"/api/playback/{op_name}"
                payload = payload_fn(rng)
                try:
                    res = client.post(url, json=payload)
                    status_codes.append(res.status_code)
                    if res.status_code != 200:
                        errors.append(f"Worker {worker_id}: HTTP {res.status_code} for {url} with {payload}: {res.text}")
                except Exception as exc:  # noqa: BLE001
                    errors.append(f"Worker {worker_id}: Request {url} failed with exception: {exc}")

    # Launch 4 concurrent threads
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures = [pool.submit(bombardment_worker, i) for i in range(4)]
        concurrent.futures.wait(futures)

    # Assert 0 errors during controlled concurrency
    assert len(errors) == 0, f"Bombardment encountered {len(errors)} errors:\n" + "\n".join(errors[:10])
    assert len(status_codes) == 4 * 8
    assert all(code == 200 for code in status_codes)

    # Post-check: restore simulation to resumed state at 1.0x speed
    base_client.post("/api/playback/resume")
    base_client.post("/api/playback/speed", json={"speed": 1.0})
    base_client.post("/api/playback/jump", json={"seconds": 1800.0})

    health = base_client.get("/health").json()
    assert health["status"] == "ok"
    assert health["simulationAlive"] is True
    assert health["heartbeat_fresh"] is True

    base_client.close()
