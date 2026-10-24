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

