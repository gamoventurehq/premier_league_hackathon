import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.models.telemetry import PITCH_LENGTH_METERS, PITCH_WIDTH_METERS

@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "premier-league-studio-backend"

@pytest.mark.asyncio
async def test_get_frame_telemetry():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/telemetry/frame")
    assert response.status_code == 200
    frame = response.json()
    assert "ball" in frame
    assert "players" in frame
    assert len(frame["players"]) == 22
    assert 0.0 <= frame["ball"]["x"] <= PITCH_LENGTH_METERS
    assert 0.0 <= frame["ball"]["y"] <= PITCH_WIDTH_METERS

@pytest.mark.asyncio
async def test_tactical_state():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/tactical-state")
    assert response.status_code == 200
    state = response.json()
    assert "current_game_rhythm" in state
    assert "persona_overviews" in state
