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

import contextlib
import logging
import queue
import threading
import time
from dataclasses import asdict, dataclass, is_dataclass
from typing import Any

from .agents.base import (
    K_ANALYST_CONTEXT,
    K_CASUAL_CONTEXT,
    K_CLUB_CENTRIC_CONTEXT,
    K_COMMENTATOR_CUE,
    K_INFLECTION_CANDIDATES,
    K_MULTILINGUAL_STREAM,
    K_NARRATIVE,
    K_NARRATIVE_ARC,
    K_PLAYER_CAM_CONTEXT,
    AgentContext,
    BlackboardView,
)
from .agents.broadcast_narrative import NARRATIVE_ARCS, NarrativeDraft, RuleBasedNarrativeGenerator
from .agents.swarm import AgentSwarm, SwarmResult
from .config import Settings
from .models import (
    AgentTrace,
    BroadcastOverlayPayload,
    ExperiencePersona,
    MatchEvent,
    MatchEventType,
    NarrativeEvent,
    PlaybackStatus,
    SyntheticScenarioType,
    TelemetryFrame,
)
from .services.cosmos import OverlayStore
from .services.event_hubs import EventHubsPublisher
from .services.foundry import FoundryNarrativeService
from .services.mcp import ToolRegistry, build_registry
from .services.overlay import build_overlay
from .simulation.engine import SCENARIOS, MatchEngine
from .simulation.metrics import MATCH_LENGTH_SECONDS, format_match_clock

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class NarrativeInferenceRequest:
    """Envelope for an out-of-band asynchronous LLM narrative inference request."""

    epoch: int
    context: AgentContext
    match_clock: str
    match_seconds: float
    scenario: str


class MatchRuntime:
    """Owns the synthetic match, the agent swarm and the Azure integrations."""

    def __init__(
        self,
        settings: Settings | None = None,
        model_service: Any | None = None,
    ) -> None:
        self.settings = settings or Settings()
        self.engine = MatchEngine(seed=self.settings.random_seed)
        self.publisher = EventHubsPublisher(self.settings)
        self.store = OverlayStore(self.settings)

        # Milestone 2: Asynchronous Decoupling & Latency Isolation (ADR 0004)
        if model_service is not None:
            self.model_service = model_service
        elif self.settings.llm_enabled:
            self.model_service = FoundryNarrativeService(
                self.settings, timeout=self.settings.llm_timeout_seconds
            )
        else:
            self.model_service = None

        # Tier 1 fast-path swarm uses deterministic generator without blocking on slow inference
        self.swarm = AgentSwarm(
            self.settings,
            model_service=None,
        )
        self._lock = threading.RLock()
        self._wire: dict[str, Any] | None = None
        self._wire_sent_at_ms: int = 0
        self._frame: TelemetryFrame | None = None
        self._narrative: NarrativeEvent | None = None
        self._traces: list[AgentTrace] = []
        self._swarm_latency_ms: float = 0.0
        self._persona = ExperiencePersona.ANALYST
        self._scenario = SyntheticScenarioType(self.settings.default_scenario)
        self._commands: list[str] = []
        self._paused: bool = False
        self._speed: float = 1.0
        self._playback_speed: float = 1.0
        self._ready = threading.Event()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._swarm_busy = False
        self._swarm_result: SwarmResult | None = None
        self._started_at = time.time()
        self._frame_counter = 0
        self._last_tick_at: float = 0.0
        self._worker_error: str | None = None
        self.tools: ToolRegistry = build_registry(self)

        # Decoupled out-of-band background narrative worker state
        self._scrub_epoch: int = 0
        self._narrative_queue: queue.Queue[NarrativeInferenceRequest] = queue.Queue(maxsize=1)
        self._active_ai_narrative: NarrativeEvent | None = None
        self._active_ai_latency_ms: float = 0.0
        self._narrative_worker_thread: threading.Thread | None = None
        self._rule_generator = RuleBasedNarrativeGenerator()
        self._last_async_narrative_submit: float = 0.0
        self._async_narrative_interval: float = 5.0

    # -- lifecycle ------------------------------------------------------------

    def start(self) -> None:
        """Start the simulation worker thread and the asynchronous narrative worker."""
        if self._thread is not None:
            return
        self._thread = threading.Thread(target=self._worker, name="pl-simulation", daemon=True)
        self._thread.start()

        if self._narrative_worker_thread is None and hasattr(self, "_narrative_worker_loop"):
            self._narrative_worker_thread = threading.Thread(
                target=self._narrative_worker_loop, name="pl-narrative-worker", daemon=True
            )
            self._narrative_worker_thread.start()

    def stop(self) -> None:
        self._stop.set()
        thread = self._thread
        if thread is not None:
            thread.join(timeout=2.0)
            self._thread = None
        narrative_thread = self._narrative_worker_thread
        if narrative_thread is not None:
            narrative_thread.join(timeout=2.0)
            self._narrative_worker_thread = None
        if self.model_service is not None and hasattr(self.model_service, "close"):
            self.model_service.close()
        self.publisher.close()
        self.store.close()
        self.swarm.shutdown()

    @property
    def scrub_epoch(self) -> int:
        with self._lock:
            return self._scrub_epoch

    @property
    def ready(self) -> bool:
        """The service is ready only while the simulation is actually ticking.

        A finished warm-up is not enough, and neither is a live thread
        object: the worker has to have published recently. If the worker
        dies - or stops publishing - the health endpoint must say so,
        otherwise a dead simulation looks healthy.
        """
        if not (self._ready.is_set() and self.simulation_alive and self._worker_error is None):
            return False
        return self.heartbeat_fresh

    @property
    def simulation_alive(self) -> bool:
        thread = self._thread
        return thread is not None and thread.is_alive()

    @property
    def worker_error(self) -> str | None:
        return self._worker_error

    @property
    def heartbeat_fresh(self) -> bool:
        """True when the worker published a frame recently."""
        if self._last_tick_at <= 0.0:
            return False
        return (time.time() - self._last_tick_at) <= self.HEARTBEAT_STALE_SECONDS

    @property
    def last_tick_at(self) -> float:
        return self._last_tick_at

    def wait_until_ready(self, timeout: float = 30.0) -> bool:
        return self._ready.wait(timeout)

    # -- worker ----------------------------------------------------------------

    #: How long the worker may stay silent before the service is reported
    #: as not ready. The worker ticks at 10 Hz, so this is generous.
    HEARTBEAT_STALE_SECONDS = 15.0

    def _worker(self) -> None:
        try:
            self._warm_up()
        except Exception as exc:  # noqa: BLE001 - the worker must report, not vanish
            self._worker_error = f"warm-up failed: {exc}"
            logger.exception("The simulation warm-up failed.")
            return
        self._ready.set()
        self._last_tick_at = time.time()

        dt = 1.0 / max(1, self.settings.simulation_hz)
        publish_every = max(1, self.settings.simulation_hz // max(1, self.settings.publish_hz))
        tick = 0

        while not self._stop.is_set():
            started = time.perf_counter()
            self._last_tick_at = time.time()
            try:
                with self._lock:
                    self._apply_commands()
                    if not self._paused:
                        self.engine.step(dt * self._speed)
                        tick += 1
                        if tick % publish_every == 0:
                            self._build_and_publish()
            except Exception as exc:  # noqa: BLE001 - a dead simulation must be visible
                self._worker_error = f"simulation tick failed: {exc}"
                logger.exception("The simulation worker stopped on an unexpected error.")
                self._ready.clear()
                return
            elapsed = time.perf_counter() - started
            self._last_tick_at = time.time()
            time.sleep(max(0.0, dt - elapsed))

    def _warm_up(self) -> None:
        """Generate the match history that precedes the live feed."""
        with self._lock:
            self._scrub_epoch += 1
            self._active_ai_narrative = None
            self._narrative = None
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
        self._scrub_epoch += 1
        self._active_ai_narrative = None
        self._narrative = None
        self.engine.reset(
            command,
            start_seconds=self.scenario_anchor(SyntheticScenarioType(command)),
            warmup_seconds=max(0, self.settings.sim_warmup_seconds),
            dt=self.settings.sim_fast_forward_dt,
        )
        self._scenario = SyntheticScenarioType(command)
        self._traces = []

    def _build_instant_narrative(self, frame: TelemetryFrame) -> NarrativeEvent:
        """Evaluate RuleBasedNarrativeGenerator instantly (<0.25ms) for zero-latency publishing."""
        context = AgentContext(
            frame=frame,
            view=BlackboardView(blackboard=self.swarm.blackboard),
            persona=self._persona,
        )
        draft = self._rule_generator.build(context)

        # Write to blackboard so immediate downstream readers have valid tactical narrative
        self.swarm.blackboard.write(K_NARRATIVE, draft)
        self.swarm.blackboard.write(
            K_MULTILINGUAL_STREAM,
            {
                "headline": draft.headline.model_dump(),
                "tacticalExplanation": draft.tacticalExplanation.model_dump(),
            },
        )
        self.swarm.blackboard.write(K_COMMENTATOR_CUE, draft.commentatorCue)
        self.swarm.blackboard.write(
            K_NARRATIVE_ARC, NARRATIVE_ARCS.get(frame.scenario.value, frame.scenario.value)
        )

        analyst = self.swarm.blackboard.read(K_ANALYST_CONTEXT)
        casual = self.swarm.blackboard.read(K_CASUAL_CONTEXT)
        player_cam = self.swarm.blackboard.read(K_PLAYER_CAM_CONTEXT)
        club = self.swarm.blackboard.read(K_CLUB_CENTRIC_CONTEXT)

        if not analyst:
            analyst = (
                f"Control vs. Chaos Index sits at {frame.metrics.controlVsChaosIndex:.0f} "
                f"with Pass Difficulty Rating at {frame.metrics.passDifficultyRating:.0f}."
            )
        if not casual:
            casual = f"{frame.scenario.value.replace('_', ' ').title()} underway at {frame.matchClock}."
        if not player_cam:
            player_cam = "Tactical tracking active on key pitch influencers."
        if not isinstance(club, dict) or not club:
            club = {
                "homeFrame": f"Manchester City maintaining tactical shape at {frame.matchClock}.",
                "awayFrame": f"Arsenal organizing defensive corridors at {frame.matchClock}.",
            }

        return NarrativeEvent(
            id=draft.id,
            matchClock=draft.matchClock,
            timestamp=draft.timestamp,
            isTacticalInflectionPoint=draft.isTacticalInflectionPoint,
            headline=draft.headline,
            tacticalExplanation=draft.tacticalExplanation,
            analystContext=analyst,
            casualContext=casual,
            playerCamContext=player_cam,
            clubCentricContext={
                "homeFrame": str(club.get("homeFrame", "")),
                "awayFrame": str(club.get("awayFrame", "")),
            },
        )

    def _compose_ai_narrative_event(
        self, draft: NarrativeDraft, frame: TelemetryFrame | None = None
    ) -> NarrativeEvent:
        """Compose a full NarrativeEvent from an AI-generated draft."""
        analyst = self.swarm.blackboard.read(K_ANALYST_CONTEXT) or ""
        casual = self.swarm.blackboard.read(K_CASUAL_CONTEXT) or ""
        player_cam = self.swarm.blackboard.read(K_PLAYER_CAM_CONTEXT) or ""
        club = self.swarm.blackboard.read(K_CLUB_CENTRIC_CONTEXT) or {"homeFrame": "", "awayFrame": ""}

        if not analyst and frame is not None:
            analyst = (
                f"Control vs. Chaos Index sits at {frame.metrics.controlVsChaosIndex:.0f} "
                f"with Pass Difficulty Rating at {frame.metrics.passDifficultyRating:.0f}."
            )
        if not casual and frame is not None:
            casual = f"AI tactical analysis updated at {draft.matchClock}."

        return NarrativeEvent(
            id=draft.id,
            matchClock=draft.matchClock,
            timestamp=draft.timestamp,
            isTacticalInflectionPoint=draft.isTacticalInflectionPoint,
            headline=draft.headline,
            tacticalExplanation=draft.tacticalExplanation,
            analystContext=analyst,
            casualContext=casual,
            playerCamContext=player_cam,
            clubCentricContext={
                "homeFrame": str(club.get("homeFrame", "") if isinstance(club, dict) else ""),
                "awayFrame": str(club.get("awayFrame", "") if isinstance(club, dict) else ""),
            },
        )

    def submit_async_narrative(self, context: AgentContext, epoch: int | None = None) -> bool:
        """Submit a context to the out-of-band LLM worker without blocking.

        If the single-item queue is full, coalesces non-blockingly (draining the
        stale item or skipping), ensuring the fast-path tick loop is NEVER blocked.
        """
        if self.model_service is None:
            return False

        current_epoch = self._scrub_epoch if epoch is None else epoch
        request = NarrativeInferenceRequest(
            epoch=current_epoch,
            context=context,
            match_clock=context.frame.matchClock if context.frame else "",
            match_seconds=context.frame.matchSeconds if context.frame else 0.0,
            scenario=context.frame.scenario.value if context.frame else "",
        )

        try:
            self._narrative_queue.put_nowait(request)
            return True
        except queue.Full:
            with contextlib.suppress(queue.Empty):
                self._narrative_queue.get_nowait()
            try:
                self._narrative_queue.put_nowait(request)
                return True
            except queue.Full:
                return False

    def _narrative_worker_loop(self) -> None:
        """Dedicated background worker executing slow LLM inference out-of-band."""
        logger.info("Background narrative worker thread started.")
        while not self._stop.is_set():
            try:
                request = self._narrative_queue.get(timeout=0.2)
            except queue.Empty:
                continue

            # 1. Inspect request.epoch == self._scrub_epoch before LLM inference
            if request.epoch != self._scrub_epoch:
                logger.debug(
                    "Discarding stale narrative request before inference: epoch %d != %d",
                    request.epoch,
                    self._scrub_epoch,
                )
                continue

            started = time.perf_counter()
            try:
                if self.model_service is None:
                    continue
                draft = self.model_service(request.context)
            except Exception as exc:  # noqa: BLE001 - worker survives any network or model error
                logger.warning("Background narrative LLM inference failed: %s", exc)
                continue

            elapsed_ms = (time.perf_counter() - started) * 1000.0

            # 2. Inspect request.epoch == self._scrub_epoch after LLM inference
            if request.epoch != self._scrub_epoch:
                logger.debug(
                    "Discarding stale narrative response after inference: epoch %d != %d",
                    request.epoch,
                    self._scrub_epoch,
                )
                continue

            # 3. Atomic swap under synchronization lock
            with self._lock:
                if request.epoch != self._scrub_epoch:
                    logger.debug(
                        "Discarding stale narrative response under lock: epoch %d != %d",
                        request.epoch,
                        self._scrub_epoch,
                    )
                    continue

                ai_narrative = self._compose_ai_narrative_event(draft, request.context.frame)
                self._active_ai_narrative = ai_narrative
                self._active_ai_latency_ms = elapsed_ms
                self._narrative = ai_narrative
                self._swarm_latency_ms = elapsed_ms

                # Commit to shared blackboard
                self.swarm.blackboard.write(K_NARRATIVE, draft)
                self.swarm.blackboard.write(
                    K_MULTILINGUAL_STREAM,
                    {
                        "headline": draft.headline.model_dump(),
                        "tacticalExplanation": draft.tacticalExplanation.model_dump(),
                    },
                )
                self.swarm.blackboard.write(K_COMMENTATOR_CUE, draft.commentatorCue)
                self.swarm.blackboard.write(
                    K_NARRATIVE_ARC, NARRATIVE_ARCS.get(request.scenario, request.scenario)
                )
                logger.info(
                    "Atomic swap completed: AI narrative for %s (epoch %d) swapped in (%.1fms).",
                    draft.matchClock,
                    request.epoch,
                    elapsed_ms,
                )

    def _build_and_publish(self) -> None:
        """Tier 1: build and publish the deterministic frame."""
        frame = self.engine.build_frame()

        # Instant zero-latency frames: if a freshly completed AI narrative is available,
        # incorporate it; otherwise evaluate RuleBasedNarrativeGenerator instantly (<0.25ms)
        if self._active_ai_narrative is not None:
            frame.latestNarrative = self._active_ai_narrative
            self._narrative = self._active_ai_narrative
            frame.metrics.agentReasoningLatencyMs = round(self._active_ai_latency_ms, 2)
        else:
            instant_narrative = self._build_instant_narrative(frame)
            frame.latestNarrative = instant_narrative
            self._narrative = instant_narrative
            frame.metrics.agentReasoningLatencyMs = round(self._swarm_latency_ms, 2)

        if self._traces:
            frame.agentTrace = list(self._traces)

        self._frame = frame
        self._frame_counter += 1
        self._wire = frame.to_wire()
        self._wire_sent_at_ms = int(time.time() * 1000)

        if self._swarm_result is not None and self._swarm_result.inflection_event is not None:
            self.engine.add_external_event(self._swarm_result.inflection_event)
            self._swarm_result = None

        # Check if we should trigger out-of-band asynchronous LLM inference (Tier 2 slow path)
        if self.model_service is not None:
            inflection_present = bool(self.swarm.blackboard.read(K_INFLECTION_CANDIDATES))
            now = time.time()
            time_since_submit = now - self._last_async_narrative_submit
            if (
                self._active_ai_narrative is None
                or inflection_present
                or time_since_submit >= self._async_narrative_interval
            ):
                context = AgentContext(
                    frame=frame,
                    view=BlackboardView(blackboard=self.swarm.blackboard),
                    persona=self._persona,
                )
                if self.submit_async_narrative(context, epoch=self._scrub_epoch):
                    self._last_async_narrative_submit = now

        # Tier 2: the agent swarm runs asynchronously (ADR 0004).
        if not self._swarm_busy:
            self._swarm_busy = True
            self.swarm.run_async(frame, self._persona, self._on_swarm_complete)

    def _on_swarm_complete(self, result: SwarmResult) -> None:
        self._swarm_busy = False
        self._traces = result.traces
        self._swarm_latency_ms = result.latency_ms
        if result.inflection_event is not None:
            self._swarm_result = result
        if self._active_ai_narrative is None:
            self._narrative = result.narrative

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
            self._scrub_epoch += 1
            self._active_ai_narrative = None
            self._narrative = None
            self._commands.append(value.value)
        return value

    @property
    def scenario(self) -> SyntheticScenarioType:
        with self._lock:
            return self.engine.scenario.id

    @staticmethod
    def scenario_anchor(scenario: SyntheticScenarioType) -> float:
        return SCENARIOS[scenario].anchor_seconds

    # -- playback control -----------------------------------------------------

    @property
    def is_paused(self) -> bool:
        with self._lock:
            return self._paused

    def pause(self) -> PlaybackStatus:
        with self._lock:
            self._scrub_epoch += 1
            self._paused = True
            return self.playback_status()

    def resume(self) -> PlaybackStatus:
        with self._lock:
            self._paused = False
            return self.playback_status()

    @property
    def speed(self) -> float:
        with self._lock:
            return self._speed

    @property
    def playback_speed(self) -> float:
        with self._lock:
            return self._speed

    def set_speed(self, multiplier: float) -> PlaybackStatus:
        with self._lock:
            self._speed = max(0.1, min(10.0, float(multiplier)))
            self._playback_speed = self._speed
            return self.playback_status()

    def set_playback_speed(self, speed: float) -> float:
        """Alias for backward compatibility."""
        return self.set_speed(speed).speed

    def jump_to_seconds(self, target_seconds: float) -> PlaybackStatus:
        with self._lock:
            self._scrub_epoch += 1
            self._active_ai_narrative = None
            self._narrative = None
            self.engine.jump_to_seconds(target_seconds)
            self._build_and_publish()
            return self.playback_status()

    def jump_to(self, seconds: float) -> float:
        """Alias for backward compatibility returning matchSeconds."""
        status = self.jump_to_seconds(seconds)
        return status.matchSeconds

    def playback_status(self) -> PlaybackStatus:
        with self._lock:
            return PlaybackStatus(
                paused=self._paused,
                speed=self._speed,
                matchClock=format_match_clock(self.engine.match_seconds),
                matchSeconds=round(self.engine.match_seconds, 2),
            )

    def latest_wire(self) -> dict[str, Any] | None:
        """The most recently published payload (a drop-in TelemetryFrame)."""
        return self._wire

    def latest_envelope(self) -> dict[str, Any] | None:
        """The WebSocket envelope: the frame, the blackboard and the stamp.

        ``sentAtMs`` is the wall-clock time the backend published the frame,
        so the studio can measure the real round trip instead of guessing.
        """
        wire = self.latest_wire()
        if wire is None:
            return None
        return {
            "frame": wire,
            "blackboard": self.blackboard_payload(),
            "sentAtMs": self._wire_sent_at_ms,
        }

    def blackboard_payload(self) -> dict[str, Any]:
        """A JSON-safe view of the shared tactical blackboard (ADR 0002)."""
        snapshot = self.swarm.blackboard.snapshot()
        return {key: _json_safe(value) for key, value in snapshot.items()}

    def latest_frame(self) -> TelemetryFrame | None:
        with self._lock:
            return self._frame

    def latest_narrative(self) -> NarrativeEvent | None:
        with self._lock:
            return self._active_ai_narrative or self._narrative

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

    def get_pitch_control(self, include_cells: bool = True) -> dict[str, Any]:
        """Return the pitch control surface and dominance split (alias for get_pitch_control_surface)."""
        return self.get_pitch_control_surface(include_cells=include_cells)

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

    def get_tactical_state(self) -> dict[str, Any]:
        """Return the full tactical state including phase, rhythm, chaos, PDR, pitch control split, score, and key players."""
        with self._lock:
            frame = self._frame or self.engine.build_frame()
            bb = self.swarm.blackboard.snapshot()

        key_players = bb.get("key_players")
        if not key_players:
            carrier = next((p for p in frame.players if p.onBall), None)
            if carrier is not None:
                key_players = [
                    {
                        "id": carrier.id,
                        "name": carrier.name,
                        "shortName": carrier.shortName,
                        "team": carrier.team.value if hasattr(carrier.team, "value") else str(carrier.team),
                        "role": carrier.role.value if hasattr(carrier.role, "value") else str(carrier.role),
                        "involvement": 1.0,
                        "speedKmH": carrier.speedKmH,
                        "touches": carrier.touches,
                    }
                ]
            else:
                key_players = []

        tactical_phase = bb.get("tactical_phase", "progression")
        return {
            "matchClock": frame.matchClock,
            "matchSeconds": frame.matchSeconds,
            "scenario": frame.scenario.value if hasattr(frame.scenario, "value") else str(frame.scenario),
            "phase": tactical_phase,
            "tacticalPhase": tactical_phase,
            "gameRhythm": bb.get(
                "game_rhythm",
                frame.metrics.gameRhythm.value if hasattr(frame.metrics.gameRhythm, "value") else str(frame.metrics.gameRhythm),
            ),
            "controlVsChaosIndex": bb.get("control_vs_chaos", frame.metrics.controlVsChaosIndex),
            "passDifficultyRating": bb.get("pass_difficulty_rating", frame.metrics.passDifficultyRating),
            "pitchControl": (
                frame.metrics.pitchControl.model_dump()
                if hasattr(frame.metrics.pitchControl, "model_dump")
                else frame.metrics.pitchControl
            ),
            "score": {"home": frame.score.home, "away": frame.score.away},
            "keyPlayers": key_players,
        }

    def get_inflection_points(self, limit: int = 10) -> list[dict[str, Any]]:
        """Return match inflection points (discrete tactical shifts and momentum swings)."""
        limit = max(1, min(100, int(limit)))
        with self._lock:
            all_events = self.engine.events.all()
            inflections = [
                e.model_dump()
                for e in all_events
                if getattr(e.type, "value", str(e.type)) == MatchEventType.INFLECTION.value
            ]
        return inflections[-limit:]

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

    def get_player_spotlight(self, player_id: str) -> dict[str, Any]:
        with self._lock:
            frame = self._frame or self.engine.build_frame()
            player = next(
                (
                    p
                    for p in frame.players
                    if p.id == player_id
                    or p.name.lower() == player_id.lower()
                    or p.shortName.lower() == player_id.lower()
                ),
                None,
            )
            if player is None:
                raise KeyError(f"Unknown player: {player_id}")
            stats = next((s for s in frame.playerStats if s.id == player.id), None)
            return {
                "player": player.model_dump(),
                "stats": stats.model_dump() if stats else None,
                "matchClock": frame.matchClock,
                "matchSeconds": frame.matchSeconds,
            }

    @property
    def uptime_seconds(self) -> float:
        return round(time.time() - self._started_at, 2)

    @property
    def match_finished(self) -> bool:
        with self._lock:
            return self.engine.match_seconds >= MATCH_LENGTH_SECONDS


def _json_safe(value: Any) -> Any:
    """Reduce a blackboard value to something that survives JSON encoding."""
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(item) for item in value]
    if hasattr(value, "model_dump"):
        return _json_safe(value.model_dump(mode="json"))
    if is_dataclass(value) and not isinstance(value, type):
        return _json_safe(asdict(value))
    return str(value)


__all__ = ["MatchRuntime"]
