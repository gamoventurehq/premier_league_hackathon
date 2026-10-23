# Premier League Studio: Synthetic Match Insights Engine

> An AI-driven insights engine built on Microsoft Azure that transforms synthetic football event streams into real-time explainable match intelligence, dynamic narratives, and personalized experiences for broadcasters, analysts, and fans.

Developed by **Gamoventure** for the **Microsoft Premier League Hackathon: Inside the Game**.

---

## Architecture & Design Documents

- [CHALLENGE.md](CHALLENGE.md): 5-stage pipeline specification (Ingest, Interpret, Explain, Render, Personalize), feature matrix, tactical models, and Azure architecture blueprint.
- [HACKATHON_RULES.md](HACKATHON_RULES.md): Official contest rules, judging rubrics, hero technology priorities, and submission criteria.
- [CONTEXT.md](CONTEXT.md): Canonical domain glossary — the single source of truth for every term used in code, UI, and narrative.
- [AGENTS.md](AGENTS.md): Agent system instructions and operating constraints.
- [docs/adr/](docs/adr/): Architecture Decision Records (0001–0009) covering the simulation engine, agent swarm, telemetry standard, latency model, repo layout, MCP blackboard, prototyping sequence, and Ionic iOS mode unified memory baseline.

---

## Project Status

Specification, domain glossary, and Architecture Decision Records are complete and accepted. Implementation follows the frontend-first sequence in [ADR 0007](docs/adr/0007-frontend-first-prototyping-sequence.md) and [ADR 0009](docs/adr/0009-ionic-ios-mode-unified-memory.md): the studio is validated against 5Hz synthetic spatial telemetry streaming into a single reactive Base Memory store.

---

## Key Pillars

1. **Synthetic-Only Data Engine**: Football-realistic telemetry and event stream generation with zero dependency on real Premier League feeds.
2. **Real-Time Match Intelligence**: Dynamic player tagging, speed analytics, pass difficulty ratings, and pitch control modeling.
3. **Tactical Explainability**: Contextual understanding of match momentum, game rhythm, and control vs. chaos metrics.
4. **Broadcast & Studio Overlays**: Synchronized, machine-readable graphical overlays ready for live broadcast pipelines.
5. **Audience Personalization**: Multi-persona adaptations delivering tailored depth for both technical analysts and casual fans, alongside multilingual natural language commentary.

---

## Azure & Hero Tech Stack

- **Microsoft Foundry (Azure AI Foundry)**: LLM orchestration, evaluation, and fine-tuning.
- **Microsoft Agent Framework / Azure MCP**: Multi-agent collaboration with shared tactical state.
- **Azure Cloud Native**: Azure Event Hubs, Azure Container Apps, and Azure Functions.
- **Data & Storage**: Azure Cosmos DB / Microsoft Fabric.

---

## Local Development & Quick Start

### Prerequisites
- **Node.js**: `24.x` LTS
- **Python**: `3.12+` (with `venv`)

### 1. Frontend Setup (Ionic React + Vite + TypeScript)
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) to view the Premier League Studio Dashboard.

### 2. Backend Setup (FastAPI + Pydantic + NumPy + WebSockets)
```bash
cd backend
python -m venv .venv

# On Windows:
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# On Linux / macOS:
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
API Health Check: [http://localhost:8000/api/health](http://localhost:8000/api/health)  
Interactive API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. Running Backend Tests
```bash
cd backend
pytest
```

### 4. Docker Compose (Single Command Evaluation)
```bash
docker compose up --build
```
