import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .models.telemetry import FrameTelemetry
from .engine.simulator import SyntheticMatchSimulator
from .agents.blackboard import SharedTacticalBlackboard

app = FastAPI(
    title="Premier League Studio Insights Engine",
    description="Synthetic Match Insights Engine with Physics-Based Spatial Telemetry and 4-Agent Swarm",
    version="0.1.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

simulator = SyntheticMatchSimulator()
blackboard = SharedTacticalBlackboard()

@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "service": "premier-league-studio-backend",
        "version": "0.1.0",
        "timestamp_clock": simulator.match_clock
    }

@app.get("/api/tactical-state")
async def get_tactical_state():
    return blackboard.model_dump()

@app.get("/api/telemetry/frame", response_model=FrameTelemetry)
async def get_current_frame():
    frame = simulator.generate_frame()
    blackboard.update_state({
        "latest_frame_id": frame.frame_id,
        "current_game_rhythm": frame.game_rhythm,
        "control_index": frame.control_chaos.control,
        "chaos_index": frame.control_chaos.chaos,
        "active_tactical_inflection": frame.active_tactical_inflection
    })
    return frame

@app.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await websocket.accept()
    is_paused = False

    async def receiver():
        nonlocal is_paused
        try:
            while True:
                data = await websocket.receive_text()
                try:
                    msg = json.loads(data)
                    cmd = msg.get("command")
                    if cmd == "pause":
                        is_paused = True
                    elif cmd in ("play", "resume"):
                        is_paused = False
                    elif cmd == "seek":
                        target_sec = float(msg.get("time", 0.0))
                        simulator.match_clock = target_sec
                except Exception:
                    pass
        except (WebSocketDisconnect, asyncio.CancelledError):
            pass

    rx_task = asyncio.create_task(receiver())

    try:
        while True:
            if not is_paused:
                frame = simulator.generate_frame()
                blackboard.update_state({
                    "latest_frame_id": frame.frame_id,
                    "current_game_rhythm": frame.game_rhythm,
                    "control_index": frame.control_chaos.control,
                    "chaos_index": frame.control_chaos.chaos,
                    "active_tactical_inflection": frame.active_tactical_inflection
                })
                payload = {
                    "frame": frame.model_dump(),
                    "blackboard": blackboard.model_dump()
                }
                await websocket.send_text(json.dumps(payload))
            # 5Hz downsampled rate per ADR 0003
            await asyncio.sleep(0.2)
    except (WebSocketDisconnect, asyncio.CancelledError):
        pass
    finally:
        rx_task.cancel()
