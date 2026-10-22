"""Stage 4: the Broadcast Overlay payload builder.

The Broadcast Overlay is a synchronized, machine-readable graphical payload
rendered on screen alongside live match video. It is not a UI component - it
is the artefact a broadcast graphic engine consumes.
"""

from __future__ import annotations

from ..models import (
    BroadcastLanguage,
    BroadcastOverlayPayload,
    ExperiencePersona,
    LowerThird,
    OverlayMetrics,
    ScoreBug,
    TelemetryFrame,
)

SCHEMA_VERSION = "1.0.0"

HOME_CLUB = "Manchester City"
AWAY_CLUB = "Arsenal"

SPEAKER_BY_PERSONA = {
    ExperiencePersona.ANALYST: "Studio Analyst",
    ExperiencePersona.CASUAL: "Studio Presenter",
    ExperiencePersona.PLAYER_CAM: "Player Cam Operator",
    ExperiencePersona.CLUB_CENTRIC: "Club Desk",
}


def build_overlay(
    frame: TelemetryFrame,
    persona: ExperiencePersona | str = ExperiencePersona.ANALYST,
) -> BroadcastOverlayPayload:
    """Build the Broadcast Overlay for a telemetry frame."""
    if isinstance(persona, str):
        persona = ExperiencePersona(persona)

    narrative = frame.latestNarrative
    metrics = frame.metrics

    languages: dict[str, str] = {
        language.value: narrative.headline.model_dump()[language.value] for language in BroadcastLanguage
    }

    subline = narrative.tacticalExplanation.en
    if persona is ExperiencePersona.CASUAL:
        subline = narrative.casualContext or narrative.tacticalExplanation.en
    elif persona is ExperiencePersona.CLUB_CENTRIC:
        subline = narrative.clubCentricContext.homeFrame or narrative.tacticalExplanation.en
    elif persona is ExperiencePersona.PLAYER_CAM:
        subline = narrative.analystContext or narrative.tacticalExplanation.en

    return BroadcastOverlayPayload(
        overlayId=f"ovl-{frame.scenario.value}-{frame.frameId}",
        schemaVersion=SCHEMA_VERSION,
        syncTimestampMs=int(frame.matchSeconds * 1000),
        matchClock=frame.matchClock,
        lowerThird=LowerThird(
            headline=narrative.headline.en,
            subline=subline,
            speaker=SPEAKER_BY_PERSONA.get(persona, "Studio Presenter"),
        ),
        scoreBug=ScoreBug(
            home=HOME_CLUB,
            away=AWAY_CLUB,
            homeScore=frame.score.home,
            awayScore=frame.score.away,
        ),
        metrics=OverlayMetrics(
            controlVsChaosIndex=metrics.controlVsChaosIndex,
            passDifficultyRating=metrics.passDifficultyRating,
            pitchControl=metrics.pitchControl,
        ),
        languages=languages,
        commentatorCue=(
            f"{frame.matchClock} | {narrative.headline.en} | "
            f"Control vs. Chaos {metrics.controlVsChaosIndex:.0f} | "
            f"PDR {metrics.passDifficultyRating:.0f} | "
            f"Pitch Control {metrics.pitchControl.home:.0f}/{metrics.pitchControl.away:.0f}"
        ),
    )


__all__ = ["SCHEMA_VERSION", "build_overlay"]
