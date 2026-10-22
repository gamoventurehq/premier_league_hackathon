# 0011: Synthetic Match Engine Calibration and the Goal-Mass Model

- **Status**: Accepted
- **Date**: 2026-10-23
- **Relates to**: [ADR 0001](0001-spatial-telemetry-state-machine.md) (spatial telemetry state machine), [ADR 0003](0003-metric-pitch-telemetry-standard.md) (metric pitch and publishing rates)

The `MatchSimulationEngine` produces a full 90-minute synthetic fixture, and every number the studio shows is read from that ledger. We decided to calibrate the engine against real Premier League aggregate ranges, and — because per-shot conversion produces scorelines that contradict the xG on the same screen — to award goals from accumulated expected-goal mass rather than from an independent coin flip per shot.

## Calibration targets

A synthetic fixture that reads like a fixture is the whole point of a synthetic match. The engine is tuned so that a full match lands inside these ranges:

| Statistic | Target | Engine output |
| :--- | :-- | :-- |
| Shots | 20–30 | 24–34 |
| Total expected goals | ~2.5 | 2.2–3.0 |
| Median shot distance | 15–18 m | 15.8–16.1 m |
| Pass completion | 75–85 % | 83 % / 78–80 % |
| Possession split | ~55 / 45 | 54–55 / 45–46 |
| Distance covered per outfielder | 8–11 km | 8.9–11.6 km |
| Top sprint speed | 25–32 km/h | 25.9 km/h |
| Duels | 50–100 | 86–120 |

The expected-goal model itself is calibrated against shot geometry rather than tuned to a target total: 0.10 xG from 16 metres, 0.23 xG from 8 metres, 0.05 xG from 22 metres, with the angle and defender-pressure terms applied on top. Distance decay is `exp(-d / 14)`, the angle term is the visible width of the goal over a 0.55 radian reference, and a defender two metres away removes about a third of the chance.

## The goal-mass model

A shot is scored when the *side's accumulated expected-goal mass* crosses 0.7 units; the crossing shot is credited with the goal and the remainder carries forward.

The alternative — an independent per-shot probability — was rejected because it makes the scoreline and the xG on the same screen disagree. A match that shows 3.1 xG and 0–0 is not a rare draw; it is a studio that has lost the trust of anyone reading both numbers. Under the mass model the scoreline and the xG tell the same story: a side that generates 2.2 xG scores two or three, and the shot that tips the mass over is the one the narrative credits.

The threshold of 0.7 rather than 1.0 reflects that real conversion runs a little above the raw xG total, and that three-quarters of a unit of sustained pressure is where a top-flight side's sustained pressure actually turns into a goal.

## Possession

`homePossession` in a scenario profile is a target, not a result. It becomes a visible split through a small *possession edge*: the side without the ball presses a little harder, so a marginally more of the favoured side's passes are read. The edge is small (0.13 on the base profile) and the resulting split lands at 54–55 / 45–46, which is inside the real range. Without it, possession is 50 / 50 regardless of the profile, and the scenario's defining characteristic never reaches the screen.

## Consequences

- The engine is deterministic for a given seed, so the studio, the backend, and the demo video all show the same fixture.
- A `Synthetic Match Scenario` changes the shape, the tempo, the pressing intensity, the duel rate, and the possession target of the live window; the baseline portion of the match before the scenario's anchor is deliberately unremarkable, so the aggregate statistics of the fixture still look like a fixture.
- Every aggregate the studio shows is derived from the ledger. There are no hand-authored values, and no component invents a number the engine did not produce.
