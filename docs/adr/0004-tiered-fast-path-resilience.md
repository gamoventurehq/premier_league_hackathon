# 0004: Tiered Fast-Path and Fallback Architecture for Live Broadcast Resilience

To guarantee the engine never stalls a live broadcast during LLM latency or network jitter, we decided on a two-tier execution model: Tier 1 computes deterministic numerical metrics (speeds, coordinates, pass difficulty) in under 50ms, while Tier 2 executes asynchronous agent narrative reasoning within a 1.5-second deadline. If an agent times out or fails, a contextually relevant rule-based template delivers on-screen graphics seamlessly while the agent swarm re-syncs state on the subsequent tick.
