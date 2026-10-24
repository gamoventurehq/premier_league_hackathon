"""Tests of the derived metrics: the clock, the Control vs. Chaos Index, the
Game Rhythm, the Pass Difficulty Rating and the box score statistics.

The metrics are only useful if they are *observable*: every assertion here is
made against a match the engine actually simulated.
"""

from __future__ import annotations

import pytest
from app.models import GameRhythm, SyntheticScenarioType, TeamSide
from app.simulation.engine import SCENARIO_ORDER, MatchEngine
from app.simulation.metrics import (
    MATCH_LENGTH_SECONDS,
    MatchObservations,
    chaos_inputs,
    control_vs_chaos_index,
    expected_goals,
    format_match_clock,
    game_rhythm,
    match_statistics,
    rhythm_inputs,
)

from conftest import FULL_MATCH_SECONDS

# --- The clock ----------------------------------------------------------------


@pytest.mark.parametrize(
    ("seconds", "expected"),
    [
        (0.0, "00:00"),
        (9.0, "00:09"),
        (59.9, "00:59"),
        (60.0, "01:00"),
        (68 * 60 + 59, "68:59"),
        (69 * 60, "69:00"),
        (89 * 60 + 59, "89:59"),
        (MATCH_LENGTH_SECONDS, "90:00"),
    ],
)
def test_match_clock_rolls_over(seconds, expected):
    """The clock is a pure function of the accumulator and never produces 68:60."""
    assert format_match_clock(seconds) == expected


def test_match_clock_is_always_a_valid_minute_second_pair():
    for seconds in range(0, MATCH_LENGTH_SECONDS + 1, 7):
        clock = format_match_clock(seconds)
        minutes, secs = clock.split(":")
        assert 0 <= int(secs) < 60
        assert 0 <= int(minutes) <= 90


# --- The Control vs. Chaos Index ----------------------------------------------


def test_chaos_index_is_bounded():
    inputs = chaos_inputs(MatchObservations())
    assert 0.0 <= control_vs_chaos_index(inputs) <= 100.0


def test_chaos_index_rises_with_the_turnover_rate():
    calm = MatchObservations(
        possession_seconds={"home": 600.0, "away": 400.0},
        sequence_durations=[30.0] * 12,
        turnover_count=2,
        possession_changes=3,
        elapsed_seconds=1000.0,
    )
    frantic = MatchObservations(
        possession_seconds={"home": 600.0, "away": 400.0},
        sequence_durations=[3.0, 24.0, 5.0, 31.0, 2.0, 18.0],
        turnover_count=40,
        possession_changes=60,
        pass_attempts=200,
        passes_under_pressure=120,
        elapsed_seconds=1000.0,
    )
    assert control_vs_chaos_index(chaos_inputs(frantic)) > control_vs_chaos_index(chaos_inputs(calm))


def _simulate(scenario: SyntheticScenarioType) -> MatchEngine:
    engine = MatchEngine(seed=20260922)
    engine.reset(scenario, start_seconds=0.0, warmup_seconds=0.0)
    engine.fast_forward(FULL_MATCH_SECONDS, dt=0.2)
    return engine


@pytest.fixture(scope="module")
def simulated_matches() -> dict[SyntheticScenarioType, MatchEngine]:
    return {scenario: _simulate(scenario) for scenario in SCENARIO_ORDER}


def test_the_four_scenarios_produce_four_different_chaos_readings(simulated_matches):
    """The Control vs. Chaos Index separates the four Synthetic Match Scenarios."""
    readings = {
        scenario: engine.build_frame().metrics.controlVsChaosIndex
        for scenario, engine in simulated_matches.items()
    }
    assert len(set(readings.values())) == 4, readings
    # The scramble is the most chaotic and the low block the most structured.
    assert readings[SyntheticScenarioType.BOX_SCRAMBLE] == max(readings.values())
    assert readings[SyntheticScenarioType.LOW_BLOCK_SIEGE] == min(readings.values())


def test_the_four_scenarios_produce_four_different_game_rhythms(simulated_matches):
    """Each Synthetic Match Scenario has its own Game Rhythm."""
    rhythms = {
        scenario: engine.build_frame().metrics.gameRhythm for scenario, engine in simulated_matches.items()
    }
    assert len(set(rhythms.values())) == 4, rhythms
    assert rhythms[SyntheticScenarioType.LOW_BLOCK_SIEGE] is GameRhythm.STRUCTURED
    assert rhythms[SyntheticScenarioType.BOX_SCRAMBLE] is GameRhythm.CHAOTIC


def test_game_rhythm_is_mapped_from_the_observable_signals():
    """The rhythm is a monotone function of the transition rate and the tempo."""
    calm = rhythm_inputs(
        MatchObservations(
            possession_seconds={"home": 300.0, "away": 300.0},
            sequence_durations=[40.0] * 10,
            turnover_count=1,
            possession_changes=2,
            pass_attempts=100,
            elapsed_seconds=600.0,
        )
    )
    frantic = rhythm_inputs(
        MatchObservations(
            possession_seconds={"home": 300.0, "away": 300.0},
            sequence_durations=[2.0, 30.0, 4.0, 22.0],
            turnover_count=30,
            possession_changes=45,
            pass_attempts=400,
            passes_under_pressure=260,
            elapsed_seconds=600.0,
        )
    )
    assert game_rhythm(frantic) is GameRhythm.CHAOTIC
    assert game_rhythm(calm) in {GameRhythm.STRUCTURED, GameRhythm.FLUID}


# --- Expected goals -----------------------------------------------------------


def test_expected_goals_falls_with_distance():
    close = expected_goals(95.0, 34.0, TeamSide.HOME, [6.0])
    far = expected_goals(70.0, 34.0, TeamSide.HOME, [6.0])
    assert close > far
    assert 0.0 < far < close <= 1.0


def test_expected_goals_falls_with_defensive_pressure():
    free = expected_goals(95.0, 34.0, TeamSide.HOME, [20.0])
    crowded = expected_goals(95.0, 34.0, TeamSide.HOME, [0.5])
    assert crowded < free


# --- Match statistics ---------------------------------------------------------


def test_match_statistics_are_derived_from_the_event_log(simulated_matches):
    """The box score and the event log can never contradict each other."""
    engine = simulated_matches[SyntheticScenarioType.HIGH_POSSESSION]
    frame = engine.build_frame()
    events = engine.events.all()

    shot_events = [e for e in events if e.type.value == "shot"]
    pass_events = [e for e in events if e.type.value == "pass"]
    home_passes = [e for e in pass_events if e.team is TeamSide.HOME]
    home_completed = [e for e in home_passes if e.completed]

    assert frame.metrics.shotCount.home == len(shot_events)
    assert frame.metrics.passCompletion.home == pytest.approx(
        round(100.0 * len(home_completed) / len(home_passes), 2),
        abs=0.01,
    )
    assert frame.metrics.possessionShare.home + frame.metrics.possessionShare.away == pytest.approx(100.0)


def test_match_statistics_of_an_empty_log():
    stats = match_statistics([], {}, 0.0, 0.0)
    assert stats.possession_share == {"home": 50.0, "away": 50.0}
    assert stats.pass_completion == {"home": 0.0, "away": 0.0}
    assert stats.shot_count == {"home": 0, "away": 0}
