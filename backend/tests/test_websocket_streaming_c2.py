"""Empirical Challenger 2 WebSocket Streaming & Serialization Stress Test Suite.

Milestone 1 Verification:
1. Rapid 5Hz publication over WebSocket (/ws/telemetry).
2. Clean JSON serialization with zero dataclass leakage ("NarrativeDraft(", "@dataclass", pointer reprs).
3. Continuous validation of blackboard["narrative"] and blackboard["multilingual_stream"] with 5 ISO keys (en, es, fr, ja, ar).
4. Sequential WebSocket client sessions across multiple synthetic match scenarios and personas.
5. In-flight interactive control messages (jump_time, set_speed, set_scenario, set_persona, pause, resume, malformed payload resilience).
6. Robustness under foreign/nested dataclass and legacy dataclass injection into blackboard.
7. High-frequency serialization latency and throughput benchmark.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from typing import Any

from app.agents.broadcast_narrative import NarrativeDraft
from app.config import Settings
from app.main import create_app
from app.models import (
    MultilingualNarrative,
    _Contract,
)
from app.runtime import MatchRuntime, _json_safe
from fastapi.testclient import TestClient

ISO_LANG_KEYS = {"en", "es", "fr", "ja", "ar"}


def _assert_clean_envelope(raw_text: str, data: dict[str, Any], tick_idx: int = 0) -> None:
    """Assert envelope conforms strictly to clean JSON with zero dataclass leakage."""
    # 1. Zero dataclass string leakage in raw wire payload
    assert "NarrativeDraft(" not in raw_text, (
        f"Tick {tick_idx}: Raw payload leaked NarrativeDraft dataclass repr!"
    )
    assert "@dataclass" not in raw_text, (
        f"Tick {tick_idx}: Raw payload leaked @dataclass string!"
    )
    assert "<NarrativeDraft" not in raw_text, (
        f"Tick {tick_idx}: Raw payload leaked object pointer repr!"
    )
    assert "[object Object]" not in raw_text, (
        f"Tick {tick_idx}: Raw payload contains [object Object]!"
    )
    assert "object at 0x" not in raw_text, (
        f"Tick {tick_idx}: Raw payload contains object memory address repr!"
    )

    # 2. Envelope top-level structure
    assert "frame" in data, f"Tick {tick_idx}: missing frame key"
    assert "blackboard" in data, f"Tick {tick_idx}: missing blackboard key"
    assert "sentAtMs" in data, f"Tick {tick_idx}: missing sentAtMs key"
    assert data["sentAtMs"] > 0, f"Tick {tick_idx}: invalid sentAtMs {data['sentAtMs']}"

    # 3. Frame structure
    frame = data["frame"]
    assert "frameId" in frame, f"Tick {tick_idx}: frame missing frameId"
    assert "matchClock" in frame, f"Tick {tick_idx}: frame missing matchClock"
    assert "ball" in frame, f"Tick {tick_idx}: frame missing ball"
    assert "players" in frame, f"Tick {tick_idx}: frame missing players"
    assert len(frame["players"]) == 22, f"Tick {tick_idx}: expected 22 players, got {len(frame['players'])}"

    # 4. Blackboard narrative structure
    bb = data["blackboard"]
    assert "narrative" in bb, f"Tick {tick_idx}: blackboard missing narrative"
    narrative = bb["narrative"]
    assert isinstance(narrative, dict), (
        f"Tick {tick_idx}: narrative is {type(narrative)}, expected dict! Content: {narrative}"
    )

    for required_narr_field in ["id", "matchClock", "timestamp", "isTacticalInflectionPoint", "headline", "tacticalExplanation", "commentatorCue"]:
        assert required_narr_field in narrative, (
            f"Tick {tick_idx}: narrative missing {required_narr_field}"
        )

    # Validate 5 ISO language keys for headline
    headline = narrative["headline"]
    assert isinstance(headline, dict), f"Tick {tick_idx}: headline is not dict"
    assert set(headline.keys()) == ISO_LANG_KEYS, (
        f"Tick {tick_idx}: headline keys {set(headline.keys())} != {ISO_LANG_KEYS}"
    )
    for lang, text in headline.items():
        assert isinstance(text, str) and len(text) > 0, (
            f"Tick {tick_idx}: headline[{lang}] is empty or not string: {text}"
        )

    # Validate 5 ISO language keys for tacticalExplanation
    explanation = narrative["tacticalExplanation"]
    assert isinstance(explanation, dict), f"Tick {tick_idx}: tacticalExplanation is not dict"
    assert set(explanation.keys()) == ISO_LANG_KEYS, (
        f"Tick {tick_idx}: tacticalExplanation keys {set(explanation.keys())} != {ISO_LANG_KEYS}"
    )
    for lang, text in explanation.items():
        assert isinstance(text, str) and len(text) > 0, (
            f"Tick {tick_idx}: tacticalExplanation[{lang}] is empty or not string: {text}"
        )

    # 5. Blackboard multilingual_stream structure
    assert "multilingual_stream" in bb, f"Tick {tick_idx}: blackboard missing multilingual_stream"
    multi = bb["multilingual_stream"]
    assert isinstance(multi, dict), f"Tick {tick_idx}: multilingual_stream is not dict"
    assert "headline" in multi and "tacticalExplanation" in multi
    assert set(multi["headline"].keys()) == ISO_LANG_KEYS, (
        f"Tick {tick_idx}: multilingual_stream headline keys != {ISO_LANG_KEYS}"
    )
    assert set(multi["tacticalExplanation"].keys()) == ISO_LANG_KEYS, (
        f"Tick {tick_idx}: multilingual_stream explanation keys != {ISO_LANG_KEYS}"
    )
    for _lang, text in multi["headline"].items():
        assert isinstance(text, str) and len(text) > 0
    for _lang, text in multi["tacticalExplanation"].items():
        assert isinstance(text, str) and len(text) > 0


def test_websocket_5hz_rapid_streaming_clean_json_and_zero_dataclass_leakage() -> None:
    """Stream 30 consecutive 5Hz envelopes over WebSocket and assert clean JSON and zero leakage."""
    app = create_app()
    with TestClient(app) as client, client.websocket_connect("/ws/telemetry") as ws:
        envelopes_collected = 0
        timestamps: list[float] = []

        for i in range(30):
            t0 = time.perf_counter()
            raw_text = ws.receive_text()
            t1 = time.perf_counter()
            timestamps.append(t1 - t0)

            # Parse JSON
            data = json.loads(raw_text)
            _assert_clean_envelope(raw_text, data, tick_idx=i)
            envelopes_collected += 1

        assert envelopes_collected == 30
        avg_interval = sum(timestamps[1:]) / len(timestamps[1:])
        assert 0.10 <= avg_interval <= 0.35, f"Abnormal 5Hz interval average: {avg_interval:.3f}s"


def test_websocket_sequential_multi_scenario_and_persona_streaming() -> None:
    """Run sequential WebSocket client sessions across 4 scenarios and personas without thread deadlock.
    
    Starlette TestClient cannot share an in-memory event loop across threads.
    This test verifies that client sessions with different query parameters
    connect cleanly, receive pristine frames, and disconnect cleanly.
    """
    app = create_app()
    test_sessions = [
        ("high_possession", "analyst"),
        ("counter_attack_transition", "casual"),
        ("low_block_siege", "analyst"),
        ("box_scramble", "casual"),
    ]

    with TestClient(app) as client:
        total_frames = 0
        for _session_idx, (scenario, persona) in enumerate(test_sessions):
            endpoint = f"/ws/telemetry?scenario={scenario}&persona={persona}"
            with client.websocket_connect(endpoint) as ws:
                for _tick in range(10):
                    raw_text = ws.receive_text()
                    data = json.loads(raw_text)
                    _assert_clean_envelope(raw_text, data, tick_idx=total_frames)
                    total_frames += 1

        assert total_frames == 40, f"Expected 40 frames across 4 sessions, got {total_frames}"


def test_websocket_streaming_under_rapid_control_messages() -> None:
    """Send active interactive control messages during 5Hz WebSocket streaming."""
    app = create_app()
    with TestClient(app) as client, client.websocket_connect("/ws/telemetry") as ws:
        # Receive initial frame
        data0 = json.loads(ws.receive_text())
        _assert_clean_envelope(json.dumps(data0), data0, tick_idx=0)

        # Sequence of non-pausing interactive control commands
        control_sequence = [
            {"type": "set_scenario", "scenario": "counter_attack_transition"},
            {"type": "set_persona", "persona": "casual"},
            {"type": "jump_time", "seconds": 600.0},
            {"type": "set_speed", "speed": 2.0},
            {"type": "set_scenario", "scenario": "low_block_siege"},
            {"type": "jump_time", "seconds": 2400.0},
            {"type": "set_speed", "speed": 1.0},
            {"type": "unknown_future_message", "payload": 123},  # Unknown type should be ignored gracefully
        ]

        for step_idx, msg in enumerate(control_sequence):
            ws.send_text(json.dumps(msg))
            # Receive next envelope and verify serialization remains pristine
            raw_text = ws.receive_text()
            data = json.loads(raw_text)
            _assert_clean_envelope(raw_text, data, tick_idx=step_idx + 1)

        # Test pause and resume cleanly:
        # When paused, backend does not emit new frames.
        # We send pause, verify paused state, send resume, and receive the resumed stream.
        ws.send_text(json.dumps({"type": "pause"}))
        time.sleep(0.1)
        assert app.state.runtime.is_paused is True

        ws.send_text(json.dumps({"type": "resume"}))
        time.sleep(0.1)
        assert app.state.runtime.is_paused is False

        # After resume, next frame arrives cleanly
        resumed_raw = ws.receive_text()
        resumed_data = json.loads(resumed_raw)
        _assert_clean_envelope(resumed_raw, resumed_data, tick_idx=len(control_sequence) + 1)


def test_blackboard_arbitrary_nested_dataclass_and_contract_injection() -> None:
    """Empirically test _json_safe against complex, arbitrary nested dataclasses and contracts."""
    @dataclass
    class InnerTelemetryMetric:
        metric_name: str
        values: list[float]
        tags: dict[str, str]

    @dataclass
    class MidLevelTacticalState:
        stage: str
        inner: InnerTelemetryMetric
        draft: NarrativeDraft

    @dataclass
    class RootSwarmEnvelope:
        timestamp_ms: int
        active: bool
        tactical: MidLevelTacticalState
        auxiliary: tuple[int, ...]
        optional_none: Any = None

    class CustomContractModel(_Contract):
        title: str
        multilingual: MultilingualNarrative

    sample_draft = NarrativeDraft(
        id="draft-empirical-1",
        matchClock="12:34",
        timestamp=754000,
        isTacticalInflectionPoint=True,
        headline=MultilingualNarrative(
            en="Empirical City attack",
            es="Ataque empirico de City",
            fr="Attaque empirique de City",
            ja="Cityの攻撃",
            ar="هجوم سيتي التجريبي",
        ),
        tacticalExplanation=MultilingualNarrative(
            en="Tactical shift into half spaces",
            es="Giro tactico hacia los medios espacios",
            fr="Transition tactique dans les demi-espaces",
            ja="ハーフスペースへの戦術的シフト",
            ar="تحول تكتيكي إلى المساحات النصفية",
        ),
        commentatorCue="12:34 | Tactical shift",
    )

    sample_contract = CustomContractModel(
        title="Tactical Inflection",
        multilingual=MultilingualNarrative(
            en="Inflection Point",
            es="Punto de Inflexion",
            fr="Point d Inflexion",
            ja="変曲点",
            ar="نقطة تحول",
        ),
    )

    complex_dataclass = RootSwarmEnvelope(
        timestamp_ms=1700000000,
        active=True,
        tactical=MidLevelTacticalState(
            stage="high_press",
            inner=InnerTelemetryMetric(
                metric_name="pitch_control",
                values=[0.45, 0.55, 0.12],
                tags={"zone": "attacking_third"},
            ),
            draft=sample_draft,
        ),
        auxiliary=(1, 2, 3),
        optional_none=None,
    )

    # 1. Test _json_safe on complex nested dataclass
    safe_result = _json_safe(complex_dataclass)
    assert isinstance(safe_result, dict)
    raw_json = json.dumps(safe_result)
    assert "NarrativeDraft(" not in raw_json
    assert "@dataclass" not in raw_json
    assert "RootSwarmEnvelope" not in raw_json
    assert safe_result["tactical"]["inner"]["values"] == [0.45, 0.55, 0.12]
    assert safe_result["tactical"]["draft"]["headline"]["en"] == "Empirical City attack"

    # 2. Test _json_safe on Pydantic contract holding MultilingualNarrative
    safe_contract = _json_safe(sample_contract)
    assert isinstance(safe_contract, dict)
    assert safe_contract["multilingual"]["ja"] == "変曲点"

    # 3. Test runtime blackboard integration with arbitrary dataclass injected
    settings = Settings(foundry_enabled=False, event_hubs_enabled=False, cosmos_enabled=False)
    runtime = MatchRuntime(settings)
    runtime.swarm.blackboard.write("custom_complex_dataclass", complex_dataclass)
    runtime.swarm.blackboard.write("custom_contract", sample_contract)

    payload = runtime.blackboard_payload()
    payload_json = json.dumps(payload)
    assert "NarrativeDraft(" not in payload_json
    assert "custom_complex_dataclass" in payload
    assert payload["custom_complex_dataclass"]["tactical"]["draft"]["headline"]["en"] == "Empirical City attack"
    assert payload["custom_contract"]["multilingual"]["es"] == "Punto de Inflexion"


def test_legacy_standard_dataclass_narrative_sanitization() -> None:
    """Stress test: verify that even if a legacy @dataclass NarrativeDraft is written to blackboard,
    _json_safe cleanly serializes it without emitting 'NarrativeDraft(' repr."""
    @dataclass
    class LegacyDataclassDraft:
        id: str
        matchClock: str
        timestamp: int
        isTacticalInflectionPoint: bool
        headline: dict[str, str]
        tacticalExplanation: dict[str, str]
        commentatorCue: str

    legacy_draft = LegacyDataclassDraft(
        id="legacy-draft-42",
        matchClock="45:00",
        timestamp=2700000,
        isTacticalInflectionPoint=False,
        headline={"en": "Halftime whistle", "es": "Silbatazo", "fr": "Mi-temps", "ja": "ハーフタイム", "ar": "استراحة الشوطين"},
        tacticalExplanation={"en": "First half review", "es": "Resumen", "fr": "Bilan", "ja": "振り返り", "ar": "مراجعة"},
        commentatorCue="45:00 | Halftime",
    )

    settings = Settings(foundry_enabled=False, event_hubs_enabled=False, cosmos_enabled=False)
    runtime = MatchRuntime(settings)
    runtime.swarm.blackboard.write("narrative", legacy_draft)

    payload = runtime.blackboard_payload()
    payload_str = json.dumps(payload)

    # Must NOT have stringified repr
    assert "LegacyDataclassDraft(" not in payload_str
    assert "NarrativeDraft(" not in payload_str
    assert isinstance(payload["narrative"], dict)
    assert payload["narrative"]["id"] == "legacy-draft-42"
    assert set(payload["narrative"]["headline"].keys()) == ISO_LANG_KEYS


def test_websocket_serialization_throughput_and_latency() -> None:
    """Stress-test blackboard and envelope serialization latency over 100 iterations."""
    settings = Settings(foundry_enabled=False, event_hubs_enabled=False, cosmos_enabled=False)
    runtime = MatchRuntime(settings)
    runtime.start()
    try:
        runtime.wait_until_ready(timeout=5.0)
        time.sleep(0.3)

        durations_ms: list[float] = []
        for _ in range(100):
            t0 = time.perf_counter()
            envelope = runtime.latest_envelope()
            assert envelope is not None
            raw = json.dumps(envelope)
            t1 = time.perf_counter()
            assert "NarrativeDraft(" not in raw
            durations_ms.append((t1 - t0) * 1000.0)

        avg_latency = sum(durations_ms) / len(durations_ms)
        max_latency = max(durations_ms)
        p95_latency = sorted(durations_ms)[int(len(durations_ms) * 0.95)]

        # Budget is 200ms per tick (5Hz); serialization must take < 5ms on average
        assert avg_latency < 5.0, f"Average serialization latency too high: {avg_latency:.2f}ms"
        assert p95_latency < 10.0, f"P95 serialization latency too high: {p95_latency:.2f}ms"
        assert max_latency < 30.0, f"Max serialization latency spike: {max_latency:.2f}ms"
    finally:
        runtime.stop()
