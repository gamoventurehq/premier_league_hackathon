"""Empirical Challenger 2 stress test suite for Milestone 2 Iteration 2 (Swarm Remediation).

Adversarial stress-testing of:
1. Multi-key Transaction Atomicity:
   - 20 parallel threads reading blackboard.snapshot() while AgentSwarm.run()
     writes 14 telemetry keys continuously over 100 iterations.
   - Verifies that at no point does a snapshot contain a partial set of the 14 keys
     (atomicity: all 14 keys present or 0 keys present, with matching iteration generation).
   - Also tests real TelemetryIngestionAgent 13-key atomic batch commit under 20 reader threads.
   - Direct high-contention Blackboard.write_batch atomicity under concurrent readers and writers.

2. Unhandled Agent Failure without Fallback:
   - Broken agents without fallback return AgentStatus.IDLE (or failed status) with writes=[].
   - Staged keys are cleanly discarded, leaving 0 keys on the blackboard.
   - All 4 agents broken without fallback leave exactly 0 keys on blackboard.
   - Delayed/timeout agents without fallback leave 0 keys even after background zombie thread exits.
   - Agents whose fallback itself raises unhandled exceptions return AgentStatus.IDLE and leave 0 keys.
"""

from __future__ import annotations

import threading
import time
from typing import Any

from app.agents.base import (
    K_BALL,
    K_FAST_PATH_METRICS,
    K_MATCH_CLOCK,
    K_MATCH_EVENTS,
    K_MATCH_SECONDS,
    K_PASSING_LANES,
    K_PITCH_CONTROL_AWAY,
    K_PITCH_CONTROL_CONTESTED,
    K_PITCH_CONTROL_HOME,
    K_PLAYER_POSITIONS,
    K_POSSESSION,
    K_SCENARIO,
    K_SCORE,
    AgentContext,
    AgentOutcome,
    Blackboard,
)
from app.agents.broadcast_narrative import BroadcastNarrativeAgent
from app.agents.fan_personalization import FanPersonalizationAgent
from app.agents.swarm import AgentSwarm
from app.agents.telemetry_ingestion import TelemetryIngestionAgent
from app.models import AgentRole, AgentStatus, ExperiencePersona
from app.simulation.engine import MatchEngine

# Canonical 14 telemetry keys for multi-key transaction atomicity verification
TELEMETRY_14_KEYS: list[str] = [
    "match_clock",
    "match_seconds",
    "scenario",
    "score",
    "ball_state",
    "player_positions",
    "possession",
    "pitch_control_home",
    "pitch_control_away",
    "pitch_control_contested",
    "passing_lanes",
    "match_events",
    "fast_path_metrics",
    "control_vs_chaos",
]


class FourteenKeyTelemetryAgent:
    """Agent that writes exactly 14 telemetry keys staged in context.view."""

    role = AgentRole.TELEMETRY_INGESTION
    label = "14-Key Telemetry Ingestion"

    def __init__(self) -> None:
        self.iteration = 0

    def run(self, context: AgentContext) -> AgentOutcome:
        self.iteration += 1
        it = self.iteration

        # Write all 14 canonical telemetry keys with consistent iteration stamp
        context.view.write("match_clock", f"{it}:00")
        context.view.write("match_seconds", float(it))
        context.view.write("scenario", "high_possession")
        context.view.write("score", {"home": it, "away": 0, "iteration": it})
        context.view.write("ball_state", {"x": 52.5, "y": 34.0, "speedKmH": 0.0, "iteration": it})
        context.view.write("player_positions", [{"id": "p1", "iteration": it}])
        context.view.write("possession", {"team": "home", "iteration": it})
        context.view.write("pitch_control_home", float(it))
        context.view.write("pitch_control_away", float(it))
        context.view.write("pitch_control_contested", float(it))
        context.view.write("passing_lanes", [{"passerId": "p1", "iteration": it}])
        context.view.write("match_events", [{"id": f"e_{it}", "iteration": it}])
        context.view.write("fast_path_metrics", {"controlVsChaosIndex": float(it), "iteration": it})
        context.view.write("control_vs_chaos", float(it))

        return AgentOutcome(
            role=self.role,
            label=self.label,
            status=AgentStatus.COMPLETE,
            latency_ms=1.0,
            summary=f"Wrote 14 telemetry keys for iteration {it}",
            reads=list(context.view.reads),
            writes=list(context.view.writes),
        )

    def fallback(self, context: AgentContext) -> AgentOutcome:
        it = self.iteration
        for k in TELEMETRY_14_KEYS:
            if k == "scenario":
                context.view.write(k, "high_possession")
            elif k == "match_clock":
                context.view.write(k, f"{it}:00")
            elif k in (
                "match_seconds",
                "pitch_control_home",
                "pitch_control_away",
                "pitch_control_contested",
                "control_vs_chaos",
            ):
                context.view.write(k, float(it))
            elif k in ("score", "ball_state", "possession", "fast_path_metrics"):
                context.view.write(k, {"iteration": it})
            elif k in ("player_positions", "passing_lanes", "match_events"):
                context.view.write(k, [{"iteration": it}])
            else:
                context.view.write(k, {"iteration": it})
        return AgentOutcome(
            role=self.role,
            label=self.label,
            status=AgentStatus.FALLBACK,
            latency_ms=0.0,
            summary=f"Fallback wrote 14 telemetry keys for iteration {it}",
            reads=list(context.view.reads),
            writes=list(context.view.writes),
        )


def _extract_iteration(key: str, val: Any) -> int:
    """Extract iteration stamp from key value regardless of type."""
    if isinstance(val, (int, float)):
        return int(val)
    if isinstance(val, dict):
        return int(val.get("iteration", -1))
    if isinstance(val, list) and val and isinstance(val[0], dict):
        return int(val[0].get("iteration", -1))
    if isinstance(val, str) and ":" in val:
        return int(val.split(":")[0])
    return -1


# ==============================================================================
# SECTION 1: Multi-Key Transaction Atomicity Stress Tests
# ==============================================================================


def test_multikey_transaction_atomicity_20_parallel_threads_100_iterations(
    engine: MatchEngine,
) -> None:
    """20 parallel threads reading snapshot() while AgentSwarm.run() writes 14 telemetry keys.

    Specification:
    - 20 parallel threads continuously calling blackboard.snapshot().
    - AgentSwarm.run() executing 100 iterations.
    - Verifies that at NO point does a snapshot contain a partial set of the 14 keys:
      At any point in time, the number of target keys present in snapshot MUST be either 0 or 14.
    - Verifies torn read consistency: all 14 keys in a snapshot MUST share the exact same iteration.
    - Zero thread exceptions or dictionary iteration errors.
    """
    swarm = AgentSwarm(agents=[FourteenKeyTelemetryAgent()])
    frame = engine.build_frame()

    stop_event = threading.Event()
    reader_exceptions: list[Exception] = []
    partial_key_violations: list[tuple[int, list[str]]] = []
    torn_iteration_violations: list[tuple[int, set[int]]] = []
    total_snapshots_evaluated = [0] * 20

    def reader_worker(worker_id: int) -> None:
        count = 0
        try:
            while not stop_event.is_set():
                snap = swarm.blackboard.snapshot()
                count += 1
                if count % 10 == 0:
                    time.sleep(0)

                # Check 14-key presence
                present_keys = [k for k in TELEMETRY_14_KEYS if k in snap]
                num_present = len(present_keys)

                # Atomicity check: must be either 0 (before initial write) or 14 (full batch committed)
                if num_present not in (0, 14):
                    partial_key_violations.append((num_present, present_keys))

                # Consistency check: if all 14 keys present, iteration stamps must be strictly identical
                if num_present == 14:
                    iterations = {
                        _extract_iteration(k, snap[k]) for k in TELEMETRY_14_KEYS if k != "scenario"
                    }
                    if len(iterations) != 1:
                        torn_iteration_violations.append((count, iterations))

        except Exception as exc:
            reader_exceptions.append(exc)
        finally:
            total_snapshots_evaluated[worker_id] = count

    # Spawn 20 reader threads
    threads: list[threading.Thread] = []
    for tid in range(20):
        t = threading.Thread(target=reader_worker, args=(tid,), name=f"c2-reader-{tid}")
        threads.append(t)

    for t in threads:
        t.start()

    # Run AgentSwarm.run() over 100 iterations
    swarm_exceptions: list[Exception] = []
    for _it in range(100):
        try:
            result = swarm.run(frame, persona=ExperiencePersona.ANALYST)
            assert len(result.traces) == 1
            assert result.traces[0].status in (AgentStatus.COMPLETE, AgentStatus.FALLBACK)
            assert len(result.traces[0].writes) == 14
        except Exception as exc:
            swarm_exceptions.append(exc)
            break

    # Stop readers and wait for completion
    stop_event.set()
    for t in threads:
        t.join(timeout=5.0)

    swarm.shutdown()

    # Assertions
    assert not swarm_exceptions, f"Swarm raised exceptions during 100 runs: {swarm_exceptions}"
    assert not reader_exceptions, f"Reader threads crashed: {reader_exceptions}"
    assert not partial_key_violations, (
        f"Atomicity VIOLATION! Snapshots contained partial key sets: {partial_key_violations[:5]}"
    )
    assert not torn_iteration_violations, (
        f"Consistency VIOLATION! Snapshots contained torn iterations across keys: {torn_iteration_violations[:5]}"
    )

    total_snaps = sum(total_snapshots_evaluated)
    assert total_snaps >= 5000, f"Expected high contention (>5000 snapshots), got {total_snaps}"


def test_multikey_transaction_atomicity_telemetry_ingestion_canonical(
    engine: MatchEngine,
) -> None:
    """20 parallel threads reading snapshot() while real TelemetryIngestionAgent runs 100 times.

    Verifies canonical 13 telemetry keys committed by TelemetryIngestionAgent are never partially visible.
    """
    swarm = AgentSwarm(agents=[TelemetryIngestionAgent()])
    frame = engine.build_frame()

    canonical_13_keys = [
        K_MATCH_CLOCK,
        K_MATCH_SECONDS,
        K_SCENARIO,
        K_SCORE,
        K_BALL,
        K_PLAYER_POSITIONS,
        K_POSSESSION,
        K_PITCH_CONTROL_HOME,
        K_PITCH_CONTROL_AWAY,
        K_PITCH_CONTROL_CONTESTED,
        K_PASSING_LANES,
        K_MATCH_EVENTS,
        K_FAST_PATH_METRICS,
    ]

    stop_event = threading.Event()
    reader_exceptions: list[Exception] = []
    partial_violations: list[tuple[int, list[str]]] = []

    def reader_worker() -> None:
        try:
            while not stop_event.is_set():
                snap = swarm.blackboard.snapshot()
                present = [k for k in canonical_13_keys if k in snap]
                if len(present) not in (0, 13):
                    partial_violations.append((len(present), present))
        except Exception as exc:
            reader_exceptions.append(exc)

    threads = [threading.Thread(target=reader_worker) for _ in range(20)]
    for t in threads:
        t.start()

    for _ in range(100):
        swarm.run(frame, persona=ExperiencePersona.ANALYST)

    stop_event.set()
    for t in threads:
        t.join(timeout=5.0)

    swarm.shutdown()

    assert not reader_exceptions, f"Reader exceptions: {reader_exceptions}"
    assert not partial_violations, (
        f"Canonical telemetry ingestion atomicity violation: {partial_violations[:5]}"
    )


def test_direct_blackboard_write_batch_atomicity_high_contention() -> None:
    """Direct high-contention test on Blackboard.write_batch with 20 readers and 5 writers."""
    bb = Blackboard()
    stop_event = threading.Event()
    errors: list[Exception] = []
    violations: list[tuple[int, list[str]]] = []

    def writer_worker(wid: int) -> None:
        try:
            for it in range(100):
                batch = {f"k_{idx}": (wid, it) for idx in range(14)}
                bb.write_batch(batch)
        except Exception as exc:
            errors.append(exc)

    def reader_worker() -> None:
        try:
            while not stop_event.is_set():
                snap = bb.snapshot()
                present = [k for k in [f"k_{i}" for i in range(14)] if k in snap]
                if len(present) not in (0, 14):
                    violations.append((len(present), present))
                elif len(present) == 14:
                    # Verify all keys in batch share same (wid, it) tuple
                    tuples = {snap[k] for k in present}
                    if len(tuples) != 1:
                        errors.append(RuntimeError(f"Torn batch detected: {tuples}"))
        except Exception as exc:
            errors.append(exc)

    readers = [threading.Thread(target=reader_worker) for _ in range(20)]
    writers = [threading.Thread(target=writer_worker, args=(wid,)) for wid in range(5)]

    for r in readers:
        r.start()
    for w in writers:
        w.start()

    for w in writers:
        w.join(timeout=5.0)

    stop_event.set()
    for r in readers:
        r.join(timeout=5.0)

    assert not errors, f"Contention errors: {errors}"
    assert not violations, f"Write batch atomicity violations: {violations[:5]}"


# ==============================================================================
# SECTION 2: Unhandled Agent Failure without Fallback Tests
# ==============================================================================


def test_unhandled_agent_failure_no_fallback_attribute(engine: MatchEngine) -> None:
    """Agent with NO fallback attribute crashes: returns AgentStatus.IDLE and leaves 0 keys."""
    frame = engine.build_frame()

    class BrokenAgentNoFallback:
        role = AgentRole.TACTICAL_REASONING
        label = "Broken Agent No Fallback"

        def run(self, context: AgentContext) -> AgentOutcome:
            context.view.write("corrupted_metric_1", "bad_value")
            context.view.write("corrupted_metric_2", 999.9)
            raise RuntimeError("Fatal unhandled worker crash")

    # Swarm with ONLY this broken agent to verify 0 keys on blackboard
    swarm = AgentSwarm(agents=[BrokenAgentNoFallback()])
    assert len(swarm.blackboard.snapshot()) == 0

    result = swarm.run(frame, persona=ExperiencePersona.ANALYST)

    # 1. Trace status verification
    assert len(result.traces) == 1
    trace = result.traces[0]
    assert trace.role == AgentRole.TACTICAL_REASONING
    assert trace.status == AgentStatus.IDLE
    assert trace.writes == []
    assert "failed and has no rule-based fallback" in trace.summary

    # 2. Blackboard 0-key integrity verification
    assert swarm.blackboard.snapshot() == {}, "Blackboard must contain exactly 0 keys"
    assert swarm.blackboard.read("corrupted_metric_1") is None
    assert swarm.blackboard.read("corrupted_metric_2") is None
    assert result.blackboard == {}
    assert swarm.blackboard.version == 0

    swarm.shutdown()


def test_unhandled_agent_failure_fallback_is_none(engine: MatchEngine) -> None:
    """Agent with fallback=None crashes: returns AgentStatus.IDLE and leaves 0 keys."""
    frame = engine.build_frame()

    class BrokenAgentFallbackNone:
        role = AgentRole.TACTICAL_REASONING
        label = "Broken Agent Fallback None"
        fallback = None

        def run(self, context: AgentContext) -> AgentOutcome:
            context.view.write("leak_key", "leak_data")
            raise ValueError("Direct unhandled exception")

    swarm = AgentSwarm(agents=[BrokenAgentFallbackNone()])
    result = swarm.run(frame, persona=ExperiencePersona.ANALYST)

    assert result.traces[0].status == AgentStatus.IDLE
    assert result.traces[0].writes == []
    assert swarm.blackboard.snapshot() == {}
    assert swarm.blackboard.read("leak_key") is None
    swarm.shutdown()


def test_unhandled_agent_failure_all_four_agents_broken_no_fallback(
    engine: MatchEngine,
) -> None:
    """All 4 agents in swarm are broken without fallback: all IDLE, blackboard has 0 keys."""
    frame = engine.build_frame()

    def make_broken_class(role: AgentRole, name: str):
        class Broken:
            label = name

            def __init__(self, r=role):
                self.role = r

            def run(self, context: AgentContext) -> AgentOutcome:
                context.view.write(f"dirty_{self.role.value}", "polluted")
                raise RuntimeError(f"{self.label} crashed")

        return Broken()

    broken_agents = [
        make_broken_class(AgentRole.TELEMETRY_INGESTION, "Broken Ingestion"),
        make_broken_class(AgentRole.TACTICAL_REASONING, "Broken Tactical"),
        make_broken_class(AgentRole.BROADCAST_NARRATIVE, "Broken Narrative"),
        make_broken_class(AgentRole.FAN_PERSONALIZATION, "Broken Personalization"),
    ]

    swarm = AgentSwarm(agents=broken_agents)
    result = swarm.run(frame, persona=ExperiencePersona.ANALYST)

    assert len(result.traces) == 4
    for trace in result.traces:
        assert trace.status == AgentStatus.IDLE, f"Trace {trace.role} had status {trace.status}"
        assert trace.writes == [], f"Trace {trace.role} writes must be empty"

    # Entire blackboard must remain completely clean (0 keys)
    assert swarm.blackboard.snapshot() == {}, "Blackboard was polluted by broken agents"
    assert len(result.blackboard) == 0
    assert swarm.blackboard.version == 0
    swarm.shutdown()


def test_unhandled_agent_failure_timeout_no_fallback_zombie_isolation(
    engine: MatchEngine,
) -> None:
    """Agent without fallback times out: returns IDLE and leaves 0 keys even after zombie completes."""
    frame = engine.build_frame()

    class DelayedNoFallbackAgent:
        role = AgentRole.BROADCAST_NARRATIVE
        label = "Delayed No Fallback"

        def run(self, context: AgentContext) -> AgentOutcome:
            context.view.write("premature_key", "premature_val")
            # Sleep longer than the 0.4s deadline
            time.sleep(0.7)
            context.view.write("zombie_late_key", "zombie_late_val")
            return AgentOutcome(
                role=self.role,
                label=self.label,
                status=AgentStatus.COMPLETE,
                latency_ms=700.0,
                summary="Zombie finished",
                reads=[],
                writes=["premature_key", "zombie_late_key"],
            )

    swarm = AgentSwarm(agents=[DelayedNoFallbackAgent()])
    start_time = time.perf_counter()
    result = swarm.run(frame, persona=ExperiencePersona.ANALYST)
    elapsed = time.perf_counter() - start_time

    # Deadline was enforced (~0.4s)
    assert 0.38 <= elapsed <= 0.50
    assert result.traces[0].status == AgentStatus.IDLE
    assert result.traces[0].writes == []
    assert swarm.blackboard.snapshot() == {}
    assert swarm.blackboard.read("premature_key") is None

    # Wait for zombie thread in ThreadPoolExecutor to finish
    time.sleep(0.5)

    # Verify blackboard is STILL completely clean (0 keys)
    assert swarm.blackboard.snapshot() == {}
    assert swarm.blackboard.read("zombie_late_key") is None
    assert swarm.blackboard.version == 0

    swarm.shutdown()


def test_unhandled_agent_failure_when_fallback_itself_crashes(
    engine: MatchEngine,
) -> None:
    """Agent has fallback, but the fallback ITSELF crashes: returns AgentStatus.IDLE and 0 keys."""
    frame = engine.build_frame()

    class ExplodingFallbackAgent:
        role = AgentRole.TACTICAL_REASONING
        label = "Exploding Fallback Agent"

        def run(self, context: AgentContext) -> AgentOutcome:
            context.view.write("primary_staged_key", "data")
            raise RuntimeError("Primary crashed")

        def fallback(self, context: AgentContext) -> AgentOutcome:
            context.view.write("fallback_staged_key", "data")
            raise ValueError("Fallback crashed as well")

    swarm = AgentSwarm(agents=[ExplodingFallbackAgent()])
    result = swarm.run(frame, persona=ExperiencePersona.ANALYST)

    assert result.traces[0].status == AgentStatus.IDLE
    assert result.traces[0].writes == []
    assert "fallback failed" in result.traces[0].summary
    assert swarm.blackboard.snapshot() == {}
    assert swarm.blackboard.read("primary_staged_key") is None
    assert swarm.blackboard.read("fallback_staged_key") is None
    assert swarm.blackboard.version == 0

    swarm.shutdown()


def test_unhandled_failure_in_standard_four_agent_pipeline(
    engine: MatchEngine,
) -> None:
    """Agent 1 crashes without fallback in standard 4-agent swarm: 0 keys from it, other agents proceed."""
    frame = engine.build_frame()

    class BrokenTacticalNoFallback:
        role = AgentRole.TACTICAL_REASONING
        label = "Broken Tactical"

        def run(self, context: AgentContext) -> AgentOutcome:
            context.view.write("tactical_junk", "unverified")
            raise RuntimeError("Tactical engine exploded")

    swarm = AgentSwarm(
        agents=[
            TelemetryIngestionAgent(),
            BrokenTacticalNoFallback(),
            BroadcastNarrativeAgent(),
            FanPersonalizationAgent(),
        ]
    )

    result = swarm.run(frame, persona=ExperiencePersona.ANALYST)

    # Agent 0 completed
    assert result.traces[0].status == AgentStatus.COMPLETE
    # Agent 1 returned IDLE with 0 writes
    assert result.traces[1].status == AgentStatus.IDLE
    assert result.traces[1].writes == []
    # Agent 1 corrupted key is NOT in blackboard
    assert swarm.blackboard.read("tactical_junk") is None
    assert "tactical_junk" not in result.blackboard

    # Blackboard still has valid telemetry ingestion keys
    assert swarm.blackboard.read(K_MATCH_CLOCK) == frame.matchClock
    assert swarm.blackboard.read(K_BALL) is not None

    swarm.shutdown()
