"""Adversarial stress test suite by Challenger 1 (teamwork_preview_challenger) for Milestone 1.

Verifies:
1. Connection failure / port closed / unreachable host / hanging server
   - Must raise RuntimeError cleanly, never crash or hang.
   - Tests both httpx.Client and urllib.request fallback code paths.
2. Malformed JSON / raw text / markdown code fences / truncated JSON
   - Strips code fences, repairs truncated JSON, raises clean RuntimeError on unrecoverable non-JSON.
3. Missing or empty language fields
   - Missing, None, empty, whitespace-only fields cleanly fallback to English text.
   - Completely missing English fields fallback to default tactical text across all 5 languages.
4. URL path variations
   - Base URL variations (bare host, trailing slashes, /v1, /v1/, /chat/completions, GitHub Models, Azure)
5. Full Swarm Fallback Integration
   - BroadcastNarrativeAgent and AgentSwarm seamlessly engage rule-based fallback when model service fails.
"""

from __future__ import annotations

import json
import socket
import threading
import time
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from app.agents.base import AgentContext, Blackboard, BlackboardView
from app.agents.broadcast_narrative import BroadcastNarrativeAgent
from app.agents.swarm import AgentSwarm
from app.config import Settings
from app.models import AgentStatus, BroadcastLanguage, ExperiencePersona
from app.services.foundry import FoundryNarrativeService
from app.simulation.engine import MatchEngine


def _create_mock_context(engine: MatchEngine) -> AgentContext:
    frame = engine.build_frame()
    blackboard = Blackboard()
    view = BlackboardView(blackboard)
    return AgentContext(frame=frame, view=view, persona=ExperiencePersona.ANALYST)


# ==============================================================================
# SECTION 1: Connection failure / port closed / unreachable host / hanging
# ==============================================================================


def test_connection_failure_closed_port_raises_runtime_error(engine: MatchEngine) -> None:
    """When target port is closed, service must cleanly raise RuntimeError without hanging."""
    # Find an unused port
    sock = socket.socket()
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    sock.close()

    settings = Settings(
        llm_provider="ollama",
        llm_base_url=f"http://127.0.0.1:{port}/v1",
        llm_timeout_seconds=0.5,
    )
    service = FoundryNarrativeService(settings, timeout=0.5)
    context = _create_mock_context(engine)

    start = time.perf_counter()
    with pytest.raises(RuntimeError) as exc_info:
        service(context)
    elapsed = time.perf_counter() - start

    service.close()
    assert "failed" in str(exc_info.value).lower()
    assert elapsed < 2.0, f"Call hung for {elapsed:.2f}s on closed port"


def test_connection_failure_unroutable_host_respects_timeout(engine: MatchEngine) -> None:
    """Connection to unroutable IP (TEST-NET-1) must raise RuntimeError cleanly within timeout budget."""
    settings = Settings(
        llm_provider="ollama",
        llm_base_url="http://192.0.2.1:81/v1",  # TEST-NET-1 (non-routable)
        llm_timeout_seconds=0.25,
    )
    service = FoundryNarrativeService(settings, timeout=0.25)
    context = _create_mock_context(engine)

    start = time.perf_counter()
    with pytest.raises(RuntimeError) as exc_info:
        service(context)
    elapsed = time.perf_counter() - start

    service.close()
    assert "failed" in str(exc_info.value).lower()
    # Must abort cleanly around the 0.25s timeout (with small headroom), never hang
    assert elapsed < 1.5, f"Call hung for {elapsed:.2f}s on unroutable host"


def test_connection_failure_invalid_dns_hostname(engine: MatchEngine) -> None:
    """Non-existent DNS host must raise RuntimeError cleanly."""
    settings = Settings(
        llm_provider="ollama",
        llm_base_url="http://nonexistent-host-domain.invalid:11434/v1",
        llm_timeout_seconds=0.5,
    )
    service = FoundryNarrativeService(settings, timeout=0.5)
    context = _create_mock_context(engine)

    with pytest.raises(RuntimeError) as exc_info:
        service(context)

    service.close()
    assert "failed" in str(exc_info.value).lower()


def test_server_hang_respects_client_timeout(engine: MatchEngine) -> None:
    """Server that accepts TCP connection but hangs indefinitely must trigger client timeout and raise RuntimeError."""
    server_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_sock.bind(("127.0.0.1", 0))
    port = server_sock.getsockname()[1]
    server_sock.listen(1)

    stop_server = threading.Event()

    def hang_worker() -> None:
        while not stop_server.is_set():
            server_sock.settimeout(0.1)
            try:
                conn, _ = server_sock.accept()
                # Accept connection but never send data or close until told
                while not stop_server.is_set():
                    time.sleep(0.05)
                conn.close()
            except TimeoutError:
                continue
            except Exception:
                break

    t = threading.Thread(target=hang_worker, daemon=True)
    t.start()

    try:
        settings = Settings(
            llm_provider="ollama",
            llm_base_url=f"http://127.0.0.1:{port}/v1",
            llm_timeout_seconds=0.3,
        )
        service = FoundryNarrativeService(settings, timeout=0.3)
        context = _create_mock_context(engine)

        start = time.perf_counter()
        with pytest.raises(RuntimeError) as exc_info:
            service(context)
        elapsed = time.perf_counter() - start

        service.close()
        assert "failed" in str(exc_info.value).lower()
        assert 0.2 <= elapsed <= 1.2, f"Expected timeout in ~0.3s, got {elapsed:.2f}s"
    finally:
        stop_server.set()
        t.join(timeout=1.0)
        server_sock.close()


def test_urllib_fallback_on_closed_port_raises_runtime_error(engine: MatchEngine) -> None:
    """When httpx client is None (fallback path), connection failure must also raise RuntimeError cleanly."""
    sock = socket.socket()
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    sock.close()

    settings = Settings(
        llm_provider="ollama",
        llm_base_url=f"http://127.0.0.1:{port}/v1",
        llm_timeout_seconds=0.3,
    )
    service = FoundryNarrativeService(settings, timeout=0.3)
    # Force urllib branch
    service.close()
    assert service._client is None

    context = _create_mock_context(engine)
    with pytest.raises(RuntimeError) as exc_info:
        service(context)

    assert "failed" in str(exc_info.value).lower()


def test_http_error_responses_raise_runtime_error(engine: MatchEngine) -> None:
    """HTTP 500 / 502 / 503 error responses from upstream LLM gateway must raise RuntimeError."""
    settings = Settings(llm_provider="ollama", llm_base_url="http://localhost:11434/v1")
    service = FoundryNarrativeService(settings)
    context = _create_mock_context(engine)

    for status_code in [500, 502, 503, 404]:
        with patch.object(service._client, "post") as mock_post:
            mock_resp = MagicMock()
            import httpx

            mock_resp.raise_for_status.side_effect = httpx.HTTPStatusError(
                f"HTTP {status_code}", request=MagicMock(), response=MagicMock(status_code=status_code)
            )
            mock_post.return_value = mock_resp

            with pytest.raises(RuntimeError) as exc_info:
                service(context)
            assert "failed" in str(exc_info.value).lower()

    service.close()


# ==============================================================================
# SECTION 2: Malformed JSON / Raw Text / Markdown Code Fences / Truncated JSON
# ==============================================================================


def test_markdown_code_fence_stripping_and_parsing(engine: MatchEngine) -> None:
    """LLM responses enclosed in ```json ... ``` markdown fences must be cleanly parsed."""
    settings = Settings(llm_provider="ollama", llm_base_url="http://localhost:11434/v1")
    service = FoundryNarrativeService(settings)
    context = _create_mock_context(engine)

    fenced_content = """```json
{
  "headline": {
    "en": "Arsenal press high",
    "es": "Arsenal presiona arriba",
    "fr": "Arsenal presse haut",
    "ja": "アーセナルが高いプレス",
    "ar": "آرسنال يضغط عالياً"
  },
  "tacticalExplanation": {
    "en": "Compact 4-4-2 block",
    "es": "Bloque compacto 4-4-2",
    "fr": "Bloc compact 4-4-2",
    "ja": "コンパクトな4-4-2ブロック",
    "ar": "كتلة مدمجة 4-4-2"
  }
}
```"""

    with patch.object(service, "_post") as mock_post:
        mock_post.return_value = {"choices": [{"message": {"content": fenced_content}}]}
        draft = service(context)

    service.close()
    assert draft.headline.en == "Arsenal press high"
    assert draft.headline.ja == "アーセナルが高いプレス"
    assert draft.tacticalExplanation.es == "Bloque compacto 4-4-2"


def test_markdown_code_fence_with_conversational_chatter(engine: MatchEngine) -> None:
    """Preamble and epilogue text outside markdown fences must be stripped cleanly."""
    settings = Settings(llm_provider="ollama", llm_base_url="http://localhost:11434/v1")
    service = FoundryNarrativeService(settings)
    context = _create_mock_context(engine)

    content = """Certainly! Here is the JSON commentary you requested for the match:
```json
{
  "headline": {"en": "Counter-attack underway"},
  "tacticalExplanation": {"en": "Direct ball behind defence"}
}
```
I hope this tactical insight helps!"""

    with patch.object(service, "_post") as mock_post:
        mock_post.return_value = {"choices": [{"message": {"content": content}}]}
        draft = service(context)

    service.close()
    assert draft.headline.en == "Counter-attack underway"
    assert draft.tacticalExplanation.en == "Direct ball behind defence"


def test_truncated_json_repair_cases(engine: MatchEngine) -> None:
    """Truncated JSON (cut off by token limit) must be repaired or fall back gracefully."""
    settings = Settings(llm_provider="ollama", llm_base_url="http://localhost:11434/v1")
    service = FoundryNarrativeService(settings)
    context = _create_mock_context(engine)

    # Case A: Truncated right after tacticalExplanation starts with string cut off
    truncated_a = (
        '{"headline": {"en": "City on the front foot"}, '
        '"tacticalExplanation": {"en": "High press forces turnover'
    )
    with patch.object(service, "_post") as mock_post:
        mock_post.return_value = {"choices": [{"message": {"content": truncated_a}}]}
        draft = service(context)
        assert draft.headline.en == "City on the front foot"
        assert len(draft.tacticalExplanation.en) > 0

    # Case B: Truncated mid-headline in second language
    truncated_b = (
        '{"headline": {"en": "Direct vertical ball", "es": "Balon vertical", "fr": "Ballo'
    )
    with patch.object(service, "_post") as mock_post:
        mock_post.return_value = {"choices": [{"message": {"content": truncated_b}}]}
        draft = service(context)
        assert draft.headline.en == "Direct vertical ball"
        assert draft.headline.es == "Balon vertical"
        # fr had 'Ballo', repaired string remains non-empty
        assert draft.headline.fr == "Ballo"

    # Case B2: Truncated right at opening quote for translation
    truncated_b2 = (
        '{"headline": {"en": "Direct vertical ball", "es": "Balon vertical", "fr": "'
    )
    with patch.object(service, "_post") as mock_post:
        mock_post.return_value = {"choices": [{"message": {"content": truncated_b2}}]}
        draft = service(context)
        assert draft.headline.en == "Direct vertical ball"
        assert draft.headline.es == "Balon vertical"
        # fr was repaired as empty string "", so it falls back to en
        assert draft.headline.fr == "Direct vertical ball"

    # Case C: Severely truncated missing closing braces
    truncated_c = '{"headline": {"en": "Breakaway chance"}'
    with patch.object(service, "_post") as mock_post:
        mock_post.return_value = {"choices": [{"message": {"content": truncated_c}}]}
        draft = service(context)
        assert draft.headline.en == "Breakaway chance"

    service.close()


def test_raw_unparseable_text_raises_clean_runtime_error(engine: MatchEngine) -> None:
    """Completely unparseable raw text (no JSON) must cleanly raise RuntimeError."""
    settings = Settings(llm_provider="ollama", llm_base_url="http://localhost:11434/v1")
    service = FoundryNarrativeService(settings)
    context = _create_mock_context(engine)

    raw_text = "I cannot fulfill this request as an AI assistant. Football is a sport."
    with patch.object(service, "_post") as mock_post:
        mock_post.return_value = {"choices": [{"message": {"content": raw_text}}]}
        with pytest.raises(RuntimeError) as exc_info:
            service(context)

    service.close()
    assert "failed" in str(exc_info.value).lower()


def test_empty_choices_or_non_dict_payload_raises_clean_runtime_error(engine: MatchEngine) -> None:
    """Empty choices list or unexpected payload structures must cleanly raise RuntimeError."""
    settings = Settings(llm_provider="ollama", llm_base_url="http://localhost:11434/v1")
    service = FoundryNarrativeService(settings)
    context = _create_mock_context(engine)

    # Empty choices
    with patch.object(service, "_post") as mock_post:
        mock_post.return_value = {"choices": []}
        with pytest.raises(RuntimeError) as exc_info:
            service(context)
        assert "failed" in str(exc_info.value).lower()

    # JSON is an array rather than object
    with patch.object(service, "_post") as mock_post:
        mock_post.return_value = {"choices": [{"message": {"content": "[\"not\", \"an\", \"object\"]"}}]}
        with pytest.raises(RuntimeError) as exc_info:
            service(context)
        assert "failed" in str(exc_info.value).lower()

    service.close()


# ==============================================================================
# SECTION 3: Missing or Empty Language Fields Fallback
# ==============================================================================


def test_missing_language_fields_fallback_to_english(engine: MatchEngine) -> None:
    """When non-English languages are omitted, they must fallback to the English translation."""
    settings = Settings(llm_provider="ollama", llm_base_url="http://localhost:11434/v1")
    service = FoundryNarrativeService(settings)
    context = _create_mock_context(engine)

    partial_json = json.dumps({
        "headline": {"en": "Sublime through-ball splits the defence"},
        "tacticalExplanation": {"en": "Pass difficulty rating peaks at 78."},
    })

    with patch.object(service, "_post") as mock_post:
        mock_post.return_value = {"choices": [{"message": {"content": partial_json}}]}
        draft = service(context)

    service.close()

    for lang in [BroadcastLanguage.EN, BroadcastLanguage.ES, BroadcastLanguage.FR, BroadcastLanguage.JA, BroadcastLanguage.AR]:
        val_hl = getattr(draft.headline, lang.value)
        val_exp = getattr(draft.tacticalExplanation, lang.value)
        assert val_hl == "Sublime through-ball splits the defence"
        assert val_exp == "Pass difficulty rating peaks at 78."


def test_empty_or_whitespace_language_fields_fallback_to_english(engine: MatchEngine) -> None:
    """When translations are empty string, whitespace, None, or wrong types, fallback to English."""
    settings = Settings(llm_provider="ollama", llm_base_url="http://localhost:11434/v1")
    service = FoundryNarrativeService(settings)
    context = _create_mock_context(engine)

    sparse_json = json.dumps({
        "headline": {
            "en": "Overlapping run down the flank",
            "es": "",            # empty string
            "fr": "   \n\t  ",   # whitespace only
            "ja": None,          # null
            "ar": 12345,         # non-string type
        },
        "tacticalExplanation": {
            "en": "Full-back creates a 2v1 overload",
            "es": None,
            "fr": "",
            "ja": "   ",
            "ar": {},
        },
    })

    with patch.object(service, "_post") as mock_post:
        mock_post.return_value = {"choices": [{"message": {"content": sparse_json}}]}
        draft = service(context)

    service.close()

    for lang in ["en", "es", "fr", "ja", "ar"]:
        assert getattr(draft.headline, lang) == "Overlapping run down the flank"
        assert getattr(draft.tacticalExplanation, lang) == "Full-back creates a 2v1 overload"


def test_missing_or_empty_english_falls_back_to_defaults(engine: MatchEngine) -> None:
    """When English is also empty or missing, fallback to sensible default tactical strings."""
    settings = Settings(llm_provider="ollama", llm_base_url="http://localhost:11434/v1")
    service = FoundryNarrativeService(settings)
    context = _create_mock_context(engine)

    empty_json = json.dumps({"headline": {}, "tacticalExplanation": {}})

    with patch.object(service, "_post") as mock_post:
        mock_post.return_value = {"choices": [{"message": {"content": empty_json}}]}
        draft = service(context)

    service.close()

    assert draft.headline.en == "Tactical development underway"
    assert draft.tacticalExplanation.en == "Analysis of match dynamics in progress"
    for lang in ["es", "fr", "ja", "ar"]:
        assert getattr(draft.headline, lang) == "Tactical development underway"
        assert getattr(draft.tacticalExplanation, lang) == "Analysis of match dynamics in progress"


def test_headline_and_explanation_as_plain_strings(engine: MatchEngine) -> None:
    """If LLM returns headline and explanation as simple strings instead of objects, handle cleanly."""
    settings = Settings(llm_provider="ollama", llm_base_url="http://localhost:11434/v1")
    service = FoundryNarrativeService(settings)
    context = _create_mock_context(engine)

    string_json = json.dumps({
        "headline": "Sustained pressure from Manchester City",
        "tacticalExplanation": "Deep low block resists wave after wave",
    })

    with patch.object(service, "_post") as mock_post:
        mock_post.return_value = {"choices": [{"message": {"content": string_json}}]}
        draft = service(context)

    service.close()

    assert draft.headline.en == "Sustained pressure from Manchester City"
    assert draft.headline.es == "Sustained pressure from Manchester City"
    assert draft.tacticalExplanation.en == "Deep low block resists wave after wave"


# ==============================================================================
# SECTION 4: URL Path Variations
# ==============================================================================


@pytest.mark.parametrize(
    ("input_base_url", "expected_url"),
    [
        ("http://localhost:11434", "http://localhost:11434/v1/chat/completions"),
        ("http://localhost:11434/", "http://localhost:11434/v1/chat/completions"),
        ("http://localhost:11434/v1", "http://localhost:11434/v1/chat/completions"),
        ("http://localhost:11434/v1/", "http://localhost:11434/v1/chat/completions"),
        ("http://localhost:11434/v1/chat/completions", "http://localhost:11434/v1/chat/completions"),
        ("http://localhost:11434/v1/chat/completions/", "http://localhost:11434/v1/chat/completions"),
        ("http://vllm-server:8000/v1", "http://vllm-server:8000/v1/chat/completions"),
        ("http://vllm-server:8000", "http://vllm-server:8000/v1/chat/completions"),
    ],
)
def test_ollama_and_openai_url_variations(engine: MatchEngine, input_base_url: str, expected_url: str) -> None:
    """Verify URL construction handles trailing slashes, /v1, and full endpoint paths."""
    settings = Settings(
        llm_provider="ollama",
        llm_base_url=input_base_url,
        llm_model="llama3.2",
    )
    service = FoundryNarrativeService(settings)
    context = _create_mock_context(engine)

    url, headers, body = service._resolve_request(context)
    service.close()

    assert url == expected_url
    assert body["model"] == "llama3.2"
    assert body["max_tokens"] == 250
    assert headers["Content-Type"] == "application/json"


def test_github_models_url_resolution(engine: MatchEngine) -> None:
    """Verify GitHub Models URL resolution with GITHUB_TOKEN."""
    settings = Settings(
        llm_provider="github",
        github_token="ghp_test_token_12345",
    )
    service = FoundryNarrativeService(settings)
    context = _create_mock_context(engine)

    url, headers, body = service._resolve_request(context)
    service.close()

    assert url == "https://models.github.ai/inference/chat/completions"
    assert headers["Authorization"] == "Bearer ghp_test_token_12345"
    assert body["model"] == "gpt-4o-mini"


def test_azure_foundry_url_resolution(engine: MatchEngine) -> None:
    """Verify Azure AI Foundry endpoint and deployment resolution."""
    settings = Settings(
        azure_ai_foundry_endpoint="https://my-foundry.openai.azure.com/",
        azure_ai_foundry_deployment="gpt-4o-prod",
        azure_openai_api_key="azure_key_secret",
        azure_openai_api_version="2024-10-21",
    )
    service = FoundryNarrativeService(settings)
    context = _create_mock_context(engine)

    url, headers, body = service._resolve_request(context)
    service.close()

    expected = "https://my-foundry.openai.azure.com/openai/deployments/gpt-4o-prod/chat/completions?api-version=2024-10-21"
    assert url == expected
    assert headers["api-key"] == "azure_key_secret"
    assert body["model"] == "gpt-4o-prod"


# ==============================================================================
# SECTION 5: Full Swarm & BroadcastNarrativeAgent Fallback Integration
# ==============================================================================


def test_broadcast_agent_handles_model_service_failure(engine: MatchEngine) -> None:
    """When model service fails, BroadcastNarrativeAgent must log warning and fall back cleanly."""
    settings = Settings(llm_provider="ollama", llm_base_url="http://127.0.0.1:59999/v1", llm_timeout_seconds=0.2)
    failing_service = FoundryNarrativeService(settings, timeout=0.2)
    agent = BroadcastNarrativeAgent(model_service=failing_service)

    context = _create_mock_context(engine)
    outcome = agent.run(context)

    failing_service.close()
    assert outcome.status == AgentStatus.FALLBACK
    # Stream written to blackboard must still contain valid multilingual narrative
    stream = context.view.read("multilingual_stream")
    assert stream is not None
    assert "headline" in stream
    assert "en" in stream["headline"]
    assert len(stream["headline"]["en"]) > 0


def test_swarm_execution_with_failing_llm_service(engine: MatchEngine) -> None:
    """Full 4-agent swarm run completes within budget even if LLM service port is dead."""
    settings = Settings(llm_provider="ollama", llm_base_url="http://127.0.0.1:59999/v1", llm_timeout_seconds=0.2)
    failing_service = FoundryNarrativeService(settings, timeout=0.2)

    swarm = AgentSwarm(model_service=failing_service)

    frame = engine.build_frame()
    start = time.perf_counter()
    result = swarm.run(frame, persona=ExperiencePersona.ANALYST)
    elapsed = time.perf_counter() - start

    failing_service.close()

    # All 4 traces present
    assert len(result.traces) == 4
    # Narrative agent recorded FALLBACK
    narr_trace = next(t for t in result.traces if t.label == "Broadcast Narrative")
    assert narr_trace.status == AgentStatus.FALLBACK

    # Swarm produced complete narrative event
    assert result.narrative is not None
    assert len(result.narrative.headline.en) > 0
    assert len(result.narrative.headline.es) > 0

    # Total elapsed should easily stay bounded under deadline budget
    assert elapsed < 1.0, f"Swarm with dead LLM service took {elapsed:.2f}s"


# ==============================================================================
# SECTION 6: DNS Failover & Azure Endpoint Retry
# ==============================================================================


def test_github_models_dns_failover(engine: MatchEngine) -> None:
    """If models.inference.ai.azure.com fails with ConnectError, failover to models.github.ai."""
    settings = Settings(
        llm_provider="github",
        llm_base_url="https://models.inference.ai.azure.com",
        github_token="ghp_test_token",
    )
    service = FoundryNarrativeService(settings)
    context = _create_mock_context(engine)

    import httpx

    call_urls: list[str] = []

    def mock_post(url: str, **kwargs: Any) -> Any:
        call_urls.append(url)
        if "models.inference.ai.azure.com" in url:
            raise httpx.ConnectError("Simulated DNS resolution failure for legacy URL", request=MagicMock())
        # Fallback succeeds
        resp = MagicMock()
        resp.raise_for_status.return_value = None
        resp.json.return_value = {
            "choices": [{
                "message": {
                    "content": json.dumps({
                        "headline": {"en": "Failover success"},
                        "tacticalExplanation": {"en": "Fallback endpoint responded"},
                    })
                }
            }]
        }
        return resp

    with patch.object(service._client, "post", side_effect=mock_post):
        draft = service(context)

    service.close()
    assert draft.headline.en == "Failover success"
    assert "https://models.inference.ai.azure.com/chat/completions" in call_urls[0]
    assert "https://models.github.ai/inference/chat/completions" in call_urls[1]


# ==============================================================================
# SECTION 7: Unconfigured Service & Defensive Invariants
# ==============================================================================


def test_unconfigured_service_raises_clean_runtime_error(engine: MatchEngine) -> None:
    """When no LLM credentials or endpoints are set, calling service raises clean RuntimeError."""
    empty_settings = Settings()
    # Ensure zero LLM settings
    empty_settings.llm_provider = None
    empty_settings.llm_base_url = None
    empty_settings.llm_api_key = None
    empty_settings.github_token = None
    empty_settings.azure_ai_foundry_endpoint = None

    service = FoundryNarrativeService(empty_settings)
    assert not service.enabled
    context = _create_mock_context(engine)

    with pytest.raises(RuntimeError) as exc_info:
        service(context)

    service.close()
    assert "not configured" in str(exc_info.value).lower()


def test_service_with_none_frame_in_context() -> None:
    """Service must handle AgentContext with frame=None defensively without AttributeError."""
    settings = Settings(llm_provider="ollama", llm_base_url="http://localhost:11434/v1")
    service = FoundryNarrativeService(settings)
    context = AgentContext(frame=None, view=BlackboardView(Blackboard()), persona=ExperiencePersona.ANALYST)

    with patch.object(service, "_post") as mock_post:
        mock_post.return_value = {
            "choices": [{
                "message": {
                    "content": json.dumps({
                        "headline": {"en": "Simulation warming up"},
                        "tacticalExplanation": {"en": "Pre-match preparation"},
                    })
                }
            }]
        }
        draft = service(context)

    service.close()
    assert draft.headline.en == "Simulation warming up"
    assert draft.matchClock == "00:00"
    assert draft.id == "narr-0"


def test_multilingual_unicode_and_emoji_handling(engine: MatchEngine) -> None:
    """Multilingual commentary with non-ASCII characters, RTL Arabic, and emoji must pass unchanged."""
    settings = Settings(llm_provider="ollama", llm_base_url="http://localhost:11434/v1")
    service = FoundryNarrativeService(settings)
    context = _create_mock_context(engine)

    payload = {
        "headline": {
            "en": "Goal! Sensational strike into the top corner! ⚽🔥",
            "es": "¡Golazo espectacular por toda la escuadra! ⚽🔥",
            "fr": "But somptueux dans la lucarne opposée ! ⚽🔥",
            "ja": "素晴らしいゴール！右上隅への衝撃的一撃！⚽🔥",
            "ar": "هدف رائع لا يصد ولا يرد في الزاوية التسعين! ⚽🔥",
        },
        "tacticalExplanation": {
            "en": "xG of 0.04 - low probability screamer.",
            "es": "xG de 0.04 - disparo de baja probabilidad.",
            "fr": "xG de 0.04 - tir lointain à faible probabilité.",
            "ja": "xG 0.04 - 低確率の長距離シュート。",
            "ar": "xG 0.04 - تسديدة بعيدة المدى ذات احتمالية منخفضة.",
        },
    }

    with patch.object(service, "_post") as mock_post:
        mock_post.return_value = {"choices": [{"message": {"content": json.dumps(payload)}}]}
        draft = service(context)

    service.close()
    assert "⚽🔥" in draft.headline.en
    assert "¡Golazo" in draft.headline.es
    assert "lucarne" in draft.headline.fr
    assert "衝撃的一撃" in draft.headline.ja
    assert "الزاوية التسعين" in draft.headline.ar


def test_azure_capabilities_invariants_across_all_permutations() -> None:
    """azure_capabilities() must always return EXACTLY the 4 required keys regardless of config."""
    required_keys = {"foundry", "eventHubs", "cosmos", "mcp"}

    # Permutation 1: Pure default
    s1 = Settings()
    assert set(s1.azure_capabilities().keys()) == required_keys

    # Permutation 2: Ollama local
    s2 = Settings(llm_provider="ollama", llm_base_url="http://localhost:11434/v1")
    assert set(s2.azure_capabilities().keys()) == required_keys
    assert s2.azure_capabilities()["foundry"] is True

    # Permutation 3: GitHub Models
    s3 = Settings(github_token="ghp_dummy")
    assert set(s3.azure_capabilities().keys()) == required_keys
    assert s3.azure_capabilities()["foundry"] is True

    # Permutation 4: Azure AI Foundry
    s4 = Settings(
        azure_ai_foundry_endpoint="https://foundry.openai.azure.com",
        azure_ai_foundry_deployment="gpt-4o",
        azure_openai_api_key="secret",
    )
    assert set(s4.azure_capabilities().keys()) == required_keys
    assert s4.azure_capabilities()["foundry"] is True

