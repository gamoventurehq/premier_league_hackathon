"""REST endpoints of the Premier League Studio service."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

from ..models import (
    ExperiencePersona,
    HealthResponse,
    InvokeRequest,
    InvokeResponse,
    NarrativeEvent,
    ScenarioSummary,
    SyntheticScenarioType,
    ToolDescriptor,
)
from ..simulation.engine import SCENARIO_ORDER, SCENARIOS
from ..simulation.metrics import format_match_clock

logger = logging.getLogger(__name__)

router = APIRouter()


def _runtime(request: Request):
    runtime = getattr(request.app.state, "runtime", None)
    if runtime is None:
        raise HTTPException(status_code=503, detail="The simulation runtime is not available yet.")
    return runtime


@router.get("/health", response_model=HealthResponse, tags=["service"])
async def health(request: Request) -> HealthResponse:
    """Service status, the enabled Azure capabilities and the active scenario."""
    runtime = _runtime(request)
    frame = runtime.latest_frame()
    alive = runtime.simulation_alive
    return HealthResponse(
        status="ok" if runtime.ready else ("degraded" if alive else "starting"),
        service=runtime.settings.app_name,
        version=runtime.settings.service_version,
        azure=runtime.settings.azure_capabilities(),
        scenario=runtime.scenario,
        matchClock=frame.matchClock if frame else format_match_clock(0),
        matchSeconds=frame.matchSeconds if frame else 0.0,
        frameId=frame.frameId if frame else 0,
        ready=runtime.ready,
        uptimeSeconds=runtime.uptime_seconds,
        simulationAlive=alive,
        workerError=runtime.worker_error,
    )


@router.get("/api/scenarios", response_model=list[ScenarioSummary], tags=["synthetic match scenario"])
async def scenarios() -> list[ScenarioSummary]:
    """The available Synthetic Match Scenarios."""
    return [
        ScenarioSummary(
            id=scenario_id,
            label=profile.label,
            description=profile.description,
            anchorSeconds=profile.anchor_seconds,
            anchorClock=format_match_clock(profile.anchor_seconds),
        )
        for scenario_id in SCENARIO_ORDER
        for profile in [SCENARIOS[scenario_id]]
    ]


@router.get("/api/frame", tags=["telemetry"])
async def frame(request: Request) -> JSONResponse:
    """A single TelemetryFrame - the same payload the WebSocket publishes."""
    runtime = _runtime(request)
    payload = runtime.latest_wire()
    if payload is None:
        raise HTTPException(status_code=503, detail="The simulation is still warming up.")
    return JSONResponse(payload)


@router.get("/api/overlay", tags=["broadcast overlay"])
async def overlay(request: Request, persona: str | None = None) -> JSONResponse:
    """The Stage 4 Broadcast Overlay payload."""
    runtime = _runtime(request)
    payload = runtime.overlay(persona)
    if payload is None:
        raise HTTPException(status_code=503, detail="The simulation is still warming up.")
    return JSONResponse(payload.model_dump(mode="json"))


@router.get("/api/narrative", response_model=NarrativeEvent, tags=["narrative"])
async def narrative(request: Request) -> NarrativeEvent:
    """The latest Narrative Event, including the Multilingual Broadcast Stream."""
    runtime = _runtime(request)
    value = runtime.latest_narrative()
    if value is None:
        raise HTTPException(status_code=503, detail="The agent swarm has not produced a narrative yet.")
    return value


@router.get("/api/agents", tags=["agents"])
async def agents(request: Request) -> list[dict[str, Any]]:
    """The latest trace of the four-agent swarm."""
    runtime = _runtime(request)
    return [trace.model_dump() for trace in runtime.latest_traces()]


@router.get("/api/events", tags=["telemetry"])
async def events(request: Request, limit: int = 25, type: str | None = None) -> list[dict[str, Any]]:
    """The most recent discrete match events."""
    runtime = _runtime(request)
    return [event.model_dump() for event in runtime.events(limit=limit, event_type=type)]


@router.get("/api/mcp/tools", response_model=list[ToolDescriptor], tags=["mcp"])
async def mcp_tools(request: Request) -> list[ToolDescriptor]:
    """The Azure MCP tool surface exposed by this service."""
    runtime = _runtime(request)
    return runtime.tools.descriptors()


@router.post("/api/mcp/invoke", response_model=InvokeResponse, tags=["mcp"])
async def mcp_invoke(request: Request, payload: InvokeRequest) -> InvokeResponse:
    """Invoke one of the MCP tools."""
    runtime = _runtime(request)
    try:
        result = runtime.tools.invoke(payload.tool, payload.arguments)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001 - surface the failure to the caller
        logger.warning("MCP tool %s failed: %s", payload.tool, exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return InvokeResponse(result=result)


@router.post("/api/scenario", tags=["synthetic match scenario"])
async def set_scenario(request: Request, scenario: str) -> dict[str, Any]:
    """Switch the live simulation to another Synthetic Match Scenario."""
    runtime = _runtime(request)
    try:
        value = runtime.set_scenario(SyntheticScenarioType(scenario))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Unknown Synthetic Match Scenario: {scenario}") from exc
    return {"scenario": value.value, "label": SCENARIOS[value].label}


@router.post("/api/persona", tags=["personalization"])
async def set_persona(request: Request, persona: str) -> dict[str, Any]:
    """Switch the active viewing persona."""
    runtime = _runtime(request)
    try:
        value = runtime.set_persona(ExperiencePersona(persona))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Unknown experience persona: {persona}") from exc
    return {"persona": value.value}


__all__ = ["router"]
