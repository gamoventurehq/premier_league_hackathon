"""WebSocket telemetry stream (ADR 0003 - 5 Hz publication of a 10 Hz engine)."""

from __future__ import annotations

import asyncio
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..models import ExperiencePersona, SyntheticScenarioType

logger = logging.getLogger(__name__)

router = APIRouter()

#: The WebSocket publishes the downsampled 5 Hz frame.
PUBLISH_INTERVAL_SECONDS = 0.2


@router.websocket("/ws/telemetry")
async def telemetry_stream(websocket: WebSocket) -> None:
    """Stream the TelemetryFrame to a studio client.

    The published envelope is::

        {"frame": <TelemetryFrame>, "blackboard": {...}, "sentAtMs": <epoch ms>}

    ``sentAtMs`` is the wall-clock time the backend published the frame, so
    the studio can report the real round trip latency.

    Client messages::

        {"type": "set_scenario", "scenario": "low_block_siege"}
        {"type": "set_persona", "persona": "analyst"}
    """
    await websocket.accept()
    runtime = getattr(websocket.app.state, "runtime", None)
    if runtime is None:
        await websocket.close(code=1011, reason="The simulation runtime is not available.")
        return

    scenario = websocket.query_params.get("scenario")
    if scenario:
        try:
            runtime.set_scenario(SyntheticScenarioType(scenario))
        except ValueError:
            logger.warning("Ignoring unknown Synthetic Match Scenario: %s", scenario)

    persona = websocket.query_params.get("persona")
    if persona:
        try:
            runtime.set_persona(ExperiencePersona(persona))
        except ValueError:
            logger.warning("Ignoring unknown experience persona: %s", persona)

    await asyncio.to_thread(runtime.wait_until_ready, 60.0)

    async def receiver() -> None:
        while True:
            message = await websocket.receive_text()
            try:
                payload = json.loads(message)
            except json.JSONDecodeError:
                logger.warning("Ignoring malformed client message: %s", message)
                continue
            await _handle_client_message(runtime, payload)

    reader = asyncio.create_task(receiver())
    last_frame_id = -1
    try:
        while True:
            envelope = runtime.latest_envelope()
            if envelope is not None:
                frame = envelope["frame"]
                if frame.get("frameId") != last_frame_id:
                    last_frame_id = frame["frameId"]
                    await websocket.send_json(envelope)
            await asyncio.sleep(PUBLISH_INTERVAL_SECONDS)
    except WebSocketDisconnect:
        logger.info("Telemetry client disconnected.")
    except Exception:  # noqa: BLE001
        logger.exception("The telemetry stream failed.")
    finally:
        reader.cancel()


async def _handle_client_message(runtime, payload: dict) -> None:
    """Apply a control message sent by the client."""
    message_type = payload.get("type")
    if message_type == "set_scenario":
        try:
            runtime.set_scenario(SyntheticScenarioType(str(payload.get("scenario"))))
        except ValueError:
            logger.warning("Ignoring unknown Synthetic Match Scenario: %s", payload.get("scenario"))
    elif message_type == "set_persona":
        try:
            runtime.set_persona(ExperiencePersona(str(payload.get("persona"))))
        except ValueError:
            logger.warning("Ignoring unknown experience persona: %s", payload.get("persona"))


__all__ = ["PUBLISH_INTERVAL_SECONDS", "router"]
