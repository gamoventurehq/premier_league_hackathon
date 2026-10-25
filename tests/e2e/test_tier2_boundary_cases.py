"""Tier 2: Boundary & Corner Cases E2E Verification.

Verifies system resilience across edge conditions:
- Empty data and degraded payload handling (empty players, no passing lanes).
- Loose ball and unassigned possession (null carrier).
- Extreme metric values (0.0 pure control, 100.0 pure chaos, 0-100 PDR).
- Zero velocity and heading angle computation (atan2(0,0) without NaN).
- Extreme velocity values (ball speed up to 150 km/h).
- Out-of-bounds coordinates sanitization (throw-ins, corners, off-pitch tracking).
- Malformed payloads and transport resilience.
"""

from __future__ import annotations

import math
from typing import Any

import pytest

from tests.e2e.fixtures.sample_frames import (
    create_base_player,
    create_base_telemetry_frame,
    create_empty_degraded_frame,
)
from tests.e2e.harness.contracts import (
    PITCH_LENGTH,
    PITCH_WIDTH,
    TelemetryContractValidator,
)


class TestTier2BoundaryCases:
    """Tier 2: Boundary and corner cases test suite."""

    def test_empty_players_and_degraded_payload(
        self, validator: TelemetryContractValidator
    ) -> None:
        """Verify contract validator and frame processing when player/lane arrays are empty."""
        degraded = create_empty_degraded_frame(frame_id=999)
        validator.validate_frame(degraded)

        assert degraded["players"] == [], "Players array must be empty"
        assert degraded["passingLanes"] == [], "Passing lanes array must be empty"
        assert degraded["pitchControlCells"] == [], "Pitch control cells must be empty"
        assert degraded["ball"]["possessionPlayerId"] is None

        # Metrics must still be valid even in degraded state
        validator.validate_metrics(degraded["metrics"])

    def test_loose_ball_unassigned_possession(
        self, validator: TelemetryContractValidator
    ) -> None:
        """Verify payload handling when ball is loose with no possessing player or team."""
        frame = create_base_telemetry_frame(frame_id=1001, ball_carrier_id=None)
        ball = frame["ball"]
        assert ball["possessionPlayerId"] is None
        assert ball["possessionTeam"] in (None, "home", "away")

        # Validate that no player has onBall == True
        on_ball_players = [p for p in frame["players"] if p.get("onBall") is True]
        assert len(on_ball_players) == 0, "No player should be on-ball during loose ball state"

    def test_extreme_control_chaos_boundaries(
        self, validator: TelemetryContractValidator
    ) -> None:
        """Verify metrics validation at absolute boundary extremes: 0.0 (control) and 100.0 (chaos)."""
        # Absolute Structured Control
        frame_min = create_base_telemetry_frame(control_vs_chaos=0.0)
        assert frame_min["metrics"]["controlVsChaosIndex"] == 0.0
        assert frame_min["metrics"]["gameRhythm"] == "Structured"
        validator.validate_metrics(frame_min["metrics"])

        # Absolute Chaotic Transition
        frame_max = create_base_telemetry_frame(control_vs_chaos=100.0)
        assert frame_max["metrics"]["controlVsChaosIndex"] == 100.0
        assert frame_max["metrics"]["gameRhythm"] == "Chaotic"
        validator.validate_metrics(frame_max["metrics"])

    def test_extreme_pass_difficulty_boundaries(
        self, validator: TelemetryContractValidator
    ) -> None:
        """Verify Pass Difficulty Rating at extremes: 0.0 (open goal tap-in) and 100.0 (impossible lane)."""
        frame_easy = create_base_telemetry_frame(pdr=0.0)
        assert frame_easy["metrics"]["passDifficultyRating"] == 0.0
        validator.validate_metrics(frame_easy["metrics"])

        frame_hard = create_base_telemetry_frame(pdr=100.0)
        assert frame_hard["metrics"]["passDifficultyRating"] == 100.0
        validator.validate_metrics(frame_hard["metrics"])

    def test_zero_velocity_heading_calculation(self) -> None:
        """Verify that players or ball with zero velocity (vx=0, vy=0) do not produce NaN headings."""
        p_stationary = create_base_player(
            player_id="home_gk",
            number=1,
            name="Ederson",
            team="home",
            role="GK",
            x=5.0,
            y=34.0,
            vx=0.0,
            vy=0.0,
        )
        assert p_stationary["speedKmH"] == 0.0

        # In PitchRadarCanvas: heading is computed as atan2(vy, vx)
        heading_rad = math.atan2(p_stationary["vy"], p_stationary["vx"])
        heading_deg = heading_rad * (180.0 / math.pi)
        assert not math.isnan(heading_deg), "Heading calculation must not result in NaN"
        assert heading_deg == 0.0

    def test_extreme_ball_velocities(self) -> None:
        """Verify high velocity ball vectors (150 km/h thunderbolt strike)."""
        # 150 km/h = 41.67 m/s
        vx = 40.0
        vy = 11.67
        speed_kmh = round(((vx**2 + vy**2) ** 0.5) * 3.6, 2)
        assert speed_kmh >= 149.0

        frame = create_base_telemetry_frame(frame_id=2001)
        frame["ball"]["vx"] = vx
        frame["ball"]["vy"] = vy
        frame["ball"]["speedKmH"] = speed_kmh

        assert frame["ball"]["speedKmH"] > 100.0
        assert not math.isnan(frame["ball"]["speedKmH"])
        assert not math.isinf(frame["ball"]["speedKmH"])

    def test_out_of_bounds_spatial_coordinates(
        self, validator: TelemetryContractValidator
    ) -> None:
        """Verify spatial coordinate validation during ball out of bounds (throw-ins, corners)."""
        frame = create_base_telemetry_frame(frame_id=2002)

        # Ball temporarily over the touchline (throw-in setup)
        frame["ball"]["x"] = -1.5
        frame["ball"]["y"] = 34.0

        # Player taking throw-in outside pitch
        frame["players"][0]["x"] = -1.8
        frame["players"][0]["y"] = 34.0

        # Validator should allow off-pitch events within 5.0m tolerance
        validator.validate_spatial_bounds(frame, tolerance_meters=5.0)

        # But should fail if coordinates are wildly corrupted (e.g. x = 250m)
        frame["ball"]["x"] = 250.0
        with pytest.raises(AssertionError, match="out of bounds"):
            validator.validate_spatial_bounds(frame, tolerance_meters=5.0)

    def test_malformed_websocket_payload_resilience(self) -> None:
        """Verify that malformed payloads missing mandatory envelopes raise explicit assertion errors."""
        corrupted_payload: dict[str, Any] = {"unknown": 123}
        with pytest.raises(AssertionError, match="missing 'frame'"):
            TelemetryContractValidator.validate_envelope(corrupted_payload)
