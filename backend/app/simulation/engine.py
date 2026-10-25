"""The synthetic match simulation engine.

This is a genuine, event driven football simulation (ADR 0001): the ball is
the state variable, possession is a chain of decisions taken by a carrier, and
every discrete match event is derived from the spatial state of the pitch.

The engine is deterministic: the same seed and the same Synthetic Match
Scenario always produce the same match, so a narrated moment can be cited and
re-verified.
"""

from __future__ import annotations

import logging
import math
import random
from dataclasses import dataclass, field
from time import perf_counter

from ..models import (
    BallTelemetry,
    MatchEvent,
    MatchEventType,
    MatchMetrics,
    NarrativeEvent,
    PlayerMatchStats,
    PlayerTelemetry,
    ScorePair,
    ShotOutcome,
    ShotRecord,
    SyntheticScenarioType,
    TeamSide,
    TelemetryFrame,
)
from .events import EventLog, make_event, new_event_id
from .metrics import (
    MATCH_LENGTH_SECONDS,
    MatchObservations,
    aggregate_pass_difficulty,
    chaos_inputs,
    control_vs_chaos_index,
    expected_goals,
    format_match_clock,
    game_rhythm,
    match_statistics,
    rhythm_inputs,
)
from .sectors import resolve_pitch_sector
from .spatial import (
    BOUNDARY_MARGIN,
    GOAL_HALF_WIDTH,
    PITCH_CENTRE_X,
    PITCH_CENTRE_Y,
    PITCH_LENGTH,
    PITCH_WIDTH,
    SimPlayer,
    attack_direction,
    distance,
    evaluate_lane,
    integrate_player_velocity,
    own_goal,
    pitch_control_percentages,
    pitch_control_surface,
    reflect,
    reflect_velocity,
    target_goal,
)

logger = logging.getLogger(__name__)


# --- Squad ---------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class SquadPlayer:
    id: str
    name: str
    short_name: str
    number: int
    team: TeamSide
    role: str
    slot: str
    lateral: float
    bias: float


SQUAD: tuple[SquadPlayer, ...] = (
    SquadPlayer("h1", "Ederson", "Ederson", 31, TeamSide.HOME, "GK", "gk", 0.50, 0.0),
    SquadPlayer("h2", "Kyle Walker", "Walker", 2, TeamSide.HOME, "DF", "def", 0.16, 0.0),
    SquadPlayer("h3", "Rúben Dias", "Dias", 3, TeamSide.HOME, "DF", "def", 0.38, 0.0),
    SquadPlayer("h4", "Manuel Akanji", "Akanji", 25, TeamSide.HOME, "DF", "def", 0.60, 0.0),
    SquadPlayer("h5", "Josko Gvardiol", "Gvardiol", 24, TeamSide.HOME, "DF", "def", 0.84, 0.0),
    SquadPlayer("h6", "Rodri", "Rodri", 16, TeamSide.HOME, "MF", "mid", 0.44, 0.0),
    SquadPlayer("h7", "Bernardo Silva", "Bernardo", 20, TeamSide.HOME, "MF", "mid", 0.70, 2.0),
    SquadPlayer("h8", "Kevin De Bruyne", "De Bruyne", 17, TeamSide.HOME, "MF", "mid", 0.26, 9.0),
    SquadPlayer("h9", "Phil Foden", "Foden", 47, TeamSide.HOME, "FW", "fwd", 0.16, 0.0),
    SquadPlayer("h10", "Jack Grealish", "Grealish", 10, TeamSide.HOME, "FW", "fwd", 0.48, 0.0),
    SquadPlayer("h11", "Erling Haaland", "Haaland", 9, TeamSide.HOME, "FW", "fwd", 0.80, 0.0),
    SquadPlayer("a1", "David Raya", "Raya", 22, TeamSide.AWAY, "GK", "gk", 0.50, 0.0),
    SquadPlayer("a2", "Ben White", "White", 4, TeamSide.AWAY, "DF", "def", 0.16, 0.0),
    SquadPlayer("a3", "William Saliba", "Saliba", 2, TeamSide.AWAY, "DF", "def", 0.38, 0.0),
    SquadPlayer("a4", "Gabriel", "Gabriel", 6, TeamSide.AWAY, "DF", "def", 0.60, 0.0),
    SquadPlayer("a5", "Jurriën Timber", "Timber", 12, TeamSide.AWAY, "DF", "def", 0.84, 0.0),
    SquadPlayer("a6", "Thomas Partey", "Partey", 5, TeamSide.AWAY, "MF", "mid", 0.36, 0.0),
    SquadPlayer("a7", "Declan Rice", "Rice", 41, TeamSide.AWAY, "MF", "mid", 0.56, 0.0),
    SquadPlayer("a8", "Martin Ødegaard", "Ødegaard", 8, TeamSide.AWAY, "MF", "mid", 0.76, 7.0),
    SquadPlayer("a9", "Bukayo Saka", "Saka", 7, TeamSide.AWAY, "FW", "fwd", 0.16, 0.0),
    SquadPlayer("a10", "Gabriel Martinelli", "Martinelli", 11, TeamSide.AWAY, "FW", "fwd", 0.44, 0.0),
    SquadPlayer("a11", "Kai Havertz", "Havertz", 29, TeamSide.AWAY, "FW", "fwd", 0.72, 0.0),
)


def granular_position(slot: str, lateral: float) -> str:
    """The granular formation position of a player, e.g. "LB", "AM", "ST".

    The studio uses it to label the pitch and the formation cards; it is
    derived from the line the player plays in and from his lateral station
    on that line, so it is a *description* of the simulation, not a label
    typed in by hand.
    """
    if slot == "gk":
        return "GK"
    if slot == "def":
        if lateral < 0.30:
            return "LB"
        if lateral > 0.70:
            return "RB"
        return "CB"
    if slot == "mid":
        if lateral < 0.33:
            return "LM"
        if lateral < 0.50:
            return "CM"
        if lateral < 0.66:
            return "AM"
        return "RM"
    if lateral < 0.33:
        return "LW"
    if lateral > 0.66:
        return "RW"
    return "ST"


ROLE_SPRINT = {"GK": 6.2, "DF": 7.4, "MF": 7.9, "FW": 8.5}
DESIGNATED_PLAYER_CAM_ID = "h11"


# --- Synthetic Match Scenario ---------------------------------------------------


@dataclass(frozen=True, slots=True)
class TeamShape:
    """The shape of a team: the x distance from its own goal line of each line."""

    def_line: float
    mid_line: float
    fwd_line: float
    spread: float
    ball_shift: float


@dataclass(frozen=True, slots=True)
class ScenarioProfile:
    """The tactical profile of a Synthetic Match Scenario."""

    id: SyntheticScenarioType
    label: str
    description: str
    anchor_seconds: float
    home: TeamShape
    away: TeamShape
    home_possession: float
    decision_interval: float
    verticality: float
    interception_bias: float
    shot_bias: float
    press_intensity: float
    duel_rate: float
    tempo: float


SCENARIOS: dict[SyntheticScenarioType, ScenarioProfile] = {
    SyntheticScenarioType.HIGH_POSSESSION: ScenarioProfile(
        id=SyntheticScenarioType.HIGH_POSSESSION,
        label="Sustained High Possession",
        description=(
            "Manchester City circulate patiently through a compact Arsenal shape, "
            "compressing Pitch Space without ever forcing the issue."
        ),
        anchor_seconds=68 * 60 + 40,
        home=TeamShape(def_line=44, mid_line=60, fwd_line=80, spread=1.18, ball_shift=6),
        away=TeamShape(def_line=24, mid_line=38, fwd_line=50, spread=0.74, ball_shift=3),
        home_possession=0.78,
        decision_interval=2.1,
        verticality=0.52,
        interception_bias=1.05,
        shot_bias=0.95,
        press_intensity=0.85,
        duel_rate=0.14,
        tempo=0.95,
    ),
    SyntheticScenarioType.COUNTER_ATTACK_TRANSITION: ScenarioProfile(
        id=SyntheticScenarioType.COUNTER_ATTACK_TRANSITION,
        label="Counter-Attack Transition",
        description=(
            "Arsenal sit deep and break at speed, turning every loose ball into a "
            "vertical transition before City can re-shape."
        ),
        anchor_seconds=74 * 60 + 10,
        home=TeamShape(def_line=50, mid_line=62, fwd_line=82, spread=1.22, ball_shift=9),
        away=TeamShape(def_line=30, mid_line=50, fwd_line=62, spread=1.05, ball_shift=8),
        home_possession=0.34,
        decision_interval=1.3,
        verticality=0.86,
        interception_bias=1.55,
        shot_bias=0.55,
        press_intensity=1.50,
        duel_rate=0.42,
        tempo=1.45,
    ),
    SyntheticScenarioType.LOW_BLOCK_SIEGE: ScenarioProfile(
        id=SyntheticScenarioType.LOW_BLOCK_SIEGE,
        label="Low-Block Defensive Wall",
        description=(
            "Arsenal defend a narrow, flat low block while City probe it from "
            "the flanks, forcing long trajectories into a congested box."
        ),
        anchor_seconds=82 * 60 + 5,
        home=TeamShape(def_line=48, mid_line=64, fwd_line=76, spread=1.26, ball_shift=5),
        away=TeamShape(def_line=17, mid_line=24, fwd_line=33, spread=0.60, ball_shift=2),
        home_possession=0.85,
        decision_interval=2.8,
        verticality=0.30,
        interception_bias=1.35,
        shot_bias=1.55,
        press_intensity=0.60,
        duel_rate=0.10,
        tempo=0.80,
    ),
    SyntheticScenarioType.BOX_SCRAMBLE: ScenarioProfile(
        id=SyntheticScenarioType.BOX_SCRAMBLE,
        label="Penalty Box Scramble",
        description=(
            "A frantic sequence inside the penalty area: ricochets, blocks and "
            "desperation clearances with the match in its final minute."
        ),
        anchor_seconds=89 * 60 + 50,
        home=TeamShape(def_line=56, mid_line=66, fwd_line=76, spread=0.90, ball_shift=4),
        away=TeamShape(def_line=11, mid_line=15, fwd_line=20, spread=0.66, ball_shift=2),
        home_possession=0.60,
        decision_interval=1.3,
        verticality=0.78,
        interception_bias=1.70,
        shot_bias=0.60,
        press_intensity=2.00,
        duel_rate=0.75,
        tempo=1.55,
    ),
}

SCENARIO_ORDER: tuple[SyntheticScenarioType, ...] = (
    SyntheticScenarioType.HIGH_POSSESSION,
    SyntheticScenarioType.COUNTER_ATTACK_TRANSITION,
    SyntheticScenarioType.LOW_BLOCK_SIEGE,
    SyntheticScenarioType.BOX_SCRAMBLE,
)


# --- Internal flight state ------------------------------------------------------


@dataclass(slots=True)
class Flight:
    """A pass in flight between two players."""

    passer_id: str
    receiver_id: str
    start_x: float
    start_y: float
    end_x: float
    end_y: float
    duration: float
    elapsed: float = 0.0
    speed: float = 18.0
    outcome: str = "completed"
    interceptor_id: str | None = None
    pdr: float = 0.0
    foul: bool = False
    speed_kmh: float = 0.0
    apex_z: float = 0.0
    flight_type: str = "ground"


@dataclass(slots=True)
class MatchState:
    """The mutable state of a synthetic match."""

    players: list[SimPlayer] = field(default_factory=list)
    ball_x: float = PITCH_CENTRE_X
    ball_y: float = PITCH_CENTRE_Y
    ball_z: float = 0.0
    ball_vx: float = 0.0
    ball_vy: float = 0.0
    ball_vz: float = 0.0
    carrier_id: str | None = None
    last_touch_by: str | None = None
    flight: Flight | None = None


class MatchEngine:
    """The synthetic match simulation engine.

    The engine owns the spatial state, the possession chain and the discrete
    event log. It never invents a metric value: every number it publishes is
    measured from the state it has simulated.
    """

    #: How many candidates are offered to the viewer as live Passing Lanes.
    LANE_COUNT = 5

    #: Baseline probability that a broken pass is lost to the opposition.
    BASE_TURNOVER_PROBABILITY = 0.22

    #: How strongly the declared possession share tilts the turnover rate.
    POSSESSION_ASYMMETRY = 6.0

    #: How much further up the pitch a team pushes when it is in possession.
    POSSESSION_PUSH = 2.4

    #: How long (in seconds) the shape takes to ease in and out of possession.
    POSSESSION_BLEND_SECONDS = 2.5

    #: The time constant (in seconds) of the rolling possession share that
    #: the possession controller steers on.
    POSSESSION_EMA_SECONDS = 45.0

    #: Base probability that a decision in the attacking third is a shot.
    SHOT_BASE_RATE = 0.07

    #: How quickly the chance of shooting falls away with the distance to goal.
    #: A Premier League side attempts roughly a third of its shots from outside
    #: the penalty area, so the fall-off cannot be steep.
    SHOT_DISTANCE_DECAY = 15.0

    #: How aggressively a player accelerates towards its target position. The
    #: gain is a first order response (metres per second per metre of error):
    #: a player that is half a second away from its position is already
    #: running, which is what keeps the distance covered per match realistic.
    STEERING_GAIN = 1.1

    #: How hard two teammates push each other apart.
    SEPARATION_STRENGTH = 1.2

    #: How quickly the shape of a team can follow the ball (metres per second).
    SHAPE_TRACK_RATE = 2.0

    #: How strongly a player is pulled towards the ball, in and out of possession.
    PULL_IN_POSSESSION = 0.30
    PULL_OUT_OF_POSSESSION = 0.16

    #: How far (in metres) a player drifts around its shape anchor.
    ROAM_AMPLITUDE = 0.9

    #: How likely each line is to shoot rather than pass.
    SHOT_ROLE_FACTOR = {"FW": 1.0, "MF": 0.28, "DF": 0.05, "GK": 0.0}

    #: Pass completion model: base probability, and the sensitivity to the
    #: interception risk and to the pressure on the passer.
    PASS_COMPLETION_BASE = 0.925
    PASS_COMPLETION_RISK = 0.37
    PASS_COMPLETION_PRESSURE = 0.08

    #: How much of the expected goals a shot actually converts into a goal.
    GOAL_CONVERSION_FACTOR = 0.42

    #: Base spread (metres) of the lateral error of a strike.
    SHOT_ERROR_BASE = 4.0

    #: How much the spread grows with every metre of distance to goal.
    SHOT_ERROR_DISTANCE = 0.10

    #: How much the spread grows with the pressure of the nearest defender.
    SHOT_ERROR_PRESSURE = 1.6

    #: How far ahead of (or behind) the ball each line may sit when the team is
    #: in possession, as (minimum, maximum) metres in the attack direction.
    IN_POSSESSION_LEAD = {
        "fwd": (5.0, 17.0),
        "mid": (-7.0, 7.0),
        "def": (-22.0, -6.0),
    }

    def __init__(self, seed: int = 20260922) -> None:
        self.seed = seed
        self.rng = random.Random(seed)
        self.state = MatchState()
        self.scenario: ScenarioProfile = SCENARIOS[SyntheticScenarioType.HIGH_POSSESSION]
        self.match_seconds: float = 0.0
        self.frame_id: int = 0
        self.score: dict[str, int] = {"home": 0, "away": 0}
        self.events = EventLog()
        self.observations = MatchObservations(
            possession_seconds={"home": 0.0, "away": 0.0},
        )
        self.top_sprint_kmh: float = 0.0
        self.ball_progression_m: float = 0.0
        self.shot_log: list[ShotRecord] = []
        self._sequence_team: TeamSide | None = None
        self._sequence_started_at: float = 0.0
        self._possession_side: TeamSide | None = None
        self._possession_weight: dict[TeamSide, float] = {TeamSide.HOME: 0.0, TeamSide.AWAY: 0.0}
        self._possession_ema: float = 0.5
        self._last_carrier_id: str | None = None
        self._shape_ball_x: float = PITCH_CENTRE_X
        self._shape_ball_y: float = PITCH_CENTRE_Y
        self._decision_timer: float = 0.0
        self._carry_anchor: tuple[float, float] = (PITCH_CENTRE_X, PITCH_CENTRE_Y)
        self._anchor_tick: int = 0
        self._lane_cache: list = []
        self._last_fast_path_ms: float = 0.0
        self._last_passer_id: str | None = None
        self._last_pass_time: float = 0.0

    # -- lifecycle ------------------------------------------------------------

    def reset(
        self,
        scenario: SyntheticScenarioType | str,
        start_seconds: float | None = None,
        warmup_seconds: float = 0.0,
        dt: float = 0.2,
    ) -> None:
        """Rebuild the match from scratch for a Synthetic Match Scenario."""
        if isinstance(scenario, str):
            scenario = SyntheticScenarioType(scenario)
        self.scenario = SCENARIOS[scenario]
        self.rng = random.Random(self.seed + list(SCENARIO_ORDER).index(scenario))
        self.match_seconds = 0.0
        self.frame_id = 0
        self.score = {"home": 0, "away": 0}
        self.events.clear()
        self.observations = MatchObservations(possession_seconds={"home": 0.0, "away": 0.0})
        self.top_sprint_kmh = 0.0
        self.ball_progression_m = 0.0
        self.shot_log = []
        self._lane_cache = []
        self._possession_weight = {TeamSide.HOME: 0.0, TeamSide.AWAY: 0.0}
        self._possession_ema = 0.5
        self._shape_ball_x = PITCH_CENTRE_X
        self._shape_ball_y = PITCH_CENTRE_Y
        self._last_passer_id = None
        self._last_pass_time = 0.0
        self._build_players()
        self._kickoff(TeamSide.HOME)
        anchor = self.scenario.anchor_seconds if start_seconds is None else start_seconds
        if warmup_seconds > 0:
            self.fast_forward(warmup_seconds, dt=dt)
            self.match_seconds = anchor
        else:
            self.match_seconds = anchor

    def _build_players(self) -> None:
        players: list[SimPlayer] = []
        for entry in SQUAD:
            speed = ROLE_SPRINT[entry.role]
            players.append(
                SimPlayer(
                    id=entry.id,
                    name=entry.name,
                    short_name=entry.short_name,
                    number=entry.number,
                    team=entry.team,
                    role=entry.role,
                    slot=entry.slot,
                    x=PITCH_CENTRE_X,
                    y=PITCH_CENTRE_Y,
                    max_sprint=speed,
                    is_designated_player_cam=entry.id == DESIGNATED_PLAYER_CAM_ID,
                )
            )
        self.state = MatchState(players=players)
        self._update_anchors(force=True)
        for player in players:
            player.x = player.home_x
            player.y = player.home_y
            player.distance_meters = 0.0
        self.state.ball_x = PITCH_CENTRE_X
        self.state.ball_y = PITCH_CENTRE_Y

    def _kickoff(self, team: TeamSide) -> None:
        """Place the ball on the centre spot with a midfielder in possession."""
        state = self.state
        state.flight = None
        state.carrier_id = None
        kicker = next(
            (p for p in state.players if p.team is team and p.role == "MF"),
            state.players[0],
        )
        kicker.x = PITCH_CENTRE_X
        kicker.y = PITCH_CENTRE_Y
        state.ball_x = kicker.x
        state.ball_y = kicker.y
        state.ball_z = 0.0
        state.carrier_id = kicker.id
        state.last_touch_by = kicker.id
        kicker.on_ball = True
        self._last_carrier_id = kicker.id
        self._possession_side = team
        self._sequence_team = team
        self._sequence_started_at = self.match_seconds
        self._decision_timer = self.scenario.decision_interval
        self._carry_anchor = (kicker.x, kicker.y)

    # -- simulation ------------------------------------------------------------

    def step(self, dt: float) -> None:
        """Advance the simulation by ``dt`` match seconds."""
        if self.match_seconds >= MATCH_LENGTH_SECONDS:
            return
        self.match_seconds = min(MATCH_LENGTH_SECONDS, self.match_seconds + dt)
        self._update_possession_weight(dt)
        self._track_shape_ball(dt)
        self._update_anchors()
        self._update_players(dt)
        self._update_ball(dt)
        self._update_decision(dt)
        if self._possession_side is not None:
            side = self._possession_side.value
            self.observations.possession_seconds[side] = (
                self.observations.possession_seconds.get(side, 0.0) + dt
            )
        self.observations.elapsed_seconds = self.match_seconds
        self._update_possession_ema(dt)

    def fast_forward(self, seconds: float, dt: float = 0.2) -> None:
        """Simulate ``seconds`` of match time as quickly as possible."""
        steps = int(max(0.0, seconds) / dt)
        for _ in range(steps):
            if self.match_seconds >= MATCH_LENGTH_SECONDS:
                break
            self.step(dt)

    def jump_to_seconds(self, target_seconds: float, dt: float = 0.5) -> None:
        """Jump match time to target_seconds cleanly, advancing or rewinding simulation."""
        target_seconds = max(0.0, min(float(MATCH_LENGTH_SECONDS), float(target_seconds)))
        if not self.state.players:
            self.reset(self.scenario.id, start_seconds=0.0, warmup_seconds=0.0)
        if target_seconds < self.match_seconds:
            self.reset(self.scenario.id, start_seconds=0.0, warmup_seconds=0.0)
            if target_seconds > 0.0:
                self.fast_forward(target_seconds, dt=dt)
            self.match_seconds = target_seconds
        elif target_seconds > self.match_seconds:
            self.fast_forward(target_seconds - self.match_seconds, dt=dt)
            self.match_seconds = target_seconds

    def jump_to(self, target_seconds: float, dt: float = 0.5) -> None:
        """Alias for jump_to_seconds for backward compatibility."""
        self.jump_to_seconds(target_seconds, dt=dt)

    def _update_possession_ema(self, dt: float) -> None:
        """Track a rolling estimate of the possession share.

        The controller that steers the turnover rate has to react to what is
        happening *now*. Steering on the cumulative share of the whole match
        makes the loop oscillate: the side that is ahead is punished, the
        opposition stringes together long spells, and the cumulative average
        swings back the other way.
        """
        seconds = self.observations.possession_seconds
        total = seconds.get("home", 0.0) + seconds.get("away", 0.0)
        if total <= 0.0:
            return
        share = seconds.get("home", 0.0) / total
        blend = min(1.0, dt / self.POSSESSION_EMA_SECONDS)
        self._possession_ema += (share - self._possession_ema) * blend

    def _update_possession_weight(self, dt: float) -> None:
        """Ease the possession weight of each side in and out of possession.

        The weight drives how far up the pitch a side pushes its shape and how
        its lines relate to the ball. It has to be *continuous*: a shape that
        jumps twenty metres the instant the ball changes hands makes every
        player sprint after an anchor that will never be reached, which is
        what inflates the distance covered and wrecks the top sprint speed.
        """
        blend = min(1.0, dt / self.POSSESSION_BLEND_SECONDS)
        possession = self._possession_team()
        for team in (TeamSide.HOME, TeamSide.AWAY):
            target = 1.0 if possession is team else 0.0
            weight = self._possession_weight[team]
            self._possession_weight[team] = weight + (target - weight) * blend

    def _track_shape_ball(self, dt: float) -> None:
        """Track the ball with the shape, but at a human speed.

        A defensive line does not teleport across the pitch when the ball is
        played: the shape follows the ball at a limited rate, which is what
        keeps the distance covered by the players realistic.
        """
        limit = self.SHAPE_TRACK_RATE * dt
        self._shape_ball_x += max(-limit, min(limit, self.state.ball_x - self._shape_ball_x))
        self._shape_ball_y += max(-limit, min(limit, self.state.ball_y - self._shape_ball_y))

    def _update_anchors(self, force: bool = False) -> None:
        """Recompute the formation anchors (spring targets) of every player."""
        self._anchor_tick += 1
        if not force and self._anchor_tick % 5 != 0:
            return
        state = self.state
        for team, shape in ((TeamSide.HOME, self.scenario.home), (TeamSide.AWAY, self.scenario.away)):
            opp_weight = max(0.0, 1.0 - self._possession_weight[team])
            # Dynamic line depth compression: under opponent pressure, def and mid lines compress (9-14m)
            base_depth = shape.mid_line - shape.def_line
            line_compression = max(0.0, base_depth - 11.0) * 0.35 * opp_weight * min(1.2, self.scenario.press_intensity)

            for player in state.players:
                if player.team is not team:
                    continue
                if player.slot == "gk":
                    base_x = 4.5
                    base_y = PITCH_CENTRE_Y
                else:
                    if player.slot == "def":
                        slot_x = shape.def_line + line_compression * 0.35
                    elif player.slot == "mid":
                        slot_x = shape.mid_line - line_compression * 0.65
                    else:
                        slot_x = shape.fwd_line
                    base_x = slot_x + self._bias_of(player.id)
                    base_y = self._lateral_of(player.id) * PITCH_WIDTH * shape.spread
                if team is TeamSide.AWAY:
                    x = PITCH_LENGTH - base_x
                    y = PITCH_CENTRE_Y * 2 - base_y
                else:
                    x = base_x
                    y = base_y
                # The whole shape slides towards the ball, and pushes further up
                # the pitch when the team is the one in possession. The anchor
                # is already expressed in world coordinates (the away side is
                # mirrored), so the slide is a plain world-space offset towards
                # the ball - never a second mirror, which would push the shape
                # away from the ball it is supposed to follow.
                ball_delta = max(-22.0, min(22.0, self._shape_ball_x - PITCH_CENTRE_X))
                weight = self._possession_weight[team]
                push = 1.0 + (self.POSSESSION_PUSH - 1.0) * weight
                if player.slot != "gk":
                    x += ball_delta * (shape.ball_shift * push / 12.0)
                y += max(-14.0, min(14.0, self._shape_ball_y - PITCH_CENTRE_Y)) * 0.35

                # Shift weak-side outfield players centrally during flank play
                if player.slot != "gk":
                    if self._shape_ball_y < 20.0 and y > PITCH_CENTRE_Y:
                        y -= 5.5 * opp_weight
                    elif self._shape_ball_y > 48.0 and y < PITCH_CENTRE_Y:
                        y += 5.5 * opp_weight

                x = self._clamp_to_ball(x, player, team)
                player.home_x = max(2.0, min(PITCH_LENGTH - 2.0, x))
                player.home_y = max(3.0, min(PITCH_WIDTH - 3.0, y))

    def _clamp_to_ball(self, x: float, player: SimPlayer, team: TeamSide) -> float:
        """Keep the player within a physically sensible distance of the ball.

        A team in possession plays *around* the ball: its forwards stay ahead
        of it, its midfielders on it and its defenders behind it. A team out
        of possession keeps its shape between the ball and its own goal, and
        steps up to press in proportion to its press intensity.
        """
        direction = attack_direction(team)
        ball_x = self._shape_ball_x
        ahead = direction * (x - ball_x)
        if player.slot == "gk":
            # The keeper never leaves his own goal area.
            return x
        weight = self._possession_weight[team]
        low, high = self.IN_POSSESSION_LEAD.get(player.slot, (-12.0, 12.0))
        in_possession = _soft_limit(ahead, low, high)
        press = self.scenario.press_intensity
        trail = {
            "def": -(9.0 + 21.0 * press),
            "mid": -(21.0 + 20.0 * press),
            "fwd": -(28.0 + 14.0 * press),
        }.get(player.slot, -20.0)
        out_of_possession = _soft_limit(ahead, trail, 1.0e6)
        blended = weight * in_possession + (1.0 - weight) * out_of_possession
        return ball_x + direction * blended

    def _roam(self, player: SimPlayer) -> tuple[float, float]:
        """The off-ball movement of a player around its shape anchor."""
        index = self.state.players.index(player)
        phase = self.match_seconds * 0.55 + index * 0.83
        return (
            math.sin(phase) * self.ROAM_AMPLITUDE,
            math.sin(phase * 2.0 + 1.1) * self.ROAM_AMPLITUDE * 0.6,
        )

    def _bias_of(self, player_id: str) -> float:
        for entry in SQUAD:
            if entry.id == player_id:
                return entry.bias
        return 0.0

    def _lateral_of(self, player_id: str) -> float:
        for entry in SQUAD:
            if entry.id == player_id:
                return entry.lateral
        return 0.5

    def _update_players(self, dt: float) -> None:
        state = self.state
        players = state.players
        ball_x, ball_y = state.ball_x, state.ball_y
        possession = self._possession_team()

        for team in (TeamSide.HOME, TeamSide.AWAY):
            mates = [p for p in players if p.team is team]
            # The goalkeeper never leaves his penalty area and never presses.
            outfield = [p for p in mates if p.slot != "gk"]
            ranked = sorted(outfield, key=lambda p: distance(p.x, p.y, ball_x, ball_y))
            direction = attack_direction(team)
            in_possession = possession is team
            # The presser is the closest player who still has to travel to the
            # ball: a committed press means a genuine sprint.
            presser = next(
                (p for p in ranked if distance(p.x, p.y, ball_x, ball_y) > 5.0),
                ranked[0] if ranked else mates[0],
            )
            presser_id = presser.id
            coverer_id = ranked[1].id if len(ranked) > 1 else None
            # Tactical pressing trigger: burst on primary presser when opponent enters
            # defensive third or wide touchline trap corridor.
            own_gx, _ = own_goal(team)
            dist_to_own_goal = abs(ball_x - own_gx)
            defensive_danger = dist_to_own_goal <= 35.0 or (ball_y < 12.0 or ball_y > 56.0)
            should_press_burst = (not in_possession) and defensive_danger

            for player in mates:
                player.is_pressing = should_press_burst and (player.id == presser_id)
                anchor_x, anchor_y = player.home_x, player.home_y
                if player.slot == "gk":
                    # The keeper holds his line and only shifts across his goal.
                    target_x = anchor_x
                    target_y = anchor_y + max(-4.0, min(4.0, ball_y - anchor_y)) * 0.35
                elif in_possession and player.id == presser_id:
                    # Support run ahead of the ball. The run follows the shape
                    # of the ball rather than the ball itself: a support run
                    # is a run into space, not a chase of a 30 km/h pass.
                    target_x = self._shape_ball_x + direction * 5.0
                    target_y = self._shape_ball_y
                elif not in_possession and player.id == presser_id:
                    # The presser approaches from in front of the ball.
                    target_x = self._shape_ball_x - direction * 1.6
                    target_y = self._shape_ball_y
                elif not in_possession and player.id == coverer_id:
                    # The coverer screens the space behind the presser.
                    target_x = self._shape_ball_x - direction * 4.5
                    target_y = self._shape_ball_y + (3.0 if player.y >= ball_y else -3.0)
                else:
                    pull = self.PULL_IN_POSSESSION if in_possession else self.PULL_OUT_OF_POSSESSION
                    press = self.scenario.press_intensity if not in_possession else 1.0
                    # The pull follows the *shape* of the ball, not the ball
                    # itself: a player cannot chase a ball that travels at
                    # 30 km/h, and pretending otherwise inflates the distance
                    # covered by every single player.
                    target_x = anchor_x + (self._shape_ball_x - anchor_x) * pull * press
                    target_y = anchor_y + (self._shape_ball_y - anchor_y) * pull * press

                # Teammate separation.
                sep_x = sep_y = 0.0
                for mate in mates:
                    if mate.id == player.id:
                        continue
                    gap = distance(player.x, player.y, mate.x, mate.y)
                    if gap < 7.0 and gap > 0.01:
                        force = (7.0 - gap) / 7.0
                        sep_x += (player.x - mate.x) / gap * force * self.SEPARATION_STRENGTH
                        sep_y += (player.y - mate.y) / gap * force * self.SEPARATION_STRENGTH

                # Off-ball movement: the players keep working even when the
                # ball is elsewhere, which is what makes the distance covered
                # and the top sprint speed honest.
                roam = self._roam(player)
                target_x += roam[0]
                target_y += roam[1]

                desired_vx = (target_x - player.x) * self.STEERING_GAIN + sep_x
                desired_vy = (target_y - player.y) * self.STEERING_GAIN + sep_y

                new_vx, new_vy, ax, ay = integrate_player_velocity(
                    player.vx,
                    player.vy,
                    desired_vx,
                    desired_vy,
                    dt,
                    player.max_sprint,
                    player.is_pressing,
                )
                player.ax = ax
                player.ay = ay
                player.vx = new_vx
                player.vy = new_vy

                player.x = reflect(player.x + player.vx * dt, 0.0, PITCH_LENGTH, BOUNDARY_MARGIN)
                player.y = reflect(player.y + player.vy * dt, 0.0, PITCH_WIDTH, BOUNDARY_MARGIN)
                player.vx = reflect_velocity(player.vx, player.x, 0.0, PITCH_LENGTH, BOUNDARY_MARGIN)
                player.vy = reflect_velocity(player.vy, player.y, 0.0, PITCH_WIDTH, BOUNDARY_MARGIN)

                travelled = math.hypot(player.vx, player.vy) * dt
                player.distance_meters += travelled
                player.top_speed_kmh = max(player.top_speed_kmh, player.speed_kmh)
                self.top_sprint_kmh = max(self.top_sprint_kmh, player.speed_kmh)

    def _possession_team(self) -> TeamSide | None:
        if self.state.carrier_id is None:
            return None
        for player in self.state.players:
            if player.id == self.state.carrier_id:
                return player.team
        return None

    def _update_ball(self, dt: float) -> None:
        state = self.state
        flight = state.flight
        if flight is not None:
            flight.elapsed += dt
            duration = max(0.05, flight.duration)
            progress = min(1.0, flight.elapsed / duration)
            previous_x = state.ball_x
            state.ball_x = flight.start_x + (flight.end_x - flight.start_x) * progress
            state.ball_y = flight.start_y + (flight.end_y - flight.start_y) * progress
            state.ball_vx = (flight.end_x - flight.start_x) / duration
            state.ball_vy = (flight.end_y - flight.start_y) / duration

            # 3D Parabolic Gravity Physics:
            if flight.apex_z > 0.0:
                state.ball_z = max(0.0, 4.0 * flight.apex_z * progress * (1.0 - progress))
                state.ball_vz = 4.0 * flight.apex_z * (1.0 - 2.0 * progress) / duration
            else:
                state.ball_z = 0.0
                state.ball_vz = 0.0

            passer = self._player(flight.passer_id)
            if passer is not None:
                direction = attack_direction(passer.team)
                self.ball_progression_m += max(0.0, direction * (state.ball_x - previous_x))
            if flight.elapsed >= flight.duration:
                state.ball_z = 0.0
                state.ball_vz = 0.0
                self._resolve_flight(flight)
            return

        carrier = self._carrier()
        if carrier is None:
            return
        previous_x = state.ball_x
        state.ball_x = carrier.x
        state.ball_y = carrier.y
        state.ball_z = 0.0
        state.ball_vx = carrier.vx
        state.ball_vy = carrier.vy
        state.ball_vz = 0.0
        direction = attack_direction(carrier.team)
        self.ball_progression_m += max(0.0, direction * (state.ball_x - previous_x))

    def _carrier(self) -> SimPlayer | None:
        if self.state.carrier_id is None:
            return None
        for player in self.state.players:
            if player.id == self.state.carrier_id:
                return player
        return None

    def _update_decision(self, dt: float) -> None:
        if self.state.flight is not None or self.state.carrier_id is None:
            return
        carrier = self._carrier()
        if carrier is None:
            return
        self._track_carry(carrier)
        self._decision_timer -= dt
        if self._decision_timer <= 0.0:
            self._decide(carrier)

    # -- the possession chain ---------------------------------------------------

    def _opponents(self, team: TeamSide) -> list[SimPlayer]:
        return [p for p in self.state.players if p.team is not team]

    def _teammates(self, team: TeamSide) -> list[SimPlayer]:
        return [p for p in self.state.players if p.team is team]

    def _decide(self, carrier: SimPlayer) -> None:
        """The carrier takes a decision: shoot, pass, or lose the ball."""
        scenario = self.scenario
        team = carrier.team
        opponents = self._opponents(team)
        self._decision_timer = scenario.decision_interval / max(0.4, scenario.tempo)

        # 1. Is there a shooting opportunity? The closer the carrier is to the
        #    goal and the less congested the space, the more likely the shot is.
        #    Only the attacking lines shoot: a defender plays for the counter and
        #    the goalkeeper distributes.
        goal_x, goal_y = target_goal(team)
        goal_distance = distance(carrier.x, carrier.y, goal_x, goal_y)
        forward = attack_direction(team) * (carrier.x - PITCH_CENTRE_X)
        congestion = sum(1 for o in opponents if distance(carrier.x, carrier.y, o.x, o.y) <= 6.0)
        role_factor = self.SHOT_ROLE_FACTOR.get(carrier.role, 0.0)
        if forward > 6.0 and goal_distance < 40.0 and role_factor > 0.0:
            closeness = math.exp(-max(0.0, goal_distance - 5.0) / self.SHOT_DISTANCE_DECAY)
            shot_probability = (
                self.SHOT_BASE_RATE * scenario.shot_bias * role_factor * closeness * (1.0 - 0.06 * congestion)
            )
            if self.rng.random() < shot_probability:
                self._take_shot(carrier, opponents)
                return

        # 2. Dribble / Carry into open space:
        direction = attack_direction(team)
        opps_ahead = sum(
            1
            for o in opponents
            if direction * (o.x - carrier.x) > 0 and distance(carrier.x, carrier.y, o.x, o.y) <= 7.0
        )
        if opps_ahead == 0 and carrier.role != "GK":
            dribble_prob = 0.28 if scenario.id == SyntheticScenarioType.COUNTER_ATTACK_TRANSITION else 0.18
            if self.rng.random() < dribble_prob:
                self._decision_timer = 1.0 + self.rng.random() * 0.8
                return

        # 3. Pass.
        self._attempt_pass(carrier, opponents)

    def _attempt_pass(self, carrier: SimPlayer, opponents: list[SimPlayer]) -> None:
        team = carrier.team
        direction = attack_direction(team)
        # The goalkeeper distributes long: a clearance can travel the length
        # of the pitch, an outfield pass rarely does.
        max_lane = 80.0 if carrier.role == "GK" else 46.0
        teammates = [
            p
            for p in self._teammates(team)
            if p.id != carrier.id and p.role != "GK" and distance(carrier.x, carrier.y, p.x, p.y) <= max_lane
        ]
        if not teammates:
            self._turnover(carrier, carrier, "turnover")
            return

        weights: list[float] = []
        for mate in teammates:
            forward_gain = direction * (mate.x - carrier.x)
            space = sum(1 for o in opponents if distance(mate.x, mate.y, o.x, o.y) <= 8.0)
            pressure = sum(1 for o in opponents if distance(mate.x, mate.y, o.x, o.y) <= 4.0)
            lane_length = distance(carrier.x, carrier.y, mate.x, mate.y)
            weight = math.exp((0.9 + 1.5 * self.scenario.verticality) * forward_gain / 12.0)
            weight *= 1.0 / (1.0 + 0.30 * pressure)
            weight *= 1.0 / (1.0 + 0.10 * space)
            weight *= 1.0 / (1.0 + 0.012 * lane_length)
            if forward_gain < -4.0:
                weight *= 0.25
            weights.append(max(1e-6, weight))

        total = sum(weights)
        pick = self.rng.random() * total
        receiver = teammates[-1]
        running = total
        for mate, weight in zip(teammates, weights, strict=True):
            running -= weight
            if pick >= running:
                receiver = mate
                break

        lane = evaluate_lane(carrier, receiver, opponents, self.scenario.interception_bias)

        # Tactical action classification:
        target_gx, target_gy = target_goal(team)
        own_gx, own_gy = own_goal(team)
        carrier_to_target = distance(carrier.x, carrier.y, target_gx, target_gy)
        receiver_to_target = distance(receiver.x, receiver.y, target_gx, target_gy)
        carrier_to_own = distance(carrier.x, carrier.y, own_gx, own_gy)

        is_wide_flank = carrier.y < 16.0 or carrier.y > 52.0
        is_attacking_third = carrier_to_target < 44.0
        receiver_in_box = receiver_to_target < 28.0

        is_cross = is_wide_flank and is_attacking_third and receiver_in_box
        is_clearance = (
            (carrier.role in ("DF", "GK") or (carrier.role == "MF" and carrier_to_own < 24.0))
            and carrier_to_own < 28.0
            and lane.passerPressure > 0.35
            and self.rng.random() < max(0.30, 0.45 * min(1.3, self.scenario.press_intensity))
        )

        flight_type = "ground"
        apex_z = 0.0
        if is_cross:
            flight_type = "cross"
            apex_z = round(2.4 + self.rng.random() * 1.6, 2)
            pass_speed = 22.0 + self.rng.random() * 5.0
        elif is_clearance:
            flight_type = "clearance"
            apex_z = round(5.0 + self.rng.random() * 5.0, 2)
            pass_speed = 22.0 + self.rng.random() * 6.0
        else:
            pass_speed = 11.0 + 5.0 * self.scenario.tempo + self.rng.random() * 3.5

        # The completion probability is calibrated so that the aggregate pass
        # completion of a Premier League fixture lands inside the 75-85% band
        # in every Synthetic Match Scenario, while still responding to the
        # two pressures the lane actually carries: the interception risk and
        # the pressure on the passer.
        completion = max(
            0.20,
            min(
                0.95,
                self.PASS_COMPLETION_BASE
                - self.PASS_COMPLETION_RISK * lane.interceptionRisk
                - self.PASS_COMPLETION_PRESSURE * lane.passerPressure,
            ),
        )

        self.observations.pass_attempts += 1
        carrier.passes_attempted += 1
        if lane.passerPressure > 0.45:
            self.observations.passes_under_pressure += 1

        outcome = "completed"
        interceptor: SimPlayer | None = None
        foul = False
        completed = self.rng.random() < completion

        # Check offside condition on forward passes
        fwd_pass = direction * (receiver.x - carrier.x)
        if not is_clearance and fwd_pass > 7.0 and direction * (receiver.x - PITCH_CENTRE_X) > 8.0:
            def_outfield = [o for o in opponents if o.slot != "gk"]
            if len(def_outfield) >= 2:
                xs = sorted([o.x for o in def_outfield])
                second_deepest = xs[-2] if direction == 1 else xs[1]
                is_ahead = (receiver.x > second_deepest + 0.4) if direction == 1 else (receiver.x < second_deepest - 0.4)
                if is_ahead and self.rng.random() < 0.035:
                    completed = False
                    outcome = "offside"

        if not completed and outcome != "offside":
            # The pass does not reach the intended receiver. The ball is loose:
            # either the opposition wins it (a turnover) or the passing side
            # recovers it and the possession sequence continues.
            if self.rng.random() < self._turnover_probability(team):
                interceptor = self._nearest_to_corridor(carrier, receiver, opponents)
                duel_chance = min(0.85, max(0.28, self.scenario.duel_rate * self.scenario.press_intensity))
                if interceptor is not None and self.rng.random() < duel_chance:
                    outcome = "duel"
                else:
                    outcome = "intercepted"
                if interceptor is None and opponents:
                    # The pass was broken by the closest defender even though
                    # nobody was inside the corridor: the break is still a
                    # turnover, attributed to that defender.
                    interceptor = min(
                        opponents,
                        key=lambda o: distance(o.x, o.y, receiver.x, receiver.y),
                    )
                foul = outcome == "duel" and self.rng.random() < (0.30 * min(1.3, self.scenario.press_intensity + 0.1))
            else:
                outcome = "loose"

        lane_length = distance(carrier.x, carrier.y, receiver.x, receiver.y)
        self.state.flight = Flight(
            passer_id=carrier.id,
            receiver_id=receiver.id,
            start_x=carrier.x,
            start_y=carrier.y,
            end_x=receiver.x,
            end_y=receiver.y,
            duration=max(0.18, lane_length / pass_speed),
            speed=pass_speed,
            outcome=outcome,
            interceptor_id=interceptor.id if interceptor else None,
            pdr=lane.passDifficultyRating,
            foul=foul,
            speed_kmh=pass_speed * 3.6,
            apex_z=apex_z,
            flight_type=flight_type,
        )
        self.state.carrier_id = None
        carrier.on_ball = False
        self.state.last_touch_by = carrier.id
        carrier.touches += 1
        self.observations.pass_speeds.append(pass_speed * 3.6)

    def _turnover_probability(self, team: TeamSide) -> float:
        """The chance that a failed pass is lost to the opposition.

        The Synthetic Match Scenario declares the possession share it must
        produce. The engine therefore steers the turnover rate towards that
        declared share: a side that is meant to dominate recovers far more
        often when a pass breaks down, which turns the declared possession
        share into an observable one.
        """
        error = self.scenario.home_possession - self._possession_ema
        if team is TeamSide.HOME:
            factor = 1.0 - self.POSSESSION_ASYMMETRY * error
        else:
            factor = 1.0 + self.POSSESSION_ASYMMETRY * error
        factor = max(0.20, min(3.0, factor))
        return max(0.01, min(0.9, self.BASE_TURNOVER_PROBABILITY * factor))

    def _nearest_to_corridor(
        self, carrier: SimPlayer, receiver: SimPlayer, opponents: list[SimPlayer]
    ) -> SimPlayer | None:
        if not opponents:
            return None
        dx = receiver.x - carrier.x
        dy = receiver.y - carrier.y
        length_sq = dx * dx + dy * dy
        best: SimPlayer | None = None
        best_distance = 1e9
        for opponent in opponents:
            if length_sq < 1e-9:
                gap = distance(opponent.x, opponent.y, carrier.x, carrier.y)
            else:
                t = ((opponent.x - carrier.x) * dx + (opponent.y - carrier.y) * dy) / length_sq
                t = max(0.0, min(1.0, t))
                px = carrier.x + t * dx
                py = carrier.y + t * dy
                gap = distance(opponent.x, opponent.y, px, py)
            if gap < best_distance:
                best_distance = gap
                best = opponent
        return best if best is not None and best_distance <= 6.0 else None

    def _resolve_flight(self, flight: Flight) -> None:
        """A pass or delivery arrives: the outcome is applied and discrete events emitted."""
        state = self.state
        state.flight = None
        passer = self._player(flight.passer_id)
        receiver = self._player(flight.receiver_id)
        clock = format_match_clock(self.match_seconds)
        timestamp = int(self.match_seconds * 1000)
        lane_length = distance(flight.start_x, flight.start_y, flight.end_x, flight.end_y)

        team = passer.team if passer else None
        start_sector = resolve_pitch_sector(flight.start_x, flight.start_y, team)
        arrival_sector = resolve_pitch_sector(flight.end_x, flight.end_y, team)

        completed = flight.outcome == "completed"

        # 0. Shot flight resolution
        if flight.flight_type == "shot":
            shooter = passer
            if shooter is None:
                return
            defending = TeamSide.AWAY if team is TeamSide.HOME else TeamSide.HOME
            goal_x, goal_y = target_goal(team)
            shot_sector = resolve_pitch_sector(flight.start_x, flight.start_y, team)
            shot_distance = distance(flight.start_x, flight.start_y, goal_x, goal_y)
            sub_shot = "header" if (shot_distance < 12.0 and flight.apex_z > 1.8) else "open_play"

            if flight.outcome == "goal":
                shooter.goals += 1
                self.events.append(
                    self._event(
                        MatchEventType.GOAL,
                        clock,
                        timestamp,
                        team,
                        shooter.id,
                        None,
                        goal_x,
                        goal_y,
                        f"GOAL! {shooter.short_name} finds the net from {shot_sector} ({flight.speed_kmh:.1f} km/h).",
                        xg=flight.pdr,
                        pitch_sector=shot_sector,
                        speed_kmh=flight.speed_kmh,
                        sub_action=sub_shot,
                    )
                )
                self.score[team.value] += 1
                self._close_sequence()
                self._kickoff(TeamSide.AWAY if team is TeamSide.HOME else TeamSide.HOME)
                return

            if flight.outcome == "blocked":
                nearest_def = self._player(flight.interceptor_id) if flight.interceptor_id else None
                if nearest_def:
                    block_sector = resolve_pitch_sector(nearest_def.x, nearest_def.y, defending)
                    self.events.append(
                        self._event(
                            MatchEventType.BLOCK,
                            clock,
                            timestamp,
                            defending,
                            nearest_def.id,
                            shooter.id,
                            nearest_def.x,
                            nearest_def.y,
                            f"{nearest_def.short_name} blocks {shooter.short_name}'s strike in {block_sector}.",
                            pitch_sector=block_sector,
                            speed_kmh=flight.speed_kmh,
                            sub_action="shot_block",
                            secondary_actor_id=shooter.id,
                        )
                    )
                    if self.rng.random() < 0.25:
                        self.events.append(
                            self._event(
                                MatchEventType.CORNER_KICK,
                                clock,
                                timestamp,
                                team,
                                shooter.id,
                                None,
                                goal_x,
                                3.0 if shooter.y < 34.0 else 65.0,
                                "Blocked strike deflects behind for an attacking corner kick.",
                                pitch_sector="Corner Quadrant",
                                sub_action="out_swinger",
                            )
                        )
                        self._close_sequence()
                        self._set_carrier(self._restart_player(team))
                        self._sequence_team = team
                        self._sequence_started_at = self.match_seconds
                        return
                    self._close_sequence()
                    self._set_carrier(nearest_def)
                    self.observations.possession_changes += 1
                    self._sequence_team = defending
                    self._sequence_started_at = self.match_seconds
                    return

            if flight.outcome == "saved":
                gk = self._player(flight.interceptor_id or flight.receiver_id)
                if gk is None:
                    gk = next((p for p in self.state.players if p.team is defending and p.slot == "gk"), None)
                gk_sector = resolve_pitch_sector(gk.x, gk.y, defending) if gk else "Goal Mouth"
                sub_save = "diving_stop" if shot_distance > 15 else ("reflex" if shot_distance < 9 else "parry")
                self.events.append(
                    self._event(
                        MatchEventType.SAVE,
                        clock,
                        timestamp,
                        defending,
                        gk.id if gk else None,
                        shooter.id,
                        gk.x if gk else goal_x,
                        gk.y if gk else goal_y,
                        f"{gk.short_name if gk else 'Goalkeeper'} executes a {sub_save} save ({flight.speed_kmh:.1f} km/h) in {gk_sector} to deny {shooter.short_name}.",
                        pitch_sector=gk_sector,
                        speed_kmh=flight.speed_kmh,
                        sub_action=sub_save,
                        secondary_actor_id=shooter.id,
                    )
                )
                if self.rng.random() < 0.35:
                    corner_sub = "in_swinger" if self.rng.random() < 0.5 else "out_swinger"
                    self.events.append(
                        self._event(
                            MatchEventType.CORNER_KICK,
                            clock,
                            timestamp,
                            team,
                            shooter.id,
                            None,
                            goal_x,
                            3.0 if shooter.y < 34.0 else 65.0,
                            f"{shooter.short_name}'s strike tipped behind for a {corner_sub} corner kick.",
                            pitch_sector="Corner Quadrant",
                            sub_action=corner_sub,
                        )
                    )
                    self._close_sequence()
                    self._set_carrier(self._restart_player(team))
                    self._sequence_team = team
                    self._sequence_started_at = self.match_seconds
                    return

                self._close_sequence()
                self._set_carrier(gk if gk else self._deepest_player(defending))
                self.observations.possession_changes += 1
                self._sequence_team = defending
                self._sequence_started_at = self.match_seconds
                return

            # Off target (missed): Goal Kick
            gk = next((p for p in self.state.players if p.team is defending and p.slot == "gk"), None)
            gk_sector = resolve_pitch_sector(gk.x, gk.y, defending) if gk else "Goal Mouth"
            self.events.append(
                self._event(
                    MatchEventType.GOAL_KICK,
                    clock,
                    timestamp,
                    defending,
                    gk.id if gk else None,
                    None,
                    own_goal(defending)[0],
                    own_goal(defending)[1],
                    f"Strike sails wide of the target in {shot_sector}. {gk.short_name if gk else 'Goalkeeper'} to restart with a goal kick.",
                    pitch_sector=gk_sector,
                    sub_action="restart_distribution",
                )
            )
            self._close_sequence()
            self._set_carrier(gk if gk else self._deepest_player(defending))
            self.observations.possession_changes += 1
            self._sequence_team = defending
            self._sequence_started_at = self.match_seconds
            return

        # 1. Offside resolution
        if flight.outcome == "offside":
            self.events.append(
                self._event(
                    MatchEventType.PASS,
                    clock,
                    timestamp,
                    team,
                    flight.passer_id,
                    flight.receiver_id,
                    flight.end_x,
                    flight.end_y,
                    f"{passer.short_name if passer else 'Carrier'} plays the ball towards {receiver.short_name if receiver else 'attacker'} ({arrival_sector}).",
                    pdr=flight.pdr,
                    completed=False,
                    pitch_sector=start_sector,
                    speed_kmh=flight.speed_kmh,
                )
            )
            self.events.append(
                self._event(
                    MatchEventType.OFFSIDE,
                    clock,
                    timestamp,
                    team,
                    flight.receiver_id,
                    flight.passer_id,
                    flight.end_x,
                    flight.end_y,
                    f"Offside flag raised against {receiver.short_name if receiver else 'attacker'} in {arrival_sector}.",
                    pitch_sector=arrival_sector,
                    sub_action="line_breach",
                )
            )
            defending = TeamSide.AWAY if team is TeamSide.HOME else TeamSide.HOME
            self.events.append(
                self._event(
                    MatchEventType.FREE_KICK,
                    clock,
                    timestamp,
                    defending,
                    None,
                    None,
                    flight.end_x,
                    flight.end_y,
                    f"{defending.value.title()} awarded indirect free kick for offside in {arrival_sector}.",
                    pitch_sector=arrival_sector,
                    sub_action="indirect",
                )
            )
            self._turnover(passer, None, "offside")
            return

        # 2. Clearance resolution
        if flight.flight_type == "clearance":
            sub_clearance = "headed" if (passer and passer.role == "DF" and self.rng.random() < 0.40) else "kicked"
            self.events.append(
                self._event(
                    MatchEventType.CLEARANCE,
                    clock,
                    timestamp,
                    team,
                    flight.passer_id,
                    flight.receiver_id,
                    flight.start_x,
                    flight.start_y,
                    f"{passer.short_name if passer else 'Defender'} executes a {sub_clearance} clearance ({flight.speed_kmh:.1f} km/h) from {start_sector}.",
                    pitch_sector=start_sector,
                    speed_kmh=flight.speed_kmh,
                    sub_action=sub_clearance,
                    secondary_actor_id=flight.receiver_id,
                )
            )
            if completed and receiver is not None:
                self.events.append(
                    self._event(
                        MatchEventType.RECOVERY,
                        clock,
                        timestamp,
                        receiver.team,
                        receiver.id,
                        None,
                        flight.end_x,
                        flight.end_y,
                        f"{receiver.short_name} recovers the cleared ball in {arrival_sector}.",
                        pitch_sector=arrival_sector,
                        sub_action="second_ball",
                    )
                )
                self._set_carrier(receiver)
                return
            else:
                interceptor = self._player(flight.interceptor_id) if flight.interceptor_id else None
                if interceptor is not None:
                    self.events.append(
                        self._event(
                            MatchEventType.RECOVERY,
                            clock,
                            timestamp,
                            interceptor.team,
                            interceptor.id,
                            None,
                            flight.end_x,
                            flight.end_y,
                            f"{interceptor.short_name} recovers the loose ball in {arrival_sector}.",
                            pitch_sector=arrival_sector,
                            sub_action="loose_ball",
                        )
                    )
                    self._turnover(passer, interceptor, "clearance")
                else:
                    self._turnover(passer, None, "turnover")
                return

        # 3. Standard Pass logging
        self.events.append(
            self._event(
                MatchEventType.PASS,
                clock,
                timestamp,
                team,
                flight.passer_id,
                flight.receiver_id,
                flight.end_x,
                flight.end_y,
                f"{passer.short_name if passer else 'The carrier'} plays the ball {lane_length:.0f}m ({flight.speed_kmh:.1f} km/h) from {start_sector} to {receiver.short_name if receiver else 'a teammate'} ({arrival_sector}).",
                pdr=flight.pdr,
                completed=completed,
                pitch_sector=start_sector,
                speed_kmh=flight.speed_kmh,
            )
        )

        # If this delivery was a cross, also emit CROSS event
        if flight.flight_type == "cross":
            sub_cross = (
                "cutback"
                if distance(flight.start_x, flight.start_y, target_goal(team)[0], target_goal(team)[1]) < 22
                else ("whipped" if flight.speed_kmh > 80 else "lofted")
            )
            self.events.append(
                self._event(
                    MatchEventType.CROSS,
                    clock,
                    timestamp,
                    team,
                    flight.passer_id,
                    flight.receiver_id,
                    flight.end_x,
                    flight.end_y,
                    f"{passer.short_name if passer else 'Winger'} delivers a {sub_cross} cross ({flight.speed_kmh:.1f} km/h) from {start_sector} into {arrival_sector}.",
                    pitch_sector=start_sector,
                    speed_kmh=flight.speed_kmh,
                    sub_action=sub_cross,
                    secondary_actor_id=flight.receiver_id,
                    completed=completed,
                )
            )

        # 4. Completed Pass / Cross
        if completed and receiver is not None:
            self.observations.completed_passes += 1
            if passer is not None:
                passer.passes_completed += 1
            if receiver is not None:
                receiver.touches += 1
            self._last_passer_id = flight.passer_id
            self._last_pass_time = self.match_seconds
            self._set_carrier(receiver)
            return

        interceptor = self._player(flight.interceptor_id) if flight.interceptor_id else None

        # 5. Loose Ball Recovery
        if flight.outcome == "loose":
            self.observations.loose_balls += 1
            if receiver is not None:
                self.events.append(
                    self._event(
                        MatchEventType.RECOVERY,
                        clock,
                        timestamp,
                        receiver.team,
                        receiver.id,
                        None,
                        flight.end_x,
                        flight.end_y,
                        f"{receiver.short_name} recovers the loose ball in {arrival_sector}.",
                        pitch_sector=arrival_sector,
                        sub_action="loose_ball",
                    )
                )
                self._set_carrier(receiver)
            return

        # 6. Goalkeeper Claim or Punch on Crosses
        if flight.flight_type == "cross" and interceptor is not None and interceptor.slot == "gk":
            if self.rng.random() < 0.65:
                self.events.append(
                    self._event(
                        MatchEventType.CLAIM,
                        clock,
                        timestamp,
                        interceptor.team,
                        interceptor.id,
                        flight.passer_id,
                        flight.end_x,
                        flight.end_y,
                        f"{interceptor.short_name} climbs in {arrival_sector} to claim the aerial cross cleanly.",
                        pitch_sector=arrival_sector,
                        sub_action="aerial_claim",
                    )
                )
                self._set_carrier(interceptor)
                self.observations.possession_changes += 1
                return
            else:
                self.events.append(
                    self._event(
                        MatchEventType.PUNCH,
                        clock,
                        timestamp,
                        interceptor.team,
                        interceptor.id,
                        flight.passer_id,
                        flight.end_x,
                        flight.end_y,
                        f"{interceptor.short_name} punches the delivery clear from {arrival_sector}.",
                        pitch_sector=arrival_sector,
                        sub_action="two_handed_punch",
                    )
                )
                self._turnover(passer, interceptor, "punch")
                return

        # 7. Aerial Duel on Elevated Balls
        if flight.apex_z > 1.8 and interceptor is not None:
            self.events.append(
                self._event(
                    MatchEventType.AERIAL_DUEL,
                    clock,
                    timestamp,
                    interceptor.team,
                    interceptor.id,
                    flight.receiver_id or flight.passer_id,
                    flight.end_x,
                    flight.end_y,
                    f"{interceptor.short_name} wins an aerial duel against {receiver.short_name if receiver else 'attacker'} in {arrival_sector}.",
                    pitch_sector=arrival_sector,
                    sub_action="box_aerial",
                )
            )

        # 8. Ground Duel / Tackle / Foul
        if flight.outcome == "duel" and interceptor is not None:
            if flight.apex_z <= 1.8:
                self.events.append(
                    self._event(
                        MatchEventType.DUEL,
                        clock,
                        timestamp,
                        interceptor.team,
                        interceptor.id,
                        flight.passer_id,
                        flight.end_x,
                        flight.end_y,
                        f"{interceptor.short_name} contests the ball with {passer.short_name if passer else 'the carrier'} in {arrival_sector}.",
                        pitch_sector=arrival_sector,
                        sub_action="ground_duel",
                    )
                )
            if flight.foul:
                self.events.append(
                    self._event(
                        MatchEventType.FOUL,
                        clock,
                        timestamp,
                        interceptor.team,
                        interceptor.id,
                        flight.passer_id,
                        flight.end_x,
                        flight.end_y,
                        f"Foul by {interceptor.short_name} in {arrival_sector}; free kick awarded.",
                        pitch_sector=arrival_sector,
                        sub_action="trip",
                    )
                )
                card_roll = self.rng.random()
                if card_roll < 0.38:
                    self.events.append(
                        self._event(
                            MatchEventType.YELLOW_CARD,
                            clock,
                            timestamp,
                            interceptor.team,
                            interceptor.id,
                            None,
                            flight.end_x,
                            flight.end_y,
                            f"Yellow card shown to {interceptor.short_name} for challenge in {arrival_sector}.",
                            pitch_sector=arrival_sector,
                            sub_action="tactical_break",
                        )
                    )
                elif card_roll < 0.41:
                    self.events.append(
                        self._event(
                            MatchEventType.RED_CARD,
                            clock,
                            timestamp,
                            interceptor.team,
                            interceptor.id,
                            None,
                            flight.end_x,
                            flight.end_y,
                            f"Red card shown to {interceptor.short_name} for dangerous play in {arrival_sector}.",
                            pitch_sector=arrival_sector,
                            sub_action="serious_foul",
                        )
                    )
                self.events.append(
                    self._event(
                        MatchEventType.FREE_KICK,
                        clock,
                        timestamp,
                        team,
                        flight.receiver_id or flight.passer_id,
                        None,
                        flight.end_x,
                        flight.end_y,
                        f"{team.value.title() if team else 'Attacking'} side awarded free kick in {arrival_sector}.",
                        pitch_sector=arrival_sector,
                        sub_action="direct",
                    )
                )
                if receiver is not None:
                    self._set_carrier(receiver)
                return

            self.events.append(
                self._event(
                    MatchEventType.TACKLE,
                    clock,
                    timestamp,
                    interceptor.team,
                    interceptor.id,
                    flight.passer_id,
                    flight.end_x,
                    flight.end_y,
                    f"{interceptor.short_name} wins the tackle cleanly from {passer.short_name if passer else 'the carrier'} in {arrival_sector}.",
                    pitch_sector=arrival_sector,
                    sub_action="standing_tackle",
                )
            )
            self._turnover(passer, interceptor, "tackle")
            return

        # 9. Clean Interception
        if interceptor is not None:
            self.events.append(
                self._event(
                    MatchEventType.INTERCEPTION,
                    clock,
                    timestamp,
                    interceptor.team,
                    interceptor.id,
                    flight.passer_id,
                    flight.end_x,
                    flight.end_y,
                    f"{interceptor.short_name} intercepts the pass from {passer.short_name if passer else 'the carrier'} in {arrival_sector}.",
                    pdr=flight.pdr,
                    completed=False,
                    pitch_sector=arrival_sector,
                    sub_action="passing_lane_cutoff",
                )
            )
            self._turnover(passer, interceptor, "interception")
            return

        # 10. Out of Play Turnover
        self.events.append(
            self._event(
                MatchEventType.TURNOVER,
                clock,
                timestamp,
                team,
                flight.passer_id,
                None,
                flight.end_x,
                flight.end_y,
                f"The pass runs out of play in {arrival_sector}.",
                pitch_sector=arrival_sector,
                sub_action="out_of_play",
            )
        )
        self._turnover(passer, None, "turnover")

    def _take_shot(self, shooter: SimPlayer, opponents: list[SimPlayer]) -> None:
        team = shooter.team
        goal_x, goal_y = target_goal(team)
        distances = [distance(shooter.x, shooter.y, o.x, o.y) for o in opponents]
        xg = expected_goals(shooter.x, shooter.y, team, distances)
        clock = format_match_clock(self.match_seconds)
        timestamp = int(self.match_seconds * 1000)
        shot_distance = distance(shooter.x, shooter.y, goal_x, goal_y)
        shot_sector = resolve_pitch_sector(shooter.x, shooter.y, team)
        shot_speed = round(88.0 + self.rng.random() * 26.0, 1)
        sub_shot = "header" if (shot_distance < 12.0 and self.rng.random() < 0.28) else "open_play"

        # Check if assisted by prior pass (KEY_PASS)
        if self._last_passer_id is not None and (self.match_seconds - self._last_pass_time) <= 6.0:
            last_passer = self._player(self._last_passer_id)
            if last_passer and last_passer.team is team and last_passer.id != shooter.id:
                lp_sector = resolve_pitch_sector(last_passer.x, last_passer.y, team)
                self.events.append(
                    self._event(
                        MatchEventType.KEY_PASS,
                        clock,
                        timestamp,
                        team,
                        last_passer.id,
                        shooter.id,
                        last_passer.x,
                        last_passer.y,
                        f"{last_passer.short_name} creates the opening for {shooter.short_name} with an incisive pass from {lp_sector}.",
                        pitch_sector=lp_sector,
                        sub_action="shot_assist",
                        secondary_actor_id=shooter.id,
                    )
                )
        self._last_passer_id = None

        # CRITICAL INVARIANT: Emit SHOT first, and append to self.shot_log
        self.events.append(
            self._event(
                MatchEventType.SHOT,
                clock,
                timestamp,
                team,
                shooter.id,
                None,
                shooter.x,
                shooter.y,
                f"{shooter.short_name} lets fly ({shot_speed:.1f} km/h) from {shot_distance:.0f}m in {shot_sector}.",
                xg=xg,
                pitch_sector=shot_sector,
                speed_kmh=shot_speed,
                sub_action=sub_shot,
            )
        )
        self.observations.shots += 1
        shooter.touches += 1
        shooter.shots += 1

        is_goal = self.rng.random() < xg * self.GOAL_CONVERSION_FACTOR
        on_target = self._shot_on_target(shooter, goal_y, shot_distance, distances)
        if is_goal:
            outcome = ShotOutcome.GOAL
            on_target = True
        elif on_target:
            outcome = ShotOutcome.SAVED
        else:
            outcome = ShotOutcome.MISSED

        self.shot_log.append(
            ShotRecord(
                id=new_event_id("shot"),
                team=team,
                playerId=shooter.id,
                playerName=shooter.name,
                matchClock=clock,
                timestampMs=timestamp,
                xG=xg,
                distanceToGoalM=round(shot_distance, 1),
                outcome=outcome,
                onTarget=on_target,
                x=round(shooter.x, 2),
                y=round(shooter.y, 2),
            )
        )

        defending = TeamSide.AWAY if team is TeamSide.HOME else TeamSide.HOME
        nearest_def = min(opponents, key=lambda o: distance(shooter.x, shooter.y, o.x, o.y)) if opponents else None
        def_dist = distance(shooter.x, shooter.y, nearest_def.x, nearest_def.y) if nearest_def else 999.0
        is_block = (def_dist <= 3.2 and not on_target and self.rng.random() < 0.65) or (def_dist <= 2.2 and self.rng.random() < 0.50)

        # 3D Parabolic Ball Flight Kinematics on Shot:
        shot_apex = round(0.85 + self.rng.random() * 1.35, 2)
        flight_duration = round(0.40 + self.rng.random() * 0.35, 2)

        gk = next((p for p in opponents if p.slot == "gk"), None)
        if is_block and nearest_def:
            target_x, target_y = nearest_def.x, nearest_def.y
            shot_outcome_str = "blocked"
            receiver_id = nearest_def.id
            interceptor_id = nearest_def.id
        elif is_goal:
            target_x = goal_x
            target_y = goal_y + (self.rng.random() - 0.5) * 4.0
            shot_outcome_str = "goal"
            receiver_id = gk.id if gk else ""
            interceptor_id = None
        elif on_target:
            target_x = gk.x if gk else goal_x
            target_y = gk.y if gk else goal_y
            shot_outcome_str = "saved"
            receiver_id = gk.id if gk else ""
            interceptor_id = gk.id if gk else None
        else:
            target_x = goal_x
            target_y = 34.0 + (9.0 if shooter.y > 34.0 else -9.0) + (self.rng.random() - 0.5) * 4.0
            shot_outcome_str = "missed"
            receiver_id = gk.id if gk else ""
            interceptor_id = None

        self.state.flight = Flight(
            passer_id=shooter.id,
            receiver_id=receiver_id,
            start_x=shooter.x,
            start_y=shooter.y,
            end_x=target_x,
            end_y=target_y,
            duration=flight_duration,
            elapsed=0.0,
            speed=shot_speed / 3.6,
            outcome=shot_outcome_str,
            interceptor_id=interceptor_id,
            pdr=xg,
            speed_kmh=shot_speed,
            apex_z=shot_apex,
            flight_type="shot",
        )
        self.state.carrier_id = None
        self.state.ball_z = shot_apex
        self.state.ball_vz = 4.0 * shot_apex / flight_duration

    def _shot_on_target(
        self,
        shooter: SimPlayer,
        goal_y: float,
        shot_distance: float,
        defender_distances: list[float],
    ) -> bool:
        """Was the shot on target?

        The strike is modelled as a lateral error around the goal centre. The
        spread grows with the distance to the goal and with the pressure of
        the nearest defender, so a shot from thirty metres under pressure is
        far less likely to find the frame than a close range effort.
        """
        pressure = 0.0
        if defender_distances:
            pressure = max(0.0, 1.0 - min(defender_distances) / 4.0)
        sigma = (
            self.SHOT_ERROR_BASE
            + self.SHOT_ERROR_DISTANCE * shot_distance
            + self.SHOT_ERROR_PRESSURE * pressure
        )
        error = self.rng.gauss(0.0, sigma)
        return abs(goal_y + error - goal_y) <= GOAL_HALF_WIDTH

    def _deepest_player(self, team: TeamSide) -> SimPlayer:
        direction = attack_direction(team)
        candidates = [p for p in self._teammates(team) if p.role == "GK"] or self._teammates(team)
        return min(candidates, key=lambda p: direction * p.x)

    def _turnover(self, loser: SimPlayer | None, winner: SimPlayer | None, reason: str) -> None:
        """Possession changes hands without a shot."""
        clock = format_match_clock(self.match_seconds)
        timestamp = int(self.match_seconds * 1000)
        if loser is not None:
            sector = resolve_pitch_sector(loser.x, loser.y, loser.team)
            self.events.append(
                self._event(
                    MatchEventType.TURNOVER,
                    clock,
                    timestamp,
                    loser.team,
                    loser.id,
                    winner.id if winner else None,
                    loser.x,
                    loser.y,
                    f"Turnover: {loser.short_name} loses the ball in {sector}.",
                    pitch_sector=sector,
                    sub_action=reason or "dispossessed",
                    secondary_actor_id=winner.id if winner else None,
                )
            )
        if loser is not None:
            loser.turnovers_lost += 1
        self.observations.turnover_count += 1
        self.observations.possession_changes += 1
        self._close_sequence()
        if winner is None:
            # The ball is dead: the defending side restarts from the restart
            # position. The match never stops.
            conceding = loser.team if loser else TeamSide.HOME
            winner = self._restart_player(TeamSide.AWAY if conceding is TeamSide.HOME else TeamSide.HOME)
        if winner is not None:
            self._set_carrier(winner)
            self._sequence_team = winner.team
            self._sequence_started_at = self.match_seconds

    def _restart_player(self, team: TeamSide) -> SimPlayer:
        """The player who takes the restart for ``team`` (nearest to the ball)."""
        candidates = [p for p in self._teammates(team) if p.role != "GK"] or self._teammates(team)
        return min(
            candidates,
            key=lambda p: distance(p.x, p.y, self.state.ball_x, self.state.ball_y),
        )

    def _close_sequence(self) -> None:
        """Close the current possession sequence and record its duration."""
        if self._sequence_team is None:
            return
        duration = max(0.0, self.match_seconds - self._sequence_started_at)
        if duration > 0.05:
            self.observations.sequence_durations.append(duration)
        self._sequence_team = None

    def _set_carrier(self, player: SimPlayer) -> None:
        for other in self.state.players:
            other.on_ball = False
        player.on_ball = True
        self.state.carrier_id = player.id
        self.state.last_touch_by = player.id
        self._last_carrier_id = player.id
        self._possession_side = player.team
        self.state.ball_x = player.x
        self.state.ball_y = player.y
        self._carry_anchor = (player.x, player.y)
        self._decision_timer = self.scenario.decision_interval / max(0.4, self.scenario.tempo)

    def _track_carry(self, carrier: SimPlayer) -> None:
        """Emit a carry or progressive carry event when the carrier has advanced a meaningful distance."""
        previous = self._carry_anchor
        moved = distance(previous[0], previous[1], carrier.x, carrier.y)
        if moved < 4.5:
            return
        direction = attack_direction(carrier.team)
        fwd_gain = direction * (carrier.x - previous[0])
        self._carry_anchor = (carrier.x, carrier.y)
        sector = resolve_pitch_sector(carrier.x, carrier.y, carrier.team)
        spd = round(carrier.speed_kmh, 1)

        clock = format_match_clock(self.match_seconds)
        timestamp = int(self.match_seconds * 1000)

        target_gx, target_gy = target_goal(carrier.team)
        carrier_to_target = distance(carrier.x, carrier.y, target_gx, target_gy)
        is_penetration = carrier_to_target < 44.0 and fwd_gain >= 2.5

        if fwd_gain >= 7.0 or is_penetration:
            sub = "transition_burst" if spd > 22.0 else "box_entry"
            self.events.append(
                self._event(
                    MatchEventType.PROGRESSIVE_CARRY,
                    clock,
                    timestamp,
                    carrier.team,
                    carrier.id,
                    None,
                    carrier.x,
                    carrier.y,
                    f"{carrier.short_name} drives a progressive carry ({moved:.0f}m, {spd:.1f} km/h) through {sector}.",
                    pitch_sector=sector,
                    speed_kmh=spd,
                    sub_action=sub,
                )
            )
        else:
            self.events.append(
                self._event(
                    MatchEventType.CARRY,
                    clock,
                    timestamp,
                    carrier.team,
                    carrier.id,
                    None,
                    carrier.x,
                    carrier.y,
                    f"{carrier.short_name} carries {moved:.0f}m ({spd:.1f} km/h) in {sector}.",
                    pitch_sector=sector,
                    speed_kmh=spd,
                    sub_action="standard",
                )
            )

    def _event(self, *args, **kwargs) -> MatchEvent:
        """Create a match event stamped with the score at that moment."""
        event = make_event(*args, **kwargs)
        if event.pitchSector is None and event.x is not None and event.y is not None:
            event.pitchSector = resolve_pitch_sector(event.x, event.y, event.team)
        event.score = ScorePair(home=self.score["home"], away=self.score["away"])
        return event

    def _player(self, player_id: str | None) -> SimPlayer | None:
        if player_id is None:
            return None
        for player in self.state.players:
            if player.id == player_id:
                return player
        return None

    # -- derived views -----------------------------------------------------------

    def live_lanes(self) -> list:
        """The live Passing Lanes of the current carrier."""
        carrier = self._carrier()
        if carrier is None:
            # The ball is in flight: fall back to the last known carrier so
            # the viewer always sees the lanes the ball was played into.
            carrier = self._player(self._last_carrier_id)
        if carrier is None:
            return list(self._lane_cache)
        opponents = self._opponents(carrier.team)
        teammates = [p for p in self._teammates(carrier.team) if p.id != carrier.id and p.role != "GK"]
        lanes = []
        for mate in teammates:
            lane = evaluate_lane(carrier, mate, opponents, self.scenario.interception_bias)
            lanes.append(lane)
        lanes.sort(key=lambda lane: lane.passDifficultyRating)
        self._lane_cache = lanes[: self.LANE_COUNT]
        return list(self._lane_cache)

    def build_frame(self) -> TelemetryFrame:
        """Build the Tier 1 (deterministic, < 50ms) telemetry frame."""
        started = perf_counter()
        self.frame_id += 1

        cells = pitch_control_surface(self.state.players)
        control = pitch_control_percentages(cells)
        lanes = self.live_lanes()
        pdr = aggregate_pass_difficulty(lanes)
        stats = match_statistics(
            self.events.all(),
            self.observations.possession_seconds,
            self.top_sprint_kmh,
            self.ball_progression_m,
        )
        chaos = control_vs_chaos_index(chaos_inputs(self.observations))
        rhythm = game_rhythm(rhythm_inputs(self.observations))
        fast_path_ms = (perf_counter() - started) * 1000.0
        self._last_fast_path_ms = fast_path_ms

        players = [
            PlayerTelemetry(
                id=p.id,
                name=p.name,
                shortName=p.short_name,
                number=p.number,
                team=p.team,
                role=p.role,
                position=granular_position(p.slot, self._lateral_of(p.id)),
                x=round(p.x, 2),
                y=round(p.y, 2),
                vx=round(p.vx, 3),
                vy=round(p.vy, 3),
                speedKmH=round(p.speed_kmh, 1),
                distanceMeters=round(p.distance_meters, 1),
                touches=p.touches,
                homeX=round(p.home_x, 2),
                homeY=round(p.home_y, 2),
                onBall=p.on_ball,
                isDesignatedPlayerCam=True if p.is_designated_player_cam else None,
            )
            for p in self.state.players
        ]

        ball = BallTelemetry(
            x=round(self.state.ball_x, 2),
            y=round(self.state.ball_y, 2),
            z=round(self.state.ball_z, 2),
            vx=round(self.state.ball_vx, 3),
            vy=round(self.state.ball_vy, 3),
            vz=round(self.state.ball_vz, 3),
            speedKmH=round(
                math.sqrt(self.state.ball_vx**2 + self.state.ball_vy**2 + self.state.ball_vz**2) * 3.6, 1
            ),
            possessionTeam=self._possession_team(),
            possessionPlayerId=self.state.carrier_id,
            lastTouchBy=self.state.last_touch_by,
        )

        metrics = MatchMetrics(
            controlVsChaosIndex=chaos,
            passDifficultyRating=pdr,
            gameRhythm=rhythm,
            pitchControl=control,
            fastPathLatencyMs=round(fast_path_ms, 2),
            agentReasoningLatencyMs=0.0,
            possessionShare=stats.possession_share,
            passCompletion=stats.pass_completion,
            shotCount=stats.shot_count,
            duelCount=stats.duel_count,
            topSprintKmH=stats.top_sprint_kmh,
            ballProgressionM=stats.ball_progression_m,
        )

        return TelemetryFrame(
            frameId=self.frame_id,
            matchClock=format_match_clock(self.match_seconds),
            matchSeconds=round(self.match_seconds, 2),
            scenario=self.scenario.id,
            score={"home": self.score["home"], "away": self.score["away"]},
            ball=ball,
            players=players,
            passingLanes=lanes,
            pitchControlCells=cells,
            events=self.events.recent(40),
            shots=list(self.shot_log),
            playerStats=self._player_stats(),
            metrics=metrics,
            latestNarrative=placeholder_narrative(format_match_clock(self.match_seconds)),
            agentTrace=[],
        )

    def _lateral_of(self, player_id: str) -> float:
        """The lateral station of a player on his line, between 0 and 1."""
        for entry in SQUAD:
            if entry.id == player_id:
                return entry.lateral
        return 0.5

    def _player_stats(self) -> list[PlayerMatchStats]:
        """The per-player match statistics, derived from the simulation ledger.

        The rating is the studio's 0-10 scale. It is a transparent sum of the
        things a player actually did in the simulation - touches, completed
        passes, shots, goals, ball losses and distance covered - so a number
        shown in the Player Spotlight can always be explained.
        """
        stats: list[PlayerMatchStats] = []
        for p in self.state.players:
            rating = 6.0
            rating += 0.30 * min(p.shots, 4)
            rating += 1.20 * p.goals
            rating += 0.04 * min(p.passes_completed, 25)
            rating += 0.02 * min(p.touches, 30)
            rating -= 0.35 * min(p.turnovers_lost, 4)
            rating += 0.6 * min(p.distance_meters, 12000.0) / 12000.0
            stats.append(
                PlayerMatchStats(
                    id=p.id,
                    name=p.name,
                    shortName=p.short_name,
                    number=p.number,
                    team=p.team,
                    role=p.role,
                    position=granular_position(p.slot, self._lateral_of(p.id)),
                    touches=p.touches,
                    passesAttempted=p.passes_attempted,
                    passesCompleted=p.passes_completed,
                    shots=p.shots,
                    distanceMeters=round(p.distance_meters, 1),
                    topSpeedKmH=round(p.top_speed_kmh, 1),
                    rating=round(max(0.0, min(10.0, rating)), 1),
                )
            )
        return stats

    def add_external_event(self, event: MatchEvent) -> None:
        """Allow an agent (for example Tactical Reasoning) to append an event."""
        self.events.append(event)


def _soft_limit(value: float, low: float, high: float, softness: float = 0.22) -> float:
    """Compress a value that is outside ``[low, high]`` instead of clipping it.

    A hard clip makes the formation anchor jump whenever the ball crosses the
    limit, which would make the whole team teleport across the pitch. The soft
    limit keeps the anchor continuous: the excess is compressed exponentially
    and never overshoots the band by more than ``softness`` metres, so a player
    whose anchor is far behind the ball still ends up *in front* of it rather
    than trailing it.
    """
    if value > high:
        excess = value - high
        return high + softness * (1.0 - math.exp(-excess / softness))
    if value < low:
        excess = low - value
        return low - softness * (1.0 - math.exp(-excess / softness))
    return value


def placeholder_narrative(match_clock: str) -> NarrativeEvent:
    """A neutral narrative used before the agent swarm produces its first output."""
    return NarrativeEvent(
        id="narr-pending",
        matchClock=match_clock,
        timestamp=0,
        isTacticalInflectionPoint=False,
        headline={
            "en": "Match feed live",
            "es": "Feed del partido en directo",
            "fr": "Flux du match en direct",
            "ja": "試合ライブ配信",
            "ar": "البث المباشر للمباراة",
        },
        tacticalExplanation={
            "en": "The tactical state is being assembled from the synthetic telemetry stream.",
            "es": "El estado táctico se está construyendo a partir del flujo sintético.",
            "fr": "L'etat tactique se construit a partir du flux synthetique.",
            "ja": "合成テレメトリから戦術状態を構築しています。",
            "ar": "يتم بناء الحالة التكتيكية من تدفق البيانات التخليقي.",
        },
        analystContext="Awaiting the first tactical reading.",
        casualContext="The match is under way.",
        playerCamContext="The Player Cam is waiting for its first look at the pitch.",
        clubCentricContext={"homeFrame": "", "awayFrame": ""},
    )


__all__ = [
    "DESIGNATED_PLAYER_CAM_ID",
    "Flight",
    "MatchEngine",
    "SCENARIOS",
    "SCENARIO_ORDER",
    "SQUAD",
    "ScenarioProfile",
    "SquadPlayer",
    "TeamShape",
    "placeholder_narrative",
]
