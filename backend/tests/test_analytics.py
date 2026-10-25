"""Tests for spatial analytics: Pitch Control surface and Pass Difficulty Rating (PDR).

Covers Milestone 3 requirements:
1. 357-cell Pitch Control surface (17x21 grid) with cell probabilities in [0.0, 1.0].
2. Pass Difficulty Rating (PDR) across 5 canonical components with weights summing to 1.00.
"""

from __future__ import annotations

import math

import pytest
from app.analytics.pass_difficulty import (
    COMPONENT_WEIGHTS,
    W_DISTANCE,
    W_INTERCEPTION,
    W_PITCH_CONTROL,
    W_PRESSURE,
    W_RECEIVER_MOTION,
    WEIGHT_SUM,
    PDRResult,
    aggregate_pass_difficulty,
    calculate_pdr,
    compute_pdr_breakdown,
)
from app.analytics.pitch_control import (
    CELL_COUNT,
    CELL_SIZE_X,
    CELL_SIZE_Y,
    GRID_COLUMNS,
    GRID_ROWS,
    PITCH_LENGTH,
    PITCH_WIDTH,
    calculate_pitch_control_surface,
    cell_centres,
    pitch_control_percentages,
    pitch_control_surface,
)
from app.models import PassingLane, PitchPosition, TeamSide

from conftest import make_player

# ==============================================================================
# Pitch Control (357-cell surface, 17x21 grid)
# ==============================================================================


def test_pitch_control_canonical_dimensions() -> None:
    """Verify the pitch control grid is 21 columns x 17 rows = 357 cells on 105m x 68m pitch."""
    assert PITCH_LENGTH == 105.0
    assert PITCH_WIDTH == 68.0
    assert CELL_SIZE_X == 5.0
    assert CELL_SIZE_Y == 4.0
    assert GRID_COLUMNS == 21
    assert GRID_ROWS == 17
    assert CELL_COUNT == 357


def test_pitch_control_cell_centres() -> None:
    """Verify cell centres array has shape (357, 2) and all points lie within pitch boundaries."""
    centres = cell_centres()
    assert centres.shape == (357, 2)
    for x, y in centres:
        assert 0.0 < x < PITCH_LENGTH
        assert 0.0 < y < PITCH_WIDTH


def test_pitch_control_surface_probabilities_bounded() -> None:
    """Verify all 357 cells produce probabilities in [0.0, 1.0] and controlScore in [-1.0, 1.0]."""
    players = [
        make_player("h1", 30.0, 34.0, team=TeamSide.HOME, max_sprint=7.8),
        make_player("h2", 45.0, 20.0, team=TeamSide.HOME, max_sprint=8.2),
        make_player("a1", 75.0, 34.0, team=TeamSide.AWAY, max_sprint=7.5),
        make_player("a2", 60.0, 48.0, team=TeamSide.AWAY, max_sprint=8.0),
    ]
    cells = calculate_pitch_control_surface(players)
    assert len(cells) == 357

    for cell in cells:
        assert 0.0 <= cell.x <= PITCH_LENGTH
        assert 0.0 <= cell.y <= PITCH_WIDTH
        assert 0.0 <= cell.homeWeight <= 1.0, f"homeWeight {cell.homeWeight} out of [0, 1]"
        assert 0.0 <= cell.awayWeight <= 1.0, f"awayWeight {cell.awayWeight} out of [0, 1]"
        assert -1.0 <= cell.controlScore <= 1.0, f"controlScore {cell.controlScore} out of [-1, 1]"
        assert math.isclose(cell.controlScore, round(cell.homeWeight - cell.awayWeight, 4), abs_tol=1e-3)


def test_pitch_control_surface_empty_players() -> None:
    """Verify pitch control surface with no players produces 0 probability across all cells."""
    cells = calculate_pitch_control_surface([])
    assert len(cells) == 357
    for cell in cells:
        assert cell.homeWeight == 0.0
        assert cell.awayWeight == 0.0
        assert cell.controlScore == 0.0


def test_pitch_control_dominance_and_percentages() -> None:
    """Verify that home players dominate home half, away dominate away half, and percentages sum to 100%."""
    home = [make_player(f"h{i}", 20.0 + i * 5, 20.0 + i * 4, team=TeamSide.HOME) for i in range(5)]
    away = [make_player(f"a{i}", 75.0 + i * 5, 20.0 + i * 4, team=TeamSide.AWAY) for i in range(5)]
    cells = pitch_control_surface(home + away)
    split = pitch_control_percentages(cells)

    assert split["home"] > 0.0
    assert split["away"] > 0.0
    assert split["contested"] > 0.0
    total = split["home"] + split["away"] + split["contested"]
    assert math.isclose(total, 100.0, abs_tol=0.1)


def test_pitch_control_mirror_symmetry() -> None:
    """Verify mirror symmetry: flipping players horizontally negates the control score."""
    players = [
        make_player("h1", 30.0, 25.0, team=TeamSide.HOME),
        make_player("a1", 75.0, 45.0, team=TeamSide.AWAY),
    ]
    mirrored = [
        make_player(
            p.id,
            PITCH_LENGTH - p.x,
            p.y,
            team=TeamSide.AWAY if p.team is TeamSide.HOME else TeamSide.HOME,
        )
        for p in players
    ]
    orig_cells = {(c.x, c.y): c.controlScore for c in calculate_pitch_control_surface(players)}
    mirr_cells = {(c.x, c.y): c.controlScore for c in calculate_pitch_control_surface(mirrored)}

    for (x, y), score in orig_cells.items():
        mirrored_key = (round(PITCH_LENGTH - x, 2), y)
        assert mirr_cells[mirrored_key] == pytest.approx(-score, abs=1e-3)


# ==============================================================================
# Pass Difficulty Rating (5 components, 1.00 weight sum)
# ==============================================================================


def test_pdr_component_weights_sum_to_one() -> None:
    """Verify the 5 canonical components have weights that strictly sum to 1.00."""
    assert W_PRESSURE == 0.25
    assert W_DISTANCE == 0.20
    assert W_INTERCEPTION == 0.25
    assert W_PITCH_CONTROL == 0.15
    assert W_RECEIVER_MOTION == 0.15

    assert COMPONENT_WEIGHTS["pressure"] == 0.25
    assert COMPONENT_WEIGHTS["distance"] == 0.20
    assert COMPONENT_WEIGHTS["interception"] == 0.25
    assert COMPONENT_WEIGHTS["pitch_control"] == 0.15
    assert COMPONENT_WEIGHTS["receiver_motion"] == 0.15

    total = W_PRESSURE + W_DISTANCE + W_INTERCEPTION + W_PITCH_CONTROL + W_RECEIVER_MOTION
    assert math.isclose(total, 1.00, abs_tol=1e-9)
    assert WEIGHT_SUM == 1.00


def test_pdr_boundary_values() -> None:
    """Verify extreme boundaries: all 0.0 -> 0.0, all 1.0 -> 100.0 (or 1.0 normalized)."""
    zero_pdr = calculate_pdr(0.0, 0.0, 0.0, 0.0, 0.0, scale_100=True)
    assert zero_pdr == 0.0

    max_pdr = calculate_pdr(1.0, 1.0, 1.0, 1.0, 1.0, scale_100=True)
    assert max_pdr == 100.0

    norm_zero = calculate_pdr(0.0, 0.0, 0.0, 0.0, 0.0, scale_100=False)
    assert norm_zero == 0.0

    norm_max = calculate_pdr(1.0, 1.0, 1.0, 1.0, 1.0, scale_100=False)
    assert norm_max == 1.0


def test_pdr_component_sensitivities() -> None:
    """Verify that increasing each component increases PDR by exactly its weighted contribution."""
    base = calculate_pdr(0.2, 0.2, 0.2, 0.2, 0.2, scale_100=True)

    # w_pressure = 0.25 -> +0.1 pressure increases PDR by 0.1 * 0.25 * 100 = 2.5
    more_pressure = calculate_pdr(0.3, 0.2, 0.2, 0.2, 0.2, scale_100=True)
    assert more_pressure - base == pytest.approx(2.5, abs=0.01)

    # w_distance = 0.20 -> +0.1 distance increases PDR by 0.1 * 0.20 * 100 = 2.0
    more_distance = calculate_pdr(0.2, 0.3, 0.2, 0.2, 0.2, scale_100=True)
    assert more_distance - base == pytest.approx(2.0, abs=0.01)

    # w_interception = 0.25 -> +0.1 interception increases PDR by 0.1 * 0.25 * 100 = 2.5
    more_interception = calculate_pdr(0.2, 0.2, 0.3, 0.2, 0.2, scale_100=True)
    assert more_interception - base == pytest.approx(2.5, abs=0.01)

    # w_pitch_control = 0.15 -> +0.1 pitch control increases PDR by 0.1 * 0.15 * 100 = 1.5
    more_pitch_control = calculate_pdr(0.2, 0.2, 0.2, 0.3, 0.2, scale_100=True)
    assert more_pitch_control - base == pytest.approx(1.5, abs=0.01)

    # w_receiver_motion = 0.15 -> +0.1 receiver motion increases PDR by 0.1 * 0.15 * 100 = 1.5
    more_receiver_motion = calculate_pdr(0.2, 0.2, 0.2, 0.2, 0.3, scale_100=True)
    assert more_receiver_motion - base == pytest.approx(1.5, abs=0.01)


def test_pdr_compute_breakdown() -> None:
    """Verify compute_pdr_breakdown returns PDRResult with full structured fields."""
    res = compute_pdr_breakdown(
        pressure=0.6,
        distance=0.4,
        interception=0.8,
        pitch_control=0.5,
        receiver_motion=0.3,
    )
    assert isinstance(res, PDRResult)
    expected_score = (0.25 * 0.6 + 0.20 * 0.4 + 0.25 * 0.8 + 0.15 * 0.5 + 0.15 * 0.3) * 100.0
    assert res.score == pytest.approx(round(expected_score, 2))
    assert res.normalized == pytest.approx(round(expected_score / 100.0, 4))
    assert res.components.pressure == 0.6
    assert res.components.distance == 0.4
    assert res.components.interception == 0.8
    assert res.components.pitch_control == 0.5
    assert res.components.receiver_motion == 0.3
    assert res.weights["pressure"] == 0.25


def test_aggregate_pass_difficulty_weighted_average() -> None:
    """Verify aggregate_pass_difficulty weights lanes by (1 - interceptionRisk)."""
    lane1 = PassingLane(
        passerId="p1",
        receiverId="p2",
        passerPos=PitchPosition(x=20.0, y=20.0),
        receiverPos=PitchPosition(x=40.0, y=20.0),
        interceptionRisk=0.1,  # weight: 0.9
        passDifficultyRating=20.0,
        isClear=True,
        corridorWidthM=10.0,
        interceptorCount=0,
        passerPressure=0.1,
        receiverCoverage=0.1,
        defenderVelocityAlignment=0.1,
    )
    lane2 = PassingLane(
        passerId="p1",
        receiverId="p3",
        passerPos=PitchPosition(x=20.0, y=20.0),
        receiverPos=PitchPosition(x=50.0, y=30.0),
        interceptionRisk=0.5,  # weight: 0.5
        passDifficultyRating=60.0,
        isClear=False,
        corridorWidthM=3.0,
        interceptorCount=1,
        passerPressure=0.3,
        receiverCoverage=0.4,
        defenderVelocityAlignment=0.5,
    )

    agg = aggregate_pass_difficulty([lane1, lane2])
    expected = (20.0 * 0.9 + 60.0 * 0.5) / (0.9 + 0.5)
    assert agg == pytest.approx(round(expected, 2))

    # Empty lanes returns 0.0
    assert aggregate_pass_difficulty([]) == 0.0
