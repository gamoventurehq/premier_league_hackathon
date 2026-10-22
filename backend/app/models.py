"""Canonical telemetry contract for the Premier League Studio backend.

This module is the Python mirror of ``frontend/src/types/telemetry.ts`` (ADR 0005).
Every field name, nesting level and type in the TypeScript contract has a
counterpart here, and the WebSocket payload produced by the service is a
drop-in replacement for the TypeScript shape.

Contract rules enforced by this module:

* ``optional`` in TypeScript (``xG?``) means "may be absent" - those fields are
  serialised as *absent* when they carry no value.
* ``| null`` in TypeScript means "always present, possibly null" - those fields
  are always emitted, with ``null`` when empty.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_serializer


class TeamSide(StrEnum):
    """A side of the pitch. Home attacks towards +x, away attacks towards -x."""

    HOME = "home"
    AWAY = "away"


class PlayerRole(StrEnum):
    GK = "GK"
    DF = "DF"
    MF = "MF"
    FW = "FW"


class GameRhythm(StrEnum):
    """Game Rhythm - the temporal pacing of match actions (CONTEXT.md)."""

    STRUCTURED = "Structured"
    FLUID = "Fluid"
    TRANSITIONAL = "Transitional"
    CHAOTIC = "Chaotic"


class MatchEventType(StrEnum):
    PASS = "pass"
    CARRY = "carry"
    SHOT = "shot"
    DUEL = "duel"
    TACKLE = "tackle"
    INTERCEPTION = "interception"
    FOUL = "foul"
    GOAL = "goal"
    TURNOVER = "turnover"
    INFLECTION = "inflection"


class ExperiencePersona(StrEnum):
    ANALYST = "analyst"
    CASUAL = "casual"
    PLAYER_CAM = "player_cam"
    CLUB_CENTRIC = "club_centric"


class BroadcastLanguage(StrEnum):
    EN = "en"
    ES = "es"
    FR = "fr"
    JA = "ja"
    AR = "ar"


class AgentRole(StrEnum):
    TELEMETRY_INGESTION = "telemetry_ingestion"
    TACTICAL_REASONING = "tactical_reasoning"
    BROADCAST_NARRATIVE = "broadcast_narrative"
    FAN_PERSONALIZATION = "fan_personalization"


class AgentStatus(StrEnum):
    IDLE = "idle"
    RUNNING = "running"
    COMPLETE = "complete"
    FALLBACK = "fallback"


class SyntheticScenarioType(StrEnum):
    HIGH_POSSESSION = "high_possession"
    COUNTER_ATTACK_TRANSITION = "counter_attack_transition"
    LOW_BLOCK_SIEGE = "low_block_siege"
    BOX_SCRAMBLE = "box_scramble"


class _Contract(BaseModel):
    """Base model for every contract type."""

    model_config = ConfigDict(populate_by_name=True)


class ScorePair(_Contract):
    home: int
    away: int


class PitchPosition(_Contract):
    x: float
    y: float


class PlayerTelemetry(_Contract):
    id: str
    name: str
    shortName: str
    number: int
    team: TeamSide
    role: PlayerRole
    position: str
    x: float
    y: float
    vx: float
    vy: float
    speedKmH: float
    distanceMeters: float
    touches: int
    homeX: float
    homeY: float
    onBall: bool
    isDesignatedPlayerCam: bool | None = None

    @model_serializer(mode="wrap")
    def _drop_absent_optional(self, handler: Any) -> Any:
        data = handler(self)
        if self.isDesignatedPlayerCam is None:
            data.pop("isDesignatedPlayerCam", None)
        return data


class BallTelemetry(_Contract):
    x: float
    y: float
    z: float
    vx: float
    vy: float
    vz: float
    speedKmH: float
    possessionTeam: TeamSide | None
    possessionPlayerId: str | None
    lastTouchBy: str | None


class PassingLane(_Contract):
    passerId: str
    receiverId: str
    passerPos: PitchPosition
    receiverPos: PitchPosition
    interceptionRisk: float
    passDifficultyRating: float
    isClear: bool
    corridorWidthM: float
    interceptorCount: int
    passerPressure: float
    receiverCoverage: float
    defenderVelocityAlignment: float


class PitchControlCell(_Contract):
    x: float
    y: float
    controlScore: float
    homeWeight: float
    awayWeight: float


class MatchEvent(_Contract):
    id: str
    type: MatchEventType
    matchClock: str
    timestampMs: int
    team: TeamSide | None
    actorId: str | None
    targetId: str | None
    x: float
    y: float
    xG: float | None = None
    pdr: float | None = None
    completed: bool | None = None
    score: ScorePair | None = None
    description: str

    @model_serializer(mode="wrap")
    def _drop_absent_optional(self, handler: Any) -> Any:
        data = handler(self)
        for optional in ("xG", "pdr", "completed", "score"):
            if getattr(self, optional) is None:
                data.pop(optional, None)
        return data


class ShotOutcome(StrEnum):
    GOAL = "goal"
    SAVED = "saved"
    MISSED = "missed"


class ShotRecord(_Contract):
    """A single shot, kept in full so the Shoot Map can plot it."""

    id: str
    team: TeamSide
    playerId: str
    playerName: str
    matchClock: str
    timestampMs: int
    xG: float
    distanceToGoalM: float
    outcome: ShotOutcome
    onTarget: bool
    x: float
    y: float


class PlayerMatchStats(_Contract):
    """Per-player match statistics, derived from the simulation ledger."""

    id: str
    name: str
    shortName: str
    number: int
    team: TeamSide
    role: PlayerRole
    position: str
    touches: int
    passesAttempted: int
    passesCompleted: int
    shots: int
    distanceMeters: float
    topSpeedKmH: float
    rating: float


class PitchControlSplit(_Contract):
    home: float
    away: float
    contested: float


class SidePair(_Contract):
    """A home / away pair of values (possession share, completion, shots...)."""

    home: float
    away: float


class MatchMetrics(_Contract):
    controlVsChaosIndex: float
    passDifficultyRating: float
    gameRhythm: GameRhythm
    pitchControl: PitchControlSplit
    fastPathLatencyMs: float
    agentReasoningLatencyMs: float
    possessionShare: SidePair
    passCompletion: SidePair
    shotCount: SidePair
    duelCount: int
    topSprintKmH: float
    ballProgressionM: float


class MultilingualNarrative(_Contract):
    en: str
    es: str
    fr: str
    ja: str
    ar: str


class ClubCentricContext(_Contract):
    homeFrame: str
    awayFrame: str


class NarrativeEvent(_Contract):
    id: str
    matchClock: str
    timestamp: int
    isTacticalInflectionPoint: bool
    headline: MultilingualNarrative
    tacticalExplanation: MultilingualNarrative
    analystContext: str
    casualContext: str
    playerCamContext: str
    clubCentricContext: ClubCentricContext


class LowerThird(_Contract):
    headline: str
    subline: str
    speaker: str


class ScoreBug(_Contract):
    home: str
    away: str
    homeScore: int
    awayScore: int


class OverlayMetrics(_Contract):
    controlVsChaosIndex: float
    passDifficultyRating: float
    pitchControl: PitchControlSplit


class BroadcastOverlayPayload(_Contract):
    """Stage 4 artefact - machine readable graphical payload for broadcast."""

    overlayId: str
    schemaVersion: str
    syncTimestampMs: int
    matchClock: str
    lowerThird: LowerThird
    scoreBug: ScoreBug
    metrics: OverlayMetrics
    languages: dict[str, str]
    commentatorCue: str


class AgentTrace(_Contract):
    role: AgentRole
    label: str
    status: AgentStatus
    latencyMs: float
    reads: list[str]
    writes: list[str]
    summary: str


class TelemetryFrame(_Contract):
    """The single payload published on the WebSocket and served over REST."""

    frameId: int
    matchClock: str
    matchSeconds: float
    scenario: SyntheticScenarioType
    score: ScorePair
    ball: BallTelemetry
    players: list[PlayerTelemetry]
    passingLanes: list[PassingLane]
    pitchControlCells: list[PitchControlCell]
    events: list[MatchEvent]
    shots: list[ShotRecord]
    playerStats: list[PlayerMatchStats]
    metrics: MatchMetrics
    latestNarrative: NarrativeEvent
    agentTrace: list[AgentTrace]

    def to_wire(self) -> dict[str, Any]:
        """Serialise exactly the way the WebSocket publishes it."""
        return self.model_dump(mode="json")


class ScenarioSummary(_Contract):
    """Descriptor of a Synthetic Match Scenario exposed over REST."""

    id: SyntheticScenarioType
    label: str
    description: str
    anchorSeconds: float
    anchorClock: str


class ToolDescriptor(_Contract):
    """A single entry of the Azure MCP tool surface (ADR 0006)."""

    name: str
    description: str
    input_schema: dict[str, Any]
    implementation: str


class InvokeRequest(_Contract):
    tool: str
    arguments: dict[str, Any] = Field(default_factory=dict)


class InvokeResponse(_Contract):
    result: Any


class HealthResponse(_Contract):
    status: str
    service: str
    version: str
    azure: dict[str, bool]
    scenario: SyntheticScenarioType
    matchClock: str
    matchSeconds: float
    frameId: int
    ready: bool
    uptimeSeconds: float
    #: True only while the simulation worker thread is alive.
    simulationAlive: bool
    #: The reason the simulation died, when it did.
    workerError: str | None = None


__all__ = [
    "AgentRole",
    "AgentStatus",
    "AgentTrace",
    "BallTelemetry",
    "BroadcastLanguage",
    "BroadcastOverlayPayload",
    "ClubCentricContext",
    "ExperiencePersona",
    "GameRhythm",
    "HealthResponse",
    "InvokeRequest",
    "InvokeResponse",
    "LowerThird",
    "MatchEvent",
    "MatchEventType",
    "MatchMetrics",
    "MultilingualNarrative",
    "NarrativeEvent",
    "OverlayMetrics",
    "PassingLane",
    "PitchControlCell",
    "PitchControlSplit",
    "PitchPosition",
    "PlayerMatchStats",
    "PlayerRole",
    "PlayerTelemetry",
    "ScenarioSummary",
    "ScoreBug",
    "ScorePair",
    "ShotOutcome",
    "ShotRecord",
    "SidePair",
    "SyntheticScenarioType",
    "TeamSide",
    "TelemetryFrame",
    "ToolDescriptor",
]
