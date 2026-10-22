# Microsoft Premier League Hackathon: Official Rules & Submission Guide
> **Canonical Source**: [Inside the Game Official Rules](https://github.com/microsoft/insidethegamehackathon/blob/main/OFFICIAL%20RULES.md)  
> **Registration & Submission Portal**: [aka.ms/insidethegame](https://aka.ms/insidethegame)  
> **Host / Partners**: Microsoft Corporation & The Football Association Premier League

---

## 1. Timeline & Deadlines

All times Pacific Time (PT):

| Milestone | Window / Deadline | Notes |
| :--- | :--- | :--- |
| **Registration Period** | Sept 29, 2026 (09:00 PT) – Oct 20, 2026 (12:00 PT) | Team representative must register. |
| **Hackathon Submission Window** | Oct 6, 2026 (09:00 PT) – **Oct 27, 2026 (23:59 PT)** | Hard submission deadline on portal. |
| **Judging Period** | Oct 27, 2026 (09:00 PT) – Nov 10, 2026 (23:59 PT) | Two-stage judging evaluation. |
| **Winners Announced** | By Nov 20, 2026 (23:59 PT) | Microsoft blog & social announcement. |

---

## 2. Hard Eligibility & Compliance Constraints

- **Team Size**: Up to 4 individuals per team, or registered Organizations. One authorized Representative enters on behalf of the team.
- **New Projects Only**: Codebase and repository must be newly created after hackathon registration opened.
- **Synthetic Data & Footage Mandate**: No real Premier League match footage or real match data redistributed. All data must be synthetic and football-realistic. Third-party footage/data must have verified usage rights.
- **Language**: All materials (demo video, documentation, repo, UI) must be in English or provide full English translation.
- **Originality & Open Source**: Project must be original work. Open source components are allowed if properly attributed and if original enhancements build upon them.

---

## 3. Mandatory Submission Checklist

A submission is incomplete and disqualified if any item below is missing:

- [ ] **Public GitHub Repository**:
  - Must be public at submission time.
  - Well-structured, documented, and maintainable codebase.
- [ ] **Project Pitch / Text Description**:
  - Short elevator pitch explaining what was built, what problem it solves, and what it does.
  - Explicit list of Microsoft and Azure technologies used.
- [ ] **Demo Video**:
  - **Hard Limit: Under 2 minutes (< 120 seconds)**. Judges are not required to watch past the 2-minute mark.
  - Must show the project functioning live on its target platform.
  - Uploaded to a public URL (YouTube, Vimeo, Facebook Video, or Youku).
  - No unlicensed copyrighted music or third-party trademarks.
- [ ] **Working Project Access for Judges**:
  - Direct link to live web app, functioning demo, or test build.
  - If protected, working credentials must be supplied in testing instructions.
  - Must remain accessible free of charge and without restriction through Nov 10, 2026.

---

## 4. Judging Rubric & Two-Stage Process

### Stage 1: Pass/Fail Viability Gate
- Checks baseline fit to the challenge theme and genuine adoption of required Microsoft technologies.

### Stage 2: 5 Scored Pillars (20% Each, Total 100%)

| Pillar | Weight | Evaluation Criteria |
| :--- | :---: | :--- |
| **1. Technological Implementation** | **20%** | • Creativity & optimization in synthetic data generation.<br>• Cloud application engineering best practices (MS Learn / Azure Architecture).<br>• Depth of Hero Tech integration.<br>• Code quality, structure, and documentation. |
| **2. Agentic Design & Innovation** | **20%** | • Creative application of Agentic AI design patterns.<br>• Multi-agent orchestration, MCP integration, role delegation, shared state.<br>• Novelty vs. incremental improvement over existing solutions. |
| **3. Real-World Impact & Applicability**| **20%** | • Significance of football insight problem solved.<br>• Production & enterprise deployment readiness.<br>• Tangible business impact for broadcasters, clubs, and streaming viewers. |
| **4. UX & Presentation** | **20%** | • Intuitive, well-designed user experience.<br>• Video clarity in communicating solution value.<br>• Balanced blend of frontend experience and backend depth. |
| **5. Category Adherence** | **20%** | • Strict alignment with targeted Category Prize criteria. |

> **Tie-Breaker Hierarchy**: Ties are broken sequentially in order of criteria: (1) Technological Implementation → (2) Agentic Design → (3) Real-World Impact → (4) UX → (5) Category Adherence → Judge Vote.

---

## 5. Hero Technologies (High Scoring Priority)

The judging rubric specifically highlights leverage of Microsoft's Hero Tech stack:
- **Microsoft Foundry (Azure AI Foundry)**: Orchestration, fine-tuning, evaluations, and deployment of LLM/agent pipelines.
- **Microsoft Agent Framework / GitHub Copilot Agent Mode / A2A**: Multi-agent collaboration with distinct roles, state handoffs, and error resilience.
- **Azure Model Context Protocol (MCP)**: Tool integration and standardized agent execution contexts.
- **Azure Cloud-Native Services**: Azure Container Apps (ACA), Azure Kubernetes Service (AKS), Azure Functions, Event Hubs, Logic Apps.
- **Data & Storage**: Microsoft Fabric, Azure Cosmos DB, Azure AI Search.

---

## 6. Prize Structure & Stacking Rules

> **Winning Cap Rule**: Each project may win **up to one (1) Grand Prize AND up to one (1) Category Prize**.

| Award | Cash / E-Gift Card (USD) | Additional Perks | Target Focus |
| :--- | :--- | :--- | :--- |
| **Grand Prize: 1st Place** | **$4,000 / member** | 1 PL match ticket (~$1,000/mbr) + $50 PL store voucher + Social feature | Best overall solution, platform depth, explainable intelligence, dual audience personalization. |
| **Grand Prize: 2nd Place** | **$2,500 / member** | 1 PL match ticket (~$1,000/mbr) + $50 PL store voucher + Social feature | Runner-up complete & compelling solution. |
| **Category: Best Use of Microsoft Foundry** | **$1,500 / member** | $50 PL store voucher + Social feature | Accelerating development, orchestration, and scaling via Azure AI Foundry. |
| **Category: Best Enterprise Solution** | **$1,500 / member** | $50 PL store voucher + Social feature | Production readiness, governance, reliability, enterprise controls. |
| **Category: Best Multi-Agent System** | **$1,500 / member** | $50 PL store voucher + Social feature | Purposeful multi-agent collaboration, shared state, handoffs, resilient agent teams. |
| **Category: Best Azure Cloud Native** | **$1,500 / member** | $50 PL store voucher + Social feature | Event-driven architecture using Functions/ACA/Event Hubs/Cosmos DB. |

---

## 7. Strategic Alignment for Gamoventure

To maximize competitive scoring across both a **Grand Prize** and a **Category Prize**:
1. **Target Stacking**: Pair a Grand Prize bid with either **Best Multi-Agent System** or **Best Use of Microsoft Foundry**.
2. **Multi-Agent Architecture**: Implement specialized agent roles (e.g., *Telemetry Ingestion Agent*, *Tactical Reasoning Agent*, *Broadcast Narrative Agent*, *Fan Personalization Agent*) communicating via structured handoffs and shared state.
3. **Hero Tech Showcase**: Direct telemetry streaming into Azure Event Hubs/Functions, orchestrated via Microsoft Foundry (Azure AI Foundry), exposing an Azure MCP server for agent tool use.
4. **2-Minute Video Discipline**: Script a dynamic, fast-paced video demonstrating live synthetic match event generation, instantaneous overlay sync, and one-click toggling between Analyst and Casual experiences.
