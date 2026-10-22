"""Tests of the published surface: the Broadcast Overlay, the REST API, the MCP
tool surface and the parity between the TypeScript contract and the Pydantic
models (ADR 0005).
"""

from __future__ import annotations

import re
from typing import Any

import pytest
from app.agents.swarm import AgentSwarm
from app.main import create_app
from app.models import (
    AgentTrace,
    BallTelemetry,
    BroadcastLanguage,
    BroadcastOverlayPayload,
    ClubCentricContext,
    ExperiencePersona,
    LowerThird,
    MatchEvent,
    MatchMetrics,
    NarrativeEvent,
    OverlayMetrics,
    PassingLane,
    PitchControlCell,
    PitchPosition,
    PlayerMatchStats,
    PlayerTelemetry,
    ScoreBug,
    ShotRecord,
    SyntheticScenarioType,
    TelemetryFrame,
)
from app.services.overlay import SCHEMA_VERSION, build_overlay
from app.simulation.engine import MatchEngine
from fastapi.testclient import TestClient

from conftest import CONTRACT_PATH

#: The Pydantic counterpart of every interface of the TypeScript contract.
MODELS: dict[str, type] = {
    "AgentTrace": AgentTrace,
    "BallTelemetry": BallTelemetry,
    "BroadcastOverlayPayload": BroadcastOverlayPayload,
    "ClubCentricContext": ClubCentricContext,
    "LowerThird": LowerThird,
    "MatchEvent": MatchEvent,
    "MatchMetrics": MatchMetrics,
    "NarrativeEvent": NarrativeEvent,
    "OverlayMetrics": OverlayMetrics,
    "PassingLane": PassingLane,
    "PitchControlCell": PitchControlCell,
    "PitchPosition": PitchPosition,
    "PlayerMatchStats": PlayerMatchStats,
    "PlayerTelemetry": PlayerTelemetry,
    "ScoreBug": ScoreBug,
    "ShotRecord": ShotRecord,
    "TelemetryFrame": TelemetryFrame,
}


@pytest.fixture(scope="module")
def frame() -> TelemetryFrame:
    """A real telemetry frame with a real narrative on it."""
    engine = MatchEngine(seed=20260922)
    engine.reset(SyntheticScenarioType.HIGH_POSSESSION, start_seconds=0.0, warmup_seconds=0.0)
    engine.fast_forward(20 * 60, dt=0.2)
    telemetry = engine.build_frame()
    swarm = AgentSwarm()
    try:
        result = swarm.run(telemetry, ExperiencePersona.ANALYST)
    finally:
        swarm.shutdown()
    telemetry.latestNarrative = result.narrative
    telemetry.agentTrace = list(result.traces)
    return telemetry


# --- The Broadcast Overlay ----------------------------------------------------


def test_the_overlay_payload_is_valid(frame):
    overlay = build_overlay(frame, ExperiencePersona.ANALYST)
    assert isinstance(overlay, BroadcastOverlayPayload)
    assert overlay.schemaVersion == SCHEMA_VERSION
    assert overlay.matchClock == frame.matchClock
    assert overlay.syncTimestampMs == int(frame.matchSeconds * 1000)
    assert overlay.lowerThird.headline
    assert overlay.lowerThird.subline
    assert overlay.lowerThird.speaker
    assert overlay.scoreBug.homeScore == frame.score.home
    assert overlay.scoreBug.awayScore == frame.score.away
    assert overlay.metrics.controlVsChaosIndex == frame.metrics.controlVsChaosIndex
    assert overlay.metrics.passDifficultyRating == frame.metrics.passDifficultyRating
    assert overlay.commentatorCue


def test_the_overlay_carries_all_five_languages(frame):
    """The Multilingual Broadcast Stream is published in five languages."""
    overlay = build_overlay(frame, ExperiencePersona.ANALYST)
    assert set(overlay.languages) == {language.value for language in BroadcastLanguage}
    for language in BroadcastLanguage:
        assert overlay.languages[language.value].strip()


def test_the_overlay_is_persona_sensitive(frame):
    """The Broadcast Overlay speaks to the active Experience Persona."""
    analyst = build_overlay(frame, ExperiencePersona.ANALYST)
    casual = build_overlay(frame, ExperiencePersona.CASUAL)
    player_cam = build_overlay(frame, ExperiencePersona.PLAYER_CAM)
    club = build_overlay(frame, ExperiencePersona.CLUB_CENTRIC)

    assert analyst.lowerThird.speaker != casual.lowerThird.speaker
    assert casual.lowerThird.subline != analyst.lowerThird.subline
    assert player_cam.lowerThird.speaker != analyst.lowerThird.speaker
    assert club.lowerThird.speaker != analyst.lowerThird.speaker
    for overlay in (analyst, casual, player_cam, club):
        assert overlay.lowerThird.subline


# --- The TypeScript contract -------------------------------------------------


def _parse_interfaces(source: str) -> dict[str, dict[str, bool]]:
    """The field names of every exported interface of the TypeScript contract.

    The value maps a field name to whether the contract declares it optional
    (``field?:``).
    """
    interfaces: dict[str, dict[str, bool]] = {}
    pattern = re.compile(r"export interface (\w+)[^{]*\{")
    for match in pattern.finditer(source):
        name = match.group(1)
        start = match.end()
        depth = 1
        index = start
        while index < len(source) and depth > 0:
            char = source[index]
            if char == "{":
                depth += 1
            elif char == "}":
                depth -= 1
            index += 1
        body = source[start : index - 1]

        fields: dict[str, bool] = {}
        depth = 0
        for raw_line in body.splitlines():
            line = raw_line.strip()
            if depth == 0:
                stripped = re.sub(r"/\*.*?\*/", "", line)
                stripped = re.sub(r"//.*$", "", stripped).strip()
                if stripped:
                    field = re.match(r"(\w+)(\?)?\s*:", stripped)
                    if field:
                        fields[field.group(1)] = field.group(2) == "?"
            depth += line.count("{") - line.count("}")
        interfaces[name] = fields
    return interfaces


@pytest.fixture(scope="module")
def contract_interfaces() -> dict[str, dict[str, bool]]:
    if not CONTRACT_PATH.exists():
        pytest.skip(f"The TypeScript contract is not available at {CONTRACT_PATH}.")
    return _parse_interfaces(CONTRACT_PATH.read_text(encoding="utf-8"))


def test_the_contract_declares_the_expected_interfaces(contract_interfaces):
    for name in (
        "TelemetryFrame",
        "PlayerTelemetry",
        "BallTelemetry",
        "PassingLane",
        "PitchControlCell",
        "MatchEvent",
        "ShotRecord",
        "PlayerMatchStats",
        "MatchMetrics",
        "NarrativeEvent",
        "BroadcastOverlayPayload",
        "AgentTrace",
    ):
        assert name in contract_interfaces, name
        assert contract_interfaces[name], name


def test_every_contract_key_survives_a_pydantic_round_trip(frame, contract_interfaces):
    """Every key of the TypeScript contract is present in the published payload.

    This is the ADR 0005 contract test: the frontend and the backend share
    one shape, and the backend must not quietly drop a field the studio
    renders.
    """
    payload = frame.to_wire()

    def check(model_name: str, instance: dict[str, Any]) -> None:
        fields = contract_interfaces.get(model_name)
        assert fields is not None, f"{model_name} is not part of the TypeScript contract."
        model = MODELS.get(model_name)
        assert model is not None, f"{model_name} has no Pydantic counterpart."
        for field, optional in fields.items():
            if optional:
                # An optional key of the contract has to exist on the model,
                # but it only appears in the payload when it carries a value.
                assert field in model.model_fields, f"{model_name}.{field} is not modelled."
                continue
            assert field in instance, f"{model_name}.{field} is missing from the published payload"

    check("TelemetryFrame", payload)
    check("PlayerTelemetry", payload["players"][0])
    check("BallTelemetry", payload["ball"])
    check("PassingLane", payload["passingLanes"][0])
    check("PitchControlCell", payload["pitchControlCells"][0])
    check("MatchEvent", payload["events"][0])
    check("ShotRecord", payload["shots"][0])
    check("PlayerMatchStats", payload["playerStats"][0])
    check("MatchMetrics", payload["metrics"])
    check("NarrativeEvent", payload["latestNarrative"])
    check("AgentTrace", payload["agentTrace"][0])

    overlay = build_overlay(frame, ExperiencePersona.ANALYST)
    overlay_payload = overlay.model_dump(mode="json")
    check("BroadcastOverlayPayload", overlay_payload)

    # The contract declares these three inline, inside the overlay payload.
    for field in ("headline", "subline", "speaker"):
        assert field in overlay_payload["lowerThird"]
    for field in ("home", "away", "homeScore", "awayScore"):
        assert field in overlay_payload["scoreBug"]
    for field in ("controlVsChaosIndex", "passDifficultyRating", "pitchControl"):
        assert field in overlay_payload["metrics"]
    for field in ("homeFrame", "awayFrame"):
        assert field in payload["latestNarrative"]["clubCentricContext"]


def test_the_published_payload_round_trips(frame):
    """The published payload validates back into the contract models."""
    payload = frame.to_wire()
    assert TelemetryFrame.model_validate(payload) == frame
    assert TelemetryFrame.model_validate_json(frame.model_dump_json()) == frame


def test_the_frame_publishes_exactly_the_contract_keys(frame, contract_interfaces):
    """The published frame has the keys the contract declares - no more, no less."""
    expected = set(contract_interfaces["TelemetryFrame"])
    assert set(frame.to_wire()) == expected


# --- The REST surface ---------------------------------------------------------


@pytest.fixture(scope="module")
def client():
    """A live client: the service is started and the simulation is waited for."""
    import time

    with TestClient(create_app()) as test_client:
        deadline = time.time() + 90.0
        while time.time() < deadline:
            response = test_client.get("/health")
            if response.status_code == 200 and response.json().get("frameId", 0) > 0:
                break
            time.sleep(0.25)
        yield test_client


def test_health_is_200_and_reports_the_azure_capabilities(client):
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] in {"ok", "degraded", "starting"}
    assert body["service"]
    assert set(body["azure"]) == {"foundry", "eventHubs", "cosmos", "mcp"}
    assert body["ready"] is True
    assert body["simulationAlive"] is True


def test_the_scenarios_are_published(client):
    response = client.get("/api/scenarios")
    assert response.status_code == 200
    body = response.json()
    assert {item["id"] for item in body} == {scenario.value for scenario in SyntheticScenarioType}
    for item in body:
        assert item["label"]
        assert item["anchorClock"]


def test_the_frame_is_published(client):
    response = client.get("/api/frame")
    assert response.status_code == 200
    body = response.json()
    assert "frameId" in body
    assert len(body["pitchControlCells"]) == 357
    assert len(body["players"]) == 22


def test_the_overlay_is_published(client):
    response = client.get("/api/overlay", params={"persona": "analyst"})
    assert response.status_code == 200
    body = response.json()
    assert body["schemaVersion"] == SCHEMA_VERSION
    assert len(body["languages"]) == 5


def test_the_narrative_is_published(client):
    response = client.get("/api/narrative")
    assert response.status_code == 200
    body = response.json()
    assert set(body["headline"]) == {language.value for language in BroadcastLanguage}


def test_the_agent_trace_is_published(client):
    response = client.get("/api/agents")
    assert response.status_code == 200
    body = response.json()
    assert body
    assert {trace["role"] for trace in body} >= {"telemetry_ingestion", "tactical_reasoning"}


def test_the_events_are_published(client):
    response = client.get("/api/events", params={"limit": 10})
    assert response.status_code == 200
    body = response.json()
    assert len(body) <= 10
    for event in body:
        assert event["matchClock"]
        assert event["type"]


def test_the_mcp_tool_surface_is_published(client):
    response = client.get("/api/mcp/tools")
    assert response.status_code == 200
    body = response.json()
    names = {tool["name"] for tool in body}
    assert {
        "get_pitch_control_surface",
        "evaluate_passing_lane",
        "get_control_vs_chaos_index",
        "emit_broadcast_overlay",
        "get_match_events",
    } <= names
    for tool in body:
        assert tool["description"]
        assert tool["input_schema"]


def test_the_mcp_tools_are_actually_callable(client):
    """The MCP tools are real: they return the state of the live simulation."""
    surface = client.post("/api/mcp/invoke", json={"tool": "get_pitch_control_surface", "arguments": {}})
    assert surface.status_code == 200
    assert surface.json()["result"]["cellCount"] == 357

    chaos = client.post("/api/mcp/invoke", json={"tool": "get_control_vs_chaos_index", "arguments": {}})
    assert chaos.status_code == 200
    assert 0.0 <= chaos.json()["result"]["controlVsChaosIndex"] <= 100.0

    overlay = client.post(
        "/api/mcp/invoke",
        json={"tool": "emit_broadcast_overlay", "arguments": {"persona": "analyst"}},
    )
    assert overlay.status_code == 200
    assert overlay.json()["result"]["schemaVersion"] == SCHEMA_VERSION

    events = client.post("/api/mcp/invoke", json={"tool": "get_match_events", "arguments": {"limit": 5}})
    assert events.status_code == 200
    assert len(events.json()["result"]) <= 5

    players = client.get("/api/frame").json()["players"]
    passer, receiver = players[1], players[2]
    lane = client.post(
        "/api/mcp/invoke",
        json={
            "tool": "evaluate_passing_lane",
            "arguments": {"passerId": passer["id"], "receiverId": receiver["id"]},
        },
    )
    assert lane.status_code == 200
    assert 0.0 <= lane.json()["result"]["passDifficultyRating"] <= 100.0


def test_an_unknown_mcp_tool_is_a_404(client):
    response = client.post("/api/mcp/invoke", json={"tool": "not_a_tool", "arguments": {}})
    assert response.status_code == 404


# --- The WebSocket stream -----------------------------------------------------


def test_the_websocket_publishes_the_envelope(client):
    """The stream publishes {frame, blackboard, sentAtMs} at 5 Hz."""
    with client.websocket_connect("/ws/telemetry") as socket:
        envelope = socket.receive_json()
        assert set(envelope) == {"frame", "blackboard", "sentAtMs"}
        assert isinstance(envelope["sentAtMs"], int)
        assert envelope["sentAtMs"] > 0
        frame = envelope["frame"]
        assert frame["frameId"] > 0
        assert frame["matchClock"]
        assert len(frame["pitchControlCells"]) == 357


def test_the_websocket_accepts_the_control_messages(client):
    """The client can switch the scenario and the persona over the socket."""
    with client.websocket_connect("/ws/telemetry") as socket:
        socket.receive_json()
        socket.send_json({"type": "set_persona", "persona": "casual"})
        socket.send_json({"type": "set_scenario", "scenario": "box_scramble"})

        scenario = None
        for _ in range(40):
            envelope = socket.receive_json()
            scenario = envelope["frame"]["scenario"]
            if scenario == "box_scramble":
                break
        assert scenario == "box_scramble"
