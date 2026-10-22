# Raumdeuter

The domain model for an AI-driven football match intelligence engine that analyzes real-time pitch space, player telemetry, and match events to generate explainable broadcast narratives and personalized fan experiences.

## Language

### Pitch Geometry & Space

**Pitch Space**:
The physical playing area and its dynamic territorial control zones calculated from player coordinates.
_Avoid_: Field area, ground, court

**Pitch Control**:
The mathematical probability surface indicating which team has immediate access to any given point on the pitch based on player positions and maximum sprint velocities.
_Avoid_: Dominance map, territorial share

**Passing Lane**:
The geometric corridor between a ball carrier and a potential receiver, evaluated for defender obstruction density and interception risk.
_Avoid_: Pass path, passing channel

### Match Dynamics & Momentum

**Control vs. Chaos Index**:
A real-time dual-axis metric measuring the balance between structured possession rhythm and transitional volatility.
_Avoid_: Game intensity score, excitement rating

**Tactical Inflection Point**:
A discrete match moment where tactical structure breaks down or abruptly shifts, triggering high-priority narrative explanation.
_Avoid_: Turning point, critical moment, key play

**Pass Difficulty Rating (PDR)**:
A composite index evaluating the execution difficulty of a pass based on passer pressure, receiver coverage, trajectory distance, and defender velocity vectors.
_Avoid_: Pass hardness, pass challenge

**Game Rhythm**:
The temporal pacing of match actions, measured in possession sequence duration, passing velocity, and transition frequency.
_Avoid_: Game speed, tempo (when used loosely)

### Multi-Persona Presentation

**Analyst Experience**:
A data-dense viewing mode emphasizing probabilistic metrics, spatial heatmaps, passing network graphs, and tactical phase breakdowns.
_Avoid_: Expert mode, pro view

**Casual Experience**:
A narrative-first viewing mode highlighting emotional storylines, key duels, player milestones, and accessible tactical explanations.
_Avoid_: Beginner mode, simple view

**Player Cam**:
A dedicated perspective tracking a single designated player's off-ball positioning, physical exertion, spatial movement, and decisive actions.
_Avoid_: Star tracker, player focus view

**Broadcast Overlay**:
A synchronized, machine-readable graphical payload rendered on-screen alongside live match video feeds for television and streaming.
_Avoid_: HUD (when referring to broadcast TV), ticker, popup

### Real-Time Delivery & Resilience

**Tiered Fast-Path**:
A latency-resilient pipeline separating deterministic statistical metrics (<50ms) from deeper AI agent narrative reasoning (<1.5s) to guarantee zero broadcast stutter.
_Avoid_: Two-speed pipeline, async queue (when describing architecture)

**Multilingual Broadcast Stream**:
Synchronously localized narrative feeds generated simultaneously in five global broadcast languages (English, Spanish, French, Japanese, Arabic).
_Avoid_: Auto-translated text, multi-lang subtitles

**Synthetic Match Scenario**:
A pre-seeded or dynamically simulated tactical game state (e.g., Manchester City high possession vs. Arsenal counter-attacking transition) used to showcase deterministic spatial data and narrative inflection.
_Avoid_: Test match, fake game, sample data
