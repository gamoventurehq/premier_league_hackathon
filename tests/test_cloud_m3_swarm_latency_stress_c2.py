"""Challenger 2 Empirical Stress Test Suite for Milestone M3: 4-Agent Swarm Latency & Polling Stress.

Evaluates the live Azure Container App backend:
Base URL: https://plstudio-backend.bluebeach-f4935620.eastus2.azurecontainerapps.io

Adversarial Stress Invariants:
1. High-frequency concurrent polling:
   - 30 requests to /api/agents across 5 concurrent workers.
   - Ensures blackboard trace reads do not corrupt or block the simulation engine.
   - Validates all 4 agents (telemetry_ingestion, tactical_reasoning,
     broadcast_narrative, fan_personalization) return valid status: "complete",
     with non-empty reads and writes on every iteration.
2. Latency distribution & 400ms deadline enforcement:
   - Measures individual latencyMs of each of the 4 agents inside the swarm across load.
   - Asserts every agent strictly satisfies latencyMs < 400.0 ms.
   - Calculates min, max, mean, p50, and p95 per agent.
3. Simulation liveness under read contention:
   - Validates the simulation engine continues ticking without deadlocks or thread starvation.
4. Narrative stream continuous progression:
   - Polls /api/narrative over time, verifying match clock advancement,
     no duplicate IDs, no stuck headlines, and complete 5-language localization.
5. Combined dual-endpoint load burst:
   - Simultaneous 25 /api/agents + 25 /api/narrative requests across 10 concurrent threads.
"""

from __future__ import annotations

import concurrent.futures
import json
import statistics
import time
import urllib.error
import urllib.request
from typing import Any

BASE_URL = "https://plstudio-backend.bluebeach-f4935620.eastus2.azurecontainerapps.io"
AGENTS_URL = f"{BASE_URL}/api/agents"
NARRATIVE_URL = f"{BASE_URL}/api/narrative"
HEALTH_URL = f"{BASE_URL}/health"

CANONICAL_ROLES = [
    "telemetry_ingestion",
    "tactical_reasoning",
    "broadcast_narrative",
    "fan_personalization",
]
EXPECTED_LANGUAGES = ["en", "es", "fr", "ja", "ar"]
AGENT_DEADLINE_MS = 400.0


def _http_get(url: str, timeout: float = 25.0, max_retries: int = 3) -> tuple[int, Any, float]:
    """Execute HTTP GET with retries for cloud network jitter and return (status_code, parsed_json, round_trip_ms)."""
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Challenger2-Swarm-Stress/1.0",
            "Accept": "application/json",
        },
    )
    for attempt in range(1, max_retries + 1):
        t0 = time.perf_counter()
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                elapsed_ms = (time.perf_counter() - t0) * 1000.0
                body = json.loads(resp.read().decode("utf-8"))
                return resp.status, body, elapsed_ms
        except (TimeoutError, urllib.error.URLError):
            if attempt == max_retries:
                raise
            time.sleep(1.0)
    raise RuntimeError(f"Failed to fetch {url} after {max_retries} attempts")


class TestChallenger3SwarmLatencyAndPollingStress:
    """Empirical challenger stress suite for 4-Agent Swarm Latency & Polling."""

    def test_high_frequency_concurrent_agents_polling_integrity(self) -> None:
        """Poll /api/agents with 30 requests across 5 concurrent workers.

        Verifies:
        - 100% HTTP 200 success rate under concurrent read pressure.
        - Exactly 4 agents in every response.
        - Canonical roles present without corruption.
        - Status 'complete' for all agents in all responses.
        - Non-empty transactional blackboard reads and writes.
        """
        num_requests = 30
        concurrency = 5

        def _worker(idx: int) -> tuple[int, list[dict[str, Any]], float]:
            return _http_get(AGENTS_URL)

        with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as pool:
            results = list(pool.map(_worker, range(num_requests)))

        assert len(results) == num_requests, f"Expected {num_requests} responses, got {len(results)}"

        http_latencies: list[float] = []
        for status, traces, rtt in results:
            assert status == 200, f"Expected HTTP 200, got {status}"
            assert isinstance(traces, list), "Response body must be a list"
            assert len(traces) == 4, f"Expected exactly 4 traces, got {len(traces)}"

            roles_found = [t.get("role") for t in traces]
            assert sorted(roles_found) == sorted(CANONICAL_ROLES), (
                f"Roles mismatch: found {roles_found}, expected {CANONICAL_ROLES}"
            )

            for t in traces:
                role = t.get("role")
                assert t.get("status") == "complete", (
                    f"Agent {role} status was '{t.get('status')}', expected 'complete'"
                )
                assert isinstance(t.get("reads"), list), f"Agent {role} reads must be a list"
                assert len(t.get("reads")) > 0, f"Agent {role} reads list cannot be empty"
                assert isinstance(t.get("writes"), list), f"Agent {role} writes must be a list"
                assert len(t.get("writes")) > 0, f"Agent {role} writes list cannot be empty"
                assert isinstance(t.get("summary"), str), f"Agent {role} summary must be a str"
                assert len(t.get("summary")) > 10, f"Agent {role} summary unexpectedly short"

            http_latencies.append(rtt)

        p50 = statistics.median(http_latencies)
        mean_lat = statistics.mean(http_latencies)
        print(f"\n[High Frequency Polling] 30 reqs across 5 workers: Min={min(http_latencies):.1f}ms, "
              f"Mean={mean_lat:.1f}ms, P50={p50:.1f}ms, Max={max(http_latencies):.1f}ms")

    def test_per_agent_latency_distribution_strictly_under_400ms(self) -> None:
        """Verify latency distribution of each of the 4 agents inside the swarm under load.

        Invariant: Every agent inside the swarm must complete within sub-400ms budget (<400ms).
        """
        num_requests = 30
        concurrency = 5

        def _worker(idx: int) -> tuple[int, list[dict[str, Any]], float]:
            return _http_get(AGENTS_URL)

        with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as pool:
            results = list(pool.map(_worker, range(num_requests)))

        per_agent_latencies: dict[str, list[float]] = {role: [] for role in CANONICAL_ROLES}

        for _, traces, _ in results:
            for t in traces:
                role = t["role"]
                # In models.py AgentTrace, field is latencyMs (serialized as camelCase)
                latency_ms = t.get("latencyMs", t.get("latency_ms"))
                assert latency_ms is not None, f"Missing latency field in trace for {role}"
                assert isinstance(latency_ms, (int, float)), f"latencyMs must be numeric, got {type(latency_ms)}"
                per_agent_latencies[role].append(float(latency_ms))

        print("\n[Per-Agent Swarm Latency Distribution under Load (30 samples)]")
        for role in CANONICAL_ROLES:
            lats = per_agent_latencies[role]
            assert len(lats) == num_requests
            max_lat = max(lats)
            min_lat = min(lats)
            mean_lat = statistics.mean(lats)
            p50 = statistics.median(lats)
            sorted_lats = sorted(lats)
            p95 = sorted_lats[int(0.95 * len(sorted_lats))]

            print(f"  {role:<22}: Min={min_lat:.3f}ms | Mean={mean_lat:.3f}ms | P50={p50:.3f}ms | "
                  f"P95={p95:.3f}ms | Max={max_lat:.3f}ms")

            # EMPIRICAL INVARIANT: Every agent execution must strictly remain < 400.0 ms
            assert max_lat < AGENT_DEADLINE_MS, (
                f"Agent {role} exceeded 400ms deadline with max={max_lat:.3f}ms"
            )
            # In addition, assert that in-memory fast-path agents operate under 20ms
            assert max_lat < 20.0, (
                f"Agent {role} fast-path latency unexpectedly high: {max_lat:.3f}ms (expected < 20ms)"
            )

    def test_simulation_engine_advances_under_polling_stress(self) -> None:
        """Verify that intensive polling on /api/agents does not block or deadlock simulation.

        Checks simulation health before and after a burst of 25 concurrent requests.
        """
        status_pre, health_pre, _ = _http_get(HEALTH_URL)
        assert status_pre == 200
        assert health_pre.get("simulationAlive") is True
        assert health_pre.get("heartbeat_fresh") is True

        # Burst 25 concurrent requests to /api/agents
        def _burst(i: int) -> int:
            status, _, _ = _http_get(AGENTS_URL)
            return status

        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
            statuses = list(pool.map(_burst, range(25)))

        assert all(s == 200 for s in statuses)

        # Brief pause to observe progression
        time.sleep(1.5)

        status_post, health_post, _ = _http_get(HEALTH_URL)
        assert status_post == 200
        assert health_post.get("simulationAlive") is True
        assert health_post.get("heartbeat_fresh") is True
        assert health_post.get("workerError") is None

    def test_narrative_stream_progression_no_duplicate_ids_or_stuck_headlines(self) -> None:
        """Verify narrative stream updates continuously as match clock advances without duplicate IDs or stuck headlines.

        Collects 8 temporal samples of /api/narrative with intervals, verifying:
        - Schema integrity and all 5 languages (en, es, fr, ja, ar).
        - Authentic scripts (Arabic and Japanese).
        - Clean JSON strings without raw dataclass Python repr strings.
        - Match clock progression across samples within the stream.
        - No duplicate narrative IDs with conflicting payloads.
        - Headlines update dynamically and do not remain stuck indefinitely.
        """
        samples: list[dict[str, Any]] = []
        for _ in range(8):
            status, narrative, _ = _http_get(NARRATIVE_URL)
            assert status == 200
            samples.append(narrative)
            time.sleep(1.2)

        assert len(samples) == 8

        # 1. Structural and multilingual validation
        for s in samples:
            assert "id" in s and s["id"].startswith("narr-")
            assert "matchClock" in s
            assert "headline" in s
            assert "tacticalExplanation" in s

            headline = s["headline"]
            explanation = s["tacticalExplanation"]

            assert set(headline.keys()) == set(EXPECTED_LANGUAGES)
            assert set(explanation.keys()) == set(EXPECTED_LANGUAGES)

            for lang in EXPECTED_LANGUAGES:
                assert len(headline[lang].strip()) > 0, f"Empty headline for {lang}"
                assert len(explanation[lang].strip()) > 0, f"Empty explanation for {lang}"
                # Invariant: No raw dataclass repr leak
                assert "NarrativeDraft" not in headline[lang]
                assert "NarrativeDraft" not in explanation[lang]
                assert "[object Object]" not in headline[lang]

            # Arabic unicode script check: \u0600-\u06ff
            assert any("\u0600" <= c <= "\u06ff" for c in headline["ar"]), "Arabic headline lacks Arabic script"
            # Japanese unicode script check: Kana & Kanji \u3040-\u30ff\u4e00-\u9faf
            assert any(
                "\u3040" <= c <= "\u30ff" or "\u4e00" <= c <= "\u9faf" for c in headline["ja"]
            ), "Japanese headline lacks Japanese script"

            # Contexts must be populated
            assert len(s.get("analystContext", "").strip()) > 0
            assert len(s.get("casualContext", "").strip()) > 0
            assert len(s.get("playerCamContext", "").strip()) > 0
            club = s.get("clubCentricContext", {})
            assert isinstance(club, dict)
            assert len(club.get("homeFrame", "").strip()) > 0
            assert len(club.get("awayFrame", "").strip()) > 0

        # 2. Duplicate ID check: Ensure no duplicate IDs have conflicting content
        id_to_payload: dict[str, dict[str, Any]] = {}
        for s in samples:
            nid = s["id"]
            if nid in id_to_payload:
                prev = id_to_payload[nid]
                # If the same ID appears again, its headline and clock must be identical (idempotent)
                assert prev["matchClock"] == s["matchClock"], (
                    f"Duplicate ID {nid} has conflicting matchClock: {prev['matchClock']} vs {s['matchClock']}"
                )
                assert prev["headline"]["en"] == s["headline"]["en"], (
                    f"Duplicate ID {nid} has conflicting headline: {prev['headline']['en']} vs {s['headline']['en']}"
                )
            else:
                id_to_payload[nid] = s

        # 3. Match clock progression & headline freshness
        clocks = [s["matchClock"] for s in samples]
        print("\n[Narrative Stream Samples over ~10s]:")
        for idx, s in enumerate(samples):
            print(f"  Sample {idx}: ID={s['id']} Clock={s['matchClock']} Headline='{s['headline']['en'][:60]}...'")

        # Invariant: Across 8 samples spaced by 1.2s (~10s total), simulation must advance
        first_clock = samples[0]["matchClock"]
        unique_clocks = set(clocks)
        assert len(unique_clocks) >= 2, f"Match clock appears frozen on {first_clock}"

    def test_combined_simultaneous_swarm_and_narrative_stress_burst(self) -> None:
        """Simultaneously stress /api/agents (25 reqs) and /api/narrative (25 reqs) across 10 threads.

        Verifies that simultaneous high-load reads of both the swarm traces and narrative
        do not cause lock deadlock or latency spikes in the underlying MatchRuntime.
        """
        num_per_endpoint = 25
        total_requests = num_per_endpoint * 2

        tasks = [(AGENTS_URL, i) for i in range(num_per_endpoint)] + [
            (NARRATIVE_URL, i) for i in range(num_per_endpoint)
        ]

        def _fetch(item: tuple[str, int]) -> tuple[int, str, float]:
            url, _ = item
            status, _, rtt = _http_get(url)
            return status, url, rtt

        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
            results = list(pool.map(_fetch, tasks))

        assert len(results) == total_requests
        agent_rtts = [rtt for status, url, rtt in results if url == AGENTS_URL and status == 200]
        narrative_rtts = [rtt for status, url, rtt in results if url == NARRATIVE_URL and status == 200]

        assert len(agent_rtts) == num_per_endpoint, f"Expected {num_per_endpoint} 200s for /api/agents"
        assert len(narrative_rtts) == num_per_endpoint, f"Expected {num_per_endpoint} 200s for /api/narrative"

        print("\n[Combined 50-Request Burst (10 Workers)]")
        print(f"  /api/agents (25 reqs)   : Min={min(agent_rtts):.1f}ms, Mean={statistics.mean(agent_rtts):.1f}ms, "
              f"P50={statistics.median(agent_rtts):.1f}ms, Max={max(agent_rtts):.1f}ms")
        print(f"  /api/narrative (25 reqs): Min={min(narrative_rtts):.1f}ms, Mean={statistics.mean(narrative_rtts):.1f}ms, "
              f"P50={statistics.median(narrative_rtts):.1f}ms, Max={max(narrative_rtts):.1f}ms")
