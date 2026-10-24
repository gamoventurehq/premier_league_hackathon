# Premier League Studio: E2E Test Infrastructure & Verification Architecture

## 1. Overview & Methodology

The Premier League Studio E2E Test Suite provides an automated, opaque-box verification harness evaluating the full-stack system against the primary user requirements (**R1–R4**), canonical domain contracts ([CONTEXT.md](CONTEXT.md), ADR 0001–0008), and architectural constraints ([AGENT_RULES.md](AGENT_RULES.md)).

The suite is structured around a **4-Tier Verification Methodology**:

```
tests/e2e/
├── conftest.py                             # Pytest test session configuration & global fixtures
├── harness/
│   ├── client.py                           # StudioTestHarness (FastAPI lifespan, REST, WebSocket stream)
│   ├── contracts.py                        # TelemetryContractValidator (geometry, metrics, schemas)
│   └── ui_inspect.py                       # UIStaticInspector (Cupertino mode, themes, zero clutter)
├── fixtures/
│   └── sample_frames.py                    # Canonical, degraded, and inflection frame fixtures
├── test_tier1_feature_coverage.py          # Tier 1: Feature Coverage (R1 - R4)
├── test_tier2_boundary_cases.py            # Tier 2: Boundary & Corner Cases
├── test_tier3_cross_feature.py             # Tier 3: Cross-Feature Combinations
├── test_tier4_real_world.py                # Tier 4: Real-World Scenarios
├── run_e2e.py                              # Standalone runner with structured JSON export
└── results.json                            # Test execution results artifact
```

---

## 2. 4-Tier Verification Hierarchy

### Tier 1: Feature Coverage (Requirements R1–R4)
Validates primary functional behavior across all project specifications:
- **R1: Frontend Migration & Layout Cleanliness**: Verifies legacy Next.js files removal (`.next`, `next.config.ts`, `next-env.d.ts`, `postcss.config.mjs`, `src/app/page.tsx`), presence of required Vite + Ionic React files, preservation of 12 canonical TypeScript interfaces in `frontend/src/types/telemetry.ts`, and Docker Compose alignment (`--host 0.0.0.0 --port 3000`).
- **R2: Backend Contracts & Telemetry Stream**: Verifies `GET /health` and `GET /api/health` aliases, WebSocket streaming envelope (`frame`, `blackboard`, `sentAtMs`), pitch geometry bounds (105m × 68m), metrics schemas (`controlVsChaosIndex`, `passDifficultyRating`), and the 4-agent tactical blackboard.
- **R3: Interactive Studio Experience & UI Rigor**: Verifies iOS Cupertino mode (`mode="ios"`), 64px docked navigation rail with SVG icons, CSS dark/light theme variables in `variables.css`, MatchScoreCard crests/clock, 22-player formation pitch on 16/10 aspect ratio with 5 tabs (`LINEUP`, `STATISTICS`, `SUMMARY`, `PLAYERS`, `COMMENTS`), and layout-first zero-clutter doctrine.
- **R4: Verification & Build Cleanliness**: Runs backend unit tests (`pytest` 70 passed) and TypeScript compilation check (`tsc --noEmit`).

### Tier 2: Boundary & Corner Cases
Stress tests resilience under edge inputs and degraded transport states:
- **Degraded Telemetry Payloads**: Empty player lists (`players = []`), unassigned passing lanes (`passingLanes = []`), empty pitch control cells (`pitchControlCells = []`).
- **Loose Ball & Turnover State**: Null ball possession (`possessionPlayerId = None`, `possessionTeam = None`), verifying zero players have `onBall == True`.
- **Metric Extreme Boundaries**: `controlVsChaosIndex` at exact extremes `0.0` (pure structured control) and `100.0` (pure transitional chaos); `passDifficultyRating` at `0.0` and `100.0`.
- **Zero Velocity Vector Math**: Stationary players/ball (`vx = 0.0, vy = 0.0`) verifying `atan2(0, 0)` does not yield `NaN` or cause division by zero.
- **Extreme Velocity Vectors**: Ball speeds up to 150 km/h (41.67 m/s) without floating-point overflow.
- **Out-of-Bounds Coordinate Sanitization**: Coordinates slightly off-pitch during throw-ins/corners allowed within ±5.0m tolerance; wild coordinates (>200m) rejected.
- **Malformed Envelopes**: Missing root keys, corrupt JSON payloads caught and rejected without silent failure.

### Tier 3: Cross-Feature Combinations
Evaluates multi-component synchronization and state consistency:
- **Theme Toggling During High-Frequency 5Hz Streaming**: Ensures rapid dark/light toggles do not corrupt store state, drop frames, or reset theme preference.
- **Player Selection Synchronization**: Cross-links player selection between Formation Pitch nodes, Spotlight Card, Roster List, and Pitch Radar Canvas.
- **Tab Switching During Active Telemetry**: Cycling across `LINEUP`, `STATISTICS`, `SUMMARY`, `PLAYERS`, and `COMMENTS` while frames arrive at 5Hz without state desynchronization.
- **Persona & Multilingual Synchronization**: Synchronizes 4 personas (`analyst`, `casual`, `player_cam`, `club_centric`) and 5 languages (`en`, `es`, `fr`, `ja`, `ar`).
- **Ball Possession & Passing Lane Origin**: Verifies passing lanes originate strictly from the designated ball carrier.

### Tier 4: Real-World Scenarios
Validates complex end-to-end tactical match simulations:
- **Monotonic Match Timeline Progression**: Multi-second simulation verifying monotonic match seconds progression and valid `MM:SS` match clocks.
- **Goal Event Timeline Scrubber Jump**: Scrubbing timeline to a goal event (e.g., 42:15 Haaland goal) updates match clock, score bug, and event highlights.
- **Tactical Inflection Point Detection Rule**: Evaluates Tactical Reasoning Agent threshold: a Control vs. Chaos delta ≥ 14.0 within 6 simulation cycles triggers `isTacticalInflectionPoint = True` and candidate insertion into blackboard.
- **Multilingual Consistency & Encoding**: Validates non-empty headlines and explanations across EN, ES, FR, JA, AR with genuine UTF-8 characters for Japanese and Arabic.
- **Persona Insight Differentiation**: Asserts distinct quantitative depth for Analyst persona vs narrative accessibility for Casual persona.

---

## 3. Feature Inventory & Test Mapping

| # | Feature / Contract | Requirement | Test Function | Test File |
|---|--------------------|-------------|---------------|-----------|
| 1 | Legacy Next.js Removal & Vite Layout | R1 | `test_r1_clean_migration_file_layout` | `test_tier1_feature_coverage.py` |
| 2 | Canonical TypeScript Interfaces (12 types) | R1 | `test_r1_canonical_contract_interfaces_preserved` | `test_tier1_feature_coverage.py` |
| 3 | Docker Compose Vite Flags (`--host 0.0.0.0`) | R1 | `test_r1_docker_compose_uses_vite_flags` | `test_tier1_feature_coverage.py` |
| 4 | Backend Health Endpoint (`GET /health`) | R2 | `test_r2_backend_health_endpoint` | `test_tier1_feature_coverage.py` |
| 5 | Backend Health Alias (`GET /api/health`) | R2 | `test_r2_backend_api_health_alias` | `test_tier1_feature_coverage.py` |
| 6 | WebSocket Telemetry 5Hz Envelope | R2 | `test_r2_websocket_telemetry_envelope` | `test_tier1_feature_coverage.py` |
| 7 | Spatial Pitch Geometry (105m × 68m) | R2 | `test_r2_spatial_geometry_105x68` | `test_tier1_feature_coverage.py` |
| 8 | Control vs. Chaos & Tactical Metrics | R2 | `test_r2_control_chaos_and_tactical_metrics` | `test_tier1_feature_coverage.py` |
| 9 | 4-Agent Tactical Blackboard Projections | R2 | `test_r2_4_agent_tactical_blackboard` | `test_tier1_feature_coverage.py` |
| 10 | iOS Cupertino Mode (`mode="ios"`) | R3 | `test_r3_ios_cupertino_mode_configuration` | `test_tier1_feature_coverage.py` |
| 11 | 64px Docked Rail & CSS Theme Variables | R3 | `test_r3_left_docked_navigation_rail_and_themes` | `test_tier1_feature_coverage.py` |
| 12 | Match Score Card (Crests, Score, Clock) | R3 | `test_r3_match_score_card_crests_and_clock` | `test_tier1_feature_coverage.py` |
| 13 | 22-Player Formation Pitch (16/10, 5 Tabs) | R3 | `test_r3_formation_pitch_22_players_and_5_tabs` | `test_tier1_feature_coverage.py` |
| 14 | Zero-Clutter Layout-First Doctrine | R3 | `test_r3_zero_clutter_layout_first_doctrine` | `test_tier1_feature_coverage.py` |
| 15 | Backend Pytest Cleanliness (70 pass) | R4 | `test_r4_backend_pytest_cleanliness` | `test_tier1_feature_coverage.py` |
| 16 | TypeScript Compilation (`tsc --noEmit`) | R4 | `test_r4_frontend_typescript_typecheck` | `test_tier1_feature_coverage.py` |
| 17 | Empty Arrays & Degraded Payloads | Tier 2 | `test_empty_players_and_degraded_payload` | `test_tier2_boundary_cases.py` |
| 18 | Loose Ball Unassigned Possession | Tier 2 | `test_loose_ball_unassigned_possession` | `test_tier2_boundary_cases.py` |
| 19 | Extreme Control vs. Chaos (0.0 & 100.0) | Tier 2 | `test_extreme_control_chaos_boundaries` | `test_tier2_boundary_cases.py` |
| 20 | Extreme Pass Difficulty Rating (0.0 & 100.0) | Tier 2 | `test_extreme_pass_difficulty_boundaries` | `test_tier2_boundary_cases.py` |
| 21 | Zero Velocity Heading Math (No NaN) | Tier 2 | `test_zero_velocity_heading_calculation` | `test_tier2_boundary_cases.py` |
| 22 | Extreme Ball Velocities (150 km/h) | Tier 2 | `test_extreme_ball_velocities` | `test_tier2_boundary_cases.py` |
| 23 | Out-of-Bounds Spatial Clamping (±5.0m) | Tier 2 | `test_out_of_bounds_spatial_coordinates` | `test_tier2_boundary_cases.py` |
| 24 | Malformed Envelope Error Handling | Tier 2 | `test_malformed_websocket_payload_resilience` | `test_tier2_boundary_cases.py` |
| 25 | Theme Toggling Under 5Hz Stream | Tier 3 | `test_theme_toggling_during_live_streaming` | `test_tier3_cross_feature.py` |
| 26 | Player Selection Synchronization | Tier 3 | `test_player_selection_synchronization` | `test_tier3_cross_feature.py` |
| 27 | 5-Tab Switching Under Live Telemetry | Tier 3 | `test_tab_switching_during_live_telemetry` | `test_tier3_cross_feature.py` |
| 28 | Persona & Multilingual Switching | Tier 3 | `test_persona_and_multilingual_switching` | `test_tier3_cross_feature.py` |
| 29 | Ball Carrier & Passing Lane Sync | Tier 3 | `test_ball_carrier_and_passing_lanes_sync` | `test_tier3_cross_feature.py` |
| 30 | Monotonic Match Timeline Progression | Tier 4 | `test_full_match_simulation_timeline_progression` | `test_tier4_real_world.py` |
| 31 | Goal Event Timeline Scrub Jump | Tier 4 | `test_goal_event_timeline_scrubber_jump` | `test_tier4_real_world.py` |
| 32 | Tactical Inflection Detection (≥14.0 delta) | Tier 4 | `test_tactical_inflection_detection_threshold` | `test_tier4_real_world.py` |
| 33 | Multilingual Narrative UTF-8 Integrity | Tier 4 | `test_multilingual_narrative_consistency_and_encoding` | `test_tier4_real_world.py` |
| 34 | Persona Insight Differentiation | Tier 4 | `test_persona_insight_differentiation` | `test_tier4_real_world.py` |

---

## 4. Invariants, Thresholds & Bounds

| Metric / Dimension | Invariant / Boundary | Tolerance | Authoritative Source |
|---|---|---|---|
| Pitch Length | 105.0 meters | ±5.0m (out of bounds) | CONTEXT.md, ADR 0003 |
| Pitch Width | 68.0 meters | ±5.0m (out of bounds) | CONTEXT.md, ADR 0003 |
| Pitch Center | `(52.5, 34.0)` | Exact | CONTEXT.md |
| Formation Pitch Aspect Ratio | `16 / 10` | Exact | FormationPitchCard.tsx |
| Left Docked Rail Width | `64px` | Exact | SidebarNav.tsx |
| Control vs. Chaos Index | `[0.0, 100.0]` | Boundary inclusive | CONTEXT.md, metrics.py |
| Pass Difficulty Rating (PDR) | `[0.0, 100.0]` | Boundary inclusive | CONTEXT.md, metrics.py |
| Pitch Control Split | `home + away + contested == 1.0` | ±0.05 | models.py |
| Tactical Inflection Trigger | `delta(Control vs Chaos) >= 14.0` within 6 cycles | Exact | swarm.py |
| Telemetry Stream Frequency | 5 Hz (200ms tick interval) | Downsampled from 10Hz | websocket.py |
| Fast-Path Latency Target | `< 50ms` | Profiler verified | AGENT_RULES.md §4 |
| Agent Reasoning Latency Target | `< 1500ms` | Asynchronous | AGENT_RULES.md §4 |

---

## 5. Test Execution Commands

### Running with Pytest
```bash
# Execute entire 4-tier E2E test suite
backend/.venv/bin/pytest tests/e2e/ -v

# Execute a specific tier
backend/.venv/bin/pytest tests/e2e/test_tier1_feature_coverage.py -v
backend/.venv/bin/pytest tests/e2e/test_tier2_boundary_cases.py -v
backend/.venv/bin/pytest tests/e2e/test_tier3_cross_feature.py -v
backend/.venv/bin/pytest tests/e2e/test_tier4_real_world.py -v
```

### Running with the Standalone Runner
```bash
# Standalone execution with formatted tier report and results.json export
./run_e2e.sh
# or:
backend/.venv/bin/python tests/e2e/run_e2e.py
```
