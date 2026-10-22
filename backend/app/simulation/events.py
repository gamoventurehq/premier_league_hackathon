"""Discrete match event generation and the rolling event log.

Events are derived from the spatial state machine (ADR 0001): a pass, a carry,
a duel or a shot is emitted because of *where the players are*, never because
of a timer.
"""

from __future__ import annotations

import itertools
from dataclasses import dataclass, field

from ..models import MatchEvent, MatchEventType, TeamSide

_EVENT_COUNTER = itertools.count(1)


@dataclass(slots=True)
class EventLog:
    """A newest-last log of discrete match events.

    The full log is retained: the match statistics are derived from it, so a
    truncated log would silently corrupt the box score.
    """

    events: list[MatchEvent] = field(default_factory=list)

    def append(self, event: MatchEvent) -> MatchEvent:
        self.events.append(event)
        return event

    def recent(self, limit: int = 40) -> list[MatchEvent]:
        """The most recent events, newest last."""
        return self.events[-limit:]

    def all(self) -> list[MatchEvent]:
        return list(self.events)

    def clear(self) -> None:
        self.events.clear()

    def __len__(self) -> int:
        return len(self.events)


def new_event_id(prefix: str = "ev") -> str:
    """Process-unique event identifier."""
    return f"{prefix}-{next(_EVENT_COUNTER):08d}"


def make_event(
    event_type: MatchEventType,
    match_clock: str,
    timestamp_ms: int,
    team: TeamSide | None,
    actor_id: str | None,
    target_id: str | None,
    x: float,
    y: float,
    description: str,
    xg: float | None = None,
    pdr: float | None = None,
    completed: bool | None = None,
) -> MatchEvent:
    """Build a contract-valid :class:`MatchEvent`."""
    return MatchEvent(
        id=new_event_id(),
        type=event_type,
        matchClock=match_clock,
        timestampMs=timestamp_ms,
        team=team,
        actorId=actor_id,
        targetId=target_id,
        x=round(float(x), 2),
        y=round(float(y), 2),
        xG=xg,
        pdr=pdr,
        completed=completed,
        description=description,
    )


__all__ = ["EventLog", "make_event", "new_event_id"]
