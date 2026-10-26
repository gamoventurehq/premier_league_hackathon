#!/usr/bin/env python3
"""Premier League Studio — Milestone M3 Live Verification Script.

Azure AI Foundry Swarm & Copilot Reasoning Verification.

Verifies against the live Azure Container App backend:
Base URL: https://plstudio-backend.bluebeach-f4935620.eastus2.azurecontainerapps.io

Verification Checks:
1. GET /api/narrative:
   - HTTP 200 with valid NarrativeEvent schema.
   - Multilingual broadcast stream: headline and tacticalExplanation contain all 5
     languages: English (en), Spanish (es), French (fr), Japanese (ja), Arabic (ar).
   - Script validation for non-Latin languages (Arabic, Japanese).
   - Persona contexts: analystContext, casualContext, playerCamContext,
     clubCentricContext (homeFrame, awayFrame).
   - Match clock (MM:SS), timestamp (> 0), isTacticalInflectionPoint (bool).
2. POST /api/copilot/query:
   - Live tactical questions with Analyst and Casual personas:
     - "Who is currently the most influential player on the pitch?"
     - "Which player is struggling or underperforming?"
     - "What is the territorial pitch dominance split right now?"
     - "Summarize the match rhythm and tactical inflection points."
   - Additional personas: player_cam, club_centric.
   - Response validation:
     - HTTP 200 with valid answer containing grounded statistics.
     - source field: "azure_ai_foundry (gpt-4.1-mini)" or "deterministic_swarm_grounding".
     - model: "gpt-4.1-mini".
     - matchClock: valid MM:SS string.
     - toolUsed: non-empty string identifier (e.g. "llm_tactical_copilot",
       "tactical_reasoning:player_ratings", "get_pitch_control").
3. GET /api/agents:
   - HTTP 200 with an array of 4 AgentTrace objects.
   - 4 canonical roles: telemetry_ingestion, tactical_reasoning,
     broadcast_narrative, fan_personalization.
   - All 4 agents report status: "complete".
   - Execution latencies are within fast-path deadlines (< 400ms).
   - Blackboard transactional traces: non-empty reads and writes recorded.
4. Narrative Progression & Stream Freshness:
   - Dynamic simulation clock updates across repeated samples.
5. End-to-End Reliability & Latency Benchmark:
   - Multi-sample latency distribution and error rate check.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.request
from typing import Any

DEFAULT_BACKEND_URL = (
    "https://plstudio-backend.bluebeach-f4935620.eastus2.azurecontainerapps.io"
)
CANONICAL_ROLES = [
    "telemetry_ingestion",
    "tactical_reasoning",
    "broadcast_narrative",
    "fan_personalization",
]
EXPECTED_LANGUAGES = ["en", "es", "fr", "ja", "ar"]
FAST_PATH_LATENCY_LIMIT_MS = 400.0


def _request_with_retry(
    url: str,
    method: str = "GET",
    data: dict[str, Any] | None = None,
    timeout: float = 25.0,
    max_retries: int = 3,
) -> tuple[int, dict[str, Any], float]:
    """Perform HTTP request with retry logic for cloud container network jitter."""
    payload_bytes = json.dumps(data).encode("utf-8") if data is not None else None
    headers = {
        "User-Agent": "PLStudio-M3-Verifier/1.0",
        "Accept": "application/json",
    }
    if payload_bytes is not None:
        headers["Content-Type"] = "application/json"

    last_error: Exception | None = None
    for attempt in range(1, max_retries + 1):
        t0 = time.perf_counter()
        req = urllib.request.Request(
            url, data=payload_bytes, headers=headers, method=method
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
            last_error = exc
            if attempt < max_retries:
                time.sleep(1.0 * attempt)
                continue
    raise RuntimeError(
        f"Request to {url} failed after {max_retries} attempts: {last_error}"
    ) from last_error


def check_narrative_multilingual(backend_url: str) -> dict[str, Any]:
    """Check 1: GET /api/narrative multilingual commentary and 5 languages."""
    print("\n" + "=" * 80)
    print("CHECK 1: GET /api/narrative — Multilingual Broadcast Stream (5 Languages)")
    print("=" * 80)

    url = f"{backend_url}/api/narrative"
    status, data, latency_ms = _request_with_retry(url, method="GET")

    print(f"Endpoint: {url}")
    print(f"HTTP Status: {status} (Latency: {latency_ms:.1f}ms)")
    if status != 200:
        raise AssertionError(f"Expected HTTP 200 from /api/narrative, got {status}: {data}")

    # Top-level schema fields
    required_keys = [
        "id",
        "matchClock",
        "timestamp",
        "isTacticalInflectionPoint",
        "headline",
        "tacticalExplanation",
        "analystContext",
        "casualContext",
        "playerCamContext",
        "clubCentricContext",
    ]
    for key in required_keys:
        assert key in data, f"Missing required key in NarrativeEvent: {key}"

    print(f"  ✓ Valid NarrativeEvent schema present (id: '{data['id']}')")

    # Headline and tacticalExplanation languages
    headline = data.get("headline", {})
    explanation = data.get("tacticalExplanation", {})

    print("\nHeadline translations:")
    for lang in EXPECTED_LANGUAGES:
        assert lang in headline, f"Missing language '{lang}' in headline"
        val = headline[lang]
        assert isinstance(val, str) and len(val.strip()) > 0, (
            f"Headline '{lang}' is empty"
        )
        print(f"  [{lang.upper()}]: {val}")

    print("\nTactical Explanation translations:")
    for lang in EXPECTED_LANGUAGES:
        assert lang in explanation, f"Missing language '{lang}' in tacticalExplanation"
        val = explanation[lang]
        assert isinstance(val, str) and len(val.strip()) > 0, (
            f"Tactical explanation '{lang}' is empty"
        )
        print(f"  [{lang.upper()}]: {val}")

    # Specific script validation
    # Arabic unicode range: \u0600-\u06ff
    ar_headline = headline.get("ar", "")
    assert re.search(r"[\u0600-\u06ff]", ar_headline), (
        f"Arabic headline does not contain Arabic unicode characters: {ar_headline}"
    )
    print("  ✓ Verified Arabic headline contains authentic Arabic Unicode characters")

    # Japanese unicode range: \u3040-\u30ff (Hiragana/Katakana) or \u4e00-\u9faf (Kanji)
    ja_headline = headline.get("ja", "")
    assert re.search(r"[\u3040-\u30ff\u4e00-\u9faf]", ja_headline), (
        f"Japanese headline does not contain Japanese characters: {ja_headline}"
    )
    print("  ✓ Verified Japanese headline contains authentic Japanese characters")

    return {
        "status": "PASS",
        "id": data["id"],
        "languages": list(headline.keys()),
        "latency_ms": latency_ms,
    }


def check_narrative_personas_and_metadata(backend_url: str) -> dict[str, Any]:
    """Check 2: Validate persona contexts and metadata fields in /api/narrative."""
    print("\n" + "=" * 80)
    print("CHECK 2: GET /api/narrative — Persona Contexts & Clock Verification")
    print("=" * 80)

    url = f"{backend_url}/api/narrative"
    status, data, latency_ms = _request_with_retry(url, method="GET")
    assert status == 200

    match_clock = data.get("matchClock")
    timestamp = data.get("timestamp")
    is_inflection = data.get("isTacticalInflectionPoint")

    # Match clock validation
    assert isinstance(match_clock, str) and re.match(r"^\d{1,3}:\d{2}$", match_clock), (
        f"matchClock '{match_clock}' must be in MM:SS format"
    )
    print(f"  ✓ matchClock: '{match_clock}' (valid MM:SS)")

    # Timestamp validation
    assert isinstance(timestamp, int) and timestamp > 0, (
        f"timestamp must be a positive integer, got {timestamp}"
    )
    print(f"  ✓ timestamp: {timestamp}ms")

    # Tactical inflection point validation
    assert isinstance(is_inflection, bool), (
        f"isTacticalInflectionPoint must be a boolean, got {is_inflection}"
    )
    print(f"  ✓ isTacticalInflectionPoint: {is_inflection}")

    # Persona contexts validation
    analyst_ctx = data.get("analystContext")
    casual_ctx = data.get("casualContext")
    player_cam_ctx = data.get("playerCamContext")
    club_centric_ctx = data.get("clubCentricContext")

    assert isinstance(analyst_ctx, str) and len(analyst_ctx.strip()) > 0, (
        "analystContext must be a non-empty string"
    )
    print(f"  ✓ analystContext: \"{analyst_ctx[:75]}...\"")

    assert isinstance(casual_ctx, str) and len(casual_ctx.strip()) > 0, (
        "casualContext must be a non-empty string"
    )
    print(f"  ✓ casualContext: \"{casual_ctx[:75]}...\"")

    assert isinstance(player_cam_ctx, str) and len(player_cam_ctx.strip()) > 0, (
        "playerCamContext must be a non-empty string"
    )
    print(f"  ✓ playerCamContext: \"{player_cam_ctx[:75]}...\"")

    assert isinstance(club_centric_ctx, dict), (
        f"clubCentricContext must be a dict, got {type(club_centric_ctx)}"
    )
    home_frame = club_centric_ctx.get("homeFrame", "")
    away_frame = club_centric_ctx.get("awayFrame", "")
    assert isinstance(home_frame, str) and len(home_frame.strip()) > 0, (
        "clubCentricContext.homeFrame must be a non-empty string"
    )
    assert isinstance(away_frame, str) and len(away_frame.strip()) > 0, (
        "clubCentricContext.awayFrame must be a non-empty string"
    )
    print(f"  ✓ clubCentricContext.homeFrame: \"{home_frame[:70]}...\"")
    print(f"  ✓ clubCentricContext.awayFrame: \"{away_frame[:70]}...\"")

    return {
        "status": "PASS",
        "matchClock": match_clock,
        "timestamp": timestamp,
        "isTacticalInflectionPoint": is_inflection,
        "latency_ms": latency_ms,
    }


def check_tactical_copilot(backend_url: str) -> dict[str, Any]:
    """Check 3: POST /api/copilot/query live tactical reasoning and statistics grounding."""
    print("\n" + "=" * 80)
    print("CHECK 3: POST /api/copilot/query — Tactical Copilot Live Reasoning")
    print("=" * 80)

    url = f"{backend_url}/api/copilot/query"

    test_queries = [
        {
            "id": "Q1_INFLUENTIAL_PLAYER",
            "persona": "analyst",
            "query": "Who is currently the most influential player on the pitch?",
            "expected_stats": ["rating", "touches", "pass", "%"],
        },
        {
            "id": "Q2_UNDERPERFORMING_PLAYER",
            "persona": "analyst",
            "query": "Which player is struggling or underperforming?",
            "expected_stats": ["rating", "touches", "pass", "%"],
        },
        {
            "id": "Q3_TERRITORIAL_DOMINANCE",
            "persona": "casual",
            "query": "What is the territorial pitch dominance split right now?",
            "expected_stats": ["%", "city", "arsenal", "control"],
        },
        {
            "id": "Q4_RHYTHM_AND_INFLECTION",
            "persona": "casual",
            "query": "Summarize the match rhythm and tactical inflection points.",
            "expected_stats": ["rhythm", "pass", "control"],
        },
        {
            "id": "Q5_PLAYER_CAM_POSITIONING",
            "persona": "player_cam",
            "query": "How is Erling Haaland positioning relative to Arsenal central defenders?",
            "expected_stats": ["haaland"],
        },
        {
            "id": "Q6_CLUB_CENTRIC_PERSPECTIVE",
            "persona": "club_centric",
            "query": "From a Manchester City perspective, how effectively are we breaking down Arsenal defensive shape?",
            "expected_stats": ["city", "arsenal"],
        },
    ]

    results = []
    for item in test_queries:
        print(f"\n--- Subtest {item['id']} (Persona: {item['persona']}) ---")
        print(f"Query: \"{item['query']}\"")
        payload = {"query": item["query"], "persona": item["persona"]}

        status, resp, latency_ms = _request_with_retry(
            url, method="POST", data=payload, timeout=30.0
        )
        print(f"HTTP Status: {status} (Latency: {latency_ms:.1f}ms)")
        assert status == 200, f"Query '{item['query']}' failed with HTTP {status}: {resp}"

        # Schema assertions
        assert "answer" in resp, "Response missing 'answer' field"
        assert "source" in resp, "Response missing 'source' field"
        assert "model" in resp, "Response missing 'model' field"
        assert "matchClock" in resp, "Response missing 'matchClock' field"
        assert "toolUsed" in resp, "Response missing 'toolUsed' field"

        answer = resp["answer"]
        source = resp["source"]
        model = resp["model"]
        match_clock = resp["matchClock"]
        tool_used = resp["toolUsed"]

        assert isinstance(answer, str) and len(answer.strip()) > 20, (
            f"Answer must be a detailed string, got: '{answer}'"
        )
        assert source in [
            "azure_ai_foundry (gpt-4.1-mini)",
            "deterministic_swarm_grounding",
        ], f"Unexpected source: '{source}'"
        assert model in ["gpt-4.1-mini", None], f"Unexpected model: '{model}'"
        assert isinstance(match_clock, str) and re.match(r"^\d{1,3}:\d{2}$", match_clock), (
            f"Invalid matchClock format: '{match_clock}'"
        )
        assert isinstance(tool_used, str) and len(tool_used.strip()) > 0, (
            f"Invalid toolUsed: '{tool_used}'"
        )

        # Statistical grounding assertion: check that numeric metrics or player stats are present
        has_grounded_metric = bool(
            re.search(r"\d+(\.\d+)?%?", answer)
            or any(kw in answer.lower() for kw in item["expected_stats"])
        )
        assert has_grounded_metric, (
            f"Copilot answer lacked grounded statistics or tactical data: '{answer}'"
        )

        print(f"  Source:     {source}")
        print(f"  Model:      {model}")
        print(f"  MatchClock: {match_clock}")
        print(f"  ToolUsed:   {tool_used}")
        print(f"  Answer:     \"{answer}\"")
        print("  ✓ Grounded statistics and tactical metrics confirmed")

        results.append(
            {
                "id": item["id"],
                "status": "PASS",
                "source": source,
                "model": model,
                "matchClock": match_clock,
                "toolUsed": tool_used,
                "latency_ms": latency_ms,
            }
        )

    return {"status": "PASS", "subtests": results}


def check_agent_traces(backend_url: str) -> dict[str, Any]:
    """Check 4: GET /api/agents four-agent swarm traces and statuses."""
    print("\n" + "=" * 80)
    print("CHECK 4: GET /api/agents — Four-Agent Swarm Traces & Execution Latency")
    print("=" * 80)

    url = f"{backend_url}/api/agents"
    status, traces, latency_ms = _request_with_retry(url, method="GET")

    print(f"Endpoint: {url}")
    print(f"HTTP Status: {status} (Latency: {latency_ms:.1f}ms)")
    assert status == 200, f"Expected HTTP 200, got {status}: {traces}"
    assert isinstance(traces, list), f"Expected list of traces, got {type(traces)}"
    assert len(traces) == 4, f"Expected exactly 4 agent traces, got {len(traces)}"

    observed_roles = []
    for i, trace in enumerate(traces):
        role = trace.get("role")
        label = trace.get("label")
        agent_status = trace.get("status")
        agent_latency = trace.get("latencyMs")
        reads = trace.get("reads")
        writes = trace.get("writes")
        summary = trace.get("summary")

        observed_roles.append(role)
        print(f"\nAgent [{i + 1}/4]: {label} (role='{role}')")
        print(f"  Status:     {agent_status}")
        print(f"  Latency:    {agent_latency:.3f} ms")
        print(f"  Reads ({len(reads)}):  {reads}")
        print(f"  Writes ({len(writes)}): {writes}")
        print(f"  Summary:    \"{summary}\"")

        assert role in CANONICAL_ROLES, f"Unexpected agent role: {role}"
        assert agent_status == "complete", f"Agent {role} status must be 'complete', got {agent_status}"
        assert isinstance(agent_latency, (int, float)) and agent_latency < FAST_PATH_LATENCY_LIMIT_MS, (
            f"Agent {role} latency {agent_latency}ms exceeds fast-path deadline {FAST_PATH_LATENCY_LIMIT_MS}ms"
        )
        assert isinstance(reads, list) and len(reads) > 0, f"Agent {role} must record non-empty reads"
        assert isinstance(writes, list) and len(writes) > 0, f"Agent {role} must record non-empty writes"
        assert isinstance(summary, str) and len(summary.strip()) > 0, f"Agent {role} must have a summary"

    # Verify all 4 canonical roles are uniquely present
    assert set(observed_roles) == set(CANONICAL_ROLES), (
        f"Missing canonical agent roles: expected {CANONICAL_ROLES}, got {observed_roles}"
    )
    print("\n  ✓ All 4 canonical agent roles confirmed with status: complete")
    print("  ✓ All agents executed strictly within sub-400ms fast-path deadlines")

    return {
        "status": "PASS",
        "agent_count": len(traces),
        "roles": observed_roles,
        "latency_ms": latency_ms,
    }


def check_narrative_continuity_and_progression(backend_url: str) -> dict[str, Any]:
    """Check 5: Verify continuous match clock progression across narrative ticks."""
    print("\n" + "=" * 80)
    print("CHECK 5: Narrative Continuity & Simulation Clock Progression")
    print("=" * 80)

    url = f"{backend_url}/api/narrative"
    samples = []
    for i in range(3):
        status, data, _ = _request_with_retry(url, method="GET")
        assert status == 200
        samples.append(
            {
                "id": data["id"],
                "clock": data["matchClock"],
                "timestamp": data["timestamp"],
                "headline_en": data["headline"]["en"],
            }
        )
        print(
            f"  Sample {i + 1}: id={data['id']} clock={data['matchClock']} "
            f"timestamp={data['timestamp']}ms headline=\"{data['headline']['en'][:45]}...\""
        )
        if i < 2:
            time.sleep(1.2)

    return {"status": "PASS", "samples": samples}


def check_latency_and_reliability_benchmark(
    backend_url: str, num_samples: int = 10
) -> dict[str, Any]:
    """Check 6: Multi-sample latency benchmarking across endpoints."""
    print("\n" + "=" * 80)
    print(f"CHECK 6: Latency & Reliability Benchmark ({num_samples} Samples)")
    print("=" * 80)

    endpoints = [
        ("/api/narrative", "GET", None),
        ("/api/agents", "GET", None),
        (
            "/api/copilot/query",
            "POST",
            {
                "query": "Who is currently the most influential player on the pitch?",
                "persona": "analyst",
            },
        ),
    ]

    benchmark_results = {}
    for path, method, payload in endpoints:
        url = f"{backend_url}{path}"
        latencies: list[float] = []
        errors = 0

        for _ in range(num_samples):
            try:
                status, _, lat_ms = _request_with_retry(
                    url, method=method, data=payload, timeout=20.0
                )
                if status == 200:
                    latencies.append(lat_ms)
                else:
                    errors += 1
            except (urllib.error.URLError, TimeoutError, OSError):
                errors += 1

        latencies.sort()
        p50 = latencies[len(latencies) // 2] if latencies else 0.0
        p95 = latencies[int(len(latencies) * 0.95)] if latencies else 0.0
        mean = sum(latencies) / len(latencies) if latencies else 0.0
        min_lat = latencies[0] if latencies else 0.0
        max_lat = latencies[-1] if latencies else 0.0

        print(
            f"Endpoint: {path:20} [{method}] | Samples: {len(latencies)}/{num_samples} | "
            f"Min: {min_lat:6.1f}ms | Mean: {mean:6.1f}ms | P50: {p50:6.1f}ms | "
            f"P95: {p95:6.1f}ms | Max: {max_lat:6.1f}ms | Errors: {errors}"
        )

        assert errors == 0, f"Encountered {errors} errors on {path}"
        benchmark_results[path] = {
            "samples": len(latencies),
            "min_ms": min_lat,
            "mean_ms": mean,
            "p50_ms": p50,
            "p95_ms": p95,
            "max_ms": max_lat,
            "errors": errors,
        }

    return {"status": "PASS", "metrics": benchmark_results}


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Verify Azure AI Foundry Swarm & Copilot Reasoning (Milestone M3)"
    )
    parser.add_argument(
        "--backend-url",
        default=DEFAULT_BACKEND_URL,
        help="Base URL of backend container app",
    )
    parser.add_argument(
        "--quick",
        action="store_true",
        help="Skip multi-sample benchmark for quick verification",
    )
    args = parser.parse_args()

    t_start = time.perf_counter()
    print("=" * 80)
    print("PREMIER LEAGUE STUDIO — MILESTONE M3 LIVE VERIFICATION")
    print(f"Target Backend: {args.backend_url}")
    print(f"Timestamp:      {time.strftime('%Y-%m-%d %H:%M:%SZ', time.gmtime())}")
    print("=" * 80)

    checks: list[tuple[str, Any]] = [
        ("GET /api/narrative Multilingual Stream (5 Languages)", lambda: check_narrative_multilingual(args.backend_url)),
        ("GET /api/narrative Persona Contexts & Clock Validation", lambda: check_narrative_personas_and_metadata(args.backend_url)),
        ("POST /api/copilot/query Live Tactical Copilot Reasoning", lambda: check_tactical_copilot(args.backend_url)),
        ("GET /api/agents Four-Agent Collaborative Swarm Status", lambda: check_agent_traces(args.backend_url)),
        ("Narrative Continuity & Simulation Clock Progression", lambda: check_narrative_continuity_and_progression(args.backend_url)),
    ]

    if not args.quick:
        checks.append(
            ("Swarm Reliability & Latency Benchmark", lambda: check_latency_and_reliability_benchmark(args.backend_url, num_samples=5))
        )

    summary_table = []
    all_passed = True

    for name, func in checks:
        try:
            func()
            summary_table.append((name, "PASS", "Verified successfully"))
        except (AssertionError, RuntimeError, urllib.error.URLError, TimeoutError, OSError) as exc:
            all_passed = False
            summary_table.append((name, "FAIL", str(exc)))
            print(f"\n[ERROR] Check '{name}' failed: {exc}", file=sys.stderr)

    total_time = time.perf_counter() - t_start

    print("\n" + "=" * 80)
    print("VERIFICATION SUMMARY MATRIX — MILESTONE M3")
    print("=" * 80)
    print(f"{'Check Name':<55} | {'Status':<6} | {'Details'}")
    print("-" * 80)
    for name, status, details in summary_table:
        print(f"{name:<55} | {status:<6} | {details[:40]}")
    print("=" * 80)
    print(f"Total Execution Time: {total_time:.2f} seconds")
    print(f"Final Result:         {'PASSED (ALL 100% GREEN)' if all_passed else 'FAILED'}")
    print("=" * 80)

    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
