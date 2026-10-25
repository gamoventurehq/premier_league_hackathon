"""Canonical Pitch Control probability surface analytics (ADR 0001, ADR 0003).

Produces the canonical 357-cell probability surface over a 17x21 grid (21 columns x 17 rows)
on a 105m x 68m pitch. Every cell has arrival probabilities strictly bounded in [0.0, 1.0].
"""

from __future__ import annotations

from typing import Any

import numpy as np

from ..models import PitchControlCell, TeamSide

# Pitch Geometry
PITCH_LENGTH: float = 105.0
PITCH_WIDTH: float = 68.0
PITCH_CENTRE_X: float = PITCH_LENGTH / 2.0
PITCH_CENTRE_Y: float = PITCH_WIDTH / 2.0

# 5m x 4m grid cells -> 21 columns x 17 rows = 357 cells
CELL_SIZE_X: float = 5.0
CELL_SIZE_Y: float = 4.0
GRID_COLUMNS: int = int(PITCH_LENGTH / CELL_SIZE_X)  # 21
GRID_ROWS: int = int(PITCH_WIDTH / CELL_SIZE_Y)  # 17
CELL_COUNT: int = GRID_COLUMNS * GRID_ROWS  # 357

MAX_SPRINT_SPEED: float = 8.5
PITCH_CONTROL_T0: float = 1.0
CONTESTED_THRESHOLD: float = 0.10


def cell_centres() -> np.ndarray:
    """The (357, 2) array of cell centres (21 columns x 17 rows)."""
    xs = (np.arange(GRID_COLUMNS) + 0.5) * CELL_SIZE_X
    ys = (np.arange(GRID_ROWS) + 0.5) * CELL_SIZE_Y
    grid_x, grid_y = np.meshgrid(xs, ys, indexing="ij")
    return np.stack([grid_x.ravel(), grid_y.ravel()], axis=1)


_CELL_CENTRES = cell_centres()


def compute_team_influence(positions: np.ndarray, max_speeds: np.ndarray) -> np.ndarray:
    """Calculate arrival probability for each of the 357 cells.

    Returns an array of probabilities in [0.0, 1.0].
    """
    if positions.size == 0:
        return np.zeros(CELL_COUNT, dtype=float)
    deltas = _CELL_CENTRES[:, None, :] - positions[None, :, :]
    dists = np.sqrt(np.sum(deltas * deltas, axis=2))
    times = dists / np.maximum(max_speeds[None, :], 0.1)
    kernel = 1.0 / (1.0 + (times / PITCH_CONTROL_T0) ** 3)
    influence = 1.0 - np.prod(1.0 - kernel, axis=1)
    return np.clip(influence, 0.0, 1.0)


def calculate_pitch_control_surface(players: list[Any]) -> list[PitchControlCell]:
    """Compute the canonical 357-cell Pitch Control surface.

    Each cell contains:
    - x, y: pitch coordinates of cell centre
    - controlScore: homeWeight - awayWeight in [-1.0, 1.0]
    - homeWeight: home arrival probability in [0.0, 1.0]
    - awayWeight: away arrival probability in [0.0, 1.0]
    """
    home = [
        p for p in players if getattr(p, "team", None) is TeamSide.HOME or getattr(p, "team", None) == "home"
    ]
    away = [
        p for p in players if getattr(p, "team", None) is TeamSide.AWAY or getattr(p, "team", None) == "away"
    ]

    home_pos = np.array([[float(p.x), float(p.y)] for p in home], dtype=float) if home else np.empty((0, 2))
    away_pos = np.array([[float(p.x), float(p.y)] for p in away], dtype=float) if away else np.empty((0, 2))
    home_spd = (
        np.array([float(getattr(p, "max_sprint", MAX_SPRINT_SPEED)) for p in home], dtype=float)
        if home
        else np.empty((0,))
    )
    away_spd = (
        np.array([float(getattr(p, "max_sprint", MAX_SPRINT_SPEED)) for p in away], dtype=float)
        if away
        else np.empty((0,))
    )

    home_inf = compute_team_influence(home_pos, home_spd)
    away_inf = compute_team_influence(away_pos, away_spd)
    scores = np.clip(home_inf - away_inf, -1.0, 1.0)

    cells: list[PitchControlCell] = []
    for i in range(CELL_COUNT):
        cells.append(
            PitchControlCell(
                x=round(float(_CELL_CENTRES[i][0]), 2),
                y=round(float(_CELL_CENTRES[i][1]), 2),
                controlScore=round(float(scores[i]), 4),
                homeWeight=round(float(home_inf[i]), 4),
                awayWeight=round(float(away_inf[i]), 4),
            )
        )
    return cells


def pitch_control_surface(players: list[Any]) -> list[PitchControlCell]:
    """Alias for calculate_pitch_control_surface for drop-in interoperability."""
    return calculate_pitch_control_surface(players)


def calculate_pitch_control_percentages(cells: list[PitchControlCell]) -> dict[str, float]:
    """Derive home / away / contested percentages from Pitch Control cells."""
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


def pitch_control_percentages(cells: list[PitchControlCell]) -> dict[str, float]:
    """Alias for calculate_pitch_control_percentages."""
    return calculate_pitch_control_percentages(cells)


__all__ = [
    "CELL_COUNT",
    "CELL_SIZE_X",
    "CELL_SIZE_Y",
    "CONTESTED_THRESHOLD",
    "GRID_COLUMNS",
    "GRID_ROWS",
    "MAX_SPRINT_SPEED",
    "PITCH_CENTRE_X",
    "PITCH_CENTRE_Y",
    "PITCH_CONTROL_T0",
    "PITCH_LENGTH",
    "PITCH_WIDTH",
    "calculate_pitch_control_percentages",
    "calculate_pitch_control_surface",
    "cell_centres",
    "compute_team_influence",
    "pitch_control_percentages",
    "pitch_control_surface",
]
