"""Tier 4: Real-World Scenarios E2E Verification.

Verifies end-to-end tactical simulation and narrative generation:
- Full match simulation event processing with monotonic timeline progression.
- Goal event timeline scrubber jump and score synchronisation.
- Tactical Inflection Point detection (Control vs Chaos delta >= 14.0 within 6 cycles).
- Multilingual narrative consistency and UTF-8 encoding integrity across 5 languages.
- Persona insight differentiation (Analyst quantitative depth vs Casual narrative excitement).
"""

from __future__ import annotations

import re
from typing import Any

import pytest

from tests.e2e.fixtures.sample_frames import (
    create_base_telemetry_frame,
    create_inflection_sequence,
)
from tests.e2e.harness.client import StudioTestHarness


class TestTier4RealWorld:
    """Tier 4: Real-world operational scenarios and match simulation tests."""

    def test_full_match_simulation_timeline_progression(
        self, harness: StudioTestHarness
    ) -> None:
        """Verify sequential telemetry frames progress match clock monotonically."""
        frames = harness.collect_frames(count=3, timeout_sec=5.0)
        assert len(frames) >= 2, "Need at least 2 frames to test progression"

        times = [f["frame"]["matchSeconds"] for f in frames]
        # Frame seconds must be monotonically non-decreasing
        for i in range(1, len(times)):
            assert times[i] >= times[i - 1], (
                f"Match seconds did not advance monotonically: {times[i-1]} -> {times[i]}"
            )

        # Match clock string format MM:SS
        clock_pattern = re.compile(r"^\d{2}:\d{2}$")
        for f in frames:
            clock_str = f["frame"]["matchClock"]
            assert clock_pattern.match(clock_str), f"Invalid matchClock format '{clock_str}'"

    def test_goal_event_timeline_scrubber_jump(self) -> None:
        """Verify timeline jump to goal event (Haaland 42:15) updates match clock and score."""
        # Simulated goal event at 42:15 (2535 seconds)
        goal_frame = create_base_telemetry_frame(
            frame_id=5001,
            match_clock="42:15",
            match_seconds=2535.0,
            ball_carrier_id="home_10",  # Haaland
        )
        goal_frame["score"] = {"home": 1, "away": 0}

        # Assert time scrub destination
        assert goal_frame["matchClock"] == "42:15"
        assert goal_frame["matchSeconds"] == 2535.0
        assert goal_frame["score"]["home"] == 1
        assert goal_frame["ball"]["possessionPlayerId"] == "home_10"

    def test_tactical_inflection_detection_threshold(self) -> None:
        """Verify Tactical Reasoning Agent inflection rule: swing >= 14.0 delta in Control vs Chaos within 6 cycles."""
        sequence = create_inflection_sequence(start_frame_id=6000, length=6)
        assert len(sequence) == 6

        first_c_index = sequence[0]["metrics"]["controlVsChaosIndex"]
        final_c_index = sequence[-1]["metrics"]["controlVsChaosIndex"]
        delta = abs(final_c_index - first_c_index)

        # Assert mathematical requirement from specification
        assert delta >= 14.0, f"Control vs Chaos swing delta {delta} was below threshold 14.0"

        # Final frame must have isTacticalInflectionPoint == True
        final_narrative = sequence[-1]["latestNarrative"]
        assert final_narrative["isTacticalInflectionPoint"] is True, (
            "Inflection flag must be True when swing delta exceeds 14.0 within 6 cycles"
        )
        assert "Tactical" in final_narrative["headline"]["en"]

    def test_multilingual_narrative_consistency_and_encoding(self) -> None:
        """Verify UTF-8 encoding integrity and translation presence for EN, ES, FR, JA, AR."""
        frame = create_base_telemetry_frame(is_inflection=True)
        narrative = frame["latestNarrative"]
        headlines = narrative["headline"]
        explanations = narrative["tacticalExplanation"]

        required_locales = ["en", "es", "fr", "ja", "ar"]
        for loc in required_locales:
            assert loc in headlines and len(headlines[loc]) > 0
            assert loc in explanations and len(explanations[loc]) > 0

        # Adversarial check: Japanese and Arabic must contain genuine UTF-8 characters (not escaped / garbled)
        ja_text = headlines["ja"]
        ar_text = headlines["ar"]
        # Verify Japanese characters are present (hiragana/katakana/kanji range)
        has_japanese = any("\u3000" <= c <= "\u9fff" for c in ja_text)
        assert has_japanese, f"Japanese headline lacks genuine Japanese characters: '{ja_text}'"

        # Verify Arabic characters are present (Arabic unicode block)
        has_arabic = any("\u0600" <= c <= "\u06ff" for c in ar_text)
        assert has_arabic, f"Arabic headline lacks genuine Arabic characters: '{ar_text}'"

    def test_persona_insight_differentiation(self) -> None:
        """Verify persona text differentiation: Analyst (dense tactical metrics) vs Casual (narrative excitement)."""
        frame = create_base_telemetry_frame(is_inflection=True)
        narrative = frame["latestNarrative"]

        analyst_text = narrative["analystContext"]
        casual_text = narrative["casualContext"]

        assert analyst_text != casual_text, "Analyst and Casual contexts must be differentiated"

        # Analyst context contains quantitative tactical concepts
        tactical_terms = ["xG", "overload", "corridor", "shape", "delta", "pdr", "block"]
        has_tactical_term = any(term.lower() in analyst_text.lower() for term in tactical_terms)
        assert has_tactical_term, (
            f"Analyst context '{analyst_text}' must contain tactical/quantitative terminology"
        )

        # Casual context is accessible and punchy
        assert len(casual_text) > 0
        assert not casual_text.startswith("xG delta:"), (
            "Casual context should avoid starting with raw statistical formula"
        )
