"""TelemetryContractValidator: Validates contracts, geometry, and metrics."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

PITCH_LENGTH = 105.0
PITCH_WIDTH = 68.0
PITCH_CENTER_X = 52.5
PITCH_CENTER_Y = 34.0

CANONICAL_INTERFACES = (
    "TelemetryFrame",
    "PlayerTelemetry",
    "BallTelemetry",
    "PassingLane",
    "PitchControlCell",
    "MatchEvent",
    "ShotRecord",
    "PlayerMatchStats",
    "MatchMetrics",
    "NarrativeEvent",
    "BroadcastOverlayPayload",
    "AgentTrace",
)

REQUIRED_FRAME_KEYS = {
    "frameId",
    "matchClock",
    "matchSeconds",
    "scenario",
    "score",
    "ball",
    "players",
    "passingLanes",
    "pitchControlCells",
    "events",
    "shots",
    "playerStats",
    "metrics",
    "latestNarrative",
    "agentTrace",
}

REQUIRED_BLACKBOARD_KEYS = {
    "match_clock",
    "scenario",
    "score",
    "ball_state",
    "player_positions",
    "possession",
    "analyst_context",
    "casual_context",
    "player_cam_context",
    "club_centric_context",
    "control_vs_chaos",
    "game_rhythm",
    "pass_difficulty_rating",
}


class TelemetryContractValidator:
    """Validates structural contracts, coordinate ranges, and metric values."""

    @staticmethod
    def validate_envelope(payload: dict[str, Any]) -> None:
        """Validate the WebSocket outbound envelope containing frame, blackboard, sentAtMs."""
        assert "frame" in payload, "WebSocket envelope missing 'frame'"
        assert "blackboard" in payload, "WebSocket envelope missing 'blackboard'"
        assert "sentAtMs" in payload, "WebSocket envelope missing 'sentAtMs'"
        assert isinstance(payload["sentAtMs"], (int, float)), "sentAtMs must be numeric timestamp"

    @staticmethod
    def validate_frame(frame: dict[str, Any]) -> None:
        """Validate the TelemetryFrame wire structure."""
        missing = REQUIRED_FRAME_KEYS - set(frame.keys())
        assert not missing, f"TelemetryFrame is missing required keys: {missing}"

        assert isinstance(frame["frameId"], int), "frameId must be integer"
        assert isinstance(frame["matchClock"], str), "matchClock must be string formatted as MM:SS"
        assert isinstance(frame["matchSeconds"], (int, float)), "matchSeconds must be numeric"
        assert "home" in frame["score"] and "away" in frame["score"], "score must have home and away"

    @staticmethod
    def validate_spatial_bounds(frame: dict[str, Any], tolerance_meters: float = 5.0) -> None:
        """Validate spatial coordinates conform to the standard 105m x 68m pitch geometry."""
        ball = frame["ball"]
        assert -tolerance_meters <= ball["x"] <= PITCH_LENGTH + tolerance_meters, (
            f"Ball x coordinate {ball['x']} out of bounds"
        )
        assert -tolerance_meters <= ball["y"] <= PITCH_WIDTH + tolerance_meters, (
            f"Ball y coordinate {ball['y']} out of bounds"
        )
        assert ball["z"] >= 0.0, f"Ball height z {ball['z']} cannot be negative"

        players = frame["players"]
        for p in players:
            assert -tolerance_meters <= p["x"] <= PITCH_LENGTH + tolerance_meters, (
                f"Player {p.get('id')} x={p['x']} exceeds pitch length bounds"
            )
            assert -tolerance_meters <= p["y"] <= PITCH_WIDTH + tolerance_meters, (
                f"Player {p.get('id')} y={p['y']} exceeds pitch width bounds"
            )

    @staticmethod
    def validate_metrics(metrics: dict[str, Any]) -> None:
        """Validate Control vs Chaos Index, PDR, Game Rhythm and Pitch Control."""
        c_index = metrics["controlVsChaosIndex"]
        assert 0.0 <= c_index <= 100.0, f"controlVsChaosIndex {c_index} out of range [0, 100]"

        pdr = metrics["passDifficultyRating"]
        assert 0.0 <= pdr <= 100.0, f"passDifficultyRating {pdr} out of range [0, 100]"

        rhythm = metrics["gameRhythm"]
        valid_rhythms = {"Structured", "Fluid", "Transitional", "Chaotic"}
        assert rhythm in valid_rhythms, f"gameRhythm '{rhythm}' not in {valid_rhythms}"

        pc = metrics["pitchControl"]
        total_pc = pc["home"] + pc["away"] + pc["contested"]
        assert abs(total_pc - 1.0) < 0.05 or abs(total_pc - 100.0) < 5.0, (
            f"pitchControl shares must sum to 1.0 (or 100%), got {total_pc}"
        )

    @staticmethod
    def validate_blackboard(blackboard: dict[str, Any]) -> None:
        """Validate 4-agent tactical blackboard keys."""
        missing = REQUIRED_BLACKBOARD_KEYS - set(blackboard.keys())
        assert not missing, f"Tactical blackboard missing required keys: {missing}"

    @staticmethod
    def parse_typescript_interfaces(ts_file_path: Path) -> dict[str, list[str]]:
        """Parse TypeScript interface definitions from a file."""
        if not ts_file_path.exists():
            return {}
        content = ts_file_path.read_text(encoding="utf-8")
        interfaces: dict[str, list[str]] = {}
        pattern = re.compile(
            r"export\s+interface\s+([A-Za-z0-9_]+)(?:\s+extends\s+[^{]+)?\s*\{([^}]+)\}",
            re.MULTILINE,
        )
        for match in pattern.finditer(content):
            name = match.group(1)
            body = match.group(2)
            fields = []
            for line in body.splitlines():
                line = line.strip()
                if not line or line.startswith("//"):
                    continue
                f_name = line.split(":")[0].replace("?", "").strip()
                if f_name:
                    fields.append(f_name)
            interfaces[name] = fields
        return interfaces
