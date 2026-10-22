"""Microsoft Foundry narrative tier (optional).

When ``AZURE_AI_FOUNDRY_ENDPOINT`` / ``AZURE_AI_FOUNDRY_DEPLOYMENT`` /
``AZURE_OPENAI_API_KEY`` are configured the Broadcast Narrative agent may ask
a Foundry model to write the Multilingual Broadcast Stream. When they are not
configured the agent uses the deterministic local generator instead, so the
service never depends on the cloud.
"""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from typing import Any

from ..agents.base import AgentContext
from ..agents.broadcast_narrative import NarrativeDraft
from ..config import Settings
from ..models import BroadcastLanguage, MultilingualNarrative

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are the broadcast narrative writer for a synthetic Premier League match. "
    "Explain the tactical significance of the moment. Answer with strict JSON only: "
    '{"headline": {"en": str, "es": str, "fr": str, "ja": str, "ar": str}, '
    '"tacticalExplanation": {"en": str, "es": str, "fr": str, "ja": str, "ar": str}}. '
    "Use canonical football terminology and never invent match facts."
)


class FoundryNarrativeService:
    """Calls an Azure AI Foundry chat completion to write the narrative."""

    def __init__(self, settings: Settings, timeout: float = 1.2) -> None:
        self._settings = settings
        self._timeout = timeout
        self._warned = False

    @property
    def enabled(self) -> bool:
        return self._settings.foundry_enabled

    def _ensure_configured(self) -> bool:
        if self.enabled:
            return True
        if not self._warned:
            logger.warning(
                "Microsoft Foundry is not configured (set AZURE_AI_FOUNDRY_ENDPOINT, "
                "AZURE_AI_FOUNDRY_DEPLOYMENT and AZURE_OPENAI_API_KEY) - the deterministic "
                "narrative generator is used instead."
            )
            self._warned = True
        return False

    def _build_prompt(self, context: AgentContext) -> str:
        frame = context.frame
        metrics = frame.metrics
        return (
            f"Match clock: {frame.matchClock}\n"
            f"Scenario: {frame.scenario.value}\n"
            f"Game Rhythm: {metrics.gameRhythm.value}\n"
            f"Control vs. Chaos Index: {metrics.controlVsChaosIndex:.1f}\n"
            f"Pass Difficulty Rating: {metrics.passDifficultyRating:.1f}\n"
            f"Pitch Control: home {metrics.pitchControl.home:.1f}% / away "
            f"{metrics.pitchControl.away:.1f}% / contested {metrics.pitchControl.contested:.1f}%\n"
            f"Possession: home {metrics.possessionShare.home:.1f}% / away {metrics.possessionShare.away:.1f}%\n"
            f"Recent events: "
            + "; ".join(event.description for event in frame.events[-4:])
        )

    def __call__(self, context: AgentContext) -> NarrativeDraft:
        """Generate a narrative through Foundry. Raises on any failure."""
        if not self._ensure_configured():
            raise RuntimeError("Microsoft Foundry is not configured")

        settings = self._settings
        endpoint = (settings.azure_ai_foundry_endpoint or "").rstrip("/")
        deployment = settings.azure_ai_foundry_deployment or ""
        url = (
            f"{endpoint}/openai/deployments/{deployment}/chat/completions"
            f"?api-version={settings.azure_openai_api_version}"
        )
        body = json.dumps(
            {
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": self._build_prompt(context)},
                ],
                "temperature": 0.4,
                "response_format": {"type": "json_object"},
            }
        ).encode("utf-8")
        request = urllib.request.Request(  # noqa: S310 - fixed https endpoint from configuration
            url,
            data=body,
            headers={
                "Content-Type": "application/json",
                "api-key": settings.azure_openai_api_key or "",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=self._timeout) as response:  # noqa: S310
                payload = json.loads(response.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"Foundry request failed: {exc}") from exc

        content = payload["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        languages = [language.value for language in BroadcastLanguage]
        headline = MultilingualNarrative(
            **{language: str(parsed["headline"].get(language, parsed["headline"]["en"])) for language in languages}
        )
        explanation = MultilingualNarrative(
            **{
                language: str(parsed["tacticalExplanation"].get(language, parsed["tacticalExplanation"]["en"]))
                for language in languages
            }
        )
        frame = context.frame
        return NarrativeDraft(
            id=f"narr-{frame.frameId}",
            matchClock=frame.matchClock,
            timestamp=int(frame.matchSeconds * 1000),
            isTacticalInflectionPoint=False,
            headline=headline,
            tacticalExplanation=explanation,
            commentatorCue=headline.en,
        )


__all__ = ["FoundryNarrativeService", "SYSTEM_PROMPT"]
