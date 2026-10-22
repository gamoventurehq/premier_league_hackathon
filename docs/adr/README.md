# Architecture Decision Records

Accepted decisions for the **Premier League Studio: Synthetic Match Insights Engine**. Each ADR captures the reasoning behind a decision that materially shapes the system; superseded decisions are replaced by a new numbered ADR rather than edited in place.

| ADR | Title | Status |
| :-- | :--- | :--- |
| [0001](0001-spatial-telemetry-state-machine.md) | Physics-Based Spatial Telemetry State Machine | Accepted |
| [0002](0002-multi-agent-orchestration.md) | Four-Agent Collaborative Swarm with Shared Tactical State | Accepted |
| [0003](0003-metric-pitch-telemetry-standard.md) | Metric 105m × 68m Pitch Telemetry Standard at 10Hz/5Hz | Accepted |
| [0004](0004-tiered-fast-path-resilience.md) | Tiered Fast-Path and Fallback Architecture for Live Broadcast Resilience | Accepted |
| [0005](0005-unified-fullstack-monorepo.md) | Unified Full-Stack Monorepo Architecture | Accepted — frontend pins superseded by 0008 |
| [0006](0006-agent-framework-and-mcp-blackboard.md) | Microsoft Agent Framework and Azure MCP with Shared Blackboard | Accepted |
| [0007](0007-frontend-first-prototyping-sequence.md) | Frontend-First Prototyping Sequence with High-Fidelity Broadcast Radar | Accepted |
| [0008](0008-frontend-stack-version-baseline.md) | Frontend Stack Version Baseline | Accepted |

## How decisions are made

1. Raise a numbered ADR file in this directory, titled `# NNNN: <Decision>`.
2. State the problem, the constraints that make the decision necessary, and the reasoning that settles it.
3. Record `- **Status**: Proposed` and `- **Date**: YYYY-MM-DD`; flip the status to `Accepted` once the team commits.
4. Never rewrite an Accepted ADR. Supersede it with a new ADR that references the one it replaces, and update the index table above.
