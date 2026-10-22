# Project Context & Agent Operating Rules

This repository contains Gamoventure's solution for the **Microsoft Premier League Hackathon: The Synthetic Match Insights Engine for Premier League Studio**.

## Canonical References

- [CHALLENGE.md](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/CHALLENGE.md): Complete challenge brief, hard constraints, 5-stage pipeline requirements, feature matrices, and architecture blueprints. Consult whenever designing pipeline components, evaluation bars, or persona adaptations.
- [HACKATHON_RULES.md](file:///home/gaurav/gamoventure/organisation/microsoft_hackathon/HACKATHON_RULES.md): Official contest rules, strict deadlines, submission deliverables checklist (2-minute video, public repo, working test build), 5-pillar judging rubric (20% each), hero technology priorities, and prize stacking constraints. Consult before submission and when aligning system architecture with judging criteria.

## Essential Constraints

1. **Synthetic Data Only**: Never ingest, scrape, or distribute real Premier League match feeds. All tracking and match events must be generated or simulated synthetically.
2. **Azure-Native Execution**: Architect services to run natively on Azure infrastructure (Azure OpenAI / AI Foundry, Event Hubs, Azure Functions / App Service, Cosmos DB).
3. **Dual Focus**: Every milestone must balance robust metric generation with explainable storytelling and dynamic personalization (Analyst vs. Casual fan experiences).
