# 0009: Studio Ported from the Feature Branch onto the Next.js App Router

- **Status**: Accepted
- **Date**: 2026-10-23
- **Relates to**: [ADR 0005](0005-unified-fullstack-monorepo.md) (monorepo layout), [ADR 0007](0007-frontend-first-prototyping-sequence.md) (frontend-first sequence)

The studio was prototyped on a `feature/ionic-studio-dashboard` branch as a Vite + Ionic React single-page application. That branch carried the better product — a real information architecture, a coherent card composition, and a store that behaved like one thing rather than five — but it could not be merged into `main` as it stood: it targeted a different build tool, it used Ionic's global stylesheet, and its telemetry was invented per component. We decided to adopt the branch's product and re-express it in `main`'s stack, rather than to keep the branch as a parallel application or to re-design the studio from scratch.

## What was taken from the branch

- **The information architecture and card compositions.** The six dashboard cards (moment rail, match score, formation, player spotlight, shoot map, attacking shape), the four sub-routes, the four-persona framing, and the Broadcast Overlay preview are the branch's, re-written against the shared primitives in `components/studio/primitives.tsx`.
- **The single-store pattern.** One `useSyncExternalStore` store owns the frame, the frame history, the cursor, the scenario, the persona, the language, the theme, and the connection state. Every panel reads from it; no panel keeps its own copy of the match.

## What was dropped from the branch

- **The Ionic shell and its global stylesheet** — see [ADR 0010](0010-css-cascade-layering-without-ionic.md).
- **Invented telemetry.** The branch's components carried their own hard-coded scores, formations, and player lists. Every number the studio shows now comes from the live telemetry frame, and the `mock-simulation` module is deleted.
- **The Vite entry point.** The studio is now a set of Next.js routes under `/studio`, so the browser's back button, middle-click, and "open in new tab" all behave the way a user expects.

## Why not merge the branch as it stands

The branch's own build could not satisfy the submission requirements: a judge must be able to open a public URL and see a working build, and the branch's data was not the simulation the rest of the system is built on. Porting the product while keeping `main`'s contract, engine, and build meant one implementation of the match — the same `MatchSimulationEngine` the backend wraps — rather than two that could disagree.

## The shared contract

Porting the Shoot Map and Formation cards required two new fields on `TelemetryFrame`: `shots: ShotRecord[]` and `playerStats: PlayerMatchStats[]`. `ShotRecord` carries the metre coordinates, xG, distance to goal, and outcome of every shot in the fixture; `PlayerMatchStats` carries per-player touches, completed passes, shots, distance covered, top speed, and rating. `PlayerTelemetry` gained `position` (the granular formation position) and `NarrativeEvent` gained `playerCamContext`, which the Player Cam persona reads.

These types are the contract with the backend: `backend/app/models.py` mirrors them field for field. A change on one side without the other is a breaking change to the studio, and the two files are edited together.

## Consequences

- The studio is five routes rather than one screen, and the shell provides the frame they share.
- The simulation runs in the browser when the backend is not reachable, and the fallback is the *same* engine — the studio never shows a number the engine did not produce. This keeps the demo honest when a judge's Azure instance is asleep.
- The feature branch can be deleted once this work merges. It is kept until then only as a reference for the card compositions.
