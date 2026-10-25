"""Adversarial stress test suite by Challenger 1 for Milestone 2 Iteration 2.

Empirical verification of:
1. Partial write discard on crash midway (with fallback, without fallback, and when fallback also crashes).
2. Delayed zombie thread isolation under timeout (early write discarded, late write isolated from blackboard).
3. Key collision isolation between zombie thread and fallback execution.
4. Multi-cycle stream stability under active background zombie threads.
5. Concurrent 4-agent zombie swarm stress.
"""

from __future__ import annotations

import time

from app.agents.base import (
    AgentContext,
    AgentOutcome,
)
from app.agents.swarm import AgentSwarm
from app.models import AgentRole, AgentStatus, ExperiencePersona
from app.simulation.engine import MatchEngine


class CrashingAgentWithFallback:
    role = AgentRole.TACTICAL_REASONING
    label = "CrashingAgent"

    def run(self, context: AgentContext) -> AgentOutcome:
        context.view.write("partial_dirty_key", "dirty_data_from_crashed_primary")
        raise RuntimeError("Midway primary agent explosion")

    def fallback(self, context: AgentContext) -> AgentOutcome:
        context.view.write("clean_fallback_key", "pristine_fallback_data")
        return AgentOutcome(
            role=self.role,
            label=self.label,
            status=AgentStatus.FALLBACK,
            latency_ms=1.5,
            summary="Clean fallback executed after primary crash",
            reads=[],
            writes=["clean_fallback_key"],
        )


class CrashingAgentNoFallback:
    role = AgentRole.TACTICAL_REASONING
    label = "CrashingAgentNoFallback"

    def run(self, context: AgentContext) -> AgentOutcome:
        context.view.write("unhandled_dirty_key", "dirty_unhandled_data")
        raise RuntimeError("Fatal explosion with no fallback handler")


class DoubleCrashingAgent:
    role = AgentRole.TACTICAL_REASONING
    label = "DoubleCrashingAgent"

    def run(self, context: AgentContext) -> AgentOutcome:
        context.view.write("primary_dirty_key", "dirty_primary")
        raise RuntimeError("Primary failed")

    def fallback(self, context: AgentContext) -> AgentOutcome:
        context.view.write("fallback_dirty_key", "dirty_fallback")
        raise RuntimeError("Fallback also failed")


class DelayedZombieAgent:
    role = AgentRole.TACTICAL_REASONING
    label = "DelayedZombieAgent"

    def __init__(self, sleep_seconds: float = 0.6) -> None:
        self.sleep_seconds = sleep_seconds

    def run(self, context: AgentContext) -> AgentOutcome:
        context.view.write("zombie_early_key", "early_staged_value")
        time.sleep(self.sleep_seconds)
        context.view.write("zombie_late_key", "late_zombie_corruption")
        return AgentOutcome(
            role=self.role,
            label=self.label,
            status=AgentStatus.COMPLETE,
            latency_ms=self.sleep_seconds * 1000,
            summary="Late zombie finished",
            reads=[],
            writes=["zombie_early_key", "zombie_late_key"],
        )

    def fallback(self, context: AgentContext) -> AgentOutcome:
        context.view.write("fallback_clean_key", "clean_fallback_value")
        return AgentOutcome(
            role=self.role,
            label=self.label,
            status=AgentStatus.FALLBACK,
            latency_ms=1.2,
            summary="Clean fallback executed",
            reads=[],
            writes=["fallback_clean_key"],
        )


class DelayedZombieNoFallback:
    role = AgentRole.TACTICAL_REASONING
    label = "DelayedZombieNoFallback"

    def __init__(self, sleep_seconds: float = 0.6) -> None:
        self.sleep_seconds = sleep_seconds

    def run(self, context: AgentContext) -> AgentOutcome:
        context.view.write("no_fb_early_key", "early_staged_value")
        time.sleep(self.sleep_seconds)
        context.view.write("no_fb_late_key", "late_zombie_corruption")
        return AgentOutcome(
            role=self.role,
            label=self.label,
            status=AgentStatus.COMPLETE,
            latency_ms=self.sleep_seconds * 1000,
            summary="Zombie no fallback finished",
            reads=[],
            writes=["no_fb_early_key", "no_fb_late_key"],
        )


class KeyCollisionZombieAgent:
    role = AgentRole.TACTICAL_REASONING
    label = "KeyCollisionZombieAgent"

    def __init__(self, sleep_seconds: float = 0.6) -> None:
        self.sleep_seconds = sleep_seconds

    def run(self, context: AgentContext) -> AgentOutcome:
        context.view.write("shared_tactical_key", "DIRTY_EARLY_WRITE")
        time.sleep(self.sleep_seconds)
        context.view.write("shared_tactical_key", "DIRTY_LATE_ZOMBIE_OVERWRITE")
        return AgentOutcome(
            role=self.role,
            label=self.label,
            status=AgentStatus.COMPLETE,
            latency_ms=self.sleep_seconds * 1000,
            summary="Zombie overwrite done",
            reads=[],
            writes=["shared_tactical_key"],
        )

    def fallback(self, context: AgentContext) -> AgentOutcome:
        context.view.write("shared_tactical_key", "CLEAN_FALLBACK_AUTHORITATIVE")
        return AgentOutcome(
            role=self.role,
            label=self.label,
            status=AgentStatus.FALLBACK,
            latency_ms=1.0,
            summary="Authoritative fallback done",
            reads=[],
            writes=["shared_tactical_key"],
        )


# --- Tests -------------------------------------------------------------------


def test_partial_write_discard_on_crash_with_fallback(engine: MatchEngine) -> None:
    """Agent crashes midway after partial writes; only clean fallback writes persist."""
    frame = engine.build_frame()
    swarm = AgentSwarm(agents=[CrashingAgentWithFallback()])

    result = swarm.run(frame, persona=ExperiencePersona.ANALYST)

    assert result.traces[0].status == AgentStatus.FALLBACK
    # The partial dirty key must NOT exist on blackboard or result
    assert swarm.blackboard.read("partial_dirty_key") is None
    assert "partial_dirty_key" not in result.blackboard
    # Clean fallback must exist
    assert swarm.blackboard.read("clean_fallback_key") == "pristine_fallback_data"
    assert result.blackboard.get("clean_fallback_key") == "pristine_fallback_data"
    swarm.shutdown()


def test_partial_write_discard_on_crash_without_fallback(engine: MatchEngine) -> None:
    """Agent without fallback crashes midway; partial writes are discarded and status is IDLE."""
    frame = engine.build_frame()
    swarm = AgentSwarm(agents=[CrashingAgentNoFallback()])

    result = swarm.run(frame, persona=ExperiencePersona.ANALYST)

    assert result.traces[0].status == AgentStatus.IDLE
    assert swarm.blackboard.read("unhandled_dirty_key") is None
    assert "unhandled_dirty_key" not in result.blackboard
    assert len(swarm.blackboard.snapshot()) == 0
    swarm.shutdown()


def test_partial_write_discard_when_both_agent_and_fallback_crash(engine: MatchEngine) -> None:
    """Agent and its fallback both crash midway; both partial writes are discarded cleanly."""
    frame = engine.build_frame()
    swarm = AgentSwarm(agents=[DoubleCrashingAgent()])

    result = swarm.run(frame, persona=ExperiencePersona.ANALYST)

    assert result.traces[0].status == AgentStatus.IDLE
    assert swarm.blackboard.read("primary_dirty_key") is None
    assert swarm.blackboard.read("fallback_dirty_key") is None
    assert "primary_dirty_key" not in result.blackboard
    assert "fallback_dirty_key" not in result.blackboard
    assert len(swarm.blackboard.snapshot()) == 0
    swarm.shutdown()


def test_delayed_zombie_thread_isolation_under_timeout(engine: MatchEngine) -> None:
    """Zombie thread sleeps past 400ms timeout; late writes never leak into blackboard."""
    frame = engine.build_frame()
    swarm = AgentSwarm(agents=[DelayedZombieAgent(sleep_seconds=0.6)])

    # Swarm runs with default budget (timeout=400ms)
    result = swarm.run(frame, persona=ExperiencePersona.ANALYST)

    # Immediate post-run assertions
    assert result.traces[0].status == AgentStatus.FALLBACK
    assert swarm.blackboard.read("fallback_clean_key") == "clean_fallback_value"
    assert swarm.blackboard.read("zombie_early_key") is None
    assert swarm.blackboard.read("zombie_late_key") is None

    # Wait for the zombie thread to wake up at 0.6s and execute its late write
    time.sleep(0.4)

    # Post-wake assertions
    snapshot = swarm.blackboard.snapshot()
    assert "zombie_early_key" not in snapshot
    assert "zombie_late_key" not in snapshot
    assert snapshot.get("fallback_clean_key") == "clean_fallback_value"
    swarm.shutdown()


def test_delayed_zombie_without_fallback_isolation(engine: MatchEngine) -> None:
    """Zombie thread without fallback times out; late writes never leak into blackboard."""
    frame = engine.build_frame()
    swarm = AgentSwarm(agents=[DelayedZombieNoFallback(sleep_seconds=0.6)])

    result = swarm.run(frame, persona=ExperiencePersona.ANALYST)

    assert result.traces[0].status == AgentStatus.IDLE
    assert swarm.blackboard.read("no_fb_early_key") is None
    assert swarm.blackboard.read("no_fb_late_key") is None

    # Wait for zombie thread to wake and attempt write
    time.sleep(0.4)

    snapshot = swarm.blackboard.snapshot()
    assert "no_fb_early_key" not in snapshot
    assert "no_fb_late_key" not in snapshot
    assert len(snapshot) == 0
    swarm.shutdown()


def test_zombie_thread_key_collision_does_not_overwrite_fallback(engine: MatchEngine) -> None:
    """Zombie thread attempting to overwrite the same key as fallback does not corrupt state."""
    frame = engine.build_frame()
    swarm = AgentSwarm(agents=[KeyCollisionZombieAgent(sleep_seconds=0.6)])

    result = swarm.run(frame, persona=ExperiencePersona.ANALYST)

    assert result.traces[0].status == AgentStatus.FALLBACK
    assert swarm.blackboard.read("shared_tactical_key") == "CLEAN_FALLBACK_AUTHORITATIVE"

    # Wait for zombie to wake up and execute late overwrite
    time.sleep(0.4)

    # Must STILL be authoritative fallback value
    assert swarm.blackboard.read("shared_tactical_key") == "CLEAN_FALLBACK_AUTHORITATIVE"
    swarm.shutdown()


def test_multi_cycle_stream_stability_under_active_zombie_thread(engine: MatchEngine) -> None:
    """Cycle 2 runs while Cycle 1 zombie is sleeping; Cycle 2 state is uncorrupted by Cycle 1 zombie."""
    frame = engine.build_frame()
    swarm = AgentSwarm(agents=[DelayedZombieAgent(sleep_seconds=0.6)])

    # Cycle 1: Times out at 400ms, starts 600ms zombie
    res1 = swarm.run(frame, persona=ExperiencePersona.ANALYST)
    assert res1.traces[0].status == AgentStatus.FALLBACK

    class Cycle2HealthyAgent:
        role = AgentRole.TACTICAL_REASONING
        label = "Cycle2HealthyAgent"

        def run(self, context: AgentContext) -> AgentOutcome:
            context.view.write("cycle_2_metric", "pristine_cycle_2_value")
            return AgentOutcome(
                role=self.role,
                label=self.label,
                status=AgentStatus.COMPLETE,
                latency_ms=2.0,
                summary="Cycle 2 complete",
                reads=[],
                writes=["cycle_2_metric"],
            )

    # Immediately run Cycle 2 on the same swarm
    swarm.agents[0] = Cycle2HealthyAgent()
    res2 = swarm.run(frame, persona=ExperiencePersona.ANALYST)
    assert res2.traces[0].status == AgentStatus.COMPLETE
    assert swarm.blackboard.read("cycle_2_metric") == "pristine_cycle_2_value"

    # Wait for Cycle 1's zombie to wake up and attempt late write
    time.sleep(0.4)

    snapshot = swarm.blackboard.snapshot()
    assert snapshot.get("cycle_2_metric") == "pristine_cycle_2_value"
    assert snapshot.get("fallback_clean_key") == "clean_fallback_value"
    assert "zombie_early_key" not in snapshot
    assert "zombie_late_key" not in snapshot
    swarm.shutdown()


def test_concurrent_four_agent_zombie_swarm(engine: MatchEngine) -> None:
    """All 4 agents become zombies simultaneously; fallbacks succeed and zero zombie writes leak."""
    roles = [
        AgentRole.TELEMETRY_INGESTION,
        AgentRole.TACTICAL_REASONING,
        AgentRole.BROADCAST_NARRATIVE,
        AgentRole.FAN_PERSONALIZATION,
    ]

    class IndexedZombieAgent:
        def __init__(self, role: AgentRole, idx: int) -> None:
            self.role = role
            self.label = f"ZombieAgent_{idx}"
            self.idx = idx

        def run(self, context: AgentContext) -> AgentOutcome:
            context.view.write(f"zombie_early_{self.idx}", f"dirty_early_{self.idx}")
            time.sleep(0.6)
            context.view.write(f"zombie_late_{self.idx}", f"dirty_late_{self.idx}")
            return AgentOutcome(
                role=self.role,
                label=self.label,
                status=AgentStatus.COMPLETE,
                latency_ms=610.0,
                summary=f"Zombie {self.idx} done",
                reads=[],
                writes=[f"zombie_early_{self.idx}", f"zombie_late_{self.idx}"],
            )

        def fallback(self, context: AgentContext) -> AgentOutcome:
            context.view.write(f"clean_fallback_{self.idx}", f"clean_val_{self.idx}")
            return AgentOutcome(
                role=self.role,
                label=self.label,
                status=AgentStatus.FALLBACK,
                latency_ms=1.0,
                summary=f"Fallback {self.idx} done",
                reads=[],
                writes=[f"clean_fallback_{self.idx}"],
            )

    agents = [IndexedZombieAgent(roles[i], i) for i in range(4)]
    frame = engine.build_frame()
    swarm = AgentSwarm(agents=agents)

    result = swarm.run(frame, persona=ExperiencePersona.ANALYST)

    for i in range(4):
        assert result.traces[i].status == AgentStatus.FALLBACK
        assert swarm.blackboard.read(f"clean_fallback_{i}") == f"clean_val_{i}"
        assert swarm.blackboard.read(f"zombie_early_{i}") is None
        assert swarm.blackboard.read(f"zombie_late_{i}") is None

    # Wait for all 4 zombie threads to wake and attempt writes
    time.sleep(0.4)

    snapshot = swarm.blackboard.snapshot()
    for i in range(4):
        assert snapshot.get(f"clean_fallback_{i}") == f"clean_val_{i}"
        assert f"zombie_early_{i}" not in snapshot
        assert f"zombie_late_{i}" not in snapshot

    swarm.shutdown()
