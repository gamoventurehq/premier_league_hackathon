"""Telemetry Ingestion agent (ADR 0002).

Stage 1 of the pipeline: it normalises the raw synthetic telemetry frame into
the canonical contract and publishes it on the shared tactical state so that
the downstream agents never have to touch the transport layer.
"""

from __future__ import annotations

from time import perf_counter

from ..models import AgentRole, AgentStatus
from .base import (
    K_BALL,
    K_FAST_PATH_METRICS,
    K_MATCH_CLOCK,
    K_MATCH_EVENTS,
    K_MATCH_SECONDS,
    K_PASSING_LANES,
    K_PLAYER_POSITIONS,
    K_POSSESSION,
    K_PITCH_CONTROL_AWAY,
    K_PITCH_CONTROL_CONTESTED,
    K_PITCH_CONTROL_HOME,
    K_SCENARIO,
    K_SCORE,
    AgentContext,
    AgentOutcome,
)


class TelemetryIngestionAgent:
    """Normalises the raw telemetry frame into the canonical contract."""

    role = AgentRole.TELEMETRY_INGESTION
    label = "Telemetry Ingestion"

    def run(self, context: AgentContext) -> AgentOutcome:
        started = perf_counter()
        frame = context.frame
        view = context.view

        # Continuity check against the previous cycle of the swarm.
        previous_clock = view.read(K_MATCH_CLOCK)
        previous_score = view.read(K_SCORE)

        players = frame.players
        view.write(K_MATCH_CLOCK, frame.matchClock)
        view.write(K_MATCH_SECONDS, frame.matchSeconds)
        view.write(K_SCENARIO, frame.scenario.value)
        view.write(K_SCORE, {"home": frame.score.home, "away": frame.score.away})
        view.write(
            K_BALL,
            {
                "x": frame.ball.x,
                "y": frame.ball.y,
                "speedKmH": frame.ball.speedKmH,
                "possessionTeam": frame.ball.possessionTeam.value if frame.ball.possessionTeam else None,
                "possessionPlayerId": frame.ball.possessionPlayerId,
            },
        )
        view.write(
            K_PLAYER_POSITIONS,
            [
                {
                    "id": p.id,
                    "team": p.team.value,
                    "role": p.role.value,
                    "x": p.x,
                    "y": p.y,
                    "speedKmH": p.speedKmH,
                    "onBall": p.onBall,
                }
                for p in players
            ],
        )
        view.write(
            K_POSSESSION,
            {
                "team": frame.ball.possessionTeam.value if frame.ball.possessionTeam else None,
                "carrier": frame.ball.possessionPlayerId,
                "share": {
                    "home": frame.metrics.possessionShare.home,
                    "away": frame.metrics.possessionShare.away,
                },
            },
        )
        view.write(K_PITCH_CONTROL_HOME, frame.metrics.pitchControl.home)
        view.write(K_PITCH_CONTROL_AWAY, frame.metrics.pitchControl.away)
        view.write(K_PITCH_CONTROL_CONTESTED, frame.metrics.pitchControl.contested)
        view.write(
            K_PASSING_LANES,
            [
                {
                    "passerId": lane.passerId,
                    "receiverId": lane.receiverId,
                    "passDifficultyRating": lane.passDifficultyRating,
                    "interceptionRisk": lane.interceptionRisk,
                }
                for lane in frame.passingLanes
            ],
        )
        view.write(
            K_MATCH_EVENTS,
            [
                {
                    "id": e.id,
                    "type": e.type.value,
                    "matchClock": e.matchClock,
                    "team": e.team.value if e.team else None,
                    "description": e.description,
                }
                for e in frame.events
            ],
        )
        view.write(
            K_FAST_PATH_METRICS,
            {
                "controlVsChaosIndex": frame.metrics.controlVsChaosIndex,
                "passDifficultyRating": frame.metrics.passDifficultyRating,
                "gameRhythm": frame.metrics.gameRhythm.value,
                "fastPathLatencyMs": frame.metrics.fastPathLatencyMs,
            },
        )

        latency = (perf_counter() - started) * 1000.0
        continuity = (
            f" continuous from {previous_clock}."
            if previous_clock and previous_clock != frame.matchClock
            else "."
        )
        summary = (
            f"Normalised {len(players)} player tracks, {len(frame.events)} events and "
            f"{len(frame.passingLanes)} Passing Lanes at {frame.matchClock}{continuity} "
            f"Pitch Control {frame.metrics.pitchControl.home}% home / "
            f"{frame.metrics.pitchControl.away}% away."
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


__all__ = ["TelemetryIngestionAgent"]
