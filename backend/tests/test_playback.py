"""Tests for simulation playback control, timeline scrubbing, and expanded MCP tools."""

from __future__ import annotations

import time

import pytest
from app.api.websocket import _handle_client_message
from app.config import Settings
from app.main import create_app
from app.runtime import MatchRuntime
from app.simulation.engine import MatchEngine
from fastapi.testclient import TestClient


def test_engine_jump_forward(engine: MatchEngine) -> None:
    """Jumping forward advances match seconds and simulates play."""
    assert engine.match_seconds == 0.0
    engine.jump_to_seconds(1200.0)
    assert engine.match_seconds == 1200.0
    frame = engine.build_frame()
    assert frame.matchClock == "20:00"
    assert frame.matchSeconds == 1200.0

    # Verify jump_to backward compatibility alias
    engine.jump_to(1800.0)
    assert engine.match_seconds == 1800.0
    assert engine.build_frame().matchClock == "30:00"


def test_engine_jump_backward(engine: MatchEngine) -> None:
    """Jumping backward rewinds match seconds cleanly."""
    engine.jump_to_seconds(1800.0)
    assert engine.match_seconds == 1800.0
    engine.jump_to_seconds(300.0)
    assert engine.match_seconds == 300.0
    frame = engine.build_frame()
    assert frame.matchClock == "05:00"
    assert frame.matchSeconds == 300.0

    # Rewind to kickoff
    engine.jump_to_seconds(0.0)
    assert engine.match_seconds == 0.0
    assert engine.build_frame().matchClock == "00:00"


def test_engine_jump_clamping(engine: MatchEngine) -> None:
    """Jump target is clamped within pitch-legal match limits."""
    engine.jump_to_seconds(-50.0)
    assert engine.match_seconds == 0.0
    engine.jump_to_seconds(10000.0)
    assert engine.match_seconds == 5400.0


def test_runtime_playback_controls_and_heartbeat() -> None:
    """Verify MatchRuntime playback state transitions, speed clamping, and heartbeat freshness."""
    settings = Settings(foundry_enabled=False, event_hubs_enabled=False, cosmos_enabled=False)
    runtime = MatchRuntime(settings)

    # Initial state
    assert runtime.is_paused is False
    assert runtime.speed == 1.0
    assert runtime.playback_speed == 1.0
    status = runtime.playback_status()
    assert status.paused is False
    assert status.speed == 1.0

    # Pause and resume
    status = runtime.pause()
    assert status.paused is True
    assert runtime.is_paused is True

    status = runtime.resume()
    assert status.paused is False
    assert runtime.is_paused is False

    # Speed adjustments & clamping [0.1, 10.0]
    status = runtime.set_speed(3.5)
    assert status.speed == 3.5
    assert runtime.speed == 3.5

    status = runtime.set_speed(0.01)
    assert status.speed == 0.1
    assert runtime.speed == 0.1

    status = runtime.set_speed(25.0)
    assert status.speed == 10.0
    assert runtime.speed == 10.0

    # Backward compatibility set_playback_speed
    ret_speed = runtime.set_playback_speed(2.0)
    assert ret_speed == 2.0
    assert runtime.playback_speed == 2.0

    # Scrubbing via jump_to_seconds and jump_to alias
    status = runtime.jump_to_seconds(900.0)
    assert status.matchSeconds == 900.0
    assert status.matchClock == "15:00"

    sec = runtime.jump_to(1500.0)
    assert sec == 1500.0
    assert runtime.engine.match_seconds == 1500.0

    # Verify worker thread heartbeat freshness when paused
    try:
        runtime.start()
        assert runtime._ready.wait(timeout=10.0)
        assert runtime.ready is True
        assert runtime.heartbeat_fresh is True

        # Pause and verify heartbeat remains fresh
        runtime.pause()
        assert runtime.is_paused is True
        time.sleep(0.3)
        assert runtime.heartbeat_fresh is True
        assert runtime.ready is True
        assert runtime.simulation_alive is True
        assert runtime._worker_error is None
    finally:
        runtime.stop()


def test_playback_rest_endpoints() -> None:
    """Verify REST endpoints for playback status, pause, resume, speed, and jump."""
    app = create_app()
    with TestClient(app) as client:
        # Initial status
        res = client.get("/api/playback/status")
        assert res.status_code == 200
        data = res.json()
        assert "paused" in data
        assert "speed" in data
        assert "matchClock" in data
        assert "matchSeconds" in data

        # Pause
        res = client.post("/api/playback/pause")
        assert res.status_code == 200
        assert res.json()["paused"] is True

        # Resume
        res = client.post("/api/playback/resume")
        assert res.status_code == 200
        assert res.json()["paused"] is False

        # Speed
        res = client.post("/api/playback/speed", json={"speed": 2.5})
        assert res.status_code == 200
        assert res.json()["speed"] == 2.5

        # Speed clamping over REST
        res = client.post("/api/playback/speed", json={"speed": 50.0})
        assert res.status_code == 200
        assert res.json()["speed"] == 10.0

        res = client.post("/api/playback/speed", json={"speed": 0.02})
        assert res.status_code == 200
        assert res.json()["speed"] == 0.1

        # Pause before jumping to test exact frozen clock jump
        res = client.post("/api/playback/pause")
        assert res.status_code == 200
        assert res.json()["paused"] is True

        # Jump forward
        res = client.post("/api/playback/jump", json={"seconds": 2535.0})
        assert res.status_code == 200
        assert res.json()["matchSeconds"] == 2535.0
        assert res.json()["matchClock"] == "42:15"

        # Jump backward
        res = client.post("/api/playback/jump", json={"seconds": 300.0})
        assert res.status_code == 200
        assert res.json()["matchSeconds"] == 300.0
        assert res.json()["matchClock"] == "05:00"

        # Jump clamping
        res = client.post("/api/playback/jump", json={"seconds": -100.0})
        assert res.status_code == 200
        assert res.json()["matchSeconds"] == 0.0
        assert res.json()["matchClock"] == "00:00"

        res = client.post("/api/playback/jump", json={"seconds": 9999.0})
        assert res.status_code == 200
        assert res.json()["matchSeconds"] == 5400.0
        assert res.json()["matchClock"] == "90:00"

        # Resume after jump
        res = client.post("/api/playback/resume")
        assert res.status_code == 200
        assert res.json()["paused"] is False


@pytest.mark.anyio
async def test_websocket_client_message_handler() -> None:
    """Verify _handle_client_message processes jump_time, pause, resume, and set_speed."""
    settings = Settings(foundry_enabled=False, event_hubs_enabled=False, cosmos_enabled=False)
    runtime = MatchRuntime(settings)

    await _handle_client_message(runtime, {"type": "pause"})
    assert runtime.is_paused is True

    await _handle_client_message(runtime, {"type": "resume"})
    assert runtime.is_paused is False

    await _handle_client_message(runtime, {"type": "set_speed", "speed": 4.5})
    assert runtime.speed == 4.5

    await _handle_client_message(runtime, {"type": "jump_time", "seconds": 1800.0})
    assert runtime.engine.match_seconds == 1800.0


def test_websocket_playback_controls_live() -> None:
    """Verify WebSocket client messages over live connection."""
    app = create_app()
    with TestClient(app) as client, client.websocket_connect("/ws/telemetry") as socket:
        # Drain initial envelope
        envelope = socket.receive_json()
        assert "frame" in envelope

        # Send pause over socket
        socket.send_json({"type": "pause"})
        time.sleep(0.1)
        assert app.state.runtime.is_paused is True

        # Send jump_time over socket while paused
        socket.send_json({"type": "jump_time", "seconds": 1200.0})
        jumped_env = socket.receive_json()
        assert jumped_env["frame"]["matchSeconds"] == 1200.0
        assert abs(app.state.runtime.engine.match_seconds - 1200.0) <= 0.5

        # Send set_speed over socket
        socket.send_json({"type": "set_speed", "speed": 3.0})
        time.sleep(0.1)
        assert app.state.runtime.speed == 3.0

        # Send resume over socket
        socket.send_json({"type": "resume"})
        time.sleep(0.1)
        resumed_env = socket.receive_json()
        assert resumed_env["frame"] is not None
        assert app.state.runtime.is_paused is False


def test_mcp_player_spotlight_and_jump() -> None:
    """Verify new MCP tools for player spotlight and timeline jumping."""
    app = create_app()
    with TestClient(app) as client:
        # Check tool surface includes jump_match_time
        tools_res = client.get("/api/mcp/tools")
        assert tools_res.status_code == 200
        tool_names = {t["name"] for t in tools_res.json()}
        assert "jump_match_time" in tool_names
        assert "get_player_spotlight" in tool_names

        # Jump match time tool
        jump_res = client.post(
            "/api/mcp/invoke",
            json={"tool": "jump_match_time", "arguments": {"seconds": 600.0}},
        )
        assert jump_res.status_code == 200
        assert jump_res.json()["result"]["matchSeconds"] == 600.0

        # Player spotlight tool for Haaland (h11)
        spot_res = client.post(
            "/api/mcp/invoke",
            json={"tool": "get_player_spotlight", "arguments": {"playerId": "h11"}},
        )
        assert spot_res.status_code == 200
        spot_data = spot_res.json()["result"]
        assert spot_data["player"]["id"] == "h11"
        assert "Haaland" in spot_data["player"]["name"]
        assert spot_data["stats"] is not None
        assert "rating" in spot_data["stats"]
