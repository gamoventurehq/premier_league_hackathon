"""Spatial geometry: Pitch Control surface and Passing Lane evaluation.

Implements ADR 0001 (physics based spatial telemetry) and ADR 0003 (metric
105m x 68m pitch, sprint-velocity derived Pitch Control).

Coordinate system (ADR 0003)::

    x -> 0 .. 105   (origin at the centre of the HOME goal line)
    y -> 0 .. 68    (origin at the HOME touchline)
    home attacks towards +x, away attacks towards -x

Pitch Control
-------------
For every cell of a 5m x 4m grid (21 x 17 = 357 cells) we compute, for every
player, the time it would take that player to reach the cell using their own
maximum sprint velocity::

    t_i = d_i / v_max_i

The player influence at the cell is a steep logistic kernel of that time
(the reciprocal-distance term of the classic model, expressed through the
sprint-scaled arrival time)::

    p_i = 1 / (1 + (t_i / T0)^3)

The team influence is the probability that *at least one* of the team's
players arrives before anybody else::

    P_team = 1 - prod_i (1 - p_i)

and the reported ``controlScore`` is ``P_home - P_away`` in ``[-1, 1]``.

Passing Lane
------------
A Passing Lane is the geometric corridor between a ball carrier and a
candidate receiver. It is evaluated with four CONTEXT.md components
(passer pressure, receiver coverage, trajectory distance, defender velocity
vectors) plus the corridor obstruction implied by the interceptor density.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field

import numpy as np

from ..models import PassingLane, PitchControlCell, PitchPosition, TeamSide

# --- Pitch geometry (ADR 0003) ------------------------------------------------
PITCH_LENGTH = 105.0
PITCH_WIDTH = 68.0
PITCH_CENTRE_X = PITCH_LENGTH / 2.0
PITCH_CENTRE_Y = PITCH_WIDTH / 2.0

#: Pitch Control grid - 5m x 4m cells.
CELL_SIZE_X = 5.0
CELL_SIZE_Y = 4.0
GRID_COLUMNS = int(PITCH_LENGTH / CELL_SIZE_X)  # 21
GRID_ROWS = int(PITCH_WIDTH / CELL_SIZE_Y)  # 17
CELL_COUNT = GRID_COLUMNS * GRID_ROWS  # 357

#: Goal mouth half width used for shot angle.
GOAL_HALF_WIDTH = 3.66

#: Metres of clearance either side of a Passing Lane that counts as an interceptor.
CORRIDOR_INTERCEPT_RADIUS = 1.5

#: Fraction of the corridor that is excluded from the interceptor count
#: (opponents standing on the passer are pressure, not interceptors).
CORRIDOR_START = 0.12

#: Reference maximum sprint velocity used for normalisation (m/s).
MAX_SPRINT_SPEED = 8.5

#: Logistic kernel scale of the Pitch Control influence function (seconds).
PITCH_CONTROL_T0 = 1.0

#: Cells whose |controlScore| is below this are reported as contested.
CONTESTED_THRESHOLD = 0.10

#: Players are kept this far from the touchline / goal line.
BOUNDARY_MARGIN = 1.0

HOME_GOAL = (0.0, PITCH_CENTRE_Y)
AWAY_GOAL = (PITCH_LENGTH, PITCH_CENTRE_Y)


@dataclass(slots=True)
class SimPlayer:
    """A single simulated footballer (the engine's internal representation)."""

    id: str
    name: str
    short_name: str
    number: int
    team: TeamSide
    role: str
    slot: str
    x: float
    y: float
    vx: float = 0.0
    vy: float = 0.0
    max_sprint: float = 7.6
    home_x: float = 0.0
    home_y: float = 0.0
    distance_meters: float = 0.0
    touches: int = 0
    passes_attempted: int = 0
    passes_completed: int = 0
    shots: int = 0
    goals: int = 0
    turnovers_lost: int = 0
    top_speed_kmh: float = 0.0
    on_ball: bool = False
    is_designated_player_cam: bool = False
    _anchor_offset: tuple[float, float] = field(default=(0.0, 0.0), repr=False)

    @property
    def speed_kmh(self) -> float:
        return math.hypot(self.vx, self.vy) * 3.6

    @property
    def position(self) -> tuple[float, float]:
        return (self.x, self.y)


# --- helpers -------------------------------------------------------------------


def attack_direction(team: TeamSide) -> int:
    """+1 for home (attacks towards +x), -1 for away."""
    return 1 if team is TeamSide.HOME else -1


def target_goal(team: TeamSide) -> tuple[float, float]:
    """The goal a side attacks."""
    return AWAY_GOAL if team is TeamSide.HOME else HOME_GOAL


def own_goal(team: TeamSide) -> tuple[float, float]:
    """The goal a side defends."""
    return HOME_GOAL if team is TeamSide.HOME else AWAY_GOAL


def distance(ax: float, ay: float, bx: float, by: float) -> float:
    return math.hypot(ax - bx, ay - by)


def reflect(value: float, low: float, high: float, margin: float) -> float:
    """Reflect a coordinate back inside the pitch instead of clamping it.

    A hard clamp parks players on the touchline; a reflection keeps momentum.
    """
    lo, hi = margin, high - margin
    span = hi - lo
    if span <= 0:
        return lo
    if value < lo:
        over = lo - value
        value = lo + (over % span) if over > span else lo + over
        return value
    if value > hi:
        over = value - hi
        value = hi - (over % span) if over > span else hi - over
        return value
    return value


def reflect_velocity(value: float, position: float, low: float, high: float, margin: float) -> float:
    """Reflect a velocity component when a player is at the boundary.

    The velocity is only reversed when the player is actually *at* the
    boundary and moving out of it. Reversing it unconditionally would damp
    every movement in the match.
    """
    lo, hi = margin, high - margin
    if position <= lo and value < 0.0:
        return -value * 0.6
    if position >= hi and value > 0.0:
        return -value * 0.6
    return value


def point_to_segment_distance(
    px: float, py: float, ax: float, ay: float, bx: float, by: float
) -> tuple[float, float, float]:
    """Distance from a point to a segment, plus the projection parameter and
    the signed perpendicular offset."""
    dx, dy = bx - ax, by - ay
    length_sq = dx * dx + dy * dy
    if length_sq < 1e-9:
        return math.hypot(px - ax, py - ay), 0.0, 0.0
    t = ((px - ax) * dx + (py - ay) * dy) / length_sq
    tc = max(0.0, min(1.0, t))
    proj_x = ax + tc * dx
    proj_y = ay + tc * dy
    perp = math.hypot(px - proj_x, py - proj_y)
    signed = (px - proj_x) * (-dy) + (py - proj_y) * dx
    signed = signed / math.sqrt(length_sq)
    return perp, t, signed


# --- Pitch Control -------------------------------------------------------------


def cell_centres() -> np.ndarray:
    """The (357, 2) array of Pitch Control cell centres."""
    xs = (np.arange(GRID_COLUMNS) + 0.5) * CELL_SIZE_X
    ys = (np.arange(GRID_ROWS) + 0.5) * CELL_SIZE_Y
    grid_x, grid_y = np.meshgrid(xs, ys, indexing="ij")
    return np.stack([grid_x.ravel(), grid_y.ravel()], axis=1)


_CELL_CENTRES = cell_centres()


def _team_influence(positions: np.ndarray, max_speeds: np.ndarray) -> np.ndarray:
    """Probability that at least one player of a team reaches a cell first."""
    if positions.size == 0:
        return np.zeros(CELL_COUNT)
    deltas = _CELL_CENTRES[:, None, :] - positions[None, :, :]
    dists = np.sqrt(np.sum(deltas * deltas, axis=2))
    times = dists / np.maximum(max_speeds[None, :], 0.1)
    kernel = 1.0 / (1.0 + (times / PITCH_CONTROL_T0) ** 3)
    return 1.0 - np.prod(1.0 - kernel, axis=1)


def pitch_control_surface(players: list[SimPlayer]) -> list[PitchControlCell]:
    """The Pitch Control probability surface for the given player positions."""
    home = [p for p in players if p.team is TeamSide.HOME]
    away = [p for p in players if p.team is TeamSide.AWAY]

    home_pos = np.array([[p.x, p.y] for p in home], dtype=float) if home else np.empty((0, 2))
    away_pos = np.array([[p.x, p.y] for p in away], dtype=float) if away else np.empty((0, 2))
    home_spd = np.array([p.max_sprint for p in home], dtype=float) if home else np.empty((0,))
    away_spd = np.array([p.max_sprint for p in away], dtype=float) if away else np.empty((0,))

    home_inf = _team_influence(home_pos, home_spd)
    away_inf = _team_influence(away_pos, away_spd)
    scores = home_inf - away_inf

    return [
        PitchControlCell(
            x=round(float(_CELL_CENTRES[i][0]), 2),
            y=round(float(_CELL_CENTRES[i][1]), 2),
            controlScore=round(float(scores[i]), 4),
            homeWeight=round(float(home_inf[i]), 4),
            awayWeight=round(float(away_inf[i]), 4),
        )
        for i in range(CELL_COUNT)
    ]


def pitch_control_percentages(cells: list[PitchControlCell]) -> dict[str, float]:
    """Derive the home / away / contested split from the Pitch Control cells."""
    home = away = contested = 0
    for cell in cells:
        if cell.controlScore > CONTESTED_THRESHOLD:
            home += 1
        elif cell.controlScore < -CONTESTED_THRESHOLD:
            away += 1
        else:
            contested += 1
    total = max(1, len(cells))
    return {
        "home": round(100.0 * home / total, 2),
        "away": round(100.0 * away / total, 2),
        "contested": round(100.0 * contested / total, 2),
    }


# --- Passing Lane geometry -----------------------------------------------------


def passer_pressure(passer: SimPlayer, opponents: list[SimPlayer]) -> float:
    """0..1 pressure applied to the carrier by the nearest opponents."""
    if not opponents:
        return 0.0
    nearest = min(distance(passer.x, passer.y, o.x, o.y) for o in opponents)
    proximity = max(0.0, 1.0 - nearest / 12.0)
    crowding = sum(1 for o in opponents if distance(passer.x, passer.y, o.x, o.y) <= 2.5)
    density = min(1.0, crowding / 3.0)
    return round(min(1.0, 0.6 * proximity + 0.4 * density), 4)


def receiver_coverage(receiver: SimPlayer, opponents: list[SimPlayer]) -> float:
    """0..1 coverage the opposition applies around the candidate receiver."""
    if not opponents:
        return 0.0
    nearest = min(distance(receiver.x, receiver.y, o.x, o.y) for o in opponents)
    proximity = max(0.0, 1.0 - nearest / 10.0)
    crowding = sum(1 for o in opponents if distance(receiver.x, receiver.y, o.x, o.y) <= 4.0)
    density = min(1.0, crowding / 3.0)
    return round(min(1.0, 0.6 * proximity + 0.4 * density), 4)


def defender_velocity_alignment(passer: SimPlayer, receiver: SimPlayer, opponents: list[SimPlayer]) -> float:
    """0..1 closing rate of the opposition onto the pass axis.

    Each opponent velocity vector is projected onto the pass axis: the
    component that reduces the perpendicular distance to the lane is the
    "closing rate". A defender sprinting at the lane from close range scores
    close to 1.
    """
    if not opponents:
        return 0.0
    dx = receiver.x - passer.x
    dy = receiver.y - passer.y
    length = math.hypot(dx, dy)
    if length < 1e-6:
        return 0.0
    ux, uy = dx / length, dy / length
    # Left-hand normal of the pass axis.
    nx, ny = -uy, ux

    best = 0.0
    for opp in opponents:
        perp, t, signed = point_to_segment_distance(opp.x, opp.y, passer.x, passer.y, receiver.x, receiver.y)
        if t < 0.05 or t > 1.0:
            continue
        toward = -math.copysign(1.0, signed) * (opp.vx * nx + opp.vy * ny)
        closing = max(0.0, toward)
        alignment = min(1.0, closing / 3.0)
        proximity = max(0.0, 1.0 - perp / 25.0)
        best = max(best, alignment * proximity)
    return round(best, 4)


def corridor_geometry(
    passer: SimPlayer, receiver: SimPlayer, opponents: list[SimPlayer]
) -> tuple[float, int]:
    """Clear corridor width across the pass axis and the interceptor count.

    The corridor width is the free channel perpendicular to the pass axis
    between the two closest opponents flanking the lane. An opponent inside
    ``CORRIDOR_INTERCEPT_RADIUS`` of the axis obstructs it, and the clear width
    collapses to twice that perpendicular distance.

    Opponents standing on top of the passer are a *pressure* problem rather
    than an interception problem, so the first 10% of the corridor is
    excluded from the interceptor count.
    """
    dx = receiver.x - passer.x
    dy = receiver.y - passer.y
    length = math.hypot(dx, dy)
    if length < 1e-6:
        return 12.0, 0

    nearest_positive: float | None = None
    nearest_negative: float | None = None
    interceptors = 0
    obstructing: list[float] = []

    for opp in opponents:
        perp, t, signed = point_to_segment_distance(opp.x, opp.y, passer.x, passer.y, receiver.x, receiver.y)
        if t < 0.05 or t > 1.0:
            continue
        if signed >= 0:
            nearest_positive = perp if nearest_positive is None else min(nearest_positive, perp)
        else:
            nearest_negative = -perp if nearest_negative is None else min(nearest_negative, perp)
        if t >= CORRIDOR_START and perp <= CORRIDOR_INTERCEPT_RADIUS:
            interceptors += 1
            obstructing.append(perp)

    if nearest_positive is not None and nearest_negative is not None:
        width = nearest_positive + nearest_negative
    elif nearest_positive is not None:
        width = nearest_positive + 2.0 * CORRIDOR_INTERCEPT_RADIUS
    elif nearest_negative is not None:
        width = nearest_negative + 2.0 * CORRIDOR_INTERCEPT_RADIUS
    else:
        width = 12.0

    if obstructing:
        width = min(width, 2.0 * min(obstructing))

    return round(max(0.0, min(12.0, width)), 3), interceptors


def trajectory_score(passer: SimPlayer, receiver: SimPlayer) -> float:
    """0..1 difficulty contributed by the length of the pass trajectory."""
    length = distance(passer.x, passer.y, receiver.x, receiver.y)
    return round(min(1.0, length / 40.0), 4)


def evaluate_lane(
    passer: SimPlayer,
    receiver: SimPlayer,
    opponents: list[SimPlayer],
    interception_bias: float = 1.0,
) -> PassingLane:
    """Evaluate a full Passing Lane between a carrier and a candidate receiver.

    ``interception_bias`` is the scenario specific multiplier of the
    interception risk (a low block concedes less, a scramble more).
    """
    pressure = passer_pressure(passer, opponents)
    coverage = receiver_coverage(receiver, opponents)
    trajectory = trajectory_score(passer, receiver)
    alignment = defender_velocity_alignment(passer, receiver, opponents)
    width, interceptors = corridor_geometry(passer, receiver, opponents)

    obstruction = round(min(1.0, 0.6 * min(1.0, interceptors / 3.0) + 0.4 * max(0.0, 1.0 - width / 12.0)), 4)

    # CONTEXT.md composite: passer pressure, receiver coverage, trajectory
    # distance and defender velocity vectors (plus the implied corridor
    # obstruction from the interceptor density).
    pdr = 100.0 * (
        0.24 * pressure + 0.24 * coverage + 0.16 * trajectory + 0.20 * alignment + 0.16 * obstruction
    )
    pdr = round(max(0.0, min(100.0, pdr)), 2)

    risk = 0.06 + 0.45 * min(1.0, interceptors / 2.0) + 0.18 * alignment - 0.015 * width
    # The scenario bias is a multiplier on the interception risk, damped so a
    # scramble does not make every pass impossible.
    bias_factor = 1.0 + (interception_bias - 1.0) * 0.55
    risk = round(max(0.02, min(0.92, risk * bias_factor)), 4)

    return PassingLane(
        passerId=passer.id,
        receiverId=receiver.id,
        passerPos=PitchPosition(x=round(passer.x, 2), y=round(passer.y, 2)),
        receiverPos=PitchPosition(x=round(receiver.x, 2), y=round(receiver.y, 2)),
        interceptionRisk=risk,
        passDifficultyRating=pdr,
        isClear=risk < 0.35 and interceptors == 0,
        corridorWidthM=width,
        interceptorCount=interceptors,
        passerPressure=pressure,
        receiverCoverage=coverage,
        defenderVelocityAlignment=alignment,
    )


def lane_weight(lane: PassingLane) -> float:
    """Weight used to aggregate the Pass Difficulty Rating of the live lanes.

    A lane the team is unlikely to complete still represents attempted
    volume, so the aggregate is weighted by the expected value of the attempt
    rather than by a flat mean.
    """
    return max(0.05, 1.0 - lane.interceptionRisk)


__all__ = [
    "AWAY_GOAL",
    "BOUNDARY_MARGIN",
    "CELL_COUNT",
    "CELL_SIZE_X",
    "CELL_SIZE_Y",
    "CONTESTED_THRESHOLD",
    "CORRIDOR_INTERCEPT_RADIUS",
    "GOAL_HALF_WIDTH",
    "GRID_COLUMNS",
    "GRID_ROWS",
    "HOME_GOAL",
    "MAX_SPRINT_SPEED",
    "PITCH_CONTROL_T0",
    "PITCH_CENTRE_X",
    "PITCH_CENTRE_Y",
    "PITCH_LENGTH",
    "PITCH_WIDTH",
    "PitchControlCell",
    "SimPlayer",
    "attack_direction",
    "cell_centres",
    "corridor_geometry",
    "defender_velocity_alignment",
    "distance",
    "evaluate_lane",
    "lane_weight",
    "own_goal",
    "passer_pressure",
    "pitch_control_percentages",
    "pitch_control_surface",
    "point_to_segment_distance",
    "receiver_coverage",
    "reflect",
    "reflect_velocity",
    "target_goal",
    "trajectory_score",
]
