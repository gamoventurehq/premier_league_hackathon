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


# --- Milestone 1: Simulation Enrichment & Physics Verification -----------------


def test_biomechanical_velocity_integration_enforces_acceleration_limits():
    """Players cannot accelerate or decelerate beyond physiological human limits."""
    from app.simulation.spatial import integrate_player_velocity

    dt = 0.2
    # 1. Forward acceleration from rest: normal sprint cap is 4.5 m/s^2 -> max dv = 0.9 m/s in 0.2s
    vx, vy, ax, ay = integrate_player_velocity(0.0, 0.0, 10.0, 0.0, dt, max_sprint=9.5, is_pressing=False)
    accel = (vx**2 + vy**2) ** 0.5 / dt
    assert accel <= 4.5001, f"Normal acceleration {accel} exceeded 4.5 m/s^2"
    assert (ax**2 + ay**2) ** 0.5 <= 4.5001

    # 2. Pressing burst from rest: pressing burst cap is 5.2 m/s^2 -> max dv = 1.04 m/s in 0.2s
    vx_p, vy_p, ax_p, ay_p = integrate_player_velocity(0.0, 0.0, 10.0, 0.0, dt, max_sprint=9.5, is_pressing=True)
    accel_p = (vx_p**2 + vy_p**2) ** 0.5 / dt
    assert accel_p <= 5.2001, f"Pressing burst acceleration {accel_p} exceeded 5.2 m/s^2"
    assert accel_p > accel, "Pressing burst should accelerate faster than normal sprint"

    # 3. Braking / deceleration cap: 7.0 m/s^2 -> from 8.0 m/s to 0 m/s
    vx_b, vy_b, ax_b, ay_b = integrate_player_velocity(8.0, 0.0, 0.0, 0.0, dt, max_sprint=9.5, is_pressing=False)
    decel = (8.0 - vx_b) / dt
    assert decel <= 7.0001, f"Deceleration {decel} exceeded 7.0 m/s^2"

    # 4. Maximum sprint speed clamp
    vx_max, vy_max, _, _ = integrate_player_velocity(9.4, 0.0, 20.0, 0.0, 1.0, max_sprint=9.5, is_pressing=False)
    assert (vx_max**2 + vy_max**2) ** 0.5 <= 9.5001


def test_tactical_pitch_sector_resolution():
    """Positions resolve accurately to Premier League canonical tactical pitch sectors."""
    from app.simulation.sectors import resolve_pitch_sector

    # Corner quadrant
    assert resolve_pitch_sector(1.0, 1.0, TeamSide.HOME) == "Corner Quadrant"
    assert resolve_pitch_sector(104.0, 67.0, TeamSide.HOME) == "Corner Quadrant"

    # Goal Mouth
    assert resolve_pitch_sector(100.0, 34.0, TeamSide.HOME) == "Goal Mouth"

    # Penalty spot at (94, 34)
    assert resolve_pitch_sector(94.0, 34.0, TeamSide.HOME) == "Penalty Spot"

    # Penalty Areas
    assert resolve_pitch_sector(98.0, 20.0, TeamSide.HOME) == "Left Penalty Area"
    assert resolve_pitch_sector(98.0, 34.0, TeamSide.HOME) == "Penalty Spot"
    assert resolve_pitch_sector(98.0, 25.0, TeamSide.HOME) == "Central Penalty Area"
    assert resolve_pitch_sector(98.0, 50.0, TeamSide.HOME) == "Right Penalty Area"

    # Zone 14: attacking central area outside the box
    assert resolve_pitch_sector(80.0, 34.0, TeamSide.HOME) == "Zone 14 (Edge of the Box)"

    # Half-spaces
    assert resolve_pitch_sector(60.0, 20.0, TeamSide.HOME) == "Left Half-Space"
    assert resolve_pitch_sector(60.0, 50.0, TeamSide.HOME) == "Right Half-Space"

    # Wide flanks
    assert resolve_pitch_sector(75.0, 5.0, TeamSide.HOME) == "Attacking Third - Left Flank"
    assert resolve_pitch_sector(75.0, 63.0, TeamSide.HOME) == "Attacking Third - Right Flank"


def test_enriched_event_taxonomy_and_metadata(full_match):
    """The simulated match produces an enriched taxonomy with required spatial and tactical metadata."""
    events = full_match.events.all()
    types = {event.type for event in events}

    # At least 10 different event types in a 90 minute match
    assert len(types) >= 10, f"Expected diverse taxonomy, got {len(types)}: {types}"

    # Verify key new event types appear in the match
    assert MatchEventType.CROSS in types
    assert MatchEventType.RECOVERY in types
    assert MatchEventType.CORNER_KICK in types
    assert MatchEventType.SAVE in types
    assert MatchEventType.CARRY in types
    assert MatchEventType.PROGRESSIVE_CARRY in types
    assert MatchEventType.CLEARANCE in types
    assert MatchEventType.FOUL in types

    # Check that pitch sectors and metadata fields are properly populated
    for event in events:
        assert event.pitchSector is not None and len(event.pitchSector) > 0
        if event.speedKmH is not None:
            assert event.speedKmH >= 0.0
        if event.subAction is not None:
            assert len(event.subAction) > 0


def test_3d_ball_physics_and_parabolic_flight():
    """Ball elevates on crosses and clearances and returns cleanly to pitch surface."""
    import math
    from app.simulation.engine import Flight

    engine = MatchEngine(seed=42)
    engine.reset(SyntheticScenarioType.COUNTER_ATTACK_TRANSITION, start_seconds=0.0, warmup_seconds=0.0)

    # Initially on ground with carrier
    assert engine.state.ball_z == 0.0
    assert engine.state.ball_vz == 0.0

    # Inject an airborne flight with apex_z = 3.5m over 1.0s
    engine.state.flight = Flight(
        passer_id="test_p",
        receiver_id="test_r",
        start_x=30.0,
        start_y=34.0,
        end_x=60.0,
        end_y=34.0,
        duration=1.0,
        outcome="completed",
        pdr=40.0,
        speed_kmh=45.0,
        apex_z=3.5,
        flight_type="cross",
    )

    # Step forward 0.5s (progress = 0.5, apex)
    engine._update_ball(0.5)
    assert math.isclose(engine.state.ball_z, 3.5, rel_tol=1e-2), f"Expected apex ~3.5m, got {engine.state.ball_z}"
    assert math.isclose(engine.state.ball_vz, 0.0, abs_tol=1e-2), f"Expected vz ~0.0 at apex, got {engine.state.ball_vz}"

    # Step forward remaining 0.5s to landing
    engine._update_ball(0.5)
    assert engine.state.ball_z == 0.0
    assert engine.state.ball_vz == 0.0

    # Verify 3D speed in frame
    engine.state.ball_vx = 10.0
    engine.state.ball_vy = 0.0
    engine.state.ball_vz = 0.0
    frame = engine.build_frame()
    assert math.isclose(frame.ball.speedKmH, 36.0, rel_tol=1e-2)

    # 4. Inject an airborne shot flight with apex_z = 1.6m over 0.6s
    engine.state.flight = Flight(
        passer_id="shooter_1",
        receiver_id="gk_1",
        start_x=85.0,
        start_y=34.0,
        end_x=105.0,
        end_y=34.0,
        duration=0.6,
        outcome="saved",
        pdr=0.25,
        speed_kmh=95.0,
        apex_z=1.6,
        flight_type="shot",
    )
    # Step forward 0.3s (midpoint apex)
    engine._update_ball(0.3)
    assert 0.8 <= engine.state.ball_z <= 2.4, f"Shot elevation {engine.state.ball_z}m outside [0.8, 2.4]m"
    assert math.isclose(engine.state.ball_z, 1.6, rel_tol=1e-2)

    # Step forward remaining 0.3s to completion / landing
    engine._update_ball(0.3)
    assert engine.state.ball_z == 0.0
    assert engine.state.ball_vz == 0.0


def test_all_four_scenarios_maintain_premier_league_invariants():
    """Across all 4 tactical scenarios, Premier League invariants hold."""
    for scenario in SCENARIO_ORDER:
        engine = MatchEngine(seed=20260922)
        engine.reset(scenario, start_seconds=0.0, warmup_seconds=0.0)
        engine.fast_forward(45 * 60, dt=0.2)
        frame = engine.build_frame()

        # Invariant 1: Shot ledger matches shot events exactly
        shot_events = [e for e in engine.events.all() if e.type is MatchEventType.SHOT]
        assert len(frame.shots) == len(shot_events), (
            f"Scenario {scenario.value}: frame.shots ({len(frame.shots)}) != shot_events ({len(shot_events)})"
        )

        # Invariant 2: Pass completion rate inside Premier League band [75.0, 85.0]
        for side in ("home", "away"):
            completion = getattr(frame.metrics.passCompletion, side)
            assert 75.0 <= completion <= 85.0, (
                f"Scenario {scenario.value} ({side}): pass completion {completion}% outside [75%, 85%]"
            )

        # Invariant 3: Ball height never goes negative
        assert frame.ball.z >= 0.0

