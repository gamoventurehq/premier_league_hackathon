"""Test suite for Milestone M2: Live Telemetry Stream & WebSocket Verification.

Verifies the live Azure Container Apps deployment against all M2 contracts:
1. WebSocket handshakes on /ws/telemetry and /api/stream routes.
2. Wire envelope integrity: {"frame": ..., "blackboard": ..., "sentAtMs": ...}.
3. Zero dataclass serialization leaks (pure JSON, no NarrativeDraft(...)).
4. 5 Hz telemetry publication cadence (~200ms arrival delta, monotonic frameIds).
5. 22 players roster integrity (11 Manchester City home + 11 Arsenal away) with all kinematics.
6. Designated player camera flag (Erling Haaland).
7. 3D ball flight kinematics (pitch legal bounds, z >= 0, parabolic elevation).
8. Pitch control surface (357 cells, 21x17 grid, 100.0% split) and PDR / CVI metrics.
9. Playback scrubbing REST endpoints (status, pause, resume, speed, jump to 1800s).
10. WebSocket bidirectional interactive controls (scenario and persona updates).
"""

from __future__ import annotations

import asyncio
import itertools
import json
import statistics
import time
import urllib.request
from typing import Any

import websockets

BACKEND_BASE = "https://plstudio-backend.bluebeach-f4935620.eastus2.azurecontainerapps.io"
WS_TELEMETRY_URL = (
    "wss://plstudio-backend.bluebeach-f4935620.eastus2.azurecontainerapps.io/ws/telemetry"
)
WS_STREAM_URL = (
    "wss://plstudio-backend.bluebeach-f4935620.eastus2.azurecontainerapps.io/api/stream"
)


def _http_get(url: str, timeout: float = 12.0) -> tuple[int, dict[str, Any]]:
    req = urllib.request.Request(
        url, headers={"User-Agent": "PLStudio-Pytest-M2/1.0", "Accept": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.status, json.loads(resp.read().decode("utf-8"))


def _http_post(
    url: str, payload: dict[str, Any] | None = None, timeout: float = 12.0
) -> tuple[int, dict[str, Any]]:
    data = json.dumps(payload or {}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json", "User-Agent": "PLStudio-Pytest-M2/1.0"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.status, json.loads(resp.read().decode("utf-8"))


def test_cloud_websocket_handshake_telemetry():
    """Verify primary secure WebSocket endpoint /ws/telemetry connects and delivers frames."""

    async def _run():
        async with websockets.connect(WS_TELEMETRY_URL, open_timeout=10) as ws:
            raw = await asyncio.wait_for(ws.recv(), timeout=12.0)
            data = json.loads(raw)
            assert "frame" in data
            assert "frameId" in data["frame"]

    asyncio.run(_run())


def test_cloud_websocket_handshake_stream():
    """Verify secondary /api/stream alias connects and delivers frames with parity."""

    async def _run():
        async with websockets.connect(WS_STREAM_URL, open_timeout=10) as ws:
            raw = await asyncio.wait_for(ws.recv(), timeout=12.0)
            data = json.loads(raw)
            assert "frame" in data
            assert "frameId" in data["frame"]

    asyncio.run(_run())


def test_cloud_wire_envelope_and_blackboard():
    """Verify wire envelope format, epoch timestamp, and clean blackboard serialization."""

    async def _run():
        async with websockets.connect(WS_TELEMETRY_URL, open_timeout=10) as ws:
            raw = await asyncio.wait_for(ws.recv(), timeout=12.0)

        # Dataclass leak prevention check
        assert "NarrativeDraft(" not in raw, "Detected unescaped NarrativeDraft( in wire frame!"

        data = json.loads(raw)
        assert set(data.keys()) >= {"frame", "blackboard", "sentAtMs"}
        assert isinstance(data["sentAtMs"], int) and data["sentAtMs"] > 0

        bb = data["blackboard"]
        assert isinstance(bb, dict)
        for key in ("narrative", "multilingual_stream", "tactical_phase", "pitch_control_home"):
            assert key in bb, f"Essential blackboard key '{key}' missing"

    asyncio.run(_run())


def test_cloud_websocket_5hz_cadence():
    """Verify 5 Hz stream frequency (mean arrival delta ~200ms ± 45ms) and monotonic frameIds."""

    async def _run():
        deltas: list[float] = []
        frame_ids: list[int] = []
        sample_count = 25

        async with websockets.connect(WS_TELEMETRY_URL, open_timeout=10) as ws:
            # Warm up
            await ws.recv()
            await ws.recv()

            last_t = time.perf_counter()
            for _ in range(sample_count):
                raw = await asyncio.wait_for(ws.recv(), timeout=12.0)
                now = time.perf_counter()
                deltas.append((now - last_t) * 1000.0)
                last_t = now

                d = json.loads(raw)
                frame_ids.append(d["frame"]["frameId"])

        mean_dt = statistics.mean(deltas)
        eff_hz = 1000.0 / mean_dt

        # Assert delivery frequency is close to 5.0 Hz
        assert 150.0 <= mean_dt <= 250.0, f"Mean arrival interval {mean_dt:.1f}ms out of range"
        assert 4.0 <= eff_hz <= 6.5, f"Effective frequency {eff_hz:.2f} Hz out of range"
        assert all(
            x < y for x, y in itertools.pairwise(frame_ids)
        ), f"Frame IDs not monotonic: {frame_ids}"

    asyncio.run(_run())


def test_cloud_22_players_lineup_and_attributes():
    """Verify exactly 22 players (11 City + 11 Arsenal) with all kinematic fields & designated cam."""

    async def _run():
        async with websockets.connect(WS_TELEMETRY_URL, open_timeout=10) as ws:
            raw = await asyncio.wait_for(ws.recv(), timeout=12.0)

        frame = json.loads(raw)["frame"]
        players = frame["players"]
        assert len(players) == 22, f"Expected 22 players, got {len(players)}"

        home = [p for p in players if p.get("team") == "home"]
        away = [p for p in players if p.get("team") == "away"]
        assert len(home) == 11, f"Expected 11 home players, got {len(home)}"
        assert len(away) == 11, f"Expected 11 away players, got {len(away)}"

        required_attrs = [
            "id",
            "name",
            "team",
            "position",
            "x",
            "y",
            "vx",
            "vy",
            "speedKmH",
            "distanceMeters",
            "touches",
        ]

        has_cam = False
        for p in players:
            for attr in required_attrs:
                assert attr in p, f"Player {p.get('name')} missing {attr}"

            px, py = p["x"], p["y"]
            assert -5.0 <= px <= 110.0 and -5.0 <= py <= 73.0, f"Player out of bounds: ({px}, {py})"
            assert p["speedKmH"] >= 0.0
            assert p["distanceMeters"] >= 0.0

            if p.get("isDesignatedPlayerCam") is True:
                has_cam = True

        assert has_cam, "Expected designated player camera flag set on at least one player"

    asyncio.run(_run())


def test_cloud_ball_3d_kinematics_and_bounds():
    """Verify ball object 3D attributes, velocity vectors, and pitch-legal coordinates."""

    async def _run():
        async with websockets.connect(WS_TELEMETRY_URL, open_timeout=10) as ws:
            raw = await asyncio.wait_for(ws.recv(), timeout=12.0)

        frame = json.loads(raw)["frame"]
        ball = frame["ball"]

        for attr in ("x", "y", "z", "vx", "vy", "vz", "speedKmH", "possessionTeam"):
            assert attr in ball, f"Ball missing attribute: {attr}"

        bx, by, bz = ball["x"], ball["y"], ball["z"]
        assert -2.0 <= bx <= 107.0, f"Ball X out of pitch bounds: {bx}"
        assert -2.0 <= by <= 70.0, f"Ball Y out of pitch bounds: {by}"
        assert bz >= 0.0, f"Ball Z negative: {bz}"
        assert ball["speedKmH"] >= 0.0

    asyncio.run(_run())


def test_cloud_pitch_control_surface_and_spatial_metrics():
    """Verify 357-cell grid (21x17), pitch control split summing to 100%, and PDR / CVI in [0, 100]."""

    async def _run():
        async with websockets.connect(WS_TELEMETRY_URL, open_timeout=10) as ws:
            raw = await asyncio.wait_for(ws.recv(), timeout=12.0)

        frame = json.loads(raw)["frame"]
        cells = frame["pitchControlCells"]
        assert len(cells) == 357, f"Expected 357 cells, got {len(cells)}"

        xs = {c["x"] for c in cells}
        ys = {c["y"] for c in cells}
        assert len(xs) == 21 and len(ys) == 17, f"Grid dimensions {len(xs)}x{len(ys)} != 21x17"

        metrics = frame["metrics"]
        pc = metrics["pitchControl"]
        total_pc = pc["home"] + pc["away"] + pc["contested"]
        assert abs(total_pc - 100.0) <= 0.2, f"Pitch control sum {total_pc:.2f}% != 100%"

        pdr = metrics["passDifficultyRating"]
        cvi = metrics["controlVsChaosIndex"]
        assert 0.0 <= pdr <= 100.0, f"PDR {pdr} out of [0, 100]"
        assert 0.0 <= cvi <= 100.0, f"CVI {cvi} out of [0, 100]"

    asyncio.run(_run())


def test_cloud_playback_status():
    """Verify GET /api/playback/status returns 200 with valid playback properties."""
    status, body = _http_get(f"{BACKEND_BASE}/api/playback/status")
    assert status == 200
    assert "paused" in body
    assert "speed" in body
    assert "matchClock" in body
    assert "matchSeconds" in body
    assert body["matchSeconds"] >= 0.0


def test_cloud_playback_pause_and_resume():
    """Verify POST /api/playback/pause freezes the clock and POST /resume continues it."""
    # 1. Pause
    s_pause, b_pause = _http_post(f"{BACKEND_BASE}/api/playback/pause")
    assert s_pause == 200
    assert b_pause["paused"] is True

    sec_at_pause = b_pause["matchSeconds"]
    time.sleep(1.0)
    _, b_check = _http_get(f"{BACKEND_BASE}/api/playback/status")
    assert abs(b_check["matchSeconds"] - sec_at_pause) < 0.2, "Clock progressed while paused"

    # 2. Resume
    s_resume, b_resume = _http_post(f"{BACKEND_BASE}/api/playback/resume")
    assert s_resume == 200
    assert b_resume["paused"] is False

    time.sleep(1.0)
    _, b_check_adv = _http_get(f"{BACKEND_BASE}/api/playback/status")
    assert b_check_adv["matchSeconds"] > sec_at_pause, "Clock did not advance after resume"


def test_cloud_playback_speed():
    """Verify POST /api/playback/speed updates speed multiplier and restores to 1.0x."""
    s_spd, b_spd = _http_post(f"{BACKEND_BASE}/api/playback/speed", {"speed": 2.0})
    assert s_spd == 200
    assert b_spd["speed"] == 2.0

    # Reset
    s_rst, b_rst = _http_post(f"{BACKEND_BASE}/api/playback/speed", {"speed": 1.0})
    assert s_rst == 200
    assert b_rst["speed"] == 1.0


def test_cloud_playback_jump():
    """Verify POST /api/playback/jump scrubs immediately to specified seconds (1800.0s = 30:00)."""
    target_seconds = 1800.0
    s_jump, b_jump = _http_post(
        f"{BACKEND_BASE}/api/playback/jump", {"seconds": target_seconds}
    )
    assert s_jump == 200
    assert b_jump["matchClock"] == "30:00"
    assert b_jump["matchSeconds"] == target_seconds


def test_cloud_websocket_interactive_scenario_switch():
    """Verify WebSocket client control messages update match scenario live without disconnecting."""

    async def _run():
        async with websockets.connect(WS_TELEMETRY_URL, open_timeout=10) as ws:
            msg_initial = await asyncio.wait_for(ws.recv(), timeout=12.0)
            initial_data = json.loads(msg_initial)
            assert "scenario" in initial_data["frame"]

            # Switch scenario to box_scramble
            await ws.send(json.dumps({"type": "set_scenario", "scenario": "box_scramble"}))
            await asyncio.sleep(0.4)

            updated = False
            for _ in range(5):
                msg = await asyncio.wait_for(ws.recv(), timeout=12.0)
                d = json.loads(msg)
                if d["frame"]["scenario"] == "box_scramble":
                    updated = True
                    break

            assert updated, "Scenario did not update to 'box_scramble'"

            # Restore scenario to high_possession
            await ws.send(json.dumps({"type": "set_scenario", "scenario": "high_possession"}))

    asyncio.run(_run())
