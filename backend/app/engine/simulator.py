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

        # Oscillating ball dynamics across pitch
        ball_x = 52.5 + 25.0 * math.sin(t * 0.3)
        ball_y = 34.0 + 18.0 * math.cos(t * 0.4)
        ball_speed = abs(math.cos(t * 0.3)) * 8.5

        ball = BallTelemetry(
            x=round(max(2.0, min(103.0, ball_x)), 2),
            y=round(max(2.0, min(66.0, ball_y)), 2),
            z=0.0,
            velocity_mps=round(ball_speed, 2),
            speed_kmh=round(ball_speed * 3.6, 2)
        )

        players: List[PlayerTelemetry] = []

        # 11 Home Players (attacking rightwards)
        for i in range(11):
            base_x = 10.0 + (i % 4) * 22.0
            base_y = 10.0 + (i // 4) * 20.0
            px = base_x + 3.0 * math.sin(t * 0.5 + i)
            py = base_y + 2.5 * math.cos(t * 0.4 + i)
            speed = 3.2 + 1.5 * math.sin(t * 0.6 + i)

            players.append(
                PlayerTelemetry(
                    player_id=f"home_{i+1}",
                    name=f"Home Player {i+1}",
                    team="home",
                    shirt_number=i+1,
                    position="GK" if i == 0 else ("DEF" if i < 5 else ("MID" if i < 9 else "FWD")),
                    x=round(max(1.0, min(104.0, px)), 2),
                    y=round(max(1.0, min(67.0, py)), 2),
                    velocity_mps=round(speed, 2),
                    speed_kmh=round(speed * 3.6, 2),
                    heading_deg=round((t * 20 + i * 30) % 360, 1),
                    is_ball_carrier=(i == 7)
                )
            )

        # 11 Away Players (defending leftwards)
        for i in range(11):
            base_x = 95.0 - (i % 4) * 22.0
            base_y = 10.0 + (i // 4) * 20.0
            px = base_x - 3.0 * math.sin(t * 0.5 + i)
            py = base_y + 2.5 * math.sin(t * 0.4 + i)
            speed = 2.8 + 1.2 * math.cos(t * 0.6 + i)

            players.append(
                PlayerTelemetry(
                    player_id=f"away_{i+1}",
                    name=f"Away Player {i+1}",
                    team="away",
                    shirt_number=i+1,
                    position="GK" if i == 0 else ("DEF" if i < 5 else ("MID" if i < 9 else "FWD")),
                    x=round(max(1.0, min(104.0, px)), 2),
                    y=round(max(1.0, min(67.0, py)), 2),
                    velocity_mps=round(speed, 2),
                    speed_kmh=round(speed * 3.6, 2),
                    heading_deg=round((180 + t * 20 + i * 30) % 360, 1),
                    is_ball_carrier=False
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
