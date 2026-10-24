"""Tests of the spatial layer: the Pitch Control surface and the Passing Lane.

These are the mathematical core of the engine (ADR 0001, ADR 0003). The tests
assert the *properties* the models are supposed to have, not the numbers the
current implementation happens to produce.
"""

from __future__ import annotations

import math

import pytest
from app.models import TeamSide
from app.simulation.metrics import aggregate_pass_difficulty
from app.simulation.spatial import (
    CELL_COUNT,
    CONTESTED_THRESHOLD,
    GRID_COLUMNS,
    GRID_ROWS,
    PITCH_LENGTH,
    PITCH_WIDTH,
    corridor_geometry,
    evaluate_lane,
    lane_weight,
    pitch_control_percentages,
    pitch_control_surface,
    reflect,
    target_goal,
)

from conftest import make_player

# --- Pitch Control -------------------------------------------------------------


def test_pitch_control_grid_is_21_by_17():
    """The Pitch Control grid is 5m x 4m over a 105m x 68m pitch (ADR 0003)."""
    assert GRID_COLUMNS == 21
    assert GRID_ROWS == 17
    assert CELL_COUNT == 357


def test_pitch_control_surface_covers_the_whole_pitch():
    cells = pitch_control_surface([make_player("a", 52.5, 34.0)])
    assert len(cells) == CELL_COUNT
    for cell in cells:
        assert 0.0 <= cell.x <= PITCH_LENGTH
        assert 0.0 <= cell.y <= PITCH_WIDTH
        assert -1.0 <= cell.controlScore <= 1.0
        assert 0.0 <= cell.homeWeight <= 1.0
        assert 0.0 <= cell.awayWeight <= 1.0


def test_pitch_control_follows_the_players():
    """A side that occupies the pitch controls it; the other side does not."""
    home = [
        make_player("h1", 20.0, 20.0),
        make_player("h2", 30.0, 30.0),
        make_player("h3", 40.0, 40.0),
    ]
    away = [
        make_player("a1", 85.0, 20.0, team=TeamSide.AWAY),
        make_player("a2", 95.0, 40.0, team=TeamSide.AWAY),
    ]
    cells = pitch_control_surface(home + away)
    split = pitch_control_percentages(cells)

    assert split["home"] > 0.0
    assert split["away"] > 0.0
    assert split["contested"] > 0.0
    assert math.isclose(
        split["home"] + split["away"] + split["contested"],
        100.0,
        abs_tol=0.05,
    )

    by_position = {(c.x, c.y): c for c in cells}
    # The cell in front of the home centre backs is home controlled ...
    home_cell = min(
        (c for c in cells if 10.0 <= c.x <= 20.0 and 30.0 <= c.y <= 38.0),
        key=lambda c: abs(c.x - 15.0),
    )
    assert home_cell.controlScore > CONTESTED_THRESHOLD
    # ... and the cell in front of the away goal is away controlled.
    away_cell = min(
        (c for c in cells if 85.0 <= c.x <= 100.0 and 30.0 <= c.y <= 38.0),
        key=lambda c: abs(c.x - 90.0),
    )
    assert away_cell.controlScore < -CONTESTED_THRESHOLD
    assert by_position


def test_pitch_control_is_mirror_symmetric():
    """Mirroring both teams through the halfway line negates the control score."""
    players = [
        make_player("h1", 30.0, 20.0),
        make_player("h2", 45.0, 44.0),
        make_player("a1", 80.0, 24.0, team=TeamSide.AWAY),
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
    original = {(c.x, c.y): c.controlScore for c in pitch_control_surface(players)}
    flipped = {(c.x, c.y): c.controlScore for c in pitch_control_surface(mirrored)}
    for (x, y), score in original.items():
        # The control of the mirrored team at a cell is the control of the
        # original team at the mirrored cell, with the opposite sign.
        assert flipped[(PITCH_LENGTH - x, y)] == pytest.approx(-score, abs=1e-4)


def test_pitch_control_favours_the_faster_player():
    """The influence kernel is scaled by the sprint velocity of the player."""
    slow = [make_player("h1", 50.0, 34.0, max_sprint=5.0)]
    fast = [make_player("h1", 50.0, 34.0, max_sprint=8.5)]
    cell = next(c for c in pitch_control_surface(slow) if c.x == 47.5 and c.y == 34.0)
    fast_cell = next(c for c in pitch_control_surface(fast) if c.x == 47.5 and c.y == 34.0)
    assert fast_cell.homeWeight > cell.homeWeight


# --- Passing Lane -------------------------------------------------------------


def _passer_and_receiver():
    return make_player("p", 50.0, 34.0), make_player("r", 65.0, 34.0)


def test_lane_without_defenders_is_clear_and_easy():
    passer, receiver = _passer_and_receiver()
    lane = evaluate_lane(passer, receiver, [])
    assert lane.interceptionRisk < 0.2
    assert lane.isClear
    assert lane.passDifficultyRating < 25.0
    assert lane.passerPressure == 0.0
    assert lane.receiverCoverage == 0.0
    assert lane.interceptorCount == 0


def test_lane_responds_to_interceptors():
    """A defender in the corridor makes the pass harder and riskier."""
    passer, receiver = _passer_and_receiver()
    clear = evaluate_lane(passer, receiver, [])
    blocked = evaluate_lane(
        passer,
        receiver,
        [make_player("d1", 57.5, 34.6), make_player("d2", 57.5, 33.4)],
    )
    assert blocked.interceptorCount == 2
    assert blocked.interceptionRisk > clear.interceptionRisk
    assert blocked.passDifficultyRating > clear.passDifficultyRating
    assert not blocked.isClear


def test_lane_responds_to_pressure_on_the_passer():
    passer, receiver = _passer_and_receiver()
    unpressured = evaluate_lane(passer, receiver, [])
    pressed = evaluate_lane(passer, receiver, [make_player("d1", 50.4, 34.2)])
    assert pressed.passerPressure > unpressured.passerPressure
    assert pressed.passDifficultyRating > unpressured.passDifficultyRating


def test_lane_responds_to_coverage_of_the_receiver():
    passer, receiver = _passer_and_receiver()
    uncovered = evaluate_lane(passer, receiver, [])
    covered = evaluate_lane(passer, receiver, [make_player("d1", 64.6, 34.2)])
    assert covered.receiverCoverage > uncovered.receiverCoverage
    assert covered.passDifficultyRating > uncovered.passDifficultyRating


def test_lane_responds_to_defender_velocity_alignment():
    """A defender sprinting onto the pass axis raises the difficulty."""
    passer, receiver = _passer_and_receiver()
    static = evaluate_lane(passer, receiver, [make_player("d1", 57.5, 35.5)])
    closing = evaluate_lane(
        passer,
        receiver,
        [make_player("d1", 57.5, 35.5, vy=-6.0)],
    )
    assert closing.defenderVelocityAlignment > static.defenderVelocityAlignment
    assert closing.passDifficultyRating > static.passDifficultyRating


def test_lane_responds_to_the_length_of_the_trajectory():
    near_passer = make_player("p", 50.0, 34.0)
    near_receiver = make_player("r", 60.0, 34.0)
    far_receiver = make_player("r", 90.0, 34.0)
    short = evaluate_lane(near_passer, near_receiver, [])
    long = evaluate_lane(near_passer, far_receiver, [])
    assert long.passDifficultyRating > short.passDifficultyRating


def test_lane_pdr_uses_every_context_component():
    """The PDR is the weighted sum of the four CONTEXT.md components."""
    passer, receiver = _passer_and_receiver()
    opponents = [make_player("d1", 57.5, 34.6), make_player("d2", 52.0, 31.0)]
    lane = evaluate_lane(passer, receiver, opponents)
    expected = 100.0 * (
        0.24 * lane.passerPressure
        + 0.24 * lane.receiverCoverage
        + 0.16 * (min(1.0, 15.0 / 40.0))
        + 0.20 * lane.defenderVelocityAlignment
        + 0.16
        * min(
            1.0,
            0.6 * min(1.0, lane.interceptorCount / 3.0) + 0.4 * max(0.0, 1.0 - lane.corridorWidthM / 12.0),
        )
    )
    assert lane.passDifficultyRating == pytest.approx(round(expected, 2), abs=0.6)


def test_lane_corridor_geometry_reports_the_free_channel():
    passer, receiver = _passer_and_receiver()
    width, interceptors = corridor_geometry(passer, receiver, [])
    assert interceptors == 0
    assert width == 12.0
    width, interceptors = corridor_geometry(
        passer,
        receiver,
        [make_player("d1", 57.5, 34.2), make_player("d2", 57.5, 33.8)],
    )
    assert interceptors == 2
    assert width < 2.0


# --- Aggregation --------------------------------------------------------------


def test_aggregate_pdr_is_the_weighted_mean_of_the_lanes():
    """The headline PDR is the weighted mean of the lanes the viewer sees."""
    passer, receiver = _passer_and_receiver()
    lanes = [
        evaluate_lane(passer, receiver, [make_player("d1", 57.5, 34.4)]),
        evaluate_lane(passer, receiver, [make_player("d1", 60.0, 30.0)]),
        evaluate_lane(passer, receiver, [make_player("d1", 63.0, 37.0)]),
    ]
    weights = [lane_weight(lane) for lane in lanes]
    expected = sum(lane.passDifficultyRating * w for lane, w in zip(lanes, weights, strict=True)) / sum(
        weights
    )
    assert aggregate_pass_difficulty(lanes) == pytest.approx(round(expected, 2))


def test_lane_weight_is_the_expected_value_of_the_attempt():
    passer, receiver = _passer_and_receiver()
    lane = evaluate_lane(passer, receiver, [])
    assert lane_weight(lane) == pytest.approx(1.0 - lane.interceptionRisk)


def test_aggregate_pdr_of_no_lanes_is_zero():
    assert aggregate_pass_difficulty([]) == 0.0


# --- Pitch boundary -----------------------------------------------------------


def test_reflect_keeps_players_inside_the_pitch():
    """A player is never parked on the touchline or the goal line.

    The coordinate is reflected back into the band rather than clamped onto
    it, so a player keeps his momentum instead of sliding along the line.
    """
    margin = 1.0
    for value in (-200.0, -20.0, -0.5, 0.5, 104.5, 140.0, 400.0):
        reflected = reflect(value, 0.0, PITCH_LENGTH, margin)
        assert margin < reflected < PITCH_LENGTH - margin
    assert reflect(50.0, 0.0, PITCH_LENGTH, margin) == pytest.approx(50.0)


def test_target_goal_is_the_opposite_end_for_each_side():
    home_goal = target_goal(TeamSide.HOME)
    away_goal = target_goal(TeamSide.AWAY)
    assert home_goal[0] == PITCH_LENGTH
    assert away_goal[0] == 0.0
    assert home_goal[1] == away_goal[1] == PITCH_WIDTH / 2.0
