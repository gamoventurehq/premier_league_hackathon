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
    PlaybackJumpRequest,
    PlaybackSpeedRequest,
    PlaybackStatus,
    ScenarioSummary,
    SyntheticScenarioType,
    ToolDescriptor,
    CopilotQueryRequest,
    CopilotQueryResponse,
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
    heartbeat_fresh = runtime.heartbeat_fresh
    worker_errors = 1 if runtime.worker_error else 0
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
        alive=alive,
        heartbeat_fresh=heartbeat_fresh,
        workerError=runtime.worker_error,
        worker_errors=worker_errors,
        lastTickAt=runtime.last_tick_at,
    )


@router.get("/api/health", response_model=HealthResponse, tags=["service"])
async def api_health(request: Request) -> HealthResponse:
    """Alias for /health per R2 contract."""
    return await health(request)


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


@router.get("/api/playback/status", response_model=PlaybackStatus, tags=["playback"])
async def get_playback_status(request: Request) -> PlaybackStatus:
    """The current simulation playback state (paused, speed, clock)."""
    runtime = _runtime(request)
    return runtime.playback_status()


@router.post("/api/playback/jump", response_model=PlaybackStatus, tags=["playback"])
async def jump_playback(request: Request, payload: PlaybackJumpRequest) -> PlaybackStatus:
    """Jump the match simulation to the specified seconds."""
    runtime = _runtime(request)
    return runtime.jump_to_seconds(payload.seconds)


@router.post("/api/playback/pause", response_model=PlaybackStatus, tags=["playback"])
async def pause_playback(request: Request) -> PlaybackStatus:
    """Pause the match simulation."""
    runtime = _runtime(request)
    return runtime.pause()


@router.post("/api/playback/resume", response_model=PlaybackStatus, tags=["playback"])
async def resume_playback(request: Request) -> PlaybackStatus:
    """Resume the match simulation."""
    runtime = _runtime(request)
    return runtime.resume()


@router.post("/api/playback/speed", response_model=PlaybackStatus, tags=["playback"])
async def set_playback_speed(request: Request, payload: PlaybackSpeedRequest) -> PlaybackStatus:
    """Set the match simulation playback speed multiplier."""
    runtime = _runtime(request)
    return runtime.set_speed(payload.speed)


__all__ = ["router"]

@router.post("/api/copilot/query", response_model=CopilotQueryResponse, tags=["copilot"])
async def copilot_query(request: Request, payload: CopilotQueryRequest) -> CopilotQueryResponse:
    """Query the Tactical Copilot agent directly with live match telemetry grounding."""
    runtime = _runtime(request)
    frame = runtime.latest_frame() or runtime.engine.build_frame()
    settings = runtime.settings
    match_clock = frame.matchClock
    query = payload.query.strip()
    lower_q = query.lower()

    # 1. Compile real-time tactical facts from the frame
    metrics = frame.metrics
    control = round(metrics.controlVsChaosIndex)
    rhythm = str(metrics.gameRhythm.value if hasattr(metrics.gameRhythm, 'value') else metrics.gameRhythm)
    pdr = round(metrics.passDifficultyRating, 1)
    split = metrics.pitchControl
    home_ctrl = round(split.home, 1)
    away_ctrl = round(split.away, 1)
    contested_ctrl = round(split.contested, 1)

    player_stats = list(frame.playerStats)
    sorted_players = sorted(player_stats, key=lambda s: s.rating)
    best_p = sorted_players[-1] if sorted_players else None
    worst_p = sorted_players[0] if sorted_players else None

    # 2. Check if local LLM is enabled and responsive
    if settings.llm_enabled:
        try:
            import urllib.request, json
            base_url = settings.effective_llm_base_url.rstrip("/")
            url = f"{base_url}/chat/completions"
            model = settings.effective_llm_model

            stats_summary = []
            for p in sorted_players[:3]:
                acc = round((p.passesCompleted / max(1, p.passesAttempted)) * 100)
                stats_summary.append(f"{p.name} ({p.team.value if hasattr(p.team, 'value') else p.team}, {p.position}): Rating {p.rating:.1f}/10, {p.touches} touches, {p.passesCompleted}/{p.passesAttempted} passes ({acc}%)")
            for p in sorted_players[-3:]:
                acc = round((p.passesCompleted / max(1, p.passesAttempted)) * 100)
                stats_summary.append(f"{p.name} ({p.team.value if hasattr(p.team, 'value') else p.team}, {p.position}): Rating {p.rating:.1f}/10, {p.touches} touches, {p.passesCompleted}/{p.passesAttempted} passes ({acc}%), top speed {p.topSpeedKmH:.1f} km/h")

            recent_events = [f"[{e.matchClock}] {e.description}" for e in frame.events[-4:]]

            context_prompt = (
                f"MATCH CONTEXT (Clock: {match_clock}, Scenario: {frame.scenario.value if hasattr(frame.scenario, 'value') else frame.scenario}):\n"
                f"- Tactical Rhythm: {rhythm}, Control vs Chaos Index: {control}/100, Pass Difficulty Rating: {pdr}\n"
                f"- Pitch Control: Manchester City {home_ctrl}% vs Arsenal {away_ctrl}% (Contested: {contested_ctrl}%)\n"
                f"- Player Ratings & Statistics:\n  " + "\n  ".join(stats_summary) + "\n"
                f"- Recent Events:\n  " + "\n  ".join(recent_events) + "\n\n"
                f"User Question: {query}\n\n"
                "Instructions: Answer concisely (2-3 sentences max) with strict tactical grounding in the data provided above. Mention specific player names and statistics."
            )

            req_payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": "You are the Premier League Studio Tactical Copilot AI. Ground all insights strictly in live telemetry."},
                    {"role": "user", "content": context_prompt}
                ],
                "max_tokens": 150,
                "temperature": 0.2
            }

            provider = settings.active_llm_provider
            model = settings.effective_llm_model
            if provider == "azure":
                endpoint = (settings.azure_ai_foundry_endpoint or "").rstrip("/")
                deployment = settings.azure_ai_foundry_deployment or model
                url = f"{endpoint}/openai/deployments/{deployment}/chat/completions?api-version={settings.azure_openai_api_version}"
                headers = {
                    "Content-Type": "application/json",
                    "api-key": settings.azure_openai_api_key or "",
                }
            else:
                base_url = settings.effective_llm_base_url.rstrip("/")
                url = f"{base_url}/chat/completions"
                headers = {"Content-Type": "application/json"}
                if settings.effective_llm_api_key:
                    headers["Authorization"] = f"Bearer {settings.effective_llm_api_key}"

            req = urllib.request.Request(url, data=json.dumps(req_payload).encode(), headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=12.0) as resp:
                data = json.loads(resp.read().decode())
                ans = data["choices"][0]["message"]["content"].strip()
                return CopilotQueryResponse(
                    answer=ans,
                    source=f"azure_ai_foundry ({deployment})" if provider == "azure" else f"local_llm ({provider})",
                    model=model,
                    matchClock=match_clock,
                    toolUsed="llm_tactical_copilot",
                )
        except Exception as exc:
            logger.warning("Local LLM inference failed: %s, falling back to deterministic reasoning", exc)

    # 3. Deterministic Grounded Reasoning Fallback
    if "worst" in lower_q or "poor" in lower_q or "struggling" in lower_q or "bad" in lower_q:
        acc = round((worst_p.passesCompleted / max(1, worst_p.passesAttempted)) * 100) if worst_p else 0
        ans = (
            f"Under-Performer Grounding: {worst_p.name} ({worst_p.team.value.upper() if hasattr(worst_p.team, 'value') else str(worst_p.team).upper()} #{worst_p.number}) "
            f"registers the lowest match rating ({worst_p.rating:.1f}/10) with only {worst_p.touches} touches and {worst_p.passesCompleted}/{worst_p.passesAttempted} passes completed ({acc}% accuracy)."
            if worst_p else "All players performing at baseline."
        )
        tool = "tactical_reasoning:player_ratings"
    elif "best" in lower_q or "top" in lower_q or "mvp" in lower_q:
        acc = round((best_p.passesCompleted / max(1, best_p.passesAttempted)) * 100) if best_p else 0
        ans = (
            f"Top Performer Grounding: {best_p.name} ({best_p.team.value.upper() if hasattr(best_p.team, 'value') else str(best_p.team).upper()} #{best_p.number}) "
            f"leads with a {best_p.rating:.1f}/10 rating, {best_p.touches} touches, {best_p.passesCompleted}/{best_p.passesAttempted} completed passes ({acc}% accuracy), and top speed of {best_p.topSpeedKmH:.1f} km/h."
            if best_p else "All players performing at baseline."
        )
        tool = "tactical_reasoning:player_ratings"
    elif "pitch" in lower_q or "dominance" in lower_q or "space" in lower_q:
        ans = f"Pitch Dominance Grounding: Manchester City hold {home_ctrl}% territorial dominance versus Arsenal's {away_ctrl}%, with {contested_ctrl}% contested space in the current sequence."
        tool = "get_pitch_control"
    elif "inflection" in lower_q or "shift" in lower_q or "momentum" in lower_q:
        inflections = runtime.get_inflection_points(limit=3)
        if inflections:
            ans = f"Tactical Inflections: Latest shift at {inflections[-1]['matchClock']} - {inflections[-1]['description']}"
        else:
            ans = "No severe tactical inflection points detected in the current sequence; positional structure remains stable."
        tool = "get_inflection_points"
    else:
        ans = f"Tactical Context at {match_clock}: Game rhythm is '{rhythm}' with Control vs Chaos Index at {control}/100 and Pass Difficulty Rating at {pdr}."
        tool = "get_tactical_state"

    return CopilotQueryResponse(
        answer=ans,
        source="deterministic_swarm_grounding",
        model=None,
        matchClock=match_clock,
        toolUsed=tool,
    )

