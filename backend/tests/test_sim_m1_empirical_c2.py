"""Empirical stress tests for Milestone 1 Backend Simulation & Physics Engine Enrichment.

Authored by Challenger Sim M1 2.
Evaluates:
1. All 4 tactical scenarios for 45m and 90m (Shot ledger invariant len(frame.shots) == len(shot_events), PL pass completion band [75.0, 85.0]).
2. Pitch sector resolution across 10,000 random coordinates, pitch boundaries, and landmark classifications.
3. Blackboard synchronization of ball z and vz in telemetry ingestion (normal and fallback paths).
"""

from __future__ import annotations

import math
import random
import pytest

from app.models import (
    BallTelemetry,
    ExperiencePersona,
    MatchEvent,
    MatchEventType,
    SyntheticScenarioType,
    TeamSide,
    TelemetryFrame,
)
from app.simulation.engine import SCENARIO_ORDER, MatchEngine
from app.simulation.sectors import resolve_pitch_sector
from app.agents.base import K_BALL, AgentContext, Blackboard, BlackboardView
from app.agents.telemetry_ingestion import TelemetryIngestionAgent


def test_empirical_four_scenarios_shot_ledger_and_pass_completion_45m_and_90m():
    """Verify invariant len(frame.shots) == len(shot_events) and pass completion in [75%, 85%]."""
    results = []
    for scenario in SCENARIO_ORDER:
        for minutes in (45, 90):
            engine = MatchEngine(seed=20260922)
            engine.reset(scenario, start_seconds=0.0, warmup_seconds=0.0)
            engine.fast_forward(minutes * 60, dt=0.2)
            frame = engine.build_frame()

            shot_events = [e for e in engine.events.all() if e.type is MatchEventType.SHOT]

            # Invariant 1: Shot ledger matches shot events exactly
            assert len(frame.shots) == len(shot_events), (
                f"{scenario.value} ({minutes}m): len(frame.shots)={len(frame.shots)} != "
                f"len(shot_events)={len(shot_events)}"
            )

            # Invariant 2: Pass completion stays within [75.0, 85.0]
            home_comp = frame.metrics.passCompletion.home
            away_comp = frame.metrics.passCompletion.away
            assert 75.0 <= home_comp <= 85.0, (
                f"{scenario.value} ({minutes}m): Home pass completion {home_comp}% outside [75%, 85%]"
            )
            assert 75.0 <= away_comp <= 85.0, (
                f"{scenario.value} ({minutes}m): Away pass completion {away_comp}% outside [75%, 85%]"
            )

            # Invariant 3: Ball elevation physics invariant (z >= 0)
            assert frame.ball.z >= 0.0

            results.append({
                "scenario": scenario.value,
                "minutes": minutes,
                "home_pass_pct": home_comp,
                "away_pass_pct": away_comp,
                "frame_shots": len(frame.shots),
                "event_shots": len(shot_events),
            })

    assert len(results) == 8


def test_empirical_pitch_sector_resolution_10000_points_and_boundaries():
    """Verify resolve_pitch_sector returns a non-empty string for 10,000 points and boundaries."""
    rng = random.Random(42)

    # 1. 10,000 random points across [0, 105] x [0, 68]
    for _ in range(10_000):
        x = rng.uniform(0.0, 105.0)
        y = rng.uniform(0.0, 68.0)
        for team in (None, TeamSide.HOME, TeamSide.AWAY):
            sector = resolve_pitch_sector(x, y, team)
            assert isinstance(sector, str) and len(sector) > 0, (
                f"Empty or non-string sector at ({x}, {y}, team={team})"
            )

    # 2. Boundary points and extreme corners
    boundary_points = [
        (0.0, 0.0), (105.0, 0.0), (0.0, 68.0), (105.0, 68.0),  # 4 corners
        (52.5, 34.0),                                            # Center spot
        (52.5, 0.0), (52.5, 68.0),                              # Touchline center
        (0.0, 34.0), (105.0, 34.0),                              # Goal line center
        (11.0, 34.0), (94.0, 34.0),                              # Penalty spots
        (5.5, 34.0), (99.5, 34.0),                              # 6-yard boundaries
        (16.5, 34.0), (88.5, 34.0),                              # 18-yard boundaries
        (-1.0, -1.0), (106.0, 69.0),                             # Out of bounds fallback
    ]

    for x, y in boundary_points:
        for team in (None, TeamSide.HOME, TeamSide.AWAY):
            sector = resolve_pitch_sector(x, y, team)
            assert isinstance(sector, str) and len(sector) > 0, (
                f"Boundary failure at ({x}, {y}, team={team})"
            )


def test_empirical_pitch_sector_landmarks():
    """Verify key tactical landmarks are accurately classified."""
    # Penalty spots
    assert resolve_pitch_sector(11.0, 34.0) == "Penalty Spot"
    assert resolve_pitch_sector(94.0, 34.0) == "Penalty Spot"
    assert resolve_pitch_sector(12.0, 35.0) == "Penalty Spot"  # Within 4m radius

    # Goal Mouth / 6-yard box
    assert resolve_pitch_sector(2.0, 34.0) == "Goal Mouth"
    assert resolve_pitch_sector(103.0, 34.0) == "Goal Mouth"
    assert resolve_pitch_sector(4.0, 30.0) == "Goal Mouth"

    # Deep Defensive Corridor
    assert resolve_pitch_sector(20.0, 34.0) == "Deep Defensive Corridor"
    assert resolve_pitch_sector(85.0, 34.0) == "Deep Defensive Corridor"

    # Zone 14 (Edge of the Box)
    assert resolve_pitch_sector(25.0, 34.0) == "Zone 14 (Edge of the Box)"
    assert resolve_pitch_sector(80.0, 34.0) == "Zone 14 (Edge of the Box)"

    # Half-Spaces
    # Left Half-Space (y in [13.6, 27.2])
    assert resolve_pitch_sector(50.0, 20.0) == "Left Half-Space"
    assert resolve_pitch_sector(80.0, 20.0) == "Left Half-Space"
    # Right Half-Space (y in [40.8, 54.4])
    assert resolve_pitch_sector(50.0, 48.0) == "Right Half-Space"
    assert resolve_pitch_sector(80.0, 48.0) == "Right Half-Space"

    # Corner Quadrants
    assert resolve_pitch_sector(1.0, 1.0) == "Corner Quadrant"
    assert resolve_pitch_sector(104.0, 1.0) == "Corner Quadrant"
    assert resolve_pitch_sector(1.0, 67.0) == "Corner Quadrant"
    assert resolve_pitch_sector(104.0, 67.0) == "Corner Quadrant"


def test_empirical_telemetry_ingestion_blackboard_z_and_vz_sync():
    """Verify K_BALL receives z and vz on the standard ingestion path."""
    engine = MatchEngine(seed=42)
    engine.reset(SyntheticScenarioType.HIGH_POSSESSION, 0.0, 0.0)
    # Set ball 3D coordinates
    engine.state.ball_z = 3.25
    engine.state.ball_vz = -1.45
    frame = engine.build_frame()

    agent = TelemetryIngestionAgent()
    board = Blackboard()
    view = BlackboardView(blackboard=board)
    context = AgentContext(frame=frame, view=view, persona=ExperiencePersona.ANALYST)
    outcome = agent.run(context)

    assert outcome.status.value == "complete"
    ball_data = view.read(K_BALL)
    assert ball_data is not None
    assert ball_data["z"] == frame.ball.z == 3.25
    assert ball_data["vz"] == frame.ball.vz == -1.45


def test_empirical_telemetry_ingestion_fallback_z_and_vz_sync():
    """Verify K_BALL receives z and vz on the fallback ingestion path."""
    engine = MatchEngine(seed=42)
    engine.reset(SyntheticScenarioType.COUNTER_ATTACK_TRANSITION, 0.0, 0.0)
    engine.state.ball_z = 2.10
    engine.state.ball_vz = 4.20
    frame = engine.build_frame()

    agent = TelemetryIngestionAgent()
    board = Blackboard()
    view = BlackboardView(blackboard=board)
    context = AgentContext(frame=frame, view=view, persona=ExperiencePersona.ANALYST)
    outcome = agent.fallback(context)

    assert outcome.status.value == "fallback"
    ball_data = view.read(K_BALL)
    assert ball_data is not None
    assert ball_data["z"] == frame.ball.z == 2.10
    assert ball_data["vz"] == frame.ball.vz == 4.20
