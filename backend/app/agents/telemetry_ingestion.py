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
    K_PITCH_CONTROL_AWAY,
    K_PITCH_CONTROL_CONTESTED,
    K_PITCH_CONTROL_HOME,
    K_PLAYER_POSITIONS,
    K_POSSESSION,
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
                "z": frame.ball.z,
                "vx": frame.ball.vx,
                "vy": frame.ball.vy,
                "vz": frame.ball.vz,
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
            f" continuous from {previous_clock} at {previous_score}."
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

    def fallback(self, context: AgentContext) -> AgentOutcome:
        """ADR 0004 rule-based fallback for raw telemetry ingestion.

        Safely extracts and writes canonical fields from context.frame to context.view
        so downstream agents and overlay always have telemetry even if ingestion throws.
        """
        started = perf_counter()
        frame = context.frame
        view = context.view

        clock = getattr(frame, "matchClock", "00:00")
        seconds = getattr(frame, "matchSeconds", 0.0)
        scenario_obj = getattr(frame, "scenario", None)
        scenario = getattr(scenario_obj, "value", str(scenario_obj or "kickoff"))

        score_obj = getattr(frame, "score", None)
        score = {
            "home": getattr(score_obj, "home", 0) if score_obj else 0,
            "away": getattr(score_obj, "away", 0) if score_obj else 0,
        }

        ball_obj = getattr(frame, "ball", None)
        ball_possession_team = (
            getattr(getattr(ball_obj, "possessionTeam", None), "value", None)
            if ball_obj and getattr(ball_obj, "possessionTeam", None)
            else None
        )
        ball = {
            "x": getattr(ball_obj, "x", 52.5) if ball_obj else 52.5,
            "y": getattr(ball_obj, "y", 34.0) if ball_obj else 34.0,
            "z": getattr(ball_obj, "z", 0.0) if ball_obj else 0.0,
            "vx": getattr(ball_obj, "vx", 0.0) if ball_obj else 0.0,
            "vy": getattr(ball_obj, "vy", 0.0) if ball_obj else 0.0,
            "vz": getattr(ball_obj, "vz", 0.0) if ball_obj else 0.0,
            "speedKmH": getattr(ball_obj, "speedKmH", 0.0) if ball_obj else 0.0,
            "possessionTeam": ball_possession_team,
            "possessionPlayerId": getattr(ball_obj, "possessionPlayerId", None) if ball_obj else None,
        }

        players = getattr(frame, "players", []) or []
        player_positions = []
        for p in players:
            team_obj = getattr(p, "team", None)
            team_val = getattr(team_obj, "value", str(team_obj or "home"))
            role_obj = getattr(p, "role", None)
            role_val = getattr(role_obj, "value", str(role_obj or "midfielder"))
            player_positions.append(
                {
                    "id": getattr(p, "id", ""),
                    "team": team_val,
                    "role": role_val,
                    "x": getattr(p, "x", 0.0),
                    "y": getattr(p, "y", 0.0),
                    "speedKmH": getattr(p, "speedKmH", 0.0),
                    "onBall": getattr(p, "onBall", False),
                }
            )

        metrics = getattr(frame, "metrics", None)
        possession_share = getattr(metrics, "possessionShare", None) if metrics else None
        possession = {
            "team": ball_possession_team,
            "carrier": getattr(ball_obj, "possessionPlayerId", None) if ball_obj else None,
            "share": {
                "home": getattr(possession_share, "home", 50.0) if possession_share else 50.0,
                "away": getattr(possession_share, "away", 50.0) if possession_share else 50.0,
            },
        }

        pitch_control = getattr(metrics, "pitchControl", None) if metrics else None
        pc_home = getattr(pitch_control, "home", 50.0) if pitch_control else 50.0
        pc_away = getattr(pitch_control, "away", 50.0) if pitch_control else 50.0
        pc_contested = getattr(pitch_control, "contested", 0.0) if pitch_control else 0.0

        lanes = getattr(frame, "passingLanes", []) or []
        passing_lanes = [
            {
                "passerId": getattr(lane, "passerId", ""),
                "receiverId": getattr(lane, "receiverId", ""),
                "passDifficultyRating": getattr(lane, "passDifficultyRating", 0.0),
                "interceptionRisk": getattr(lane, "interceptionRisk", 0.0),
            }
            for lane in lanes
        ]

        events = getattr(frame, "events", []) or []
        match_events = []
        for e in events:
            type_obj = getattr(e, "type", None)
            type_val = getattr(type_obj, "value", str(type_obj or "pass"))
            team_obj = getattr(e, "team", None)
            team_val = getattr(team_obj, "value", None) if team_obj else None
            match_events.append(
                {
                    "id": getattr(e, "id", ""),
                    "type": type_val,
                    "matchClock": getattr(e, "matchClock", clock),
                    "team": team_val,
                    "description": getattr(e, "description", ""),
                }
            )

        game_rhythm_obj = getattr(metrics, "gameRhythm", None) if metrics else None
        game_rhythm_val = (
            getattr(game_rhythm_obj, "value", str(game_rhythm_obj or "balanced"))
            if game_rhythm_obj
            else "balanced"
        )
        fast_path = {
            "controlVsChaosIndex": getattr(metrics, "controlVsChaosIndex", 50.0) if metrics else 50.0,
            "passDifficultyRating": getattr(metrics, "passDifficultyRating", 50.0) if metrics else 50.0,
            "gameRhythm": game_rhythm_val,
            "fastPathLatencyMs": getattr(metrics, "fastPathLatencyMs", 0.0) if metrics else 0.0,
        }

        view.write(K_MATCH_CLOCK, clock)
        view.write(K_MATCH_SECONDS, seconds)
        view.write(K_SCENARIO, scenario)
        view.write(K_SCORE, score)
        view.write(K_BALL, ball)
        view.write(K_PLAYER_POSITIONS, player_positions)
        view.write(K_POSSESSION, possession)
        view.write(K_PITCH_CONTROL_HOME, pc_home)
        view.write(K_PITCH_CONTROL_AWAY, pc_away)
        view.write(K_PITCH_CONTROL_CONTESTED, pc_contested)
        view.write(K_PASSING_LANES, passing_lanes)
        view.write(K_MATCH_EVENTS, match_events)
        view.write(K_FAST_PATH_METRICS, fast_path)

        latency = (perf_counter() - started) * 1000.0
        summary = (
            f"Rule-based fallback normalized telemetry for {clock} "
            f"({len(player_positions)} players, {len(match_events)} events)."
        )
        return AgentOutcome(
            role=self.role,
            label=self.label,
            status=AgentStatus.FALLBACK,
            latency_ms=latency,
            summary=summary,
            reads=list(view.reads),
            writes=list(view.writes),
        )


__all__ = ["TelemetryIngestionAgent"]
