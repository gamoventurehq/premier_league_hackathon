# Research Report: Backend Architecture & AI Models Breakdown

> **Repository**: `Premier League Studio: Synthetic Match Insights Engine`  
> **Investigation Date**: 2026-10-24  
> **Primary Sources**:
> - Codebase: [`backend/app/main.py`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/backend/app/main.py), [`backend/app/runtime.py`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/backend/app/runtime.py), [`backend/app/config.py`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/backend/app/config.py), [`backend/app/agents/swarm.py`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/backend/app/agents/swarm.py), [`backend/app/agents/base.py`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/backend/app/agents/base.py), [`backend/app/agents/telemetry_ingestion.py`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/backend/app/agents/telemetry_ingestion.py), [`backend/app/agents/tactical_reasoning.py`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/backend/app/agents/tactical_reasoning.py), [`backend/app/agents/broadcast_narrative.py`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/backend/app/agents/broadcast_narrative.py), [`backend/app/agents/fan_personalization.py`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/backend/app/agents/fan_personalization.py), [`backend/app/services/foundry.py`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/backend/app/services/foundry.py), [`backend/app/services/mcp.py`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/backend/app/services/mcp.py), [`backend/app/services/event_hubs.py`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/backend/app/services/event_hubs.py), [`backend/app/services/cosmos.py`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/backend/app/services/cosmos.py), [`backend/app/simulation/engine.py`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/backend/app/simulation/engine.py), [`backend/app/simulation/spatial.py`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/backend/app/simulation/spatial.py), [`backend/app/simulation/metrics.py`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/backend/app/simulation/metrics.py)
> - Architectural Decision Records: [`docs/adr/0001-spatial-telemetry-state-machine.md`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/docs/adr/0001-spatial-telemetry-state-machine.md), [`docs/adr/0002-multi-agent-orchestration.md`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/docs/adr/0002-multi-agent-orchestration.md), [`docs/adr/0003-metric-pitch-telemetry-standard.md`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/docs/adr/0003-metric-pitch-telemetry-standard.md), [`docs/adr/0004-tiered-fast-path-resilience.md`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/docs/adr/0004-tiered-fast-path-resilience.md), [`docs/adr/0006-agent-framework-and-mcp-blackboard.md`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/docs/adr/0006-agent-framework-and-mcp-blackboard.md)
> - Core Specifications: [`CHALLENGE.md`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/CHALLENGE.md), [`CONTEXT.md`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/CONTEXT.md), [`docs/spec-backend-ai-agents.md`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/docs/spec-backend-ai-agents.md)

---

## 1. Executive Summary & Architectural Overview

The Premier League Studio backend is engineered as a high-frequency, resilient football intelligence engine. It balances real-time spatial simulation with agentic tactical reasoning and multilingual narrative generation.

Rather than utilizing a monolithic Large Language Model (LLM) pipeline that could introduce broadcast stutter or variable latency, the backend separates deterministic spatial mathematics from asynchronous agent reasoning using a **Tiered Fast-Path** architecture:
1. **Tier 1 (Deterministic Fast-Path)**: Runs numerical metrics, spatial pitch control, passing lane probabilities, and kinematic updates strictly under **50 ms** at 10 Hz downsampled to 5 Hz for live broadcasting.
2. **Tier 2 (Asynchronous Agent Swarm)**: Executes a 4-agent collaborative swarm coordinating across an in-memory tactical blackboard under an overall **1.5-second** budget (sub-400 ms per agent) with deterministic rule-based fallbacks.
3. **LLM Tier (Microsoft Foundry / Azure OpenAI)**: Powers broadcast narrative wording and multilingual explanations via structured JSON schemas, seamlessly falling back to local template generators if cloud APIs time out or credentials are absent.
4. **Tool Surface (Azure MCP)**: Exposes 8 callable Model Context Protocol tools for external autonomous AI agents to inspect pitch telemetry, evaluate passing lanes, and scrub match time.

---

## 2. Backend Infrastructure & Runtime Mechanics

### 2.1 Web Framework & Server Lifecycle
- **Implementation**: [`backend/app/main.py:L31-L85`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/backend/app/main.py#L31-L85)
- **Framework**: FastAPI with asynchronous lifespan management.
- **Startup**: Initializes `MatchRuntime`, executes synthetic match pre-simulation warmup, starts the dedicated simulation background thread (`pl-simulation`), and mounts REST and WebSocket routers.
- **Shutdown**: Gracefully closes thread pools, Event Hubs producers, Cosmos DB clients, and simulation threads.
- **Zero-Cloud Resilience**: Starts cleanly with zero Azure credentials configured (`backend/app/config.py:L1-L8`).

### 2.2 Dual-Frequency Simulation & Worker Loop
- **Implementation**: [`backend/app/runtime.py:L140-L173`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/backend/app/runtime.py#L140-L173), [`backend/app/config.py:L34-L37`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/backend/app/config.py#L34-L37), [ADR 0003](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/docs/adr/0003-metric-pitch-telemetry-standard.md)
- **10 Hz Internal Simulation**: The simulation worker thread steps the physics and kinematic state machine at 10 Hz (`dt = 0.1s`).
- **5 Hz Telemetry Broadcast**: Downsamples the state every 2 ticks to 5 Hz for WebSocket publication (`/ws/telemetry`) and Event Hubs streaming. This avoids frontend render churn while maintaining smooth tracking.
- **Heartbeat & Liveness**: Monitored via `heartbeat_fresh` with a 15-second staleness window exposed to the `/health` endpoint (`backend/app/runtime.py:L121-L139`).

### 2.3 Tiered Fast-Path & Zero-Stutter Resilience
- **Implementation**: [`backend/app/runtime.py:L205-L234`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/backend/app/runtime.py#L205-L234), [ADR 0004](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/docs/adr/0004-tiered-fast-path-resilience.md)
- In live sports broadcasting, dropping frames or waiting on LLM network round-trips is unacceptable.
- On each publication tick:
  1. `engine.build_frame()` runs Tier 1 deterministic spatial metrics in under 50 ms.
  2. The frame is immediately published to WebSocket clients with the *most recent narrative* already available.
  3. If the agent swarm is idle (`not self._swarm_busy`), Tier 2 launches asynchronously in a background worker (`swarm.run_async`).
  4. When the swarm finishes, `_on_swarm_complete` updates `latestNarrative`, `agentTrace`, and `agentReasoningLatencyMs` for folding into subsequent frames.
  5. If an agent fails or times out, rule-based fallback generators fulfill the contract instantly.

### 2.4 Bidirectional Playback Controls & Time Scrubbing
- **Implementation**: [`backend/app/runtime.py:L261-L317`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/backend/app/runtime.py#L261-L317), [`backend/app/api/websocket.py:L60-L85`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/backend/app/api/websocket.py#L60-L85)
- Supports live timeline scrubbing without terminating or restarting worker threads:
  - `jump_to_seconds(target_seconds)`: Resets engine clock and fast-forwards/rewinds synthetic player coordinate trajectories.
  - `pause()` and `resume()`: Halts/resumes kinematic updates while keeping WebSocket heartbeats alive.
  - `set_speed(multiplier)`: Scales delta-time `dt * self._speed` (0.1x to 10.0x).
- Accessible via REST (`POST /api/playback/*`) and inbound WebSocket JSON messages (`jump_time`, `pause`, `resume`, `set_speed`).

### 2.5 In-Memory Shared Tactical State (Blackboard)
- **Implementation**: [`backend/app/agents/base.py:L56-L127`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/backend/app/agents/base.py#L56-L127), [ADR 0002](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/docs/adr/0002-multi-agent-orchestration.md), [ADR 0006](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/docs/adr/0006-agent-framework-and-mcp-blackboard.md)
- A shared in-memory blackboard coordinates all 4 agents.
- Agents operate through isolated `BlackboardView` transaction contexts:
  - Reads and writes are buffered per agent.
  - If the agent completes successfully within its deadline, `view.commit()` writes values to the master blackboard.
  - If the agent times out or raises an exception, `view.discard()` cleanly rolls back uncommitted writes.

---

## 3. What Each AI Model & Agent Does

The system incorporates a **Four-Agent Collaborative Swarm** along with an optional **Cloud LLM (Azure AI Foundry / Azure OpenAI)**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RAW TELEMETRY FRAME                               │
│        (Players x,y,speed; Ball x,y,speed; 357-cell Pitch Control; PDR)     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. Telemetry Ingestion Agent                                                │
│    • Normalizes raw synthetic coordinates into canonical Pydantic contracts │
│    • Validates match clock and score continuity                             │
│    • Writes player positions, possession, passing lanes to Blackboard       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Committed to Blackboard
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. Tactical Reasoning Agent                                                 │
│    • Identifies Tactical Phase (build_up, progression, final_third, etc.)   │
│    • Tracks Control vs. Chaos Index volatility over a 6-cycle window        │
│    • Detects Tactical Inflection Points (swings >= 14.0 or goals/shots)     │
│    • Ranks key actors and turnover involvement                              │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
┌──────────────────────────────────────┐ ┌────────────────────────────────────┐
│ 3. Broadcast Narrative Agent         │ │ 4. Fan Personalization Agent       │
│    • Writes Multilingual Broadcast   │ │    • Projects tactical moment into │
│      Stream (en, es, fr, ja, ar)     │ │      4 distinct fan personas:      │
│    • Generates Commentator Cue cards │ │      1. Analyst Experience         │
│    • Calls Microsoft Foundry LLM     │ │      2. Casual Experience          │
│      (or RuleBasedNarrativeGenerator)│ │      3. Player Cam Mode            │
│    • Sub-400ms deadline budget       │ │      4. Club-Centric Framing       │
└──────────────────────────────────────┘ └────────────────────────────────────┘
```

---

### Detailed Agent Breakdown

| Agent / Model | Primary Role | Inputs Read | Primary Outputs | AI / Reasoning Mechanism | Fallback Mechanism |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Telemetry Ingestion Agent** | Normalization & Continuity Validation | `context.frame` (raw telemetry, 22 players, ball, passing lanes, events) | Normalized tracks, possession state, passing lanes, pitch control split, fast-path metrics | Algorithmic schema validation and continuity checks (`previous_clock`, `previous_score`) | Discards transaction view on failure; downstream agents read previous frame state |
| **2. Tactical Reasoning Agent** | Macro tactical analysis & inflection point detection | `K_FAST_PATH_METRICS`, `K_POSSESSION`, `K_MATCH_EVENTS`, `K_MATCH_CLOCK`, `K_PITCH_CONTROL_*` | `K_TACTICAL_PHASE`, `K_CONTROL_VS_CHAOS`, `K_INFLECTION_CANDIDATES`, `K_KEY_PLAYERS` | Vector geometry (`attack_direction`, relative ball progression); sliding-window volatility (`INFLECTION_DELTA = 14.0`, window = 6 cycles); event pattern matching | Returns default phase (`progression`), current chaos index, empty inflection candidate list |
| **3. Broadcast Narrative Agent** | Multilingual commentary & commentator cue generation | `K_TACTICAL_PHASE`, `K_CONTROL_VS_CHAOS`, `K_PASS_DIFFICULTY_RATING`, `K_PITCH_CONTROL_*`, `K_INFLECTION_CANDIDATES` | `K_NARRATIVE` (`NarrativeDraft`), `K_MULTILINGUAL_STREAM` (5 languages), `K_COMMENTATOR_CUE` | **Microsoft Foundry LLM** (Azure OpenAI Chat Completion) with strict JSON schema, or `RuleBasedNarrativeGenerator` contextual templating | `RuleBasedNarrativeGenerator` rendering parameterized scenario headlines and explanations in <1ms |
| **4. Fan Personalization Agent** | Multi-persona audience framing | `K_NARRATIVE_ARC`, `K_CONTROL_VS_CHAOS`, `K_GAME_RHYTHM`, `K_PASS_DIFFICULTY_RATING`, `K_TACTICAL_PHASE`, `K_KEY_PLAYERS` | `K_ANALYST_CONTEXT`, `K_CASUAL_CONTEXT`, `K_CLUB_CENTRIC_CONTEXT`, `K_PLAYER_CAM_CONTEXT` | Persona projection algorithms: statistical framing for analysts, simplified storylines for casuals, dual home/away club angles, individual tracking for Player Cam | Deterministic fallback emitting baseline metric summaries for each persona |
| **5. Microsoft Foundry Model (Cloud LLM)** | Contextual natural language synthesis | Formatted match summary (clock, scenario, game rhythm, chaos index, PDR, pitch control split, recent events) | Strict JSON object with multilingual headlines and tactical explanations in 5 languages | Azure OpenAI GPT-4o / GPT-4o-mini deployed on Azure AI Foundry with system instructions and JSON object response formatting | If HTTP error, timeout (>1.2s), or invalid JSON occurs, drops instantly to `RuleBasedNarrativeGenerator` |

---

## 4. Azure Model Context Protocol (MCP) Tool Surface

- **Implementation**: [`backend/app/services/mcp.py:L57-L226`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/backend/app/services/mcp.py#L57-L226), [ADR 0006](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/docs/adr/0006-agent-framework-and-mcp-blackboard.md)
- The backend provides a native **Model Context Protocol (MCP)** interface (`POST /api/mcp/invoke`, `GET /api/mcp/tools`). This allows external autonomous AI agents (such as agents hosted on Microsoft Foundry, Copilot Studio, or LangChain) to programmatically interrogate and control the live simulation.

### Available MCP Tools:
1. `get_pitch_control_surface`: Returns the 357-cell Pitch Control probability grid and team dominance split (Home %, Away %, Contested %).
2. `evaluate_passing_lane`: Evaluates the passing corridor between two player IDs and computes the Pass Difficulty Rating (PDR) factoring defender pressure, trajectory distance, and interception risk.
3. `get_control_vs_chaos_index`: Returns the real-time volatility index, Game Rhythm classification, and turnover frequencies.
4. `emit_broadcast_overlay`: Generates the Stage 4 Broadcast Overlay JSON payload for production graphic engines in any selected persona.
5. `get_match_events`: Queries the discrete event log (shots, passes, tackles, goals, inflections) with optional filtering.
6. `get_agent_trace`: Returns execution metadata, latencies, and input/output summaries of the 4 agents in the swarm.
7. `get_player_spotlight`: Queries real-time physical telemetry (speed km/h, distance covered, touches, pitch anchoring) for any player.
8. `jump_match_time`: Enables autonomous agents to scrub the match clock to any second (0.0 to 5400.0s) to evaluate tactical scenarios.

---

## 5. Cloud Integration & Local Degradation Model

The application follows a strict cloud-native yet locally resilient architecture:

| Azure Service | Module | Cloud-Native Behavior | Graceful Degradation / Local Behavior |
| :--- | :--- | :--- | :--- |
| **Microsoft Foundry (Azure AI Foundry)** | [`backend/app/services/foundry.py`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/backend/app/services/foundry.py) | Calls Azure OpenAI endpoint for real-time multilingual commentary narrative generation. | If unconfigured or timed out (>1.2s), runs the deterministic `RuleBasedNarrativeGenerator` in <1ms without throwing errors. |
| **Azure Event Hubs** | [`backend/app/services/event_hubs.py`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/backend/app/services/event_hubs.py) | Publishes real-time telemetry frames to enterprise streaming brokers for external consumers. | If unconfigured, operations become immediate no-ops; WebSocket stream remains fully functional. |
| **Azure Cosmos DB** | [`backend/app/services/cosmos.py`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/backend/app/services/cosmos.py) | Persists Stage 4 Broadcast Overlays and narrative records for historical replays. | If unconfigured, overlays are buffered in memory and served directly to the frontend. |
| **Azure MCP Server** | [`backend/app/services/mcp.py`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/backend/app/services/mcp.py) | Proxied to Azure AI Studio agents via standard JSON-RPC endpoints. | Directly accessible via local HTTP REST endpoints (`/api/mcp/invoke`). |

---

## 6. Verification and Reference Pointers

- **Source Code Verification**: All agent models, runtime threading, and fallback mechanisms are verified against the 70 existing pytest unit and integration tests in `backend/tests/`.
- **Glossary Alignment**: All identifiers match canonical definitions in [`CONTEXT.md`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/CONTEXT.md).
- **Primary Source Code Links**:
  - Main App & Lifespan: [`backend/app/main.py`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/backend/app/main.py)
  - Simulation & Runtime Engine: [`backend/app/runtime.py`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/backend/app/runtime.py)
  - Swarm Orchestrator: [`backend/app/agents/swarm.py`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/backend/app/agents/swarm.py)
  - Ingestion Agent: [`backend/app/agents/telemetry_ingestion.py`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/backend/app/agents/telemetry_ingestion.py)
  - Tactical Reasoning Agent: [`backend/app/agents/tactical_reasoning.py`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/backend/app/agents/tactical_reasoning.py)
  - Broadcast Narrative Agent: [`backend/app/agents/broadcast_narrative.py`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/backend/app/agents/broadcast_narrative.py)
  - Fan Personalization Agent: [`backend/app/agents/fan_personalization.py`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/backend/app/agents/fan_personalization.py)
  - Foundry LLM Service: [`backend/app/services/foundry.py`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/backend/app/services/foundry.py)
  - MCP Tool Registry: [`backend/app/services/mcp.py`](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/backend/app/services/mcp.py)
