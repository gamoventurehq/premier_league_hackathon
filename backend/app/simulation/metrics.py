"""Derived match metrics: Pass Difficulty Rating, Control vs. Chaos Index,
Game Rhythm, expected goals and match statistics.

Every metric here is derived from observable match state (events, possession
sequences, spatial pressure) - none of them is a hard coded constant. The
Synthetic Match Scenario shapes the *data* that the metrics are computed
from, which is why the four scenarios produce materially different readings.
"""

from __future__ import annotations

import math
import statistics
from dataclasses import dataclass, field

from ..models import GameRhythm, MatchEvent, MatchEventType, PassingLane, TeamSide
from .spatial import GOAL_HALF_WIDTH, distance, lane_weight, target_goal

# --- Clock ---------------------------------------------------------------------

MATCH_LENGTH_SECONDS = 90 * 60

#: Normalisation scales of the observable signals. They are calibrated against
#: the Synthetic Match Scenarios: a Premier League side makes roughly 20
#: passes per minute of possession, turns the ball over about once every two
#: minutes and its possession sequences vary by a coefficient of variation of
#: roughly 0.8.
SEQUENCE_VARIABILITY_SCALE = 1.8
TURNOVER_RATE_SCALE = 2.5
TRANSITION_RATE_SCALE = 5.0
TEMPO_SCALE = 35.0

#: The transition rate of the Game Rhythm: a match that changes hands more
#: than five times a minute is transitioning rather than flowing.
RHYTHM_TRANSITION_SCALE = 5.0

#: Upper bounds of the four Game Rhythms on the weighted rhythm score. The
#: score is a weighted blend of four signals that are themselves normalised
#: against Premier League reference values, so the bounds are the points at
#: which a match stops reading as structured, fluid, transitional or chaotic.
RHYTHM_THRESHOLDS = (0.29, 0.40, 0.54)


def format_match_clock(match_seconds: float) -> str:
    """Render the authoritative match clock as ``mm:ss``.

    The accumulator is the single source of truth; the string is a pure
    function of it, so ``68:59`` rolls over to ``69:00`` and never produces
    an invalid value such as ``68:60``.
    """
    total = int(max(0.0, match_seconds))
    minutes, seconds = divmod(total, 60)
    return f"{minutes:02d}:{seconds:02d}"


# --- Pass Difficulty Rating ----------------------------------------------------


def aggregate_pass_difficulty(lanes: list[PassingLane]) -> float:
    """The headline Pass Difficulty Rating - the weighted mean of the live lanes.

    The weight of a lane is its expected value (``1 - interceptionRisk``); the
    result is therefore a genuine weighted mean of the rows shown to the
    viewer, so the headline and the lane list can never disagree.
    """
    if not lanes:
        return 0.0
    total_weight = 0.0
    total = 0.0
    for lane in lanes:
        weight = lane_weight(lane)
        total += lane.passDifficultyRating * weight
        total_weight += weight
    if total_weight <= 0.0:
        return 0.0
    return round(total / total_weight, 2)


# --- Expected goals ------------------------------------------------------------


def expected_goals(
    shooter_x: float,
    shooter_y: float,
    team: TeamSide,
    defender_distances: list[float],
) -> float:
    """xG from shot distance, angle and the proximity of the defending players."""
    goal_x, goal_y = target_goal(team)
    dist = distance(shooter_x, shooter_y, goal_x, goal_y)
    lateral = abs(shooter_y - goal_y)
    # Angle of the shot as seen from the shooter's position.
    angle = math.atan2(GOAL_HALF_WIDTH, max(0.5, dist)) * 2.0
    angle_factor = min(1.0, angle / 0.7)
    distance_factor = math.exp(-dist / 9.5)
    closeness = min(1.0, min(defender_distances) / 6.0) if defender_distances else 1.0
    xg = 0.83 * distance_factor * angle_factor * (0.45 + 0.55 * closeness)
    if lateral > 22.0:
        xg *= 0.55
    return round(max(0.01, min(0.92, xg)), 4)


# --- Observable match statistics -----------------------------------------------


@dataclass(slots=True)
class MatchObservations:
    """The observable signal the derived metrics are computed from."""

    possession_seconds: dict[str, float] = field(default_factory=dict)
    sequence_durations: list[float] = field(default_factory=list)
    turnover_count: int = 0
    possession_changes: int = 0
    pass_attempts: int = 0
    passes_under_pressure: int = 0
    completed_passes: int = 0
    loose_balls: int = 0
    pass_speeds: list[float] = field(default_factory=list)
    shots: int = 0
    duels: int = 0
    elapsed_seconds: float = 0.0

    @property
    def minutes(self) -> float:
        return max(0.05, self.elapsed_seconds / 60.0)


@dataclass(slots=True)
class ChaosInputs:
    """Normalised, observable inputs of the Control vs. Chaos Index."""

    sequence_variability: float
    turnover_rate: float
    transition_rate: float
    pressure_share: float

    def as_dict(self) -> dict[str, float]:
        return {
            "sequence_variability": self.sequence_variability,
            "turnover_rate": self.turnover_rate,
            "transition_rate": self.transition_rate,
            "pressure_share": self.pressure_share,
        }


@dataclass(slots=True)
class RhythmInputs:
    """Normalised, observable inputs of the Game Rhythm."""

    sequence_variability: float
    transition_rate: float
    tempo: float
    pressure_share: float

    def as_dict(self) -> dict[str, float]:
        return {
            "sequence_variability": self.sequence_variability,
            "transition_rate": self.transition_rate,
            "tempo": self.tempo,
            "pressure_share": self.pressure_share,
        }


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def _sequence_variability(durations: list[float]) -> float:
    """Normalised dispersion of the possession sequence durations."""
    if len(durations) < 2:
        return 0.0
    mean = statistics.fmean(durations)
    if mean <= 0.0:
        return 0.0
    cv = statistics.pstdev(durations) / mean
    return _clamp01(cv / SEQUENCE_VARIABILITY_SCALE)


def chaos_inputs(observations: MatchObservations) -> ChaosInputs:
    """Derive the normalised chaos inputs from the observed match state."""
    variability = _sequence_variability(observations.sequence_durations)
    turnover_rate = _clamp01((observations.turnover_count / observations.minutes) / TURNOVER_RATE_SCALE)
    transition_rate = _clamp01((observations.possession_changes / observations.minutes) / TRANSITION_RATE_SCALE)
    pressure_share = (
        observations.passes_under_pressure / observations.pass_attempts if observations.pass_attempts else 0.0
    )
    return ChaosInputs(
        sequence_variability=variability,
        turnover_rate=turnover_rate,
        transition_rate=transition_rate,
        pressure_share=_clamp01(pressure_share),
    )


def rhythm_inputs(observations: MatchObservations) -> RhythmInputs:
    """Derive the normalised Game Rhythm inputs from the observed match state."""
    variability = _sequence_variability(observations.sequence_durations)
    transition_rate = _clamp01(
        (observations.possession_changes / observations.minutes) / RHYTHM_TRANSITION_SCALE
    )
    possession_time = sum(observations.possession_seconds.values()) or 1.0
    passes_per_minute = (observations.pass_attempts / (possession_time / 60.0)) if possession_time else 0.0
    tempo = _clamp01(passes_per_minute / TEMPO_SCALE)
    pressure_share = (
        observations.passes_under_pressure / observations.pass_attempts if observations.pass_attempts else 0.0
    )
    return RhythmInputs(
        sequence_variability=variability,
        transition_rate=transition_rate,
        tempo=tempo,
        pressure_share=_clamp01(pressure_share),
    )


def control_vs_chaos_index(inputs: ChaosInputs) -> float:
    """Control vs. Chaos Index - 0 (ultra structured possession) to 100 (chaos).

    The index is a weighted blend of the observable volatility signals: the
    dispersion of possession sequence durations, the turnover rate, the
    transition rate and the share of passes made under pressure.
    """
    score = (
        0.28 * inputs.sequence_variability
        + 0.30 * inputs.turnover_rate
        + 0.22 * inputs.transition_rate
        + 0.20 * inputs.pressure_share
    )
    return round(_clamp01(score) * 100.0, 2)


def game_rhythm(inputs: RhythmInputs) -> GameRhythm:
    """Map the observable pacing signals onto the four canonical rhythms."""
    # The Game Rhythm is about the pace and the flow of the match: the tempo
    # and the transition rate carry the most weight, the dispersion of the
    # possession sequences the least (that is what the Control vs. Chaos
    # Index measures).
    score = (
        0.10 * inputs.sequence_variability
        + 0.30 * inputs.transition_rate
        + 0.40 * inputs.tempo
        + 0.20 * inputs.pressure_share
    )
    if score < RHYTHM_THRESHOLDS[0]:
        return GameRhythm.STRUCTURED
    if score < RHYTHM_THRESHOLDS[1]:
        return GameRhythm.FLUID
    if score < RHYTHM_THRESHOLDS[2]:
        return GameRhythm.TRANSITIONAL
    return GameRhythm.CHAOTIC


# --- Match statistics derived from the event log -------------------------------


@dataclass(slots=True)
class MatchStatistics:
    possession_share: dict[str, float]
    pass_completion: dict[str, float]
    shot_count: dict[str, int]
    duel_count: int
    top_sprint_kmh: float
    ball_progression_m: float
    pass_attempts: dict[str, int]
    completed_passes: dict[str, int]


def match_statistics(
    events: list[MatchEvent],
    possession_seconds: dict[str, float],
    top_sprint_kmh: float,
    ball_progression_m: float,
) -> MatchStatistics:
    """Derive the box-score style statistics *from the event log*.

    The headline numbers and the event rows are produced by the same code
    path, so ``metrics.shotCount`` and ``metrics.passCompletion`` can never
    contradict ``events[]``.
    """
    attempts = {TeamSide.HOME: 0, TeamSide.AWAY: 0}
    completions = {TeamSide.HOME: 0, TeamSide.AWAY: 0}
    shots = {TeamSide.HOME: 0, TeamSide.AWAY: 0}
    duels = 0

    for event in events:
        if event.type is MatchEventType.PASS:
            side = event.team
            if side is None:
                continue
            attempts[side] += 1
            if event.completed:
                completions[side] += 1
        elif event.type is MatchEventType.SHOT:
            side = event.team
            if side is not None:
                shots[side] += 1
        elif event.type is MatchEventType.DUEL:
            duels += 1

    total_possession = sum(possession_seconds.values())
    if total_possession <= 0.0:
        home_share = away_share = 50.0
    else:
        home_share = round(100.0 * possession_seconds.get("home", 0.0) / total_possession, 2)
        away_share = round(100.0 - home_share, 2)

    def completion(side: TeamSide) -> float:
        if not attempts[side]:
            return 0.0
        return round(100.0 * completions[side] / attempts[side], 2)

    return MatchStatistics(
        possession_share={"home": home_share, "away": away_share},
        pass_completion={"home": completion(TeamSide.HOME), "away": completion(TeamSide.AWAY)},
        shot_count={"home": shots[TeamSide.HOME], "away": shots[TeamSide.AWAY]},
        duel_count=duels,
        top_sprint_kmh=round(top_sprint_kmh, 1),
        ball_progression_m=round(ball_progression_m, 1),
        pass_attempts={side.value: attempts[side] for side in attempts},
        completed_passes={side.value: completions[side] for side in completions},
    )


__all__ = [
    "ChaosInputs",
    "MATCH_LENGTH_SECONDS",
    "MatchObservations",
    "MatchStatistics",
    "RhythmInputs",
    "aggregate_pass_difficulty",
    "chaos_inputs",
    "control_vs_chaos_index",
    "expected_goals",
    "format_match_clock",
    "game_rhythm",
    "lane_weight",
    "match_statistics",
    "rhythm_inputs",
]
