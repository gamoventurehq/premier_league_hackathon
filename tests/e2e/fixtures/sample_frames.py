"""Sample telemetry frame fixtures and sequence generators for E2E tests."""

from __future__ import annotations

from typing import Any


def create_base_player(
    player_id: str,
    number: int,
    name: str,
    team: str = "home",
    role: str = "MF",
    x: float = 50.0,
    y: float = 34.0,
    vx: float = 1.0,
    vy: float = 0.5,
    on_ball: bool = False,
) -> dict[str, Any]:
    """Create a valid player telemetry record."""
    speed_kmh = round(((vx**2 + vy**2) ** 0.5) * 3.6, 2)
    return {
        "id": player_id,
        "name": name,
        "shortName": name.split()[-1],
        "number": number,
        "team": team,
        "role": role,
        "position": "CM" if role == "MF" else role,
        "x": x,
        "y": y,
        "vx": vx,
        "vy": vy,
        "speedKmH": speed_kmh,
        "distanceMeters": 4200.0,
        "touches": 35,
        "homeX": x,
        "homeY": y,
        "onBall": on_ball,
    }


def create_base_telemetry_frame(
    frame_id: int = 100,
    match_clock: str = "42:15",
    match_seconds: float = 2535.0,
    scenario: str = "high_possession",
    control_vs_chaos: float = 38.5,
    pdr: float = 62.0,
    is_inflection: bool = False,
    ball_carrier_id: str | None = "home_7",
) -> dict[str, Any]:
    """Generate a canonical, fully-populated TelemetryFrame wire dictionary."""
    players = [
        create_base_player(f"home_{i}", i, f"Home Player {i}", "home", "MF", 20.0 + i * 5, 10.0 + i * 4, on_ball=(f"home_{i}" == ball_carrier_id))
        for i in range(1, 12)
    ] + [
        create_base_player(f"away_{i}", i, f"Away Player {i}", "away", "DF", 60.0 + i * 3, 10.0 + i * 4, on_ball=(f"away_{i}" == ball_carrier_id))
        for i in range(1, 12)
    ]

    ball = {
        "x": 52.5,
        "y": 34.0,
        "z": 0.0,
        "vx": 3.5,
        "vy": 1.2,
        "vz": 0.0,
        "speedKmH": 13.3,
        "possessionTeam": "home" if ball_carrier_id and "home" in ball_carrier_id else "away",
        "possessionPlayerId": ball_carrier_id,
        "lastTouchBy": ball_carrier_id,
    }

    passing_lanes = [
        {
            "passerId": "home_7",
            "receiverId": "home_10",
            "passerPos": {"x": 55.0, "y": 30.0},
            "receiverPos": {"x": 75.0, "y": 34.0},
            "interceptionRisk": 0.28,
            "passDifficultyRating": 65.0,
            "isClear": True,
            "corridorWidthM": 8.5,
            "interceptorCount": 1,
            "passerPressure": 0.45,
            "receiverCoverage": 0.30,
            "defenderVelocityAlignment": -0.15,
        }
    ]

    pitch_control_cells = [
        {"x": 10.0, "y": 10.0, "controlScore": 0.85, "homeWeight": 0.9, "awayWeight": 0.1},
        {"x": 52.5, "y": 34.0, "controlScore": 0.50, "homeWeight": 0.5, "awayWeight": 0.5},
        {"x": 90.0, "y": 50.0, "controlScore": -0.80, "homeWeight": 0.1, "awayWeight": 0.9},
    ]

    metrics = {
        "controlVsChaosIndex": control_vs_chaos,
        "passDifficultyRating": pdr,
        "gameRhythm": "Structured" if control_vs_chaos < 45.0 else ("Chaotic" if control_vs_chaos > 75.0 else "Fluid"),
        "pitchControl": {"home": 0.54, "away": 0.38, "contested": 0.08},
        "fastPathLatencyMs": 28.5,
        "agentReasoningLatencyMs": 850.0,
        "possessionShare": {"home": 0.58, "away": 0.42},
        "passCompletion": {"home": 0.88, "away": 0.82},
        "shotCount": {"home": 8.0, "away": 4.0},
        "duelCount": 24,
        "topSprintKmH": 33.8,
        "ballProgressionM": 412.5,
    }

    latest_narrative = {
        "id": f"nar_{frame_id}",
        "matchClock": match_clock,
        "timestamp": 1774350000000 + int(match_seconds * 1000),
        "isTacticalInflectionPoint": is_inflection,
        "headline": {
            "en": "Tactical breakthrough in midfield" if is_inflection else "Structured possession build-up",
            "es": "Avance táctico en el mediocampo",
            "fr": "Percée tactique au milieu de terrain",
            "ja": "中盤での戦術的ブレークスルー",
            "ar": "اختراق تكتيكي في خط الوسط",
        },
        "tacticalExplanation": {
            "en": "De Bruyne unlocks low block via half-space overload",
            "es": "De Bruyne desbloquea el bloque bajo",
            "fr": "De Bruyne déverrouille le bloc bas",
            "ja": "デ・ブライネがハーフスペースのオーバーロードでローブロックを崩す",
            "ar": "دي بروين يفكك التكتل الدفاعي المنخفض",
        },
        "analystContext": "xG delta: +0.42 via central corridor overload",
        "casualContext": "Huge chance created by De Bruyne!",
        "playerCamContext": "Tracking Kevin De Bruyne body orientation and scan rate",
        "clubCentricContext": {
            "homeFrame": "Dominant possession phase rewarded",
            "awayFrame": "Defensive shape tested under sustained pressure",
        },
    }

    return {
        "frameId": frame_id,
        "matchClock": match_clock,
        "matchSeconds": match_seconds,
        "scenario": scenario,
        "score": {"home": 1, "away": 0},
        "ball": ball,
        "players": players,
        "passingLanes": passing_lanes,
        "pitchControlCells": pitch_control_cells,
        "events": [],
        "shots": [],
        "playerStats": [],
        "metrics": metrics,
        "latestNarrative": latest_narrative,
        "agentTrace": [],
    }


def create_empty_degraded_frame(frame_id: int = 1) -> dict[str, Any]:
    """Generate a degraded frame with empty player arrays and unassigned ball possession."""
    frame = create_base_telemetry_frame(frame_id=frame_id, ball_carrier_id=None)
    frame["players"] = []
    frame["passingLanes"] = []
    frame["pitchControlCells"] = []
    frame["ball"]["possessionTeam"] = None
    frame["ball"]["possessionPlayerId"] = None
    return frame


def create_inflection_sequence(start_frame_id: int = 100, length: int = 6) -> list[dict[str, Any]]:
    """Generate a sequence of frames producing a Control vs Chaos delta >= 14.0 within 6 cycles."""
    frames = []
    base_c_index = 32.0  # structured possession
    for i in range(length):
        # Progressively spike to chaotic state
        c_index = base_c_index + (i * 3.5)  # delta reaches 17.5 at cycle 5
        is_inflection = (i == length - 1)
        frame = create_base_telemetry_frame(
            frame_id=start_frame_id + i,
            match_clock=f"54:{10 + i * 2:02d}",
            match_seconds=3250.0 + i * 2.0,
            control_vs_chaos=c_index,
            is_inflection=is_inflection,
        )
        frames.append(frame)
    return frames
