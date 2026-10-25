# Premier League Studio: Design & Component Specification

> **Source**: User Reference Designs (stored in `docs/design_references/`)  
> **Status**: In Progress (Milestone 3 — Feature 1: Dashboard Foundation)  
> **Target Framework**: Ionic React (`@ionic/react`) with forced iOS UI Styling (`mode: 'ios'`)  
> **Theme Support**: Dynamic Light & Dark Mode with Apple Cupertino contrast standards

---

## 🖼️ Reference Layout Architecture

Based on [`docs/design_references/dashboard_full.png`](design_references/dashboard_full.png):

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Left Rail       │ Col 1: Video & Events (30%) │ Col 2: Match Core (42%)   │ Col 3: Analytics (28%)    │
│ (Icon Nav)      │                             │                           │                           │
│ • Home          │ • Multi-angle Feed View     │ • Match Score Card        │ • Spotlight Player Card   │
│ • Radar         │   - Broadcast Virtual Feed  │   - Club Badges           │   - Attribute Meters      │
│ • Tactical      │   - Player Cam Tracking     │   - Scoreline & Timestamps│   - Shot Accuracy Radar   │
│ • Personas      │ • Live Match Scrubber       │   - Goalscorers Breakdown │ • Shoot Map Matrix        │
│ • Diagnostics   │   - Interactive Time Scrub  │ • Lineup & Formation      │   - xG Circle Plots       │
│ • Theme Toggle  │ • Chronological Event Feed  │   - 22-Player Pitch Map   │   - Tooltip Inspections   │
│   (Light/Dark)  │   - Goals, Subs, Bookings   │   - Manager Profiles      │ • Attacking Team Shape    │
│                 │                             │   - Tactical Phase Switch │   - Progression Centroid  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Theme & Styling System (Light & Dark)

- **Default Mode**: Strictly iOS Cupertino styling (`setupIonicReact({ mode: 'ios' })`).
- **Icons Standard**: Exclusively SVG / Ionicons — strictly zero emojis.
- **Dark Mode**:
  - Background: `#080d16` (Deep pitch night)
  - Surface Cards: `#0f172a` (Navy slate)
  - Borders: `rgba(255, 255, 255, 0.08)`
  - Primary Accent: `#7c3aed` (Premier League Purple)
  - Secondary Accent: `#00e5ff` (Cyan telemetry glow)
  - Tertiary Accent: `#f43f5e` (Crimson alerts & opposition)
- **Light Mode**:
  - Background: `#f8fafc` (Clean stadium light)
  - Surface Cards: `#ffffff` (Pure white card with subtle elevation shadow)
  - Borders: `rgba(0, 0, 0, 0.08)`
  - Primary Text: `#0f172a`
  - Secondary Text: `#64748b`

---

## 🧩 Component Inventory & Single Base Memory Wiring

Every component reads from and writes to the centralized `baseMemoryStore`:

1. **`StudioSidebar`**: Vertical navigation, screen selector, and Theme Toggle (Moon / Sun icons).
2. **`MatchScoreCard`**: Displays live scoreline (`MCI 1 - 0 ARS` / `ARS 2 - 3 MUN`), live clock, venue, and goal events.
3. **`FormationPitchCard`**: Interactive tactical pitch showing the 22 player positions, shirt numbers, and manager profiles.
4. **`PlayerSpotlightCard`**: Tracks Player of the Match / designated Player Cam with shooting, passing, dribbling, defending stats.
5. **`ShootMapCard`**: Real-time penalty box shot location visualization with xG metrics.
6. **`AttackingShapeCard`**: Team territorial shape, centroid of possession, and passing progression direction.
7. **`MediaTimelinePanel`**: Multi-camera simulated view, interactive match scrubber, and chronological events list.
