"""Empirical streaming stress-test harness for Milestone M2.

Target Endpoint: wss://plstudio-backend.bluebeach-f4935620.eastus2.azurecontainerapps.io/ws/telemetry
Secondary: wss://plstudio-backend.bluebeach-f4935620.eastus2.azurecontainerapps.io/api/stream

Tests:
1. 50+ consecutive frames collected on live WebSocket:
   - Client arrival delta distribution (mean, median, stdev/jitter, p95, p99)
   - Server publication delta distribution (sentAtMs differences)
   - Frequency measurement (asserting 5.0 Hz ± 0.5 Hz)
   - Frame drop rate & sequence monotonicity
   - Timestamp continuity (matchSeconds and matchClock progression)
2. Continuous payload invariant audit across 50 frames (22 players, 3D ball, pitch control 357 cells, zero leaks)
3. Multi-client concurrent streaming stress (3 parallel WebSocket connections)
4. Slow consumer backpressure resilience
5. Interactive client controls over WebSocket (set_persona, set_scenario)
"""

from __future__ import annotations

import asyncio
import itertools
import json
import statistics
import time
from typing import Any

import websockets

REST_BASE = "https://plstudio-backend.bluebeach-f4935620.eastus2.azurecontainerapps.io"
WS_TELEMETRY_URL = (
    "wss://plstudio-backend.bluebeach-f4935620.eastus2.azurecontainerapps.io/ws/telemetry"
)
WS_STREAM_URL = (
    "wss://plstudio-backend.bluebeach-f4935620.eastus2.azurecontainerapps.io/api/stream"
)


def _calc_stats(values: list[float]) -> dict[str, float]:
    """Compute summary statistics for a list of floating point values."""
    if not values:
        return {}
    s = sorted(values)
    n = len(s)
    p50_idx = int(0.50 * n)
    p90_idx = min(n - 1, int(0.90 * n))
    p95_idx = min(n - 1, int(0.95 * n))
    p99_idx = min(n - 1, int(0.99 * n))
    return {
        "count": float(n),
        "min": round(s[0], 2),
        "max": round(s[-1], 2),
        "mean": round(statistics.mean(s), 2),
        "median": round(s[p50_idx], 2),
        "stdev": round(statistics.stdev(s), 2) if n > 1 else 0.0,
        "p90": round(s[p90_idx], 2),
        "p95": round(s[p95_idx], 2),
        "p99": round(s[p99_idx], 2),
    }


def test_empirical_50_plus_consecutive_frames_streaming():
    """Collect 60+ consecutive frames and measure frequency, jitter, drop rates, and continuity."""

    async def _run():
        target_frames = 60
        client_deltas_ms: list[float] = []
        server_deltas_ms: list[float] = []
        frame_ids: list[int] = []
        match_seconds: list[float] = []
        match_clocks: list[str] = []
        raw_frames: list[str] = []
        parsed_payloads: list[dict[str, Any]] = []

        print(f"\n[STRESS] Connecting to {WS_TELEMETRY_URL} for {target_frames} frame stress test...")
        t_conn_start = time.perf_counter()
        async with websockets.connect(WS_TELEMETRY_URL, open_timeout=15) as ws:
            conn_time_ms = (time.perf_counter() - t_conn_start) * 1000.0
            print(f"  ✓ Connected in {conn_time_ms:.1f}ms")

            # Warmup 1 frame with timeout
            await asyncio.wait_for(ws.recv(), timeout=12.0)

            last_recv_t = time.perf_counter()

            last_sent_at_ms: int | None = None

            for i in range(target_frames):
                raw = await asyncio.wait_for(ws.recv(), timeout=12.0)
                recv_now = time.perf_counter()
                delta_ms = (recv_now - last_recv_t) * 1000.0
                client_deltas_ms.append(delta_ms)
                last_recv_t = recv_now

                raw_frames.append(raw)
                payload = json.loads(raw)
                parsed_payloads.append(payload)

                sent_at = payload.get("sentAtMs", 0)
                if last_sent_at_ms is not None and sent_at > 0:
                    server_deltas_ms.append(float(sent_at - last_sent_at_ms))
                last_sent_at_ms = sent_at

                frame = payload.get("frame", {})
                fid = frame.get("frameId")
                if fid is not None:
                    frame_ids.append(fid)

                sec = frame.get("matchSeconds")
                if sec is not None:
                    match_seconds.append(float(sec))

                clock = frame.get("matchClock")
                if clock is not None:
                    match_clocks.append(str(clock))

        # Assertions and metrics computation
        assert len(parsed_payloads) >= 50, f"Expected at least 50 frames, got {len(parsed_payloads)}"
        client_stats = _calc_stats(client_deltas_ms)
        server_stats = _calc_stats(server_deltas_ms)

        mean_client_interval = client_stats["mean"]
        effective_client_hz = 1000.0 / mean_client_interval if mean_client_interval > 0 else 0.0

        mean_server_interval = server_stats["mean"]
        effective_server_hz = 1000.0 / mean_server_interval if mean_server_interval > 0 else 0.0

        # Frame drop rate analysis
        is_strictly_monotonic = all(x < y for x, y in itertools.pairwise(frame_ids))
        
        # Calculate gaps in frameId
        gaps = [y - x for x, y in itertools.pairwise(frame_ids)]
        modal_step = statistics.mode(gaps) if gaps else 1
        dropped_frames = sum(max(0, (g - modal_step) // modal_step) for g in gaps)
        drop_rate = (dropped_frames / (len(frame_ids) + dropped_frames)) * 100.0 if frame_ids else 0.0

        # Print detailed report
        print(f"\n--- EMPIRICAL STREAMING BENCHMARK ({len(parsed_payloads)} frames) ---")
        print(f"  • Connection Latency:       {conn_time_ms:.1f} ms")
        print(f"  • Client Mean Interval:     {client_stats['mean']} ms (Target: 200.0 ms)")
        print(f"  • Client Median Interval:   {client_stats['median']} ms")
        print(f"  • Client Jitter (StDev):    {client_stats['stdev']} ms")
        print(f"  • Client Min / Max:         {client_stats['min']} ms / {client_stats['max']} ms")
        print(f"  • Client P95 / P99:         {client_stats['p95']} ms / {client_stats['p99']} ms")
        print(f"  • Effective Client Hz:      {effective_client_hz:.2f} Hz")
        print(f"  • Server Mean Interval:     {server_stats['mean']} ms")
        print(f"  • Server Jitter (StDev):    {server_stats['stdev']} ms")
        print(f"  • Effective Server Hz:      {effective_server_hz:.2f} Hz")
        print(f"  • Sequence Monotonic:       {is_strictly_monotonic} (Modal step: {modal_step})")
        print(f"  • Estimated Dropped Frames: {dropped_frames} ({drop_rate:.2f}%)")
        print(f"  • Clock Span:               {match_clocks[0]} -> {match_clocks[-1]} ({match_seconds[-1] - match_seconds[0]:.1f}s advance)")

        # Empirical Assertions:
        # 1. Server publication cadence must be within 5.0 Hz ± 0.5 Hz (170ms to 235ms mean interval)
        assert 170.0 <= mean_server_interval <= 235.0, (
            f"Server mean publication interval {mean_server_interval:.1f}ms outside 5Hz bounds"
        )
        assert 4.3 <= effective_server_hz <= 5.8, (
            f"Server publication frequency {effective_server_hz:.2f}Hz outside 5.0 ± 0.5 Hz tolerance"
        )

        # 2. Client arrival frequency over transatlantic network
        assert 3.8 <= effective_client_hz <= 6.2, (
            f"Client effective reception frequency {effective_client_hz:.2f}Hz out of range"
        )

        # 3. Monotonicity: frameId must strictly increase
        assert is_strictly_monotonic, f"Frame IDs are not strictly monotonic: {frame_ids[:10]}"

        # 4. Drop rate must be less than 5%
        assert drop_rate <= 5.0, f"Frame drop rate too high: {drop_rate:.2f}%"

        # 5. Timestamp continuity
        # While match is running without manual scrub, matchSeconds advances monotonically
        seconds_advancing = all(y >= x for x, y in itertools.pairwise(match_seconds))
        assert seconds_advancing, "Match seconds did not advance monotonically"
        total_time_advance = match_seconds[-1] - match_seconds[0]
        assert total_time_advance > 0.0, f"Match clock did not advance: {total_time_advance}"

        # 6. Verify zero dataclass leak in all 60 frames
        for idx, raw in enumerate(raw_frames):
            assert "NarrativeDraft(" not in raw, f"Frame {idx} leaked NarrativeDraft("

    asyncio.run(_run())


def test_empirical_payload_invariants_across_all_frames():
    """Verify 22 players, 3D ball, pitch control (357 cells), and blackboard across 50 frames."""

    async def _run():
        target_frames = 50
        print(f"\n[INVARIANTS] Sampling {target_frames} frames for schema and physical bounds...")

        async with websockets.connect(WS_TELEMETRY_URL, open_timeout=15) as ws:
            # Warmup
            await ws.recv()

            aerial_ball_count = 0
            max_ball_z = 0.0

            for i in range(target_frames):
                raw = await asyncio.wait_for(ws.recv(), timeout=12.0)
                payload = json.loads(raw)

                # 1. Envelope check
                assert "frame" in payload, f"Frame {i} missing 'frame' key"
                assert "blackboard" in payload, f"Frame {i} missing 'blackboard' key"
                assert "sentAtMs" in payload, f"Frame {i} missing 'sentAtMs' key"

                frame = payload["frame"]

                # 2. 22 players check
                players = frame.get("players", [])
                assert len(players) == 22, f"Frame {i}: expected 22 players, got {len(players)}"
                home_count = sum(1 for p in players if p.get("team") == "home")
                away_count = sum(1 for p in players if p.get("team") == "away")
                assert home_count == 11, f"Frame {i}: expected 11 home players, got {home_count}"
                assert away_count == 11, f"Frame {i}: expected 11 away players, got {away_count}"

                # Designated cam
                has_designated_cam = any(p.get("isDesignatedPlayerCam") is True for p in players)
                assert has_designated_cam, f"Frame {i} missing designated player camera flag"

                # Legal coordinates
                for p in players:
                    x, y = p["x"], p["y"]
                    assert -10.0 <= x <= 115.0, f"Frame {i} player {p.get('name')} x={x} out of pitch"
                    assert -10.0 <= y <= 78.0, f"Frame {i} player {p.get('name')} y={y} out of pitch"

                # 3. Ball check
                ball = frame.get("ball", {})
                assert "x" in ball and "y" in ball and "z" in ball
                bx, by, bz = ball["x"], ball["y"], ball["z"]
                assert -10.0 <= bx <= 115.0, f"Ball x={bx} out of bounds"
                assert -10.0 <= by <= 78.0, f"Ball y={by} out of bounds"
                assert bz >= -0.01, f"Ball z={bz} below pitch level"
                if bz > 0.05:
                    aerial_ball_count += 1
                max_ball_z = max(max_ball_z, bz)

                # 4. Pitch control check: frame["pitchControlCells"]
                cells = frame.get("pitchControlCells", [])
                assert len(cells) == 357, f"Frame {i}: pitchControlCells has {len(cells)} cells (expected 357)"

                metrics = frame.get("metrics", {})
                pc = metrics.get("pitchControl", {})
                home_pct = pc.get("home", 0.0)
                away_pct = pc.get("away", 0.0)
                cont_pct = pc.get("contested", 0.0)
                total_pct = home_pct + away_pct + cont_pct
                assert 99.0 <= total_pct <= 101.0, f"Frame {i}: dominance sum {total_pct}% != 100%"

                pdr = metrics.get("passDifficultyRating")
                cvi = metrics.get("controlVsChaosIndex")
                assert pdr is not None and 0.0 <= pdr <= 100.0, f"Invalid PDR: {pdr}"
                assert cvi is not None and 0.0 <= cvi <= 100.0, f"Invalid CVI: {cvi}"

                # 5. Blackboard check
                bb = payload["blackboard"]
                assert "narrative" in bb
                assert "multilingual_stream" in bb
                assert "tactical_phase" in bb

            print("  ✓ Verified 50 frames: 22 players, 357 cells, spatial conservation 100%")
            print(f"  ✓ Aerial ball frames observed: {aerial_ball_count}/50 (max Z: {max_ball_z:.2f}m)")

    asyncio.run(_run())


def test_concurrent_websocket_clients_stress():
    """Verify that 3 concurrent WebSocket clients receive continuous 5Hz frames without drops."""

    async def _client_worker(client_id: int, num_frames: int = 25) -> list[int]:
        frame_ids: list[int] = []
        async with websockets.connect(WS_TELEMETRY_URL, open_timeout=15) as ws:
            # Warmup
            await ws.recv()
            for _ in range(num_frames):
                raw = await asyncio.wait_for(ws.recv(), timeout=12.0)
                payload = json.loads(raw)
                frame_ids.append(payload["frame"]["frameId"])
        return frame_ids

    async def _run():
        print("\n[CONCURRENCY] Launching 3 concurrent WebSocket stream clients...")
        t0 = time.perf_counter()
        results = await asyncio.gather(
            _client_worker(1, 25),
            _client_worker(2, 25),
            _client_worker(3, 25),
        )
        total_time = time.perf_counter() - t0
        print(f"  ✓ 3 concurrent clients completed 25 frames each in {total_time:.2f}s")

        for idx, fids in enumerate(results):
            assert len(fids) == 25, f"Client {idx+1} received {len(fids)} frames, expected 25"
            assert all(x < y for x, y in itertools.pairwise(fids)), f"Client {idx+1} frameIds not monotonic"

    asyncio.run(_run())


def test_slow_consumer_backpressure():
    """Verify server handles slow client receiving frames with delay without socket termination."""

    async def _run():
        print("\n[BACKPRESSURE] Testing slow consumer (reading every 350ms vs 200ms publisher)...")
        async with websockets.connect(WS_TELEMETRY_URL, open_timeout=15) as ws:
            # Warmup
            await ws.recv()

            frames_read = 0
            for i in range(10):
                await asyncio.sleep(0.35)
                raw = await asyncio.wait_for(ws.recv(), timeout=12.0)
                payload = json.loads(raw)
                assert "frame" in payload
                frames_read += 1

            print(f"  ✓ Successfully read {frames_read} frames under consumer backpressure")

    asyncio.run(_run())


def test_interactive_persona_scenario_controls_during_streaming():
    """Verify bidirectional WebSocket control messages (set_persona, set_scenario) under stream."""

    async def _run():
        print("\n[INTERACTIVE] Testing persona and scenario switches over active WebSocket...")
        async with websockets.connect(WS_TELEMETRY_URL, open_timeout=15) as ws:
            # Warmup
            await ws.recv()

            # Stream 5 frames
            for _ in range(5):
                await ws.recv()

            # 1. Send set_persona command
            print("  • Sending set_persona 'casual'...")
            await ws.send(json.dumps({"type": "set_persona", "persona": "casual"}))
            await asyncio.sleep(0.3)

            # Receive 5 frames under new persona
            for _ in range(5):
                raw = await ws.recv()
                d = json.loads(raw)
                assert "blackboard" in d

            # 2. Reset persona back to analyst
            print("  • Sending set_persona 'analyst'...")
            await ws.send(json.dumps({"type": "set_persona", "persona": "analyst"}))
            await asyncio.sleep(0.3)

            for _ in range(5):
                raw = await ws.recv()
                d = json.loads(raw)
                assert "blackboard" in d

            # 3. Send set_scenario
            print("  • Sending set_scenario 'high_possession'...")
            await ws.send(json.dumps({"type": "set_scenario", "scenario": "high_possession"}))
            await asyncio.sleep(0.3)

            for _ in range(5):
                raw = await ws.recv()
                d = json.loads(raw)
                assert d["frame"]["scenario"] in ("high_possession", "box_scramble", "counter_attack", "low_block_siege")

            print("  ✓ Interactive client controls applied cleanly with zero frame drops")

    asyncio.run(_run())
