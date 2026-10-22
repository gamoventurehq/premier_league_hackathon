# 0005: Unified Full-Stack Monorepo Architecture

To ensure tight coordination between the spatial telemetry engine, the multi-agent reasoning swarm, and the broadcast presentation layer, we decided on a unified monorepo structure containing `backend/` (Python FastAPI, WebSockets, NumPy spatial math, Azure AI SDK) and `frontend/` (TypeScript, Next.js 14, Tailwind CSS, HTML5 Canvas radar). This eliminates cross-repo synchronization friction, streamlines local evaluation via a single `docker-compose`, and presents a coherent, production-ready codebase to hackathon judges.
