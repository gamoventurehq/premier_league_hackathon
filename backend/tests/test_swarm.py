"""Comprehensive tests for the Four-Agent Swarm with Tiered Fast-Path Resilience.

Covers:
- Normal 4-agent swarm execution and trace recording.
- Fallback execution for each agent (Telemetry Ingestion, Tactical Reasoning,
  Broadcast Narrative, Fan Personalization).
- Preservation and committing of fallback writes on the shared blackboard and NarrativeEvent.
- Strict sub-400ms deadline enforcement across all agents (including Broadcast Narrative).
- Thread-safe concurrent reads and writes on the Blackboard (RLock).
- Azure AI Foundry model service default timeout <= 0.35s.
- BlackboardView staging and discard semantics.
"""

from __future__ import annotations

import threading
import time
from unittest.mock import patch

from app.agents.base import (
    K_ANALYST_CONTEXT,
    K_BALL,
    K_CASUAL_CONTEXT,
    K_CLUB_CENTRIC_CONTEXT,
    K_CONTROL_VS_CHAOS,
    K_FAST_PATH_METRICS,
    K_GAME_RHYTHM,
    K_MATCH_CLOCK,
    K_MATCH_EVENTS,
    K_MATCH_SECONDS,
    K_NARRATIVE,
    K_PASSING_LANES,
    K_PITCH_CONTROL_AWAY,
    K_PITCH_CONTROL_CONTESTED,
    K_PITCH_CONTROL_HOME,
    K_PLAYER_CAM_CONTEXT,
    K_PLAYER_POSITIONS,
    K_POSSESSION,
    K_SCENARIO,
    K_SCORE,
    K_TACTICAL_PHASE,
    AgentContext,
    AgentOutcome,
    Blackboard,
    BlackboardView,
)
from app.agents.broadcast_narrative import BroadcastNarrativeAgent
from app.agents.fan_personalization import FanPersonalizationAgent
from app.agents.swarm import FAST_AGENT_DEADLINE, AgentSwarm
from app.agents.tactical_reasoning import TacticalReasoningAgent
from app.agents.telemetry_ingestion import TelemetryIngestionAgent
from app.config import Settings
from app.models import AgentRole, AgentStatus, ExperiencePersona
from app.services.foundry import FoundryNarrativeService
from app.simulation.engine import MatchEngine

# --- 1. Normal 4-Agent Swarm Execution ---------------------------------------


def test_normal_4_agent_swarm_execution(engine: MatchEngine) -> None:
    """The four agents run sequentially and commit their findings to the blackboard."""
    frame = engine.build_frame()
    swarm = AgentSwarm()
    result = swarm.run(frame, persona=ExperiencePersona.ANALYST)

    assert len(result.traces) == 4
    expected_roles = [
        AgentRole.TELEMETRY_INGESTION,
        AgentRole.TACTICAL_REASONING,
        AgentRole.BROADCAST_NARRATIVE,
        AgentRole.FAN_PERSONALIZATION,
    ]
    actual_roles = [t.role for t in result.traces]
    assert actual_roles == expected_roles

    for trace in result.traces:
        assert trace.status == AgentStatus.COMPLETE
        assert len(trace.writes) > 0

    # Verify blackboard is populated with canonical keys
    bb = result.blackboard
    assert bb[K_MATCH_CLOCK] == frame.matchClock
    assert bb[K_MATCH_SECONDS] == frame.matchSeconds
    assert bb[K_BALL]["x"] == frame.ball.x
    assert bb[K_CONTROL_VS_CHAOS] == frame.metrics.controlVsChaosIndex
    assert K_NARRATIVE in bb
    assert K_ANALYST_CONTEXT in bb
    assert K_CASUAL_CONTEXT in bb

    # Narrative event composition
    narrative = result.narrative
    assert narrative.matchClock == frame.matchClock
    assert len(narrative.headline.en) > 0
    assert len(narrative.tacticalExplanation.en) > 0
    assert len(narrative.analystContext) > 0


# --- 2. Telemetry Ingestion Fallback -----------------------------------------


def test_telemetry_ingestion_fallback_direct(engine: MatchEngine) -> None:
    """Direct execution of TelemetryIngestionAgent.fallback produces canonical keys."""
    frame = engine.build_frame()
    blackboard = Blackboard()
    view = BlackboardView(blackboard=blackboard)
    context = AgentContext(frame=frame, view=view, persona=ExperiencePersona.ANALYST)

    agent = TelemetryIngestionAgent()
    outcome = agent.fallback(context)

    assert outcome.role == AgentRole.TELEMETRY_INGESTION
    assert outcome.status == AgentStatus.FALLBACK
    assert outcome.latency_ms >= 0.0

    # Ensure all canonical telemetry keys were written to view
    assert view.read(K_MATCH_CLOCK) == frame.matchClock
    assert view.read(K_MATCH_SECONDS) == frame.matchSeconds
    assert view.read(K_SCENARIO) == frame.scenario.value
    assert view.read(K_SCORE) == {"home": frame.score.home, "away": frame.score.away}
    assert view.read(K_BALL)["x"] == frame.ball.x
    assert view.read(K_BALL)["y"] == frame.ball.y
    assert len(view.read(K_PLAYER_POSITIONS)) == len(frame.players)
    assert view.read(K_POSSESSION)["share"]["home"] == frame.metrics.possessionShare.home
    assert view.read(K_PITCH_CONTROL_HOME) == frame.metrics.pitchControl.home
    assert view.read(K_PITCH_CONTROL_AWAY) == frame.metrics.pitchControl.away
    assert view.read(K_PITCH_CONTROL_CONTESTED) == frame.metrics.pitchControl.contested
    assert len(view.read(K_PASSING_LANES)) == len(frame.passingLanes)
    assert len(view.read(K_MATCH_EVENTS)) == len(frame.events)
    assert view.read(K_FAST_PATH_METRICS)["controlVsChaosIndex"] == frame.metrics.controlVsChaosIndex


def test_telemetry_ingestion_fallback_in_swarm(engine: MatchEngine) -> None:
    """When TelemetryIngestion fails, fallback runs and commits to blackboard."""
    frame = engine.build_frame()
    swarm = AgentSwarm()

    with patch.object(
        TelemetryIngestionAgent, "run", side_effect=RuntimeError("Simulated transport parsing error")
    ):
        result = swarm.run(frame, persona=ExperiencePersona.ANALYST)

    ingestion_trace = result.traces[0]
    assert ingestion_trace.role == AgentRole.TELEMETRY_INGESTION
    assert ingestion_trace.status == AgentStatus.FALLBACK

    # Fallback writes MUST be committed to blackboard
    bb = result.blackboard
    assert bb[K_MATCH_CLOCK] == frame.matchClock
    assert bb[K_BALL]["x"] == frame.ball.x
    assert bb[K_FAST_PATH_METRICS]["controlVsChaosIndex"] == frame.metrics.controlVsChaosIndex


# --- 3. Tactical Reasoning Fallback ------------------------------------------


def test_tactical_reasoning_fallback_in_swarm(engine: MatchEngine) -> None:
    """When Tactical Reasoning fails, fallback writes rule-based metrics to blackboard."""
    frame = engine.build_frame()
    swarm = AgentSwarm()

    with patch.object(
        TacticalReasoningAgent, "run", side_effect=ValueError("Simulated tactical calculation crash")
    ):
        result = swarm.run(frame, persona=ExperiencePersona.ANALYST)

    tactical_trace = result.traces[1]
    assert tactical_trace.role == AgentRole.TACTICAL_REASONING
    assert tactical_trace.status == AgentStatus.FALLBACK

    bb = result.blackboard
    assert bb[K_CONTROL_VS_CHAOS] == frame.metrics.controlVsChaosIndex
    assert bb[K_GAME_RHYTHM] == frame.metrics.gameRhythm.value
    assert bb[K_TACTICAL_PHASE] == "progression"


# --- 4. Broadcast Narrative Fallback -----------------------------------------


def test_broadcast_narrative_fallback_in_swarm(engine: MatchEngine) -> None:
    """When Broadcast Narrative fails, fallback writes multilingual narrative draft."""
    frame = engine.build_frame()
    swarm = AgentSwarm()

    with patch.object(BroadcastNarrativeAgent, "run", side_effect=TimeoutError("Simulated LLM call failure")):
        result = swarm.run(frame, persona=ExperiencePersona.ANALYST)

    narrative_trace = result.traces[2]
    assert narrative_trace.role == AgentRole.BROADCAST_NARRATIVE
    assert narrative_trace.status == AgentStatus.FALLBACK

    bb = result.blackboard
    assert K_NARRATIVE in bb
    assert result.narrative.matchClock == frame.matchClock
    assert len(result.narrative.headline.en) > 0


# --- 5. Fan Personalization Fallback -----------------------------------------


def test_fan_personalization_fallback_in_swarm(engine: MatchEngine) -> None:
    """When Fan Personalization fails, fallback writes all four persona contexts."""
    frame = engine.build_frame()
    swarm = AgentSwarm()

    with patch.object(
        FanPersonalizationAgent, "run", side_effect=KeyError("Simulated persona projection failure")
    ):
        result = swarm.run(frame, persona=ExperiencePersona.ANALYST)

    fan_trace = result.traces[3]
    assert fan_trace.role == AgentRole.FAN_PERSONALIZATION
    assert fan_trace.status == AgentStatus.FALLBACK

    bb = result.blackboard
    assert K_ANALYST_CONTEXT in bb
    assert K_CASUAL_CONTEXT in bb
    assert K_CLUB_CENTRIC_CONTEXT in bb
    assert K_PLAYER_CAM_CONTEXT in bb

    assert len(result.narrative.analystContext) > 0
    assert len(result.narrative.casualContext) > 0


# --- 6. Preservation of Fallback Writes (Commit on COMPLETE and FALLBACK) ----


def test_all_agents_fallback_preserves_blackboard_and_narrative(engine: MatchEngine) -> None:
    """When ALL agents encounter exceptions, all fallbacks execute and commit to blackboard."""
    frame = engine.build_frame()
    swarm = AgentSwarm()

    with (
        patch.object(TelemetryIngestionAgent, "run", side_effect=Exception("F1")),
        patch.object(TacticalReasoningAgent, "run", side_effect=Exception("F2")),
        patch.object(BroadcastNarrativeAgent, "run", side_effect=Exception("F3")),
        patch.object(FanPersonalizationAgent, "run", side_effect=Exception("F4")),
    ):
        result = swarm.run(frame, persona=ExperiencePersona.ANALYST)

    assert len(result.traces) == 4
    for trace in result.traces:
        assert trace.status == AgentStatus.FALLBACK

    # Critical requirement: fallback writes are committed, NOT discarded
    bb = result.blackboard
    assert bb[K_MATCH_CLOCK] == frame.matchClock
    assert bb[K_BALL]["x"] == frame.ball.x
    assert bb[K_CONTROL_VS_CHAOS] == frame.metrics.controlVsChaosIndex
    assert K_NARRATIVE in bb
    assert K_ANALYST_CONTEXT in bb
    assert K_CASUAL_CONTEXT in bb

    # Narrative event has populated contexts from fallback
    assert result.narrative.matchClock == frame.matchClock
    assert len(result.narrative.headline.en) > 0
    assert len(result.narrative.analystContext) > 0
    assert len(result.narrative.casualContext) > 0


# --- 7. Strict Sub-400ms Deadline Enforcement --------------------------------


def test_sub_400ms_deadline_enforced_across_all_agents(engine: MatchEngine) -> None:
    """Agents must not exceed 400ms deadline; slow agents time out and trigger fallback."""
    frame = engine.build_frame()
    swarm = AgentSwarm()

    assert FAST_AGENT_DEADLINE <= 0.4

    # Test that Broadcast Narrative is also subject to the sub-400ms deadline (no exemption)
    def slow_narrative_run(context: AgentContext) -> AgentOutcome:
        time.sleep(0.7)  # Well above 400ms
        return AgentOutcome(
            role=AgentRole.BROADCAST_NARRATIVE,
            label="Slow Narrative",
            status=AgentStatus.COMPLETE,
            latency_ms=700.0,
            summary="Too slow",
        )

    with patch.object(BroadcastNarrativeAgent, "run", side_effect=slow_narrative_run):
        started = time.perf_counter()
        result = swarm.run(frame, persona=ExperiencePersona.ANALYST)
        elapsed = time.perf_counter() - started

    narrative_trace = result.traces[2]
    assert narrative_trace.role == AgentRole.BROADCAST_NARRATIVE
    assert narrative_trace.status == AgentStatus.FALLBACK
    # Entire swarm should finish well under budget, narrative timed out near 0.4s
    assert elapsed < 0.65, f"Swarm took {elapsed:.3f}s; deadline was not strictly enforced"


def test_agent_run_direct_timeout_enforcement() -> None:
    """_run_agent enforces min(FAST_AGENT_DEADLINE, budget) <= 0.4s."""
    swarm = AgentSwarm()

    class SlowAgent:
        role = AgentRole.BROADCAST_NARRATIVE
        label = "Slow Agent"

        def run(self, context: AgentContext) -> AgentOutcome:
            time.sleep(1.0)
            return AgentOutcome(
                role=self.role,
                label=self.label,
                status=AgentStatus.COMPLETE,
                latency_ms=1000.0,
                summary="Late",
                reads=list(context.view.reads),
                writes=list(context.view.writes),
            )

        def fallback(self, context: AgentContext) -> AgentOutcome:
            return AgentOutcome(
                role=self.role,
                label=self.label,
                status=AgentStatus.FALLBACK,
                latency_ms=1.0,
                summary="Fallback on timeout",
                reads=list(context.view.reads),
                writes=list(context.view.writes),
            )

    view = BlackboardView(blackboard=Blackboard())
    context = AgentContext(
        frame=None,  # type: ignore[arg-type]
        view=view,
        persona=ExperiencePersona.ANALYST,
    )

    started = time.perf_counter()
    outcome = swarm._run_agent(SlowAgent(), context, budget=2.0)
    elapsed = time.perf_counter() - started

    assert outcome.status == AgentStatus.FALLBACK
    assert 0.35 <= elapsed <= 0.55, f"Elapsed time was {elapsed:.3f}s; expected ~0.4s timeout"


# --- 8. Azure AI Foundry Timeout Configuration ------------------------------


def test_foundry_service_default_timeout() -> None:
    """FoundryNarrativeService default timeout is <= 0.35s to respect the 400ms deadline."""
    settings = Settings()
    service = FoundryNarrativeService(settings)
    assert service._timeout <= 0.35
    assert service._timeout == 0.35


# --- 9. Blackboard Thread Safety & Concurrency ------------------------------


def test_blackboard_thread_safety_concurrency() -> None:
    """Blackboard operations are protected by RLock against concurrent races."""
    blackboard = Blackboard()
    num_writers = 8
    num_readers = 8
    operations_per_thread = 250
    errors: list[Exception] = []

    def writer(thread_id: int) -> None:
        try:
            for i in range(operations_per_thread):
                key = f"key_{thread_id}_{i % 10}"
                blackboard.write(key, {"value": i, "thread": thread_id})
                if i % 25 == 0:
                    blackboard.has(key)
        except Exception as e:
            errors.append(e)

    def reader() -> None:
        try:
            for _ in range(operations_per_thread):
                # Snapshot copies dict while other threads may write
                snap = blackboard.snapshot()
                assert isinstance(snap, dict)
                # Read specific keys
                _ = blackboard.read("key_0_0")
                _ = blackboard.version
        except Exception as e:
            errors.append(e)

    threads: list[threading.Thread] = []
    for t_id in range(num_writers):
        threads.append(threading.Thread(target=writer, args=(t_id,)))
    for _ in range(num_readers):
        threads.append(threading.Thread(target=reader))

    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=5.0)

    assert len(errors) == 0, f"Thread safety errors occurred: {errors}"
    assert blackboard.version == num_writers * operations_per_thread


def test_blackboard_view_discard_on_unhandled_failure_without_fallback(engine: MatchEngine) -> None:
    """When an agent fails and has NO fallback, its staged writes are discarded via swarm.run()."""
    frame = engine.build_frame()
    swarm = AgentSwarm()

    class BrokenAgentNoFallback:
        role = AgentRole.TACTICAL_REASONING
        label = "Broken Agent"

        def run(self, context: AgentContext) -> AgentOutcome:
            context.view.write("corrupted_key", "bad_state")
            raise RuntimeError("Crashed without fallback")

    swarm.agents[1] = BrokenAgentNoFallback()
    result = swarm.run(frame, persona=ExperiencePersona.ANALYST)

    assert result.traces[1].role == AgentRole.TACTICAL_REASONING
    assert result.traces[1].status != AgentStatus.COMPLETE
    # The corrupted key must NOT be present in the committed blackboard state!
    assert swarm.blackboard.read("corrupted_key") is None
    assert "corrupted_key" not in result.blackboard
    swarm.shutdown()
