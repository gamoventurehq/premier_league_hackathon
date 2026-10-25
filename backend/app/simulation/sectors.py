"""Tactical pitch sector resolution following Premier League 5-channel and landmark standards."""

from __future__ import annotations

import math
from ..models import TeamSide


def resolve_pitch_sector(x: float, y: float, team: TeamSide | None = None) -> str:
    """Resolve an (x, y) pitch coordinate to a canonical tactical pitch sector name.

    Pitch dimensions: 105.0m x 68.0m.
    Home attacks towards +x (105.0, 34.0), Away attacks towards -x (0.0, 34.0).
    """
    # 1. Corner Quadrants
    if (x <= 3.0 or x >= 102.0) and (y <= 3.0 or y >= 65.0):
        return "Corner Quadrant"

    # 2. Six-Yard Box / Goal Mouth
    if (x <= 5.5 or x >= 99.5) and (24.84 <= y <= 43.16):
        return "Goal Mouth"

    # 3. Penalty Spot
    if math.hypot(x - 11.0, y - 34.0) <= 4.0 or math.hypot(x - 94.0, y - 34.0) <= 4.0:
        return "Penalty Spot"

    # 4. Penalty Area
    if (x <= 16.5 or x >= 88.5) and (13.84 <= y <= 54.16):
        if y < 24.84:
            return "Left Penalty Area"
        if y > 43.16:
            return "Right Penalty Area"
        return "Central Penalty Area"

    # 5. Deep Defensive Corridor (Central defensive 22m)
    if (x <= 22.0 or x >= 83.0) and (20.0 <= y <= 48.0):
        return "Deep Defensive Corridor"

    # 6. Zone 14 / Edge of the Box (Golden creation corridor just outside 18-yard box)
    if ((16.5 < x <= 28.0) or (77.0 <= x < 88.5)) and (22.0 <= y <= 46.0):
        return "Zone 14 (Edge of the Box)"

    # 7. Standard 5-Channel Lateral Zones
    if y < 13.6:
        channel = "Left Flank"
    elif y < 27.2:
        channel = "Left Half-Space"
    elif y <= 40.8:
        channel = "Central Corridor"
    elif y <= 54.4:
        channel = "Right Half-Space"
    else:
        channel = "Right Flank"

    # 8. Longitudinal Third & Corridor resolution
    if 35.0 <= x <= 70.0:
        if channel == "Central Corridor":
            return "Central Midfield Corridor"
        return channel

    if x > 70.0:
        third = "Attacking Third" if (team is None or team == TeamSide.HOME) else "Defensive Third"
    else:
        third = "Defensive Third" if (team is None or team == TeamSide.HOME) else "Attacking Third"

    if channel in ("Left Half-Space", "Right Half-Space"):
        return channel
    return f"{third} - {channel}"


__all__ = ["resolve_pitch_sector"]
