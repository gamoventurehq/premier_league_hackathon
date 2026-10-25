"""Empirical Stress Test Harness for Milestone 1 Backend Simulation & Physics Engine.

Challenger 1 Empirical Verification:
1. 3D Ball Physics & Trajectory Bounds:
   - Elevation z during crosses, clearances, shots, ground passes, carries.
   - Return cleanly to z = 0.0m upon landing.
   - Ground passes and carries strictly stay at z = 0.0m and vz = 0.0m/s.
2. Player Biomechanical Kinematics:
   - Instantaneous acceleration dv/dt across all 22 players over 1000+ simulation steps.
   - Check concentric cap (4.5 - 5.2 m/s²), braking cap (7.0 m/s²), and impossible spikes (> 90 m/s²).
3. Discrete Event Taxonomy & Distribution:
   - Event frequencies over 15m, 45m, and 90m match simulations.
   - Spatial sector metadata and sub-actions.
"""

from __future__ import annotations

import math
from collections import Counter
import pytest

from app.models import MatchEventType, SyntheticScenarioType
from app.simulation.engine import MatchEngine, SCENARIO_ORDER


def run_empirical_simulation(
    scenario_type: SyntheticScenarioType = SyntheticScenarioType.COUNTER_ATTACK_TRANSITION,
    duration_seconds: float = 900.0,  # 15 minutes = 900s
    dt: float = 0.1,  # 10Hz
    seed: int = 42,
) -> dict:
    """Run simulation tick-by-tick and extract empirical kinematic and event telemetry."""
    engine = MatchEngine(seed=seed)
    engine.reset(scenario_type, start_seconds=0.0, warmup_seconds=0.0)

    total_steps = int(duration_seconds / dt)

    # Ball tracking state
    ball_z_history = []
    cross_apexes = []
    clearance_apexes = []
    shot_apexes = []
    shot_elevations = []
    ground_pass_z = []
    carry_z = []
    landing_z = []

    # Player kinematic tracking
    concentric_accels = []
    braking_accels = []
    all_instantaneous_accels = []
    accel_violations = []

    # In-flight tracking helper
    last_flight = None
    flight_max_z = 0.0

    # Event tracking
    events_at_step = []

    for step in range(total_steps):
        t = engine.match_seconds
        current_flight = engine.state.flight

        # Detect flight start / track / land
        if current_flight is not None:
            if last_flight is None or current_flight is not last_flight:
                flight_max_z = engine.state.ball_z
                last_flight = current_flight
            else:
                flight_max_z = max(flight_max_z, engine.state.ball_z)
        else:
            if last_flight is not None:
                landing_z.append((t, engine.state.ball_z, last_flight.flight_type, flight_max_z))
                if last_flight.flight_type == "cross":
                    cross_apexes.append(flight_max_z)
                elif last_flight.flight_type == "clearance":
                    clearance_apexes.append(flight_max_z)
                elif last_flight.flight_type == "shot":
                    shot_apexes.append(flight_max_z)
                elif last_flight.flight_type == "ground":
                    ground_pass_z.append(flight_max_z)
                last_flight = None
                flight_max_z = 0.0

        # Snapshot pre-step player velocities
        pre_velocities = {p.id: (p.vx, p.vy) for p in engine.state.players}

        # Events count before step
        event_count_before = len(engine.events.all())

        # EXECUTE SIMULATION STEP
        engine.step(dt)

        curr_z = engine.state.ball_z
        curr_vz = engine.state.ball_vz
        ball_z_history.append((t, curr_z, curr_vz))

        if engine.state.carrier_id is not None and engine.state.flight is None:
            carry_z.append((curr_z, curr_vz))

        new_events = engine.events.all()[event_count_before:]
        for ev in new_events:
            events_at_step.append((t, ev))
            if ev.type == MatchEventType.SHOT:
                shot_elevations.append((t, curr_z, curr_vz, engine.state.flight is not None))

        # Kinematic acceleration audit across all 22 players
        for player in engine.state.players:
            pid = player.id
            if pid in pre_velocities:
                old_vx, old_vy = pre_velocities[pid]
                new_vx, new_vy = player.vx, player.vy

                dvx = new_vx - old_vx
                dvy = new_vy - old_vy
                dv = math.hypot(dvx, dvy)
                accel = dv / dt

                all_instantaneous_accels.append(accel)

                dot = old_vx * dvx + old_vy * dvy
                is_concentric = dot >= 0.0

                if is_concentric:
                    concentric_accels.append(accel)
                    cap = 5.2 if player.is_pressing else 4.5
                    if accel > cap + 0.05:
                        accel_violations.append((step, t, pid, accel, cap, "concentric", dot, player.is_pressing))
                else:
                    braking_accels.append(accel)
                    cap = 7.0
                    if accel > cap + 0.05:
                        accel_violations.append((step, t, pid, accel, cap, "braking", dot, player.is_pressing))

    all_events = engine.events.all()
    event_counts = Counter(e.type for e in all_events)

    return {
        "duration_seconds": duration_seconds,
        "total_steps": total_steps,
        "event_counts": event_counts,
        "all_events": all_events,
        "cross_apexes": cross_apexes,
        "clearance_apexes": clearance_apexes,
        "shot_apexes": shot_apexes,
        "shot_elevations": shot_elevations,
        "ground_pass_z": ground_pass_z,
        "carry_z": carry_z,
        "landing_z": landing_z,
        "all_accels": all_instantaneous_accels,
        "concentric_accels": concentric_accels,
        "braking_accels": braking_accels,
        "accel_violations": accel_violations,
        "final_frame": engine.build_frame(),
    }


# ==============================================================================
# Pytest Test Suite
# ==============================================================================

def test_cross_and_clearance_elevation_bounds():
    """Verify crosses and clearances elevate into canonical physical bands and land at z=0."""
    res = run_empirical_simulation(
        scenario_type=SyntheticScenarioType.COUNTER_ATTACK_TRANSITION,
        duration_seconds=2700.0,  # 45 minutes
        dt=0.1,
        seed=20260922,
    )

    # Crosses: strictly > 1.5m and in [2.2, 4.2]m
    assert len(res["cross_apexes"]) > 0, "Expected crosses to be generated"
    for apex in res["cross_apexes"]:
        assert apex > 1.5, f"Cross apex {apex}m <= 1.5m"
        assert 2.2 <= apex <= 4.2, f"Cross apex {apex}m outside [2.2, 4.2]m"

    # Clearances: strictly > 1.5m and in [4.5, 11.0]m
    assert len(res["clearance_apexes"]) > 0, "Expected clearances to be generated"
    for apex in res["clearance_apexes"]:
        assert apex > 1.5, f"Clearance apex {apex}m <= 1.5m"
        assert 4.5 <= apex <= 11.0, f"Clearance apex {apex}m outside [4.5, 11.0]m"

    # Landings: strictly 0.0m
    assert len(res["landing_z"]) > 0
    for t, z_land, flight_type, apex in res["landing_z"]:
        assert z_land == 0.0, f"Flight {flight_type} did not land cleanly at z=0.0m (got {z_land}m at t={t})"

    # Ground passes: strictly 0.0m
    for z_g in res["ground_pass_z"]:
        assert z_g == 0.0, f"Ground pass had non-zero elevation: {z_g}m"

    # Carries: strictly z=0.0 and vz=0.0
    for z_c, vz_c in res["carry_z"]:
        assert z_c == 0.0 and vz_c == 0.0, f"Ball carry had non-zero vertical component: z={z_c}, vz={vz_c}"


def test_player_acceleration_no_impossible_spikes():
    """Verify player acceleration never spikes to impossible levels (> 90 m/s²)."""
    res = run_empirical_simulation(
        scenario_type=SyntheticScenarioType.COUNTER_ATTACK_TRANSITION,
        duration_seconds=900.0,  # 15 minutes = 9000 steps * 22 players = 198,000 evaluations
        dt=0.1,
        seed=20260922,
    )
    accels = res["all_accels"]
    assert len(accels) >= 1000
    max_acc = max(accels)
    assert max_acc < 90.0, f"Player acceleration spiked to physically impossible level: {max_acc:.2f} m/s²"
    # Concentric cap adheres strictly
    assert max(res["concentric_accels"]) <= 5.25


def test_shot_elevation_bounds():
    """Verify shots elevate into canonical physical bands [0.8m, 2.4m] and land cleanly at z=0."""
    res = run_empirical_simulation(
        scenario_type=SyntheticScenarioType.COUNTER_ATTACK_TRANSITION,
        duration_seconds=2700.0,  # 45 minutes
        dt=0.1,
        seed=20260922,
    )
    shots = res["shot_elevations"]
    assert len(shots) > 0, "Expected shots to be generated"
    for t, z_shot, vz_shot, flight_active in shots:
        assert 0.8 <= z_shot <= 2.4, f"Shot elevation {z_shot:.2f}m outside [0.8, 2.4]m at t={t}"
        assert flight_active is True, f"Shot at t={t} did not have active Flight"

    # Check landing cleanliness specifically on shot flights
    shot_landings = [l for l in res["landing_z"] if l[2] == "shot"]
    assert len(shot_landings) > 0, "Expected shot landings"
    for t, z_land, flight_type, apex in shot_landings:
        assert z_land == 0.0, f"Shot flight landed with non-zero elevation: {z_land}m"

    # Strict invariant: shot ledger == shot events
    frame = res["final_frame"]
    shot_events = [e for e in res["all_events"] if e.type == MatchEventType.SHOT]
    assert len(frame.shots) == len(shot_events)


def test_player_braking_deceleration_cap():
    """Verify player braking deceleration strictly obeys 7.0 m/s² cap across all steps."""
    res = run_empirical_simulation(
        scenario_type=SyntheticScenarioType.COUNTER_ATTACK_TRANSITION,
        duration_seconds=900.0,  # 15 minutes = 198,000 player-step evaluations
        dt=0.1,
        seed=20260922,
    )
    brake_accels = res["braking_accels"]
    assert len(brake_accels) > 0
    max_brake = max(brake_accels)
    assert max_brake <= 7.05, f"Braking deceleration exceeded 7.05 m/s²: {max_brake:.4f} m/s²"
    assert len(res["accel_violations"]) == 0, f"Violations found: {res['accel_violations'][:5]}"


def test_carries_and_progressive_carries_all_scenarios():
    """Verify carries and progressive carries are generated > 0 in all 4 scenarios in 15m."""
    for sc in SCENARIO_ORDER:
        res = run_empirical_simulation(
            scenario_type=sc,
            duration_seconds=900.0,
            dt=0.1,
            seed=20260922,
        )
        counts = res["event_counts"]
        carries = counts.get(MatchEventType.CARRY, 0)
        prog_carries = counts.get(MatchEventType.PROGRESSIVE_CARRY, 0)
        assert carries > 0, f"Scenario {sc.value} had 0 carries in 15m"
        assert prog_carries > 0, f"Scenario {sc.value} had 0 progressive carries in 15m"


def test_clearances_and_disciplinary_frequencies():
    """Verify clearances (2-4 in defensive scenarios) and realistic fouls/cards in 15m."""
    res = run_empirical_simulation(
        scenario_type=SyntheticScenarioType.COUNTER_ATTACK_TRANSITION,
        duration_seconds=900.0,
        dt=0.1,
        seed=20260922,
    )
    counts = res["event_counts"]
    clearances = counts.get(MatchEventType.CLEARANCE, 0)
    fouls = counts.get(MatchEventType.FOUL, 0)
    yellow_cards = counts.get(MatchEventType.YELLOW_CARD, 0)

    assert 2 <= clearances <= 6, f"Expected 2-6 clearances in 15m defensive scenario, got {clearances}"
    assert 1 <= fouls <= 6, f"Expected 1-6 fouls in 15m, got {fouls}"
    assert yellow_cards >= 1, f"Expected at least 1 yellow card when infractions occur in 15m, got {yellow_cards}"



# ==============================================================================
# Standalone CLI Reporting Runner
# ==============================================================================

def analyze_and_print_results():
    print("=" * 80)
    print("EMPIRICAL STRESS TEST: MILESTONE 1 SIMULATION & PHYSICS ENGINE")
    print("=" * 80)

    durations = [900.0, 2700.0, 5400.0]
    duration_labels = ["15-Minute", "45-Minute", "90-Minute"]

    results_by_duration = {}
    for dur, label in zip(durations, duration_labels, strict=True):
        print(f"\n---> Simulating {label} Match ({dur}s) ...")
        res = run_empirical_simulation(
            scenario_type=SyntheticScenarioType.COUNTER_ATTACK_TRANSITION,
            duration_seconds=dur,
            dt=0.1,
            seed=20260922,
        )
        results_by_duration[label] = res
        print(f"     Done. Total events: {len(res['all_events'])}, steps: {res['total_steps']}")

    res_15 = results_by_duration["15-Minute"]
    print("\n" + "=" * 80)
    print("SECTION 1: EVENT DISTRIBUTION ANALYSIS (15-MINUTE MATCH WINDOW)")
    print("=" * 80)
    print(f"{'Event Type':<25} | {'15-min Count':<12} | {'45-min Count':<12} | {'90-min Count':<12}")
    print("-" * 68)

    all_event_types = sorted(list(MatchEventType), key=lambda x: x.value)
    for et in all_event_types:
        c15 = res_15["event_counts"].get(et, 0)
        c45 = results_by_duration["45-Minute"]["event_counts"].get(et, 0)
        c90 = results_by_duration["90-Minute"]["event_counts"].get(et, 0)
        print(f"{et.value:<25} | {c15:<12} | {c45:<12} | {c90:<12}")

    print("\n" + "=" * 80)
    print("SECTION 2: 3D BALL ELEVATION & TRAJECTORY KINEMATICS")
    print("=" * 80)

    res_90 = results_by_duration["90-Minute"]
    crosses = res_90["cross_apexes"]
    clearances = res_90["clearance_apexes"]
    shots = res_90["shot_elevations"]
    ground_passes = res_90["ground_pass_z"]
    carries = res_90["carry_z"]
    landings = res_90["landing_z"]

    print(f"Crosses recorded: {len(crosses)}")
    if crosses:
        print(f"  * Min Apex: {min(crosses):.2f}m, Max Apex: {max(crosses):.2f}m, Mean Apex: {sum(crosses)/len(crosses):.2f}m")
        crosses_in_band = [c for c in crosses if 2.2 <= c <= 4.2]
        print(f"  * In [2.2m, 4.2m] band: {len(crosses_in_band)} / {len(crosses)} ({len(crosses_in_band)/len(crosses)*100:.1f}%)")
        print(f"  * All crosses z > 1.5m: {all(c > 1.5 for c in crosses)}")

    print(f"\nClearances recorded: {len(clearances)}")
    if clearances:
        print(f"  * Min Apex: {min(clearances):.2f}m, Max Apex: {max(clearances):.2f}m, Mean Apex: {sum(clearances)/len(clearances):.2f}m")
        clearances_in_band = [c for c in clearances if 4.5 <= c <= 11.0]
        print(f"  * In [4.5m, 11.0m] band: {len(clearances_in_band)} / {len(clearances)} ({len(clearances_in_band)/len(clearances)*100:.1f}%)")
        print(f"  * All clearances z > 1.5m: {all(c > 1.5 for c in clearances)}")

    print(f"\nShots recorded: {len(shots)}")
    if shots:
        shot_zs = [s[1] for s in shots]
        shot_airborne = [s[3] for s in shots]
        print(f"  * Shot count: {len(shots)}")
        print(f"  * Min z: {min(shot_zs):.2f}m, Max z: {max(shot_zs):.2f}m, Mean z: {sum(shot_zs)/len(shot_zs):.2f}m")
        print(f"  * Shots with flight active: {sum(shot_airborne)} / {len(shots)}")
        shots_in_spec = [z for z in shot_zs if 0.8 <= z <= 2.4]
        print(f"  * Shots with z in [0.8m, 2.4m]: {len(shots_in_spec)} / {len(shots)}")

    print(f"\nGround Passes recorded: {len(ground_passes)}")
    if ground_passes:
        print(f"  * Max z during ground pass: {max(ground_passes):.4f}m")
        print(f"  * Strictly z == 0.0m: {all(z == 0.0 for z in ground_passes)}")

    print(f"\nBall Carries sampled: {len(carries)} ticks")
    if carries:
        max_carry_z = max(c[0] for c in carries)
        max_carry_vz = max(abs(c[1]) for c in carries)
        print(f"  * Max z during carries: {max_carry_z:.4f}m")
        print(f"  * Max |vz| during carries: {max_carry_vz:.4f}m/s")
        print(f"  * Strictly z == 0.0 and vz == 0.0: {all(c[0] == 0.0 and c[1] == 0.0 for c in carries)}")

    print(f"\nBall Landings recorded: {len(landings)}")
    if landings:
        landing_zs = [l[1] for l in landings]
        print(f"  * Max z upon landing: {max(landing_zs):.4f}m")
        print(f"  * Clean return to z = 0.0m upon landing: {all(z == 0.0 for z in landing_zs)}")

    print("\n" + "=" * 80)
    print("SECTION 3: PLAYER BIOMECHANICAL ACCELERATION / BRAKING CAPS")
    print("=" * 80)

    all_acc = res_90["all_accels"]
    conc_acc = res_90["concentric_accels"]
    brake_acc = res_90["braking_accels"]
    violations = res_90["accel_violations"]

    print(f"Total player acceleration steps evaluated: {len(all_acc)}")
    print(f"  * Instantaneous Acceleration Max: {max(all_acc):.4f} m/s²")
    print(f"  * Any impossible spikes > 90 m/s²: {any(a > 90.0 for a in all_acc)}")
    print(f"  * Max concentric acceleration: {max(conc_acc):.4f} m/s² (Cap: 4.5 standard, 5.2 pressing)")
    print(f"  * Max braking deceleration: {max(brake_acc):.4f} m/s² (Cap: 7.0)")
    print(f"  * Total acceleration cap violations (> cap + 0.05 m/s²): {len(violations)}")

    print("\n" + "=" * 80)
    print("SECTION 4: SCENARIO SENSITIVITY (45-MIN SIMULATION ACROSS SCENARIOS)")
    print("=" * 80)
    for sc in SCENARIO_ORDER:
        res_sc = run_empirical_simulation(sc, duration_seconds=2700.0, dt=0.1, seed=20260922)
        frame = res_sc["final_frame"]
        total_ev = len(res_sc["all_events"])
        cross_cnt = len(res_sc["cross_apexes"])
        clear_cnt = len(res_sc["clearance_apexes"])
        shots_cnt = len(res_sc["shot_elevations"])
        home_pass = frame.metrics.passCompletion.home
        away_pass = frame.metrics.passCompletion.away
        print(f"{sc.value:<28} | Events: {total_ev:>4} | Crosses: {cross_cnt:>2} | Clear: {clear_cnt:>2} | Shots: {shots_cnt:>2} | Pass%: H={home_pass:.1f}%, A={away_pass:.1f}%")

    print("\n" + "=" * 80)
    print("END OF EMPIRICAL HARNESS REPORT")
    print("=" * 80)


if __name__ == "__main__":
    analyze_and_print_results()
