# 0012: Honest Latency Measurement and Frame-Arrival Handover

- **Status**: Accepted
- **Date**: 2026-10-23
- **Relates to**: [ADR 0004](0004-tiered-fast-path-resilience.md) (Tiered Fast-Path and fallback architecture for live broadcast resilience), [ADR 0011](0011-synthetic-match-engine-calibration.md) (engine calibration)

The Tiered Fast-Path has two numbers on screen — the Tier 1 deterministic metric pass and the Tier 2 agent reasoning pass — and one of them read `0.00 ms` in the browser. The studio also switched its badge to "Live stream" and stopped its in-browser fallback the instant the WebSocket *opened*, whether or not the backend ever published a frame. Both were failures of the same kind: the interface asserted a state the system had not measured. We decided to fix both.

## Measuring the latency

The browser coarsens `performance.now()` deliberately, for fingerprint resistance: about 100 microseconds in Chrome, a full millisecond in Firefox and Safari, and a millisecond again whenever the page is not visible. The deterministic metric pass costs around 0.6 ms — measured with a nanosecond-resolution clock, and confirmed by running the engine headless. A single frame's delta therefore quantises to `0` or `1` and rounds to `0.00 ms`.

`0.00 ms` on a judge-facing screen is not a fast system; it is a broken readout. And it is worse than a slightly wrong number, because the Tiered Fast-Path pillar is judged on exactly this claim.

The in-browser engine now reports the **mean of the last thirty published frames** rather than a single frame's delta. The mean of a window of real measurements is not quantised away, it is the more defensible statistic anyway, and it converges within a second of the studio opening. The window is a property of the browser engine; the backend measures with `time.perf_counter()` and reports the per-frame value directly.

The two figures are also now **labelled for what they are**. In the browser the Tier 2 number is the cost of the rule-based fallback, and the label says "Tier 2 · local rule-based fallback" rather than "agent reasoning" — the Azure agent swarm only runs behind the backend's WebSocket, and claiming it in the browser would claim a capability the browser does not have. A footnote states the measurement basis in both cases.

## Handing over on the first frame, not on the open socket

The client used to run `setConnection('live')` and `stopLocal()` in `socket.onopen`. The consequence was that a backend which accepted the connection and then published nothing left the studio **empty**: the badge claimed a live stream, the fallback was switched off, and every route rendered its empty state. The badge was a true statement about a socket and a false statement about a match.

The handover now happens on the **first frame** that arrives:

- an open socket changes nothing — the badge keeps saying whatever is actually on screen;
- the in-browser `MatchSimulationEngine` keeps running, so there is always a match on screen;
- the first backend frame replaces the frame history rather than being appended to it, because the browser simulation and the backend run different fixtures on different clocks, and a scrubber that jumps backwards is worse than a timeline that starts again;
- only then does the badge say "Live stream", and the fallback stops.

The two-second guard is unchanged in intent but corrected in behaviour: it now starts the browser simulation whenever no frame has arrived, whether the socket never opened or opened and stayed silent.

## Consequences

- The studio cannot show an empty match. A dead backend degrades to the in-browser simulation, and the badge says "Simulation running locally", which is true.
- A backend that opens a socket and stalls is indistinguishable from an asleep one, which is the correct reading: there is no match on the wire.
- The Tier 1 latency converges over the first second rather than being exact from the first frame. The backend's figure is exact from the first frame. The Diagnostics route states which basis applies.
- `GET /health` on the backend reports `ready` — and a readiness check that says a match is running when the match clock has not advanced is the same class of lie. The backend's readiness now reflects published frames, not the existence of a thread.
