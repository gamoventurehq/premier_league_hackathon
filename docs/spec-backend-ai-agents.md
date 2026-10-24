# Specification: Premier League Studio Full-Stack & Backend AI Agent System

> Label: `ready-for-agent`  
> Canonical References: [AGENTS.md](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/AGENTS.md), [AGENT_RULES.md](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/AGENT_RULES.md), [CONTEXT.md](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/CONTEXT.md), [CHALLENGE.md](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/CHALLENGE.md), [docs/adr/](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/docs/adr/)

---

## Problem Statement

Live sports broadcasting requires real-time explainable tactical insights, high-frequency spatial tracking, and personalized audience narratives without broadcast latency or stutter. The Premier League Studio integrates an Ionic React + Vite frontend dashboard (Cupertino iOS mode, 3-column studio grid, dark/light theme, timeline scrubber) with a FastAPI backend engine that runs real-time 10Hz synthetic match simulations downsampled to 5Hz. To support interactive timeline scrubbing, live scenario injection, and external AI reasoning models via Azure MCP, the backend requires bidirectional playback controls, enhanced spatial queries, robust agent swarm coordination, and zero-stutter Tiered Fast-Path performance.

## Solution

A high-performance full-stack architecture featuring:
1. **Frontend Studio Dashboard**: Ionic React + Vite application adhering to layout-first UI doctrine, featuring PitchRadarCanvas (60 FPS pitch control visualizer), FormationPitchCard (22 players across 5 tactical tabs), MatchScoreCard, MediaTimelinePanel, ShootMapCard, and PlayerSpotlightCard.
2. **Backend Telemetry & Simulation Runtime**: 10Hz kinematic simulation downsampled to 5Hz over `ws://localhost:8000/ws/telemetry`. Real-time Pitch Control surface (357 cells), Pass Difficulty Rating (PDR), Game Rhythm, Control vs. Chaos Index, and tactical inflection point detection.
3. **Four-Agent Collaborative Swarm (ADR 0002)**: Telemetry Ingestion, Tactical Reasoning, Broadcast Narrative (multilingual: en, es, fr, ja, ar), and Fan Personalization (Analyst, Casual, Player Cam, Club-Centric) communicating over a shared tactical blackboard with sub-400ms per-agent deadlines and deterministic fallbacks.
4. **Bidirectional Playback & Scrubbing Engine**: Seamless time scrubbing (`jump_to_seconds`), play/pause state management, and speed adjustments over WebSocket and REST endpoints without worker termination.
5. **Azure MCP Tool Surface & Cloud Integration (ADR 0006)**: Standardized Model Context Protocol endpoints (`/api/mcp/invoke`, `/api/mcp/tools`) for Azure AI Foundry and external agentic reasoning, with graceful fallbacks when cloud credentials are unconfigured.

## User Stories

1. As a broadcast producer, I want to scrub along the timeline in the studio interface to jump to any match minute, so that the match state, score, player positions, and narrative instantly synchronize to that moment.
2. As a broadcast director, I want to pause and resume the live synthetic match feed via WebSocket control messages or REST endpoints, so that commentators can break down freeze-frame tactical plays.
3. As a studio engineer, I want the backend simulation worker to handle playback speed multipliers (e.g., 0.5x, 1x, 2x), so that fast-forwarding or slow-motion replay analysis can be demonstrated smoothly.
4. As a tactical analyst, I want real-time 357-cell Pitch Control probability surfaces and Passing Lane risk evaluations at 5Hz, so that spatial dominance and passing corridors are quantified with mathematical precision.
5. As a football tactical analyst, I want a deterministic Pass Difficulty Rating (PDR) factoring passer pressure, receiver coverage, trajectory distance, and defender velocity vectors, so that pass execution quality is objectively evaluated.
6. As a casual supporter, I want clear narrative storylines and key duel highlights in the Casual Experience persona, so that match momentum shifts are immediately accessible without technical jargon.
7. As a club supporter, I want a Club-Centric Experience framing tactical execution around my selected club while fairly reflecting opposition counters.
8. As a player scout, I want a dedicated Player Cam view with instant player spotlight statistics (touches, passes completed, top speed, rating, distance covered), so that individual player contribution can be tracked across the pitch.
9. As an international viewer, I want Multilingual Broadcast Streams generated simultaneously in English, Spanish, French, Japanese, and Arabic using authentic football domain terminology.
10. As an external AI agent, I want standard Azure MCP tool endpoints (`get_pitch_control_surface`, `evaluate_passing_lane`, `get_match_overview`, `get_player_spotlight`, `jump_match_time`), so that I can interrogate and control the simulation programmatically.
11. As a system engineer, I want the Tiered Fast-Path to ensure all deterministic metrics calculate in under 50ms and agent swarm execution never exceeds 400ms per agent, guaranteeing zero telemetry frame drops.
12. As a QA engineer, I want 100% test pass rates across backend unit/integration tests (pytest) and fullstack E2E tests (run_e2e.sh), ensuring zero regressions during runtime enhancements.

## Implementation Decisions

- **Playback Control in `MatchRuntime` & `MatchEngine`**:
  - Add explicit playback control methods: `jump_to_seconds(target_seconds)`, `pause()`, `resume()`, `set_speed(multiplier)`.
  - Add WebSocket client message handling for `{"type": "jump_time", "seconds": float}`, `{"type": "pause"}`, `{"type": "resume"}`, and `{"type": "set_speed", "speed": float}`.
  - Expose REST endpoints: `POST /api/playback/jump`, `POST /api/playback/pause`, `POST /api/playback/resume`, `POST /api/playback/speed`.
- **MCP Tool Surface Expansion**:
  - Add `get_player_spotlight`: returns detailed match statistics, physical telemetry, and rating for a specified player ID.
  - Add `jump_match_time`: allows MCP clients to scrub match clock to a specified timestamp.
- **Contract & Domain Naming**:
  - Maintain verbatim terminology from CONTEXT.md (`Pitch Space`, `Pitch Control`, `Passing Lane`, `Control vs. Chaos Index`, `Tactical Inflection Point`, `Pass Difficulty Rating (PDR)`, `Game Rhythm`, `Analyst Experience`, `Casual Experience`, `Player Cam`, `Club-Centric Experience`, `Broadcast Overlay`, `Tiered Fast-Path`, `Multilingual Broadcast Stream`, `Synthetic Match Scenario`).
- **Resilience**:
  - Azure Foundry, Event Hubs, and Cosmos DB clients remain strictly optional and lazy-initialized; the service runs 100% locally with zero cloud dependencies.

## Testing Decisions

- **Testing Seams**:
  1. Primary Seam: `TelemetryRuntime` / WebSocket endpoint (`/ws/telemetry`) & REST endpoints (`/api/playback/*`, `/api/health`).
  2. Swarm Seam: `AgentSwarm` (`run_frame` and blackboard evaluation with timeout handling).
  3. Spatial & Kinematics Seam: Invariant validation for 105m × 68m pitch, 357-cell Pitch Control sum (100%), and monotonic PDR.
- **Prior Art**: 70 existing pytest tests in `backend/tests/` and 34 existing E2E tests in `tests/e2e/`. All tests must pass with 0 failures after changes.

## Out of Scope

- Ingestion of real Premier League tracking or event feeds (strictly banned per AGENTS.md constraint 1).
- Training raw vision models on broadcast video feeds.
- User authentication and persistent billing.

## Further Notes

- Fullstack synchronization: Backend Pydantic models must remain aligned with frontend TypeScript interfaces in `frontend/src/types/telemetry.ts` and `frontend/src/store/baseMemory.ts`.
