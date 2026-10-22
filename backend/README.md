# Premier League Studio: Synthetic Match Insights Engine — Backend

The telemetry, metric and narrative service behind the **Premier League Studio**.
It runs a *real* synthetic football simulation (not a mock), derives the
canonical metrics from it, and publishes them to the studio over a WebSocket.

Everything in this service is generated: **no real Premier League match feed is
ever ingested, scraped or distributed** (AGENTS.md, constraint 1).

---

## Quick start (no Azure credentials at all)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

uvicorn app.main:app --reload
```

Then:

```bash
curl -s http://127.0.0.1:8000/health | python -m json.tool
```

```json
{
  "status": "ok",
  "service": "Premier League Studio Backend",
  "azure": { "foundry": false, "eventHubs": false, "cosmos": false, "mcp": false },
  "scenario": "high_possession",
  "matchClock": "68:51",
  "ready": true,
  "simulationAlive": true
}
```

The simulation starts on its own thread, warms up 480 simulated seconds of
match history and then publishes telemetry at 5 Hz. The studio connects to
`ws://localhost:8000/ws/telemetry`.

### With Docker

```bash
docker compose up --build     # from the repository root
```

The studio is then on <http://localhost:3000> and the service on
<http://localhost:8000/docs>.

### Tests

```bash
pip install -e ".[dev]"
pytest                 # the whole suite
ruff check .           # lint
```

The suite covers the Pitch Control mathematics, the Pass Difficulty Rating
responses, the aggregation of the PDR, the separation of the four Synthetic
Match Scenarios, the validity of the match clock, the box score, the
Broadcast Overlay payload, the rule-based fallback of the agent swarm, and the
parity between the TypeScript contract and the Pydantic models.

---

## What the service does

| Stage | What happens | Where |
| :-- | :-- | :-- |
| 1. Simulation | An event-driven football match is simulated: possession chains, passes in flight, duels, shots, goals. | `app/simulation/engine.py` |
| 2. Spatial metrics | The Pitch Control surface (357 cells), the Passing Lanes and the Pass Difficulty Rating are computed from the live positions. | `app/simulation/spatial.py` |
| 3. Derived metrics | The Control vs. Chaos Index, the Game Rhythm, the expected goals and the box score are derived from the event log. | `app/simulation/metrics.py` |
| 4. Agent swarm | Four agents read and write one shared tactical blackboard and produce the multilingual narrative. | `app/agents/` |
| 5. Broadcast Overlay | A machine-readable, persona-aware graphic payload for a broadcast engine. | `app/services/overlay.py` |
| 6. Publication | The frame is published on the WebSocket at 5 Hz and over REST. | `app/api/` |

### The simulation is a simulation, not a script

* The ball is the state variable. Every event — a pass, a carry, a duel, a
  shot — happens because of *where the players are*, never because of a timer.
* The Pitch Control surface is a probability surface: for every cell of a
  5 m × 4 m grid (21 × 17 = 357 cells) the arrival time of every player is
  computed from his own sprint velocity, and the team influence is
  `1 - Π(1 - p_i)`. The reported control score is `P_home - P_away`.
* The Pass Difficulty Rating uses the four CONTEXT.md components (passer
  pressure, receiver coverage, trajectory distance, defender velocity
  vectors) plus the corridor obstruction implied by the interceptor density.
  The headline `metrics.passDifficultyRating` is the **weighted mean of the
  live lanes**, so the number and the rows on screen can never disagree.
* The Control vs. Chaos Index and the Game Rhythm are computed from
  *observable* volatility (the dispersion of the possession sequences, the
  turnover rate, the transition rate, the share of passes under pressure), so
  the four Synthetic Match Scenarios produce materially different readings.
* The match clock is an accumulator; the string is a pure function of it, so
  `68:59` rolls over to `69:00` and `68:60` is impossible.

### The four Synthetic Match Scenarios

| Scenario | What it looks like | Game Rhythm |
| :-- | :-- | :-- |
| `high_possession` | Patient circulation against a compact block. | Fluid |
| `counter_attack_transition` | The ball turns over constantly and the counter is the weapon. | Transitional |
| `low_block_siege` | One side defends deep; the other camp outside. | Structured |
| `box_scramble` | Everything happens at once, around the box. | Chaotic |

---

## HTTP API

| Method | Path | What it returns |
| :-- | :-- | :-- |
| `GET` | `/health` | The service status, the enabled Azure capabilities, the active scenario and the state of the simulation thread. |
| `GET` | `/api/scenarios` | The four Synthetic Match Scenarios and their anchors. |
| `GET` | `/api/frame` | The current `TelemetryFrame` (the same payload the WebSocket publishes). |
| `GET` | `/api/overlay?persona=analyst` | The Stage 4 Broadcast Overlay payload. |
| `GET` | `/api/narrative` | The latest Narrative Event, including the Multilingual Broadcast Stream. |
| `GET` | `/api/agents` | The latest trace of the four-agent swarm. |
| `GET` | `/api/events?limit=25&type=shot` | The most recent discrete match events. |
| `GET` | `/api/mcp/tools` | The MCP tool surface (JSON Schema included). |
| `POST` | `/api/mcp/invoke` | Invoke one of the MCP tools. |
| `POST` | `/api/scenario?scenario=box_scramble` | Switch the live match to another Synthetic Match Scenario. |
| `POST` | `/api/persona?persona=casual` | Switch the active viewing persona. |

Interactive documentation: <http://localhost:8000/docs>.

---

## The WebSocket stream

```
ws://localhost:8000/ws/telemetry[?scenario=low_block_siege&persona=analyst]
```

The server publishes at 5 Hz (ADR 0003: a 10 Hz engine, downsampled to 5 Hz
for the wire). The payload is an envelope:

```json
{
  "frame": { "...": "the TelemetryFrame, byte compatible with frontend/src/types/telemetry.ts" },
  "blackboard": { "...": "the shared tactical state of the agent swarm" },
  "sentAtMs": 1792709422927
}
```

`sentAtMs` is the wall-clock time the backend published the frame, so the
studio can report the real round trip instead of guessing.

The client may send control messages:

```json
{"type": "set_scenario", "scenario": "box_scramble"}
{"type": "set_persona", "persona": "player_cam"}
```

---

## The MCP tool surface (ADR 0006)

The tools are *real*: each one is bound to the live simulation and can be
called over `POST /api/mcp/invoke` or proxied by an MCP host.

| Tool | Arguments | Returns |
| :-- | :-- | :-- |
| `get_pitch_control_surface` | `includeCells` (bool, default `true`) | The Pitch Control split and the 357 cell grid. |
| `evaluate_passing_lane` | `passerId`, `receiverId` | The Pass Difficulty Rating of a lane and its four components. |
| `get_control_vs_chaos_index` | — | The Control vs. Chaos Index, the Game Rhythm and the observable inputs behind them. |
| `emit_broadcast_overlay` | `persona` | The Broadcast Overlay payload, persisted to Cosmos DB when it is configured. |
| `get_match_events` | `limit`, `type` | The most recent discrete match events. |
| `get_agent_trace` | — | The latest trace of the four-agent swarm. |

```bash
curl -s -X POST http://127.0.0.1:8000/api/mcp/invoke \
  -H 'content-type: application/json' \
  -d '{"tool": "get_control_vs_chaos_index", "arguments": {}}'
```

---

## The four-agent swarm (ADR 0002) and the Tiered Fast-Path (ADR 0004)

| Agent | Role |
| :-- | :-- |
| `telemetry_ingestion` | Normalises the frame into the canonical contract and publishes it on the blackboard. |
| `tactical_reasoning` | Derives the tactical phase, the key players and the Tactical Inflection Points. |
| `broadcast_narrative` | Writes the Broadcast Overlay and the Multilingual Broadcast Stream (five languages). |
| `fan_personalization` | Projects the moment into the Analyst, Casual, Player Cam and Club-Centric framings. |

The deterministic frame is published **as soon as it is built** (the Tiered
Fast-Path, budget 50 ms); the swarm runs asynchronously and its narrative is
folded into the following frame (the deep reasoning tier, budget 1.5 s). Each
agent has its own deadline and its own rule-based fallback: an agent that
times out or raises is replaced by a deterministic fallback, and the trace
says `fallback` so the studio can show it. `tests/test_events.py` forces the
failure and asserts that the narrative that comes out is still valid.

The blackboard is staged: an agent's writes are only committed when the agent
succeeds, so a failed agent can never leave a half-written tactical state
behind.

---

## Configuration

Every Azure setting is **optional**. With none of them set, the service runs
completely locally: the rule-based narrative generator replaces Azure AI
Foundry, telemetry is not published to Event Hubs and the Broadcast Overlay
is not persisted to Cosmos DB.

| Variable | Default | Meaning |
| :-- | :-- | :-- |
| `LOG_LEVEL` | `INFO` | `DEBUG`, `INFO`, `WARNING` or `ERROR`. |
| `CORS_ORIGINS` | `*` | Comma separated list of allowed origins. |
| `SIMULATION_HZ` | `10` | The internal engine rate (ADR 0003). |
| `PUBLISH_HZ` | `5` | The WebSocket publication rate. |
| `DEFAULT_SCENARIO` | `high_possession` | The scenario the match starts in. |
| `SIM_WARMUP_SECONDS` | `480` | The simulated history generated before the stream opens. |
| `RANDOM_SEED` | `20260922` | The seed of the synthetic match. The same seed and the same scenario always produce the same match. |
| `FAST_PATH_BUDGET_MS` | `50` | The Tier 1 latency budget. |
| `AGENT_TIMEOUT_MS` | `1500` | The Tier 2 budget of the swarm. |
| `AZURE_AI_FOUNDRY_ENDPOINT` | — | The Azure AI Foundry endpoint for the narrative agent. |
| `AZURE_AI_FOUNDRY_DEPLOYMENT` | — | The Foundry deployment name. |
| `AZURE_OPENAI_API_KEY` | — | The key of the Foundry model. |
| `AZURE_EVENT_HUBS_CONNECTION_STRING` | — | Publishes every telemetry frame to Event Hubs. |
| `AZURE_EVENT_HUBS_NAME` | — | The Event Hubs name. |
| `COSMOS_DB_ACCOUNT` | — | Persists the Broadcast Overlay payloads. |
| `COSMOS_DB_DATABASE` | `plstudio` | The Cosmos DB database. |
| `COSMOS_DB_CONTAINER` | `overlays` | The Cosmos DB container. |
| `AZURE_MCP_SERVER_URL` | — | The MCP host the tool surface is proxied to. |

`GET /health` reports exactly which capabilities are live, so a judge can see
that the service is genuinely Azure-native *and* genuinely runs without a
single credential.

---

## Architecture and the ADRs

| Part of the service | ADR |
| :-- | :-- |
| The event-driven spatial state machine | [ADR 0001](../docs/adr/0001-spatial-telemetry-state-machine.md) |
| The four-agent swarm and the shared blackboard | [ADR 0002](../docs/adr/0002-multi-agent-orchestration.md) |
| The 105 m × 68 m pitch, 10 Hz engine, 5 Hz wire | [ADR 0003](../docs/adr/0003-metric-pitch-telemetry-standard.md) |
| The Tiered Fast-Path and the fallbacks | [ADR 0004](../docs/adr/0004-tiered-fast-path-resilience.md) |
| The monorepo and the shared contract | [ADR 0005](../docs/adr/0005-unified-fullstack-monorepo.md) |
| The MCP tool surface | [ADR 0006](../docs/adr/0006-agent-framework-and-mcp-blackboard.md) |
| The calibration of the synthetic match engine | [ADR 0011](../docs/adr/0011-synthetic-match-engine-calibration.md) |

### Layout

```
backend/
├── app/
│   ├── main.py            the FastAPI application factory and the lifespan
│   ├── config.py          the settings; every Azure value is optional
│   ├── models.py          the contract models (the mirror of telemetry.ts)
│   ├── runtime.py         the simulation worker, the swarm and the Azure clients
│   ├── api/
│   │   ├── routes.py      the REST endpoints
│   │   └── websocket.py   the 5 Hz telemetry stream
│   ├── simulation/
│   │   ├── engine.py      the synthetic match engine
│   │   ├── spatial.py     the Pitch Control surface and the Passing Lanes
│   │   ├── metrics.py     the derived metrics and the match statistics
│   │   └── events.py      the discrete match events and the event log
│   ├── agents/
│   │   ├── base.py        the blackboard and the agent contract
│   │   ├── telemetry_ingestion.py
│   │   ├── tactical_reasoning.py
│   │   ├── broadcast_narrative.py
│   │   ├── fan_personalization.py
│   │   └── swarm.py       the orchestration, the deadlines and the fallbacks
│   └── services/
│       ├── overlay.py     the Broadcast Overlay payload
│       ├── event_hubs.py  the Event Hubs publisher (optional)
│       ├── foundry.py     the Azure AI Foundry client (optional)
│       ├── cosmos.py      the Cosmos DB overlay store (optional)
│       └── mcp.py         the MCP tool surface
├── tests/
│   ├── test_spatial.py    the Pitch Control and the Passing Lane mathematics
│   ├── test_metrics.py    the clock, the chaos index, the rhythm, the box score
│   ├── test_events.py     the event pipeline and the swarm fallback
│   └── test_overlay.py    the overlay, the REST surface, the contract parity
├── Dockerfile
├── pyproject.toml
└── README.md
```

---

## Known limitations

* The possession share a Synthetic Match Scenario *declares* is an input the
  engine steers towards, not a value it reaches exactly. The declared 78 / 22
  split of `high_possession` is observed as roughly 68 / 32 over a full match;
  the controller is deliberately damped because a controller that hits its
  target exactly makes the ball teleport between the two halves.
* The crowd, the referee, the injuries and the offside rule are not modelled.
  Everything the studio shows is derived from the ball, the players and the
  event log.
* The narrative is rule-based unless Azure AI Foundry is configured. It is
  written to be explainable rather than fluent.
