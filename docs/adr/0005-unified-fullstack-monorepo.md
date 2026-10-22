# 0005: Unified Full-Stack Monorepo Architecture

- **Status**: Accepted — frontend version pins superseded by [ADR 0008](0008-frontend-stack-version-baseline.md)
- **Date**: 2026-10-22

To ensure tight coordination between the spatial telemetry engine, the multi-agent reasoning swarm, and the broadcast presentation layer, we decided on a unified monorepo structure containing `backend/` (Python FastAPI, WebSockets, NumPy spatial math, Azure AI SDK) and `frontend/` (TypeScript, Next.js 14, Tailwind CSS, HTML5 Canvas radar). This eliminates cross-repo synchronization friction, streamlines local evaluation via a single `docker compose`, and presents a coherent, production-ready codebase to hackathon judges.

> **Superseded in part**: The frontend version pins (Next.js 14) are superseded by [ADR 0008](0008-frontend-stack-version-baseline.md), which re-baselines the frontend stack on Next.js 16. The monorepo layout, the backend stack, and the local `docker compose` evaluation workflow in this ADR remain in force.
