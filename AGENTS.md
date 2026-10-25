# Project Context & Agent Operating Rules

This repository contains Gamoventure's solution for the **Microsoft Premier League Hackathon: Inside the Game** — the **Premier League Studio: Synthetic Match Insights Engine**.

## Canonical References

- [AGENT_RULES.md](AGENT_RULES.md): Core operating rulebook for AI engineering agents — engineering identity (senior AI agentic & full-stack engineer), Karpathy laws of foundational coding, and UI layout-first doctrine.
- [CHALLENGE.md](CHALLENGE.md): Complete challenge brief, hard constraints, 5-stage pipeline requirements, feature matrices, and architecture blueprints. Consult whenever designing pipeline components, evaluation bars, or persona adaptations.
- [HACKATHON_RULES.md](HACKATHON_RULES.md): Official contest rules, strict deadlines, submission deliverables checklist (2-minute video, public repo, working test build), 5-pillar judging rubric (20% each), hero technology priorities, and prize stacking constraints. Consult before submission and when aligning system architecture with judging criteria.
- [CONTEXT.md](CONTEXT.md): Canonical domain glossary covering every domain term. Consult before naming any identifier, metric, or persona.
- [docs/adr/](docs/adr/): Architecture Decision Records. Read the relevant ADR before changing an architectural decision, and record any new decision as a new ADR rather than editing an accepted one.

## Essential Constraints

1. **Synthetic Data Only**: Never ingest, scrape, or distribute real Premier League match feeds. All tracking and match events must be generated or simulated synthetically.
2. **Azure-Native Execution**: Architect services to run natively on Azure infrastructure (Microsoft Foundry / Azure AI Foundry, Event Hubs, Azure Functions / App Service, Cosmos DB).
3. **Dual Focus**: Every milestone must balance robust metric generation with explainable storytelling and dynamic personalization (Analyst vs. Casual experiences).
4. **Canonical Terminology**: Use the terms defined in [CONTEXT.md](CONTEXT.md) verbatim in code identifiers, UI labels, prompts, and generated narrative. Do not introduce synonyms for terms the glossary already fixes.
5. **Engineering & UI Standards**: Adhere strictly to [AGENT_RULES.md](AGENT_RULES.md) for foundational coding principles (Karpathy laws), agentic pipeline rigor, and the layout-first UI doctrine.
