"""Synthetic match simulation: spatial geometry, derived metrics and the engine."""

from .engine import SCENARIO_ORDER, SCENARIOS, MatchEngine, ScenarioProfile
from .metrics import (
    aggregate_pass_difficulty,
    control_vs_chaos_index,
    format_match_clock,
    game_rhythm,
    match_statistics,
)
from .spatial import (
    SimPlayer,
    evaluate_lane,
    pitch_control_percentages,
    pitch_control_surface,
)

__all__ = [
    "SCENARIOS",
    "SCENARIO_ORDER",
    "MatchEngine",
    "ScenarioProfile",
    "SimPlayer",
    "aggregate_pass_difficulty",
    "control_vs_chaos_index",
    "evaluate_lane",
    "format_match_clock",
    "game_rhythm",
    "match_statistics",
    "pitch_control_percentages",
    "pitch_control_surface",
]
