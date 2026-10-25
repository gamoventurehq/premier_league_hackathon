"""Tests for Azure MCP tool surface and JSON schema validation.

Covers Milestone 3 requirements:
- Expose get_player_spotlight and jump_match_time via /api/mcp/tools and /api/mcp/invoke.
- Strict input JSON schema validation (required fields, types, boundaries, additionalProperties).
- Direct MatchRuntime integration and structured domain responses.
"""

from __future__ import annotations

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


def test_mcp_tools_list_exposes_canonical_surface(app_client) -> None:
    """GET /api/mcp/tools returns descriptors including get_player_spotlight and jump_match_time."""
    client, _ = app_client
    res = client.get("/api/mcp/tools")
    assert res.status_code == 200
    tools = res.json()
    assert isinstance(tools, list)
    assert len(tools) >= 8

    by_name = {t["name"]: t for t in tools}
    assert "jump_match_time" in by_name
    assert "get_player_spotlight" in by_name
    assert "get_pitch_control_surface" in by_name
    assert "evaluate_passing_lane" in by_name
    assert "get_control_vs_chaos_index" in by_name
    assert "emit_broadcast_overlay" in by_name
    assert "get_match_events" in by_name
    assert "get_agent_trace" in by_name

    # Validate jump_match_time schema
    jump_schema = by_name["jump_match_time"]["input_schema"]
    assert jump_schema["type"] == "object"
    assert "seconds" in jump_schema["properties"]
    assert jump_schema["properties"]["seconds"]["type"] == "number"
    assert jump_schema["properties"]["seconds"]["minimum"] == 0.0
    assert jump_schema["properties"]["seconds"]["maximum"] == 5400.0
    assert jump_schema["required"] == ["seconds"]
    assert jump_schema["additionalProperties"] is False

    # Validate get_player_spotlight schema
    spot_schema = by_name["get_player_spotlight"]["input_schema"]
    assert spot_schema["type"] == "object"
    assert "playerId" in spot_schema["properties"]
    assert spot_schema["properties"]["playerId"]["type"] == "string"
    assert spot_schema["required"] == ["playerId"]
    assert spot_schema["additionalProperties"] is False


def test_mcp_jump_match_time_success_and_runtime_sync(app_client) -> None:
    """Invoking jump_match_time scrubs match time and returns structured PlaybackStatus."""
    client, runtime = app_client
    target_seconds = 1800.0  # 30:00

    res = client.post(
        "/api/mcp/invoke",
        json={"tool": "jump_match_time", "arguments": {"seconds": target_seconds}},
    )
    assert res.status_code == 200
    data = res.json()["result"]

    assert data["matchSeconds"] == target_seconds
    assert data["matchClock"] == "30:00"
    assert "paused" in data
    assert "speed" in data
    assert data["status"] == "ok"

    # Verify runtime directly synced
    assert abs(runtime.engine.match_seconds - target_seconds) <= 0.5


def test_mcp_jump_match_time_boundary_values(app_client) -> None:
    """Verify jump_match_time succeeds at 0.0 and 5400.0 boundaries."""
    client, _ = app_client

    # 0.0 seconds
    res0 = client.post(
        "/api/mcp/invoke",
        json={"tool": "jump_match_time", "arguments": {"seconds": 0.0}},
    )
    assert res0.status_code == 200
    assert res0.json()["result"]["matchSeconds"] == 0.0

    # 5400.0 seconds (90:00)
    res90 = client.post(
        "/api/mcp/invoke",
        json={"tool": "jump_match_time", "arguments": {"seconds": 5400.0}},
    )
    assert res90.status_code == 200
    assert res90.json()["result"]["matchSeconds"] == 5400.0


def test_mcp_jump_match_time_schema_violations(app_client) -> None:
    """Verify strict JSON schema validation rejection for jump_match_time."""
    client, _ = app_client

    # 1. Missing required field
    res_missing = client.post(
        "/api/mcp/invoke",
        json={"tool": "jump_match_time", "arguments": {}},
    )
    assert res_missing.status_code == 400
    assert "Missing required argument" in res_missing.json()["detail"]

    # 2. Out of bounds negative
    res_neg = client.post(
        "/api/mcp/invoke",
        json={"tool": "jump_match_time", "arguments": {"seconds": -1.0}},
    )
    assert res_neg.status_code == 400
    assert ">=" in res_neg.json()["detail"]

    # 3. Out of bounds high
    res_high = client.post(
        "/api/mcp/invoke",
        json={"tool": "jump_match_time", "arguments": {"seconds": 5400.1}},
    )
    assert res_high.status_code == 400
    assert "<=" in res_high.json()["detail"]

    # 4. Invalid type (string instead of number)
    res_str = client.post(
        "/api/mcp/invoke",
        json={"tool": "jump_match_time", "arguments": {"seconds": "thirty"}},
    )
    assert res_str.status_code == 400
    assert "must be a number" in res_str.json()["detail"]

    # 5. Unexpected extra arguments
    res_extra = client.post(
        "/api/mcp/invoke",
        json={"tool": "jump_match_time", "arguments": {"seconds": 300.0, "extra": "invalid"}},
    )
    assert res_extra.status_code == 400
    assert "Unexpected arguments" in res_extra.json()["detail"]


def test_mcp_get_player_spotlight_success(app_client) -> None:
    """Verify get_player_spotlight returns kinematics, stats, and rating by ID and name."""
    client, _ = app_client

    # Query by player ID (Haaland: h11)
    res_id = client.post(
        "/api/mcp/invoke",
        json={"tool": "get_player_spotlight", "arguments": {"playerId": "h11"}},
    )
    assert res_id.status_code == 200
    data_id = res_id.json()["result"]
    assert data_id["player"]["id"] == "h11"
    assert "Haaland" in data_id["player"]["name"]
    assert "speedKmH" in data_id["player"]
    assert data_id["stats"] is not None
    assert "rating" in data_id["stats"]
    assert "matchClock" in data_id
    assert "matchSeconds" in data_id

    # Query by player name (case-insensitive)
    res_name = client.post(
        "/api/mcp/invoke",
        json={"tool": "get_player_spotlight", "arguments": {"playerId": "haaland"}},
    )
    assert res_name.status_code == 200
    data_name = res_name.json()["result"]
    assert data_name["player"]["id"] == "h11"


def test_mcp_get_player_spotlight_validation_and_errors(app_client) -> None:
    """Verify get_player_spotlight schema validation and not-found behavior."""
    client, _ = app_client

    # 1. Missing playerId
    res_missing = client.post(
        "/api/mcp/invoke",
        json={"tool": "get_player_spotlight", "arguments": {}},
    )
    assert res_missing.status_code == 400
    assert "Missing required argument" in res_missing.json()["detail"]

    # 2. Invalid type (int instead of string)
    res_type = client.post(
        "/api/mcp/invoke",
        json={"tool": "get_player_spotlight", "arguments": {"playerId": 11}},
    )
    assert res_type.status_code == 400
    assert "must be a string" in res_type.json()["detail"]

    # 3. Unknown player ID -> 404
    res_unknown = client.post(
        "/api/mcp/invoke",
        json={"tool": "get_player_spotlight", "arguments": {"playerId": "non_existent_player_xyz"}},
    )
    assert res_unknown.status_code == 404

    # 4. Unexpected extra arguments
    res_extra = client.post(
        "/api/mcp/invoke",
        json={"tool": "get_player_spotlight", "arguments": {"playerId": "h11", "detail": "full"}},
    )
    assert res_extra.status_code == 400
    assert "Unexpected arguments" in res_extra.json()["detail"]


def test_mcp_unknown_tool_returns_404(app_client) -> None:
    """Verify invoking an unregistered tool returns HTTP 404."""
    client, _ = app_client
    res = client.post(
        "/api/mcp/invoke",
        json={"tool": "non_existent_tool", "arguments": {}},
    )
    assert res.status_code == 404
    assert "Unknown tool" in res.json()["detail"]
