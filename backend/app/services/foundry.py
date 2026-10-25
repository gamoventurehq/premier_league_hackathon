"""Microsoft Foundry and Generic LLM narrative tier.

Supports:
1. Standard OpenAI-compatible endpoints (Ollama, vLLM, LM Studio) at http://localhost:11434/v1
2. GitHub Models (https://models.github.ai/inference / https://models.inference.ai.azure.com) via GITHUB_TOKEN
3. Azure AI Foundry chat completions via AZURE_AI_FOUNDRY_ENDPOINT
4. Graceful deterministic fallback via RuleBasedNarrativeGenerator on timeout/failure.
"""

from __future__ import annotations

import contextlib
import json
import logging
import re
import urllib.error
import urllib.request
from typing import Any

from ..agents.base import AgentContext
from ..agents.broadcast_narrative import NarrativeDraft
from ..config import Settings
from ..models import BroadcastLanguage, MultilingualNarrative

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are a world-class Premier League broadcast commentator and tactical analyst (think Peter Drury meets Gary Neville). "
    "Deliver vivid, sharp, dynamic match commentary and tactical insight that captures the high-stakes tempo of English football. "
    "Answer with strict JSON only with no markdown or formatting outside JSON: "
    '{"headline": {"en": str, "es": str, "fr": str, "ja": str, "ar": str}, '
    '"tacticalExplanation": {"en": str, "es": str, "fr": str, "ja": str, "ar": str}}. '
    "Keep headlines punchy (under 12 words), urgent, and cinematic. "
    "In tactical explanations, highlight spatial pressure, tactical movements, and player decisions with authentic Premier League terminology."
)

GITHUB_MODELS_FALLBACK_URL = "https://models.github.ai/inference/chat/completions"


class FoundryNarrativeService:
    """Unified LLM Narrative Service supporting Azure AI Foundry, GitHub Models, and OpenAI-compatible runners."""

    def __init__(self, settings: Settings, timeout: float = 0.35) -> None:
        self._settings = settings
        self._timeout = timeout
        self._warned = False
        self._client: Any = None
        self._init_client()

    def _init_client(self) -> None:
        try:
            import httpx

            self._client = httpx.Client(
                timeout=self._timeout,
                limits=httpx.Limits(max_keepalive_connections=5, max_connections=10),
            )
        except Exception:
            self._client = None

    def close(self) -> None:
        if self._client is not None:
            with contextlib.suppress(Exception):
                self._client.close()
            self._client = None

    def __del__(self) -> None:
        self.close()

    @property
    def enabled(self) -> bool:
        return self._settings.llm_enabled

    @property
    def provider(self) -> str | None:
        return self._settings.active_llm_provider

    def _ensure_configured(self) -> bool:
        if self.enabled:
            return True
        if not self._warned:
            logger.warning(
                "LLM Narrative Service is not configured (set LLM_PROVIDER / LLM_BASE_URL "
                "or Azure AI Foundry credentials) - the deterministic narrative generator "
                "is used instead."
            )
            self._warned = True
        return False

    def _build_prompt(self, context: AgentContext) -> str:
        frame = context.frame
        if frame is None:
            return "Synthetic Premier League match in progress."
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
            f"Recent events: " + "; ".join(event.description for event in frame.events[-4:])
        )

    def _resolve_request(self, context: AgentContext) -> tuple[str, dict[str, str], dict[str, Any]]:
        settings = self._settings
        provider = settings.active_llm_provider

        model = settings.effective_llm_model
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": self._build_prompt(context)},
        ]
        body: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": 0.4,
            "max_tokens": getattr(settings, "llm_max_tokens", 250),
            "response_format": {"type": "json_object"},
        }

        # 1. Azure AI Foundry
        if provider == "azure":
            endpoint = (settings.azure_ai_foundry_endpoint or "").rstrip("/")
            deployment = settings.azure_ai_foundry_deployment or ""
            url = (
                f"{endpoint}/openai/deployments/{deployment}/chat/completions"
                f"?api-version={settings.azure_openai_api_version}"
            )
            headers = {
                "Content-Type": "application/json",
                "api-key": settings.azure_openai_api_key or "",
            }
            if deployment:
                body["model"] = deployment
            return url, headers, body

        # 2. GitHub Models
        if provider == "github" or (settings.github_token and not settings.llm_base_url):
            base_url = settings.effective_llm_base_url
            if base_url.endswith("/chat/completions"):
                url = base_url
            elif base_url.endswith("/inference"):
                url = f"{base_url}/chat/completions"
            else:
                url = f"{base_url}/chat/completions"
            token = settings.github_token or settings.llm_api_key or ""
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
            }
            body["model"] = settings.effective_llm_model or "gpt-4o-mini"
            return url, headers, body

        # 3. Ollama / OpenAI-compatible / Custom
        base_url = settings.effective_llm_base_url
        if base_url.endswith("/chat/completions"):
            url = base_url
        elif base_url.endswith("/v1") or "/v1" in base_url:
            url = f"{base_url}/chat/completions"
        else:
            url = f"{base_url}/v1/chat/completions"

        headers = {"Content-Type": "application/json"}
        api_key = settings.llm_api_key
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        body["model"] = settings.effective_llm_model or "llama3.2"
        return url, headers, body

    def _post(self, url: str, headers: dict[str, str], body: dict[str, Any]) -> dict[str, Any]:
        data_bytes = json.dumps(body).encode("utf-8")
        if self._client is not None:
            import httpx

            try:
                resp = self._client.post(url, headers=headers, content=data_bytes, timeout=self._timeout)
                resp.raise_for_status()
                return resp.json()
            except (httpx.ConnectError, httpx.ConnectTimeout):
                if "models.inference.ai.azure.com" in url:
                    fallback_url = GITHUB_MODELS_FALLBACK_URL
                    resp = self._client.post(fallback_url, headers=headers, content=data_bytes, timeout=self._timeout)
                    resp.raise_for_status()
                    return resp.json()
                raise
        else:
            req = urllib.request.Request(url, data=data_bytes, headers=headers, method="POST")
            try:
                with urllib.request.urlopen(req, timeout=self._timeout) as response:
                    return json.loads(response.read().decode("utf-8"))
            except urllib.error.URLError:
                if "models.inference.ai.azure.com" in url:
                    fallback_url = GITHUB_MODELS_FALLBACK_URL
                    fb_req = urllib.request.Request(fallback_url, data=data_bytes, headers=headers, method="POST")
                    with urllib.request.urlopen(fb_req, timeout=self._timeout) as response:
                        return json.loads(response.read().decode("utf-8"))
                raise

    def _clean_and_parse_json(self, raw_content: str) -> dict[str, Any]:
        text = raw_content.strip()
        # 1. Strip markdown fences if present
        if "```" in text:
            match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
            if match:
                text = match.group(1).strip()
            else:
                lines = [line for line in text.splitlines() if not line.strip().startswith("```")]
                text = "\n".join(lines).strip()

        # 2. Extract outermost JSON object if surrounding text exists
        if not (text.startswith("{") and text.endswith("}")):
            match = re.search(r"\{.*\}", text, re.DOTALL)
            if match:
                text = match.group(0)

        # 3. Direct JSON parse
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # 4. Attempt repair for truncated JSON responses (e.g. token limits)
        for suffix in ['"}}}', '""}}}', '"}', '"}}', '}}}', '}}', '}']:
            try:
                return json.loads(text + suffix)
            except json.JSONDecodeError:
                pass

        idx = len(text)
        while idx > 0:
            last_comma = text.rfind(",", 0, idx)
            if last_comma == -1:
                break
            truncated = text[:last_comma]
            for suffix in ["}}}", "}}", "}"]:
                try:
                    return json.loads(truncated + suffix)
                except json.JSONDecodeError:
                    pass
            idx = last_comma

        return json.loads(text)

    def __call__(self, context: AgentContext) -> NarrativeDraft:
        """Generate a narrative through Foundry or configured LLM provider. Raises on any failure."""
        if not self._ensure_configured():
            raise RuntimeError("LLM Narrative Service is not configured")

        url, headers, body = self._resolve_request(context)
        try:
            payload = self._post(url, headers, body)
            content = payload["choices"][0]["message"]["content"]
            parsed = self._clean_and_parse_json(content)

            languages = [language.value for language in BroadcastLanguage]

            raw_hl = parsed.get("headline", {})
            if isinstance(raw_hl, str):
                raw_hl = {"en": raw_hl}
            elif not isinstance(raw_hl, dict):
                raw_hl = {"en": str(raw_hl)}

            default_hl = (
                raw_hl.get("en")
                if isinstance(raw_hl.get("en"), str) and raw_hl.get("en", "").strip()
                else "Tactical development underway"
            )

            raw_exp = parsed.get("tacticalExplanation", {})
            if isinstance(raw_exp, str):
                raw_exp = {"en": raw_exp}
            elif not isinstance(raw_exp, dict):
                raw_exp = {"en": str(raw_exp)}

            default_exp = (
                raw_exp.get("en")
                if isinstance(raw_exp.get("en"), str) and raw_exp.get("en", "").strip()
                else "Analysis of match dynamics in progress"
            )

            headline_kwargs = {
                lang: val.strip()
                if (val := raw_hl.get(lang)) is not None and isinstance(val, str) and val.strip()
                else default_hl
                for lang in languages
            }
            explanation_kwargs = {
                lang: val.strip()
                if (val := raw_exp.get(lang)) is not None and isinstance(val, str) and val.strip()
                else default_exp
                for lang in languages
            }

            headline = MultilingualNarrative(**headline_kwargs)
            explanation = MultilingualNarrative(**explanation_kwargs)

            frame = context.frame
            frame_id = getattr(frame, "frameId", 0) if frame else 0
            match_clock = getattr(frame, "matchClock", "00:00") if frame else "00:00"
            match_seconds = getattr(frame, "matchSeconds", 0.0) if frame else 0.0
            return NarrativeDraft(
                id=f"narr-{frame_id}",
                matchClock=match_clock,
                timestamp=int(match_seconds * 1000),
                isTacticalInflectionPoint=False,
                headline=headline,
                tacticalExplanation=explanation,
                commentatorCue=headline.en,
            )
        except Exception as exc:
            raise RuntimeError(f"LLM request to {self.provider or 'provider'} failed: {exc}") from exc


__all__ = ["FoundryNarrativeService", "SYSTEM_PROMPT"]
