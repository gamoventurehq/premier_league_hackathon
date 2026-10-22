"""The service runtime: the simulation worker, the agent swarm and the Azure
service clients.

The runtime owns the synthetic match engine and drives it from a dedicated
worker thread at the internal engine rate (10 Hz, ADR 0003). The published
telemetry frames are downsampled to 5 Hz for the WebSocket consumers.

The Tiered Fast-Path (ADR 0004) is realised here: the deterministic frame is
published as soon as it is built, while the agent swarm runs asynchronously
and its narrative is folded into the following frame.
"""

from __future__ import annotations

import logging
import threading
from time import perf_counter, time
from typing import Any

from .agents.swarm import AgentSwarm, SwarmResult
from .config import Settings
from .models import (
    AgentTrace,
    BroadcastOverlayPayload,
    ExperiencePersona,
    MatchEvent,
    NarrativeEvent,
    SyntheticScenarioType,
    TelemetryFrame,
)
from .services.cosmos import OverlayStore
from .services.event_hubs import EventHubsPublisher
from .services.foundry import FoundryNarrativeService
from .services.overlay import build_overlay
from .services.mcp import ToolRegistry, build_registry
from .simulation.engine import SCENARIOS, MatchEngine
from .simulation.metrics import MATCH_LENGTH_SECONDS

logger = logging.getLogger(__name__)


class MatchRuntime:
    """Owns the synthetic match, the agent swarm and the Azure integrations."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or Settings()
        self.engine = MatchEngine(seed=self.settings.random_seed)
        self.publisher = EventHubsPublisher(self.settings)
        self.store = OverlayStore(self.settings)
        self.swarm = AgentSwarm(
            self.settings,
            model_service=FoundryNarrativeService(self.settings) if self.settings.foundry_enabled else None,
        )
        self._lock = threading.RLock()
        self._wire: dict[str, Any] | None = None
        self._frame: TelemetryFrame | None = None
        self._narrative: NarrativeEvent | None = None
        self._traces: list[AgentTrace] = []
        self._swarm_latency_ms: float = 0.0
        self._persona = ExperiencePersona.ANALYST
        self._scenario = SyntheticScenarioType(self.settings.default_scenario)
        self._commands: list[str] = []
        self._ready = threading.Event()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._swarm_busy = False
        self._swarm_result: SwarmResult | None = None
        self._started_at = time()
        self._frame_counter = 0
        self.tools: ToolRegistry = build_registry(self)

    # -- lifecycle ------------------------------------------------------------

    def start(self) -> None:
        """Start the simulation worker thread."""
        if self._thread is not None:
            return
        self._thread = threading.Thread(target=self._worker, name="pl-simulation", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        thread = self._thread
        if thread is not None:
            thread.join(timeout=2.0)
            self._thread = None
        self.publisher.close()
        self.store.close()
        self.swarm.shutdown()

    @property
    def ready(self) -> bool:
        return self._ready.is_set()

    def wait_until_ready(self, timeout: float = 30.0) -> bool:
        return self._ready.wait(timeout)

    # -- worker ----------------------------------------------------------------

    def _worker(self) -> None:
        self._warm_up()
        self._ready.set()

        dt = 1.0 / max(1, self.settings.simulation_hz)
        publish_every = max(1, self.settings.simulation_hz // max(1, self.settings.publish_hz))
        tick = 0

        while not self._stop.is_set():
            started = perf_counter()
            with self._lock:
                self._apply_commands()
                self.engine.step(dt)
                tick += 1
                if tick % publish_every == 0:
                    self._build_and_publish()
            elapsed = perf_counter() - started
            time.sleep(max(0.0, dt - elapsed))

    def _warm_up(self) -> None:
        """Generate the match history that precedes the live feed."""
        with self._lock:
            self.engine.reset(
                self._scenario,
                start_seconds=self.scenario_anchor(self._scenario),
                warmup_seconds=max(0, self.settings.sim_warmup_seconds),
                dt=self.settings.sim_fast_forward_dt,
            )
        logger.info(
            "Simulation warm-up complete: scenario %s at %s (%d simulated seconds of history).",
            self._scenario.value,
            self.engine.build_frame().matchClock,
            self.settings.sim_warmup_seconds,
        )

    def _apply_commands(self) -> None:
        if not self._commands:
            return
        command = self._commands.pop(0)
        logger.info("Applying scenario command: %s", command)
        self.engine.reset(
            command,
            start_seconds=self.scenario_anchor(SyntheticScenarioType(command)),
            warmup_seconds=max(0, self.settings.sim_warmup_seconds),
            dt=self.settings.sim_fast_forward_dt,
        )
        self._scenario = SyntheticScenarioType(command)
        self._narrative = None
        self._traces = []

    def _build_and_publish(self) -> None:
        """Tier 1: build and publish the deterministic frame."""
        frame = self.engine.build_frame()
        if self._narrative is not None:
            frame.latestNarrative = self._narrative
        if self._traces:
            frame.agentTrace = list(self._traces)
        frame.metrics.agentReasoningLatencyMs = round(self._swarm_latency_ms, 2)
        self._frame = frame
        self._frame_counter += 1
        self._wire = frame.to_wire()

        if self._swarm_result is not None and self._swarm_result.inflection_event is not None:
            self.engine.add_external_event(self._swarm_result.inflection_event)
            self._swarm_result = None

        # Tier 2: the agent swarm runs asynchronously (ADR 0004).
        if not self._swarm_busy:
            self._swarm_busy = True
            self.swarm.run_async(frame, self._persona, self._on_swarm_complete)

    def _on_swarm_complete(self, result: SwarmResult) -> None:
        self._swarm_busy = False
        self._narrative = result.narrative
        self._traces = result.traces
        self._swarm_latency_ms = result.latency_ms
        if result.inflection_event is not None:
            self._swarm_result = result

    # -- public API -------------------------------------------------------------

    @property
    def persona(self) -> ExperiencePersona:
        return self._persona

    def set_persona(self, persona: str | ExperiencePersona) -> ExperiencePersona:
        self._persona = ExperiencePersona(persona)
        return self._persona

    def set_scenario(self, scenario: str | SyntheticScenarioType) -> SyntheticScenarioType:
        """Queue a scenario change; the worker thread applies it on the next tick."""
        value = SyntheticScenarioType(scenario)
        with self._lock:
            self._commands.append(value.value)
        return value

    @property
    def scenario(self) -> SyntheticScenarioType:
        with self._lock:
            return self.engine.scenario.id

    @staticmethod
    def scenario_anchor(scenario: SyntheticScenarioType) -> float:
        return SCENARIOS[scenario].anchor_seconds

    def latest_wire(self) -> dict[str, Any] | None:
        """The most recently published payload (a drop-in TelemetryFrame)."""
        return self._wire

    def latest_frame(self) -> TelemetryFrame | None:
        with self._lock:
            return self._frame

    def latest_narrative(self) -> NarrativeEvent | None:
        with self._lock:
            return self._narrative

    def latest_traces(self) -> list[AgentTrace]:
        with self._lock:
            return list(self._traces)

    def overlay(self, persona: str | ExperiencePersona | None = None) -> BroadcastOverlayPayload | None:
        frame = self.latest_frame()
        if frame is None:
            return None
        return build_overlay(frame, persona or self._persona)

    def events(self, limit: int = 25, event_type: str | None = None) -> list[MatchEvent]:
        with self._lock:
            events = self.engine.events.recent(limit)
        if event_type:
            events = [event for event in events if event.type.value == event_type]
        return events

    # -- MCP provider ----------------------------------------------------------

    def get_pitch_control_surface(self, include_cells: bool = True) -> dict[str, Any]:
        with self._lock:
            frame = self.engine.build_frame()
        payload: dict[str, Any] = {
            "scenario": frame.scenario.value,
            "matchClock": frame.matchClock,
            "split": frame.metrics.pitchControl.model_dump(),
            "cellCount": len(frame.pitchControlCells),
        }
        if include_cells:
            payload["cells"] = [cell.model_dump() for cell in frame.pitchControlCells]
        return payload

    def evaluate_passing_lane(self, passer_id: str, receiver_id: str) -> dict[str, Any]:
        from .simulation.spatial import evaluate_lane

        with self._lock:
            passer = next((p for p in self.engine.state.players if p.id == passer_id), None)
            receiver = next((p for p in self.engine.state.players if p.id == receiver_id), None)
            if passer is None or receiver is None:
                raise KeyError("Unknown player id")
            opponents = [p for p in self.engine.state.players if p.team is not passer.team]
            lane = evaluate_lane(passer, receiver, opponents)
        return lane.model_dump()

    def get_control_vs_chaos_index(self) -> dict[str, Any]:
        with self._lock:
            frame = self.engine.build_frame()
        chaos = self.swarm.blackboard.read("control_vs_chaos")
        return {
            "matchClock": frame.matchClock,
            "controlVsChaosIndex": frame.metrics.controlVsChaosIndex,
            "gameRhythm": frame.metrics.gameRhythm.value,
            "passDifficultyRating": frame.metrics.passDifficultyRating,
            "observedInputs": chaos if chaos is not None else {},
            "possessionShare": frame.metrics.possessionShare.model_dump(),
            "turnovers": self.engine.observations.turnover_count,
            "possessionChanges": self.engine.observations.possession_changes,
        }

    def emit_broadcast_overlay(self, persona: str = "analyst") -> dict[str, Any]:
        frame = self.latest_frame()
        if frame is None:
            raise RuntimeError("No telemetry frame has been published yet")
        overlay = build_overlay(frame, persona)
        self.store.store(overlay)
        return overlay.model_dump()

    def get_match_events(self, limit: int = 25, event_type: str | None = None) -> list[dict[str, Any]]:
        return [event.model_dump() for event in self.events(limit=limit, event_type=event_type)]

    def get_agent_trace(self) -> list[dict[str, Any]]:
        return [trace.model_dump() for trace in self.latest_traces()]

    @property
    def uptime_seconds(self) -> float:
        return round(time() - self._started_at, 2)

    @property
    def match_finished(self) -> bool:
        with self._lock:
            return self.engine.match_seconds >= MATCH_LENGTH_SECONDS


__all__ = ["MatchRuntime"]
