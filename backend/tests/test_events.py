"""Tests of the event driven pipeline: the discrete match events, the box
score they produce, the authoritative clock, and the resilience of the agent
swarm when an agent fails (ADR 0004).
"""

from __future__ import annotations

import pytest
from app.agents.broadcast_narrative import BroadcastNarrativeAgent
from app.agents.swarm import AgentSwarm
from app.models import (
    BroadcastLanguage,
    ExperiencePersona,
    MatchEventType,
    SyntheticScenarioType,
    TeamSide,
)
from app.simulation.engine import SCENARIO_ORDER, MatchEngine
from app.simulation.events import EventLog, make_event, new_event_id
from app.simulation.metrics import format_match_clock

from conftest import FULL_MATCH_SECONDS


@pytest.fixture(scope="module")
def full_match() -> MatchEngine:
    """A complete 90 minute match of the default Synthetic Match Scenario."""
    engine = MatchEngine(seed=20260922)
    engine.reset(SyntheticScenarioType.HIGH_POSSESSION, start_seconds=0.0, warmup_seconds=0.0)
    engine.fast_forward(FULL_MATCH_SECONDS, dt=0.2)
    return engine


# --- The event log ------------------------------------------------------------


def test_event_ids_are_unique():
    ids = {new_event_id() for _ in range(100)}
    assert len(ids) == 100


def test_make_event_builds_a_contract_valid_event():
    event = make_event(
        MatchEventType.PASS,
        "12:34",
        754000,
        TeamSide.HOME,
        "h6",
        "h8",
        52.5,
        34.0,
        "A pass into space.",
        pdr=41.2,
        completed=True,
    )
    assert event.type is MatchEventType.PASS
    assert event.matchClock == "12:34"
    assert event.timestampMs == 754000
    assert event.pdr == 41.2
    assert event.completed is True
    assert event.xG is None


def test_the_event_log_keeps_the_whole_match():
    log = EventLog()
    for index in range(10):
        log.append(
            make_event(
                MatchEventType.CARRY,
                f"00:{index:02d}",
                index * 1000,
                TeamSide.HOME,
                "h6",
                None,
                50.0,
                34.0,
                "A carry.",
            )
        )
    assert len(log) == 10
    assert len(log.recent(3)) == 3
    assert log.recent(3)[-1].matchClock == "00:09"


# --- The events of a simulated match ------------------------------------------


def test_the_match_produces_real_match_events(full_match):
    """A simulated match is a stream of passes, duels, shots and turnovers."""
    events = full_match.events.all()
    types = {event.type for event in events}
    assert MatchEventType.PASS in types
    assert MatchEventType.SHOT in types
    assert MatchEventType.TURNOVER in types
    assert len(events) > 500


def test_every_event_carries_a_valid_clock(full_match):
    """The clock of an event is the authoritative match clock at that instant."""
    for event in full_match.events.all():
        minutes, seconds = event.matchClock.split(":")
        assert 0 <= int(seconds) < 60
        assert 0 <= int(minutes) <= 90
        expected = format_match_clock(event.timestampMs / 1000.0)
        assert event.matchClock == expected


def test_every_event_carries_the_score_of_that_moment(full_match):
    """The score stamped on an event is the score when the event happened."""
    for event in full_match.events.all():
        assert event.score is not None
        assert event.score.home >= 0
        assert event.score.away >= 0
    goals = [e for e in full_match.events.all() if e.type is MatchEventType.GOAL]
    for goal in goals:
        assert goal.score is not None


def test_pass_completion_is_inside_the_premier_league_band(full_match):
    """A Premier League fixture completes 75-85% of its passes."""
    frame = full_match.build_frame()
    for side in ("home", "away"):
        completion = getattr(frame.metrics.passCompletion, side)
        assert 75.0 <= completion <= 85.0, completion


def test_the_shot_volume_is_inside_the_premier_league_band(full_match):
    """A Premier League fixture produces 20-30 shots."""
    frame = full_match.build_frame()
    shots = int(frame.metrics.shotCount.home + frame.metrics.shotCount.away)
    assert 20 <= shots <= 30, shots


def test_the_shot_ledger_matches_the_shot_events(full_match):
    """The Shoot Map and the event log describe the same shots."""
    frame = full_match.build_frame()
    shot_events = [e for e in full_match.events.all() if e.type is MatchEventType.SHOT]
    assert len(frame.shots) == len(shot_events)
    for record, event in zip(frame.shots, shot_events, strict=True):
        assert record.playerId == event.actorId
        assert record.team is event.team
        assert record.matchClock == event.matchClock
        assert record.xG == event.xG
        assert record.outcome.value in {"goal", "saved", "missed"}
        assert record.onTarget is True or record.outcome.value == "missed"


def test_the_player_statistics_agree_with_the_event_log(full_match):
    """The Player Spotlight is derived from the same ledger as the events."""
    frame = full_match.build_frame()
    for stats in frame.playerStats:
        assert 0.0 <= stats.rating <= 10.0
        assert stats.passesCompleted <= stats.passesAttempted
        assert stats.distanceMeters >= 0.0
        assert 0.0 <= stats.topSpeedKmH <= 45.0
        assert stats.position


def test_the_possession_changes_hands(full_match):
    """The turnover events really do move the ball from one side to the other."""
    carrier_before = full_match.state.carrier_id
    assert carrier_before
    turnovers = [e for e in full_match.events.all() if e.type is MatchEventType.TURNOVER]
    assert turnovers
    for event in turnovers:
        assert event.team is not None


def test_the_scenarios_are_materially_different():
    """Each Synthetic Match Scenario produces a different shape of match."""
    readings = {}
    for scenario in SCENARIO_ORDER:
        engine = MatchEngine(seed=20260922)
        engine.reset(scenario, start_seconds=0.0, warmup_seconds=0.0)
        engine.fast_forward(45 * 60, dt=0.2)
        frame = engine.build_frame()
        readings[scenario] = (
            round(frame.metrics.possessionShare.home, 1),
            frame.metrics.gameRhythm.value,
            round(frame.metrics.controlVsChaosIndex, 1),
        )
    assert len(set(readings.values())) == 4, readings


# --- The resilience of the agent swarm (ADR 0004) -----------------------------


def test_the_swarm_falls_back_when_an_agent_fails(full_match):
    """A failing agent is replaced by a rule-based fallback (ADR 0004)."""
    frame = full_match.build_frame()
    swarm = AgentSwarm()
    original_run = BroadcastNarrativeAgent.run

    def exploding_run(self, context):  # noqa: ANN001 - the failure is the point
        raise RuntimeError("The narrative model is unavailable.")

    BroadcastNarrativeAgent.run = exploding_run
    try:
        result = swarm.run(frame, ExperiencePersona.ANALYST)
    finally:
        BroadcastNarrativeAgent.run = original_run
        swarm.shutdown()

    trace = next(t for t in result.traces if t.role.value == "broadcast_narrative")
    assert trace.status.value == "fallback"
    assert "fallback" in trace.summary.lower()

    narrative = result.narrative
    for language in BroadcastLanguage:
        assert getattr(narrative.headline, language.value)
        assert getattr(narrative.tacticalExplanation, language.value)
    assert narrative.analystContext
    assert narrative.casualContext
    assert narrative.playerCamContext
    assert narrative.clubCentricContext.homeFrame
    assert narrative.clubCentricContext.awayFrame
    assert narrative.matchClock == frame.matchClock


def test_the_fallback_outcome_is_marked_as_such(full_match):
    """A fallback outcome is never reported as a completed agent run."""
    from app.agents.base import AgentContext, Blackboard, BlackboardView

    frame = full_match.build_frame()
    agent = BroadcastNarrativeAgent()
    context = AgentContext(
        frame=frame,
        view=BlackboardView(blackboard=Blackboard()),
        persona=ExperiencePersona.ANALYST,
    )
    outcome = agent.fallback(context)
    assert outcome.status.value == "fallback"
    assert outcome.latency_ms >= 0.0
    assert outcome.summary
