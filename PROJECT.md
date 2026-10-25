# Project: Premier League Studio Synthetic Match Engine Enrichment

## Architecture
- **Simulation Layer (`backend/app/simulation/`)**:
  - `spatial.py`: 105m × 68m pitch coordinates, player biomechanical kinematics (acceleration/deceleration caps: $a_{\max}=4.5\text{ m/s}^2$, $a_{\text{burst}}=5.2\text{ m/s}^2$, $d_{\max}=7.0\text{ m/s}^2$), tactical pressing triggers, and compact team shape dynamics.
  - `engine.py`: 10Hz tick simulation engine, state machine, event generator loops, 3D parabolic gravity ball trajectory kinematics ($z > 0\text{m}$ for crosses, clearances, and shots; $z = 0\text{m}$ for passes/carries).
  - `events.py`: Event factory functions generating `MatchEvent` with rich attributes.
  - `sectors.py`: Premier League canonical pitch sector resolver mapping $(x, y)$ coordinates to standard tactical zones ("Right Half-Space", "Penalty Spot", "Deep Defensive Corridor", "Zone 14").
- **Contracts Layer (`backend/app/models.py` & `frontend/src/types/telemetry.ts`)**:
  - `MatchEventType`: 26-event enum (10 baseline + 16 new types across Defensive, Goalkeeping, Attacking, Set Pieces, and Disciplinary).
  - `MatchEvent`: Enriched with optional tactical fields (`pitchSector`, `speedKmH`, `subAction`, `secondaryActorId`).
  - `BallTelemetry`: Full 3D vectors (`x, y, z, vx, vy, vz, speedKmH`) with Euclidean speed norm.
  - `FrameTelemetry`: Synchronized with `events: MatchEvent[]`, `shots: ShotRecord[]`, `playerStats: PlayerMatchStats[]`.
- **Blackboard & Multi-Agent Swarm (`backend/app/agents/`)**:
  - `telemetry_ingestion.py`: Writes complete ball telemetry including `z` and `vz` to blackboard `K_BALL`.
- **Frontend Presentation Layer (`frontend/src/`)**:
  - `store/baseMemory.ts`: Ingests and normalizes live match events into `matchEvents: MatchEvent[]`.
  - `components/dashboard/MediaTimelinePanel.tsx`: Dynamic event timeline feed with tactical category icons, hex badges, time pills, and playback scrubbing.
  - `components/broadcast/BroadcastOverlay.tsx`: Lower-third HUD reactively triggering for defense, keeper, attack, and set-piece events.
  - `components/broadcast/StudioRecapModal.tsx`: Dynamic match chapter synthesis from event stream.
  - `components/PitchRadarCanvas.tsx`: 3D ball ground shadow and height scaling.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | MatchEventType Expansion | Expand enum to 26 types (clearance, block, recovery, save, claim, punch, goal_kick, cross, key_pass, progressive_carry, aerial_duel, corner_kick, free_kick, yellow_card, red_card, offside) | M1 | Survey R1 |
| 2 | MatchEvent Schema Extensions | Add optional pitchSector, speedKmH, subAction, secondaryActorId fields with _drop_absent_optional | M1 | Survey R1 |
| 3 | Pitch Sector Resolver | Canonical mapping of (x,y) to Premier League sectors (Half-Spaces, Penalty Spot, Deep Corridor, Zone 14) in sectors.py | M1 | Survey R1 |
| 4 | Rich Event Descriptions | Generate contextual descriptions including players, action speed, and pitch sector | M1 | Survey R1 |
| 5 | Biomechanical Player Kinematics | Enforce acceleration/deceleration caps (4.5 and 7.0 m/s²) and pressing bursts | M1 | Survey R2 |
| 6 | Compact Team Shape Dynamics | Dynamic line depth compression under pressure (9-14m corridor) and lateral touchline shifting | M1 | Survey R2 |
| 7 | 3D Parabolic Ball Trajectories | Closed-form gravity arc for crosses (2.5-4.2m), clearances (4.5-11m), and shots (0.8-2.4m); ground passes at z=0 | M1 | Survey R2 |
| 8 | Event Generator Calibration | Calibrate 15-minute simulation distribution to produce realistic mix of all event types | M1 | Survey R1 |
| 9 | Blackboard Ball Elevation Sync | Include z and vz in telemetry_ingestion.py K_BALL writes | M1 | Survey R2 |
| 10 | Frontend Contracts Sync | Mirror MatchEventType, MatchEvent, and FrameTelemetry in frontend/src/types/telemetry.ts | M2 | Survey R3 |
| 11 | Store Ingestion & Memory Normalization | Normalize and retain matchEvents array in frontend/src/store/baseMemory.ts | M2 | Survey R3 |
| 12 | Dynamic MediaTimelinePanel Feed | Connect MediaTimelinePanel to live matchEvents with 26-event visual badge taxonomy and scrubbing | M2 | Survey R3 |
| 13 | Reactive BroadcastOverlay HUD | Add dynamic defense, keeper, attack, and set-piece triggers in BroadcastOverlay | M2 | Survey R3 |
| 14 | Dynamic StudioRecapModal Synthesis | Synthesize match milestone chapters dynamically from event stream | M2 | Survey R3 |
| 15 | PitchRadarCanvas Ball Elevation Visuals | Render ground shadow and scale ball radius based on z-axis elevation | M2 | Survey R2/R3 |
| 16 | Full-Stack Verification & Hardening | 100% pass across pytest, npm run typecheck, Vitest, and ./run_e2e.sh (34/34 tests) | M3 | Survey R1/R2/R3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backend Simulation & Physics Engine Enrichment | Features 1–9: MatchEventType expansion, sectors.py, biomechanical kinematics, 3D ball gravity trajectories, rich event generator, blackboard z-sync | none | DONE |
| M2 | Frontend Contracts & Visual Event Presentation | Features 10–15: telemetry.ts, baseMemory.ts, MediaTimelinePanel live feed, BroadcastOverlay HUD, StudioRecapModal dynamic chapters, PitchRadarCanvas 3D visuals | M1 | IN_PROGRESS |
| M3 | Full-Stack E2E Verification & Adversarial Coverage | Feature 16: pytest suite, npm run typecheck, Vitest unit suite, ./run_e2e.sh (34/34), 15-minute simulation distribution audit | M1, M2 | PLANNED |

## Interface Contracts
### `backend/app/models.py` ↔ `frontend/src/types/telemetry.ts`
- `MatchEventType`: Identical 26-string union/StrEnum.
- `MatchEvent`:
  ```python
  id: str
  type: MatchEventType
  matchClock: str
  timestampMs: int
  team: TeamSide | None
  actorId: str | None
  targetId: str | None
  x: float
  y: float
  xG: float | None = None
  pdr: float | None = None
  completed: bool | None = None
  score: ScorePair | None = None
  description: str
  pitchSector: str | None = None
  speedKmH: float | None = None
  subAction: str | None = None
  secondaryActorId: str | None = None
  ```
- `BallTelemetry`:
  ```python
  x: float
  y: float
  z: float
  vx: float
  vy: float
  vz: float
  speedKmH: float  # Euclidean 3D norm: sqrt(vx^2 + vy^2 + vz^2) * 3.6
  possessionTeam: TeamSide | None
  possessionPlayerId: str | None
  lastTouchBy: str | None
  ```

### `backend/app/simulation/` ↔ `backend/app/agents/telemetry_ingestion.py`
- `K_BALL` dictionary on blackboard:
  ```python
  {
      "x": frame.ball.x,
      "y": frame.ball.y,
      "z": frame.ball.z,
      "vz": frame.ball.vz,
      "speedKmH": frame.ball.speedKmH,
      "possessionTeam": frame.ball.possessionTeam.value if frame.ball.possessionTeam else None,
      "possessionPlayerId": frame.ball.possessionPlayerId,
  }
  ```

## Code Layout
- Exclusive Write Ownership:
  - **Milestone 1**:
    - `backend/app/models.py`
    - `backend/app/simulation/sectors.py`
    - `backend/app/simulation/spatial.py`
    - `backend/app/simulation/engine.py`
    - `backend/app/simulation/events.py`
    - `backend/app/agents/telemetry_ingestion.py`
    - `backend/tests/test_events.py`
    - `frontend/src/types/telemetry.ts` (contract mirror only)
  - **Milestone 2**:
    - `frontend/src/store/baseMemory.ts`
    - `frontend/src/services/telemetryService.ts`
    - `frontend/src/components/dashboard/MediaTimelinePanel.tsx`
    - `frontend/src/components/broadcast/BroadcastOverlay.tsx`
    - `frontend/src/components/broadcast/StudioRecapModal.tsx`
    - `frontend/src/components/PitchRadarCanvas.tsx`
  - **Milestone 3**:
    - `tests/e2e/` (if test hardening needed)
    - Verification run scripts
