import math
import time
from typing import List
from ..models.telemetry import (
    PITCH_LENGTH_METERS,
    PITCH_WIDTH_METERS,
    PlayerTelemetry,
    BallTelemetry,
    ControlChaosIndex,
    FrameTelemetry
)

HOME_ROSTER = [
    {"id": "home_1", "name": "Ederson", "num": 31, "pos": "GK"},
    {"id": "home_2", "name": "K. Walker", "num": 2, "pos": "DEF"},
    {"id": "home_3", "name": "R. Dias", "num": 3, "pos": "DEF"},
    {"id": "home_4", "name": "M. Akanji", "num": 25, "pos": "DEF"},
    {"id": "home_5", "name": "J. Gvardiol", "num": 24, "pos": "DEF"},
    {"id": "home_6", "name": "Rodri", "num": 16, "pos": "MID"},
    {"id": "home_7", "name": "K. De Bruyne", "num": 17, "pos": "MID"},
    {"id": "home_8", "name": "B. Silva", "num": 20, "pos": "MID"},
    {"id": "home_9", "name": "P. Foden", "num": 47, "pos": "FWD"},
    {"id": "home_10", "name": "E. Haaland", "num": 9, "pos": "FWD"},
    {"id": "home_11", "name": "J. Grealish", "num": 10, "pos": "FWD"},
]

AWAY_ROSTER = [
    {"id": "away_1", "name": "D. Raya", "num": 22, "pos": "GK"},
    {"id": "away_2", "name": "B. White", "num": 4, "pos": "DEF"},
    {"id": "away_3", "name": "W. Saliba", "num": 2, "pos": "DEF"},
    {"id": "away_4", "name": "Gabriel", "num": 6, "pos": "DEF"},
    {"id": "away_5", "name": "J. Timber", "num": 12, "pos": "DEF"},
    {"id": "away_6", "name": "T. Partey", "num": 5, "pos": "MID"},
    {"id": "away_7", "name": "D. Rice", "num": 41, "pos": "MID"},
    {"id": "away_8", "name": "B. Saka", "num": 7, "pos": "FWD"},
    {"id": "away_9", "name": "M. Ødegaard", "num": 8, "pos": "MID"},
    {"id": "away_10", "name": "G. Martinelli", "num": 11, "pos": "FWD"},
    {"id": "away_11", "name": "K. Havertz", "num": 29, "pos": "FWD"},
]

# Realistic tactical formation anchors on 105m x 68m pitch
# Home: Manchester City 4-3-3 (attacking rightwards, x: 7m..50m)
HOME_TACTICAL_ANCHORS = {
    "home_1": (7.0, 34.0),   # Ederson (GK)
    "home_2": (22.0, 12.0),  # K. Walker (RB)
    "home_3": (19.0, 26.0),  # R. Dias (CB)
    "home_4": (19.0, 42.0),  # M. Akanji (CB)
    "home_5": (22.0, 56.0),  # J. Gvardiol (LB)
    "home_6": (32.0, 34.0),  # Rodri (DM)
    "home_7": (38.0, 22.0),  # K. De Bruyne (CM)
    "home_8": (38.0, 46.0),  # B. Silva (CM)
    "home_9": (46.0, 14.0),  # P. Foden (RW)
    "home_10": (45.0, 34.0), # E. Haaland (ST)
    "home_11": (46.0, 54.0), # J. Grealish (LW)
}

# Away: Arsenal 4-2-3-1 (defending right half, x: 55m..98m)
AWAY_TACTICAL_ANCHORS = {
    "away_1": (98.0, 34.0),  # D. Raya (GK)
    "away_2": (82.0, 56.0),  # B. White (RB)
    "away_3": (85.0, 42.0),  # W. Saliba (CB)
    "away_4": (85.0, 26.0),  # Gabriel (CB)
    "away_5": (82.0, 12.0),  # J. Timber (LB)
    "away_6": (72.0, 44.0),  # T. Partey (DM)
    "away_7": (72.0, 24.0),  # D. Rice (DM)
    "away_8": (58.0, 54.0),  # B. Saka (RW)
    "away_9": (64.0, 34.0),  # M. Odegaard (AM)
    "away_10": (58.0, 14.0), # G. Martinelli (LW)
    "away_11": (55.0, 34.0), # K. Havertz (ST)
}

class SyntheticMatchSimulator:
    """
    ADR 0001: Physics-Based Spatial Telemetry State Machine
    Generates synthetic 22-player and ball coordinates at 10Hz/5Hz on a 105m x 68m pitch.
    """

    def __init__(self):
        self.frame_count = 0
        self.start_time = time.time()
        self.match_clock = 0.0

    def generate_frame(self) -> FrameTelemetry:
        self.frame_count += 1
        self.match_clock += 0.2  # 5Hz downsampled ticks = 0.2s per frame
        t = self.match_clock

        # Fluid oscillating ball dynamics through central attacking corridors
        ball_x = 52.5 + 20.0 * math.sin(t * 0.3)
        ball_y = 34.0 + 15.0 * math.cos(t * 0.4)
        ball_speed = abs(math.cos(t * 0.3)) * 8.5

        ball = BallTelemetry(
            x=round(max(4.0, min(101.0, ball_x)), 2),
            y=round(max(4.0, min(64.0, ball_y)), 2),
            z=0.0,
            velocity_mps=round(ball_speed, 2),
            speed_kmh=round(ball_speed * 3.6, 2)
        )

        players: List[PlayerTelemetry] = []

        # 11 Home Players (City 4-3-3: structured possession with tactical drift)
        for i, p_info in enumerate(HOME_ROSTER):
            base_x, base_y = HOME_TACTICAL_ANCHORS.get(p_info["id"], (20.0, 34.0))
            # Smooth tactical micro-drift around anchor
            px = base_x + 2.2 * math.sin(t * 0.5 + i)
            py = base_y + 1.8 * math.cos(t * 0.4 + i)
            speed = 2.4 + 1.4 * abs(math.sin(t * 0.6 + i))

            dist_to_ball = math.hypot(px - ball.x, py - ball.y)
            is_carrier = dist_to_ball < 8.0 and (p_info["id"] in ["home_7", "home_10", "home_9"])

            players.append(
                PlayerTelemetry(
                    player_id=p_info["id"],
                    name=p_info["name"],
                    team="home",
                    shirt_number=p_info["num"],
                    position=p_info["pos"],
                    x=round(max(2.0, min(53.0, px)), 2),
                    y=round(max(2.0, min(66.0, py)), 2),
                    velocity_mps=round(speed, 2),
                    speed_kmh=round(speed * 3.6, 2),
                    heading_deg=round((t * 20 + i * 30) % 360, 1),
                    is_ball_carrier=is_carrier
                )
            )

        # 11 Away Players (Arsenal 4-2-3-1: compact defensive shape & counter stance)
        for i, p_info in enumerate(AWAY_ROSTER):
            base_x, base_y = AWAY_TACTICAL_ANCHORS.get(p_info["id"], (80.0, 34.0))
            # Smooth tactical micro-drift around anchor
            px = base_x - 2.0 * math.sin(t * 0.5 + i)
            py = base_y + 1.8 * math.sin(t * 0.4 + i)
            speed = 2.2 + 1.2 * abs(math.cos(t * 0.6 + i))

            dist_to_ball = math.hypot(px - ball.x, py - ball.y)
            is_carrier = dist_to_ball < 8.0 and (p_info["id"] in ["away_8", "away_11", "away_9"])

            players.append(
                PlayerTelemetry(
                    player_id=p_info["id"],
                    name=p_info["name"],
                    team="away",
                    shirt_number=p_info["num"],
                    position=p_info["pos"],
                    x=round(max(54.0, min(103.0, px)), 2),
                    y=round(max(2.0, min(66.0, py)), 2),
                    velocity_mps=round(speed, 2),
                    speed_kmh=round(speed * 3.6, 2),
                    heading_deg=round((180 + t * 20 + i * 30) % 360, 1),
                    is_ball_carrier=is_carrier
                )
            )

        # Control vs. Chaos Index calculation
        chaos_val = round(35.0 + 20.0 * math.sin(t * 0.2), 1)
        control_val = round(100.0 - chaos_val, 1)

        return FrameTelemetry(
            frame_id=self.frame_count,
            timestamp_ms=int(time.time() * 1000),
            match_clock_sec=round(self.match_clock, 1),
            ball=ball,
            players=players,
            control_chaos=ControlChaosIndex(control=control_val, chaos=chaos_val),
            game_rhythm="structured_possession" if chaos_val < 45 else "counter_attacking_transition",
            active_tactical_inflection=(chaos_val > 52.0)
        )
