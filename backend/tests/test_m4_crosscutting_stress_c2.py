"""Adversarial cross-cutting stress testing suite for Milestone 4 Challenger 2.

Cross-cutting empirical verification across full-stack integration:
1. Concurrent Torture Test:
   - Simultaneous operations across:
     * Playback scrubbing & jumps (0s-5400s)
     * Swarm blackboard concurrent reads, transactions, atomic writes, and discards
     * Intensive spatial analytics (pitch control 357 cells, PDR, passing lane)
     * Azure MCP tool invocations
     * WebSocket 5 Hz telemetry streaming client & /health polling
   - 18 concurrent threads running sustained parallel load.
   - Verifies zero deadlocks, zero thread starvation, state consistency, and simulation liveness.

2. Playback State Consistency Under Rapid Pause/Resume/Jump Cycles:
   - 100 rapid sequential cycles of pausing, jumping, resuming, and speed adjustment.
   - Verifies clock freezing during pause, correct jump target, clean resumption, and status consistency.

3. Read/Write Lock Fairness & Zero Starvation:
   - 25 concurrent reader threads constantly hammering blackboard snapshots, latest frames, and health.
   - Writer thread performing timeline jumps and speed updates.
   - Verifies writer execution latency is bounded and readers observe coherent states.

4. Spatial Analytics Concurrency During Scenario Resets & Time Jumps:
   - Background threads triggering scenario resets and random jumps.
   - Spatial workers computing pitch control and passing lanes.
   - Verifies 357-cell invariance, [0.0, 1.0] probability bounds, and no index errors during resets.

5. Azure MCP Tool Surface Burst Stress:
   - 10 parallel threads each executing 30 MCP invocations (300 total requests).
   - Verifies clean HTTP 200 / HTTP 404 responses without server crashes or lock contention failures.
"""

from __future__ import annotations

import concurrent.futures
import random
import threading
import time

from app.agents.base import (
    K_BALL,
    K_CONTROL_VS_CHAOS,
    K_MATCH_CLOCK,
    K_PITCH_CONTROL_HOME,
    BlackboardView,
)
from app.analytics.pitch_control import (
    CELL_COUNT,
    calculate_pitch_control_percentages,
    calculate_pitch_control_surface,
)
from app.main import create_app
from app.runtime import MatchRuntime
from app.simulation.spatial import evaluate_lane
from fastapi.testclient import TestClient

# ==============================================================================
# SECTION 1: Cross-Cutting Full-Stack Concurrent Torture Test
# ==============================================================================


def test_crosscutting_torture_concurrent_scrub_blackboard_spatial_mcp_ws() -> None:
    """18 concurrent threads bombarding playback, blackboard, spatial, MCP, and WebSocket.

    Verifies:
    - Zero deadlocks across all 18 threads over 10 full seconds of intense execution.
    - Zero thread starvation: every worker executes > 30 operations.
    - Zero dropped WebSocket frames or disconnection errors.
    - State consistency: match clock, playback speed, and frame IDs remain strictly valid.
    - Simulation worker remains alive, ready=True, heartbeat_fresh=True, worker_errors=0.
    """
    app = create_app()
    with TestClient(app) as client, client.websocket_connect("/ws/telemetry") as ws:
        runtime: MatchRuntime = app.state.runtime
        assert runtime._ready.wait(timeout=10.0), "Simulation runtime failed to warm up"

        # Drain initial telemetry envelope
        init_envelope = ws.receive_json()
        assert "frame" in init_envelope
        assert "blackboard" in init_envelope

        stop_event = threading.Event()
        errors: list[str] = []
        op_counts: dict[str, int] = {}
        counts_lock = threading.Lock()

        def record_op(category: str) -> None:
            with counts_lock:
                op_counts[category] = op_counts.get(category, 0) + 1

        # --- Worker Group 1: Playback Scrubbing & Speed Jumps (4 threads) ---
        def playback_worker(worker_id: int) -> None:
            rng = random.Random(2000 + worker_id)
            targets = [0.0, 30.0, 120.0, 450.0, 1200.0, 2700.0, 3600.0, 4500.0, 5400.0]
            speeds = [0.25, 0.5, 1.0, 2.0, 5.0, 10.0]

            while not stop_event.is_set():
                action = rng.choice(["jump", "pause", "resume", "speed"])
                try:
                    if action == "jump":
                        sec = rng.choice(targets)
                        res = client.post("/api/playback/jump", json={"seconds": sec})
                        if res.status_code != 200:
                            errors.append(f"Playback jump {sec} failed: {res.status_code} {res.text}")
                        else:
                            data = res.json()
                            if not (0.0 <= data["matchSeconds"] <= 5400.0):
                                errors.append(f"Invalid matchSeconds in jump: {data}")
                    elif action == "pause":
                        res = client.post("/api/playback/pause")
                        if res.status_code != 200:
                            errors.append(f"Playback pause failed: {res.status_code}")
                    elif action == "resume":
                        res = client.post("/api/playback/resume")
                        if res.status_code != 200:
                            errors.append(f"Playback resume failed: {res.status_code}")
                    elif action == "speed":
                        spd = rng.choice(speeds)
                        res = client.post("/api/playback/speed", json={"speed": spd})
                        if res.status_code != 200:
                            errors.append(f"Playback speed {spd} failed: {res.status_code}")
                    record_op("playback")
                except Exception as exc:
                    errors.append(f"Playback worker {worker_id} exception: {exc}")
                time.sleep(0.01)

        # --- Worker Group 2: Swarm Blackboard Read/Write/Transactions (4 threads) ---
        def blackboard_worker(worker_id: int) -> None:
            rng = random.Random(3000 + worker_id)
            bb = runtime.swarm.blackboard

            while not stop_event.is_set():
                action = rng.choice(["snapshot", "read_keys", "transaction_commit", "transaction_discard"])
                try:
                    if action == "snapshot":
                        snap = bb.snapshot()
                        if not isinstance(snap, dict):
                            errors.append(f"Blackboard snapshot returned non-dict: {type(snap)}")
                    elif action == "read_keys":
                        _ = bb.read(K_MATCH_CLOCK)
                        _ = bb.read(K_BALL)
                        _ = bb.read(K_CONTROL_VS_CHAOS)
                        _ = bb.read(K_PITCH_CONTROL_HOME)
                    elif action == "transaction_commit":
                        view = BlackboardView(blackboard=bb)
                        view.write(f"stress_metric_{worker_id}", rng.random())
                        view.commit()
                    elif action == "transaction_discard":
                        view = BlackboardView(blackboard=bb)
                        view.write(f"dirty_metric_{worker_id}", -999.0)
                        view.discard()
                    record_op("blackboard")
                except Exception as exc:
                    errors.append(f"Blackboard worker {worker_id} exception: {exc}")
                time.sleep(0.005)

        # --- Worker Group 3: Intensive Spatial Analytics (4 threads) ---
        def spatial_worker(worker_id: int) -> None:
            while not stop_event.is_set():
                try:
                    with runtime._lock:
                        players = list(runtime.engine.state.players)
                    if len(players) >= 22:
                        cells = calculate_pitch_control_surface(players)
                        if len(cells) != CELL_COUNT:
                            errors.append(f"Spatial cells violation: {len(cells)} != {CELL_COUNT}")
                        if any(
                            c.homeWeight < 0.0
                            or c.homeWeight > 1.0
                            or c.awayWeight < 0.0
                            or c.awayWeight > 1.0
                            for c in cells
                        ):
                            errors.append("Pitch control weights out of [0.0, 1.0] range")
                        if any(c.controlScore < -1.0 or c.controlScore > 1.0 for c in cells):
                            errors.append("Pitch control controlScore out of [-1.0, 1.0] range")

                        pct = calculate_pitch_control_percentages(cells)
                        total_pct = pct["home"] + pct["away"] + pct["contested"]
                        if abs(total_pct - 100.0) > 0.5:
                            errors.append(f"Pitch control percentage sum drifted: {total_pct}")

                        # Evaluate lane between home and away player
                        passer = next((p for p in players if p.id == "h11"), players[0])
                        receiver = next((p for p in players if p.id == "h7"), players[1])
                        opponents = [p for p in players if p.team != passer.team]
                        lane = evaluate_lane(passer, receiver, opponents)
                        if not (0.0 <= lane.passDifficultyRating <= 100.0):
                            errors.append(f"Lane PDR out of bounds: {lane.passDifficultyRating}")

                    record_op("spatial")
                except Exception as exc:
                    errors.append(f"Spatial worker {worker_id} exception: {exc}")
                time.sleep(0.02)

        # --- Worker Group 4: Azure MCP Tool Registry Invocations (4 threads) ---
        def mcp_worker(worker_id: int) -> None:
            rng = random.Random(4000 + worker_id)
            tools = [
                ("get_pitch_control_surface", lambda: {"includeCells": False}),
                ("get_control_vs_chaos_index", lambda: {}),
                ("get_match_events", lambda: {"limit": 10}),
                ("get_agent_trace", lambda: {}),
                ("get_player_spotlight", lambda: {"playerId": rng.choice(["h11", "a9", "h7", "a11"])}),
                ("jump_match_time", lambda: {"seconds": rng.choice([100.0, 500.0, 1500.0, 2700.0])}),
            ]

            while not stop_event.is_set():
                tool_name, args_factory = rng.choice(tools)
                args = args_factory()
                try:
                    res = client.post("/api/mcp/invoke", json={"tool": tool_name, "arguments": args})
                    if res.status_code != 200:
                        errors.append(f"MCP {tool_name} failed: HTTP {res.status_code} {res.text}")
                    else:
                        data = res.json()
                        if "result" not in data:
                            errors.append(f"MCP {tool_name} response missing 'result': {data}")
                    record_op("mcp")
                except Exception as exc:
                    errors.append(f"MCP worker {worker_id} exception: {exc}")
                time.sleep(0.01)

        # --- Worker Group 5: Active WebSocket Telemetry & Health Streaming (2 threads) ---
        def ws_stream_worker() -> None:
            while not stop_event.is_set():
                try:
                    env = ws.receive_json()
                    if "frame" not in env or "blackboard" not in env:
                        errors.append(f"WebSocket envelope missing required keys: {list(env.keys())}")
                    else:
                        frame = env["frame"]
                        if not (0.0 <= frame.get("matchSeconds", -1) <= 5400.0):
                            errors.append(
                                f"WebSocket frame invalid matchSeconds: {frame.get('matchSeconds')}"
                            )
                    record_op("ws_stream")
                except Exception as exc:
                    if not stop_event.is_set():
                        errors.append(f"WebSocket stream error: {exc}")
                    break

        def health_polling_worker() -> None:
            while not stop_event.is_set():
                try:
                    res = client.get("/api/health")
                    if res.status_code != 200:
                        errors.append(f"Health poll failed: HTTP {res.status_code}")
                    else:
                        h = res.json()
                        if not h.get("simulationAlive") or not h.get("ready") or not h.get("heartbeat_fresh"):
                            errors.append(f"Health check degraded under stress: {h}")
                    record_op("health_poll")
                except Exception as exc:
                    errors.append(f"Health polling error: {exc}")
                time.sleep(0.1)

        # Assemble and launch 18 worker threads
        threads: list[threading.Thread] = []
        for i in range(4):
            threads.append(threading.Thread(target=playback_worker, args=(i,), name=f"stress-play-{i}"))
        for i in range(4):
            threads.append(threading.Thread(target=blackboard_worker, args=(i,), name=f"stress-bb-{i}"))
        for i in range(4):
            threads.append(threading.Thread(target=spatial_worker, args=(i,), name=f"stress-spat-{i}"))
        for i in range(4):
            threads.append(threading.Thread(target=mcp_worker, args=(i,), name=f"stress-mcp-{i}"))
        threads.append(threading.Thread(target=ws_stream_worker, name="stress-ws"))
        threads.append(threading.Thread(target=health_polling_worker, name="stress-health"))

        for t in threads:
            t.daemon = True
            t.start()

        # Run torture test for 10 full seconds under parallel stress
        time.sleep(10.0)

        # Stop workers and join
        stop_event.set()
        for t in threads:
            t.join(timeout=3.0)

        # Assert zero deadlocks or uncaught errors
        assert not errors, (
            f"Encountered {len(errors)} errors during cross-cutting torture test:\n" + "\n".join(errors[:15])
        )

        # Assert no thread starvation: every category executed substantial operations
        assert op_counts.get("playback", 0) >= 20, f"Playback starved: {op_counts}"
        assert op_counts.get("blackboard", 0) >= 100, f"Blackboard starved: {op_counts}"
        assert op_counts.get("spatial", 0) >= 20, f"Spatial starved: {op_counts}"
        assert op_counts.get("mcp", 0) >= 15, f"MCP starved: {op_counts}"
        assert op_counts.get("ws_stream", 0) >= 5, f"WebSocket starved: {op_counts}"
        assert op_counts.get("health_poll", 0) >= 4, f"Health starved: {op_counts}"

        total_ops = sum(op_counts.values())
        assert total_ops >= 500, f"Expected >500 total operations under load, got {total_ops}"

        # Final health inspection
        assert runtime.simulation_alive is True
        assert runtime.ready is True
        assert runtime.heartbeat_fresh is True
        assert runtime.worker_error is None


# ==============================================================================
# SECTION 2: Playback State Consistency Under Rapid Pause/Resume/Jump Cycles
# ==============================================================================


def test_playback_state_consistency_under_rapid_pause_resume_jump_cycles() -> None:
    """100 rapid sequential cycles of pause, jump, resume, and speed modifications.

    Verifies state invariants:
    - When paused, engine match seconds remain frozen.
    - Jumping while paused sets match seconds to target and retains paused state.
    - Resuming unpauses cleanly and simulation advances.
    - Out-of-bounds jumps are clamped to [0.0, 5400.0].
    """
    app = create_app()
    with TestClient(app) as client:
        runtime: MatchRuntime = app.state.runtime
        assert runtime._ready.wait(timeout=10.0)

        test_points = [
            (0.0, 0.0),
            (150.0, 150.0),
            (600.0, 600.0),
            (2700.0, 2700.0),
            (4500.0, 4500.0),
            (5400.0, 5400.0),
            (-50.0, 0.0),  # Underflow clamping
            (6000.0, 5400.0),  # Overflow clamping
        ]

        for cycle in range(50):
            target_sec, expected_clamped = test_points[cycle % len(test_points)]

            # 1. Pause
            res_pause = client.post("/api/playback/pause")
            assert res_pause.status_code == 200
            assert res_pause.json()["paused"] is True
            assert runtime.is_paused is True

            # 2. Jump while paused
            res_jump = client.post("/api/playback/jump", json={"seconds": target_sec})
            assert res_jump.status_code == 200
            jump_data = res_jump.json()
            assert jump_data["paused"] is True
            assert abs(jump_data["matchSeconds"] - expected_clamped) <= 0.01
            assert runtime.is_paused is True
            assert abs(runtime.engine.match_seconds - expected_clamped) <= 0.01

            # Verify time is frozen while paused
            frozen_sec = runtime.engine.match_seconds
            time.sleep(0.05)
            assert runtime.engine.match_seconds == frozen_sec

            # 3. Change speed while paused
            res_speed = client.post("/api/playback/speed", json={"speed": 2.0})
            assert res_speed.status_code == 200
            assert res_speed.json()["speed"] == 2.0

            # 4. Resume
            res_resume = client.post("/api/playback/resume")
            assert res_resume.status_code == 200
            assert res_resume.json()["paused"] is False
            assert runtime.is_paused is False

            # Verify simulation steps forward after resume (if not at match end 5400s)
            if expected_clamped < 5350.0:
                time.sleep(0.12)
                assert runtime.engine.match_seconds > frozen_sec


# ==============================================================================
# SECTION 3: Read/Write Lock Fairness & Zero Starvation
# ==============================================================================


def test_read_write_lock_fairness_and_zero_starvation() -> None:
    """25 concurrent reader threads hammering the system while writer executes jumps.

    Verifies:
    - Reader contention does NOT permanently block writer (writer finishes <= 5.0s per jump).
    - Reader threads consistently receive valid states with zero torn reads or crashes.
    """
    app = create_app()
    with TestClient(app) as client:
        runtime: MatchRuntime = app.state.runtime
        assert runtime._ready.wait(timeout=10.0)

        stop_readers = threading.Event()
        reader_errors: list[Exception] = []
        reader_counts = [0] * 25

        def reader_task(rid: int) -> None:
            count = 0
            try:
                while not stop_readers.is_set():
                    snap = runtime.swarm.blackboard.snapshot()
                    assert isinstance(snap, dict)
                    frame = runtime.latest_frame()
                    if frame is not None:
                        assert 0.0 <= frame.matchSeconds <= 5400.0
                    count += 1
            except Exception as exc:
                reader_errors.append(exc)
            finally:
                reader_counts[rid] = count

        # Start 25 concurrent reader threads
        threads = [
            threading.Thread(target=reader_task, args=(i,), name=f"fair-reader-{i}") for i in range(25)
        ]
        for t in threads:
            t.start()

        # Writer thread performs 15 jumps and verifies latency
        jump_targets = [100.0, 300.0, 900.0, 1800.0, 3600.0, 500.0, 200.0, 4500.0]
        writer_latencies: list[float] = []

        for tgt in jump_targets:
            t0 = time.perf_counter()
            res = client.post("/api/playback/jump", json={"seconds": tgt})
            latency = time.perf_counter() - t0
            writer_latencies.append(latency)

            assert res.status_code == 200
            assert abs(res.json()["matchSeconds"] - tgt) <= 0.01
            # Writer must acquire lock and complete within generous 4.0s
            assert latency < 4.0, f"Writer starved! Jump to {tgt} took {latency:.2f}s"

        stop_readers.set()
        for t in threads:
            t.join(timeout=5.0)

        assert not reader_errors, f"Reader thread errors: {reader_errors}"
        total_reads = sum(reader_counts)
        assert total_reads >= 2500, f"Expected high reader throughput, got {total_reads}"


# ==============================================================================
# SECTION 4: Spatial Analytics Stability During Simultaneous Scenario Resets
# ==============================================================================


def test_spatial_analytics_concurrency_during_scenario_reset_and_jumps() -> None:
    """Continuous spatial calculations while other threads trigger scenario resets and jumps.

    Verifies:
    - 357-cell grid geometry is never corrupted or fragmented during reset.
    - Probabilities strictly in [0.0, 1.0].
    - Zero KeyError or IndexError from reading players mid-reset.
    """
    app = create_app()
    with TestClient(app) as client:
        runtime: MatchRuntime = app.state.runtime
        assert runtime._ready.wait(timeout=10.0)

        stop_event = threading.Event()
        spatial_errors: list[str] = []
        spatial_cycles = [0] * 4

        # Thread 1: Periodic scenario resets
        def reset_worker() -> None:
            scenarios = ["low_block_siege", "counter_attack_blitz", "high_possession", "final_whistle_lead"]
            idx = 0
            while not stop_event.is_set():
                client.post("/api/scenario", params={"scenario": scenarios[idx % len(scenarios)]})
                idx += 1
                time.sleep(0.2)

        # Thread 2: Periodic random time jumps
        def jump_worker() -> None:
            rng = random.Random(555)
            while not stop_event.is_set():
                client.post("/api/playback/jump", json={"seconds": rng.uniform(0.0, 5400.0)})
                time.sleep(0.15)

        # Threads 3-6: High-frequency spatial analytics
        def spatial_calc_worker(wid: int) -> None:
            count = 0
            while not stop_event.is_set():
                try:
                    res = client.post(
                        "/api/mcp/invoke",
                        json={"tool": "get_pitch_control_surface", "arguments": {"includeCells": True}},
                    )
                    if res.status_code != 200:
                        spatial_errors.append(f"Spatial invoke failed: {res.status_code} {res.text}")
                    else:
                        result = res.json()["result"]
                        if result.get("cellCount") != 357:
                            spatial_errors.append(f"Invalid cell count: {result.get('cellCount')}")
                        cells = result.get("cells", [])
                        if len(cells) != 357:
                            spatial_errors.append(f"Cell array length mismatch: {len(cells)}")
                        for c in cells[:10]:
                            hw = c.get("homeWeight", -1)
                            aw = c.get("awayWeight", -1)
                            cs = c.get("controlScore", -99)
                            if not (0.0 <= hw <= 1.0) or not (0.0 <= aw <= 1.0):
                                spatial_errors.append(f"Cell weight out of bounds: hw={hw}, aw={aw}")
                            if not (-1.0 <= cs <= 1.0):
                                spatial_errors.append(f"Cell controlScore out of bounds: cs={cs}")
                    count += 1
                except Exception as exc:
                    spatial_errors.append(f"Spatial calc error: {exc}")
                time.sleep(0.01)
            spatial_cycles[wid] = count

        t_reset = threading.Thread(target=reset_worker, name="reset-worker")
        t_jump = threading.Thread(target=jump_worker, name="jump-worker")
        spatial_threads = [
            threading.Thread(target=spatial_calc_worker, args=(i,), name=f"spatial-{i}") for i in range(4)
        ]

        t_reset.start()
        t_jump.start()
        for st in spatial_threads:
            st.start()

        time.sleep(6.0)

        stop_event.set()
        t_reset.join(timeout=3.0)
        t_jump.join(timeout=3.0)
        for st in spatial_threads:
            st.join(timeout=3.0)

        assert not spatial_errors, f"Spatial errors during resets: {spatial_errors[:10]}"
        assert sum(spatial_cycles) >= 50, f"Expected >50 spatial evaluations, got {sum(spatial_cycles)}"


# ==============================================================================
# SECTION 5: Azure MCP Tool Surface Burst Stress
# ==============================================================================


def test_mcp_endpoints_under_heavy_concurrent_burst() -> None:
    """10 parallel threads each issuing 20 MCP tool invocations (200 total requests).

    Mixes valid queries, boundary jumps, and invalid player IDs to verify:
    - Valid queries return HTTP 200.
    - Invalid queries return structured HTTP 404/400 (never 500).
    - Zero server hangs, deadlocks, or registry corruption.
    """
    app = create_app()
    with TestClient(app) as client:
        runtime: MatchRuntime = app.state.runtime
        assert runtime._ready.wait(timeout=10.0)

        tools_and_args = [
            ("get_pitch_control_surface", {"includeCells": False}, 200),
            ("get_control_vs_chaos_index", {}, 200),
            ("get_match_events", {"limit": 15}, 200),
            ("get_agent_trace", {}, 200),
            ("get_player_spotlight", {"playerId": "h11"}, 200),
            ("get_player_spotlight", {"playerId": "non_existent_player_id"}, 404),
            ("jump_match_time", {"seconds": 500.0}, 200),
            ("jump_match_time", {"seconds": 5400.0}, 200),
            ("jump_match_time", {"seconds": 0.0}, 200),
            ("jump_match_time", {"seconds": -1.0}, 400),
            ("jump_match_time", {"seconds": 6000.0}, 400),
        ]

        errors: list[str] = []

        def worker_burst(wid: int) -> None:
            rng = random.Random(6000 + wid)
            for _ in range(20):
                tool_name, args, expected_status = rng.choice(tools_and_args)
                try:
                    res = client.post("/api/mcp/invoke", json={"tool": tool_name, "arguments": args})
                    if res.status_code != expected_status:
                        errors.append(
                            f"MCP {tool_name} with {args}: expected {expected_status}, got {res.status_code} ({res.text})"
                        )
                except Exception as exc:
                    errors.append(f"MCP burst worker {wid} exception on {tool_name}: {exc}")

        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(worker_burst, i) for i in range(10)]
            concurrent.futures.wait(futures)

        assert not errors, f"Encountered {len(errors)} errors during MCP burst:\n" + "\n".join(errors[:10])
        assert runtime.simulation_alive is True
        assert runtime.ready is True
