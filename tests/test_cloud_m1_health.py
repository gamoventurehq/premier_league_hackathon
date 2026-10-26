"""Test suite for Milestone M1: Live Cloud Service Health & Architecture Audit.

Verifies:
1. Backend GET /health returns HTTP 200 with all 4 Azure capabilities:
   foundry: true, eventHubs: true, cosmos: true, mcp: true.
2. Backend simulation liveness, heartbeat freshness, and clock advancement.
3. Backend GET /api/health route alias parity.
4. Frontend GET / returns HTTP 200 with complete HTML, iOS mode, bundle tags, Nginx.
5. Frontend static assets (CSS, JS) deliver HTTP 200 with valid content types.
6. Frontend Nginx reverse proxy routes /api/health to backend container.
"""

from __future__ import annotations

import json
import re
import time
import urllib.request

BACKEND_BASE = "https://plstudio-backend.bluebeach-f4935620.eastus2.azurecontainerapps.io"
FRONTEND_BASE = "https://plstudio-frontend.bluebeach-f4935620.eastus2.azurecontainerapps.io"


def _fetch(url: str, timeout: float = 15.0) -> tuple[int, dict[str, str], str, float]:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "PLStudio-Pytest-M1/1.0", "Accept": "*/*"}
    )
    t0 = time.perf_counter()
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        latency_ms = (time.perf_counter() - t0) * 1000.0
        body = resp.read().decode("utf-8", errors="replace")
        headers = {k.lower(): v for k, v in resp.headers.items()}
        return resp.status, headers, body, latency_ms


def test_backend_health_azure_capabilities():
    """Verify backend /health returns HTTP 200 with all 4 Azure capabilities enabled."""
    status, _headers, body, _latency = _fetch(f"{BACKEND_BASE}/health")
    assert status == 200
    data = json.loads(body)
    assert data.get("status") == "ok"
    assert data.get("service") == "Premier League Studio Backend"

    azure = data.get("azure", {})
    assert azure.get("foundry") is True, f"foundry must be True, got {azure}"
    assert azure.get("eventHubs") is True, f"eventHubs must be True, got {azure}"
    assert azure.get("cosmos") is True, f"cosmos must be True, got {azure}"
    assert azure.get("mcp") is True, f"mcp must be True, got {azure}"


def test_backend_health_simulation_liveness():
    """Verify backend simulation liveness flags, heartbeat, and error counters."""
    status, _headers, body, _latency = _fetch(f"{BACKEND_BASE}/health")
    assert status == 200
    data = json.loads(body)
    assert data.get("simulationAlive") is True
    assert data.get("ready") is True
    assert data.get("heartbeat_fresh") is True
    assert data.get("alive") is True
    assert data.get("workerError") is None
    assert data.get("worker_errors") == 0
    assert "matchClock" in data
    assert "matchSeconds" in data
    assert data["matchSeconds"] >= 0.0


def test_backend_api_health_parity():
    """Verify /api/health route alias provides exact parity with /health."""
    status, _headers, body, _latency = _fetch(f"{BACKEND_BASE}/api/health")
    assert status == 200
    data = json.loads(body)
    assert data.get("status") == "ok"
    azure = data.get("azure", {})
    assert azure.get("foundry") is True
    assert azure.get("eventHubs") is True
    assert azure.get("cosmos") is True
    assert azure.get("mcp") is True


def test_backend_simulation_clock_advancement():
    """Verify backend simulation clock and frame counter actively increment."""
    _, _, body1, _ = _fetch(f"{BACKEND_BASE}/health")
    d1 = json.loads(body1)
    time.sleep(1.5)
    _, _, body2, _ = _fetch(f"{BACKEND_BASE}/health")
    d2 = json.loads(body2)

    sec_diff = d2.get("matchSeconds", 0.0) - d1.get("matchSeconds", 0.0)
    frame_diff = d2.get("frameId", 0) - d1.get("frameId", 0)
    assert sec_diff > 0 or frame_diff > 0, "Simulation clock did not advance"


def test_frontend_root_delivery():
    """Verify frontend / delivers HTTP 200 HTML with Ionic iOS mode and valid title."""
    status, headers, body, _ = _fetch(FRONTEND_BASE)
    assert status == 200
    assert "nginx" in headers.get("server", "").lower()
    assert "text/html" in headers.get("content-type", "")
    assert "<title>Gamoventure • Premier League Studio | Synthetic Match Insights Engine</title>" in body
    assert 'mode="ios"' in body
    assert '<div id="root"></div>' in body


def test_frontend_static_assets():
    """Verify CSS and JavaScript bundles load with HTTP 200 and valid MIME types."""
    status, _, body, _ = _fetch(FRONTEND_BASE)
    assert status == 200

    css_match = re.search(r'<link[^>]+href=["\'](/assets/[^"\']+\.css)["\']', body)
    assert css_match, "CSS bundle link not found"
    css_path = css_match.group(1)

    js_match = re.search(r'<script[^>]+src=["\'](/assets/[^"\']+\.js)["\']', body)
    assert js_match, "JS bundle link not found"
    js_path = js_match.group(1)

    css_status, css_headers, css_body, _ = _fetch(f"{FRONTEND_BASE}{css_path}")
    assert css_status == 200
    assert "text/css" in css_headers.get("content-type", "")
    assert len(css_body) > 10000

    js_status, js_headers, js_body, _ = _fetch(f"{FRONTEND_BASE}{js_path}")
    assert js_status == 200
    assert "javascript" in js_headers.get("content-type", "")
    assert len(js_body) > 500000


def test_frontend_nginx_reverse_proxy():
    """Verify frontend Nginx reverse proxy routes /api/health to backend."""
    status, headers, body, _ = _fetch(f"{FRONTEND_BASE}/api/health")
    assert status == 200
    assert "nginx" in headers.get("server", "").lower()
    data = json.loads(body)
    assert data.get("status") == "ok"
    azure = data.get("azure", {})
    assert azure.get("foundry") is True
    assert azure.get("eventHubs") is True
    assert azure.get("cosmos") is True
    assert azure.get("mcp") is True
