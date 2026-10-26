#!/usr/bin/env python3
"""Premier League Studio - Milestone M1 Cloud Service Health & Architecture Audit.

Automated verification script for Azure Container Apps deployment.

Tests:
1. Backend direct GET /health (HTTP 200, 4 Azure capabilities, simulation state, latency)
2. Backend direct GET /api/health (Route alias, parity with /health)
3. Backend match clock & simulation heartbeat progression (liveness check)
4. Frontend direct GET / (HTTP 200, title, Cupertino mode, viewport, root element, bundle links)
5. Frontend static CSS bundle delivery (HTTP 200, content-type, size)
6. Frontend static JS bundle delivery (HTTP 200, content-type, size)
7. Frontend Nginx reverse proxy GET /api/health (HTTP 200, proxying to backend)
8. Multi-sample latency benchmarking (min, max, mean, p50, p95)
"""

from __future__ import annotations

import json
import re
import sys
import time
import urllib.error
import urllib.request
from typing import Any

BACKEND_BASE = "https://plstudio-backend.bluebeach-f4935620.eastus2.azurecontainerapps.io"
FRONTEND_BASE = "https://plstudio-frontend.bluebeach-f4935620.eastus2.azurecontainerapps.io"


def http_get(url: str, timeout: float = 15.0) -> tuple[int, dict[str, str], str, float]:
    """Perform HTTP GET and return (status_code, headers_dict, body_text, latency_ms)."""
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "PLStudio-M1-Auditor/1.0", "Accept": "*/*"}
    )
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            latency_ms = (time.perf_counter() - t0) * 1000.0
            body = resp.read().decode("utf-8", errors="replace")
            headers = {k.lower(): v for k, v in resp.headers.items()}
            return resp.status, headers, body, latency_ms
    except urllib.error.HTTPError as e:
        latency_ms = (time.perf_counter() - t0) * 1000.0
        body = e.read().decode("utf-8", errors="replace")
        headers = {k.lower(): v for k, v in e.headers.items()}
        return e.code, headers, body, latency_ms
    except Exception as e:
        latency_ms = (time.perf_counter() - t0) * 1000.0
        raise RuntimeError(f"Network error accessing {url}: {e}") from e


def run_audit() -> dict[str, Any]:
    print("=" * 80)
    print("PREMIER LEAGUE STUDIO — MILESTONE M1 CLOUD SERVICE AUDIT")
    print(f"Backend Target:  {BACKEND_BASE}")
    print(f"Frontend Target: {FRONTEND_BASE}")
    print("=" * 80)

    results: dict[str, Any] = {
        "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "backend_url": BACKEND_BASE,
        "frontend_url": FRONTEND_BASE,
        "checks": {},
        "passed": True,
        "failures": []
    }

    # -------------------------------------------------------------------------
    # Check 1: Backend GET /health
    # -------------------------------------------------------------------------
    print("\n[CHECK 1] Probing Backend GET /health ...")
    health_url = f"{BACKEND_BASE}/health"
    status, _headers, body, latency = http_get(health_url)
    print(f"  HTTP Status: {status} | Latency: {latency:.2f}ms")

    assert status == 200, f"Expected 200, got {status}"
    payload = json.loads(body)
    print(f"  Response JSON: {json.dumps(payload, indent=2)}")

    # Assertions on payload
    assert payload.get("status") == "ok", f"Expected status 'ok', got {payload.get('status')}"
    assert payload.get("service") == "Premier League Studio Backend"

    azure_caps = payload.get("azure", {})
    assert azure_caps.get("foundry") is True, f"foundry capability not true: {azure_caps}"
    assert azure_caps.get("eventHubs") is True, f"eventHubs capability not true: {azure_caps}"
    assert azure_caps.get("cosmos") is True, f"cosmos capability not true: {azure_caps}"
    assert azure_caps.get("mcp") is True, f"mcp capability not true: {azure_caps}"

    assert payload.get("simulationAlive") is True, "simulationAlive is not True"
    assert payload.get("ready") is True, "ready is not True"
    assert payload.get("heartbeat_fresh") is True, "heartbeat_fresh is not True"
    assert payload.get("workerError") is None, f"workerError present: {payload.get('workerError')}"
    assert payload.get("worker_errors") == 0, f"worker_errors non-zero: {payload.get('worker_errors')}"

    match_clock = payload.get("matchClock")
    assert match_clock and ":" in match_clock, f"Invalid matchClock: {match_clock}"

    results["checks"]["backend_health"] = {
        "status_code": status,
        "latency_ms": round(latency, 2),
        "payload": payload,
        "azure_capabilities": azure_caps,
        "passed": True
    }
    print("  ✓ Check 1 PASSED: All 4 Azure capabilities true & simulation healthy.")

    # -------------------------------------------------------------------------
    # Check 2: Backend GET /api/health (Route Parity)
    # -------------------------------------------------------------------------
    print("\n[CHECK 2] Probing Backend GET /api/health ...")
    api_health_url = f"{BACKEND_BASE}/api/health"
    status2, _headers2, body2, latency2 = http_get(api_health_url)
    print(f"  HTTP Status: {status2} | Latency: {latency2:.2f}ms")
    assert status2 == 200, f"Expected 200, got {status2}"
    payload2 = json.loads(body2)
    assert payload2.get("status") == "ok"
    assert payload2.get("azure") == azure_caps

    results["checks"]["backend_api_health"] = {
        "status_code": status2,
        "latency_ms": round(latency2, 2),
        "payload": payload2,
        "passed": True
    }
    print("  ✓ Check 2 PASSED: Route /api/health active with identical capabilities.")

    # -------------------------------------------------------------------------
    # Check 3: Simulation Clock & Liveness Progression
    # -------------------------------------------------------------------------
    print("\n[CHECK 3] Verifying Simulation Clock Progression ...")
    t_start = payload.get("matchSeconds", 0.0)
    frame_start = payload.get("frameId", 0)
    time.sleep(2.0)
    _status3, _h3, body3, _ = http_get(health_url)
    payload3 = json.loads(body3)
    t_end = payload3.get("matchSeconds", 0.0)
    frame_end = payload3.get("frameId", 0)
    print(f"  Start: matchSeconds={t_start}, frameId={frame_start}")
    print(f"  After 2.0s: matchSeconds={t_end}, frameId={frame_end}")

    # In 2s at 10Hz/5Hz, frameId or matchSeconds must advance
    delta_s = t_end - t_start
    delta_f = frame_end - frame_start
    print(f"  Delta seconds: {delta_s:.2f}s | Delta frames: {delta_f}")
    assert delta_s > 0 or delta_f > 0, "Simulation clock did not advance!"

    results["checks"]["simulation_progression"] = {
        "start_match_seconds": t_start,
        "end_match_seconds": t_end,
        "start_frame_id": frame_start,
        "end_frame_id": frame_end,
        "delta_seconds": round(delta_s, 2),
        "delta_frames": delta_f,
        "passed": True
    }
    print("  ✓ Check 3 PASSED: Match simulation is actively ticking in real time.")

    # -------------------------------------------------------------------------
    # Check 4: Frontend GET / Root HTML Verification
    # -------------------------------------------------------------------------
    print("\n[CHECK 4] Probing Frontend GET / ...")
    fe_status, fe_headers, fe_html, fe_latency = http_get(FRONTEND_BASE)
    print(f"  HTTP Status: {fe_status} | Latency: {fe_latency:.2f}ms")
    print(f"  Server header: {fe_headers.get('server')}")
    print(f"  Content length: {fe_headers.get('content-length')} bytes")

    assert fe_status == 200, f"Expected 200, got {fe_status}"
    assert "nginx" in fe_headers.get("server", "").lower(), "Server header is not Nginx"
    assert "text/html" in fe_headers.get("content-type", "")

    # Content assertions
    title_match = re.search(r"<title>(.*?)</title>", fe_html)
    assert title_match, "No <title> found in frontend HTML"
    title = title_match.group(1)
    print(f"  Title tag: '{title}'")
    assert "Premier League Studio" in title, f"Title does not contain 'Premier League Studio': {title}"

    assert 'mode="ios"' in fe_html, "Cupertino iOS mode not configured on <html> tag"
    assert '<div id="root"></div>' in fe_html, "Root div not found in HTML"

    # Extract bundle script and css links
    js_match = re.search(r'<script[^>]+src=["\'](/assets/[^"\']+\.js)["\']', fe_html)
    assert js_match, "No main JS bundle found in index.html"
    js_bundle_path = js_match.group(1)
    print(f"  Main JS Bundle: {js_bundle_path}")

    css_match = re.search(r'<link[^>]+href=["\'](/assets/[^"\']+\.css)["\']', fe_html)
    assert css_match, "No main CSS bundle found in index.html"
    css_bundle_path = css_match.group(1)
    print(f"  Main CSS Bundle: {css_bundle_path}")

    results["checks"]["frontend_root"] = {
        "status_code": fe_status,
        "server": fe_headers.get("server"),
        "latency_ms": round(fe_latency, 2),
        "title": title,
        "js_bundle": js_bundle_path,
        "css_bundle": css_bundle_path,
        "passed": True
    }
    print("  ✓ Check 4 PASSED: Frontend HTML, iOS mode, and asset tags verified.")

    # -------------------------------------------------------------------------
    # Check 5: Frontend Static CSS Bundle Verification
    # -------------------------------------------------------------------------
    print("\n[CHECK 5] Fetching Static CSS Bundle ...")
    css_url = f"{FRONTEND_BASE}{css_bundle_path}"
    css_status, css_headers, css_content, css_latency = http_get(css_url)
    print(f"  HTTP Status: {css_status} | Latency: {css_latency:.2f}ms | Size: {len(css_content)} bytes")
    assert css_status == 200, f"Expected 200, got {css_status}"
    assert "text/css" in css_headers.get("content-type", "")
    assert len(css_content) > 10000, "CSS bundle suspiciously small"

    results["checks"]["frontend_css"] = {
        "status_code": css_status,
        "url": css_url,
        "size_bytes": len(css_content),
        "latency_ms": round(css_latency, 2),
        "passed": True
    }
    print("  ✓ Check 5 PASSED: CSS bundle successfully served with correct MIME type.")

    # -------------------------------------------------------------------------
    # Check 6: Frontend Static JS Bundle Verification
    # -------------------------------------------------------------------------
    print("\n[CHECK 6] Fetching Static JS Bundle ...")
    js_url = f"{FRONTEND_BASE}{js_bundle_path}"
    js_status, js_headers, js_content, js_latency = http_get(js_url)
    print(f"  HTTP Status: {js_status} | Latency: {js_latency:.2f}ms | Size: {len(js_content)} bytes")
    assert js_status == 200, f"Expected 200, got {js_status}"
    assert "javascript" in js_headers.get("content-type", "")
    assert len(js_content) > 500000, "JS bundle suspiciously small"

    results["checks"]["frontend_js"] = {
        "status_code": js_status,
        "url": js_url,
        "size_bytes": len(js_content),
        "latency_ms": round(js_latency, 2),
        "passed": True
    }
    print("  ✓ Check 6 PASSED: JavaScript bundle successfully served with correct MIME type.")

    # -------------------------------------------------------------------------
    # Check 7: Frontend Nginx Reverse Proxy GET /api/health
    # -------------------------------------------------------------------------
    print("\n[CHECK 7] Probing Frontend Nginx Reverse Proxy /api/health ...")
    fe_proxy_url = f"{FRONTEND_BASE}/api/health"
    proxy_status, proxy_headers, proxy_body, proxy_latency = http_get(fe_proxy_url)
    print(f"  HTTP Status: {proxy_status} | Latency: {proxy_latency:.2f}ms")
    print(f"  Server header: {proxy_headers.get('server')}")
    assert proxy_status == 200, f"Expected 200, got {proxy_status}"
    proxy_json = json.loads(proxy_body)
    assert proxy_json.get("status") == "ok"
    assert proxy_json.get("azure") == azure_caps
    assert "nginx" in proxy_headers.get("server", "").lower()

    results["checks"]["frontend_reverse_proxy"] = {
        "status_code": proxy_status,
        "server": proxy_headers.get("server"),
        "latency_ms": round(proxy_latency, 2),
        "payload": proxy_json,
        "passed": True
    }
    print("  ✓ Check 7 PASSED: Nginx reverse proxy routes /api/ seamlessly to backend.")

    # -------------------------------------------------------------------------
    # Check 8: Multi-Sample Latency Benchmark
    # -------------------------------------------------------------------------
    print("\n[CHECK 8] Running Multi-Sample Latency Benchmark (5 trials each) ...")
    trials = 5
    backend_latencies: list[float] = []
    frontend_latencies: list[float] = []
    proxy_latencies: list[float] = []

    for _ in range(trials):
        _, _, _, l_be = http_get(health_url)
        _, _, _, l_fe = http_get(FRONTEND_BASE)
        _, _, _, l_px = http_get(fe_proxy_url)
        backend_latencies.append(round(l_be, 2))
        frontend_latencies.append(round(l_fe, 2))
        proxy_latencies.append(round(l_px, 2))
        time.sleep(0.2)

    def stats(vals: list[float]) -> dict[str, Any]:
        s_vals = sorted(vals)
        return {
            "min_ms": s_vals[0],
            "max_ms": s_vals[-1],
            "mean_ms": round(sum(s_vals) / len(s_vals), 2),
            "median_ms": s_vals[len(s_vals) // 2],
            "samples": vals
        }

    be_stats = stats(backend_latencies)
    fe_stats = stats(frontend_latencies)
    px_stats = stats(proxy_latencies)

    print(f"  Backend Direct /health:     Min={be_stats['min_ms']}ms, Mean={be_stats['mean_ms']}ms, Max={be_stats['max_ms']}ms")
    print(f"  Frontend Direct /:          Min={fe_stats['min_ms']}ms, Mean={fe_stats['mean_ms']}ms, Max={fe_stats['max_ms']}ms")
    print(f"  Frontend Proxy /api/health: Min={px_stats['min_ms']}ms, Mean={px_stats['mean_ms']}ms, Max={px_stats['max_ms']}ms")

    results["checks"]["latency_benchmarks"] = {
        "backend_direct_health": be_stats,
        "frontend_direct_root": fe_stats,
        "frontend_proxy_health": px_stats,
        "passed": True
    }
    print("  ✓ Check 8 PASSED: Latency benchmarks recorded.")

    print("\n" + "=" * 80)
    print("AUDIT SUMMARY: ALL CHECKS PASSED (8/8)")
    print("=" * 80)
    return results


if __name__ == "__main__":
    try:
        audit_results = run_audit()
        output_file = "/home/gaurav/gamoventure/organisation/microsoft_hackathon/.agents/worker_m1_health_1/verification_results.json"
        with open(output_file, "w") as f:
            json.dump(audit_results, f, indent=2)
        print(f"\nAudit results successfully saved to: {output_file}")
        sys.exit(0)
    except AssertionError as e:
        print(f"\n❌ AUDIT FAILED (AssertionError): {e}")
        sys.exit(1)
    except (urllib.error.URLError, RuntimeError) as e:
        print(f"\n❌ AUDIT FAILED (Network/Runtime Error): {e}")
        sys.exit(2)
