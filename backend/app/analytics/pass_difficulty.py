"""Pass Difficulty Rating (PDR) analytics (ADR 0001, ADR 0003, CONTEXT.md).

Calculates the canonical Pass Difficulty Rating across 5 domain components whose weights
strictly sum to 1.00:
- w_pressure: 0.25 (carrier defensive pressure from nearby opponents)
- w_distance: 0.20 (pass trajectory distance factor)
- w_interception: 0.25 (interception corridor risk and obstacle density)
- w_pitch_control: 0.15 (spatial control/contestedness at receiver destination)
- w_receiver_motion: 0.15 (relative kinematics and defender closing rate)
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from ..models import PassingLane

# 5 Canonical component weights summing strictly to 1.00
W_PRESSURE: float = 0.25
W_DISTANCE: float = 0.20
W_INTERCEPTION: float = 0.25
W_PITCH_CONTROL: float = 0.15
W_RECEIVER_MOTION: float = 0.15

COMPONENT_WEIGHTS: dict[str, float] = {
    "pressure": W_PRESSURE,
    "distance": W_DISTANCE,
    "interception": W_INTERCEPTION,
    "pitch_control": W_PITCH_CONTROL,
    "receiver_motion": W_RECEIVER_MOTION,
}

WEIGHT_SUM: float = round(
    W_PRESSURE + W_DISTANCE + W_INTERCEPTION + W_PITCH_CONTROL + W_RECEIVER_MOTION,
    6,
)
assert math.isclose(WEIGHT_SUM, 1.00, abs_tol=1e-6), (
    f"PDR component weights must sum to 1.00, got {WEIGHT_SUM}"
)


@dataclass(slots=True)
class PDRComponents:
    """The 5 canonical components of Pass Difficulty Rating (PDR), each normalized [0.0, 1.0]."""

    pressure: float
    distance: float
    interception: float
    pitch_control: float
    receiver_motion: float

    def as_dict(self) -> dict[str, float]:
        return {
            "pressure": round(self.pressure, 4),
            "distance": round(self.distance, 4),
            "interception": round(self.interception, 4),
            "pitch_control": round(self.pitch_control, 4),
            "receiver_motion": round(self.receiver_motion, 4),
        }


@dataclass(slots=True)
class PDRResult:
    """The evaluated Pass Difficulty Rating with breakdown."""

    score: float  # [0.0, 100.0]
    normalized: float  # [0.0, 1.0]
    components: PDRComponents
    weights: dict[str, float]


def calculate_pdr(
    pressure: float,
    distance: float,
    interception: float,
    pitch_control: float,
    receiver_motion: float,
    scale_100: bool = True,
) -> float:
    """Compute the Pass Difficulty Rating from 5 canonical components.

    Weights strictly sum to 1.00:
    0.25 * pressure + 0.20 * distance + 0.25 * interception + 0.15 * pitch_control + 0.15 * receiver_motion
    """
    p = max(0.0, min(1.0, float(pressure)))
    d = max(0.0, min(1.0, float(distance)))
    i = max(0.0, min(1.0, float(interception)))
    pc = max(0.0, min(1.0, float(pitch_control)))
    rm = max(0.0, min(1.0, float(receiver_motion)))

    raw = W_PRESSURE * p + W_DISTANCE * d + W_INTERCEPTION * i + W_PITCH_CONTROL * pc + W_RECEIVER_MOTION * rm
    clamped = max(0.0, min(1.0, raw))
    return round(clamped * 100.0, 2) if scale_100 else round(clamped, 4)


def compute_pdr_breakdown(
    pressure: float,
    distance: float,
    interception: float,
    pitch_control: float,
    receiver_motion: float,
) -> PDRResult:
    """Compute PDR and return full structured result with component breakdown."""
    score_100 = calculate_pdr(
        pressure, distance, interception, pitch_control, receiver_motion, scale_100=True
    )
    score_norm = calculate_pdr(
        pressure, distance, interception, pitch_control, receiver_motion, scale_100=False
    )
    components = PDRComponents(
        pressure=max(0.0, min(1.0, float(pressure))),
        distance=max(0.0, min(1.0, float(distance))),
        interception=max(0.0, min(1.0, float(interception))),
        pitch_control=max(0.0, min(1.0, float(pitch_control))),
        receiver_motion=max(0.0, min(1.0, float(receiver_motion))),
    )
    return PDRResult(
        score=score_100,
        normalized=score_norm,
        components=components,
        weights=dict(COMPONENT_WEIGHTS),
    )


def aggregate_pass_difficulty(lanes: list[PassingLane]) -> float:
    """Compute the weighted headline Pass Difficulty Rating across live passing lanes.

    Lanes are weighted by completion likelihood (1.0 - interceptionRisk).
    """
    if not lanes:
        return 0.0
    total_weight = 0.0
    weighted_sum = 0.0
    for lane in lanes:
        weight = max(0.05, 1.0 - float(lane.interceptionRisk))
        weighted_sum += float(lane.passDifficultyRating) * weight
        total_weight += weight
    if total_weight <= 0.0:
        return 0.0
    return round(weighted_sum / total_weight, 2)


__all__ = [
    "COMPONENT_WEIGHTS",
    "PDRComponents",
    "PDRResult",
    "WEIGHT_SUM",
    "W_DISTANCE",
    "W_INTERCEPTION",
    "W_PITCH_CONTROL",
    "W_PRESSURE",
    "W_RECEIVER_MOTION",
    "aggregate_pass_difficulty",
    "calculate_pdr",
    "compute_pdr_breakdown",
]
