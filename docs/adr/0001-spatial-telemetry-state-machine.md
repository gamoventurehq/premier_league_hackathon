# 0001: Physics-Based Spatial Telemetry State Machine

- **Status**: Accepted
- **Date**: 2026-10-22

To satisfy the hackathon's strict synthetic-only data mandate and avoid generic text-prompting wrappers, we decided to build a continuous 2D physics-based spatial simulation engine generating 22-player and ball coordinates at regular time intervals, and algorithmically deriving discrete match events from pitch geometry. This provides defensible, mathematically grounded spatial data for pitch control and pass difficulty calculations that static or purely LLM-generated event logs cannot produce.
