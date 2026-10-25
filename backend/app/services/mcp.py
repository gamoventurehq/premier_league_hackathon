"""The Azure MCP tool surface (ADR 0006).

The tools exposed here are *actually callable*: every entry has a JSON Schema,
a dispatch implementation and a documented mapping onto the service. They can
be invoked directly through ``POST /api/mcp/invoke`` or proxied by an MCP host
(see ``backend/README.md``).
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

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


def validate_input_schema(schema: dict[str, Any], arguments: dict[str, Any]) -> None:
    """Validate tool call arguments strictly against its JSON schema."""
    if not isinstance(arguments, dict):
        raise ValueError(f"Arguments must be an object (dict), got {type(arguments).__name__}")

    # Required properties check
    required = schema.get("required", [])
    for req_field in required:
        if req_field not in arguments:
            raise ValueError(f"Missing required argument: '{req_field}'")

    properties = schema.get("properties", {})
    # additionalProperties check
    if schema.get("additionalProperties") is False:
        extra_keys = set(arguments.keys()) - set(properties.keys())
        if extra_keys:
            raise ValueError(f"Unexpected arguments: {sorted(extra_keys)}")

    # Property-level type and constraint validation
    for key, val in arguments.items():
        if key not in properties:
            continue
        prop_spec = properties[key]
        prop_type = prop_spec.get("type")

        if prop_type == "string":
            if not isinstance(val, str):
                raise ValueError(f"Argument '{key}' must be a string, got {type(val).__name__}")
        elif prop_type == "number":
            if not isinstance(val, (int, float)) or isinstance(val, bool):
                raise ValueError(f"Argument '{key}' must be a number, got {type(val).__name__}")
        elif prop_type == "integer":
            if not isinstance(val, int) or isinstance(val, bool):
                raise ValueError(f"Argument '{key}' must be an integer, got {type(val).__name__}")
        elif prop_type == "boolean" and not isinstance(val, bool):
            raise ValueError(f"Argument '{key}' must be a boolean, got {type(val).__name__}")

        if "enum" in prop_spec and val not in prop_spec["enum"]:
            raise ValueError(f"Argument '{key}' must be one of {prop_spec['enum']}, got '{val}'")

        if "minimum" in prop_spec and isinstance(val, (int, float)) and val < prop_spec["minimum"]:
            raise ValueError(f"Argument '{key}' must be >= {prop_spec['minimum']}, got {val}")

        if "maximum" in prop_spec and isinstance(val, (int, float)) and val > prop_spec["maximum"]:
            raise ValueError(f"Argument '{key}' must be <= {prop_spec['maximum']}, got {val}")


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
        args = arguments if arguments is not None else {}
        validate_input_schema(tool.input_schema, args)
        return tool.handler(args)


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
            description=("Return the most recent discrete match events of the synthetic match, newest last."),
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

    registry.register(
        McpTool(
            name="get_player_spotlight",
            description=(
                "Return detailed player kinematics, performance statistics, and match rating for "
                "a specified player ID or name."
            ),
            input_schema={
                "type": "object",
                "properties": {
                    "playerId": {
                        "type": "string",
                        "description": "Player identifier or name (e.g. 'h11' or 'Haaland').",
                    }
                },
                "required": ["playerId"],
                "additionalProperties": False,
            },
            implementation="app.runtime.MatchRuntime.get_player_spotlight",
            handler=lambda args: provider.get_player_spotlight(str(args["playerId"])),
        )
    )

    registry.register(
        McpTool(
            name="jump_match_time",
            description="Scrub the synthetic match simulation to a target match second.",
            input_schema={
                "type": "object",
                "properties": {
                    "seconds": {
                        "type": "number",
                        "minimum": 0.0,
                        "maximum": 5400.0,
                        "description": "Target match second to jump to.",
                    }
                },
                "required": ["seconds"],
                "additionalProperties": False,
            },
            implementation="app.runtime.MatchRuntime.jump_to_seconds",
            handler=lambda args: {
                **(
                    provider.jump_to_seconds(float(args["seconds"])).model_dump()
                    if hasattr(provider, "jump_to_seconds")
                    else {"matchSeconds": provider.jump_to(float(args["seconds"]))}
                ),
                "status": "ok",
            },
        )
    )

    registry.register(
        McpTool(
            name="get_pitch_control",
            description=(
                "Return the Pitch Control probability surface and dominance split of the current synthetic match."
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
            implementation="app.runtime.MatchRuntime.get_pitch_control_surface",
            handler=lambda args: (
                provider.get_pitch_control(include_cells=bool(args.get("includeCells", True)))
                if hasattr(provider, "get_pitch_control")
                else provider.get_pitch_control_surface(include_cells=bool(args.get("includeCells", True)))
            ),
        )
    )

    registry.register(
        McpTool(
            name="get_tactical_state",
            description=(
                "Return the full tactical state including phase, game rhythm, control vs chaos index, "
                "pass difficulty rating, pitch control split, score, and key players."
            ),
            input_schema={"type": "object", "properties": {}, "additionalProperties": False},
            implementation="app.runtime.MatchRuntime.get_tactical_state",
            handler=lambda args: provider.get_tactical_state(),
        )
    )

    registry.register(
        McpTool(
            name="get_inflection_points",
            description=(
                "Return match inflection points (discrete tactical shifts and momentum swings)."
            ),
            input_schema={
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 50,
                        "default": 10,
                        "description": "Maximum number of inflection events to return.",
                    }
                },
                "additionalProperties": False,
            },
            implementation="app.runtime.MatchRuntime.get_inflection_points",
            handler=lambda args: provider.get_inflection_points(limit=int(args.get("limit", 10))),
        )
    )

    return registry


__all__ = ["McpTool", "ToolRegistry", "build_registry"]
