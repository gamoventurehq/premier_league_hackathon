#!/usr/bin/env python3
"""Standalone Empirical Stress Harness for Milestone 1: Backend Simulation & Physics Engine Enrichment.
Author: Challenger Sim M1 2
"""

from __future__ import annotations

import math
import random
import sys
import time

from app.agents.base import K_BALL, AgentContext, Blackboard, BlackboardView
from app.agents.telemetry_ingestion import TelemetryIngestionAgent
from app.models import (
    ExperiencePersona,
    MatchEventType,
    SyntheticScenarioType,
    TeamSide,
)
from app.simulation.engine import SCENARIO_ORDER, MatchEngine
from app.simulation.sectors import resolve_pitch_sector


def run_scenario_stress_suite():
    print("=" * 80)
    print("1. EMPIRICAL SCENARIO STRESS TEST (45m & 90m)")
    print("=" * 80)
    print(f"{'Scenario':<28} {'Time':<5} {'Home Pass%':<12} {'Away Pass%':<12} {'PL Band?':<10} {'F.Shots':<8} {'E.Shots':<8} {'Invariant?':<10}")
    print("-" * 100)

    all_invariants_pass = True
    all_bands_pass = True
    rows = []

    for scenario in SCENARIO_ORDER:
        for minutes in (45, 90):
            t0 = time.perf_counter()
            engine = MatchEngine(seed=20260922)
            engine.reset(scenario, start_seconds=0.0, warmup_seconds=0.0)
            engine.fast_forward(minutes * 60, dt=0.2)
            frame = engine.build_frame()
            elapsed = time.perf_counter() - t0

            shot_events = [e for e in engine.events.all() if e.type is MatchEventType.SHOT]
            shots_match = len(frame.shots) == len(shot_events)
            if not shots_match:
                all_invariants_pass = False

            home_comp = frame.metrics.passCompletion.home
            away_comp = frame.metrics.passCompletion.away
            band_match = (75.0 <= home_comp <= 85.0) and (75.0 <= away_comp <= 85.0)
            if not band_match:
                all_bands_pass = False

            z_valid = frame.ball.z >= 0.0

            rows.append({
                "scenario": scenario.value,
                "minutes": f"{minutes}m",
                "home_pass": f"{home_comp:.2f}%",
                "away_pass": f"{away_comp:.2f}%",
                "band_match": "PASS" if band_match else "FAIL",
                "frame_shots": len(frame.shots),
                "event_shots": len(shot_events),
                "shots_match": "PASS" if shots_match else "FAIL",
                "z_valid": z_valid,
                "elapsed": f"{elapsed:.2f}s",
            })

            print(f"{scenario.value:<28} {minutes}m   {home_comp:>6.2f}%      {away_comp:>6.2f}%      {'PASS' if band_match else 'FAIL':<10} {len(frame.shots):<8} {len(shot_events):<8} {'PASS' if shots_match else 'FAIL':<10}")

    print("-" * 100)
    print(f"Overall Scenario Invariant Status: {'PASS (100% adherence)' if all_invariants_pass else 'FAIL'}")
    print(f"Overall Pass Completion Band:      {'PASS (All inside [75.0%, 85.0%])' if all_bands_pass else 'FAIL'}\n")
    return all_invariants_pass and all_bands_pass, rows


def run_pitch_sector_stress_suite():
    print("=" * 80)
    print("2. PITCH SECTOR RESOLUTION EMPIRICAL SUITE (10,000 Points & Boundaries)")
    print("=" * 80)
    rng = random.Random(1337)
    total_samples = 10_000
    valid_count = 0

    t0 = time.perf_counter()
    for _ in range(total_samples):
        x = rng.uniform(0.0, 105.0)
        y = rng.uniform(0.0, 68.0)
        for team in (None, TeamSide.HOME, TeamSide.AWAY):
            sector = resolve_pitch_sector(x, y, team)
            if isinstance(sector, str) and len(sector) > 0:
                valid_count += 1
            else:
                print(f"FAILED sector resolution at ({x}, {y})")

    elapsed_mc = time.perf_counter() - t0
    total_evals = total_samples * 3
    print(f"Evaluated {total_evals} pitch coordinates in {elapsed_mc:.3f}s.")
    print(f"Resolution Success Rate: {valid_count}/{total_evals} ({(valid_count / total_evals) * 100.0:.2f}%)")

    # Boundary edge points
    boundaries = [
        (0.0, 0.0), (105.0, 0.0), (0.0, 68.0), (105.0, 68.0),
        (52.5, 34.0), (52.5, 0.0), (52.5, 68.0), (0.0, 34.0), (105.0, 34.0),
        (11.0, 34.0), (94.0, 34.0), (5.5, 34.0), (99.5, 34.0), (16.5, 34.0), (88.5, 34.0),
        (-0.5, -0.5), (105.5, 68.5),
    ]
    boundary_pass = True
    for x, y in boundaries:
        for team in (None, TeamSide.HOME, TeamSide.AWAY):
            sec = resolve_pitch_sector(x, y, team)
            if not sec or not isinstance(sec, str):
                boundary_pass = False
                print(f"Boundary FAIL at ({x}, {y})")
    print(f"Boundary Points Check: {'PASS' if boundary_pass else 'FAIL'}")

    # Landmarks verification
    landmarks = [
        ("Penalty Spot (Home)", 11.0, 34.0, None, "Penalty Spot"),
        ("Penalty Spot (Away)", 94.0, 34.0, None, "Penalty Spot"),
        ("Goal Mouth (Home)", 2.0, 34.0, None, "Goal Mouth"),
        ("Goal Mouth (Away)", 103.0, 34.0, None, "Goal Mouth"),
        ("Deep Defensive Corridor (Home)", 20.0, 34.0, None, "Deep Defensive Corridor"),
        ("Deep Defensive Corridor (Away)", 85.0, 34.0, None, "Deep Defensive Corridor"),
        ("Zone 14 Edge of the Box (Home)", 25.0, 34.0, None, "Zone 14 (Edge of the Box)"),
        ("Zone 14 Edge of the Box (Away)", 80.0, 34.0, None, "Zone 14 (Edge of the Box)"),
        ("Left Half-Space (Midfield)", 50.0, 20.0, None, "Left Half-Space"),
        ("Right Half-Space (Midfield)", 50.0, 48.0, None, "Right Half-Space"),
        ("Left Half-Space (Deep Attacking)", 80.0, 20.0, None, "Left Half-Space"),
        ("Right Half-Space (Deep Attacking)", 80.0, 48.0, None, "Right Half-Space"),
        ("Corner Quadrant (Top Left)", 1.0, 1.0, None, "Corner Quadrant"),
        ("Corner Quadrant (Top Right)", 104.0, 1.0, None, "Corner Quadrant"),
        ("Corner Quadrant (Bottom Left)", 1.0, 67.0, None, "Corner Quadrant"),
        ("Corner Quadrant (Bottom Right)", 104.0, 67.0, None, "Corner Quadrant"),
    ]
    landmark_pass = True
    print("\nLandmark Verifications:")
    for name, x, y, team, expected in landmarks:
        actual = resolve_pitch_sector(x, y, team)
        match = (actual == expected)
        if not match:
            landmark_pass = False
        print(f"  - {name:<35} at ({x:>5.1f}, {y:>5.1f}): expected '{expected}', got '{actual}' -> {'PASS' if match else 'FAIL'}")

    print(f"\nOverall Pitch Sector Status: {'PASS' if (valid_count == total_evals and boundary_pass and landmark_pass) else 'FAIL'}\n")
    return valid_count == total_evals and boundary_pass and landmark_pass


def run_blackboard_sync_suite():
    print("=" * 80)
    print("3. BLACKBOARD TELEMETRY INGESTION Z / VZ SYNCHRONIZATION")
    print("=" * 80)
    engine = MatchEngine(seed=42)
    engine.reset(SyntheticScenarioType.HIGH_POSSESSION, 0.0, 0.0)
    engine.state.ball_z = 3.82
    engine.state.ball_vz = -2.14
    frame = engine.build_frame()

    agent = TelemetryIngestionAgent()

    # Test standard execution path
    board_std = Blackboard()
    view_std = BlackboardView(blackboard=board_std)
    context_std = AgentContext(frame=frame, view=view_std, persona=ExperiencePersona.ANALYST)
    outcome_std = agent.run(context_std)
    ball_std = view_std.read(K_BALL)

    std_pass = (
        outcome_std.status.value == "complete"
        and ball_std is not None
        and math.isclose(ball_std.get("z", -1), 3.82, abs_tol=1e-4)
        and math.isclose(ball_std.get("vz", -1), -2.14, abs_tol=1e-4)
    )
    print(f"Standard Execution Path: status={outcome_std.status.value}, ball z={ball_std.get('z')}, vz={ball_std.get('vz')} -> {'PASS' if std_pass else 'FAIL'}")

    # Test fallback execution path
    board_fb = Blackboard()
    view_fb = BlackboardView(blackboard=board_fb)
    context_fb = AgentContext(frame=frame, view=view_fb, persona=ExperiencePersona.ANALYST)
    outcome_fb = agent.fallback(context_fb)
    ball_fb = view_fb.read(K_BALL)

    fb_pass = (
        outcome_fb.status.value == "fallback"
        and ball_fb is not None
        and math.isclose(ball_fb.get("z", -1), 3.82, abs_tol=1e-4)
        and math.isclose(ball_fb.get("vz", -1), -2.14, abs_tol=1e-4)
    )
    print(f"Fallback Execution Path: status={outcome_fb.status.value}, ball z={ball_fb.get('z')}, vz={ball_fb.get('vz')} -> {'PASS' if fb_pass else 'FAIL'}")

    print(f"\nOverall Blackboard Sync Status: {'PASS' if (std_pass and fb_pass) else 'FAIL'}\n")
    return std_pass and fb_pass


if __name__ == "__main__":
    s1, scenario_rows = run_scenario_stress_suite()
    s2 = run_pitch_sector_stress_suite()
    s3 = run_blackboard_sync_suite()

    print("=" * 80)
    print("FINAL CHALLENGE VERDICT:")
    if s1 and s2 and s3:
        print("VERDICT: APPROVE (All invariants, bands, sectors, and telemetry sync verified empirically)")
        sys.exit(0)
    else:
        print("VERDICT: REQUEST_CHANGES (One or more empirical checks failed)")
        sys.exit(1)
