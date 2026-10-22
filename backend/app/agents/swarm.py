"""The four-agent swarm (ADR 0002) with the Tiered Fast-Path resilience of
ADR 0004 and the MCP tool surface of ADR 0006.

The swarm runs four specialised agents over one shared tactical state:

1. **Telemetry Ingestion** - normalises the raw frame into the canonical contract.
2. **Tactical Reasoning** - derives the tactical reading, detects Tactical
   Inflection Points.
3. **Broadcast Narrative** - writes the Broadcast Overlay and the Multilingual
   Broadcast Stream.
4. **Fan Personalization** - projects the moment into the Analyst, Casual,
   Player Cam and Club-Centric framings.

Every agent gets its own deadline. An agent that times out or raises is
replaced by its rule-based fallback, so the broadcast never stutters.
"""

from __future__ import annotations

import logging
from concurrent.futures import Future, ThreadPoolExecutor
from concurrent.futures import TimeoutError as FutureTimeoutError
from dataclasses import dataclass, field
from time import perf_counter
from typing import Any

from ..config import Settings
from ..models import (
    AgentStatus,
    AgentTrace,
    ExperiencePersona,
    MatchEvent,
    MatchEventType,
    NarrativeEvent,
    TelemetryFrame,
)
from ..simulation.events import make_event
from .base import (
    K_ANALYST_CONTEXT,
    K_CASUAL_CONTEXT,
    K_CLUB_CENTRIC_CONTEXT,
    K_INFLECTION_CANDIDATES,
    K_NARRATIVE,
    K_PLAYER_CAM_CONTEXT,
    AgentContext,
    AgentOutcome,
    Blackboard,
    BlackboardView,
)
from .broadcast_narrative import BroadcastNarrativeAgent, NarrativeDraft, RuleBasedNarrativeGenerator
from .fan_personalization import FanPersonalizationAgent
from .tactical_reasoning import TacticalReasoningAgent
from .telemetry_ingestion import TelemetryIngestionAgent

logger = logging.getLogger(__name__)

#: Per agent deadline (seconds) inside the 1.5s Tier 2 budget.
FAST_AGENT_DEADLINE = 0.4


@dataclass(slots=True)
class SwarmResult:
    """The outcome of a single swarm cycle."""

    narrative: NarrativeEvent
    traces: list[AgentTrace]
    latency_ms: float
    fast_path_ms: float
    inflection_event: MatchEvent | None = None
    blackboard: dict[str, Any] = field(default_factory=dict)


class AgentSwarm:
    """Orchestrates the four agents over the shared tactical state."""

    def __init__(
        self,
        settings: Settings | None = None,
        model_service: Any | None = None,
        agents: list[Any] | None = None,
    ) -> None:
        self.settings = settings or Settings()
        self.blackboard = Blackboard()
        self.generator = RuleBasedNarrativeGenerator()
        self.agents: list[Any] = agents or [
            TelemetryIngestionAgent(),
            TacticalReasoningAgent(),
            BroadcastNarrativeAgent(generator=self.generator, model_service=model_service),
            FanPersonalizationAgent(),
        ]
        self._executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="pl-agent")
        self._async_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="pl-swarm")

    # -- lifecycle ------------------------------------------------------------

    def shutdown(self) -> None:
        self._executor.shutdown(wait=False, cancel_futures=True)
        self._async_executor.shutdown(wait=False, cancel_futures=True)

    def run_async(self, frame: TelemetryFrame, persona: ExperiencePersona | str, callback) -> None:
        """Run the swarm in the background and hand the result to ``callback``.

        This is what keeps the Tiered Fast-Path free of agent latency
        (ADR 0004): the deterministic frame is published without waiting for
        the narrative.
        """
        self._async_executor.submit(self._run_and_report, frame, persona, callback)

    def _run_and_report(self, frame, persona, callback) -> None:
        try:
            result = self.run(frame, persona)
        except Exception:  # noqa: BLE001 - a swarm failure must never kill the stream
            logger.exception("The agent swarm failed; the published narrative is unchanged.")
            return
        try:
            callback(result)
        except Exception:  # noqa: BLE001
            logger.exception("The swarm callback failed.")

    # -- execution ------------------------------------------------------------

    def run(self, frame: TelemetryFrame, persona: ExperiencePersona | str = ExperiencePersona.ANALYST) -> SwarmResult:
        """Run one cycle of the swarm over the given frame."""
        if isinstance(persona, str):
            persona = ExperiencePersona(persona)
        started = perf_counter()
        budget = max(0.1, self.settings.agent_timeout_ms / 1000.0)

        traces: list[AgentTrace] = []
        for agent in self.agents:
            view = BlackboardView(blackboard=self.blackboard)
            context = AgentContext(frame=frame, view=view, persona=persona)
            outcome = self._run_agent(agent, context, budget)
            if outcome.status is AgentStatus.COMPLETE:
                view.commit()
            else:
                view.discard()
            traces.append(outcome.to_trace())

        latency_ms = (perf_counter() - started) * 1000.0
        narrative = self._compose_narrative(frame, persona)
        inflection_event = self._inflection_event(frame)

        return SwarmResult(
            narrative=narrative,
            traces=traces,
            latency_ms=latency_ms,
            fast_path_ms=frame.metrics.fastPathLatencyMs,
            inflection_event=inflection_event,
            blackboard=self.blackboard.snapshot(),
        )

    def _run_agent(self, agent, context: AgentContext, budget: float) -> AgentOutcome:
        """Run one agent under a deadline, falling back when it fails."""
        deadline = FAST_AGENT_DEADLINE if agent.role.value != "broadcast_narrative" else budget
        timeout = max(0.05, min(deadline, budget))
        future: Future[AgentOutcome] = self._executor.submit(agent.run, context)
        try:
            return future.result(timeout=timeout)
        except FutureTimeoutError:
            future.cancel()
            logger.warning("Agent %s exceeded its %.0fms deadline, using the fallback.", agent.role.value, timeout * 1000)
            return self._fallback(agent, context)
        except Exception as exc:  # noqa: BLE001 - the swarm must survive agent failures
            logger.warning("Agent %s failed (%s), using the fallback.", agent.role.value, exc)
            return self._fallback(agent, context)

    def _fallback(self, agent, context: AgentContext) -> AgentOutcome:
        fallback = getattr(agent, "fallback", None)
        if fallback is None:
            return AgentOutcome(
                role=agent.role,
                label=agent.label,
                status=AgentStatus.FALLBACK,
                latency_ms=0.0,
                summary=f"{agent.label} failed and has no rule-based fallback.",
                reads=list(context.view.reads),
                writes=list(context.view.writes),
            )
        outcome = fallback(context)
        outcome.status = AgentStatus.FALLBACK
        return outcome

    # -- composition ----------------------------------------------------------

    def _compose_narrative(self, frame: TelemetryFrame, persona: ExperiencePersona) -> NarrativeEvent:
        draft: NarrativeDraft | None = self.blackboard.read(K_NARRATIVE)
        if draft is None:
            draft = self.generator.build(
                AgentContext(
                    frame=frame,
                    view=BlackboardView(blackboard=self.blackboard),
                    persona=persona,
                )
            )
        analyst = self.blackboard.read(K_ANALYST_CONTEXT) or ""
        casual = self.blackboard.read(K_CASUAL_CONTEXT) or ""
        player_cam = self.blackboard.read(K_PLAYER_CAM_CONTEXT) or ""
        club = self.blackboard.read(K_CLUB_CENTRIC_CONTEXT) or {"homeFrame": "", "awayFrame": ""}
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
                "homeFrame": club.get("homeFrame", ""),
                "awayFrame": club.get("awayFrame", ""),
            },
        )

    def _inflection_event(self, frame: TelemetryFrame) -> MatchEvent | None:
        """Build the discrete event that marks a Tactical Inflection Point."""
        candidates = self.blackboard.read(K_INFLECTION_CANDIDATES) or []
        if not candidates:
            return None
        candidate = candidates[0]
        reason = getattr(candidate, "reason", str(candidate))
        return make_event(
            MatchEventType.INFLECTION,
            frame.matchClock,
            int(frame.matchSeconds * 1000),
            None,
            None,
            None,
            frame.ball.x,
            frame.ball.y,
            f"Tactical Inflection Point: {reason}.",
        )


__all__ = ["AgentSwarm", "FAST_AGENT_DEADLINE", "SwarmResult"]
