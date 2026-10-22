# 0006: Microsoft Agent Framework and Azure MCP with Shared Blackboard

To maximize alignment with the Best Multi-Agent System Category Prize and Microsoft Hero Tech rubric, we decided to structure the 4-agent swarm using Microsoft Agent Framework patterns, connecting agent tools through Azure Model Context Protocol (MCP) endpoints and exchanging match state via an in-memory shared tactical blackboard. This establishes a clean separation between ingestion, tactical analysis, commentary scripting, and audience localization while maintaining strict Pydantic contract validation at each handoff.
