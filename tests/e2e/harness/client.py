"""StudioTestHarness: Test client wrapper for Premier League Studio backend."""

from __future__ import annotations

import contextlib
import time
from typing import Any, Generator

from starlette.testclient import TestClient
from app.main import app
from app.runtime import MatchRuntime


class StudioTestHarness:
    """End-to-end test harness managing the FastAPI backend lifespan, REST, and WebSocket streams."""

    def __init__(self) -> None:
        self.app = app
        self._client: TestClient | None = None
        self._lifespan_cm: Any = None

    def __enter__(self) -> StudioTestHarness:
        # Starlette TestClient with lifespan context manager initializes background simulation
        self._client = TestClient(self.app)
        self._client.__enter__()
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        if self._client:
            self._client.__exit__(exc_type, exc_val, exc_tb)
            self._client = None

    @property
    def client(self) -> TestClient:
        if self._client is None:
            raise RuntimeError("StudioTestHarness must be used as a context manager (with StudioTestHarness() as h:)")
        return self._client

    @property
    def runtime(self) -> MatchRuntime:
        return self.app.state.runtime

    def get_health(self) -> tuple[int, dict[str, Any]]:
        """Query standard GET /health endpoint."""
        resp = self.client.get("/health")
        return resp.status_code, resp.json()

    def get_api_health(self) -> tuple[int, dict[str, Any]]:
        """Query canonical GET /api/health endpoint alias (R2 requirement)."""
        resp = self.client.get("/api/health")
        return resp.status_code, resp.json()

    def get_scenarios(self) -> tuple[int, list[dict[str, Any]]]:
        """Query GET /scenarios endpoint."""
        resp = self.client.get("/scenarios")
        return resp.status_code, resp.json()

    @contextlib.contextmanager
    def websocket_stream(self) -> Generator[Any, None, None]:
        """Establish a WebSocket connection to ws://localhost:8000/ws/telemetry."""
        with self.client.websocket_connect("/ws/telemetry") as ws:
            yield ws

    def collect_frames(self, count: int = 5, timeout_sec: float = 5.0) -> list[dict[str, Any]]:
        """Collect N consecutive telemetry messages from the live WebSocket stream."""
        frames: list[dict[str, Any]] = []
        deadline = time.time() + timeout_sec
        with self.websocket_stream() as ws:
            while len(frames) < count and time.time() < deadline:
                payload = ws.receive_json()
                frames.append(payload)
        return frames
