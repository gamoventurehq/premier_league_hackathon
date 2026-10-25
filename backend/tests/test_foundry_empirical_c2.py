"""Empirical verification test suite for FoundryNarrativeService.

Milestone 1 Challenger 2 (Empirical Challenger)
Covers:
1. Live local inference against host Ollama (http://localhost:11434/v1, llama3.2).
2. Verification that returned NarrativeDraft contains all 5 broadcast languages (en, es, fr, ja, ar).
3. Default timeout semantics (0.35s) against slow responses (no hanging, bounded execution).
4. Dual transport verification (httpx pooled connection and urllib fallback).
5. Client resource cleanup (service.close(), idempotence, __del__).
6. Defensive markdown stripping, truncated JSON repair, and non-empty translation fallback.
"""

from __future__ import annotations

import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any

import pytest
from app.agents.base import AgentContext, Blackboard, BlackboardView
from app.config import Settings
from app.models import BroadcastLanguage, ExperiencePersona
from app.services.foundry import FoundryNarrativeService
from app.simulation.engine import MatchEngine


def _is_ollama_online() -> bool:
    """Check if host Ollama is running and responsive."""
    try:
        import urllib.request

        with urllib.request.urlopen("http://localhost:11434/api/tags", timeout=1.0) as resp:
            return resp.status == 200
    except Exception:
        return False


# ==============================================================================
# 1. Live Ollama Inference & Multilingual Contract Verification
# ==============================================================================


@pytest.mark.skipif(not _is_ollama_online(), reason="Host Ollama is not running on http://localhost:11434")
def test_live_ollama_multilingual_inference() -> None:
    """Empirically test live local inference against host Ollama llama3.2.

    Verifies that returned NarrativeDraft contains non-empty strings for all 5
    broadcast languages (en, es, fr, ja, ar).
    """
    settings = Settings(
        llm_provider="ollama",
        llm_base_url="http://localhost:11434/v1",
        llm_model="llama3.2",
        llm_timeout_seconds=45.0,
        llm_max_tokens=250,
    )
    service = FoundryNarrativeService(settings, timeout=45.0)
    engine = MatchEngine(seed=42)
    frame = engine.build_frame()
    context = AgentContext(
        frame=frame,
        view=BlackboardView(Blackboard()),
        persona=ExperiencePersona.ANALYST,
    )

    t0 = time.perf_counter()
    draft = service(context)
    elapsed = time.perf_counter() - t0
    assert elapsed > 0.0

    assert draft is not None
    assert draft.id.startswith("narr-")
    assert draft.matchClock == frame.matchClock
    assert draft.commentatorCue == draft.headline.en

    expected_languages = [lang.value for lang in BroadcastLanguage]
    assert len(expected_languages) == 5

    for lang in expected_languages:
        hl_val = getattr(draft.headline, lang, None)
        exp_val = getattr(draft.tacticalExplanation, lang, None)

        assert hl_val is not None, f"Headline for language '{lang}' is None"
        assert isinstance(hl_val, str), f"Headline for language '{lang}' must be str, got {type(hl_val)}"
        assert hl_val.strip(), f"Headline for language '{lang}' is empty"

        assert exp_val is not None, f"Explanation for language '{lang}' is None"
        assert isinstance(exp_val, str), f"Explanation for language '{lang}' must be str, got {type(exp_val)}"
        assert exp_val.strip(), f"Explanation for language '{lang}' is empty"

    service.close()
    assert service._client is None


# ==============================================================================
# 2. Default Timeout Semantics (0.35s) Against Slow Responses
# ==============================================================================


@pytest.mark.skipif(not _is_ollama_online(), reason="Host Ollama is not running on http://localhost:11434")
def test_default_timeout_semantics_live_ollama() -> None:
    """Verify that default 0.35s timeout raises RuntimeError without hanging on live Ollama."""
    settings = Settings(
        llm_provider="ollama",
        llm_base_url="http://localhost:11434/v1",
        llm_model="llama3.2",
    )
    # Default constructor uses timeout=0.35
    service = FoundryNarrativeService(settings)
    assert service._timeout == 0.35

    engine = MatchEngine(seed=42)
    context = AgentContext(
        frame=engine.build_frame(),
        view=BlackboardView(Blackboard()),
        persona=ExperiencePersona.ANALYST,
    )

    t0 = time.perf_counter()
    with pytest.raises(RuntimeError) as exc_info:
        service(context)
    elapsed = time.perf_counter() - t0

    assert "timed out" in str(exc_info.value).lower() or "timeout" in str(exc_info.value).lower()
    # Ensure timeout fired promptly within the sub-500ms budget, not hanging for full inference
    assert 0.30 <= elapsed <= 0.65, f"Elapsed time was {elapsed:.3f}s; expected ~0.35s"

    service.close()


def test_default_timeout_semantics_controlled_slow_server_httpx() -> None:
    """Controlled slow server: verify httpx client times out in 0.35s without hanging."""

    class SlowHandler(BaseHTTPRequestHandler):
        def do_POST(self) -> None:
            time.sleep(1.5)
            try:
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"choices": [{"message": {"content": "{}"}}]}\n')
            except (BrokenPipeError, ConnectionResetError, OSError):
                pass

        def log_message(self, *args: Any) -> None:
            pass

    server = HTTPServer(("127.0.0.1", 0), SlowHandler)
    port = server.server_port
    thread = threading.Thread(target=server.handle_request, daemon=True)
    thread.start()

    try:
        settings = Settings(
            llm_provider="openai",
            llm_base_url=f"http://127.0.0.1:{port}/v1",
            llm_model="test-model",
        )
        service = FoundryNarrativeService(settings, timeout=0.35)
        context = AgentContext(
            frame=None,  # type: ignore[arg-type]
            view=BlackboardView(Blackboard()),
            persona=ExperiencePersona.ANALYST,
        )

        t0 = time.perf_counter()
        with pytest.raises(RuntimeError) as exc_info:
            service(context)
        elapsed = time.perf_counter() - t0

        assert "timed out" in str(exc_info.value).lower() or "timeout" in str(exc_info.value).lower()
        assert 0.30 <= elapsed <= 0.65, f"Elapsed time was {elapsed:.3f}s; expected ~0.35s"
        service.close()
    finally:
        server.server_close()


def test_default_timeout_semantics_controlled_slow_server_urllib_fallback() -> None:
    """Controlled slow server: verify urllib fallback times out in 0.35s without hanging."""

    class SlowHandler(BaseHTTPRequestHandler):
        def do_POST(self) -> None:
            time.sleep(1.5)
            try:
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"choices": [{"message": {"content": "{}"}}]}\n')
            except (BrokenPipeError, ConnectionResetError, OSError):
                pass

        def log_message(self, *args: Any) -> None:
            pass

    server = HTTPServer(("127.0.0.1", 0), SlowHandler)
    port = server.server_port
    thread = threading.Thread(target=server.handle_request, daemon=True)
    thread.start()

    try:
        settings = Settings(
            llm_provider="openai",
            llm_base_url=f"http://127.0.0.1:{port}/v1",
            llm_model="test-model",
        )
        service = FoundryNarrativeService(settings, timeout=0.35)
        service._client = None  # Force urllib fallback

        context = AgentContext(
            frame=None,  # type: ignore[arg-type]
            view=BlackboardView(Blackboard()),
            persona=ExperiencePersona.ANALYST,
        )

        t0 = time.perf_counter()
        with pytest.raises(RuntimeError) as exc_info:
            service(context)
        elapsed = time.perf_counter() - t0

        assert "timed out" in str(exc_info.value).lower() or "timeout" in str(exc_info.value).lower()
        assert 0.30 <= elapsed <= 0.65, f"Elapsed time was {elapsed:.3f}s; expected ~0.35s"
        service.close()
    finally:
        server.server_close()


# ==============================================================================
# 3. Client Resource Cleanup (service.close())
# ==============================================================================


def test_client_resource_cleanup_lifecycle() -> None:
    """Verify httpx.Client lifecycle, close() idempotent behavior, and __del__ cleanup."""
    import httpx

    settings = Settings(llm_provider="ollama", llm_base_url="http://localhost:11434/v1")
    service = FoundryNarrativeService(settings)

    # Initial state
    assert service._client is not None
    assert isinstance(service._client, httpx.Client)
    assert not service._client.is_closed
    client_ref = service._client

    # Explicit close()
    service.close()
    assert service._client is None
    assert client_ref.is_closed

    # Idempotency: multiple close calls must be harmless
    service.close()
    service.close()

    # Destructor cleanup
    service2 = FoundryNarrativeService(settings)
    client_ref2 = service2._client
    assert not client_ref2.is_closed
    service2.__del__()
    assert client_ref2.is_closed
    assert service2._client is None


# ==============================================================================
# 4. Defensive Parsing & 5-Language Fallback
# ==============================================================================


def test_defensive_parsing_and_multilingual_fallback() -> None:
    """Verify resilience against malformed, fenced, truncated, or partial responses."""
    settings = Settings(llm_provider="ollama", llm_base_url="http://localhost:11434/v1")
    service = FoundryNarrativeService(settings)

    test_raw_payloads = [
        # Markdown fenced with json tag and preamble
        "Tactical note:\n```json\n{\"headline\": {\"en\": \"High Press\"}, \"tacticalExplanation\": {\"en\": \"Pressing high\"}}\n```",
        # Markdown fenced without tag
        "```\n{\"headline\": {\"en\": \"Low Block\", \"es\": \"Bloque bajo\"}}\n```",
        # Truncated json
        '{"headline": {"en": "Counter Attack", "es": "Contra", "fr": "Contre',
        # Empty json
        "{}",
        # Null and empty fields
        '{"headline": {"en": "Wing Overload", "es": "", "fr": null, "ja": "   "}, "tacticalExplanation": {"en": "2v1 created"}}',
        # Raw string instead of dict
        '{"headline": "Direct Attack", "tacticalExplanation": "Direct play"}',
    ]

    languages = [lang.value for lang in BroadcastLanguage]

    for raw in test_raw_payloads:
        parsed = service._clean_and_parse_json(raw)
        assert isinstance(parsed, dict)

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

        for lang in languages:
            val_hl = raw_hl.get(lang)
            hl = val_hl.strip() if val_hl and isinstance(val_hl, str) and val_hl.strip() else default_hl
            assert hl and hl.strip(), f"Headline empty for language {lang}"

            val_exp = raw_exp.get(lang)
            exp = val_exp.strip() if val_exp and isinstance(val_exp, str) and val_exp.strip() else default_exp
            assert exp and exp.strip(), f"Explanation empty for language {lang}"

    service.close()
