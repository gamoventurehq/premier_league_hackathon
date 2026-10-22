"""Tactical Reasoning agent (ADR 0002).

Stage 3 of the pipeline: it turns the ingested telemetry into a tactical
reading - the phase of play, the key actors and the detection of Tactical
Inflection Points.
"""

from __future__ import annotations

import math
from collections import Counter, deque
from dataclasses import dataclass
from time import perf_counter

from ..models import AgentRole, AgentStatus, MatchEventType
from ..simulation.spatial import PITCH_CENTRE_X, attack_direction
from .base import (
    K_CONTROL_VS_CHAOS,
    K_FAST_PATH_METRICS,
    K_GAME_RHYTHM,
    K_INFLECTION_CANDIDATES,
    K_KEY_PLAYERS,
    K_MATCH_CLOCK,
    K_MATCH_EVENTS,
    K_PASS_DIFFICULTY_RATING,
    K_PITCH_CONTROL_AWAY,
    K_PITCH_CONTROL_CONTESTED,
    K_PITCH_CONTROL_HOME,
    K_POSSESSION,
    K_TACTICAL_PHASE,
    AgentContext,
    AgentOutcome,
)

#: A swing of this size in the Control vs. Chaos Index is an inflection.
INFLECTION_DELTA = 14.0
#: How many swarm cycles the agent looks back when measuring the swing.
INFLECTION_WINDOW = 6


@dataclass(slots=True)
class InflectionCandidate:
    matchClock: str
    reason: str
    severity: float


class TacticalReasoningAgent:
    """Derives the tactical reading and detects Tactical Inflection Points."""

    role = AgentRole.TACTICAL_REASONING
    label = "Tactical Reasoning"

    def __init__(self) -> None:
        self._history: deque[tuple[str, float]] = deque(maxlen=32)

    def run(self, context: AgentContext) -> AgentOutcome:
        started = perf_counter()
        frame = context.frame
        view = context.view

        metrics = view.read(K_FAST_PATH_METRICS) or {}
        chaos = float(metrics.get("controlVsChaosIndex", frame.metrics.controlVsChaosIndex))
        rhythm = str(metrics.get("gameRhythm", frame.metrics.gameRhythm.value))
        pdr = float(metrics.get("passDifficultyRating", frame.metrics.passDifficultyRating))
        possession = view.read(K_POSSESSION) or {}
        events = view.read(K_MATCH_EVENTS) or []
        clock = view.read(K_MATCH_CLOCK) or frame.matchClock
        home_control = float(view.read(K_PITCH_CONTROL_HOME) or frame.metrics.pitchControl.home)
        away_control = float(view.read(K_PITCH_CONTROL_AWAY) or frame.metrics.pitchControl.away)
        contested = float(view.read(K_PITCH_CONTROL_CONTESTED) or frame.metrics.pitchControl.contested)

        phase = self._tactical_phase(frame, possession, events)
        candidates = self._detect_inflections(clock, chaos, events)

        key_players = self._key_players(events, frame)

        view.write(K_CONTROL_VS_CHAOS, chaos)
        view.write(K_GAME_RHYTHM, rhythm)
        view.write(K_PASS_DIFFICULTY_RATING, pdr)
        view.write(K_TACTICAL_PHASE, phase)
        view.write(K_INFLECTION_CANDIDATES, candidates)
        view.write(
            K_KEY_PLAYERS,
            key_players,
        )

        latency = (perf_counter() - started) * 1000.0
        inflection_note = (
            f" Tactical Inflection Point detected: {candidates[0].reason}."
            if candidates
            else " No Tactical Inflection Point in this cycle."
        )
        summary = (
            f"Phase '{phase}', Game Rhythm {rhythm}, Control vs. Chaos Index {chaos:.1f}, "
            f"PDR {pdr:.1f}.{inflection_note}"
        )
        return AgentOutcome(
            role=self.role,
            label=self.label,
            status=AgentStatus.COMPLETE,
            latency_ms=latency,
            summary=summary,
            reads=list(view.reads),
            writes=list(view.writes),
        )

    def fallback(self, context: AgentContext) -> AgentOutcome:
        """ADR 0004 rule-based fallback for the tactical reading."""
        started = perf_counter()
        frame = context.frame
        view = context.view
        chaos = frame.metrics.controlVsChaosIndex
        view.write(K_CONTROL_VS_CHAOS, chaos)
        view.write(K_GAME_RHYTHM, frame.metrics.gameRhythm.value)
        view.write(K_PASS_DIFFICULTY_RATING, frame.metrics.passDifficultyRating)
        view.write(K_TACTICAL_PHASE, "progression")
        view.write(K_INFLECTION_CANDIDATES, [])
        view.write(K_KEY_PLAYERS, [])
        latency = (perf_counter() - started) * 1000.0
        return AgentOutcome(
            role=self.role,
            label=self.label,
            status=AgentStatus.FALLBACK,
            latency_ms=latency,
            summary=(
                "Rule-based fallback produced the tactical reading "
                f"(Game Rhythm {frame.metrics.gameRhythm.value}, chaos index {chaos:.1f})."
            ),
            reads=list(view.reads),
            writes=list(view.writes),
        )

    # -- helpers ---------------------------------------------------------------
    def _tactical_phase(self, frame, possession, events) -> str:
        """Derive the phase of play from the ball position and the recent events."""
        recent = events[-3:] if events else []
        last_type = recent[-1]["type"] if recent else None
        team = possession.get("team")
        if team is None:
            return "transition"

        carrier_id = possession.get("carrier")
        ball_x = frame.ball.x
        direction = attack_direction(frame.ball.possessionTeam) if frame.ball.possessionTeam else 1
        forward = direction * (ball_x - PITCH_CENTRE_X)

        if last_type in (MatchEventType.INTERCEPTION.value, MatchEventType.TACKLE.value):
            return "transition"
        if forward > 16.0:
            return "final_third"
        if forward > -2.0:
            return "progression"
        if forward > -18.0:
            return "build_up"
        return "defensive_block"

    def _detect_inflections(self, clock: str, chaos: float, events) -> list[InflectionCandidate]:
        """Detect a Tactical Inflection Point from the volatility of the index."""
        candidates: list[InflectionCandidate] = []
        self._history.append((clock, chaos))

        if len(self._history) > INFLECTION_WINDOW:
            reference_clock, reference = self._history[-INFLECTION_WINDOW - 1]
            delta = chaos - reference
            if abs(delta) >= INFLECTION_DELTA:
                direction = "sharpening into transition" if delta > 0 else "settling back into structure"
                candidates.append(
                    InflectionCandidate(
                        matchClock=clock,
                        reason=(
                            f"the Control vs. Chaos Index moved {delta:+.0f} since {reference_clock}, "
                            f"{direction}"
                        ),
                        severity=round(min(1.0, abs(delta) / 30.0), 3),
                    )
                )

        for event in reversed(events[-6:]):
            if event["type"] == MatchEventType.GOAL.value:
                candidates.append(
                    InflectionCandidate(
                        matchClock=clock,
                        reason="the match state has been reset by a goal",
                        severity=1.0,
                    )
                )
                break
            if event["type"] == MatchEventType.SHOT.value:
                candidates.append(
                    InflectionCandidate(
                        matchClock=clock,
                        reason="a shot has forced the defensive structure to react",
                        severity=0.7,
                    )
                )
                break

        return candidates

    def _key_players(self, events, frame) -> list[dict]:
        """The players most involved in the recent match events."""
        involved: Counter[str] = Counter()
        for event in events[-20:]:
            if event.get("actorId"):
                involved[event["actorId"]] += 1
            if event.get("targetId"):
                involved[event["targetId"]] += 0.5

        roster = {p.id: p for p in frame.players}
        ranked = sorted(involved.items(), key=lambda item: item[1], reverse=True)[:3]
        keys = []
        for player_id, score in ranked:
            player = roster.get(player_id)
            if player is None:
                continue
            keys.append(
                {
                    "id": player.id,
                    "name": player.name,
                    "shortName": player.shortName,
                    "team": player.team.value,
                    "role": player.role.value,
                    "involvement": round(score, 2),
                    "speedKmH": player.speedKmH,
                    "touches": player.touches,
                }
            )
        if not keys:
            carrier = next((p for p in frame.players if p.onBall), None)
            if carrier is not None:
                keys.append(
                    {
                        "id": carrier.id,
                        "name": carrier.name,
                        "shortName": carrier.shortName,
                        "team": carrier.team.value,
                        "role": carrier.role.value,
                        "involvement": 1.0,
                        "speedKmH": carrier.speedKmH,
                        "touches": carrier.touches,
                    }
                )
        return keys


__all__ = ["INFLECTION_DELTA", "InflectionCandidate", "TacticalReasoningAgent"]
