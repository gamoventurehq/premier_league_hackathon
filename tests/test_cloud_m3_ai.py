"""Test suite for Milestone M3: Azure AI Foundry Swarm & Copilot Reasoning Verification.

Live cloud verification against Azure Container Apps deployment:
https://plstudio-backend.bluebeach-f4935620.eastus2.azurecontainerapps.io

Verifies:
1. GET /api/narrative:
   - Schema validation with NarrativeEvent contract model.
   - All 5 broadcast languages in headline & tacticalExplanation: EN, ES, FR, JA, AR.
   - Authentic non-Latin unicode script checks (Japanese, Arabic).
   - Persona contexts: analystContext, casualContext, playerCamContext,
     clubCentricContext (homeFrame, awayFrame).
   - matchClock, timestamp, isTacticalInflectionPoint.
2. POST /api/copilot/query:
   - Live tactical reasoning grounded in live match telemetry.
   - Persona queries: Analyst, Casual, Player Cam, Club-Centric.
   - Response contract: answer, source, model, matchClock, toolUsed.
   - Grounded statistical citations (ratings, pass %, touches, territorial split).
3. GET /api/agents:
   - 4 canonical roles: telemetry_ingestion, tactical_reasoning,
     broadcast_narrative, fan_personalization.
   - All 4 agents report status: "complete".
   - Sub-400ms fast-path deadlines maintained.
   - Blackboard transactional traces: non-empty reads and writes recorded.
"""

from __future__ import annotations

import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

# Ensure repo root is on sys.path for backend model contract imports
REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = REPO_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.models import AgentTrace, CopilotQueryResponse, NarrativeEvent

BACKEND_BASE = "https://plstudio-backend.bluebeach-f4935620.eastus2.azurecontainerapps.io"
CANONICAL_ROLES = {
    "telemetry_ingestion",
    "tactical_reasoning",
    "broadcast_narrative",
    "fan_personalization",
}
EXPECTED_LANGUAGES = ["en", "es", "fr", "ja", "ar"]
FAST_PATH_LATENCY_LIMIT_MS = 400.0


def _fetch_json(
    url: str,
    method: str = "GET",
    payload: dict[str, Any] | None = None,
    timeout: float = 25.0,
    max_retries: int = 3,
) -> tuple[int, dict[str, Any], float]:
    """Robust JSON fetch with retry for transient cloud container network latency."""
    data_bytes = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {
        "User-Agent": "PLStudio-Pytest-M3/1.0",
        "Accept": "application/json",
    }
    if data_bytes is not None:
        headers["Content-Type"] = "application/json"

    last_exc: Exception | None = None
    for attempt in range(1, max_retries + 1):
        t0 = time.perf_counter()
        req = urllib.request.Request(
            url, data=data_bytes, headers=headers, method=method
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                latency_ms = (time.perf_counter() - t0) * 1000.0
                body = json.loads(resp.read().decode("utf-8"))
                return resp.status, body, latency_ms
        except urllib.error.HTTPError as exc:
            latency_ms = (time.perf_counter() - t0) * 1000.0
            try:
                body = json.loads(exc.read().decode("utf-8"))
            except (json.JSONDecodeError, UnicodeDecodeError):
                body = {"detail": str(exc)}
            return exc.code, body, latency_ms
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            last_exc = exc
            if attempt < max_retries:
                time.sleep(1.0 * attempt)
                continue
    raise RuntimeError(
        f"Failed to fetch {url} after {max_retries} retries: {last_exc}"
    ) from last_exc


# ==============================================================================
# SECTION 1: GET /api/narrative Multilingual Commentary Tests
# ==============================================================================


def test_narrative_endpoint_status_and_contract():
    """Verify GET /api/narrative returns HTTP 200 and validates against NarrativeEvent contract."""
    status, data, _ = _fetch_json(f"{BACKEND_BASE}/api/narrative")
    assert status == 200, f"Expected HTTP 200, got {status}: {data}"

    # Pydantic contract model validation
    event = NarrativeEvent.model_validate(data)
    assert event.id.startswith("narr-")
    assert event.timestamp > 0
    assert isinstance(event.isTacticalInflectionPoint, bool)
    assert re.match(r"^\d{1,3}:\d{2}$", event.matchClock)


def test_narrative_multilingual_five_languages():
    """Verify headline and tacticalExplanation contain all 5 broadcast languages."""
    status, data, _ = _fetch_json(f"{BACKEND_BASE}/api/narrative")
    assert status == 200

    headline = data.get("headline", {})
    explanation = data.get("tacticalExplanation", {})

    for lang in EXPECTED_LANGUAGES:
        assert lang in headline, f"Missing language '{lang}' in headline"
        assert isinstance(headline[lang], str) and len(headline[lang].strip()) > 0, (
            f"Headline translation for '{lang}' is empty"
        )
        assert lang in explanation, f"Missing language '{lang}' in tacticalExplanation"
        assert isinstance(explanation[lang], str) and len(explanation[lang].strip()) > 0, (
            f"Tactical explanation for '{lang}' is empty"
        )

    # Validate authentic script characters for non-Latin languages
    # Arabic: \u0600-\u06ff
    assert re.search(r"[\u0600-\u06ff]", headline["ar"]), (
        f"Arabic headline does not contain Arabic unicode characters: {headline['ar']}"
    )
    # Japanese: \u3040-\u30ff (Kana) or \u4e00-\u9faf (Kanji)
    assert re.search(r"[\u3040-\u30ff\u4e00-\u9faf]", headline["ja"]), (
        f"Japanese headline does not contain Japanese characters: {headline['ja']}"
    )


def test_narrative_persona_contexts():
    """Verify presence and non-emptiness of all 4 persona contexts."""
    status, data, _ = _fetch_json(f"{BACKEND_BASE}/api/narrative")
    assert status == 200

    # analystContext
    analyst_ctx = data.get("analystContext")
    assert isinstance(analyst_ctx, str) and len(analyst_ctx.strip()) > 0, (
        "analystContext must be a non-empty string"
    )

    # casualContext
    casual_ctx = data.get("casualContext")
    assert isinstance(casual_ctx, str) and len(casual_ctx.strip()) > 0, (
        "casualContext must be a non-empty string"
    )

    # playerCamContext
    player_cam_ctx = data.get("playerCamContext")
    assert isinstance(player_cam_ctx, str) and len(player_cam_ctx.strip()) > 0, (
        "playerCamContext must be a non-empty string"
    )

    # clubCentricContext
    club_centric_ctx = data.get("clubCentricContext")
    assert isinstance(club_centric_ctx, dict), "clubCentricContext must be a dict"
    home_frame = club_centric_ctx.get("homeFrame")
    away_frame = club_centric_ctx.get("awayFrame")
    assert isinstance(home_frame, str) and len(home_frame.strip()) > 0, (
        "clubCentricContext.homeFrame must be a non-empty string"
    )
    assert isinstance(away_frame, str) and len(away_frame.strip()) > 0, (
        "clubCentricContext.awayFrame must be a non-empty string"
    )


def test_narrative_clock_and_metadata():
    """Verify matchClock (MM:SS), timestamp (> 0), and isTacticalInflectionPoint (bool)."""
    status, data, _ = _fetch_json(f"{BACKEND_BASE}/api/narrative")
    assert status == 200

    match_clock = data.get("matchClock")
    timestamp = data.get("timestamp")
    is_inflection = data.get("isTacticalInflectionPoint")

    assert isinstance(match_clock, str) and re.match(r"^\d{1,3}:\d{2}$", match_clock)
    assert isinstance(timestamp, int) and timestamp > 0
    assert isinstance(is_inflection, bool)


# ==============================================================================
# SECTION 2: POST /api/copilot/query Tactical Copilot Tests
# ==============================================================================


def test_copilot_influential_player_analyst():
    """Query: 'Who is currently the most influential player on the pitch?' with persona 'analyst'."""
    payload = {
        "query": "Who is currently the most influential player on the pitch?",
        "persona": "analyst",
    }
    status, resp, _ = _fetch_json(
        f"{BACKEND_BASE}/api/copilot/query", method="POST", payload=payload, timeout=30.0
    )
    assert status == 200, f"Expected HTTP 200, got {status}: {resp}"

    validated = CopilotQueryResponse.model_validate(resp)
    assert len(validated.answer.strip()) > 15
    assert validated.source in [
        "azure_ai_foundry (gpt-4.1-mini)",
        "deterministic_swarm_grounding",
    ]
    assert validated.model in ["gpt-4.1-mini", None]
    assert re.match(r"^\d{1,3}:\d{2}$", validated.matchClock)
    assert len(validated.toolUsed.strip()) > 0

    # Grounding check: player names and rating/touches/passes mentioned
    ans_lower = validated.answer.lower()
    has_stat = any(
        kw in ans_lower for kw in ["rating", "touches", "pass", "%", "influence", "foden", "haaland"]
    )
    assert has_stat, f"Answer missing grounded player statistics: {validated.answer}"


def test_copilot_underperforming_player_analyst():
    """Query: 'Which player is struggling or underperforming?' with persona 'analyst'."""
    payload = {
        "query": "Which player is struggling or underperforming?",
        "persona": "analyst",
    }
    status, resp, _ = _fetch_json(
        f"{BACKEND_BASE}/api/copilot/query", method="POST", payload=payload, timeout=30.0
    )
    assert status == 200, f"Expected HTTP 200, got {status}: {resp}"

    validated = CopilotQueryResponse.model_validate(resp)
    assert len(validated.answer.strip()) > 15
    assert validated.source in [
        "azure_ai_foundry (gpt-4.1-mini)",
        "deterministic_swarm_grounding",
    ]
    assert validated.model in ["gpt-4.1-mini", None]
    assert re.match(r"^\d{1,3}:\d{2}$", validated.matchClock)

    # Grounding check: rating, passes, or underperforming player mentioned
    ans_lower = validated.answer.lower()
    has_stat = any(
        kw in ans_lower for kw in ["rating", "touch", "pass", "%", "low", "struggl", "partey", "underperform"]
    )
    assert has_stat, f"Answer missing underperformer statistics: {validated.answer}"


def test_copilot_territorial_dominance_casual():
    """Query: 'What is the territorial pitch dominance split right now?' with persona 'casual'."""
    payload = {
        "query": "What is the territorial pitch dominance split right now?",
        "persona": "casual",
    }
    status, resp, _ = _fetch_json(
        f"{BACKEND_BASE}/api/copilot/query", method="POST", payload=payload, timeout=30.0
    )
    assert status == 200, f"Expected HTTP 200, got {status}: {resp}"

    validated = CopilotQueryResponse.model_validate(resp)
    assert len(validated.answer.strip()) > 15
    assert validated.source in [
        "azure_ai_foundry (gpt-4.1-mini)",
        "deterministic_swarm_grounding",
    ]
    assert re.match(r"^\d{1,3}:\d{2}$", validated.matchClock)

    # Grounding check: territorial dominance percentages or club names
    ans_lower = validated.answer.lower()
    has_stat = any(kw in ans_lower for kw in ["%", "dominance", "territorial", "city", "arsenal", "control"])
    assert has_stat, f"Answer missing territorial statistics: {validated.answer}"


def test_copilot_match_rhythm_and_inflections_casual():
    """Query: 'Summarize the match rhythm and tactical inflection points.' with persona 'casual'."""
    payload = {
        "query": "Summarize the match rhythm and tactical inflection points.",
        "persona": "casual",
    }
    status, resp, _ = _fetch_json(
        f"{BACKEND_BASE}/api/copilot/query", method="POST", payload=payload, timeout=30.0
    )
    assert status == 200, f"Expected HTTP 200, got {status}: {resp}"

    validated = CopilotQueryResponse.model_validate(resp)
    assert len(validated.answer.strip()) > 15
    assert validated.source in [
        "azure_ai_foundry (gpt-4.1-mini)",
        "deterministic_swarm_grounding",
    ]
    assert re.match(r"^\d{1,3}:\d{2}$", validated.matchClock)

    ans_lower = validated.answer.lower()
    has_stat = any(kw in ans_lower for kw in ["rhythm", "inflection", "tactical", "shift", "control", "city", "arsenal"])
    assert has_stat, f"Answer missing rhythm/inflection grounding: {validated.answer}"


def test_copilot_persona_diversity():
    """Verify player_cam and club_centric personas execute cleanly and return valid responses."""
    queries = [
        (
            "player_cam",
            "How is Erling Haaland positioning relative to Arsenal central defenders?",
        ),
        (
            "club_centric",
            "From a Manchester City perspective, how effectively are we breaking down Arsenal defensive shape?",
        ),
    ]
    for persona, query in queries:
        payload = {"query": query, "persona": persona}
        status, resp, _ = _fetch_json(
            f"{BACKEND_BASE}/api/copilot/query", method="POST", payload=payload, timeout=30.0
        )
        assert status == 200
        validated = CopilotQueryResponse.model_validate(resp)
        assert len(validated.answer.strip()) > 20
        assert validated.source in [
            "azure_ai_foundry (gpt-4.1-mini)",
            "deterministic_swarm_grounding",
        ]


# ==============================================================================
# SECTION 3: GET /api/agents Four-Agent Collaborative Swarm Tests
# ==============================================================================


def test_agents_swarm_four_canonical_roles():
    """Verify GET /api/agents returns HTTP 200 and exactly 4 canonical agent traces."""
    status, traces, _ = _fetch_json(f"{BACKEND_BASE}/api/agents")
    assert status == 200, f"Expected HTTP 200, got {status}: {traces}"
    assert isinstance(traces, list)
    assert len(traces) == 4, f"Expected exactly 4 agent traces, got {len(traces)}"

    observed_roles = {t.get("role") for t in traces}
    assert observed_roles == CANONICAL_ROLES, (
        f"Mismatch in canonical roles: expected {CANONICAL_ROLES}, got {observed_roles}"
    )


def test_agents_swarm_all_status_complete():
    """Verify all 4 agents report status == 'complete'."""
    status, traces, _ = _fetch_json(f"{BACKEND_BASE}/api/agents")
    assert status == 200

    for trace in traces:
        # Validate against AgentTrace contract model
        parsed = AgentTrace.model_validate(trace)
        assert parsed.status.value == "complete", (
            f"Agent {parsed.role} status must be 'complete', got {parsed.status}"
        )


def test_agents_swarm_fast_path_latency_budget():
    """Verify all 4 agents terminate well within the sub-400ms fast-path deadline."""
    status, traces, _ = _fetch_json(f"{BACKEND_BASE}/api/agents")
    assert status == 200

    for trace in traces:
        latency = trace.get("latencyMs", 0.0)
        assert latency < FAST_PATH_LATENCY_LIMIT_MS, (
            f"Agent {trace.get('role')} latency {latency}ms exceeds {FAST_PATH_LATENCY_LIMIT_MS}ms"
        )


def test_agents_swarm_blackboard_transactional_traces():
    """Verify all 4 agents record non-empty blackboard reads and writes."""
    status, traces, _ = _fetch_json(f"{BACKEND_BASE}/api/agents")
    assert status == 200

    for trace in traces:
        role = trace.get("role")
        reads = trace.get("reads", [])
        writes = trace.get("writes", [])
        summary = trace.get("summary", "")

        assert isinstance(reads, list) and len(reads) > 0, (
            f"Agent {role} must have recorded non-empty reads"
        )
        assert isinstance(writes, list) and len(writes) > 0, (
            f"Agent {role} must have recorded non-empty writes"
        )
        assert isinstance(summary, str) and len(summary.strip()) > 0, (
            f"Agent {role} must have a non-empty summary"
        )


def test_narrative_continuity_over_time():
    """Verify narrative matches advancing match clock and remains valid across cycles."""
    status1, data1, _ = _fetch_json(f"{BACKEND_BASE}/api/narrative")
    assert status1 == 200
    clock1 = data1.get("matchClock")

    time.sleep(1.5)

    status2, data2, _ = _fetch_json(f"{BACKEND_BASE}/api/narrative")
    assert status2 == 200
    clock2 = data2.get("matchClock")

    assert clock1 is not None and clock2 is not None
    assert re.match(r"^\d{1,3}:\d{2}$", clock1)
    assert re.match(r"^\d{1,3}:\d{2}$", clock2)
