# 0009: Ionic Framework with Global iOS Mode and Single Base Memory Store

- **Status**: Accepted
- **Date**: 2026-10-22
- **Supersedes**: [ADR 0008](0008-frontend-stack-version-baseline.md) regarding web client UI component framework. The backend architecture (FastAPI, WebSockets, NumPy spatial math), metric pitch standard (ADR 0003), tiered fast-path resilience (ADR 0004), and multi-agent blackboard (ADR 0002/0006) remain in force.

## Context & Problem
To ensure universal cross-platform deployment across iOS, Android, and Web/PWA from a single codebase while guaranteeing a refined, broadcast-grade aesthetic, the client presentation layer is standardized on Ionic Framework with forced global iOS mode (`mode: 'ios'`). Furthermore, live match telemetry and multi-agent reasoning require synchronous propagation across multiple interconnected screens (Pitch Radar, Tactical Insights, Player Cam, and Broadcast Feeds) without fragmented or out-of-sync local states.

## Decisions

1. **Ionic Framework with Forced Global iOS UI Mode**:
   - Web application is standardized on `@ionic/react` (and `@ionic/cli`).
   - Global UI configuration is locked to iOS styling (`setupIonicReact({ mode: 'ios' })` / `mode="ios"`). All components (toolbars, segmented controls, cards, tabs, transitions) render with native Cupertino styling across all browsers and devices.

2. **Single Base Memory Store (Single Source of Truth)**:
   - All screens, views, and features subscribe to and read from a single, centralized reactive Base Memory store (`useBaseMemoryStore`).
   - No screen manages private match telemetry state; any update received from the local server or user interactions propagates through the single base memory to all screens simultaneously.

3. **Real-Time Local Server Transport**:
   - The web client maintains a persistent WebSocket connection to the local FastAPI server (`ws://localhost:8000/ws/telemetry`).
   - Incoming spatial frames (105m × 68m coordinates at 5Hz) and blackboard updates (Control vs. Chaos Index, PDR, Game Rhythm, Tactical Inflection Points) write directly into the single Base Memory.

4. **Incremental Feature Delivery & Tracking**:
   - Feature development proceeds strictly one feature at a time.
   - Project progress and milestones are tracked and continuously updated in `progress.md`.
