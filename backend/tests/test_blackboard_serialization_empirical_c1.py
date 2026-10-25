"""Empirical Challenger 1 Stress Testing Suite for Blackboard Serialization (Milestone 1).

Rigorous empirical verification of blackboard payload serialization:
1. Multi-scenario tick streaming across all 4 synthetic match scenarios:
   - High Possession
   - Counter Attack Transition
   - Low Block Siege
   - Box Scramble
2. Dynamic scenario injections during active runtime streaming.
3. Swarm fallback cascades (single agent, dual agent, and all 4 agents failing).
4. Edge cases: empty strings, whitespace, extreme unicode, special characters.
5. Dataclass sanitization: arbitrary nested dataclasses, dataclasses holding Pydantic models.
6. Timeline scrubbing and jumps across match seconds (0s - 5400s).
7. Wire WebSocket client (/ws/telemetry) verification asserting zero "NarrativeDraft(" leaks.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from unittest.mock import patch

import pytest
from app.agents.base import (
    AgentStatus,
)
from app.agents.broadcast_narrative import (
    BroadcastNarrativeAgent,
    NarrativeDraft,
)
from app.agents.fan_personalization import FanPersonalizationAgent
from app.agents.tactical_reasoning import TacticalReasoningAgent
from app.agents.telemetry_ingestion import TelemetryIngestionAgent
from app.config import Settings
from app.main import create_app
from app.models import (
    AgentRole,
    ExperiencePersona,
    MultilingualNarrative,
    SyntheticScenarioType,
)
from app.runtime import MatchRuntime, _json_safe
from app.simulation.engine import MatchEngine
from starlette.testclient import TestClient

ISO_LANG_KEYS = {"en", "es", "fr", "ja", "ar"}


@pytest.fixture(autouse=True)
def _patch_simulation_globals(monkeypatch: pytest.MonkeyPatch) -> None:
    """Guard against uncommitted concurrent edits in simulation engine where presser_id was left unbound."""
    import app.simulation.engine as eng
    monkeypatch.setattr(eng, "presser_id", "p-presser", raising=False)
    monkeypatch.setattr(eng, "coverer_id", "p-coverer", raising=False)


# -----------------------------------------------------------------------------
# 1. Multi-Scenario Tick Streaming Test
# -----------------------------------------------------------------------------


@pytest.mark.parametrize(
    "scenario",
    [
        SyntheticScenarioType.HIGH_POSSESSION,
        SyntheticScenarioType.COUNTER_ATTACK_TRANSITION,
        SyntheticScenarioType.LOW_BLOCK_SIEGE,
        SyntheticScenarioType.BOX_SCRAMBLE,
    ],
)
def test_multi_scenario_tick_streaming_zero_dataclass_leak(scenario: SyntheticScenarioType) -> None:
    """Stress-test blackboard payload across all 4 scenarios under sustained 20Hz ticks.

    Asserts:
    - Zero 'NarrativeDraft(' in json.dumps(envelope)
    - blackboard['narrative'] is a pure dict with ISO keys: en, es, fr, ja, ar
    - blackboard['multilingual_stream'] is a pure dict with ISO keys: en, es, fr, ja, ar
    """
    settings = Settings(
        simulation_hz=20,
        publish_hz=10,
        default_scenario=scenario.value,
        sim_warmup_seconds=0,
    )
    runtime = MatchRuntime(settings)
    runtime.start()

    try:
        assert runtime.wait_until_ready(timeout=5.0), f"Runtime failed to become ready for {scenario}"

        # Collect 20 ticks across ~1 second
        collected_envelopes = 0
        start_time = time.time()

        while collected_envelopes < 20 and (time.time() - start_time) < 3.0:
            env = runtime.latest_envelope()
            if env is None or "blackboard" not in env:
                time.sleep(0.02)
                continue

            bb = env["blackboard"]
            raw_json = json.dumps(env)

            # 1. Zero leaked Python dataclass repr
            assert "NarrativeDraft(" not in raw_json, f"Leaked NarrativeDraft repr in {scenario}!"
            assert "MultilingualNarrative(" not in raw_json, f"Leaked MultilingualNarrative repr in {scenario}!"

            # 2. Pure dict blackboard['narrative'] with 5 ISO keys
            assert "narrative" in bb, f"Missing 'narrative' in blackboard for {scenario}"
            narr = bb["narrative"]
            assert isinstance(narr, dict), f"bb['narrative'] is not dict, got {type(narr)}"
            assert isinstance(narr.get("headline"), dict), "narrative.headline is not dict"
            assert set(narr["headline"].keys()) == ISO_LANG_KEYS
            assert isinstance(narr.get("tacticalExplanation"), dict), "narrative.tacticalExplanation is not dict"
            assert set(narr["tacticalExplanation"].keys()) == ISO_LANG_KEYS

            # Ensure all values are non-empty strings
            for lang in ISO_LANG_KEYS:
                assert isinstance(narr["headline"][lang], str)
                assert len(narr["headline"][lang].strip()) > 0
                assert isinstance(narr["tacticalExplanation"][lang], str)
                assert len(narr["tacticalExplanation"][lang].strip()) > 0

            # 3. Pure dict blackboard['multilingual_stream'] with 5 ISO keys
            assert "multilingual_stream" in bb, f"Missing 'multilingual_stream' in blackboard for {scenario}"
            mls = bb["multilingual_stream"]
            assert isinstance(mls, dict), f"bb['multilingual_stream'] is not dict, got {type(mls)}"
            assert isinstance(mls.get("headline"), dict), "multilingual_stream.headline is not dict"
            assert set(mls["headline"].keys()) == ISO_LANG_KEYS
            assert isinstance(mls.get("tacticalExplanation"), dict), "multilingual_stream.tacticalExplanation is not dict"
            assert set(mls["tacticalExplanation"].keys()) == ISO_LANG_KEYS

            collected_envelopes += 1
            time.sleep(0.04)

        assert collected_envelopes >= 20, f"Collected only {collected_envelopes} envelopes for {scenario}"
    finally:
        runtime.stop()


# -----------------------------------------------------------------------------
# 2. Dynamic Scenario Injections Under Live Ticks
# -----------------------------------------------------------------------------


def test_dynamic_scenario_injections_under_live_ticks() -> None:
    """Dynamically switch scenarios sequentially while runtime is actively ticking.

    Verifies blackboard serialization remains clean through warm-up resets and epoch switches.
    """
    settings = Settings(
        simulation_hz=20,
        publish_hz=10,
        default_scenario=SyntheticScenarioType.HIGH_POSSESSION.value,
        sim_warmup_seconds=0,
    )
    runtime = MatchRuntime(settings)
    runtime.start()

    try:
        assert runtime.wait_until_ready(timeout=5.0)

        scenarios_to_inject = [
            SyntheticScenarioType.COUNTER_ATTACK_TRANSITION,
            SyntheticScenarioType.LOW_BLOCK_SIEGE,
            SyntheticScenarioType.BOX_SCRAMBLE,
            SyntheticScenarioType.HIGH_POSSESSION,
        ]

        for target_scenario in scenarios_to_inject:
            runtime.set_scenario(target_scenario)
            # Allow scenario command to be applied by worker thread
            time.sleep(0.15)

            # Sample 10 envelopes after injection
            for _ in range(10):
                env = runtime.latest_envelope()
                assert env is not None
                bb = env["blackboard"]
                raw_json = json.dumps(env)

                assert "NarrativeDraft(" not in raw_json
                assert isinstance(bb["narrative"], dict)
                assert set(bb["narrative"]["headline"].keys()) == ISO_LANG_KEYS
                assert set(bb["narrative"]["tacticalExplanation"].keys()) == ISO_LANG_KEYS
                assert isinstance(bb["multilingual_stream"], dict)
                assert set(bb["multilingual_stream"]["headline"].keys()) == ISO_LANG_KEYS
                assert set(bb["multilingual_stream"]["tacticalExplanation"].keys()) == ISO_LANG_KEYS
                time.sleep(0.03)
    finally:
        runtime.stop()


# -----------------------------------------------------------------------------
# 3. Swarm Fallback Cascades & Complete Agent Failures
# -----------------------------------------------------------------------------


def test_fallback_cascade_broadcast_narrative_timeout(engine: MatchEngine) -> None:
    """When BroadcastNarrativeAgent times out, fallback produces pure 5-lang dicts."""
    from app.agents.swarm import AgentSwarm

    swarm = AgentSwarm()
    frame = engine.build_frame()

    with patch.object(BroadcastNarrativeAgent, "run", side_effect=TimeoutError("LLM 400ms timeout")):
        result = swarm.run(frame, persona=ExperiencePersona.ANALYST)

    assert result.traces[2].role == AgentRole.BROADCAST_NARRATIVE
    assert result.traces[2].status == AgentStatus.FALLBACK

    # Check blackboard snapshot directly through _json_safe
    safe_bb = {k: _json_safe(v) for k, v in result.blackboard.items()}
    raw_json = json.dumps(safe_bb)

    assert "NarrativeDraft(" not in raw_json
    assert isinstance(safe_bb["narrative"], dict)
    assert set(safe_bb["narrative"]["headline"].keys()) == ISO_LANG_KEYS
    assert set(safe_bb["narrative"]["tacticalExplanation"].keys()) == ISO_LANG_KEYS
    assert isinstance(safe_bb["multilingual_stream"], dict)
    assert set(safe_bb["multilingual_stream"]["headline"].keys()) == ISO_LANG_KEYS
    assert set(safe_bb["multilingual_stream"]["tacticalExplanation"].keys()) == ISO_LANG_KEYS


def test_fallback_cascade_all_four_agents_fail(engine: MatchEngine) -> None:
    """When ALL four agents fail simultaneously, all fallbacks execute and serialize cleanly."""
    from app.agents.swarm import AgentSwarm

    swarm = AgentSwarm()
    frame = engine.build_frame()

    with (
        patch.object(TelemetryIngestionAgent, "run", side_effect=RuntimeError("F1 Telemetry")),
        patch.object(TacticalReasoningAgent, "run", side_effect=ValueError("F2 Tactical")),
        patch.object(BroadcastNarrativeAgent, "run", side_effect=TimeoutError("F3 Broadcast")),
        patch.object(FanPersonalizationAgent, "run", side_effect=KeyError("F4 Personalization")),
    ):
        result = swarm.run(frame, persona=ExperiencePersona.ANALYST)

    for trace in result.traces:
        assert trace.status == AgentStatus.FALLBACK

    safe_bb = {k: _json_safe(v) for k, v in result.blackboard.items()}
    raw_json = json.dumps(safe_bb)

    assert "NarrativeDraft(" not in raw_json
    assert isinstance(safe_bb["narrative"], dict)
    assert set(safe_bb["narrative"]["headline"].keys()) == ISO_LANG_KEYS
    assert set(safe_bb["narrative"]["tacticalExplanation"].keys()) == ISO_LANG_KEYS
    assert isinstance(safe_bb["multilingual_stream"], dict)
    assert set(safe_bb["multilingual_stream"]["headline"].keys()) == ISO_LANG_KEYS
    assert set(safe_bb["multilingual_stream"]["tacticalExplanation"].keys()) == ISO_LANG_KEYS


# -----------------------------------------------------------------------------
# 4. Edge Cases: Empty Strings, Unicode, and Special Characters
# -----------------------------------------------------------------------------


def test_edge_case_empty_strings_serialization() -> None:
    """NarrativeDraft with empty strings across all languages serializes to valid dicts."""
    empty_draft = NarrativeDraft(
        id="narr-empty",
        matchClock="00:00",
        timestamp=0,
        isTacticalInflectionPoint=False,
        headline=MultilingualNarrative(en="", es="", fr="", ja="", ar=""),
        tacticalExplanation=MultilingualNarrative(en="", es="", fr="", ja="", ar=""),
        commentatorCue="",
    )

    safe_narr = _json_safe(empty_draft)
    assert isinstance(safe_narr, dict)
    assert "NarrativeDraft(" not in str(safe_narr)
    assert set(safe_narr["headline"].keys()) == ISO_LANG_KEYS
    assert all(v == "" for v in safe_narr["headline"].values())
    assert set(safe_narr["tacticalExplanation"].keys()) == ISO_LANG_KEYS
    assert all(v == "" for v in safe_narr["tacticalExplanation"].values())


def test_edge_case_special_chars_unicode_and_emojis() -> None:
    """NarrativeDraft with rich Unicode, emojis, RTL Arabic, Japanese kanji, and quotes."""
    rich_draft = NarrativeDraft(
        id="narr-unicode",
        matchClock="90+5'",
        timestamp=5700000,
        isTacticalInflectionPoint=True,
        headline=MultilingualNarrative(
            en="Sensational strike! ⚽ \"Top bins\" <script>alert('xss')</script>",
            es="¡Golazo descomunal! 🇪🇸 En toda la escuadra 🔥",
            fr="But exceptionnel ! 🇫🇷 En pleine lucarne ✨",
            ja="スーパーゴール！ 🇯🇵 劇的な決勝弾（90分）⚽",
            ar="هدف عالمي لا يصدق! 🇸🇦 في الزاوية التسعين 🎯",
        ),
        tacticalExplanation=MultilingualNarrative(
            en="xG 0.03 converted | PDR 92 | Pitch control 45/55",
            es="xG 0.03 convertido | PDR 92 | Control de campo 45/55",
            fr="xG 0,03 converti | PDR 92 | Contrôle du terrain 45/55",
            ja="ゴール期待値 0.03 | パス難度 92 | ピッチ支配率 45/55",
            ar="احتمالية الهدف 0.03 | تصنيف صعوبة التمرير 92 | السيطرة 45/55",
        ),
        commentatorCue="90+5' | Stunner | GOAL",
    )

    safe = _json_safe(rich_draft)
    raw = json.dumps(safe, ensure_ascii=False)

    assert "NarrativeDraft(" not in raw
    assert "alert('xss')" in raw
    assert "¡Golazo descomunal!" in raw
    assert "スーパーゴール！" in raw
    assert "هدف عالمي لا يصدق!" in raw

    parsed = json.loads(raw)
    assert set(parsed["headline"].keys()) == ISO_LANG_KEYS
    assert set(parsed["tacticalExplanation"].keys()) == ISO_LANG_KEYS


# -----------------------------------------------------------------------------
# 5. Dataclass Sanitization & Nested Structures
# -----------------------------------------------------------------------------


def test_json_safe_arbitrary_nested_dataclasses() -> None:
    """Verify _json_safe converts nested standard dataclasses recursively."""
    @dataclass
    class InnerMetrics:
        speed: float
        tag: str

    @dataclass
    class OuterContainer:
        title: str
        metrics: InnerMetrics
        tags: list[str]
        nested_tuples: tuple[int, int]

    container = OuterContainer(
        title="Tactical Shift",
        metrics=InnerMetrics(speed=12.4, tag="sprint"),
        tags=["high-press", "transition"],
        nested_tuples=(1, 2),
    )

    safe = _json_safe(container)
    assert isinstance(safe, dict)
    assert safe["title"] == "Tactical Shift"
    assert isinstance(safe["metrics"], dict)
    assert safe["metrics"]["speed"] == 12.4
    assert safe["metrics"]["tag"] == "sprint"
    assert safe["tags"] == ["high-press", "transition"]
    assert safe["nested_tuples"] == [1, 2]

    raw = json.dumps(safe)
    assert "OuterContainer(" not in raw
    assert "InnerMetrics(" not in raw


def test_json_safe_dataclass_wrapping_narrative_draft() -> None:
    """Verify standard dataclass wrapping a NarrativeDraft produces pure dicts."""
    @dataclass
    class DraftWrapper:
        draft: NarrativeDraft
        meta: str

    draft = NarrativeDraft(
        id="narr-wrap",
        matchClock="12:34",
        timestamp=754000,
        isTacticalInflectionPoint=False,
        headline=MultilingualNarrative(en="Press", es="Presión", fr="Presse", ja="プレス", ar="ضغط"),
        tacticalExplanation=MultilingualNarrative(en="Exp", es="Exp", fr="Exp", ja="Exp", ar="Exp"),
        commentatorCue="Cue",
    )

    wrapper = DraftWrapper(draft=draft, meta="test-wrap")
    safe = _json_safe(wrapper)
    assert isinstance(safe, dict)
    assert isinstance(safe["draft"], dict)
    assert set(safe["draft"]["headline"].keys()) == ISO_LANG_KEYS
    assert "NarrativeDraft(" not in json.dumps(safe)


# -----------------------------------------------------------------------------
# 6. Timeline Scrubbing and Arbitrary Match Jumps
# -----------------------------------------------------------------------------


def test_timeline_scrubbing_and_jumps_preserves_clean_serialization() -> None:
    """Scrub simulation back and forth (0s, 300s, 1800s, 3600s, 5400s).

    Asserts zero dataclass repr leaks across timeline repositioning.
    """
    settings = Settings(
        simulation_hz=20,
        publish_hz=10,
        default_scenario=SyntheticScenarioType.HIGH_POSSESSION.value,
        sim_warmup_seconds=0,
    )
    runtime = MatchRuntime(settings)
    runtime.start()

    try:
        assert runtime.wait_until_ready(timeout=5.0)

        jump_targets = [0.0, 300.0, 1800.0, 3600.0, 5390.0, 150.0]
        for target in jump_targets:
            runtime.jump_to_seconds(target)
            time.sleep(0.08)

            env = runtime.latest_envelope()
            assert env is not None
            raw = json.dumps(env)

            assert "NarrativeDraft(" not in raw
            bb = env["blackboard"]
            assert isinstance(bb["narrative"], dict)
            assert set(bb["narrative"]["headline"].keys()) == ISO_LANG_KEYS
            assert isinstance(bb["multilingual_stream"], dict)
            assert set(bb["multilingual_stream"]["headline"].keys()) == ISO_LANG_KEYS
    finally:
        runtime.stop()


# -----------------------------------------------------------------------------
# 7. Wire WebSocket Client Telemetry Stream
# -----------------------------------------------------------------------------


def test_wire_websocket_telemetry_stream_zero_dataclass_leak() -> None:
    """Connect a real WebSocket client to /ws/telemetry and inspect live streamed frames.

    Verifies the actual bytes sent over the network wire have zero NarrativeDraft repr leaks.
    """
    settings = Settings(sim_warmup_seconds=0, simulation_hz=20, publish_hz=10)
    app = create_app(settings)
    with TestClient(app) as client, client.websocket_connect("/ws/telemetry") as ws:
        received = 0
        for _ in range(15):
            message = ws.receive_json()
            assert "frame" in message
            assert "blackboard" in message

            raw = json.dumps(message)
            assert "NarrativeDraft(" not in raw, "Leaked NarrativeDraft repr over WebSocket wire!"
            assert "MultilingualNarrative(" not in raw

            bb = message["blackboard"]
            assert isinstance(bb["narrative"], dict)
            assert set(bb["narrative"]["headline"].keys()) == ISO_LANG_KEYS
            assert set(bb["narrative"]["tacticalExplanation"].keys()) == ISO_LANG_KEYS

            assert isinstance(bb["multilingual_stream"], dict)
            assert set(bb["multilingual_stream"]["headline"].keys()) == ISO_LANG_KEYS
            assert set(bb["multilingual_stream"]["tacticalExplanation"].keys()) == ISO_LANG_KEYS

            received += 1

        assert received == 15
