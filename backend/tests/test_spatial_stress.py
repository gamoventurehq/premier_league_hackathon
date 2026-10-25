"""Empirical stress test suite for Milestone 3 Spatial Analytics.

Adversarial stress-testing of:
1. Pitch Control surface (357 cells invariant, [0.0, 1.0] bounds, extreme positions/speeds, edge cases).
2. Pass Difficulty Rating (PDR) weight sum invariance (1.00 sum, 5 canonical components, boundary resilience).
"""

from __future__ import annotations

import math
import random

import numpy as np
import pytest
from app.analytics.pass_difficulty import (
    COMPONENT_WEIGHTS,
    W_DISTANCE,
    W_INTERCEPTION,
    W_PITCH_CONTROL,
    W_PRESSURE,
    W_RECEIVER_MOTION,
    WEIGHT_SUM,
    aggregate_pass_difficulty,
    calculate_pdr,
)
from app.analytics.pitch_control import (
    CELL_COUNT,
    GRID_COLUMNS,
    GRID_ROWS,
    calculate_pitch_control_percentages,
    calculate_pitch_control_surface,
    cell_centres,
)
from app.models import PassingLane, PitchPosition, TeamSide

from conftest import make_player

# ==============================================================================
# Pitch Control Surface Stress Tests
# ==============================================================================


class TestPitchControlSurfaceStress:
    """Adversarial stress testing of Pitch Control calculations."""

    def test_invariant_cell_count_always_357(self) -> None:
        """Verify cell count is invariant (strictly 357) across diverse inputs."""
        scenarios = [
            [],  # 0 players
            [make_player("h1", 50.0, 30.0, team=TeamSide.HOME)],  # 1 player
            [make_player("a1", 50.0, 30.0, team=TeamSide.AWAY)],  # 1 away
            [make_player(f"h{i}", float(i * 4), 34.0, team=TeamSide.HOME) for i in range(11)]
            + [
                make_player(f"a{i}", float(105 - i * 4), 34.0, team=TeamSide.AWAY) for i in range(11)
            ],  # 22 players
            [
                make_player(f"p{i}", 0.0, 0.0, team=TeamSide.HOME if i % 2 == 0 else TeamSide.AWAY)
                for i in range(50)
            ],  # 50 coincident
        ]

        for players in scenarios:
            cells = calculate_pitch_control_surface(players)
            assert len(cells) == 357, f"Expected 357 cells, got {len(cells)} for {len(players)} players"
            assert len(cells) == CELL_COUNT
            assert GRID_COLUMNS * GRID_ROWS == 357

    def test_invariant_cell_coordinates_grid_alignment(self) -> None:
        """Verify all 357 cells form a regular 21x17 grid covering the 105m x 68m pitch."""
        centres = cell_centres()
        assert centres.shape == (357, 2)

        # Unique coordinates
        unique_x = np.unique(centres[:, 0])
        unique_y = np.unique(centres[:, 1])
        assert len(unique_x) == 21
        assert len(unique_y) == 17

        # Spacing
        np.testing.assert_allclose(np.diff(unique_x), 5.0)
        np.testing.assert_allclose(np.diff(unique_y), 4.0)

        # First and last cell centres
        assert unique_x[0] == 2.5
        assert unique_x[-1] == 102.5
        assert unique_y[0] == 2.0
        assert unique_y[-1] == 66.0

    def test_invariant_probability_bounds_extreme_random(self) -> None:
        """Monte Carlo stress test: verify all cell probabilities strictly within [0.0, 1.0]."""
        rng = random.Random(42)

        for trial in range(30):
            num_home = rng.randint(0, 15)
            num_away = rng.randint(0, 15)

            home_players = [
                make_player(
                    f"h{i}",
                    x=rng.uniform(-20.0, 125.0),
                    y=rng.uniform(-10.0, 80.0),
                    team=TeamSide.HOME,
                    max_sprint=rng.uniform(0.0, 25.0),
                )
                for i in range(num_home)
            ]
            away_players = [
                make_player(
                    f"a{i}",
                    x=rng.uniform(-20.0, 125.0),
                    y=rng.uniform(-10.0, 80.0),
                    team=TeamSide.AWAY,
                    max_sprint=rng.uniform(0.0, 25.0),
                )
                for i in range(num_away)
            ]

            cells = calculate_pitch_control_surface(home_players + away_players)
            assert len(cells) == 357

            for cell in cells:
                assert 0.0 <= cell.homeWeight <= 1.0, (
                    f"homeWeight {cell.homeWeight} violated [0, 1] on trial {trial}"
                )
                assert 0.0 <= cell.awayWeight <= 1.0, (
                    f"awayWeight {cell.awayWeight} violated [0, 1] on trial {trial}"
                )
                assert -1.0 <= cell.controlScore <= 1.0, (
                    f"controlScore {cell.controlScore} violated [-1, 1] on trial {trial}"
                )
                assert not math.isnan(cell.homeWeight)
                assert not math.isnan(cell.awayWeight)
                assert not math.isnan(cell.controlScore)

    def test_extreme_speeds_supersonic_and_stationary(self) -> None:
        """Stress-test extreme velocities: 0 m/s, negative values, and supersonic sprint speeds."""
        # Near-zero and zero speeds
        stationary_players = [
            make_player("h0", 52.5, 34.0, team=TeamSide.HOME, max_sprint=0.0),
            make_player("h_neg", 20.0, 20.0, team=TeamSide.HOME, max_sprint=-5.0),
        ]
        cells = calculate_pitch_control_surface(stationary_players)
        assert len(cells) == 357
        for c in cells:
            assert 0.0 <= c.homeWeight <= 1.0
            assert not math.isnan(c.homeWeight)

        # Supersonic speeds (340 m/s, 10000 m/s)
        supersonic_players = [
            make_player("h_sonic", 52.5, 34.0, team=TeamSide.HOME, max_sprint=343.0),
            make_player("a_warp", 52.5, 34.0, team=TeamSide.AWAY, max_sprint=10000.0),
        ]
        cells_sonic = calculate_pitch_control_surface(supersonic_players)
        for c in cells_sonic:
            assert 0.0 <= c.homeWeight <= 1.0
            assert 0.0 <= c.awayWeight <= 1.0
            assert -1.0 <= c.controlScore <= 1.0
            assert not math.isinf(c.controlScore)
            assert not math.isnan(c.controlScore)

    def test_extreme_coordinates_deep_offpitch(self) -> None:
        """Stress-test coordinates far outside pitch boundaries."""
        players = [
            make_player("h_far", -1000.0, -500.0, team=TeamSide.HOME),
            make_player("a_far", 5000.0, 2000.0, team=TeamSide.AWAY),
        ]
        cells = calculate_pitch_control_surface(players)
        assert len(cells) == 357
        for c in cells:
            # Distances are huge, so arrival probabilities should be near 0
            assert 0.0 <= c.homeWeight <= 0.01
            assert 0.0 <= c.awayWeight <= 0.01
            assert abs(c.controlScore) <= 0.01

    def test_corners_clustering_22_players(self) -> None:
        """Stress-test 22 players placed precisely at pitch corners."""
        corners = [(0.0, 0.0), (105.0, 0.0), (0.0, 68.0), (105.0, 68.0)]
        players = []
        for i in range(22):
            cx, cy = corners[i % 4]
            team = TeamSide.HOME if i < 11 else TeamSide.AWAY
            players.append(make_player(f"p{i}", cx, cy, team=team, max_sprint=8.0))

        cells = calculate_pitch_control_surface(players)
        assert len(cells) == 357
        for c in cells:
            assert 0.0 <= c.homeWeight <= 1.0
            assert 0.0 <= c.awayWeight <= 1.0
            assert -1.0 <= c.controlScore <= 1.0

        split = calculate_pitch_control_percentages(cells)
        assert split["home"] + split["away"] + split["contested"] == pytest.approx(100.0, abs=0.1)

    def test_empirical_investigation_team_total_sum(self) -> None:
        """Empirical challenge: Does homeWeight + awayWeight <= 1.0 per cell?

        Finding: In the canonical arrival probability formulation (ADR 0003),
        P_home and P_away represent independent team arrival probabilities.
        When home and away players are both in close proximity to a cell,
        homeWeight and awayWeight can both approach 1.0, summing to > 1.0 (up to ~2.0).
        The true bounded invariant is that controlScore = homeWeight - awayWeight in [-1.0, 1.0],
        and the macro split home% + away% + contested% == 100.0%.
        """
        coincident_players = [
            make_player("h1", 52.5, 34.0, team=TeamSide.HOME, max_sprint=8.5),
            make_player("a1", 52.5, 34.0, team=TeamSide.AWAY, max_sprint=8.5),
        ]
        cells = calculate_pitch_control_surface(coincident_players)
        center_cell = next(c for c in cells if c.x == 52.5 and c.y == 34.0)

        # Both teams are on the center cell, so both have high arrival probability
        assert center_cell.homeWeight > 0.8
        assert center_cell.awayWeight > 0.8
        total_arrival_prob = center_cell.homeWeight + center_cell.awayWeight
        assert total_arrival_prob > 1.0, (
            f"Expected independent arrival sum > 1.0 at contested point, got {total_arrival_prob}"
        )

        # Yet control score is exactly 0.0 (contested) and bounded in [-1.0, 1.0]
        assert center_cell.controlScore == pytest.approx(0.0, abs=1e-3)
        assert -1.0 <= center_cell.controlScore <= 1.0

        # And percentages partition the pitch perfectly into 100%
        split = calculate_pitch_control_percentages(cells)
        assert split["home"] + split["away"] + split["contested"] == pytest.approx(100.0, abs=0.1)
        assert split["contested"] == pytest.approx(100.0, abs=0.1)

    def test_percentages_partition_invariance(self) -> None:
        """Verify home% + away% + contested% is strictly 100.0% across arbitrary cell collections."""
        # Empty cells
        assert calculate_pitch_control_percentages([]) == {"home": 0.0, "away": 0.0, "contested": 0.0}

        # Varied scores
        for _ in range(20):
            dummy_cells = []
            for _i in range(357):
                round(random.uniform(-1.0, 1.0), 4)
                dummy_cells.append(
                    calculate_pitch_control_surface(
                        [
                            make_player(
                                "h1", random.uniform(0, 105), random.uniform(0, 68), team=TeamSide.HOME
                            ),
                            make_player(
                                "a1", random.uniform(0, 105), random.uniform(0, 68), team=TeamSide.AWAY
                            ),
                        ]
                    )
                )
            for cell_set in dummy_cells[:3]:
                split = calculate_pitch_control_percentages(cell_set)
                total = split["home"] + split["away"] + split["contested"]
                assert math.isclose(total, 100.0, abs_tol=0.15)


# ==============================================================================
# Pass Difficulty Rating (PDR) Stress Tests
# ==============================================================================


class TestPDRStress:
    """Adversarial stress testing of Pass Difficulty Rating (PDR) calculations."""

    def test_invariant_canonical_weights_sum_to_one(self) -> None:
        """Verify the 5 canonical components have weights summing strictly to 1.00."""
        assert W_PRESSURE == 0.25
        assert W_DISTANCE == 0.20
        assert W_INTERCEPTION == 0.25
        assert W_PITCH_CONTROL == 0.15
        assert W_RECEIVER_MOTION == 0.15

        weights = [W_PRESSURE, W_DISTANCE, W_INTERCEPTION, W_PITCH_CONTROL, W_RECEIVER_MOTION]
        assert sum(weights) == 1.00
        assert WEIGHT_SUM == 1.00

        # Check dictionary mapping
        assert len(COMPONENT_WEIGHTS) == 5
        assert sum(COMPONENT_WEIGHTS.values()) == 1.00

    def test_invariant_pdr_bounds_monte_carlo_10000(self) -> None:
        """Monte Carlo stress test: 10,000 random input vectors (including out-of-range).

        PDR must remain strictly within [0.0, 100.0] (scale_100=True) and [0.0, 1.0] (scale_100=False).
        """
        rng = random.Random(1337)

        for _ in range(10000):
            # Include negative, valid, and over-unity inputs
            p = rng.uniform(-5.0, 5.0)
            d = rng.uniform(-5.0, 5.0)
            i = rng.uniform(-5.0, 5.0)
            pc = rng.uniform(-5.0, 5.0)
            rm = rng.uniform(-5.0, 5.0)

            score_100 = calculate_pdr(p, d, i, pc, rm, scale_100=True)
            score_norm = calculate_pdr(p, d, i, pc, rm, scale_100=False)

            assert 0.0 <= score_100 <= 100.0, f"PDR 100 score {score_100} out of bounds"
            assert 0.0 <= score_norm <= 1.0, f"PDR norm score {score_norm} out of bounds"
            assert not math.isnan(score_100)
            assert not math.isnan(score_norm)

    def test_pdr_monotonicity_across_all_5_dimensions(self) -> None:
        """Verify that increasing any component monotonically increases or preserves PDR."""
        base_inputs = [0.1, 0.3, 0.5, 0.7, 0.9]

        for p in base_inputs:
            for d in base_inputs:
                for i in base_inputs:
                    for pc in base_inputs:
                        for rm in base_inputs:
                            base = calculate_pdr(p, d, i, pc, rm, scale_100=False)

                            # Increment pressure
                            if p + 0.05 <= 1.0:
                                inc_p = calculate_pdr(p + 0.05, d, i, pc, rm, scale_100=False)
                                assert inc_p >= base

                            # Increment distance
                            if d + 0.05 <= 1.0:
                                inc_d = calculate_pdr(p, d + 0.05, i, pc, rm, scale_100=False)
                                assert inc_d >= base

                            # Increment interception
                            if i + 0.05 <= 1.0:
                                inc_i = calculate_pdr(p, d, i + 0.05, pc, rm, scale_100=False)
                                assert inc_i >= base

                            # Increment pitch_control
                            if pc + 0.05 <= 1.0:
                                inc_pc = calculate_pdr(p, d, i, pc + 0.05, rm, scale_100=False)
                                assert inc_pc >= base

                            # Increment receiver_motion
                            if rm + 0.05 <= 1.0:
                                inc_rm = calculate_pdr(p, d, i, pc, rm + 0.05, scale_100=False)
                                assert inc_rm >= base

    def test_pdr_exact_sensitivity_derivatives(self) -> None:
        """Verify that delta PDR / delta component equals the exact canonical weight."""
        p, d, i, pc, rm = 0.2, 0.3, 0.4, 0.2, 0.1
        delta = 0.1

        dp = calculate_pdr(p + delta, d, i, pc, rm, scale_100=False) - calculate_pdr(
            p, d, i, pc, rm, scale_100=False
        )
        assert dp == pytest.approx(W_PRESSURE * delta, abs=1e-4)

        dd = calculate_pdr(p, d + delta, i, pc, rm, scale_100=False) - calculate_pdr(
            p, d, i, pc, rm, scale_100=False
        )
        assert dd == pytest.approx(W_DISTANCE * delta, abs=1e-4)

        di = calculate_pdr(p, d, i + delta, pc, rm, scale_100=False) - calculate_pdr(
            p, d, i, pc, rm, scale_100=False
        )
        assert di == pytest.approx(W_INTERCEPTION * delta, abs=1e-4)

        dpc = calculate_pdr(p, d, i, pc + delta, rm, scale_100=False) - calculate_pdr(
            p, d, i, pc, rm, scale_100=False
        )
        assert dpc == pytest.approx(W_PITCH_CONTROL * delta, abs=1e-4)

        drm = calculate_pdr(p, d, i, pc, rm + delta, scale_100=False) - calculate_pdr(
            p, d, i, pc, rm, scale_100=False
        )
        assert drm == pytest.approx(W_RECEIVER_MOTION * delta, abs=1e-4)

    def test_aggregate_pass_difficulty_stress_cases(self) -> None:
        """Stress-test lane aggregation under extreme risks and scores."""
        # Case 1: Empty lanes
        assert aggregate_pass_difficulty([]) == 0.0

        # Case 2: Maximum risk on all lanes (interceptionRisk = 1.0)
        # Should not divide by zero due to max(0.05, 1.0 - risk) floor
        lanes_max_risk = [
            PassingLane(
                passerId="p1",
                receiverId="p2",
                passerPos=PitchPosition(x=10.0, y=10.0),
                receiverPos=PitchPosition(x=30.0, y=30.0),
                interceptionRisk=1.0,
                passDifficultyRating=80.0,
                isClear=False,
                corridorWidthM=1.0,
                interceptorCount=3,
                passerPressure=0.9,
                receiverCoverage=0.8,
                defenderVelocityAlignment=0.7,
            ),
            PassingLane(
                passerId="p1",
                receiverId="p3",
                passerPos=PitchPosition(x=10.0, y=10.0),
                receiverPos=PitchPosition(x=40.0, y=20.0),
                interceptionRisk=1.0,
                passDifficultyRating=90.0,
                isClear=False,
                corridorWidthM=0.5,
                interceptorCount=4,
                passerPressure=0.9,
                receiverCoverage=0.9,
                defenderVelocityAlignment=0.8,
            ),
        ]
        agg = aggregate_pass_difficulty(lanes_max_risk)
        assert agg == pytest.approx(85.0, abs=0.01)
        assert not math.isnan(agg)

        # Case 3: Over-unity risk (e.g. 2.0)
        lanes_over_risk = [
            PassingLane(
                passerId="p1",
                receiverId="p2",
                passerPos=PitchPosition(x=10.0, y=10.0),
                receiverPos=PitchPosition(x=30.0, y=30.0),
                interceptionRisk=2.0,
                passDifficultyRating=50.0,
                isClear=False,
                corridorWidthM=1.0,
                interceptorCount=3,
                passerPressure=0.9,
                receiverCoverage=0.8,
                defenderVelocityAlignment=0.7,
            )
        ]
        agg_over = aggregate_pass_difficulty(lanes_over_risk)
        assert agg_over == 50.0
