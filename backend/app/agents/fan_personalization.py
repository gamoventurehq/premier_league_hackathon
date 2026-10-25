"""Fan Personalization agent (ADR 0002).

Stage 5 of the pipeline: it projects the same base intelligence into the four
delivery modes of the studio - the Analyst Experience, the Casual Experience,
the Player Cam and the Club-Centric Experience.
"""

from __future__ import annotations

from dataclasses import dataclass
from time import perf_counter

from ..models import AgentRole, AgentStatus
from .base import (
    K_ANALYST_CONTEXT,
    K_CASUAL_CONTEXT,
    K_CLUB_CENTRIC_CONTEXT,
    K_CONTROL_VS_CHAOS,
    K_GAME_RHYTHM,
    K_INFLECTION_CANDIDATES,
    K_KEY_PLAYERS,
    K_NARRATIVE_ARC,
    K_PASS_DIFFICULTY_RATING,
    K_PITCH_CONTROL_AWAY,
    K_PITCH_CONTROL_CONTESTED,
    K_PITCH_CONTROL_HOME,
    K_PLAYER_CAM_CONTEXT,
    K_TACTICAL_PHASE,
    AgentContext,
    AgentOutcome,
)

PHASE_LABELS = {
    "build_up": "build-up",
    "progression": "progression",
    "final_third": "final third",
    "defensive_block": "defensive block",
    "transition": "transition",
}


@dataclass(slots=True)
class PersonaBundle:
    """The persona projections of a single moment."""

    analyst_context: str
    casual_context: str
    club_centric_context: dict[str, str]
    player_cam_context: str


class FanPersonalizationAgent:
    """Produces the Analyst, Casual, Player Cam and Club-Centric framings."""

    role = AgentRole.FAN_PERSONALIZATION
    label = "Fan Personalization"

    def run(self, context: AgentContext) -> AgentOutcome:
        started = perf_counter()
        frame = context.frame
        view = context.view

        arc = str(view.read(K_NARRATIVE_ARC) or frame.scenario.value)
        chaos = float(view.read(K_CONTROL_VS_CHAOS) or frame.metrics.controlVsChaosIndex)
        rhythm = str(view.read(K_GAME_RHYTHM) or frame.metrics.gameRhythm.value)
        pdr = float(view.read(K_PASS_DIFFICULTY_RATING) or frame.metrics.passDifficultyRating)
        phase = str(view.read(K_TACTICAL_PHASE) or "progression")
        home_control = float(view.read(K_PITCH_CONTROL_HOME) or frame.metrics.pitchControl.home)
        away_control = float(view.read(K_PITCH_CONTROL_AWAY) or frame.metrics.pitchControl.away)
        contested = float(view.read(K_PITCH_CONTROL_CONTESTED) or frame.metrics.pitchControl.contested)
        key_players = view.read(K_KEY_PLAYERS) or []
        inflections = view.read(K_INFLECTION_CANDIDATES) or []

        bundle = self._build(
            frame=frame,
            arc=arc,
            chaos=chaos,
            rhythm=rhythm,
            pdr=pdr,
            phase=phase,
            home_control=home_control,
            away_control=away_control,
            contested=contested,
            key_players=key_players,
            inflections=inflections,
        )

        view.write(K_ANALYST_CONTEXT, bundle.analyst_context)
        view.write(K_CASUAL_CONTEXT, bundle.casual_context)
        view.write(K_CLUB_CENTRIC_CONTEXT, bundle.club_centric_context)
        view.write(K_PLAYER_CAM_CONTEXT, bundle.player_cam_context)

        latency = (perf_counter() - started) * 1000.0
        summary = (
            f"Projected the {arc} moment into four personas "
            f"(Analyst, Casual, Player Cam, Club-Centric) for the {context.persona.value} view."
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
        """ADR 0004 rule-based fallback for the persona projections."""
        started = perf_counter()
        frame = context.frame
        view = context.view
        analyst = (
            f"{frame.matchClock} | Pitch Control {frame.metrics.pitchControl.home:.1f}% home / "
            f"{frame.metrics.pitchControl.away:.1f}% away | "
            f"Pass Difficulty Rating {frame.metrics.passDifficultyRating:.1f} | "
            f"Control vs. Chaos Index {frame.metrics.controlVsChaosIndex:.1f}"
        )
        casual = f"{frame.matchClock} — High-octane Premier League clash! The intensity is palpable under the floodlights."
        club = {
            "homeFrame": f"City command {frame.metrics.pitchControl.home:.1f}% of the pitch with relentless territorial control.",
            "awayFrame": f"Arsenal lock down {frame.metrics.pitchControl.away:.1f}% of the territory, maintaining rigid defensive shape.",
        }
        player_cam = self._player_cam(frame, "the tracked player")
        view.write(K_ANALYST_CONTEXT, analyst)
        view.write(K_CASUAL_CONTEXT, casual)
        view.write(K_CLUB_CENTRIC_CONTEXT, club)
        view.write(K_PLAYER_CAM_CONTEXT, player_cam)
        latency = (perf_counter() - started) * 1000.0
        return AgentOutcome(
            role=self.role,
            label=self.label,
            status=AgentStatus.FALLBACK,
            latency_ms=latency,
            summary="Rule-based fallback produced the four persona projections.",
            reads=list(view.reads),
            writes=list(view.writes),
        )

    # -- helpers ---------------------------------------------------------------
    def _build(
        self,
        frame,
        arc: str,
        chaos: float,
        rhythm: str,
        pdr: float,
        phase: str,
        home_control: float,
        away_control: float,
        contested: float,
        key_players: list[dict],
        inflections: list,
    ) -> PersonaBundle:
        clock = frame.matchClock
        phase_label = PHASE_LABELS.get(phase, phase)
        lead = key_players[0]["shortName"] if key_players else "the carrier"

        analyst = (
            f"{clock} | phase {phase_label} | Pitch Control {home_control:.1f}% home / "
            f"{away_control:.1f}% away / {contested:.1f}% contested | "
            f"Pass Difficulty Rating {pdr:.1f} | Control vs. Chaos Index {chaos:.1f} | "
            f"Game Rhythm {rhythm} | principal actor {lead}"
        )

        casual = f"{clock} - {arc}. {self._casual_sentence(frame, phase_label, lead)}"

        home_frame = (
            f"{lead} is running the {phase_label} phase; City hold {home_control:.1f}% of the "
            f"Pitch Space with a Pass Difficulty Rating of {pdr:.1f} - every forward lane is "
            f"contested at the point of release."
        )
        away_frame = (
            f"Arsenal defend {away_control:.1f}% of the Pitch Space and absorb the pressure "
            f"with a Game Rhythm of {rhythm}; the Control vs. Chaos Index of {chaos:.1f} shows "
            f"how little room the block is leaving."
        )

        player_cam = self._player_cam(frame, lead)

        return PersonaBundle(
            analyst_context=analyst,
            casual_context=casual,
            club_centric_context={"homeFrame": home_frame, "awayFrame": away_frame},
            player_cam_context=player_cam,
        )

    def _casual_sentence(self, frame, phase_label: str, lead: str) -> str:
        scenario = frame.scenario.value
        if scenario == "high_possession":
            return (
                f"Total dominance from City! They are suffocating the pitch and dictating every blade of grass, "
                f"with {lead} conducting the orchestra."
            )
        if scenario == "counter_attack_transition":
            return (
                f"Sensational break! {lead} bursts forward with frightening speed as the stadium roars — "
                f"Arsenal are carving City wide open on the counter!"
            )
        if scenario == "low_block_siege":
            return (
                f"Absolute siege at the Emirates! Arsenal have thrown up a brick wall inside the box, "
                f"and {lead} is probing patiently for the killer ball."
            )
        return (
            f"Heart-stopping chaos in the six-yard box! Desperate lunges, sliding tackles, and {lead} "
            f"fighting tooth and nail for the rebound!"
        )

    def _player_cam(self, frame, lead: str) -> str:
        tracked = next((p for p in frame.players if p.isDesignatedPlayerCam), None)
        if tracked is None:
            tracked = next((p for p in frame.players if p.onBall), None)
        if tracked is None:
            return "No player is currently tracked."
        return (
            f"Player Cam on {tracked.name} ({tracked.number}, {tracked.team.value}): "
            f"{tracked.speedKmH:.1f} km/h, {tracked.distanceMeters:.0f}m covered, "
            f"{tracked.touches} touches, anchoring at ({tracked.homeX:.0f}, {tracked.homeY:.0f})."
        )


__all__ = ["FanPersonalizationAgent", "PersonaBundle"]
