# Microsoft Premier League Hackathon: Inside the Game
## Official Submission Form & Deliverables Package

> **Submission Portal**: [aka.ms/insidethegame](https://aka.ms/insidethegame)  
> **Host / Partners**: Microsoft Corporation & The Football Association Premier League  
> **Team Name**: **Gamoventure**  
> **Project Name**: **Premier League Studio: Synthetic Match Insights Engine**  
> **Target Category Bids**: **Grand Prize (1st Place)** • **Best Use of Microsoft Foundry** • **Best Multi-Agent System**

---

### 1. Elevator Pitch (Short Description)

Premier League Studio by Gamoventure is an Azure-native tactical intelligence and broadcast visualization engine that transforms high-frequency synthetic football telemetry into instantaneous, explainable match insights, synchronized broadcast TV overlays, and personalized multi-persona narratives. Built cloud-natively with Microsoft Foundry (Azure AI Foundry), a 4-agent collaborative swarm via Azure Model Context Protocol (MCP), Azure Event Hubs, and Azure Cosmos DB, the engine delivers sub-50ms reactive pitch control and pass difficulty modeling, automatic tactical inflection detection, and dual-audience storytelling for technical analysts and casual global fans across 5 languages.

---

### 2. Comprehensive Project Description

Modern top-flight football generates over 3.2 million raw spatial coordinates per fixture, yet broadcasters, clubs, and fans remain constrained by delayed post-match stat sheets, generic commentary, and high cognitive friction. 

Premier League Studio solves this through an end-to-end 5-stage pipeline:
1. **Stage 1 (Ingest)**: A 100% synthetic physics and kinodynamic simulation engine streaming 22 player nodes and 3D ball vectors on a canonical 105m × 68m metric pitch at 5Hz/10Hz into Azure Event Hubs, with zero reliance on real Premier League match feeds.
2. **Stage 2 (Interpret)**: Sub-5ms fast-path spatial calculus generating a 357-cell Voronoi/Gaussian Pitch Control surface, multi-vector Pass Difficulty Rating (PDR), and a dynamic Control vs. Chaos Index.
3. **Stage 3 (Explain)**: Microsoft Foundry (Azure AI Foundry) orchestrates a 4-agent collaborative swarm (Telemetry Ingestion, Tactical Reasoning, Broadcast Narrative, and Fan Personalization) communicating over a shared tactical blackboard state to identify sudden Tactical Inflection Points (volatility shifts $\Delta \ge 14\%$) and generate contextual explanations.
4. **Stage 4 (Render)**: Machine-readable, synchronized broadcast TV lower-third overlays with 6 display modes and a real-time JSON inspector, alongside an automated half-time studio teleprompter script with speaker cues and interactive video chapter markers.
5. **Stage 5 (Personalize)**: Seamless 1-click toggling between Analyst Experience (xT, line compression, spatial geometry), Casual Experience (storyline duels, work rate), Player Cam tracking, and synchronized commentary in English, Spanish, French, Japanese, and Arabic (RTL).

The frontend is implemented in Ionic React with strict native iOS Cupertino styling (`mode="ios"`), permanent broadcast dark mode, and layout-first zero-clutter hierarchy, complete with an interactive in-app Judge Quick Tour modal.

---

### 3. Explicit List of Microsoft & Azure Technologies Used

- **Microsoft Foundry (Azure AI Foundry)**:
  - Orchestration of multi-agent reasoning swarm and prompt evaluation workflows.
  - Deployed model: `gpt-4.1-mini` via Azure OpenAI resource `raumdeuter-resource.openai.azure.com`.
  - Latency-optimized inference for live commentary and tactical explanation.
- **Microsoft Agent Framework & Azure Model Context Protocol (MCP)**:
  - Standardized agent tool surfaces (`/api/mcp`) for spatial analytics and scenario injection.
  - Multi-agent collaboration with distinct roles, shared blackboard state, and error resilience.
- **Azure Event Hubs**:
  - High-throughput, real-time event streaming ingestion for 5Hz spatial telemetry frames.
- **Azure Cosmos DB**:
  - Globally distributed, low-latency NoSQL database persisting match frames, blackboard state, and broadcast overlay payloads.
- **Azure Container Apps / App Service**:
  - Containerized deployment running the FastAPI backend and Ionic React web client.
- **GitHub Copilot Agent Mode**:
  - AI pair programming and automated architectural verification.

---

### 4. Demo Video Deliverable (< 120 Seconds Hard Limit)

- **Mandatory Rule**: Video must be strictly under 2 minutes (< 120.0s).
- **Actual Video Duration**: **106.91 seconds (01:46.91)** — **100% Compliant**.
- **Resolution**: 1080p Full HD (1920×1080 @ 30 FPS).
- **Voiceover**: Professional British broadcast narration (`en-GB-RyanNeural`).
- **File in Repository**: [`media/premier_league_studio_demo.mp4`](media/premier_league_studio_demo.mp4) (5.9 MB)
- **Public URL**: Upload to YouTube / Vimeo / aka.ms portal submission link.
- **Video Walkthrough Breakdown**:
  - `00:00 - 00:18`: Master Broadcast Studio Dashboard & 5Hz Real-Time Telemetry.
  - `00:18 - 00:33`: Interactive Judge Quick Tour Modal (5 Rubric Pillars Walkthrough).
  - `00:33 - 00:52`: 105m Pitch Radar, Voronoi Pitch Control, and 3 Spatial Camera Angles.
  - `00:52 - 01:14`: Multi-Persona Personalization (Analyst vs. Casual vs. Player Cam) & Multilingual Stream.
  - `01:14 - 01:34`: Studio Diagnostics, Synthetic Match Scenario Injector & Half-Time Broadcast Teleprompter.
  - `01:34 - 01:47`: Microsoft Foundry & Azure Cloud-Native Architecture Outro Card.

---

### 5. Access Instructions & Reproduction for Judges

The test build is fully accessible without paywalls, login restrictions, or third-party dependencies:

#### 1-Command Docker Launch:
```bash
git clone https://github.com/gamoventurehq/premier_league_hackathon.git
cd premier_league_hackathon
docker compose up --build
```
- Web Application: `http://localhost:3000`
- API Health & Swagger: `http://localhost:8000/docs`
- Service Health: `http://localhost:8000/health` and `http://localhost:8000/api/health`
- WebSocket Telemetry: `ws://localhost:8000/ws/telemetry`
- Azure MCP Server: `http://localhost:8000/api/mcp`

#### Automated Test Verification:
```bash
# Run 4-Tier Opaque-Box E2E Test Suite (33/33 tests passing)
./run_e2e.sh

# Run Frontend Unit Tests (21/21 tests passing)
cd frontend && npm test

# Run Frontend Typecheck (0 errors)
cd frontend && npm run typecheck
```

---

### 6. Compliance & Eligibility Checklist

- [x] **Public GitHub Repository**: Clean monorepo structure with complete documentation and git history.
- [x] **New Project Only**: Conceived and implemented within the official hackathon window.
- [x] **Synthetic Data Mandate**: 100% synthetic physics on a 105m × 68m metric pitch; zero real Premier League match feeds or scraped data.
- [x] **Demo Video**: 106.91s duration (strictly under the 120s limit) showing live functioning software.
- [x] **Working Project Access**: Self-contained reproduction via Docker Compose and live API endpoints.
- [x] **Language**: All interfaces, code, documentation, and video narration in English (with verified multilingual localization in ES, FR, JA, AR).
