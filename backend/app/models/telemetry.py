from typing import List, Optional, Literal
from pydantic import BaseModel, Field

# ADR 0003: Metric 105m x 68m Pitch Telemetry Standard
PITCH_LENGTH_METERS = 105.0
PITCH_WIDTH_METERS = 68.0

class Vector2D(BaseModel):
    x: float = Field(..., ge=0.0, le=PITCH_LENGTH_METERS, description="X coordinate in meters (0 to 105)")
    y: float = Field(..., ge=0.0, le=PITCH_WIDTH_METERS, description="Y coordinate in meters (0 to 68)")

class PlayerTelemetry(BaseModel):
    player_id: str
    name: str
    team: Literal["home", "away"]
    shirt_number: int
    position: str  # GK, DEF, MID, FWD
    x: float = Field(..., ge=0.0, le=PITCH_LENGTH_METERS)
    y: float = Field(..., ge=0.0, le=PITCH_WIDTH_METERS)
    velocity_mps: float = Field(..., ge=0.0, description="Speed in meters per second")
    speed_kmh: float = Field(..., ge=0.0, description="Speed in km/h")
    heading_deg: float = Field(..., ge=0.0, le=360.0, description="Heading in degrees")
    is_ball_carrier: bool = False

class BallTelemetry(BaseModel):
    x: float = Field(..., ge=0.0, le=PITCH_LENGTH_METERS)
    y: float = Field(..., ge=0.0, le=PITCH_WIDTH_METERS)
    z: float = Field(0.0, ge=0.0, le=10.0, description="Elevation in meters")
    velocity_mps: float = Field(..., ge=0.0)
    speed_kmh: float = Field(..., ge=0.0)
    carrier_player_id: Optional[str] = None

class ControlChaosIndex(BaseModel):
    control: float = Field(..., ge=0.0, le=100.0, description="Possession and structure index")
    chaos: float = Field(..., ge=0.0, le=100.0, description="Transitional volatility index")

class FrameTelemetry(BaseModel):
    frame_id: int
    timestamp_ms: int
    match_clock_sec: float
    ball: BallTelemetry
    players: List[PlayerTelemetry]
    control_chaos: ControlChaosIndex
    game_rhythm: str = "structured_possession"
    active_tactical_inflection: bool = False
