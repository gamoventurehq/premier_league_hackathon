# Original User Request

## Initial Request — 2026-10-23T09:57:27Z

Audit and completely replace the frontend on `main` with the Ionic React + Vite app from the `feature/ionic-studio-dashboard` branch (located in `/tmp/plstudio/frontend`). Ensure seamless fullstack integration with the FastAPI backend, strict adherence to `AGENTS.md` and `AGENT_RULES.md`, and clean operational verification.

Working directory: /home/gaurav/gamoventure/organisation/microsoft_hackathon
Integrity mode: benchmark

## Requirements

### R1. Complete Frontend Migration
Completely replace `/home/gaurav/gamoventure/organisation/microsoft_hackathon/frontend` with the Ionic React + Vite codebase from `/tmp/plstudio/frontend`. Remove all legacy Next.js files and configuration so the repository cleanly uses Vite, Ionic React (Cupertino iOS mode), and TypeScript.

### R2. Fullstack Contract Audit & Synchronization
Audit all frontend service consumers, types, and stores against the backend FastAPI endpoints (`http://localhost:8000/api/health`, `ws://localhost:8000/ws/telemetry`). Verify that spatial telemetry (105m × 68m pitch), ball/player vectors, control vs. chaos metrics, and the 4-agent tactical blackboard stream without frame drops, schema discrepancies, or console warnings.

### R3. Interactive Studio Experience & UI Rigor
Audit and ensure all dashboard features are fully operational:
- Left docked navigation rail with theme toggling (dark & light modes).
- Match Score Card with club crests and live clock.
- Formation Pitch with 22 player positions and functional tabs (`LINEUP`, `STATISTICS`, `SUMMARY`, `PLAYERS`, `COMMENTS`).
- Player Spotlight, Shoot Map, and Attacking Shape cards responsive to match events and player selection.
- Zero-clutter, layout-first UI adherence per `AGENT_RULES.md`.

### R4. Verification & Build Cleanliness
Ensure the workspace builds cleanly and passes all checks:
- `npm install` and `npm run build` in `frontend/` succeed with 0 errors.
- Backend tests pass (`pytest` in `backend/`).
- Frontend development server (`npm run dev`) and production preview run cleanly.

## Acceptance Criteria

### Migration & Build Integrity
- [ ] Legacy Next.js frontend files are removed; repository builds cleanly with `npm run build` using Vite.
- [ ] TypeScript type checks (`tsc`) pass with zero errors.
- [ ] Root scripts and configuration accurately reference the new Vite stack.

### Telemetry & Swarm Integration
- [ ] WebSocket connection to `ws://localhost:8000/ws/telemetry` connects and updates `baseMemory` at 5Hz.
- [ ] 4-agent tactical blackboard updates (Analyst, Casual, Player Cam, Narrative) populate correctly.

### Visual & Interactive Fidelity
- [ ] Theme switcher switches between Dark and Light palettes cleanly.
- [ ] Player selection in the roster or formation updates spotlight and pitch highlights.
- [ ] Pitch tabs correctly render formation, statistics bars, summaries, and agent comments.

## Follow-up — 2026-10-23T12:38:47Z

Test, merge, and synchronize GitHub Pull Request #1 (`feature/ionic-studio-dashboard` by Urvashi) into `main` with a standard merge commit preserving history. Commit all validated fullstack changes, verify 100% test pass rates across frontend, backend, and E2E suites, and push/close PR #1 on GitHub.

Working directory: /home/gaurav/gamoventure/organisation/microsoft_hackathon
Integrity mode: benchmark

## Requirements

### R1. Git Working Tree Commit & Branch Harmonization
Stage and commit the validated Ionic React + Vite frontend replacement, fullstack contract synchronizations, and test suites on `main`. Merge `feature/ionic-studio-dashboard` (PR #1) into `main` using a standard merge commit that preserves branch history, and resolve any branch divergence cleanly.

### R2. Comprehensive Fullstack Automated Verification
Verify the entire repository before and after merging:
- Backend: Run `pytest backend/` and verify all 70 tests pass without failures.
- Frontend: Run `npm run lint`, `npm run typecheck`, and `npm run build` in `frontend/` to confirm 0 lint warnings/errors, 0 TypeScript errors, and successful Vite production bundling.
- E2E Integration: Run `pytest tests/e2e/` and confirm all 34 tests across Tiers 1–4 pass.
- Runtime Health: Confirm `curl http://localhost:8000/api/health` returns HTTP 200 OK and WebSocket telemetry streams cleanly.

### R3. GitHub Remote Push & PR State Finalization
Push the merged `main` branch to GitHub (`origin/main`) and finalize PR #1 (marking it merged/closed on GitHub via `gh pr merge` or git push sync), ensuring the remote repository accurately reflects the accepted, working Premier League Studio application.

## Acceptance Criteria

### Test & Build Integrity
- [ ] Backend test suite passes 100% (`70 passed`).
- [ ] Frontend static analysis passes (`0 lint errors`, `0 type errors`, clean production build).
- [ ] Full 34-test E2E integration suite passes 100%.

### Merge & Remote Synchronization
- [ ] Working tree is clean with all changes committed.
- [ ] Standard merge commit recorded on `main` incorporating PR #1.
- [ ] `main` branch pushed to `origin/main` on GitHub.
- [ ] PR #1 state is marked merged/closed on GitHub.

## Follow-up — 2026-10-24T09:47:36Z

Deepen the Premier League Studio backend service and full-stack integration for synthetic match insights, adhering strictly to AGENTS.md constraints and CONTEXT.md domain terminology.

Working directory: /home/gaurav/gamoventure/organisation/microsoft_hackathon
Integrity mode: development
Reference spec: docs/spec-backend-ai-agents.md

## Requirements

### R1. Backend Playback & Timeline Scrubbing Engine
Enhance the backend simulation engine (MatchEngine) and runtime (MatchRuntime) to support interactive bidirectional playback control: jumping to arbitrary match seconds (jump_to_seconds), pausing, resuming, and adjusting playback speed multipliers. Expose these controls over both WebSocket client messages (jump_time, pause, resume, set_speed) and dedicated REST endpoints (/api/playback/*).

### R2. Four-Agent Swarm with Tiered Fast-Path Resilience
Maintain and verify the 4-agent collaborative swarm (Telemetry Ingestion, Tactical Reasoning, Broadcast Narrative, Fan Personalization) coordinating over the shared tactical state blackboard. Enforce strict sub-400ms per-agent execution deadlines backed by deterministic rule-based fallbacks to guarantee zero broadcast stutter.

### R3. Deterministic Spatial Analytics & MCP Expansion
Validate Pitch Control (357-cell probability surface) and Pass Difficulty Rating (PDR). Expand the Azure Model Context Protocol (MCP) tool surface to expose player spotlight lookups (get_player_spotlight) and simulation timeline jumps (jump_match_time), alongside existing spatial and match overview tools.

### R4. Comprehensive Full-Stack Verification & Zero Regressions
Verify the entire system through both pytest unit/integration tests in backend/tests/ and the complete 4-tier E2E suite (./run_e2e.sh). Ensure 100% test pass rates, clean TypeScript type checks in frontend/, and zero schema drift across WebSocket and REST interfaces.

## Acceptance Criteria

### Playback & Timeline Synchronization
- [ ] Backend accepts jump_time messages over WebSocket and jumps the match simulation forward or backward smoothly without crashing or disconnecting.
- [ ] REST endpoints POST /api/playback/jump, POST /api/playback/pause, POST /api/playback/resume, and POST /api/playback/speed function correctly and return updated playback states.

### Multi-Agent Swarm & Fast-Path
- [ ] Each agent in the 4-agent swarm terminates or falls back within its sub-400ms budget under simulated network latency.
- [ ] Telemetry stream maintains consistent 5 Hz frame delivery without stalling.

### Azure & MCP Tool Surface
- [ ] MCP tool invocations (/api/mcp/invoke) successfully execute get_player_spotlight and jump_match_time with validated JSON schemas.
- [ ] Service starts cleanly and /health accurately reflects simulation liveness and worker state.

### Test Rigor
- [ ] Pytest suite in backend/tests/ executes with 100% pass rate.
- [ ] All 34 tests in ./run_e2e.sh pass with zero failures.
- [ ] Frontend npm run typecheck passes with zero errors.

## Follow-up — 2026-10-24T19:35:13Z

Enable local LLM inference (Ollama / vLLM / OpenAI-compatible APIs) and free cloud inference (GitHub Models using GITHUB_TOKEN) within the Premier League Studio multi-agent narrative swarm, with asynchronous decoupling to preserve the 5Hz broadcast latency contract without requiring a paid Azure account.

Working directory: /home/gaurav/gamoventure/organisation/microsoft_hackathon
Integrity mode: development

## Requirements

### R1. Generic OpenAI & Local Model Provider Integration
Extend the backend narrative service (`backend/app/services/foundry.py` and `backend/app/config.py`) to support:
1. Standard OpenAI-compatible endpoints (`/v1/chat/completions`), allowing direct integration with local runners (Ollama, vLLM, LM Studio, LocalAI) at `http://localhost:11434/v1` or custom URLs.
2. GitHub Models endpoint (`https://models.inference.ai.azure.com`) using `GITHUB_TOKEN` for free Azure AI Foundry model execution without an Azure subscription.
3. Existing Azure OpenAI endpoint format (preserving backward compatibility with Azure credentials when present).
4. Configurable via environment variables (`LLM_PROVIDER`, `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`).

### R2. Asynchronous Narrative Swarm & Latency Isolation (ADR 0004 Compliance)
Ensure slow local models (1-3s latency) do not block or throttle the 10Hz physics simulation engine or 5Hz WebSocket streaming:
1. Decouple LLM calls into a non-blocking background queue or async worker.
2. Deliver instant zero-latency frames via the deterministic rule-based generator (`RuleBasedNarrativeGenerator`) on every tick.
3. Automatically swap in the AI-generated multilingual narrative once the model responds.

### R3. Swarm Verification & Service Health
Expose model provider health and active LLM configuration on `GET /health` and `GET /api/health` (also fixing the `/api/health` route alias), and ensure existing multi-agent blackboard workflows (`tactical_reasoning`, `broadcast_narrative`, `fan_personalization`) remain fully functional.

## Acceptance Criteria

### Test & Contract Verification
- [ ] `backend/.venv/bin/pytest tests/e2e/ -v` passes without regressions.
- [ ] `backend/.venv/bin/pytest backend/tests/test_swarm.py -v` passes with model service mock and live fallback.
- [ ] Backend starts cleanly and serves `GET /api/health` with `status: ok` and capability map reflecting the active LLM provider.
- [ ] If `LLM_BASE_URL` is configured (or points to Ollama/OpenAI-compatible endpoint), the `Broadcast Narrative` agent successfully queries the model and writes multilingual commentary to the blackboard.
- [ ] If the model provider times out, fails, or is unreachable, the swarm seamlessly falls back to the deterministic generator without dropping frames or breaking the WebSocket stream.

## Follow-up — 2026-10-24T19:38:17Z

Integrate, synchronize, and verify Urvashi's new responsive layout changes, draggable chip scrollers, and canvas resilience from origin/feature/ionic-studio-dashboard (commit aebc8bd) into the active codebase, ensuring full TypeScript build health, zero E2E regressions, and compliance with the zero-clutter UI doctrine.

Working directory: /home/gaurav/gamoventure/organisation/microsoft_hackathon
Integrity mode: development

## Requirements

### R1. Integrate Urvashi's Responsive Commit (aebc8bd)
Merge/cherry-pick and reconcile Urvashi's latest frontend enhancements from origin/feature/ionic-studio-dashboard:
1. StudioChipScroller: grab-and-drag, pointer track drag, and horizontal wheel scrolling across horizontal chip rows with neutral grey hit areas.
2. PitchRadarCanvas: 0-dimension exception handling, RAF loop resilience, ResizeObserver wakeup, and repositioned dominance badge to eliminate FPS overlap.
3. StudioRecapModal: Clean single-line scrolling and header badge wrapping.
4. Responsive layout adaptation across compact mobile (330×680) up to desktop fullscreen (850×608, 1600px+).

### R2. Strict UI Layout-First Doctrine & Zero-Clutter Compliance
Ensure all integrated components adhere to AGENT_RULES.md:
1. Resolve the instructional helper text flagged by E2E Tier 1 (FormationPitchCard.tsx and MediaTimelinePanel.tsx) so no banned crutches remain.
2. Maintain Cupertino iOS styling and docked 64px rail standards.

### R3. Comprehensive Frontend Build & Test Verification
1. Verify npm run build (or Vite build) compiles cleanly with zero TypeScript errors.
2. Run frontend unit tests (npm test / Vitest) including PitchRadarCanvas.test.tsx and StudioChipScroller.test.tsx.
3. Verify ./run_e2e.sh and Tier 1–4 tests pass with the updated frontend layout.

## Acceptance Criteria

### Build & Test Criteria
- [ ] Git working tree cleanly incorporates aebc8bd with no unresolved conflicts.
- [ ] cd frontend && npm run build succeeds without TS or bundling errors.
- [ ] All frontend unit tests pass (including PitchRadarCanvas.test.tsx and StudioChipScroller.test.tsx).
- [ ] tests/e2e/test_tier1_feature_coverage.py passes, verifying no banned instructional helper text remains in UI components.
- [ ] Pitch canvas renders without freezing or uncaught RAF exceptions across resize transitions.

## Follow-up — 2026-10-24T20:25:11Z

Build competitive edge features for Premier League Studio to secure the Best Multi-Agent System prize by exposing our live concurrent agent swarm, split-perspective broadcast HUD, and interactive MCP Tactical Copilot.

Working directory: /home/gaurav/gamoventure/organisation/microsoft_hackathon

## Requirements

### R1. Live Multi-Agent Swarm Inspector HUD
Provide a live, high-density visualization strip in the UI that displays the real-time execution state of the 4 agents (`Telemetry Ingestion`, `Tactical Reasoning`, `Broadcast Narrative`, `Fan Personalization`) streaming over WebSockets. Show per-agent execution status (`COMPLETE` / `FALLBACK`), latency in ms, and blackboard transactional commits.

### R2. Dual-Persona Simultaneous Split View
Allow reviewers to view the **Analyst Mode** and **Casual Fan Mode** side-by-side simultaneously, updating synchronously as each frame streams, demonstrating the Stage 5 personalization pipeline without requiring manual toggling.

### R3. Interactive "Tactical Copilot" MCP Drawer
Expose a slide-out conversational drawer where judges can ask natural-language tactical questions, powered by our existing Azure MCP tools (`get_tactical_state`, `get_pitch_control`, `get_inflection_points`) via `/api/mcp/invoke`.

### R4. Clickable Inflection Timeline & Replay Theatre
Make the momentum timeline's Tactical Inflection Points clickable, jumping the match simulation via `/api/playback/jump` to replay the spatial buildup and Voronoi pitch dominance shifts.

## Acceptance Criteria

### Verification & Performance
- [ ] WebSocket telemetry frames with `traces` are rendered without adding UI frame drops.
- [ ] Side-by-side dual stream updates synchronously at match clock speed.
- [ ] Interactive copilot queries successfully execute against `/api/mcp/invoke` and display cited metrics.
- [ ] Timeline scrub and jump requests successfully reposition the match clock and re-render Voronoi pitch overlays.
- [ ] All existing automated tests continue to pass (`pytest backend/tests`).



## 2026-10-24T21:13:46Z

Perform a comprehensive root-cause audit, remediation, and visual verification across the Premier League Studio application for:
1. Blackboard serialization bug leaking raw Python dataclass repr strings (NarrativeDraft(...)) into the frontend.
2. Incomplete language localization and lack of sanitization across cards, overlays, and personas when switching between EN, ES, FR, JA, AR.
3. Enforcement of the UI layout-first doctrine (cutting taglines, filler words, and explanatory crutches) across all pages.

Working directory: /home/gaurav/gamoventure/organisation/microsoft_hackathon
Integrity mode: development

## Requirements

### R1. Backend Serialization & Dataclass Sanitization
Fix backend/app/runtime.py and backend/app/agents/broadcast_narrative.py:
1. In _json_safe(), handle dataclasses cleanly via dataclasses.asdict() or convert NarrativeDraft to a Pydantic BaseModel so it emits clean JSON objects instead of falling back to str(value) Python reprs.
2. Ensure blackboard["narrative"] and blackboard["multilingual_stream"] always serialize to clean dicts with ISO language keys (en, es, fr, ja, ar).

### R2. End-to-End Language Localization & Sanitization
Audit and fix frontend store and components (frontend/src/store/baseMemory.ts, TacticalPage.tsx, LivePitchPage.tsx, PersonaPage.tsx, StudioRecapModal.tsx):
1. Extract the active language from baseMemory.language (en | es | fr | ja | ar) and dynamically resolve headlines, explanations, and tactical insights in the selected language.
2. Provide defensive sanitization against raw objects or mixed language blobs: never render [object Object] or NarrativeDraft(...).

### R3. Strict Layout-First UI Doctrine Audit
Audit all frontend pages against AGENT_RULES.md:
1. Strip out unnecessary secondary taglines, filler subtitles, and explanatory crutches.
2. Let structural spatial layout, clear data visualizations, and typographic hierarchy communicate the context directly.

## Acceptance Criteria

### Verification Criteria
- [ ] Backend WebSocket stream emits JSON-pure blackboard.narrative object; curl / WebSocket tests confirm zero NarrativeDraft(...) substrings in published payloads.
- [ ] In TacticalPage.tsx under the Tempo & Rhythm card, headline and explanation render pure translated strings matching the active language.
- [ ] Language selector (EN, ES, FR, JA, AR) reactively translates the narrative, overlay cues, and recap without requiring page reload.
- [ ] All unit tests pass: npm run typecheck, npx vitest run, and backend/.venv/bin/pytest.
- [ ] E2E test suite ./run_e2e.sh passes 34/34 tests with zero regressions.

## 2026-10-24T21:16:18Z

Substantially enrich the synthetic match engine (backend/app/simulation/) to generate realistic, diverse, Premier League-grade match telemetry and discrete event streams beyond basic passes and carries—including crosses, clearances, blocks, saves, corners, aerial duels, cards, offsides, key passes, and pressing triggers with authentic spatial coordinates and physical kinematics.

Working directory: /home/gaurav/gamoventure/organisation/microsoft_hackathon
Integrity mode: development

## Requirements

### R1. Expand Discrete Event Taxonomy & Generator Engine
Expand MatchEventType in backend/app/models.py and frontend/src/types/telemetry.ts and enhance the simulation generator in backend/app/simulation/engine.py and events.py to generate:
1. Defensive Actions: clearance (headed/kicked), block (shot/cross block), interception, tackle, recovery.
2. Goalkeeping Actions: save (reflex, parry, diving stop), claim, punch, goal_kick.
3. Attacking Milestones: cross (whipped, cutback, lofted), key_pass, progressive_carry, aerial_duel.
4. Disciplinary & Set Pieces: corner_kick, free_kick, yellow_card, red_card, offside.
5. Event descriptions that include pitch sector (e.g. "Right Half-Space", "Penalty Spot", "Deep Defensive Corridor"), speed, and involved players.

### R2. High-Fidelity Spatial Kinematics & Pressure Physics
Enhance spatial player simulation (backend/app/simulation/spatial.py and engine.py):
1. Realistic player acceleration/deceleration spikes during pressing triggers, sprints, and transition bursts.
2. Authentic team compact shape dynamics (high press vs low block compressing/stretching team line depths).
3. Realistic passing velocity profiles (ground passes vs whipped crosses vs cleared balls with parabolic z-axis trajectories).

### R3. Full-Stack Synchronization & Event Feed Presentation
Synchronize all frontend event streams and components:
1. Ensure frontend/src/types/telemetry.ts and baseMemory.ts parse, badge, and render the new event types cleanly.
2. In dashboard and recap feeds (MediaTimelinePanel, BroadcastOverlay, StudioRecapModal), render distinct icons, color badges, and tactical tags for the new events.
3. Preserve 100% backward compatibility with all existing test suites.

## Acceptance Criteria

### Verification Criteria
- [ ] MatchEventType in backend and frontend contracts mirror each other with 10+ distinct new event types.
- [ ] Running a simulated 15-minute match window generates a diverse, realistic distribution of crosses, tackles, blocks, saves, fouls, and clearances (not just repetitive passes/carries).
- [ ] Z-axis ball trajectories (vz, z) authentically elevate on shots, crosses, and clearances (z > 0m) and return to ground on passes (z = 0m).
- [ ] Frontend builds cleanly with zero TypeScript errors (npm run typecheck).
- [ ] Backend pytest suite (backend/.venv/bin/pytest) and E2E suite (./run_e2e.sh) pass 100% with no contract regressions.

## 2026-10-25T19:01:00Z

Safely verify, merge, and stabilize PR #4 (`feature/studio-fullstack-delivery`) from Urvashi Mallah into `main`. Ensure all backend and frontend test suites pass with zero regressions, resolve layout doctrine test invariants, and verify end-to-end studio functionality.

Working directory: /home/gaurav/gamoventure/organisation/microsoft_hackathon
Integrity mode: development

## Requirements

### R1. PR #4 Review & Clean Merge
- Thoroughly review PR #4 (`feature/studio-fullstack-delivery`), which delivers the simulation clock auto-rollover loop, 10Hz physics / 5Hz telemetry stream badges, and the 5-page studio UI.
- Preserve any unstaged local updates (such as Azure AI Foundry copilot integrations in `backend/app/api/routes.py`).
- Merge PR #4 cleanly into `main` using GitHub CLI / git merge.

### R2. Test Suite & Layout Doctrine Green Bar
- Run frontend type check and verify 0 errors: `npm --prefix frontend run typecheck`.
- Run frontend unit tests and verify all pass: `npm --prefix frontend test`.
- Run frontend production build: `npm --prefix frontend run build`.
- Resolve the 9 failing layout doctrine & invariant checks in `backend/tests/test_m2_layout_doctrine_and_invariants_c2.py` (e.g. double-headings in IonCardHeader, Player Spotlight invariants, Sidebar 64px/icons, theme toggle options) so that `pytest backend/tests` passes 100% (312/312 tests).

### R3. End-to-End System Verification
- Verify the FastAPI backend starts and responds to `/api/health` with `status: ok` and `simulationAlive: true`.
- Verify the simulation loop (`sim_loop_on_full_time`) resets to anchor time cleanly upon reaching full-time (5400s).
- Verify the Vite/Ionic frontend serves without console errors and connects via WebSocket to the live telemetry stream.

## Acceptance Criteria

### Pull Request & Merge Status
- [ ] PR #4 is merged into `main` and pushed to remote `origin/main`.
- [ ] Local unstaged work in `backend/app/api/routes.py` is intact or cleanly integrated.

### Automated Test Verification
- [ ] `npm --prefix frontend run typecheck` exits with code 0 (0 errors, 0 warnings).
- [ ] `npm --prefix frontend test` passes all tests.
- [ ] `npm --prefix frontend run build` succeeds and produces production bundle in `frontend/dist/`.
- [ ] `pytest backend/tests` passes 100% of test cases (including `test_m2_layout_doctrine_and_invariants_c2.py`).

### Runtime Operational Verification
- [ ] Backend runs on port 8000 and `/api/health` returns HTTP 200 with `simulationAlive: true`.
- [ ] Frontend connects to `ws://localhost:8000/api/stream` at 5Hz telemetry downsample with 10Hz engine physics.

## 2026-10-25T21:03:39Z

Thoroughly audit, verify, and stress-test the live cloud deployment of the Premier League Studio on Microsoft Azure across the frontend UI, backend API, Azure AI Foundry swarm, Azure Cosmos DB, Azure Event Hubs, and MCP tool surface.

Working directory: /home/gaurav/gamoventure/organisation/microsoft_hackathon
Integrity mode: development

## Cloud Endpoints & Resources Under Test
- **Frontend Container App**: `https://plstudio-frontend.bluebeach-f4935620.eastus2.azurecontainerapps.io`
- **Backend Container App**: `https://plstudio-backend.bluebeach-f4935620.eastus2.azurecontainerapps.io`
- **Azure AI Foundry**: `https://raumdeuter-resource.openai.azure.com` (`gpt-4.1-mini`)
- **Azure Cosmos DB**: `https://plstudio-cosmos.documents.azure.com:443/` (`plstudio.overlays`)
- **Azure Event Hubs**: `plstudio-events.servicebus.windows.net` (`match-telemetry`)
- **Resource Group**: `rg-raumdeuter` in Azure subscription `Azure subscription 1`

## Requirements

### R1. Cloud Service Health & Architecture Audit
Verify that all cloud endpoints return HTTP 200, report healthy status on `/health`, and confirm all 4 Azure capabilities (`foundry`, `eventHubs`, `cosmos`, `mcp`) are operational and actively communicating without degraded states or unhandled exceptions.

### R2. Live Telemetry Stream & WebSocket Verification
Validate that the live telemetry stream (`/ws/telemetry`) successfully handshakes over secure WebSocket (`wss://`), streams kinematic frame updates at the expected frequency (5 Hz downsampled from 10 Hz), and correctly broadcasts player tracking coordinates, ball physics, and pitch control metrics.

### R3. Azure AI Foundry Swarm & Copilot Reasoning Verification
Validate that the live background narrative generator produces valid multilingual broadcast commentary (5 languages) from `gpt-4.1-mini`, and test the Tactical Copilot (`POST /api/copilot/query`) with live tactical questions to ensure grounded responses with valid player statistics and pitch dominance data.

### R4. Cloud Persistence & Event Hub Streaming Ingestion
Confirm that real-time `BroadcastOverlayPayload` documents are successfully upserting to Azure Cosmos DB container `overlays`, and that synthetic telemetry frames and match events are actively published to Azure Event Hubs `match-telemetry` without queue exhaustion or partition errors.

### R5. Complete Automated E2E Verification & Audit Report
Run the existing automated test suites against the cloud deployment, check the frontend HTTP/2 static delivery and routing, and generate a comprehensive cloud audit report detailing latency, uptime, resource statuses, and submission readiness.

## Acceptance Criteria

### Health & Availability
- [ ] `GET /health` on the backend container app returns HTTP 200 with `"status": "ok"` and all 4 Azure capabilities enabled (`foundry: true`, `eventHubs: true`, `cosmos: true`, `mcp: true`).
- [ ] `GET /` on the frontend container app returns HTTP 200 with valid HTML containing the Premier League Studio title and responsive layout.

### Telemetry & WebSocket
- [ ] The WebSocket connection to `/ws/telemetry` opens cleanly and delivers continuous telemetry frames with valid `frameIndex`, `matchClock`, and 22 player positions.
- [ ] Kinematic state transitions and playback scrubbing endpoints (`/api/playback/*`) function without container restarts.

### AI Multi-Agent & Copilot
- [ ] `GET /api/narrative` returns a valid `NarrativeEvent` containing headlines in English, Spanish, French, Japanese, and Arabic generated by Azure AI Foundry.
- [ ] `POST /api/copilot/query` successfully returns grounded tactical analysis with `"source": "azure_ai_foundry (gpt-4.1-mini)"`.
- [ ] `GET /api/agents` confirms all 4 agents (`telemetry_ingestion`, `tactical_reasoning`, `broadcast_narrative`, `fan_personalization`) report `status: "complete"`.

### Database & Event Streaming
- [ ] Azure Cosmos DB contains newly upserted `BroadcastOverlayPayload` items with valid `overlayId` keys.
- [ ] Azure Event Hubs receives published match events without connection drops.

### Test Integrity
- [ ] Automated integration test scripts pass cleanly with 0 unhandled exceptions.
- [ ] A final Markdown audit report is written summarizing test results, latencies, and verification artifacts.

## 2026-10-25T21:26:22Z

Revision 2 of plstudio-backend has already been deployed with AZURE_MCP_SERVER_URL configured, successfully enabling all 4 Azure capabilities on GET /health (foundry: true, eventHubs: true, cosmos: true, mcp: true). Proceed with establishing SCOPE.md, GATE_STATUS.md, and executing Milestones R1–R5 to complete the audit.
