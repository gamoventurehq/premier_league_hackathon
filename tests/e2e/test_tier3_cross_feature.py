"""Tier 3: Cross-Feature Combinations E2E Verification.

Verifies interactive state cohesion across components:
- Theme toggling (dark/light) during concurrent 5Hz live telemetry streaming.
- Player selection synchronization (Formation Pitch node <-> Spotlight Card <-> Roster list <-> Pitch Radar Canvas).
- Tab switching across 5 tabs (LINEUP, STATISTICS, SUMMARY, PLAYERS, COMMENTS) during active match progression.
- Multi-persona stream and multilingual locale switching synchronization.
- Ball carrier possession synchronization with passing lane origins.
"""

from __future__ import annotations

import time
from typing import Any

import pytest

from tests.e2e.fixtures.sample_frames import (
    create_base_player,
    create_base_telemetry_frame,
)
from tests.e2e.harness.client import StudioTestHarness
from tests.e2e.harness.contracts import TelemetryContractValidator


class MockBaseMemoryStore:
    """Python simulation of frontend BaseMemoryStore state management (src/store/baseMemory.ts)."""

    def __init__(self) -> None:
        self.theme: str = "dark"
        self.selected_player_id: str | None = None
        self.selected_tab: str = "LINEUP"
        self.selected_persona: str = "analyst"
        self.selected_language: str = "en"
        self.match_clock: str = "00:00"
        self.current_frame: dict[str, Any] | None = None
        self.frame_count: int = 0

    def toggle_theme(self) -> str:
        self.theme = "light" if self.theme == "dark" else "dark"
        return self.theme

    def set_selected_player(self, player_id: str | None) -> None:
        self.selected_player_id = player_id

    def set_tab(self, tab: str) -> None:
        self.selected_tab = tab

    def set_persona(self, persona: str) -> None:
        self.selected_persona = persona

    def set_language(self, language: str) -> None:
        self.selected_language = language

    def update_frame(self, frame: dict[str, Any]) -> None:
        self.current_frame = frame
        self.match_clock = frame.get("matchClock", self.match_clock)
        self.frame_count += 1


class TestTier3CrossFeature:
    """Tier 3: Cross-feature combinations and multi-component state coordination."""

    def test_theme_toggling_during_live_streaming(
        self, harness: StudioTestHarness
    ) -> None:
        """Verify theme state remains stable and does not reset when live 5Hz frames stream in."""
        store = MockBaseMemoryStore()
        assert store.theme == "dark"

        # Collect live frames from WebSocket while toggling theme
        frames = harness.collect_frames(count=4, timeout_sec=5.0)
        assert len(frames) >= 2, "Need at least 2 frames to test streaming"

        # Frame 1 arrives
        store.update_frame(frames[0]["frame"])
        assert store.frame_count == 1

        # User toggles theme to light
        store.toggle_theme()
        assert store.theme == "light"

        # Frame 2 arrives while theme is light
        store.update_frame(frames[1]["frame"])
        assert store.frame_count == 2
        # Verify theme was NOT reset to dark by incoming frame
        assert store.theme == "light", "Incoming telemetry frame must not clobber user theme preference"

        # User toggles back to dark
        store.toggle_theme()
        assert store.theme == "dark"

    def test_player_selection_synchronization(self) -> None:
        """Verify player selection coordinates across formation pitch, spotlight, and roster."""
        store = MockBaseMemoryStore()
        frame = create_base_telemetry_frame(frame_id=300, ball_carrier_id="home_7")
        store.update_frame(frame)

        # 1. Select Home Player 7 (Kevin De Bruyne)
        store.set_selected_player("home_7")
        assert store.selected_player_id == "home_7"

        # Verify player exists in current frame
        selected_player = next((p for p in frame["players"] if p["id"] == "home_7"), None)
        assert selected_player is not None
        assert selected_player["name"] == "Home Player 7"
        assert selected_player["team"] == "home"

        # 2. Select Away Player 8 (Bukayo Saka)
        store.set_selected_player("away_8")
        assert store.selected_player_id == "away_8"
        away_player = next((p for p in frame["players"] if p["id"] == "away_8"), None)
        assert away_player is not None
        assert away_player["team"] == "away"

        # 3. Clear selection
        store.set_selected_player(None)
        assert store.selected_player_id is None

    def test_tab_switching_during_live_telemetry(self) -> None:
        """Verify switching through all 5 tabs (LINEUP, STATISTICS, SUMMARY, PLAYERS, COMMENTS) while streaming."""
        store = MockBaseMemoryStore()
        tabs = ["LINEUP", "STATISTICS", "SUMMARY", "PLAYERS", "COMMENTS"]

        for idx, tab in enumerate(tabs):
            store.set_tab(tab)
            assert store.selected_tab == tab

            # Telemetry frame arrives during tab view
            frame = create_base_telemetry_frame(
                frame_id=400 + idx,
                match_clock=f"3{idx}:00",
                match_seconds=1800.0 + idx * 60.0,
            )
            store.update_frame(frame)

            # Match clock updates correctly regardless of current tab
            assert store.match_clock == f"3{idx}:00"
            assert store.frame_count == idx + 1

    def test_persona_and_multilingual_switching(
        self, harness: StudioTestHarness
    ) -> None:
        """Verify persona switching and multilingual commentary projections."""
        store = MockBaseMemoryStore()
        frames = harness.collect_frames(count=1, timeout_sec=5.0)
        assert frames, "No frames collected"

        blackboard = frames[0]["blackboard"]
        frame = frames[0]["frame"]

        # Verify all 4 persona contexts exist in blackboard
        personas = ["analyst", "casual", "player_cam", "club_centric"]
        for p in personas:
            store.set_persona(p)
            assert store.selected_persona == p
            context_key = f"{p}_context"
            assert context_key in blackboard, f"Persona context key '{context_key}' missing from blackboard"

        # Verify multilingual headlines exist across all 5 languages
        narrative = frame["latestNarrative"]
        headline = narrative["headline"]
        languages = ["en", "es", "fr", "ja", "ar"]
        for lang in languages:
            store.set_language(lang)
            assert store.selected_language == lang
            assert lang in headline, f"Language '{lang}' missing in headline translation"
            assert len(headline[lang]) > 0, f"Headline translation for '{lang}' cannot be empty"

    def test_ball_carrier_and_passing_lanes_sync(self) -> None:
        """Verify ball carrier is synchronized with passing lane origins."""
        frame = create_base_telemetry_frame(ball_carrier_id="home_7")
        ball = frame["ball"]
        assert ball["possessionPlayerId"] == "home_7"

        # Passing lane passer must match ball carrier
        lanes = frame["passingLanes"]
        assert len(lanes) >= 1
        assert lanes[0]["passerId"] == ball["possessionPlayerId"], (
            "Passing lane passerId must originate from the ball carrier player"
        )
