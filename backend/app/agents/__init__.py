"""The four-agent swarm and the shared tactical state blackboard (ADR 0002)."""

from .base import Agent, AgentContext, AgentOutcome, Blackboard, BlackboardView
from .broadcast_narrative import (
    BroadcastNarrativeAgent,
    NarrativeDraft,
    RuleBasedNarrativeGenerator,
)
from .fan_personalization import FanPersonalizationAgent, PersonaBundle
from .swarm import AgentSwarm, SwarmResult
from .tactical_reasoning import TacticalReasoningAgent
from .telemetry_ingestion import TelemetryIngestionAgent

__all__ = [
    "Agent",
    "AgentContext",
    "AgentOutcome",
    "AgentSwarm",
    "Blackboard",
    "BlackboardView",
    "BroadcastNarrativeAgent",
    "FanPersonalizationAgent",
    "NarrativeDraft",
    "PersonaBundle",
    "RuleBasedNarrativeGenerator",
    "SwarmResult",
    "TacticalReasoningAgent",
    "TelemetryIngestionAgent",
]
