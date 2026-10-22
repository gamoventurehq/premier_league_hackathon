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
    ShotOutcome,
    ShotRecord,
    SyntheticScenarioType,
    TeamSide,
    TelemetryFrame,
)
from .events import EventLog, make_event
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
from .spatial import (
    BOUNDARY_MARGIN,
    PITCH_CENTRE_X,
    PITCH_CENTRE_Y,
    PITCH_LENGTH,
    PITCH_WIDTH,
    SimPlayer,
    attack_direction,
    distance,
    evaluate_lane,
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
        shot_bias=1.15,
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
        shot_bias=1.70,
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
        shot_bias=0.65,
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
        self._lane_cache = []
        self._possession_weight = {TeamSide.HOME: 0.0, TeamSide.AWAY: 0.0}
        self._possession_ema = 0.5
        self._shape_ball_x = PITCH_CENTRE_X
        self._shape_ball_y = PITCH_CENTRE_Y
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
            for player in state.players:
                if player.team is not team:
                    continue
                if player.slot == "gk":
                    base_x = 4.5
                    base_y = PITCH_CENTRE_Y
                else:
                    base_x = {
                        "def": shape.def_line,
                        "mid": shape.mid_line,
                        "fwd": shape.fwd_line,
                    }[player.slot] + self._bias_of(player.id)
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

            for player in mates:
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
                speed = math.hypot(desired_vx, desired_vy)
                if speed > player.max_sprint:
                    desired_vx = desired_vx / speed * player.max_sprint
                    desired_vy = desired_vy / speed * player.max_sprint

                blend = min(1.0, dt * 6.0)
                player.vx += (desired_vx - player.vx) * blend
                player.vy += (desired_vy - player.vy) * blend

                player.x = reflect(player.x + player.vx * dt, 0.0, PITCH_LENGTH, BOUNDARY_MARGIN)
                player.y = reflect(player.y + player.vy * dt, 0.0, PITCH_WIDTH, BOUNDARY_MARGIN)
                player.vx = reflect_velocity(
                    player.vx, player.x, 0.0, PITCH_LENGTH, BOUNDARY_MARGIN
                )
                player.vy = reflect_velocity(
                    player.vy, player.y, 0.0, PITCH_WIDTH, BOUNDARY_MARGIN
                )

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
            progress = min(1.0, flight.elapsed / max(0.05, flight.duration))
            previous_x = state.ball_x
            state.ball_x = flight.start_x + (flight.end_x - flight.start_x) * progress
            state.ball_y = flight.start_y + (flight.end_y - flight.start_y) * progress
            state.ball_vx = (flight.end_x - flight.start_x) / max(0.05, flight.duration)
            state.ball_vy = (flight.end_y - flight.start_y) / max(0.05, flight.duration)
            state.ball_vz = 0.0
            passer = self._player(flight.passer_id)
            if passer is not None:
                direction = attack_direction(passer.team)
                self.ball_progression_m += max(0.0, direction * (state.ball_x - previous_x))
            if flight.elapsed >= flight.duration:
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
                self.SHOT_BASE_RATE
                * scenario.shot_bias
                * role_factor
                * closeness
                * (1.0 - 0.06 * congestion)
            )
            if self.rng.random() < shot_probability:
                self._take_shot(carrier, opponents)
                return

        # 2. Pass.
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
        completion = max(
            0.20,
            min(0.97, 0.980 - 0.52 * lane.interceptionRisk - 0.07 * lane.passerPressure),
        )

        self.observations.pass_attempts += 1
        carrier.passes_attempted += 1
        if lane.passerPressure > 0.45:
            self.observations.passes_under_pressure += 1

        outcome = "completed"
        interceptor: SimPlayer | None = None
        foul = False
        completed = self.rng.random() < completion
        if not completed:
            # The pass does not reach the intended receiver. The ball is loose:
            # either the opposition wins it (a turnover) or the passing side
            # recovers it and the possession sequence continues.
            if self.rng.random() < self._turnover_probability(team):
                interceptor = self._nearest_to_corridor(carrier, receiver, opponents)
                duel_chance = min(0.85, self.scenario.duel_rate * self.scenario.press_intensity)
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
                foul = outcome == "duel" and self.rng.random() < 0.12
            else:
                outcome = "loose"

        pass_speed = 11.0 + 5.0 * self.scenario.tempo + self.rng.random() * 3.5
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
        """A pass arrives: the outcome is applied and the event is emitted."""
        state = self.state
        state.flight = None
        passer = self._player(flight.passer_id)
        receiver = self._player(flight.receiver_id)
        clock = format_match_clock(self.match_seconds)
        timestamp = int(self.match_seconds * 1000)
        lane_length = distance(flight.start_x, flight.start_y, flight.end_x, flight.end_y)

        # Every attempt is logged as a pass attempt so that the pass completion
        # statistic is always consistent with the event log.
        completed = flight.outcome == "completed"
        self.events.append(
            self._event(
                MatchEventType.PASS,
                clock,
                timestamp,
                passer.team if passer else None,
                flight.passer_id,
                flight.receiver_id,
                flight.end_x,
                flight.end_y,
                f"{passer.short_name if passer else 'The carrier'} plays the ball {lane_length:.0f}m "
                f"to {receiver.short_name if receiver else 'a teammate'}.",
                pdr=flight.pdr,
                completed=completed,
            )
        )

        if completed and receiver is not None:
            self.observations.completed_passes += 1
            if passer is not None:
                passer.passes_completed += 1
            if receiver is not None:
                receiver.touches += 1
            self._set_carrier(receiver)
            self._track_carry(receiver)
            return

        interceptor = self._player(flight.interceptor_id) if flight.interceptor_id else None

        if flight.outcome == "loose":
            # The passing side recovers the loose ball: the possession sequence
            # continues, but the pass itself never reached the receiver.
            self.observations.loose_balls += 1
            if receiver is not None:
                self._set_carrier(receiver)
            return

        if flight.outcome == "duel" and interceptor is not None:
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
                    f"{interceptor.short_name} contests the ball with {passer.short_name if passer else 'the carrier'}.",
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
                        f"Foul by {interceptor.short_name}; {passer.short_name if passer else 'the carrier'} keeps the ball.",
                    )
                )
                if receiver is not None:
                    self._set_carrier(receiver)
                    self._track_carry(receiver)
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
                    f"{interceptor.short_name} wins the tackle from {passer.short_name if passer else 'the carrier'}.",
                )
            )
            self._turnover(passer, interceptor, "tackle")
            return

        # Clean interception.
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
                    f"{interceptor.short_name} intercepts the pass from {passer.short_name if passer else 'the carrier'}.",
                    pdr=flight.pdr,
                    completed=False,
                )
            )
            self._turnover(passer, interceptor, "interception")
            return

        # The pass runs out of play: the defending side restarts.
        self.events.append(
            self._event(
                MatchEventType.TURNOVER,
                clock,
                timestamp,
                passer.team if passer else None,
                flight.passer_id,
                None,
                flight.end_x,
                flight.end_y,
                "The pass runs out of play.",
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
                f"{shooter.short_name} lets fly from {distance(shooter.x, shooter.y, goal_x, goal_y):.0f}m.",
                xg=xg,
            )
        )
        self.observations.shots += 1
        shooter.touches += 1

        is_goal = self.rng.random() < xg * 0.42
        if is_goal:
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
                    f"GOAL! {shooter.short_name} finds the net.",
                    xg=xg,
                )
            )
            self.score[team.value] += 1
            self._close_sequence()
            self._kickoff(TeamSide.AWAY if team is TeamSide.HOME else TeamSide.HOME)
            return

        # Saved, blocked or out of play: the defending side restarts.
        defending = TeamSide.AWAY if team is TeamSide.HOME else TeamSide.HOME
        self._close_sequence()
        self._set_carrier(self._deepest_player(defending))
        self.observations.possession_changes += 1
        self._sequence_team = defending
        self._sequence_started_at = self.match_seconds

    def _deepest_player(self, team: TeamSide) -> SimPlayer:
        direction = attack_direction(team)
        candidates = [p for p in self._teammates(team) if p.role == "GK"] or self._teammates(team)
        return min(candidates, key=lambda p: direction * p.x)

    def _turnover(self, loser: SimPlayer | None, winner: SimPlayer | None, reason: str) -> None:
        """Possession changes hands without a shot."""
        clock = format_match_clock(self.match_seconds)
        timestamp = int(self.match_seconds * 1000)
        if loser is not None:
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
                    f"Turnover: {loser.short_name} loses the ball.",
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
            winner = self._restart_player(
                TeamSide.AWAY if conceding is TeamSide.HOME else TeamSide.HOME
            )
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
        """Emit a carry event when the carrier has advanced a meaningful distance."""
        previous = self._carry_anchor
        moved = distance(previous[0], previous[1], carrier.x, carrier.y)
        if moved < 9.0:
            return
        self._carry_anchor = (carrier.x, carrier.y)
        self.events.append(
            self._event(
                MatchEventType.CARRY,
                format_match_clock(self.match_seconds),
                int(self.match_seconds * 1000),
                carrier.team,
                carrier.id,
                None,
                carrier.x,
                carrier.y,
                f"{carrier.short_name} carries {moved:.0f}m of Pitch Space.",
            )
        )

    def _event(self, *args, **kwargs) -> MatchEvent:
        """Create a match event stamped with the score at that moment."""
        event = make_event(*args, **kwargs)
        event.score = {"home": self.score["home"], "away": self.score["away"]}
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
        teammates = [
            p
            for p in self._teammates(carrier.team)
            if p.id != carrier.id and p.role != "GK"
        ]
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
            speedKmH=round(math.hypot(self.state.ball_vx, self.state.ball_vy) * 3.6, 1),
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
            metrics=metrics,
            latestNarrative=placeholder_narrative(format_match_clock(self.match_seconds)),
            agentTrace=[],
        )

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
