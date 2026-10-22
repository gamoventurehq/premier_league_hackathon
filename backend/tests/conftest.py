"""Shared fixtures for the backend test suite.

The fixtures build *real* simulated matches: the tests assert on the numbers
the synthetic engine actually produces, never on hard coded expectations.
"""

from __future__ import annotations

import math
from pathlib import Path

import pytest
from app.models import SyntheticScenarioType, TeamSide
from app.simulation.engine import MatchEngine
from app.simulation.spatial import SimPlayer

#: The length of a full match in simulated seconds.
FULL_MATCH_SECONDS = 90 * 60

#: The TypeScript contract the backend has to mirror (ADR 0005).
CONTRACT_PATH = Path(__file__).resolve().parents[2] / "frontend" / "src" / "types" / "telemetry.ts"


@pytest.fixture
def engine() -> MatchEngine:
    """A fresh engine on the default Synthetic Match Scenario."""
    eng = MatchEngine(seed=20260922)
    eng.reset(SyntheticScenarioType.HIGH_POSSESSION, start_seconds=0.0, warmup_seconds=0.0)
    return eng


@pytest.fixture
def played_engine(engine: MatchEngine) -> MatchEngine:
    """The default scenario after twenty minutes of simulated match."""
    engine.fast_forward(20 * 60, dt=0.2)
    return engine


def make_player(
    player_id: str,
    x: float,
    y: float,
    team: TeamSide = TeamSide.HOME,
    role: str = "MF",
    vx: float = 0.0,
    vy: float = 0.0,
    max_sprint: float = 8.0,
) -> SimPlayer:
    """A single simulated player, for the geometry tests."""
    return SimPlayer(
        id=player_id,
        name=player_id.upper(),
        short_name=player_id.upper(),
        number=1,
        team=team,
        role=role,
        slot="mid",
        x=x,
        y=y,
        vx=vx,
        vy=vy,
        max_sprint=max_sprint,
    )


@pytest.fixture
def contract_path() -> Path:
    """The path of the canonical TypeScript contract."""
    if not CONTRACT_PATH.exists():
        pytest.skip(f"The TypeScript contract is not available at {CONTRACT_PATH}.")
    return CONTRACT_PATH


def mean(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def stdev(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    mu = mean(values)
    return math.sqrt(sum((v - mu) ** 2 for v in values) / len(values))


__all__ = [
    "CONTRACT_PATH",
    "FULL_MATCH_SECONDS",
    "contract_path",
    "engine",
    "make_player",
    "mean",
    "played_engine",
    "stdev",
]
