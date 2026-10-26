"""Empirical stress and adversarial test harness for Milestone M1.

Milestone M1: Cloud Service Health & Architecture Audit.
Tests live Azure Container App endpoints under concurrent burst loads:
1. Backend direct /health (20 concurrent probes)
2. Frontend direct / (20 concurrent probes)
3. Frontend Nginx reverse proxy /api/health (20 concurrent probes)
4. Mixed high-concurrency burst (40 concurrent requests)
5. Adversarial probes (query strings, non-existent routes, custom headers)
6. Simulation clock progression and heartbeat stability under stress
"""

from __future__ import annotations

import concurrent.futures
import statistics
import time
from typing import Any

import httpx

BACKEND_BASE = "https://plstudio-backend.bluebeach-f4935620.eastus2.azurecontainerapps.io"
FRONTEND_BASE = "https://plstudio-frontend.bluebeach-f4935620.eastus2.azurecontainerapps.io"


def _calc_stats(latencies: list[float]) -> dict[str, float]:
    """Calculate min, max, mean, median, p90, p95 latencies in ms."""
    s = sorted(latencies)
    n = len(s)
    p50_idx = int(0.50 * n)
    p90_idx = min(n - 1, int(0.90 * n))
    p95_idx = min(n - 1, int(0.95 * n))
    p99_idx = min(n - 1, int(0.99 * n))
    return {
        "count": float(n),
        "min_ms": round(s[0], 2),
        "max_ms": round(s[-1], 2),
        "mean_ms": round(statistics.mean(s), 2),
        "median_ms": round(s[p50_idx], 2),
        "p90_ms": round(s[p90_idx], 2),
        "p95_ms": round(s[p95_idx], 2),
        "p99_ms": round(s[p99_idx], 2),
    }


def _probe_get(url: str, headers: dict[str, str] | None = None, timeout: float = 15.0) -> dict[str, Any]:
    """Execute single HTTP GET and return structured probe result."""
    req_headers = {"User-Agent": "PLStudio-Stress-Challenger/1.0", "Accept": "*/*"}
    if headers:
        req_headers.update(headers)

    client = httpx.Client(timeout=timeout)
    t0 = time.perf_counter()
    try:
        resp = client.get(url, headers=req_headers)
        latency_ms = (time.perf_counter() - t0) * 1000.0
        return {
            "url": url,
            "status_code": resp.status_code,
            "latency_ms": latency_ms,
            "headers": dict(resp.headers),
            "text": resp.text,
            "error": None,
        }
    except (httpx.HTTPError, OSError) as e:
        latency_ms = (time.perf_counter() - t0) * 1000.0
        return {
            "url": url,
            "status_code": 0,
            "latency_ms": latency_ms,
            "headers": {},
            "text": "",
            "error": str(e),
        }
    finally:
        client.close()


def test_backend_health_concurrent_burst_20():
    """Verify 20 concurrent requests to backend /health return HTTP 200, zero 5xx, and consistent capabilities."""
    url = f"{BACKEND_BASE}/health"
    concurrency = 20

    t_start = time.perf_counter()
    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [executor.submit(_probe_get, url) for _ in range(concurrency)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]
    total_wall_ms = (time.perf_counter() - t_start) * 1000.0

    # Verification: zero 5xx errors, all 200
    statuses = [r["status_code"] for r in results]
    assert all(s == 200 for s in statuses), f"Expected all 200, got: {statuses}"
    assert all(r["error"] is None for r in results), f"Errors occurred: {[r['error'] for r in results if r['error']]}"

    # Capability integrity: all 4 Azure capabilities must remain True under load
    latencies = [r["latency_ms"] for r in results]
    stats = _calc_stats(latencies)

    for r in results:
        data = httpx.Response(200, text=r["text"]).json()
        assert data.get("status") == "ok"
        assert data.get("service") == "Premier League Studio Backend"
        azure = data.get("azure", {})
        assert azure.get("foundry") is True, f"Capability drop: {azure}"
        assert azure.get("eventHubs") is True, f"Capability drop: {azure}"
        assert azure.get("cosmos") is True, f"Capability drop: {azure}"
        assert azure.get("mcp") is True, f"Capability drop: {azure}"
        assert data.get("simulationAlive") is True
        assert data.get("ready") is True
        assert data.get("heartbeat_fresh") is True
        assert data.get("workerError") is None
        assert data.get("worker_errors") == 0

    assert stats["p95_ms"] < 6000.0, f"P95 latency too high: {stats['p95_ms']}ms"
    assert total_wall_ms < 8000.0, f"Total wall clock too high: {total_wall_ms}ms"


def test_frontend_root_concurrent_burst_20():
    """Verify 20 concurrent requests to frontend / return HTTP 200, zero 5xx, and full HTML bundle."""
    url = f"{FRONTEND_BASE}/"
    concurrency = 20

    t_start = time.perf_counter()
    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [executor.submit(_probe_get, url) for _ in range(concurrency)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]
    total_wall_ms = (time.perf_counter() - t_start) * 1000.0

    statuses = [r["status_code"] for r in results]
    assert all(s == 200 for s in statuses), f"Expected all 200, got: {statuses}"
    assert all(r["error"] is None for r in results), f"Errors occurred: {[r['error'] for r in results if r['error']]}"

    latencies = [r["latency_ms"] for r in results]
    stats = _calc_stats(latencies)

    for r in results:
        html = r["text"]
        assert len(html) > 1000, f"HTML payload truncated: {len(html)} bytes"
        assert "<title>Gamoventure • Premier League Studio" in html
        assert 'mode="ios"' in html
        assert '<div id="root"></div>' in html
        assert '<script type="module" crossorigin src="/assets/index-' in html
        assert '<link rel="stylesheet" crossorigin href="/assets/index-' in html

    assert stats["p95_ms"] < 4000.0, f"P95 latency too high: {stats['p95_ms']}ms"
    assert total_wall_ms < 5000.0, f"Total wall clock too high: {total_wall_ms}ms"


def test_frontend_proxy_health_concurrent_burst_20():
    """Verify 20 concurrent requests to Nginx reverse proxy /api/health return HTTP 200 with zero upstream drops."""
    url = f"{FRONTEND_BASE}/api/health"
    concurrency = 20

    t_start = time.perf_counter()
    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [executor.submit(_probe_get, url) for _ in range(concurrency)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]
    total_wall_ms = (time.perf_counter() - t_start) * 1000.0

    statuses = [r["status_code"] for r in results]
    assert all(s == 200 for s in statuses), f"Proxy errors: {statuses}"
    assert all(r["error"] is None for r in results)

    latencies = [r["latency_ms"] for r in results]
    stats = _calc_stats(latencies)

    for r in results:
        data = httpx.Response(200, text=r["text"]).json()
        assert data.get("status") == "ok"
        azure = data.get("azure", {})
        assert azure == {"foundry": True, "eventHubs": True, "cosmos": True, "mcp": True}
        assert data.get("simulationAlive") is True

    assert stats["p95_ms"] < 4000.0, f"P95 latency too high: {stats['p95_ms']}ms"
    assert total_wall_ms < 5000.0, f"Total wall clock too high: {total_wall_ms}ms"


def test_high_concurrency_burst_40_mixed():
    """Verify 40 concurrent mixed requests across backend /health, frontend /, and frontend /api/health."""
    targets = (
        [f"{BACKEND_BASE}/health"] * 15
        + [f"{FRONTEND_BASE}/"] * 15
        + [f"{FRONTEND_BASE}/api/health"] * 10
    )
    assert len(targets) == 40

    t_start = time.perf_counter()
    with concurrent.futures.ThreadPoolExecutor(max_workers=40) as executor:
        futures = [executor.submit(_probe_get, url) for url in targets]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]
    total_wall_ms = (time.perf_counter() - t_start) * 1000.0

    statuses = [r["status_code"] for r in results]
    assert all(s == 200 for s in statuses), f"Mixed burst failed: {statuses}"
    assert all(r["error"] is None for r in results)

    latencies = [r["latency_ms"] for r in results]
    stats = _calc_stats(latencies)
    assert stats["max_ms"] < 8000.0, f"Max latency too high: {stats['max_ms']}ms"
    assert total_wall_ms < 10000.0, f"Total wall clock exceeded: {total_wall_ms}ms"


def test_adversarial_probes_and_fallbacks():
    """Verify error handling on non-existent endpoints and query parameter robustness."""
    client = httpx.Client(timeout=10.0)

    # 1. Non-existent route on backend returns 404 (not 500)
    r_404 = client.get(f"{BACKEND_BASE}/api/nonexistent_test_route_m1_audit")
    assert r_404.status_code == 404
    assert r_404.json().get("detail") == "Not Found"

    # 2. Non-existent route on frontend falls back to SPA index.html with 200
    r_spa = client.get(f"{FRONTEND_BASE}/some/spa/deep/link/match/42")
    assert r_spa.status_code == 200
    assert "<title>Gamoventure • Premier League Studio" in r_spa.text

    # 3. Query params on /health do not cause errors or 500
    r_qp = client.get(f"{BACKEND_BASE}/health?adversarial=true&seed=999999&filter=all")
    assert r_qp.status_code == 200
    assert r_qp.json().get("status") == "ok"

    # 4. Custom headers on /health do not cause errors
    r_hdr = client.get(
        f"{BACKEND_BASE}/health",
        headers={"X-Test-Trace": "stress-challenger-m1", "Accept": "application/json, text/plain, */*"}
    )
    assert r_hdr.status_code == 200
    assert r_hdr.json().get("azure", {}).get("mcp") is True

    client.close()


def test_simulation_clock_progression_and_stability():
    """Verify that match clock and frameId advance monotonically and worker remains error-free."""
    client = httpx.Client(timeout=10.0)
    d1 = client.get(f"{BACKEND_BASE}/health").json()
    time.sleep(1.5)
    d2 = client.get(f"{BACKEND_BASE}/health").json()
    client.close()

    assert d2["matchSeconds"] >= d1["matchSeconds"], "Clock moved backward!"
    assert d2["frameId"] >= d1["frameId"], "frameId moved backward!"
    assert d2["simulationAlive"] is True
    assert d2["heartbeat_fresh"] is True
    assert d2["workerError"] is None
    assert d2["worker_errors"] == 0
