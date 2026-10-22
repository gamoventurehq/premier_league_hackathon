"""The Azure MCP tool surface (ADR 0006).

The tools exposed here are *actually callable*: every entry has a JSON Schema,
a dispatch implementation and a documented mapping onto the service. They can
be invoked directly through ``POST /api/mcp/invoke`` or proxied by an MCP host
(see ``backend/README.md``).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Callable

from ..models import ToolDescriptor

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class McpTool:
    name: str
    description: str
    input_schema: dict[str, Any]
    implementation: str
    handler: Callable[[dict[str, Any]], Any]

    def descriptor(self) -> ToolDescriptor:
        return ToolDescriptor(
            name=self.name,
            description=self.description,
            input_schema=self.input_schema,
            implementation=self.implementation,
        )


@dataclass(slots=True)
class ToolRegistry:
    """A registry of callable MCP tools."""

    tools: dict[str, McpTool] = field(default_factory=dict)

    def register(self, tool: McpTool) -> None:
        self.tools[tool.name] = tool

    def descriptors(self) -> list[ToolDescriptor]:
        return [tool.descriptor() for tool in self.tools.values()]

    def invoke(self, name: str, arguments: dict[str, Any] | None = None) -> Any:
        tool = self.tools.get(name)
        if tool is None:
            raise KeyError(f"Unknown tool: {name}")
        return tool.handler(arguments or {})


def build_registry(provider: Any) -> ToolRegistry:
    """Build the tool surface bound to a live service provider."""

    registry = ToolRegistry()

    registry.register(
        McpTool(
            name="get_pitch_control_surface",
            description=(
                "Return the Pitch Control probability surface of the current synthetic match: "
                "the home / away / contested split plus the full cell grid."
            ),
            input_schema={
                "type": "object",
                "properties": {
                    "includeCells": {
                        "type": "boolean",
                        "description": "Return the 357 cell grid in addition to the split.",
                        "default": True,
                    }
                },
                "additionalProperties": False,
            },
            implementation="app.services.spatial -> pitch_control_surface / pitch_control_percentages",
            handler=lambda args: provider.get_pitch_control_surface(
                include_cells=bool(args.get("includeCells", True))
            ),
        )
    )

    registry.register(
        McpTool(
            name="evaluate_passing_lane",
            description=(
                "Evaluate the Passing Lane between two players of the current match and return "
                "the Pass Difficulty Rating with its four supporting components."
            ),
            input_schema={
                "type": "object",
                "properties": {
                    "passerId": {"type": "string", "description": "Player id of the carrier."},
                    "receiverId": {"type": "string", "description": "Player id of the candidate receiver."},
                },
                "required": ["passerId", "receiverId"],
                "additionalProperties": False,
            },
            implementation="app.simulation.spatial.evaluate_lane",
            handler=lambda args: provider.evaluate_passing_lane(
                str(args["passerId"]), str(args["receiverId"])
            ),
        )
    )

    registry.register(
        McpTool(
            name="get_control_vs_chaos_index",
            description=(
                "Return the Control vs. Chaos Index with the observable inputs it was derived "
                "from, plus the Game Rhythm of the current match."
            ),
            input_schema={"type": "object", "properties": {}, "additionalProperties": False},
            implementation="app.simulation.metrics.control_vs_chaos_index / game_rhythm",
            handler=lambda args: provider.get_control_vs_chaos_index(),
        )
    )

    registry.register(
        McpTool(
            name="emit_broadcast_overlay",
            description=(
                "Emit the Stage 4 Broadcast Overlay payload for the current moment, in the "
                "Multilingual Broadcast Stream form consumed by broadcast graphic engines."
            ),
            input_schema={
                "type": "object",
                "properties": {
                    "persona": {
                        "type": "string",
                        "enum": ["analyst", "casual", "player_cam", "club_centric"],
                        "default": "analyst",
                    }
                },
                "additionalProperties": False,
            },
            implementation="app.services.overlay.build_overlay",
            handler=lambda args: provider.emit_broadcast_overlay(str(args.get("persona", "analyst"))),
        )
    )

    registry.register(
        McpTool(
            name="get_match_events",
            description=(
                "Return the most recent discrete match events of the synthetic match, newest last."
            ),
            input_schema={
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "minimum": 1, "maximum": 200, "default": 25},
                    "type": {
                        "type": "string",
                        "description": "Optional event type filter, e.g. 'shot' or 'pass'.",
                    },
                },
                "additionalProperties": False,
            },
            implementation="app.simulation.engine.MatchEngine.events",
            handler=lambda args: provider.get_match_events(
                limit=int(args.get("limit", 25)), event_type=args.get("type")
            ),
        )
    )

    registry.register(
        McpTool(
            name="get_agent_trace",
            description="Return the latest agent trace of the four-agent swarm.",
            input_schema={"type": "object", "properties": {}, "additionalProperties": False},
            implementation="app.agents.swarm.AgentSwarm.run",
            handler=lambda args: provider.get_agent_trace(),
        )
    )

    return registry


__all__ = ["McpTool", "ToolRegistry", "build_registry"]
