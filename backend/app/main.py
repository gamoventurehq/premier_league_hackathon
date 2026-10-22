"""FastAPI application factory for the Premier League Studio backend.

The service starts with **zero** Azure credentials: every Azure client is
created lazily by the modules in ``app/services`` and the synthetic match,
the Pitch Control surface and the agent swarm all run locally.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router as rest_router
from .api.websocket import router as websocket_router
from .config import Settings, get_settings
from .runtime import MatchRuntime

logger = logging.getLogger(__name__)


def configure_logging(settings: Settings) -> None:
    logging.basicConfig(
        level=getattr(logging, settings.log_level, logging.INFO),
        format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
    )


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build the FastAPI application."""
    settings = settings or get_settings()
    configure_logging(settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        runtime = MatchRuntime(settings)
        app.state.runtime = runtime
        runtime.start()
        logger.info(
            "%s %s started (Azure: %s).",
            settings.app_name,
            settings.service_version,
            ", ".join(name for name, on in settings.azure_capabilities().items() if on) or "none configured",
        )
        try:
            yield
        finally:
            runtime.stop()

    app = FastAPI(
        title=settings.app_name,
        version=settings.service_version,
        description=(
            "Synthetic match telemetry, Pitch Control metrics, the four-agent narrative swarm "
            "and the Stage 4 Broadcast Overlay for the Microsoft Premier League Hackathon."
        ),
        lifespan=lifespan,
    )

    origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins or ["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(rest_router)
    app.include_router(websocket_router)

    @app.get("/", include_in_schema=False)
    async def index() -> dict[str, str]:
        return {
            "service": settings.app_name,
            "version": settings.service_version,
            "health": "/health",
            "websocket": "/ws/telemetry",
            "docs": "/docs",
        }

    return app


app = create_app()

__all__ = ["app", "create_app"]
