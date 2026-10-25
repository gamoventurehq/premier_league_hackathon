"""Cosmos DB overlay store (optional).

Broadcast Overlay payloads are persisted to Cosmos DB when the service is
configured with ``COSMOS_DB_ACCOUNT``. Without configuration the store is a
logged no-op.
"""

from __future__ import annotations

import contextlib
import logging
from typing import Any

from ..config import Settings
from ..models import BroadcastOverlayPayload

logger = logging.getLogger(__name__)


class OverlayStore:
    """Persists Broadcast Overlay payloads to Cosmos DB when configured."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client: Any | None = None
        self._container: Any | None = None
        self._warned = False

    @property
    def enabled(self) -> bool:
        return self._settings.cosmos_enabled

    def _ensure_container(self) -> Any | None:
        if self._container is not None:
            return self._container
        if not self.enabled:
            if not self._warned:
                logger.warning(
                    "Cosmos DB is not configured (set COSMOS_DB_ACCOUNT) - Broadcast Overlay "
                    "payloads are not being persisted."
                )
                self._warned = True
            return None
        try:
            from azure.cosmos import CosmosClient  # type: ignore[import-not-found]
        except ImportError:
            logger.warning(
                "The azure-cosmos package is not installed - Broadcast Overlay persistence is disabled. "
                "Install the 'azure' extra to enable it."
            )
            self._warned = True
            return None
        try:
            credential = self._settings.cosmos_db_key or self._settings.azure_openai_api_key or None
            self._client = CosmosClient(
                self._settings.cosmos_db_account,
                credential=credential,
            )
            database = self._client.create_database_if_not_exists(id=self._settings.cosmos_db_database)
            self._container = database.create_container_if_not_exists(
                id=self._settings.cosmos_db_container,
                partition_key={"paths": ["/overlayId"], "kind": "Hash"},
            )
            logger.info("Cosmos DB overlay store connected to %s", self._settings.cosmos_db_container)
        except Exception as exc:  # noqa: BLE001 - never break the stream
            logger.warning("Could not connect to Cosmos DB: %s", exc)
            self._container = None
        return self._container

    def store(self, overlay: BroadcastOverlayPayload) -> bool:
        """Persist an overlay payload. Returns True when it was stored."""
        container = self._ensure_container()
        if container is None:
            return False
        try:
            doc = overlay.model_dump(mode="json")
            if "id" not in doc:
                doc["id"] = overlay.overlayId
            container.upsert_item(doc)
            return True
        except Exception as exc:  # noqa: BLE001 - never break the stream
            logger.warning("Cosmos DB upsert failed: %s", exc)
            return False

    def close(self) -> None:
        if self._client is not None:
            with contextlib.suppress(Exception):  # noqa: BLE001 - closing must never raise
                self._client.close()
            self._client = None
            self._container = None


__all__ = ["OverlayStore"]
