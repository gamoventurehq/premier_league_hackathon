from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

class SharedTacticalBlackboard(BaseModel):
    """
    ADR 0002 & ADR 0006: In-memory shared tactical state accessible to the 4-agent swarm:
    1. Telemetry Ingestion Agent
    2. Tactical Reasoning Agent
    3. Broadcast Narrative Agent
    4. Fan Personalization Agent
    """
    latest_frame_id: int = 0
    current_game_rhythm: str = "structured_possession"
    control_index: float = 65.0
    chaos_index: float = 35.0
    active_tactical_inflection: bool = False
    latest_pdr: float = Field(0.42, description="Pass Difficulty Rating (0.0 to 1.0)")
    narrative_headline: str = "High pressing defensive structure holding firm"
    persona_overviews: Dict[str, str] = {
        "analyst": "Defensive block compact in central channel (width 28m), forcing circulation out wide.",
        "casual": "Massive defensive pressure! The backline isn't giving an inch.",
        "player_cam": "Tracking Home Player 7: sprint velocity peaked at 28.4 km/h during transition run."
    }

    def update_state(self, updates: Dict[str, Any]) -> None:
        for k, v in updates.items():
            if hasattr(self, k):
                setattr(self, k, v)
