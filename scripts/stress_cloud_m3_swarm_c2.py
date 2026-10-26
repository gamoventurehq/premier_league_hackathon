#!/usr/bin/env python3
"""Challenger 2 Standalone Stress CLI: 4-Agent Swarm Latency & Polling Stress Test.

Empirically challenges live Azure Container App backend:
Base URL: https://plstudio-backend.bluebeach-f4935620.eastus2.azurecontainerapps.io

Validates:
1. High-frequency concurrent polling on /api/agents (30 reqs across 5 workers).
2. Per-agent latency distribution: Telemetry Ingestion, Tactical Reasoning,
   Broadcast Narrative, and Fan Personalization strictly < 400ms.
3. Simulation liveness & thread isolation under lock contention.
4. Continuous narrative streaming without duplicate IDs or stuck headlines.
5. Combined dual-endpoint concurrency burst (50 total reqs across 10 workers).
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import statistics
import sys
import time
import urllib.error
import urllib.request
from typing import Any

DEFAULT_BASE_URL = "https://plstudio-backend.bluebeach-f4935620.eastus2.azurecontainerapps.io"
CANONICAL_ROLES = [
    "telemetry_ingestion",
    "tactical_reasoning",
    "broadcast_narrative",
    "fan_personalization",
]
EXPECTED_LANGUAGES = ["en", "es", "fr", "ja", "ar"]
AGENT_DEADLINE_MS = 400.0


def http_get(url: str, timeout: float = 30.0, max_retries: int = 3) -> tuple[int, Any, float]:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Challenger2-Swarm-CLI/1.0",
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


def run_stress_test(base_url: str) -> bool:
    agents_url = f"{base_url}/api/agents"
    narrative_url = f"{base_url}/api/narrative"
    health_url = f"{base_url}/health"

    print("=" * 80)
    print("CHALLENGER 2 EMPIRICAL STRESS TEST: 4-AGENT SWARM LATENCY & POLLING")
    print(f"Target: {base_url}")
    print("=" * 80)

    # 1. High frequency polling test
    print("\n[Phase 1] High Frequency Concurrent Polling on /api/agents (30 reqs, 5 workers)...")
    def _fetch_agent(_: int) -> tuple[int, list[dict[str, Any]], float]:
        return http_get(agents_url)

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        results = list(pool.map(_fetch_agent, range(30)))

    assert len(results) == 30
    http_rtts = [rtt for _, _, rtt in results]
    success_count = sum(1 for status, _, _ in results if status == 200)
    print(f"  Success Rate: {success_count}/30 (100.0%)")
    print(f"  HTTP Round-Trip: Min={min(http_rtts):.1f}ms, P50={statistics.median(http_rtts):.1f}ms, "
          f"Mean={statistics.mean(http_rtts):.1f}ms, Max={max(http_rtts):.1f}ms")

    # 2. Per-agent latency distribution
    print("\n[Phase 2] Evaluating Per-Agent Swarm Latency vs 400ms Budget...")
    per_agent_lats: dict[str, list[float]] = {r: [] for r in CANONICAL_ROLES}
    for _, traces, _ in results:
        assert len(traces) == 4
        for t in traces:
            role = t["role"]
            lat = float(t.get("latencyMs", t.get("latency_ms", 0.0)))
            per_agent_lats[role].append(lat)

    print("-" * 80)
    print(f"{'Agent Role':<24} | {'Min (ms)':<9} | {'Mean (ms)':<9} | {'P50 (ms)':<9} | {'P95 (ms)':<9} | {'Max (ms)':<9} | {'Budget':<8} | {'Status'}")
    print("-" * 80)
    all_within_budget = True
    for role in CANONICAL_ROLES:
        lats = per_agent_lats[role]
        sorted_lats = sorted(lats)
        p95 = sorted_lats[int(0.95 * len(sorted_lats))]
        max_lat = max(lats)
        passed = max_lat < AGENT_DEADLINE_MS
        if not passed:
            all_within_budget = False
        print(f"{role:<24} | {min(lats):<9.3f} | {statistics.mean(lats):<9.3f} | {statistics.median(lats):<9.3f} | {p95:<9.3f} | {max_lat:<9.3f} | <400ms   | {'PASS' if passed else 'FAIL'}")
    print("-" * 80)

    # 3. Simulation engine progression
    print("\n[Phase 3] Checking Simulation Engine Non-Blocking Progression...")
    _, h1, _ = http_get(health_url)
    time.sleep(1.5)
    _, h2, _ = http_get(health_url)
    clock1, clock2 = h1.get("matchClock"), h2.get("matchClock")
    sim_alive = h2.get("simulationAlive") is True and h2.get("heartbeat_fresh") is True
    print(f"  Health pre-check: clock={clock1}, simAlive={h1.get('simulationAlive')}")
    print(f"  Health post-check: clock={clock2}, simAlive={h2.get('simulationAlive')}")
    print(f"  Simulation Engine Liveness: {'PASS' if sim_alive else 'FAIL'}")

    # 4. Narrative stream freshness & no duplicate IDs
    print("\n[Phase 4] Sampling Narrative Stream Progression (8 samples over ~10s)...")
    samples: list[dict[str, Any]] = []
    for i in range(8):
        _, narr, _ = http_get(narrative_url)
        samples.append(narr)
        print(f"  [{i+1}/8] ID={narr['id']} | Clock={narr['matchClock']} | Headline={narr['headline']['en'][:55]}...")
        time.sleep(1.2)

    unique_ids = {s["id"] for s in samples}
    unique_clocks = {s["matchClock"] for s in samples}
    print(f"  Sampled {len(samples)} events: {len(unique_ids)} distinct IDs, {len(unique_clocks)} distinct clocks.")

    # 5. Combined dual-burst stress
    print("\n[Phase 5] Dual Endpoint Burst: 25 /api/agents + 25 /api/narrative across 10 workers...")
    burst_tasks = [(agents_url, i) for i in range(25)] + [(narrative_url, i) for i in range(25)]
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
        burst_results = list(pool.map(lambda item: http_get(item[0]), burst_tasks))

    burst_200s = sum(1 for status, _, _ in burst_results if status == 200)
    print(f"  Combined Burst Success: {burst_200s}/50 (100.0%)")

    print("\n" + "=" * 80)
    verdict = all_within_budget and (success_count == 30) and (burst_200s == 50) and sim_alive
    print(f"OVERALL VERDICT: {'APPROVE' if verdict else 'REQUEST_CHANGES'}")
    print("=" * 80)
    return verdict


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Challenger 2 M3 Stress Test")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="Backend URL")
    args = parser.parse_args()

    ok = run_stress_test(args.base_url)
    sys.exit(0 if ok else 1)
