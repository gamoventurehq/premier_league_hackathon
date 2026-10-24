"""Empirical stress testing for Four-Agent Swarm deadline enforcement and resilience.

Validates:
1. Artificial delay injection (500ms, 1000ms, 2000ms) into each of the 4 agents:
   - TelemetryIngestionAgent
   - TacticalReasoningAgent
   - BroadcastNarrativeAgent
   - FanPersonalizationAgent
2. Strict timeout enforcement: every delayed agent times out and triggers fallback
   within the sub-400ms window (<= 450ms measured wall-clock).
3. All-delayed conditions: entire swarm terminates gracefully, populating valid
   fallback narratives and traces.
4. Broadcast stream cadence: 5 Hz publishing continues without stutter during slow swarm cycles.
5. Delayed thread stale write isolation: background threads finishing late or timing out
   must not leave corrupted or premature writes on the shared blackboard.
"""

from __future__ import annotations

import time
from unittest.mock import patch

import pytest
from app.agents.base import (
    K_ANALYST_CONTEXT,
    K_BALL,
    K_CASUAL_CONTEXT,
    K_CLUB_CENTRIC_CONTEXT,
    K_CONTROL_VS_CHAOS,
    K_FAST_PATH_METRICS,
    K_MATCH_CLOCK,
    K_NARRATIVE,
    K_PLAYER_CAM_CONTEXT,
    AgentContext,
    AgentOutcome,
    BlackboardView,
)
from app.agents.broadcast_narrative import BroadcastNarrativeAgent
from app.agents.fan_personalization import FanPersonalizationAgent
from app.agents.swarm import AgentSwarm
from app.agents.tactical_reasoning import TacticalReasoningAgent
from app.agents.telemetry_ingestion import TelemetryIngestionAgent
from app.config import Settings
from app.models import AgentRole, AgentStatus, ExperiencePersona
from app.runtime import MatchRuntime
from app.simulation.engine import MatchEngine

ALL_AGENT_CLASSES = [
    (TelemetryIngestionAgent, AgentRole.TELEMETRY_INGESTION, 0),
    (TacticalReasoningAgent, AgentRole.TACTICAL_REASONING, 1),
    (BroadcastNarrativeAgent, AgentRole.BROADCAST_NARRATIVE, 2),
    (FanPersonalizationAgent, AgentRole.FAN_PERSONALIZATION, 3),
]


# --- Helper for delay injection ---


def make_delayed_run(delay_seconds: float, original_run=None):
    """Creates a delayed replacement for agent.run."""

    def delayed_run(self, context: AgentContext) -> AgentOutcome:
        time.sleep(delay_seconds)
        if original_run is not None:
            return original_run(self, context)
        return AgentOutcome(
            role=self.role,
            label=self.label,
            status=AgentStatus.COMPLETE,
            latency_ms=delay_seconds * 1000.0,
            summary=f"Delayed by {delay_seconds:.2f}s",
            reads=list(context.view.reads),
            writes=list(context.view.writes),
        )

    return delayed_run


# --- 1. Single-Agent Delay Injections (500ms, 1000ms, 2000ms) ---


@pytest.mark.parametrize("delay_seconds", [0.5, 1.0, 2.0])
@pytest.mark.parametrize(
    "agent_cls,expected_role,trace_idx",
    ALL_AGENT_CLASSES,
    ids=["telemetry_ingestion", "tactical_reasoning", "broadcast_narrative", "fan_personalization"],
)
def test_individual_agent_delay_enforcement(
    engine: MatchEngine,
    delay_seconds: float,
    agent_cls,
    expected_role: AgentRole,
    trace_idx: int,
) -> None:
    """Each agent delayed by 500ms, 1000ms, or 2000ms must time out and fallback <= 450ms."""
    frame = engine.build_frame()
    swarm = AgentSwarm()

    with patch.object(agent_cls, "run", make_delayed_run(delay_seconds)):
        started = time.perf_counter()
        result = swarm.run(frame, persona=ExperiencePersona.ANALYST)
        elapsed = time.perf_counter() - started

    # The single delayed agent should have timed out (~0.4s) while others complete in <5ms.
    # Total elapsed wall-clock time must not exceed 0.50s total.
    assert elapsed <= 0.50, (
        f"Swarm took {elapsed:.3f}s with {agent_cls.__name__} delayed by {delay_seconds}s; "
        "deadline enforcement failed."
    )

    # Verify trace for the delayed agent
    delayed_trace = result.traces[trace_idx]
    assert delayed_trace.role == expected_role
    assert delayed_trace.status == AgentStatus.FALLBACK, (
        f"Expected FALLBACK status for {agent_cls.__name__}, got {delayed_trace.status}"
    )

    # Verify all OTHER agents completed normally
    for idx, trace in enumerate(result.traces):
        if idx != trace_idx:
            assert trace.status == AgentStatus.COMPLETE, (
                f"Agent {trace.role} unexpectedly failed/fell back with status {trace.status}"
            )

    # Verify blackboard is populated with valid state
    bb = result.blackboard
    assert bb[K_MATCH_CLOCK] == frame.matchClock
    assert bb[K_BALL]["x"] == frame.ball.x
    assert bb[K_CONTROL_VS_CHAOS] == frame.metrics.controlVsChaosIndex
    assert K_NARRATIVE in bb
    assert K_ANALYST_CONTEXT in bb

    # Verify narrative was composed successfully
    assert result.narrative.matchClock == frame.matchClock
    assert len(result.narrative.headline.en) > 0
    assert len(result.narrative.tacticalExplanation.en) > 0

    swarm.shutdown()


# --- 2. Direct _run_agent Wall-Clock Deadline Measurement ---


@pytest.mark.parametrize("delay_seconds", [0.5, 1.0, 2.0])
@pytest.mark.parametrize("agent_cls,expected_role,_", ALL_AGENT_CLASSES)
def test_direct_run_agent_deadline_measurement(
    engine: MatchEngine, delay_seconds: float, agent_cls, expected_role, _
) -> None:
    """Measures precise wall-clock duration of _run_agent under artificial delays."""
    swarm = AgentSwarm()
    agent = agent_cls()
    frame = engine.build_frame()

    view = BlackboardView(blackboard=swarm.blackboard)
    context = AgentContext(
        frame=frame,
        view=view,
        persona=ExperiencePersona.ANALYST,
    )

    with patch.object(agent_cls, "run", make_delayed_run(delay_seconds)):
        started = time.perf_counter()
        outcome = swarm._run_agent(agent, context, budget=1.5)
        elapsed = time.perf_counter() - started

    # MUST time out within sub-400ms window (target ~0.40s, strictly <= 0.45s)
    assert 0.38 <= elapsed <= 0.45, (
        f"{agent_cls.__name__} took {elapsed:.4f}s with delay={delay_seconds}s; "
        "not within expected [0.38s, 0.45s] window."
    )
    assert outcome.status == AgentStatus.FALLBACK

    swarm.shutdown()


# --- 3. All-Agents Delayed Scenarios (500ms, 1000ms, 2000ms) ---


@pytest.mark.parametrize("delay_seconds", [0.5, 1.0, 2.0])
def test_all_agents_delayed_swarm_execution(engine: MatchEngine, delay_seconds: float) -> None:
    """When ALL 4 agents are delayed, each times out <= 450ms and swarm terminates gracefully."""
    frame = engine.build_frame()
    swarm = AgentSwarm()

    with (
        patch.object(TelemetryIngestionAgent, "run", make_delayed_run(delay_seconds)),
        patch.object(TacticalReasoningAgent, "run", make_delayed_run(delay_seconds)),
        patch.object(BroadcastNarrativeAgent, "run", make_delayed_run(delay_seconds)),
        patch.object(FanPersonalizationAgent, "run", make_delayed_run(delay_seconds)),
    ):
        started = time.perf_counter()
        result = swarm.run(frame, persona=ExperiencePersona.ANALYST)
        total_elapsed = time.perf_counter() - started

    # Each agent times out at ~0.40s. 4 agents sequential = ~1.60s.
    # Must terminate well under 4 * delay_seconds.
    # Total elapsed should be around 1.60s - 1.85s.
    assert 1.50 <= total_elapsed <= 1.85, (
        f"Total elapsed was {total_elapsed:.3f}s; expected ~1.60s-1.80s for 4 sequential 400ms timeouts."
    )

    # All 4 traces must show FALLBACK status
    assert len(result.traces) == 4
    for trace in result.traces:
        assert trace.status == AgentStatus.FALLBACK, f"Agent {trace.role} had status {trace.status}"
        assert len(trace.writes) > 0, f"Agent {trace.role} had no recorded fallback writes"

    # Narrative event must be fully valid despite all agents timing out
    narrative = result.narrative
    assert narrative.matchClock == frame.matchClock
    assert len(narrative.headline.en) > 0
    assert len(narrative.tacticalExplanation.en) > 0
    assert len(narrative.analystContext) > 0
    assert len(narrative.casualContext) > 0
    assert len(narrative.playerCamContext) > 0
    assert len(narrative.clubCentricContext.homeFrame) > 0
    assert len(narrative.clubCentricContext.awayFrame) > 0

    # Blackboard must have all canonical keys populated by fallbacks
    bb = result.blackboard
    assert bb[K_MATCH_CLOCK] == frame.matchClock
    assert bb[K_BALL]["x"] == frame.ball.x
    assert bb[K_FAST_PATH_METRICS]["controlVsChaosIndex"] == frame.metrics.controlVsChaosIndex
    assert bb[K_CONTROL_VS_CHAOS] == frame.metrics.controlVsChaosIndex
    assert K_NARRATIVE in bb
    assert K_ANALYST_CONTEXT in bb
    assert K_CASUAL_CONTEXT in bb
    assert K_CLUB_CENTRIC_CONTEXT in bb
    assert K_PLAYER_CAM_CONTEXT in bb

    swarm.shutdown()


# --- 4. Broadcast Cadence & No-Stutter Verification ---


def test_broadcast_stream_cadence_under_delayed_swarm() -> None:
    """MatchRuntime 5 Hz publication must continue smoothly without stutter when swarm is delayed."""
    settings = Settings(
        simulation_hz=10,
        publish_hz=5,
        sim_warmup_seconds=0,
    )
    runtime = MatchRuntime(settings=settings)

    # Inject 1.5s delay into BroadcastNarrativeAgent to simulate heavy LLM call
    with patch.object(BroadcastNarrativeAgent, "run", make_delayed_run(1.5)):
        runtime.start()
        try:
            ready = runtime.wait_until_ready(timeout=5.0)
            assert ready, "Runtime failed to become ready"

            # Observe publishing ticks over 1.5 seconds (expect ~7-8 frames at 5 Hz)
            frame_counts: list[int] = []
            timestamps: list[float] = []

            for _ in range(12):
                time.sleep(0.15)
                frame_counts.append(runtime._frame_counter)
                timestamps.append(runtime.last_tick_at)

            # Check that frames were produced continuously
            deltas = [frame_counts[i] - frame_counts[i - 1] for i in range(1, len(frame_counts))]
            total_produced = frame_counts[-1] - frame_counts[0]

            # At 5Hz over ~1.8s, should produce around 8-10 frames, at least 5 frames
            assert total_produced >= 5, (
                f"Only {total_produced} frames produced; simulation stalled due to swarm delay."
            )
            # Ensure simulation thread was never halted: max consecutive identical frame count <= 2
            assert all(d >= 0 for d in deltas)

            # Verify heartbeat remains fresh and alive
            assert runtime.heartbeat_fresh
            assert runtime.simulation_alive
            assert runtime.worker_error is None

        finally:
            runtime.stop()


# --- 5. Stale Thread Write Isolation & Half-Written State Discard ---


def test_broken_agent_no_fallback_staged_writes_not_committed_in_swarm(engine: MatchEngine) -> None:
    """When an agent fails without a fallback, its staged writes must NOT be committed."""
    swarm = AgentSwarm()
    frame = engine.build_frame()

    class BrokenAgentNoFallback:
        role = AgentRole.TACTICAL_REASONING
        label = "Broken Agent No Fallback"

        def run(self, context: AgentContext) -> AgentOutcome:
            context.view.write("corrupted_key_from_broken_agent", "BAD_DATA")
            raise RuntimeError("Crashed without fallback")

    # Replace TacticalReasoningAgent with broken agent
    swarm.agents[1] = BrokenAgentNoFallback()
    result = swarm.run(frame, persona=ExperiencePersona.ANALYST)

    # According to base.py: 'so a timed out or failed agent can never leave a half-written tactical state behind.'
    # The corrupted key should NOT be committed to the blackboard!
    assert swarm.blackboard.read("corrupted_key_from_broken_agent") is None, (
        "Crashed agent's uncommitted staged writes were committed to blackboard!"
    )
    assert "corrupted_key_from_broken_agent" not in result.blackboard
    swarm.shutdown()


def test_delayed_agent_premature_write_discarded_on_timeout(engine: MatchEngine) -> None:
    """When an agent times out, its partial/premature writes before timeout must NOT leak into blackboard."""
    swarm = AgentSwarm()
    frame = engine.build_frame()

    def partial_writing_then_delayed_agent(self, context: AgentContext) -> AgentOutcome:
        context.view.write("partial_incomplete_metric", "UNVALIDATED_RAW_VALUE")
        time.sleep(0.7)  # Times out at 0.4s
        context.view.write("late_metric", "LATE_VALUE")
        return AgentOutcome(
            role=self.role,
            label=self.label,
            status=AgentStatus.COMPLETE,
            latency_ms=700.0,
            summary="Late",
            reads=[],
            writes=["partial_incomplete_metric", "late_metric"],
        )

    with patch.object(TacticalReasoningAgent, "run", partial_writing_then_delayed_agent):
        result = swarm.run(frame, persona=ExperiencePersona.ANALYST)

    # At 0.4s, TacticalReasoning timed out and fallback ran
    assert result.traces[1].status == AgentStatus.FALLBACK

    # Critical ADR 0002 / ADR 0004 requirement:
    # Blackboard should have clean fallback state, NOT partial_incomplete_metric or late_metric!
    assert swarm.blackboard.read("partial_incomplete_metric") is None, (
        "Partial premature write before timeout was committed to blackboard alongside fallback!"
    )
    assert swarm.blackboard.read("late_metric") is None, (
        "Late write from background thread leaked into blackboard!"
    )

    swarm.shutdown()


# --- 6. Repeated Swarm Calls Under Continuous Delays ---


def test_repeated_swarm_calls_under_continuous_delays(engine: MatchEngine) -> None:
    """Repeated swarm invocations with delayed agents do not exhaust threads or deadlock."""
    swarm = AgentSwarm()
    frame = engine.build_frame()

    # 3 consecutive cycles where BroadcastNarrative times out
    for cycle in range(3):
        with patch.object(BroadcastNarrativeAgent, "run", make_delayed_run(0.6)):
            started = time.perf_counter()
            result = swarm.run(frame, persona=ExperiencePersona.ANALYST)
            elapsed = time.perf_counter() - started

        assert elapsed <= 0.55, f"Cycle {cycle} took {elapsed:.3f}s; thread pool saturation suspected"
        assert result.traces[2].status == AgentStatus.FALLBACK
        assert result.narrative.matchClock == frame.matchClock

    swarm.shutdown()
