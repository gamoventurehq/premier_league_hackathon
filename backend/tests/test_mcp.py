"""Unit and integration tests for Azure MCP tools: get_pitch_control, get_tactical_state, and get_inflection_points.

Covers:
- MCP tool registration and JSON Schema inspection via GET /api/mcp/tools.
- Schema validation, argument boundary checks, and rejection of unexpected properties.
- Successful tool invocation via POST /api/mcp/invoke and validation of return shapes.
- Direct runtime method validation (get_pitch_control, get_tactical_state, get_inflection_points).
- Runtime narrative worker loop defensive guarding.
"""

from __future__ import annotations

import pytest
from app.main import create_app
from app.models import MatchEventType
from app.runtime import MatchRuntime
from app.simulation.events import make_event
from fastapi.testclient import TestClient


@pytest.fixture
def app_client():
    app = create_app()
    with TestClient(app) as client:
        runtime: MatchRuntime = app.state.runtime
        assert runtime._ready.wait(timeout=10.0)
        yield client, runtime


# ==============================================================================
# SECTION 1: MCP Tool Registry & Schema Discovery
# ==============================================================================


def test_mcp_tools_list_includes_new_tools(app_client) -> None:
    """GET /api/mcp/tools returns descriptors including all 3 new MCP tools."""
    client, _ = app_client
    res = client.get("/api/mcp/tools")
    assert res.status_code == 200
    tools = res.json()
    assert isinstance(tools, list)
    assert len(tools) >= 11  # 8 canonical + 3 newly registered

    by_name = {t["name"]: t for t in tools}
    assert "get_pitch_control" in by_name
    assert "get_tactical_state" in by_name
    assert "get_inflection_points" in by_name

    # Check get_pitch_control schema
    pc_schema = by_name["get_pitch_control"]["input_schema"]
    assert pc_schema["type"] == "object"
    assert "includeCells" in pc_schema["properties"]
    assert pc_schema["properties"]["includeCells"]["type"] == "boolean"
    assert pc_schema["additionalProperties"] is False

    # Check get_tactical_state schema
    ts_schema = by_name["get_tactical_state"]["input_schema"]
    assert ts_schema["type"] == "object"
    assert ts_schema["additionalProperties"] is False

    # Check get_inflection_points schema
    ip_schema = by_name["get_inflection_points"]["input_schema"]
    assert ip_schema["type"] == "object"
    assert "limit" in ip_schema["properties"]
    assert ip_schema["properties"]["limit"]["type"] == "integer"
    assert ip_schema["properties"]["limit"]["minimum"] == 1
    assert ip_schema["properties"]["limit"]["maximum"] == 50
    assert ip_schema["additionalProperties"] is False


# ==============================================================================
# SECTION 2: get_pitch_control Tool & Runtime Tests
# ==============================================================================


def test_mcp_get_pitch_control_default(app_client) -> None:
    """POST /api/mcp/invoke get_pitch_control returns dominance split and 357 cells by default."""
    client, _ = app_client
    res = client.post(
        "/api/mcp/invoke",
        json={"tool": "get_pitch_control", "arguments": {}},
    )
    assert res.status_code == 200
    data = res.json()["result"]

    assert "scenario" in data
    assert "matchClock" in data
    assert "split" in data
    assert "home" in data["split"]
    assert "away" in data["split"]
    assert "contested" in data["split"]
    assert data["cellCount"] == 357
    assert "cells" in data
    assert len(data["cells"]) == 357

    # Check cell structure
    cell0 = data["cells"][0]
    assert "x" in cell0
    assert "y" in cell0
    assert "controlScore" in cell0
    assert "homeWeight" in cell0
    assert "awayWeight" in cell0


def test_mcp_get_pitch_control_exclude_cells(app_client) -> None:
    """POST /api/mcp/invoke get_pitch_control with includeCells=False omits the cell array."""
    client, _ = app_client
    res = client.post(
        "/api/mcp/invoke",
        json={"tool": "get_pitch_control", "arguments": {"includeCells": False}},
    )
    assert res.status_code == 200
    data = res.json()["result"]

    assert data["cellCount"] == 357
    assert "cells" not in data
    assert "split" in data
    assert 0.0 <= data["split"]["home"] <= 100.0
    assert 0.0 <= data["split"]["away"] <= 100.0


def test_mcp_get_pitch_control_schema_validation(app_client) -> None:
    """Verify strict JSON schema validation for get_pitch_control."""
    client, _ = app_client

    # Invalid type for includeCells
    res_type = client.post(
        "/api/mcp/invoke",
        json={"tool": "get_pitch_control", "arguments": {"includeCells": "yes"}},
    )
    assert res_type.status_code == 400
    assert "must be a boolean" in res_type.json()["detail"]

    # Unexpected extra argument
    res_extra = client.post(
        "/api/mcp/invoke",
        json={"tool": "get_pitch_control", "arguments": {"invalidArg": 123}},
    )
    assert res_extra.status_code == 400
    assert "Unexpected arguments" in res_extra.json()["detail"]


def test_runtime_get_pitch_control_direct(app_client) -> None:
    """Verify direct call to runtime.get_pitch_control delegates cleanly."""
    _, runtime = app_client
    res_with = runtime.get_pitch_control(include_cells=True)
    assert res_with["cellCount"] == 357
    assert len(res_with["cells"]) == 357

    res_without = runtime.get_pitch_control(include_cells=False)
    assert res_without["cellCount"] == 357
    assert "cells" not in res_without


# ==============================================================================
# SECTION 3: get_tactical_state Tool & Runtime Tests
# ==============================================================================


def test_mcp_get_tactical_state_success(app_client) -> None:
    """POST /api/mcp/invoke get_tactical_state returns complete tactical state."""
    client, _ = app_client
    res = client.post(
        "/api/mcp/invoke",
        json={"tool": "get_tactical_state", "arguments": {}},
    )
    assert res.status_code == 200
    data = res.json()["result"]

    # Validate all required fields
    assert "matchClock" in data
    assert "matchSeconds" in data
    assert "scenario" in data
    assert "tacticalPhase" in data
    assert "gameRhythm" in data
    assert "controlVsChaosIndex" in data
    assert "passDifficultyRating" in data
    assert "pitchControl" in data
    assert "score" in data
    assert "keyPlayers" in data

    # Validate value constraints
    assert 0.0 <= data["controlVsChaosIndex"] <= 100.0
    assert 0.0 <= data["passDifficultyRating"] <= 100.0
    assert 0.0 <= data["pitchControl"]["home"] <= 100.0
    assert 0.0 <= data["pitchControl"]["away"] <= 100.0
    assert isinstance(data["score"]["home"], int)
    assert isinstance(data["score"]["away"], int)
    assert isinstance(data["keyPlayers"], list)


def test_mcp_get_tactical_state_schema_validation(app_client) -> None:
    """Verify get_tactical_state rejects unexpected arguments."""
    client, _ = app_client
    res = client.post(
        "/api/mcp/invoke",
        json={"tool": "get_tactical_state", "arguments": {"extraField": True}},
    )
    assert res.status_code == 400
    assert "Unexpected arguments" in res.json()["detail"]


def test_runtime_get_tactical_state_direct(app_client) -> None:
    """Verify direct call to runtime.get_tactical_state returns structured dict."""
    _, runtime = app_client
    state = runtime.get_tactical_state()
    assert isinstance(state, dict)
    assert "tacticalPhase" in state
    assert "controlVsChaosIndex" in state
    assert "keyPlayers" in state
    assert isinstance(state["keyPlayers"], list)


# ==============================================================================
# SECTION 4: get_inflection_points Tool & Runtime Tests
# ==============================================================================


def test_mcp_get_inflection_points_empty_and_populated(app_client) -> None:
    """POST /api/mcp/invoke get_inflection_points returns list of inflection events."""
    client, runtime = app_client

    # Initially or with existing events
    res = client.post(
        "/api/mcp/invoke",
        json={"tool": "get_inflection_points", "arguments": {}},
    )
    assert res.status_code == 200
    data = res.json()["result"]
    assert isinstance(data, list)

    # Inject a known inflection event into the engine
    event = make_event(
        MatchEventType.INFLECTION,
        "12:34",
        754000,
        None,
        None,
        None,
        52.5,
        34.0,
        "Tactical Inflection Point: Sudden counter transition.",
    )
    runtime.engine.events.append(event)

    # Query again
    res2 = client.post(
        "/api/mcp/invoke",
        json={"tool": "get_inflection_points", "arguments": {"limit": 10}},
    )
    assert res2.status_code == 200
    data2 = res2.json()["result"]
    assert isinstance(data2, list)
    assert len(data2) >= 1

    # Verify event attributes
    last_event = data2[-1]
    assert last_event["type"] == "inflection"
    assert "Tactical Inflection Point" in last_event["description"]
    assert last_event["matchClock"] == "12:34"


def test_mcp_get_inflection_points_limit_enforced(app_client) -> None:
    """Verify limit parameter restricts returned inflection events count."""
    client, runtime = app_client

    # Append 5 inflection events
    for i in range(5):
        event = make_event(
            MatchEventType.INFLECTION,
            f"0{i}:00",
            i * 60000,
            None,
            None,
            None,
            50.0,
            30.0,
            f"Inflection test #{i}",
        )
        runtime.engine.events.append(event)

    res = client.post(
        "/api/mcp/invoke",
        json={"tool": "get_inflection_points", "arguments": {"limit": 3}},
    )
    assert res.status_code == 200
    data = res.json()["result"]
    assert len(data) <= 3


def test_mcp_get_inflection_points_schema_validation(app_client) -> None:
    """Verify strict validation for get_inflection_points."""
    client, _ = app_client

    # Non-integer limit
    res_type = client.post(
        "/api/mcp/invoke",
        json={"tool": "get_inflection_points", "arguments": {"limit": "three"}},
    )
    assert res_type.status_code == 400
    assert "must be an integer" in res_type.json()["detail"]

    # Limit below minimum (0)
    res_min = client.post(
        "/api/mcp/invoke",
        json={"tool": "get_inflection_points", "arguments": {"limit": 0}},
    )
    assert res_min.status_code == 400
    assert ">=" in res_min.json()["detail"]

    # Limit above maximum (51)
    res_max = client.post(
        "/api/mcp/invoke",
        json={"tool": "get_inflection_points", "arguments": {"limit": 51}},
    )
    assert res_max.status_code == 400
    assert "<=" in res_max.json()["detail"]

    # Unexpected argument
    res_extra = client.post(
        "/api/mcp/invoke",
        json={"tool": "get_inflection_points", "arguments": {"extra": "bad"}},
    )
    assert res_extra.status_code == 400
    assert "Unexpected arguments" in res_extra.json()["detail"]


# ==============================================================================
# SECTION 5: Runtime Narrative Worker Defensive Guarding
# ==============================================================================


def test_runtime_start_guards_missing_narrative_worker_loop() -> None:
    """Verify MatchRuntime.start() does not raise AttributeError if _narrative_worker_loop is missing."""
    original = getattr(MatchRuntime, "_narrative_worker_loop", None)
    if hasattr(MatchRuntime, "_narrative_worker_loop"):
        delattr(MatchRuntime, "_narrative_worker_loop")

    dummy = MatchRuntime()
    try:
        dummy.start()
        assert dummy._thread is not None
        assert dummy._narrative_worker_thread is None
    finally:
        dummy.stop()
        if original is not None:
            MatchRuntime._narrative_worker_loop = original
