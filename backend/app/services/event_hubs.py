"""Azure Event Hubs producer (optional).

The client is created lazily and only when ``AZURE_EVENT_HUBS_CONNECTION_STRING``
and ``AZURE_EVENT_HUBS_NAME`` are configured. When they are not, every publish
call is a logged no-op, so the service runs perfectly with zero Azure
credentials.
"""

from __future__ import annotations

import contextlib
import json
import logging
from typing import Any

from ..config import Settings

logger = logging.getLogger(__name__)


class EventHubsPublisher:
    """Publishes telemetry frames and match events to Azure Event Hubs."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._producer: Any | None = None
        self._warned = False

    @property
    def enabled(self) -> bool:
        return self._settings.event_hubs_enabled

    def _ensure_producer(self) -> Any | None:
        if self._producer is not None:
            return self._producer
        if not self.enabled:
            if not self._warned:
                logger.warning(
                    "Azure Event Hubs is not configured "
                    "(set AZURE_EVENT_HUBS_CONNECTION_STRING and AZURE_EVENT_HUBS_NAME) - "
                    "telemetry frames are not being published to the cloud."
                )
                self._warned = True
            return None
        try:
            from azure.eventhub import EventHubProducerClient  # type: ignore[import-not-found]
        except ImportError:
            logger.warning(
                "The azure-eventhub package is not installed - Event Hubs publishing is disabled. "
                "Install the 'azure' extra to enable it."
            )
            self._warned = True
            return None
        try:
            self._producer = EventHubProducerClient.from_connection_string(
                self._settings.azure_event_hubs_connection_string,
                eventhub_name=self._settings.azure_event_hubs_name,
            )
            logger.info("Azure Event Hubs producer connected to %s", self._settings.azure_event_hubs_name)
        except Exception as exc:  # noqa: BLE001 - never break the stream
            logger.warning("Could not connect to Azure Event Hubs: %s", exc)
            self._producer = None
        return self._producer

    def publish(self, payload: dict[str, Any], partition_key: str | None = None) -> bool:
        """Publish a JSON payload. Returns True when it reached Event Hubs."""
        producer = self._ensure_producer()
        if producer is None:
            return False
        try:
            body = json.dumps(payload, separators=(",", ":"))
            with producer:
                producer.send_event(body, partition_key=partition_key)
            return True
        except Exception as exc:  # noqa: BLE001 - never break the stream
            logger.warning("Event Hubs publish failed: %s", exc)
            return False

    def close(self) -> None:
        if self._producer is not None:
            with contextlib.suppress(Exception):  # noqa: BLE001 - closing must never raise
                self._producer.close()
            self._producer = None


__all__ = ["EventHubsPublisher"]
