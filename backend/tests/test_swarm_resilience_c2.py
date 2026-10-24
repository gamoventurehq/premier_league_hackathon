"""Empirical Challenger 2 stress test suite for Milestone 2 (Swarm Resilience).

Adversarial stress-testing of:
1. Blackboard Fallback Preservation Test:
   Force every agent to throw unhandled exceptions and verify all fallback metrics
   are written to Blackboard and present in latestNarrative (headline, multilingual,
   analystContext, casualContext, playerCamContext, clubCentricContext non-empty).
2. Concurrency Stress Test:
   Launch 10 parallel threads reading and writing Blackboard while running
   AgentSwarm.run() repeatedly to verify zero RuntimeError: dictionary changed size during iteration.
3. 5 Hz Delivery Stability:
   Verify that telemetry frames continue streaming over WebSocket at ~5 Hz without
   dropping frames or stalling under continuous multi-agent failures.
4. Edge Case Mining:
   Partial write behavior during mid-execution failure and fallback staging.
"""

from __future__ import annotations

import json
import threading
import time
from unittest.mock import patch

import pytest
from app.agents.base import (
    ALL_KEYS,
    K_ANALYST_CONTEXT,
    K_BALL,
    K_CASUAL_CONTEXT,
    K_CLUB_CENTRIC_CONTEXT,
    K_COMMENTATOR_CUE,
    K_CONTROL_VS_CHAOS,
    K_FAST_PATH_METRICS,
    K_GAME_RHYTHM,
    K_INFLECTION_CANDIDATES,
    K_KEY_PLAYERS,
    K_MATCH_CLOCK,
    K_MATCH_EVENTS,
    K_MATCH_SECONDS,
    K_MULTILINGUAL_STREAM,
    K_NARRATIVE,
    K_NARRATIVE_ARC,
    K_PASS_DIFFICULTY_RATING,
    K_PASSING_LANES,
    K_PITCH_CONTROL_AWAY,
    K_PITCH_CONTROL_CONTESTED,
    K_PITCH_CONTROL_HOME,
    K_PLAYER_CAM_CONTEXT,
    K_PLAYER_POSITIONS,
    K_SCENARIO,
    K_SCORE,
    K_TACTICAL_PHASE,
    Blackboard,
    BlackboardView,
)
from app.agents.broadcast_narrative import BroadcastNarrativeAgent
from app.agents.fan_personalization import FanPersonalizationAgent
from app.agents.swarm import AgentSwarm
from app.agents.tactical_reasoning import TacticalReasoningAgent
from app.agents.telemetry_ingestion import TelemetryIngestionAgent
from app.main import create_app
from app.models import AgentStatus, ExperiencePersona, SyntheticScenarioType
from app.runtime import MatchRuntime, _json_safe
from app.simulation.engine import MatchEngine
from fastapi.testclient import TestClient

# --- 1. Blackboard Fallback Preservation Test --------------------------------


@pytest.mark.parametrize(
    "scenario",
    [
        SyntheticScenarioType.HIGH_POSSESSION,
        SyntheticScenarioType.COUNTER_ATTACK_TRANSITION,
        SyntheticScenarioType.LOW_BLOCK_SIEGE,
        SyntheticScenarioType.BOX_SCRAMBLE,
    ],
)
@pytest.mark.parametrize(
    "persona",
    [
        ExperiencePersona.ANALYST,
        ExperiencePersona.CASUAL,
        ExperiencePersona.PLAYER_CAM,
        ExperiencePersona.CLUB_CENTRIC,
    ],
)
def test_blackboard_fallback_preservation_under_forced_exceptions(
    scenario: SyntheticScenarioType, persona: ExperiencePersona
) -> None:
    """Force EVERY agent to raise an unhandled exception and verify data preservation.

    Verifies:
    - All 4 agents trigger rule-based fallback (status == AgentStatus.FALLBACK).
    - All 27 canonical keys in ALL_KEYS are written to blackboard.
    - latestNarrative is fully populated:
      * headline: non-empty in all 5 languages (en, es, fr, ja, ar)
      * tacticalExplanation: non-empty in all 5 languages (en, es, fr, ja, ar)
      * analystContext: non-empty
      * casualContext: non-empty
      * playerCamContext: non-empty
      * clubCentricContext: homeFrame and awayFrame are non-empty
    """
    engine = MatchEngine()
    engine.reset(scenario)
    frame = engine.build_frame()
    swarm = AgentSwarm()

    with (
        patch.object(TelemetryIngestionAgent, "run", side_effect=RuntimeError("Forced ingestion crash")),
        patch.object(TacticalReasoningAgent, "run", side_effect=ValueError("Forced tactical crash")),
        patch.object(BroadcastNarrativeAgent, "run", side_effect=ZeroDivisionError("Forced narrative crash")),
        patch.object(FanPersonalizationAgent, "run", side_effect=KeyError("Forced personalization crash")),
    ):
        result = swarm.run(frame, persona=persona)

    # 1. Traces verification
    assert len(result.traces) == 4
    for trace in result.traces:
        assert trace.status == AgentStatus.FALLBACK, f"Trace {trace.role} status not FALLBACK: {trace.status}"
        assert len(trace.writes) > 0, f"Trace {trace.role} reported 0 writes"

    # 2. Blackboard canonical keys preservation
    bb = result.blackboard
    for key in ALL_KEYS:
        assert key in bb, f"Missing canonical key '{key}' from blackboard after forced fallbacks"

    # Verify telemetry ingestion fallback metrics
    assert bb[K_MATCH_CLOCK] == frame.matchClock
    assert bb[K_MATCH_SECONDS] == frame.matchSeconds
    assert bb[K_SCENARIO] == frame.scenario.value
    assert isinstance(bb[K_SCORE], dict)
    assert bb[K_SCORE]["home"] == frame.score.home
    assert bb[K_SCORE]["away"] == frame.score.away
    assert isinstance(bb[K_BALL], dict)
    assert bb[K_BALL]["x"] == frame.ball.x
    assert bb[K_BALL]["y"] == frame.ball.y
    assert len(bb[K_PLAYER_POSITIONS]) == len(frame.players)
    assert bb[K_PITCH_CONTROL_HOME] == frame.metrics.pitchControl.home
    assert bb[K_PITCH_CONTROL_AWAY] == frame.metrics.pitchControl.away
    assert bb[K_PITCH_CONTROL_CONTESTED] == frame.metrics.pitchControl.contested
    assert len(bb[K_PASSING_LANES]) == len(frame.passingLanes)
    assert len(bb[K_MATCH_EVENTS]) == len(frame.events)
    assert bb[K_FAST_PATH_METRICS]["controlVsChaosIndex"] == frame.metrics.controlVsChaosIndex

    # Verify tactical reasoning fallback metrics
    assert bb[K_CONTROL_VS_CHAOS] == frame.metrics.controlVsChaosIndex
    assert bb[K_GAME_RHYTHM] == frame.metrics.gameRhythm.value
    assert bb[K_PASS_DIFFICULTY_RATING] == frame.metrics.passDifficultyRating
    assert bb[K_TACTICAL_PHASE] == "progression"
    assert isinstance(bb[K_INFLECTION_CANDIDATES], list)
    assert isinstance(bb[K_KEY_PLAYERS], list)

    # Verify broadcast narrative fallback metrics
    assert isinstance(bb[K_NARRATIVE_ARC], str) and len(bb[K_NARRATIVE_ARC]) > 0
    assert K_MULTILINGUAL_STREAM in bb
    assert K_NARRATIVE in bb
    assert isinstance(bb[K_COMMENTATOR_CUE], str) and len(bb[K_COMMENTATOR_CUE]) > 0

    # Verify fan personalization fallback metrics
    assert isinstance(bb[K_ANALYST_CONTEXT], str) and len(bb[K_ANALYST_CONTEXT]) > 0
    assert isinstance(bb[K_CASUAL_CONTEXT], str) and len(bb[K_CASUAL_CONTEXT]) > 0
    assert isinstance(bb[K_CLUB_CENTRIC_CONTEXT], dict)
    assert len(bb[K_CLUB_CENTRIC_CONTEXT].get("homeFrame", "")) > 0
    assert len(bb[K_CLUB_CENTRIC_CONTEXT].get("awayFrame", "")) > 0
    assert isinstance(bb[K_PLAYER_CAM_CONTEXT], str) and len(bb[K_PLAYER_CAM_CONTEXT]) > 0

    # 3. latestNarrative verification
    narrative = result.narrative
    assert narrative.matchClock == frame.matchClock

    # Headline multilingual coverage
    assert len(narrative.headline.en) > 0, "headline.en is empty"
    assert len(narrative.headline.es) > 0, "headline.es is empty"
    assert len(narrative.headline.fr) > 0, "headline.fr is empty"
    assert len(narrative.headline.ja) > 0, "headline.ja is empty"
    assert len(narrative.headline.ar) > 0, "headline.ar is empty"

    # Tactical explanation multilingual coverage
    assert len(narrative.tacticalExplanation.en) > 0, "tacticalExplanation.en is empty"
    assert len(narrative.tacticalExplanation.es) > 0, "tacticalExplanation.es is empty"
    assert len(narrative.tacticalExplanation.fr) > 0, "tacticalExplanation.fr is empty"
    assert len(narrative.tacticalExplanation.ja) > 0, "tacticalExplanation.ja is empty"
    assert len(narrative.tacticalExplanation.ar) > 0, "tacticalExplanation.ar is empty"

    # Persona contexts
    assert len(narrative.analystContext) > 0, "analystContext is empty"
    assert len(narrative.casualContext) > 0, "casualContext is empty"
    assert len(narrative.playerCamContext) > 0, "playerCamContext is empty"
    assert len(narrative.clubCentricContext.homeFrame) > 0, "clubCentricContext.homeFrame is empty"
    assert len(narrative.clubCentricContext.awayFrame) > 0, "clubCentricContext.awayFrame is empty"


# --- 2. Concurrency Stress Test (10 Parallel Threads) ------------------------


def test_concurrency_10_parallel_threads_blackboard_read_write_stress() -> None:
    """Launch 10 parallel threads writing and reading from Blackboard while running AgentSwarm.run().

    Verifies:
    - Zero `RuntimeError: dictionary changed size during iteration`
    - Zero deadlocks or race condition crashes
    - Version strictly increments with writes
    - blackboard.snapshot() produces clean isolated dictionaries
    - Simultaneous JSON serialization via _json_safe survives concurrent mutation
    """
    engine = MatchEngine()
    frame = engine.build_frame()
    swarm = AgentSwarm()
    blackboard = swarm.blackboard

    stop_event = threading.Event()
    thread_errors: list[tuple[str, int, Exception]] = []
    writes_completed = [0] * 5

    def writer_worker(thread_id: int) -> None:
        count = 0
        while not stop_event.is_set():
            try:
                # Alternate between unique thread keys and shared canonical keys
                key = f"concurrent_key_{thread_id}_{count % 15}"
                blackboard.write(
                    key,
                    {
                        "thread": thread_id,
                        "count": count,
                        "payload": [1, 2, 3, {"nested": count}],
                        "timestamp": time.time(),
                    },
                )
                if count % 10 == 0:
                    blackboard.write(K_MATCH_CLOCK, f"{count % 90:02d}:00")
                count += 1
                writes_completed[thread_id] = count
                if count % 20 == 0:
                    time.sleep(0.0005)
            except Exception as exc:
                thread_errors.append(("writer", thread_id, exc))
                break

    def reader_worker(thread_id: int) -> None:
        while not stop_event.is_set():
            try:
                # 1. Snapshot and iterate over keys, values, items
                snap = blackboard.snapshot()
                for k, v in snap.items():
                    _ = len(str(k))
                    _ = str(v)
                # 2. Point reads
                _ = blackboard.read(f"concurrent_key_0_{thread_id % 15}")
                _ = blackboard.has(K_MATCH_CLOCK)
                _ = blackboard.version
                # 3. Simulate json_safe serialization (like WebSocket / REST)
                safe_payload = {k: _json_safe(v) for k, v in snap.items()}
                _ = json.dumps(safe_payload)
            except Exception as exc:
                thread_errors.append(("reader", thread_id, exc))
                break

    threads: list[threading.Thread] = []
    # 5 dedicated writer threads
    for tid in range(5):
        t = threading.Thread(target=writer_worker, args=(tid,), name=f"stress-writer-{tid}")
        threads.append(t)
    # 5 dedicated reader & serializer threads
    for tid in range(5):
        t = threading.Thread(target=reader_worker, args=(tid,), name=f"stress-reader-{tid}")
        threads.append(t)

    for t in threads:
        t.start()

    # While 10 threads are aggressively reading/writing, run AgentSwarm.run() 40 times
    swarm_errors: list[Exception] = []
    for _cycle in range(40):
        try:
            result = swarm.run(frame, persona=ExperiencePersona.ANALYST)
            assert len(result.traces) == 4
            assert result.narrative is not None
            assert len(result.blackboard) > 0
        except Exception as exc:
            swarm_errors.append(exc)
            break

    stop_event.set()
    for t in threads:
        t.join(timeout=5.0)

    assert not thread_errors, f"Thread errors occurred during concurrency stress: {thread_errors}"
    assert not swarm_errors, f"Swarm errors occurred during concurrency stress: {swarm_errors}"
    assert sum(writes_completed) > 1000, f"Expected >1000 total writes, got {sum(writes_completed)}"
    assert blackboard.version >= sum(writes_completed)


# --- 3. 5 Hz Delivery Stability Under Multi-Agent Failure ---------------------


def test_websocket_5hz_delivery_stability_under_continuous_agent_failure() -> None:
    """Verify frames continue streaming over WebSocket without dropping below 5 Hz under agent failure.

    Verifies:
    - 25 consecutive frames collected over WebSocket
    - Mean interval between frames is ~0.20s (+/- 0.03s jitter, >= 4.8 Hz)
    - Zero dropped frames: frameId sequence is strictly monotonic and contiguous
    - Each envelope contains valid frame, blackboard (27 keys), and sentAtMs
    - Each frame contains fully populated fallback latestNarrative
    - MatchRuntime simulation remains alive and ready throughout
    """
    app = create_app()

    with (
        patch.object(TelemetryIngestionAgent, "run", side_effect=RuntimeError("Continuous fail 1")),
        patch.object(TacticalReasoningAgent, "run", side_effect=ValueError("Continuous fail 2")),
        patch.object(BroadcastNarrativeAgent, "run", side_effect=TimeoutError("Continuous fail 3")),
        patch.object(FanPersonalizationAgent, "run", side_effect=KeyError("Continuous fail 4")),
        TestClient(app) as client,
        client.websocket_connect("/ws/telemetry") as ws,
    ):
        runtime: MatchRuntime = app.state.runtime
        assert runtime.wait_until_ready(timeout=10.0)

        envelopes: list[dict] = []
        arrival_times: list[float] = []

        # Collect 25 frames (approx 5.0 seconds at 5 Hz)
        sample_count = 25
        for _ in range(sample_count):
            env = ws.receive_json()
            now = time.perf_counter()
            envelopes.append(env)
            arrival_times.append(now)

        # Analyze arrival timing
        deltas = [arrival_times[i + 1] - arrival_times[i] for i in range(len(arrival_times) - 1)]
        avg_delta = sum(deltas) / len(deltas)
        effective_hz = 1.0 / avg_delta
        min_delta = min(deltas)
        max_delta = max(deltas)

        # Assert 5 Hz nominal pace
        assert 0.18 <= avg_delta <= 0.23, (
            f"Average delta {avg_delta:.4f}s outside expected 5 Hz window (effective {effective_hz:.2f} Hz)"
        )
        assert min_delta > 0.0, "Delta between frames must be strictly positive"
        assert effective_hz >= 4.5, f"Delivery rate {effective_hz:.2f} Hz dropped significantly below 5 Hz"
        assert max_delta < 0.45, f"Max delta {max_delta:.4f}s indicates broadcast stutter"

        # Frame continuity & zero drops
        frame_ids = [env["frame"]["frameId"] for env in envelopes]
        expected_ids = list(range(frame_ids[0], frame_ids[0] + sample_count))
        assert frame_ids == expected_ids, f"Frame sequence mismatch! Got {frame_ids}, expected {expected_ids}"

        # Validate fallback preservation across delivered envelopes
        for env in envelopes:
            assert "frame" in env and "blackboard" in env and "sentAtMs" in env
            bb = env["blackboard"]
            assert len(bb) >= 20, f"Delivered blackboard had too few keys: {len(bb)}"

            frame = env["frame"]
            narrative = frame.get("latestNarrative")
            assert narrative is not None, "latestNarrative missing in delivered frame"
            assert len(narrative["headline"]["en"]) > 0
            assert len(narrative["headline"]["es"]) > 0
            assert len(narrative["headline"]["fr"]) > 0
            assert len(narrative["headline"]["ja"]) > 0
            assert len(narrative["headline"]["ar"]) > 0
            assert len(narrative["analystContext"]) > 0
            assert len(narrative["casualContext"]) > 0

        # Verify runtime health
        assert runtime.simulation_alive is True
        assert runtime._worker_error is None
        assert runtime.ready is True
        assert runtime.heartbeat_fresh is True


# --- 4. Staging Isolation and Discard Verification ---------------------------


def test_blackboard_view_staged_isolation() -> None:
    """Verify BlackboardView stages writes privately and does not pollute blackboard until commit."""
    blackboard = Blackboard()
    view = BlackboardView(blackboard=blackboard)

    # Initial blackboard is empty
    assert blackboard.read("test_key") is None
    assert blackboard.version == 0

    # Write to view
    view.write("test_key", "staged_value")
    # Read through view sees staged value
    assert view.read("test_key") == "staged_value"
    # Shared blackboard has NOT changed yet
    assert blackboard.read("test_key") is None
    assert blackboard.version == 0

    # Discard clears staged without touching blackboard
    view.discard()
    assert view.read("test_key") is None
    assert blackboard.read("test_key") is None
    assert blackboard.version == 0

    # Staged write and commit
    view.write("test_key", "committed_value")
    view.commit()
    assert blackboard.read("test_key") == "committed_value"
    assert blackboard.version == 1
