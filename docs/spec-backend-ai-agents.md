# Specification: Premier League Studio Backend & AI Agent System

> Label: `ready-for-agent`  
> Canonical References: [AGENTS.md](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/AGENTS.md), [AGENT_RULES.md](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/AGENT_RULES.md), [CONTEXT.md](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/CONTEXT.md), [CHALLENGE.md](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/CHALLENGE.md), [docs/adr/](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/docs/adr/)

---

## Problem Statement

Broadcasters and football fans currently experience live matches through static box scores, disconnected stats graphics, or subjective manual commentary. In the context of the Microsoft Premier League Hackathon, engineers and producers need a low-latency, resilient match intelligence engine that ingests high-frequency synthetic tracking data, executes deterministic spatial-tactical mathematics, orchestrates specialized AI reasoning agents, and streams synchronized broadcast overlays and persona-tailored insights without lagging the live match clock or relying on real Premier League data feeds.

## Solution

A high-performance Azure-native backend service that executes a 5-stage pipeline:
1. **Ingest**: Continuous generation and streaming of 22-player plus ball coordinates at 5 Hz across configurable Synthetic Match Scenarios.
2. **Interpret**: High-speed (<50ms) deterministic metric calculation (Pitch Control probability surface, Passing Lane congestion, Pass Difficulty Rating (PDR), Speed & Power Analytics).
3. **Explain**: Real-time tactical reasoning, Game Rhythm derivation, Control vs. Chaos Index quantification, and Tactical Inflection Point detection.
4. **Render**: Machine-readable, timestamp-synced Broadcast Overlay payloads formatted for live broadcast graphics engines and studio web terminals.
5. **Personalize**: Multi-persona adaptations projecting the unified match state into Analyst Experience, Casual Experience, Player Cam tracking, Club-Centric framing, and Multilingual Broadcast Streams in 5 languages (English, Spanish, French, Japanese, Arabic).

The system implements Tiered Fast-Path resilience: fast deterministic fallbacks safeguard every agent with strict per-frame deadlines (<400ms) so the broadcast feed never stutters, while exposing callable Azure Model Context Protocol (MCP) tools for external agentic consumption and Microsoft Foundry models.

## User Stories

1. As a broadcast graphics producer, I want a unified WebSocket stream emitting synchronized telemetry and Broadcast Overlay payloads at 5 Hz, so that on-screen graphics remain locked to the simulated match clock.
2. As a broadcast graphics engine, I want lower-third and cue card JSON payloads with explicit timestamps and typography hierarchies, so that visual overlays render without client-side calculation lag.
3. As a football tactical analyst, I want real-time 357-cell Pitch Control probability surfaces and Passing Lane risk evaluations, so that I can quantify spatial territorial dominance and passing lane blockage during live play.
4. As a tactical analyst, I want a deterministic Pass Difficulty Rating (PDR) factoring passer pressure, receiver coverage, trajectory distance, and defender velocity vectors, so that I can objectively evaluate pass execution quality.
5. As a casual football supporter, I want accessible storyline summaries and key duel highlights, so that I can understand critical match momentum shifts without parsing raw data tables.
6. As a club supporter, I want a Club-Centric Experience framing key moments around my team's tactical execution, so that the broadcast narrative directly addresses my club allegiance while fairly noting opponent counters.
7. As a player scout, I want a Player Cam perspective tracking single-player exertion, off-ball runs, and decisive tactical actions, so that I can evaluate targeted player performance across full phases of play.
8. As an international viewer, I want a Multilingual Broadcast Stream generated synchronously in English, Spanish, French, Japanese, and Arabic using authentic football terminology, so that I can follow tactical breakdowns in my native language.
9. As a broadcast studio director, I want automatic detection of Tactical Inflection Points (high-volatility transitions or pressing breakdowns), so that studio commentator teleprompters receive instant contextual talking points.
10. As a studio operator, I want to switch between configurable Synthetic Match Scenarios (e.g., high possession, low-block counter-attack, late-game high pressing), so that I can demonstrate deterministic analytics across diverse tactical contexts.
11. As a system engineer, I want Tiered Fast-Path isolation separating sub-50ms deterministic spatial calculations from asynchronous AI agent narrative reasoning, so that slow model inference never blocks telemetry frames.
12. As an AI agent engineer, I want a shared blackboard architecture where Telemetry Ingestion, Tactical Reasoning, Broadcast Narrative, and Fan Personalization agents communicate through validated Pydantic contracts, so that state transitions are deterministic and debuggable.
13. As an external agent system, I want standard Azure MCP tool endpoints (`get_pitch_control_surface`, `evaluate_passing_lane`, `get_match_overview`), so that external reasoning models can interrogate the live match state on demand.
14. As an Azure cloud operator, I want optional integration hooks for Microsoft Foundry (Azure AI Foundry), Azure Event Hubs, and Azure Cosmos DB, so that the system operates natively in enterprise cloud environments with zero local crash risks when cloud credentials are unconfigured.
15. As a QA engineer, I want an honest health endpoint reporting simulation worker liveness, frame rate, and cloud connectivity, so that frozen or stalled simulation states fail loud and fail fast.

## Implementation Decisions

- **Multi-Agent Architecture**: Maintain the accepted four-agent swarm pattern (ADR 0002) coordinating over an in-memory shared blackboard:
  1. *Telemetry Ingestion Agent*: Validates and normalizes raw synthetic frame telemetry into the canonical contract.
  2. *Tactical Reasoning Agent*: Detects Tactical Inflection Points, measures Game Rhythm, and computes pressing triggers and transition volatility.
  3. *Broadcast Narrative Agent*: Synthesizes real-time commentary scripts, overlay cards, and Multilingual Broadcast Streams, backed by Microsoft Foundry when online and rule-based generators when offline.
  4. *Fan Personalization Agent*: Projections into Analyst, Casual, Player Cam, and Club-Centric viewing payloads.
- **Contract & Naming Discipline**: Adhere strictly to canonical terms from CONTEXT.md (`Pitch Space`, `Pitch Control`, `Passing Lane`, `Control vs. Chaos Index`, `Tactical Inflection Point`, `Pass Difficulty Rating (PDR)`, `Game Rhythm`, `Analyst Experience`, `Casual Experience`, `Player Cam`, `Club-Centric Experience`, `Broadcast Overlay`, `Tiered Fast-Path`, `Multilingual Broadcast Stream`, `Synthetic Match Scenario`). No superseded aliases.
- **Fast-Path Latency Envelope**: Strict 0.4s per-agent deadline in the swarm, guaranteeing total cycle time well within the 1.5s broadcast threshold. Hard deterministic fallback on timeout or exception.
- **Azure & MCP Integration**: Callable MCP tool definitions complying with Azure MCP patterns (ADR 0006) exposed via REST (`/api/mcp/invoke`) and MCP schema descriptors (`/api/mcp/tools`). Optional cloud adapters for Event Hubs, Cosmos DB, and Azure AI Foundry.
- **Deterministic Synthetic Simulation**: Configurable synthetic match engine operating on standard 105m x 68m pitch dimensions, generating 22 players + ball with realistic sprint kinematics and scenario profiles.

## Testing Decisions

- **Testing Philosophy**: Test external behavior and high-level invariant contracts rather than internal class implementations.
- **Primary Seams**:
  1. *Runtime Seam (`TelemetryRuntime` / WebSocket)*: Highest seam in the application. Ingests synthetic frames, runs the agent swarm, computes full metrics, and emits validated `BroadcastOverlayPayload` and `TelemetryFrame` structures.
  2. *Swarm Blackboard Seam (`AgentSwarm`)*: Tests collaborative agent state updates, timeout handling, and deterministic fallback activation when individual agents fail.
  3. *Spatial Seam (`Pitch Control` and `Pass Difficulty Rating`)*: Verifies mathematical invariants (probabilities sum to 100%, PDR responds monotonically to defender proximity and velocity).
- **Prior Art**: Existing comprehensive test suite in `backend/tests/` (`test_events.py`, `test_metrics.py`, `test_overlay.py`, `test_spatial.py`). All additions must maintain 100% test pass rate.

## Out of Scope

- Real Premier League tracking or event ingestion (strictly prohibited by AGENTS.md).
- Native video stream decoding or computer vision model training (simulation provides raw spatial telemetry).
- User authentication, billing, or multi-tenant database partitioning.

## Further Notes

- Monorepo alignment: The backend's Pydantic schemas must remain in parity with `frontend/src/types/telemetry.ts`.
- Code changes must follow Karpathy laws: inspect raw states, fail loud, assert invariants, and prove every feature with deterministic tests.
