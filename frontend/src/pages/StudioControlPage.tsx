import React, { useState } from "react";
import {
  IonContent,
  IonPage,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCardContent,
  IonBadge,
  IonIcon,
} from "@ionic/react";
import {
  serverOutline,
  timeOutline,
  alertCircleOutline,
  flashOutline,
  shieldCheckmarkOutline,
  flameOutline,
  refreshOutline,
  gitNetworkOutline,
  copyOutline,
  checkmarkOutline,
  playOutline,
} from "ionicons/icons";
import { useBaseMemory, baseMemory } from "../store/baseMemory";
import { StudioTopBar } from "../components/StudioTopBar";

interface ScenarioDef {
  id: string;
  title: string;
  category: string;
  accentColor: string;
  controlIdx: number;
  chaosIdx: number;
  pdr: string;
  rhythm: string;
  icon: string;
  desc: string;
  impact: string;
}

const scenarioDefinitions: ScenarioDef[] = [
  {
    id: "low_block_siege",
    title: "Low-Block Siege",
    category: "Possession Dominance",
    accentColor: "#38bdf8",
    controlIdx: 82,
    chaosIdx: 18,
    pdr: "0.68",
    rhythm: "Sustained Possession",
    icon: shieldCheckmarkOutline,
    desc: "Manchester City pin Arsenal into an 18m block depth. Central corridor squeezed to 21.2m.",
    impact: "Tests spatial compression & half-space overload models.",
  },
  {
    id: "rapid_counter",
    title: "Counter-Transition",
    category: "Transition Frenzy",
    accentColor: "#f43f5e",
    controlIdx: 26,
    chaosIdx: 74,
    pdr: "0.35",
    rhythm: "Transition Frenzy",
    icon: flashOutline,
    desc: "Arsenal lightning breakaway! Saka breaks past rest-defense in 3 touches at 33.2 km/h.",
    impact: "Tests line-breaking speed analytics & transition volatility.",
  },
  {
    id: "red_card_crisis",
    title: "Red Card Crisis",
    category: "Numerical Asymmetry",
    accentColor: "#f59e0b",
    controlIdx: 88,
    chaosIdx: 42,
    pdr: "0.76",
    rhythm: "Numerical Asymmetry",
    icon: alertCircleOutline,
    desc: "Arsenal down to 10 men in an emergency 5-3-1 bunker while City overload the flanks.",
    impact: "Tests structural deformation & pitch control reallocation.",
  },
  {
    id: "box_scramble",
    title: "Penalty Box Chaos",
    category: "Max Chaos Event",
    accentColor: "#ec4899",
    controlIdx: 15,
    chaosIdx: 85,
    pdr: "0.88",
    rhythm: "Penalty Box Chaos",
    icon: flameOutline,
    desc: "Total chaos! 6 players contesting rebound in 6-yard box with 0.82 xG goalmouth scramble.",
    impact: "Tests maximum entropy modeling & rapid turnover detection.",
  },
];

const StudioControlPage: React.FC = () => {
  const serverStatus = useBaseMemory((s) => s.serverStatus);
  const matchClock = useBaseMemory((s) => s.matchClock);
  const frameId = useBaseMemory((s) => s.blackboard.latest_frame_id);
  const score = useBaseMemory((s) => s.score);
  const activeScenario = useBaseMemory((s) => s.activeScenario);
  const control = useBaseMemory((s) => s.blackboard.control_index);
  const chaos = useBaseMemory((s) => s.blackboard.chaos_index);

  // Transient state for UI copy feedback and action toast
  const [copied, setCopied] = useState<boolean>(false);
  const [injectedFeedback, setInjectedFeedback] = useState<string | null>(null);

  const formatTime = (secs: number) => {
    const clamped = Math.min(5400, Math.max(0, Math.floor(secs || 0)));
    const m = Math.floor(clamped / 60);
    const s = Math.floor(clamped % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleCopyEndpoint = async () => {
    try {
      await navigator.clipboard.writeText("ws://localhost:8000/ws/telemetry");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleScenarioAction = (sc: ScenarioDef) => {
    if (activeScenario === sc.id) {
      baseMemory.resetScenario();
      setInjectedFeedback(null);
    } else {
      baseMemory.injectScenario(sc.id);
      setInjectedFeedback(sc.title);
      setTimeout(() => setInjectedFeedback(null), 3000);
    }
  };

  const currentScenarioObj = scenarioDefinitions.find((s) => s.id === activeScenario);

  return (
    <IonPage>
      {/* Unified Responsive Studio Top Bar */}
      <StudioTopBar
        title="Diagnostics"
        subtitle="Tactical Scenarios & Memory Bus"
      />

      <IonContent fullscreen className="ion-padding" style={{ ["--background" as string]: "#020617" }}>
        {/* ======================================================== */}
        {/* SHARED MAX-WIDTH CONTAINER (Pixel-Perfect Alignment)    */}
        {/* ======================================================== */}
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {/* ======================================================== */}
          {/* SCOREBUG SYNCHRONIZED HEADER STRIP                      */}
          {/* ======================================================== */}
          <div
            className="studio-scoreboard-header"
            style={{
              margin: 0,
              background: "#0b1222",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "12px",
              padding: "10px 16px",
            }}
          >
            <div className="studio-ribbon-row-teams">
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: 800, color: "#00e5ff", fontSize: "14px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#00e5ff", flexShrink: 0 }} />
                {score.homeTeam}
              </span>
              <span
                style={{
                  background: "#1e293b",
                  padding: "4px 12px",
                  borderRadius: "8px",
                  fontWeight: 900,
                  color: "#ffffff",
                  letterSpacing: "1.5px",
                  fontSize: "13px",
                  flexShrink: 0,
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                }}
              >
                {score.homeScore} - {score.awayScore}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: 800, color: "#f43f5e", fontSize: "14px" }}>
                {score.awayTeam}
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f43f5e", flexShrink: 0 }} />
              </span>
            </div>

            <div className="studio-ribbon-row-meta">
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(16, 185, 129, 0.12)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  color: "#34d399",
                  fontWeight: 700,
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "#10b981",
                    flexShrink: 0,
                  }}
                />
                Simulated 10Hz Feed
              </div>

              <span style={{ color: "rgba(255, 255, 255, 0.2)" }}>•</span>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "12px",
                  color: "#e2e8f0",
                  fontVariantNumeric: "tabular-nums",
                  fontWeight: 700,
                }}
              >
                <IonIcon icon={timeOutline} style={{ color: "#38bdf8", fontSize: "14px" }} />
                {formatTime(matchClock)}
              </div>

              <span style={{ color: "rgba(255, 255, 255, 0.2)" }}>•</span>

              <span
                style={{
                  background: "#1e293b",
                  border: "1px solid #334155",
                  color: "#e2e8f0",
                  fontSize: "10.5px",
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {score.period}
              </span>

              <IonBadge
                color={activeScenario ? "danger" : "success"}
                style={{
                  fontSize: "10.5px",
                  fontWeight: 700,
                  maxWidth: "180px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  padding: "4px 8px",
                  borderRadius: "6px",
                }}
              >
                {activeScenario ? currentScenarioObj?.title.toUpperCase() : "NORMAL FLOW"}
              </IonBadge>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SYNTHETIC SCENARIO INJECTOR PANEL                        */}
          {/* ======================================================== */}
          <div
            style={{
              background: "#0f172a",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "12px",
              padding: "16px 20px",
            }}
          >
            {/* Header: Title, Description, Active Reset */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: "10px",
                marginBottom: "16px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "16px", fontWeight: 800, color: "#f8fafc" }}>
                    Synthetic Scenario Injector
                  </span>
                  <span
                    style={{
                      background: "rgba(56, 189, 248, 0.12)",
                      color: "#38bdf8",
                      fontSize: "10.5px",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "4px",
                    }}
                  >
                    4 Scenarios
                  </span>
                </div>
                <div style={{ fontSize: "12.5px", color: "#94a3b8", marginTop: "4px" }}>
                  Select a tactical scenario to inject deterministic edge-case states into the live simulation.
                </div>
              </div>

              {activeScenario && (
                <button
                  onClick={() => baseMemory.resetScenario()}
                  style={{
                    background: "rgba(244, 63, 94, 0.12)",
                    color: "#f43f5e",
                    border: "1px solid rgba(244, 63, 94, 0.3)",
                    padding: "6px 14px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <IonIcon icon={refreshOutline} />
                  Restore Normal Flow
                </button>
              )}
            </div>

            {/* Active Simulation Override Alert (Quiet, High Impact) */}
            {activeScenario && currentScenarioObj && (
              <div
                style={{
                  background: "rgba(244, 63, 94, 0.08)",
                  border: "1px solid rgba(244, 63, 94, 0.25)",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  marginBottom: "16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "#f43f5e",
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: "13px", fontWeight: 800, color: "#f8fafc" }}>
                      Active Simulation Override: {currentScenarioObj.title}
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#cbd5e1", marginTop: "2px" }}>
                    {currentScenarioObj.desc}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                    Control: <strong style={{ color: "#38bdf8" }}>{control}%</strong> · Chaos: <strong style={{ color: "#f43f5e" }}>{chaos}%</strong>
                  </div>
                </div>
              </div>
            )}

            {/* 4 Scenario Cards Grid (Clean, Unboxed Hierarchy) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "12px",
              }}
            >
              {scenarioDefinitions.map((sc) => {
                const isActive = activeScenario === sc.id;
                const justInjected = injectedFeedback === sc.title;

                return (
                  <div
                    key={sc.id}
                    style={{
                      background: isActive ? "rgba(30, 41, 59, 0.6)" : "#0b1222",
                      border: `1px solid ${isActive ? "#38bdf8" : "rgba(255, 255, 255, 0.08)"}`,
                      borderRadius: "10px",
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "12px",
                      boxSizing: "border-box",
                    }}
                  >
                    <div>
                      {/* Title & Subtle Category Accent */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span
                            style={{
                              width: "7px",
                              height: "7px",
                              borderRadius: "50%",
                              background: sc.accentColor,
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ fontSize: "14px", fontWeight: 800, color: "#f8fafc" }}>
                            {sc.title}
                          </span>
                        </div>
                        <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                          {sc.category}
                        </span>
                      </div>

                      {/* Short Description */}
                      <p style={{ fontSize: "12px", color: "#cbd5e1", lineHeight: 1.45, margin: "0 0 10px 0" }}>
                        {sc.desc}
                      </p>

                      {/* Single Compact Metrics Row (No nested badges) */}
                      <div
                        style={{
                          fontSize: "11.5px",
                          color: "#94a3b8",
                          background: "rgba(255, 255, 255, 0.03)",
                          padding: "6px 10px",
                          borderRadius: "6px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <span>Control <strong style={{ color: "#38bdf8" }}>{sc.controlIdx}%</strong></span>
                        <span>·</span>
                        <span>Chaos <strong style={{ color: "#f43f5e" }}>{sc.chaosIdx}%</strong></span>
                        <span>·</span>
                        <span>PDR <strong style={{ color: "#f59e0b" }}>{sc.pdr}</strong></span>
                      </div>
                    </div>

                    {/* Action Button: Consistent, Short, Informative */}
                    <button
                      onClick={() => handleScenarioAction(sc)}
                      style={{
                        width: "100%",
                        background: isActive
                          ? "rgba(244, 63, 94, 0.15)"
                          : "rgba(56, 189, 248, 0.15)",
                        color: isActive ? "#f43f5e" : "#38bdf8",
                        border: `1px solid ${isActive ? "rgba(244, 63, 94, 0.3)" : "rgba(56, 189, 248, 0.3)"}`,
                        padding: "8px 12px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <IonIcon
                        icon={
                          justInjected
                            ? checkmarkOutline
                            : isActive
                            ? refreshOutline
                            : playOutline
                        }
                        style={{ fontSize: "14px" }}
                      />
                      <span>
                        {justInjected
                          ? "Injected ✓"
                          : isActive
                          ? "Restore flow"
                          : "Run scenario"}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ======================================================== */}
          {/* LOWER DIAGNOSTICS: TELEMETRY TRANSPORT & AGENT ROSTER    */}
          {/* ======================================================== */}
          <div className="studio-two-col-grid">
            {/* Panel 1: Telemetry Transport */}
            <IonCard mode="ios" style={{ background: "#0f172a", margin: 0, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <IonCardHeader style={{ paddingBottom: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <IonCardSubtitle style={{ color: "#38bdf8", fontWeight: 700, letterSpacing: "0.5px", margin: 0 }}>
                    TELEMETRY TRANSPORT
                  </IonCardSubtitle>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: serverStatus.isConnected ? "#10b981" : "#f59e0b",
                      }}
                    />
                    <span style={{ fontSize: "11px", fontWeight: 700, color: serverStatus.isConnected ? "#34d399" : "#fbbf24" }}>
                      {serverStatus.isConnected ? "Connected" : "Simulated Fallback"}
                    </span>
                  </div>
                </div>
                <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc", marginTop: "4px" }}>
                  FastAPI WebSocket Stream
                </IonCardTitle>
              </IonCardHeader>

              <IonCardContent>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {/* Endpoint Row with Copy Button */}
                  <div
                    style={{
                      background: "#0b1222",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: "1 1 auto" }}>
                      <div style={{ fontSize: "10.5px", color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>
                        Stream Endpoint
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#f8fafc",
                          fontFamily: "monospace",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          marginTop: "2px",
                        }}
                      >
                        ws://localhost:8000/ws/telemetry
                      </div>
                    </div>

                    <button
                      onClick={handleCopyEndpoint}
                      title="Copy WebSocket URL"
                      style={{
                        background: copied ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.06)",
                        border: `1px solid ${copied ? "rgba(16, 185, 129, 0.3)" : "rgba(255, 255, 255, 0.1)"}`,
                        color: copied ? "#34d399" : "#cbd5e1",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "11px",
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        flexShrink: 0,
                      }}
                    >
                      <IonIcon icon={copied ? checkmarkOutline : copyOutline} />
                      <span>{copied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>

                  {/* Aligned 2-Column Diagnostic Values */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div
                      style={{
                        background: "#0b1222",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                        padding: "10px 12px",
                        borderRadius: "8px",
                      }}
                    >
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>Effective Match Clock</div>
                      <div style={{ fontSize: "18px", fontWeight: 800, color: "#38bdf8", marginTop: "2px", fontVariantNumeric: "tabular-nums" }}>
                        {formatTime(matchClock)}
                      </div>
                      <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "2px" }}>
                        {matchClock.toFixed(1)}s elapsed
                      </div>
                    </div>

                    <div
                      style={{
                        background: "#0b1222",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                        padding: "10px 12px",
                        borderRadius: "8px",
                      }}
                    >
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>Stream Frame ID</div>
                      <div style={{ fontSize: "18px", fontWeight: 800, color: "#00e5ff", marginTop: "2px", fontVariantNumeric: "tabular-nums" }}>
                        #{frameId}
                      </div>
                      <div style={{ fontSize: "10.5px", color: "#10b981", marginTop: "2px" }}>
                        5Hz Stream (10Hz Engine)
                      </div>
                    </div>
                  </div>
                </div>
              </IonCardContent>
            </IonCard>

            {/* Panel 2: Agent Swarm Health Roster (Standardized Rows) */}
            <IonCard mode="ios" style={{ background: "#0f172a", margin: 0, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <IonCardHeader style={{ paddingBottom: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <IonCardSubtitle style={{ color: "#a855f7", fontWeight: 700, letterSpacing: "0.5px", margin: 0 }}>
                    AI AGENT SWARM
                  </IonCardSubtitle>
                  <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>
                    4 Agents Active
                  </span>
                </div>
                <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc", marginTop: "4px" }}>
                  Shared Blackboard State Engine
                </IonCardTitle>
              </IonCardHeader>

              <IonCardContent>
                {/* Flat Rows with Subtle Dividers */}
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {[
                    {
                      name: "Telemetry Ingestion Agent",
                      duty: "Spatial coordinate parsing & kinematic physics",
                      health: "Online",
                      secondary: "10Hz / 5Hz",
                    },
                    {
                      name: "Tactical Reasoning Agent",
                      duty: "Control vs. Chaos volatility & PDR decomposition",
                      health: "Online",
                      secondary: "Blackboard IPC",
                    },
                    {
                      name: "Broadcast Narrative Agent",
                      duty: "Tactical inflection explanation & commentary stream",
                      health: "Online",
                      secondary: "42ms Latency",
                    },
                    {
                      name: "Fan Personalization Agent",
                      duty: "4 Persona streams & 5-language localization",
                      health: "Online",
                      secondary: "4 Modes",
                    },
                  ].map((agent, idx) => (
                    <div
                      key={agent.name}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 0",
                        borderBottom: idx < 3 ? "1px solid rgba(255, 255, 255, 0.06)" : "none",
                        gap: "10px",
                      }}
                    >
                      <div style={{ minWidth: 0, flex: "1 1 auto" }}>
                        <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#f8fafc" }}>
                          {agent.name}
                        </div>
                        <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px" }}>
                          {agent.duty}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <span
                            style={{
                              width: "6px",
                              height: "6px",
                              borderRadius: "50%",
                              background: "#10b981",
                            }}
                          />
                          <span style={{ fontSize: "11px", fontWeight: 700, color: "#34d399" }}>
                            {agent.health}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: "11px",
                            color: "#64748b",
                            fontVariantNumeric: "tabular-nums",
                            minWidth: "75px",
                            textAlign: "right",
                          }}
                        >
                          {agent.secondary}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </IonCardContent>
            </IonCard>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default StudioControlPage;
