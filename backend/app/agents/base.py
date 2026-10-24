"""Agent framework primitives: the shared tactical state blackboard and the
agent contract (ADR 0002 and ADR 0006).

The four agents of the swarm never talk to each other directly. They read and
write a single, typed, shared tactical state - the blackboard - and every read
and write is recorded so the emitted :class:`AgentTrace` is genuine evidence
of the multi-agent architecture rather than a static list.
"""

from __future__ import annotations

import threading
from dataclasses import dataclass, field
from typing import Any, Protocol, runtime_checkable

from ..models import AgentRole, AgentStatus, AgentTrace, ExperiencePersona, TelemetryFrame

# --- Blackboard keys ------------------------------------------------------------

K_MATCH_CLOCK = "match_clock"
K_MATCH_SECONDS = "match_seconds"
K_SCENARIO = "scenario"
K_SCORE = "score"
K_BALL = "ball_state"
K_PLAYER_POSITIONS = "player_positions"
K_POSSESSION = "possession"
K_PITCH_CONTROL_HOME = "pitch_control_home"
K_PITCH_CONTROL_AWAY = "pitch_control_away"
K_PITCH_CONTROL_CONTESTED = "pitch_control_contested"
K_PASSING_LANES = "passing_lanes"
K_MATCH_EVENTS = "match_events"
K_FAST_PATH_METRICS = "fast_path_metrics"

K_CONTROL_VS_CHAOS = "control_vs_chaos"
K_GAME_RHYTHM = "game_rhythm"
K_PASS_DIFFICULTY_RATING = "pass_difficulty_rating"
K_TACTICAL_PHASE = "tactical_phase"
K_INFLECTION_CANDIDATES = "inflection_candidates"
K_KEY_PLAYERS = "key_players"

K_NARRATIVE_ARC = "narrative_arc"
K_MULTILINGUAL_STREAM = "multilingual_stream"
K_NARRATIVE = "narrative"
K_COMMENTATOR_CUE = "commentator_cue"

K_ANALYST_CONTEXT = "analyst_context"
K_CASUAL_CONTEXT = "casual_context"
K_CLUB_CENTRIC_CONTEXT = "club_centric_context"
K_PLAYER_CAM_CONTEXT = "player_cam_context"

ALL_KEYS: tuple[str, ...] = (
    K_MATCH_CLOCK,
    K_MATCH_SECONDS,
    K_SCENARIO,
    K_SCORE,
    K_BALL,
    K_PLAYER_POSITIONS,
    K_POSSESSION,
    K_PITCH_CONTROL_HOME,
    K_PITCH_CONTROL_AWAY,
    K_PITCH_CONTROL_CONTESTED,
    K_PASSING_LANES,
    K_MATCH_EVENTS,
    K_FAST_PATH_METRICS,
    K_CONTROL_VS_CHAOS,
    K_GAME_RHYTHM,
    K_PASS_DIFFICULTY_RATING,
    K_TACTICAL_PHASE,
    K_INFLECTION_CANDIDATES,
    K_KEY_PLAYERS,
    K_NARRATIVE_ARC,
    K_MULTILINGUAL_STREAM,
    K_NARRATIVE,
    K_COMMENTATOR_CUE,
    K_ANALYST_CONTEXT,
    K_CASUAL_CONTEXT,
    K_CLUB_CENTRIC_CONTEXT,
    K_PLAYER_CAM_CONTEXT,
)


class Blackboard:
    """The shared tactical state of the swarm (ADR 0002)."""

    def __init__(self) -> None:
        self._values: dict[str, Any] = {}
        self._version = 0
        self._lock = threading.RLock()

    def read(self, key: str) -> Any:
        with self._lock:
            return self._values.get(key)

    def write(self, key: str, value: Any) -> None:
        with self._lock:
            self._values[key] = value
            self._version += 1

    def has(self, key: str) -> bool:
        with self._lock:
            return key in self._values

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            return dict(self._values)

    @property
    def version(self) -> int:
        with self._lock:
            return self._version

    def write_batch(self, items: dict[str, Any]) -> None:
        """Atomically write multiple keys under a single lock acquisition."""
        if not items:
            return
        with self._lock:
            self._values.update(items)
            self._version += 1

    def clear(self) -> None:
        with self._lock:
            self._values.clear()
            self._version += 1


@dataclass(slots=True)
class BlackboardView:
    """A read/write view of the blackboard that records what was touched.

    Writes are staged and only committed to the shared blackboard when the
    agent run succeeds, so a timed out or failed agent can never leave a
    half-written tactical state behind.
    """

    blackboard: Blackboard
    reads: list[str] = field(default_factory=list)
    writes: list[str] = field(default_factory=list)
    _staged: dict[str, Any] = field(default_factory=dict)

    def read(self, key: str) -> Any:
        if key not in self.reads:
            self.reads.append(key)
        if key in self._staged:
            return self._staged[key]
        return self.blackboard.read(key)

    def write(self, key: str, value: Any) -> None:
        if key not in self.writes:
            self.writes.append(key)
        self._staged[key] = value

    def commit(self) -> None:
        self.blackboard.write_batch(self._staged)
        self._staged.clear()

    def discard(self) -> None:
        self._staged.clear()


@dataclass(slots=True)
class AgentContext:
    """Everything an agent is allowed to see."""

    frame: TelemetryFrame
    view: BlackboardView
    persona: ExperiencePersona


@dataclass(slots=True)
class AgentOutcome:
    """The result of a single agent run."""

    role: AgentRole
    label: str
    status: AgentStatus
    latency_ms: float
    summary: str
    reads: list[str]
    writes: list[str]

    def to_trace(self) -> AgentTrace:
        return AgentTrace(
            role=self.role,
            label=self.label,
            status=self.status,
            latencyMs=round(self.latency_ms, 2),
            reads=list(self.reads),
            writes=list(self.writes),
            summary=self.summary,
        )


@runtime_checkable
class Agent(Protocol):
    """The contract every agent of the swarm implements."""

    role: AgentRole
    label: str

    def run(self, context: AgentContext) -> AgentOutcome:  # pragma: no cover - protocol
        ...


__all__ = [
    "ALL_KEYS",
    "Agent",
    "AgentContext",
    "AgentOutcome",
    "Blackboard",
    "BlackboardView",
    "K_ANALYST_CONTEXT",
    "K_BALL",
    "K_CASUAL_CONTEXT",
    "K_CLUB_CENTRIC_CONTEXT",
    "K_COMMENTATOR_CUE",
    "K_CONTROL_VS_CHAOS",
    "K_FAST_PATH_METRICS",
    "K_GAME_RHYTHM",
    "K_INFLECTION_CANDIDATES",
    "K_KEY_PLAYERS",
    "K_MATCH_CLOCK",
    "K_MATCH_EVENTS",
    "K_MATCH_SECONDS",
    "K_MULTILINGUAL_STREAM",
    "K_NARRATIVE",
    "K_NARRATIVE_ARC",
    "K_PASSING_LANES",
    "K_PASS_DIFFICULTY_RATING",
    "K_PLAYER_CAM_CONTEXT",
    "K_PLAYER_POSITIONS",
    "K_POSSESSION",
    "K_PITCH_CONTROL_AWAY",
    "K_PITCH_CONTROL_CONTESTED",
    "K_PITCH_CONTROL_HOME",
    "K_SCENARIO",
    "K_SCORE",
    "K_TACTICAL_PHASE",
]
