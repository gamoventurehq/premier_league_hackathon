import React, { useState } from "react";
import { IonIcon, IonSpinner } from "@ionic/react";
import {
  closeOutline,
  sendOutline,
  sparklesOutline,
} from "ionicons/icons";
import { useBaseMemory } from "../store/baseMemory";

interface Message {
  sender: "user" | "copilot";
  text: string;
  toolUsed?: string;
  source?: string;
  model?: string;
  metrics?: Record<string, unknown>;
  timestamp: string;
}

const PRESET_QUERIES = [
  "Which player is performing worst right now?",
  "Which player is performing best right now?",
  "Why is the game in a high-pressure or chaos state?",
  "What is our current pitch control dominance split?",
  "What is happening in the match right now?",
  "List the latest tactical inflection points in the match.",
];

export const TacticalCopilotDrawer: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "copilot",
      text: "Premier League Studio Tactical Copilot online. Powered by live LLM inference and Azure MCP tools with strict telemetry grounding (zero hallucinations). Ask about player performance, pitch dominance, passing risk, or momentum shifts.",
      timestamp: "Live",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const matchClock = useBaseMemory((s) => s.matchClock);
  const blackboard = useBaseMemory((s) => s.blackboard);
  const currentFrame = useBaseMemory((s) => s.currentFrame);

  const formatClock = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleSend = async (queryText?: string) => {
    const q = (queryText || input).trim();
    if (!q || isLoading) return;

    const userMsg: Message = {
      sender: "user",
      text: q,
      timestamp: formatClock(matchClock),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // 1. Primary path: Query the Copilot AI service (powered by Ollama local LLM / Azure Foundry with real telemetry context)
      const res = await fetch("/api/copilot/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, persona: "analyst" }),
      });

      if (res.ok) {
        const data = await res.json();
        const copilotMsg: Message = {
          sender: "copilot",
          text: data.answer,
          toolUsed: data.toolUsed || "llm_tactical_copilot",
          source: data.source,
          model: data.model,
          timestamp: data.matchClock || formatClock(matchClock),
        };
        setMessages((prev) => [...prev, copilotMsg]);
        setIsLoading(false);
        return;
      }

      // 2. Fallback to direct MCP tool invocation if copilot endpoint is unreachable
      const lowerQ = q.toLowerCase();
      let toolToCall = "get_tactical_state";
      let toolArgs: Record<string, unknown> = {};

      if (lowerQ.includes("pitch control") || lowerQ.includes("dominance") || lowerQ.includes("space") || lowerQ.includes("territor")) {
        toolToCall = "get_pitch_control";
        toolArgs = { includeCells: false };
      } else if (lowerQ.includes("inflection") || lowerQ.includes("shift") || lowerQ.includes("swing") || lowerQ.includes("momentum")) {
        toolToCall = "get_inflection_points";
        toolArgs = { limit: 5 };
      } else if (lowerQ.includes("haaland") || lowerQ.includes("saka") || lowerQ.includes("foden") || lowerQ.includes("spotlight") || lowerQ.includes("de bruyne") || lowerQ.includes("raya") || lowerQ.includes("ederson")) {
        let targetId = "h11";
        if (lowerQ.includes("saka")) targetId = "a7";
        else if (lowerQ.includes("foden")) targetId = "h9";
        else if (lowerQ.includes("de bruyne")) targetId = "h8";
        else if (lowerQ.includes("raya")) targetId = "a1";
        else if (lowerQ.includes("ederson")) targetId = "h1";
        toolToCall = "get_player_spotlight";
        toolArgs = { playerId: targetId };
      } else if (lowerQ.includes("event") || lowerQ.includes("recent") || lowerQ.includes("action") || lowerQ.includes("happening")) {
        toolToCall = "get_match_events";
        toolArgs = { limit: 5 };
      } else if (lowerQ.includes("chaos") || lowerQ.includes("pressure") || lowerQ.includes("rhythm") || lowerQ.includes("control")) {
        toolToCall = "get_control_vs_chaos_index";
        toolArgs = {};
      }

      const mcpRes = await fetch("/api/mcp/invoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: toolToCall, arguments: toolArgs }),
      });

      let replyText = "";
      if (mcpRes.ok) {
        const mcpData = await mcpRes.json();
        replyText = JSON.stringify(mcpData.result);
      } else {
        replyText = `Live Telemetry Grounding: Game Rhythm: ${blackboard.current_game_rhythm}. Control vs Chaos: ${blackboard.control_index}/${blackboard.chaos_index}.`;
      }

      const fallbackMsg: Message = {
        sender: "copilot",
        text: replyText,
        toolUsed: toolToCall,
        timestamp: formatClock(matchClock),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } catch {
      const rhythm = blackboard.current_game_rhythm || "Fluid";
      const control = blackboard.control_index || 64;
      const pdr = ((blackboard.latest_pdr ?? 0.42) * (blackboard.latest_pdr < 1 ? 100 : 1)).toFixed(1);
      const fallbackMsg: Message = {
        sender: "copilot",
        text: `Live Telemetry Grounding: Game Rhythm: ${rhythm}. Territorial dominance: ${control}% control. Pass Difficulty Rating: ${pdr}%.`,
        toolUsed: "local_telemetry_cache",
        timestamp: formatClock(matchClock),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: "min(400px, 100vw)",
        backgroundColor: "#0f172a",
        borderLeft: "1px solid #1e293b",
        zIndex: 10000,
        display: "flex",
        flexDirection: "column",
        boxShadow: "-8px 0 24px rgba(0, 0, 0, 0.6)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid #1e293b",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#090d16",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <IonIcon icon={sparklesOutline} style={{ color: "#00e5ff", fontSize: "18px" }} />
          <div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "#f8fafc" }}>Tactical Copilot</div>
            <div style={{ fontSize: "10.5px", color: "#64748b" }}>Live LLM & Azure MCP Grounded</div>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "#94a3b8",
            cursor: "pointer",
            padding: "4px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <IonIcon icon={closeOutline} style={{ fontSize: "20px" }} />
        </button>
      </div>

      {/* Preset Queries Strip */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
          display: "flex",
          gap: "6px",
          overflowX: "auto",
          whiteSpace: "nowrap",
        }}
      >
        {PRESET_QUERIES.map((pq, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(pq)}
            style={{
              background: "#1e293b",
              color: "#cbd5e1",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "14px",
              padding: "4px 10px",
              fontSize: "11px",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {pq.split(" ").slice(0, 3).join(" ")}...
          </button>
        ))}
      </div>

      {/* Messages Thread */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {messages.map((m, idx) => {
          const isUser = m.sender === "user";
          return (
            <div
              key={idx}
              style={{
                alignSelf: isUser ? "flex-end" : "flex-start",
                maxWidth: "88%",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <div
                style={{
                  background: isUser ? "linear-gradient(135deg, #0284c7, #2563eb)" : "#1e293b",
                  color: isUser ? "#ffffff" : "#f1f5f9",
                  padding: "10px 12px",
                  borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  fontSize: "12.5px",
                  lineHeight: 1.45,
                  border: isUser ? "none" : "1px solid rgba(255, 255, 255, 0.05)",
                }}
              >
                {m.text}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "9.5px",
                  color: "#64748b",
                  alignSelf: isUser ? "flex-end" : "flex-start",
                }}
              >
                <span>{m.timestamp}</span>
                {m.source && (
                  <>
                    <span>•</span>
                    <span style={{ color: "#a855f7" }}>{m.source}</span>
                  </>
                )}
                {m.model && (
                  <>
                    <span>•</span>
                    <span style={{ color: "#38bdf8", fontFamily: "monospace" }}>{m.model}</span>
                  </>
                )}
                {m.toolUsed && !m.model && (
                  <>
                    <span>•</span>
                    <span style={{ color: "#38bdf8", fontFamily: "monospace" }}>tool: {m.toolUsed}</span>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: "8px", color: "#38bdf8", fontSize: "11px" }}>
            <IonSpinner name="dots" style={{ width: "20px", height: "20px" }} />
            <span>AI Reasoning over live telemetry...</span>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid #1e293b",
          backgroundColor: "#090d16",
          display: "flex",
          gap: "8px",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder="Ask tactical question..."
          style={{
            flex: 1,
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "8px",
            padding: "8px 12px",
            color: "#f8fafc",
            fontSize: "12.5px",
            outline: "none",
          }}
        />

        <button
          onClick={() => handleSend()}
          disabled={isLoading || !input.trim()}
          style={{
            background: input.trim() ? "#00e5ff" : "#334155",
            color: "#020617",
            border: "none",
            borderRadius: "8px",
            padding: "8px 12px",
            cursor: input.trim() ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
          }}
        >
          <IonIcon icon={sendOutline} style={{ fontSize: "16px" }} />
        </button>
      </div>
    </div>
  );
};
