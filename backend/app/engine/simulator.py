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
# Home: Manchester City 4-3-3 (attacking rightwards into Arsenal's defensive third)
HOME_TACTICAL_ANCHORS = {
    "home_1": (12.0, 34.0),   # Ederson (GK - sweeper)
    "home_2": (60.0, 14.0),  # K. Walker (RB)
    "home_3": (52.0, 26.0),  # R. Dias (CB)
    "home_4": (52.0, 42.0),  # M. Akanji (CB)
    "home_5": (60.0, 54.0),  # J. Gvardiol (LB)
    "home_6": (66.0, 34.0),  # Rodri (DM)
    "home_7": (78.0, 22.0),  # K. De Bruyne (CM - right half-space)
    "home_8": (78.0, 46.0),  # B. Silva (CM - left half-space)
    "home_9": (84.0, 15.0),  # P. Foden (RW)
    "home_10": (87.0, 34.0), # E. Haaland (ST - box threat)
    "home_11": (84.0, 53.0), # J. Grealish (LW)
}

# Away: Arsenal 4-2-3-1 (defending low block, x: 70m..100m)
AWAY_TACTICAL_ANCHORS = {
    "away_1": (100.0, 34.0),  # D. Raya (GK)
    "away_2": (88.0, 52.0),  # B. White (RB)
    "away_3": (91.0, 39.0),  # W. Saliba (CB)
    "away_4": (91.0, 27.0),  # Gabriel (CB)
    "away_5": (88.0, 16.0),  # J. Timber (LB)
    "away_6": (79.0, 41.0),  # T. Partey (DM)
    "away_7": (79.0, 27.0),  # D. Rice (DM)
    "away_8": (68.0, 52.0),  # B. Saka (RW)
    "away_9": (73.0, 34.0),  # M. Odegaard (AM)
    "away_10": (68.0, 16.0), # G. Martinelli (LW)
    "away_11": (62.0, 34.0), # K. Havertz (ST)
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
        self.active_scenario: str | None = None

    def set_scenario(self, scenario_id: str | None):
        self.active_scenario = scenario_id

    def generate_frame(self) -> FrameTelemetry:
        self.frame_count += 1
        self.match_clock += 0.2  # 5Hz downsampled ticks = 0.2s per frame
        t = self.match_clock

        # Fluid oscillating ball dynamics based on tactical context
        is_low_block = self.active_scenario in ("low_block", "low_block_siege")
        is_counter = self.active_scenario in ("counter_attack", "rapid_counter")
        is_box_scramble = self.active_scenario == "box_scramble"
        is_red_card = self.active_scenario == "red_card_crisis"

        if is_box_scramble:
            ball_x = 98.2 + 1.2 * math.sin(t * 1.5)
            ball_y = 34.0 + 2.5 * math.cos(t * 1.8)
            ball_speed = 3.5 + 4.0 * abs(math.sin(t * 1.2))
        elif is_counter:
            # Saka rapid transition surging leftwards
            prog = 0.5 + 0.5 * math.sin(t * 0.7)
            ball_x = 35.0 + 35.0 * prog
            ball_y = 48.0 + 6.0 * math.cos(t * 0.9)
            ball_speed = 8.5
        elif is_low_block:
            ball_x = 79.0 + 7.0 * math.sin(t * 0.4)
            ball_y = 34.0 + 14.0 * math.cos(t * 0.3)
            ball_speed = abs(math.cos(t * 0.3)) * 6.5
        else:
            ball_x = 77.0 + 11.0 * math.sin(t * 0.3)
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
            base_x, base_y = HOME_TACTICAL_ANCHORS.get(p_info["id"], (50.0, 34.0))

            if is_box_scramble and p_info["id"] in ["home_10", "home_7", "home_9"]:
                # Cluster attackers right around 6-yard box
                offset = 1.8 if p_info["id"] == "home_10" else 3.2
                px = 96.5 + offset * math.cos(t * 0.8 + i)
                py = 34.0 + offset * math.sin(t * 0.8 + i)
                speed = 4.2
            elif is_counter and p_info["id"] in ["home_2", "home_6"]:
                # Fullback and DM sprint recovery
                px = base_x - 12.0 + 3.0 * math.sin(t * 0.6)
                py = base_y
                speed = 7.5
            else:
                px = base_x + 2.2 * math.sin(t * 0.5 + i)
                py = base_y + 1.8 * math.cos(t * 0.4 + i)
                speed = 2.4 + 1.4 * abs(math.sin(t * 0.6 + i))

            dist_to_ball = math.hypot(px - ball.x, py - ball.y)
            is_carrier = dist_to_ball < 4.5 and (p_info["id"] in ["home_7", "home_10", "home_9"])

            players.append(
                PlayerTelemetry(
                    player_id=p_info["id"],
                    name=p_info["name"],
                    team="home",
                    shirt_number=p_info["num"],
                    position=p_info["pos"],
                    x=round(max(2.0, min(102.0, px)), 2),
                    y=round(max(2.0, min(66.0, py)), 2),
                    velocity_mps=round(speed, 2),
                    speed_kmh=round(speed * 3.6, 2),
                    heading_deg=round((t * 20 + i * 30) % 360, 1),
                    is_ball_carrier=is_carrier
                )
            )

        # 11 Away Players (Arsenal 4-2-3-1: compact defensive shape & counter stance)
        for i, p_info in enumerate(AWAY_ROSTER):
            base_x, base_y = AWAY_TACTICAL_ANCHORS.get(p_info["id"], (85.0, 34.0))

            if is_red_card and p_info["id"] == "away_6":
                # Sent off player off-pitch
                px, py = 106.0, -4.0
                speed = 0.0
            elif is_counter and p_info["id"] == "away_8":
                # Saka breakaway sprint
                prog = 0.5 + 0.5 * math.sin(t * 0.7)
                px = 36.0 + 34.0 * prog
                py = 48.0 + 5.0 * math.cos(t * 0.9)
                speed = 8.8  # ~31.7 km/h sprint
            elif is_box_scramble and p_info["id"] in ["away_1", "away_3", "away_4"]:
                # Cluster defenders desperately in goalmouth
                px = 98.0 + 1.5 * math.sin(t * 0.9 + i)
                py = 34.0 + 2.2 * math.cos(t * 0.9 + i)
                speed = 3.8
            elif is_low_block:
                # Compress into deep 18-yard box bunker
                px = min(96.0, base_x + 3.0) - 1.2 * math.sin(t * 0.4 + i)
                py = base_y + 1.2 * math.sin(t * 0.3 + i)
                speed = 1.8
            else:
                px = base_x - 2.0 * math.sin(t * 0.5 + i)
                py = base_y + 1.8 * math.sin(t * 0.4 + i)
                speed = 2.2 + 1.2 * abs(math.cos(t * 0.6 + i))

            dist_to_ball = math.hypot(px - ball.x, py - ball.y)
            is_carrier = dist_to_ball < 4.5 and (p_info["id"] in ["away_8", "away_11", "away_9"])

            players.append(
                PlayerTelemetry(
                    player_id=p_info["id"],
                    name=p_info["name"],
                    team="away",
                    shirt_number=p_info["num"],
                    position=p_info["pos"],
                    x=round(max(2.0, min(107.0, px)), 2),
                    y=round(max(-5.0, min(66.0, py)), 2),
                    velocity_mps=round(speed, 2),
                    speed_kmh=round(speed * 3.6, 2),
                    heading_deg=round((180 + t * 20 + i * 30) % 360, 1),
                    is_ball_carrier=is_carrier
                )
            )

        # Control vs. Chaos Index calculation
        if is_box_scramble:
            chaos_val = 85.0
            control_val = 15.0
            rhythm = "penalty_box_chaos"
        elif is_counter:
            chaos_val = 74.0
            control_val = 26.0
            rhythm = "rapid_transition"
        elif is_low_block:
            chaos_val = 22.0
            control_val = 78.0
            rhythm = "low_block_siege"
        elif is_red_card:
            chaos_val = 42.0
            control_val = 88.0
            rhythm = "numerical_asymmetry"
        else:
            chaos_val = round(35.0 + 20.0 * math.sin(t * 0.2), 1)
            control_val = round(100.0 - chaos_val, 1)
            rhythm = "structured_possession" if chaos_val < 45 else "counter_attacking_transition"

        return FrameTelemetry(
            frame_id=self.frame_count,
            timestamp_ms=int(time.time() * 1000),
            match_clock_sec=round(self.match_clock, 1),
            ball=ball,
            players=players,
            control_chaos=ControlChaosIndex(control=control_val, chaos=chaos_val),
            game_rhythm=rhythm,
            active_tactical_inflection=(chaos_val > 52.0 or self.active_scenario is not None)
        )
