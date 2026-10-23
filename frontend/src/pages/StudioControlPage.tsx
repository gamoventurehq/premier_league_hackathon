import React from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCardContent,
  IonBadge,
  IonIcon,
  IonButton,
  IonProgressBar,
} from "@ionic/react";
import {
  serverOutline,
  timeOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  flashOutline,
  shieldCheckmarkOutline,
  flameOutline,
  refreshOutline,
  hardwareChipOutline,
  radioOutline,
  pulseOutline,
  gitNetworkOutline,
  speedometerOutline,
} from "ionicons/icons";
import { useBaseMemory, baseMemory } from "../store/baseMemory";

const scenarioDefinitions = [
  {
    id: "low_block_siege",
    title: "Sustained Low-Block Siege",
    category: "Possession Dominance",
    badgeColor: "secondary",
    controlIdx: 82,
    chaosIdx: 18,
    pdr: "0.68",
    rhythm: "Sustained Possession",
    icon: shieldCheckmarkOutline,
    desc: "Manchester City pin Arsenal into an 18m block depth. Central corridor squeezed to 21.2m with City holding 82% pitch control.",
    impact: "Tests spatial compression & half-space overload models.",
  },
  {
    id: "rapid_counter",
    title: "Rapid Counter-Transition",
    category: "Transition Frenzy",
    badgeColor: "danger",
    controlIdx: 26,
    chaosIdx: 74,
    pdr: "0.35",
    rhythm: "Transition Frenzy",
    icon: flashOutline,
    desc: "Arsenal lightning breakaway! Saka breaks past rest-defense in 3 touches with sprint velocity clocked at 33.2 km/h.",
    impact: "Tests line-breaking speed analytics & transition volatility.",
  },
  {
    id: "red_card_crisis",
    title: "Late Red Card Structural Crisis",
    category: "Numerical Asymmetry",
    badgeColor: "warning",
    controlIdx: 88,
    chaosIdx: 42,
    pdr: "0.76",
    rhythm: "Numerical Asymmetry",
    icon: alertCircleOutline,
    desc: "Away side down to 10 men. Arsenal forced into an emergency 5-3-1 bunker while City enjoy 2-man numerical flank overloads.",
    impact: "Tests structural deformation & pitch control reallocation.",
  },
  {
    id: "box_scramble",
    title: "Penalty Box Scramble",
    category: "Max Chaos Event",
    badgeColor: "tertiary",
    controlIdx: 15,
    chaosIdx: 85,
    pdr: "0.88",
    rhythm: "Penalty Box Chaos",
    icon: flameOutline,
    desc: "Total chaos! 6 players contesting rebound in 6-yard box with 0.82 xG goalmouth scramble and emergency sliding blocks.",
    impact: "Tests maximum entropy modeling & rapid turnover detection.",
  },
];

const StudioControlPage: React.FC = () => {
  const serverStatus = useBaseMemory((s) => s.serverStatus);
  const matchClock = useBaseMemory((s) => s.matchClock);
  const frameId = useBaseMemory((s) => s.blackboard.latest_frame_id);
  const persona = useBaseMemory((s) => s.selectedPersona);
  const language = useBaseMemory((s) => s.selectedLanguage);
  const score = useBaseMemory((s) => s.score);
  const activeScenario = useBaseMemory((s) => s.activeScenario);
  const control = useBaseMemory((s) => s.blackboard.control_index);
  const chaos = useBaseMemory((s) => s.blackboard.chaos_index);
  const rhythm = useBaseMemory((s) => s.blackboard.current_game_rhythm);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const currentScenarioObj = scenarioDefinitions.find((s) => s.id === activeScenario);

  return (
    <IonPage>
      <IonHeader mode="ios">
        <IonToolbar mode="ios">
          <IonTitle>Gamoventure Studio Diagnostics</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding" style={{ ["--background" as string]: "#020617" }}>
        {/* Scorebug Synchronized Header Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#0f172a",
            padding: "10px 16px",
            borderRadius: "12px",
            border: "1px solid #1e293b",
            marginBottom: "16px",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "15px", fontWeight: 700, color: "#00e5ff" }}>
              {score.homeTeam} {score.homeScore}
            </span>
            <span style={{ fontSize: "14px", color: "#64748b", fontWeight: 700 }}>—</span>
            <span style={{ fontSize: "15px", fontWeight: 700, color: "#f43f5e" }}>
              {score.awayScore} {score.awayTeam}
            </span>
            <span
              style={{
                background: "#1e293b",
                border: "1px solid #334155",
                color: "#e2e8f0",
                fontSize: "10px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              {score.period}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "#052e16",
                border: "1px solid #16a34a",
                padding: "3px 8px",
                borderRadius: "6px",
                fontSize: "11px",
                color: "#4ade80",
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#22c55e",
                  boxShadow: "0 0 6px #22c55e",
                }}
              />
              [5Hz Live Core Memory]
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                color: "#e2e8f0",
                fontVariantNumeric: "tabular-nums",
                fontWeight: 700,
              }}
            >
              <IonIcon icon={timeOutline} style={{ color: "#38bdf8" }} />
              {formatTime(matchClock)}
            </div>

            <IonBadge color={activeScenario ? "danger" : "success"} style={{ fontSize: "11px", fontWeight: 700 }}>
              {activeScenario ? `[INJECTED: ${currentScenarioObj?.title.toUpperCase()}]` : "[SCENARIO: NORMAL MATCH FLOW]"}
            </IonBadge>
          </div>
        </div>

        {/* ======================================================== */}
        {/* INTERACTIVE SYNTHETIC SCENARIO INJECTOR (CHALLENGE §4.D) */}
        {/* ======================================================== */}
        <IonCard mode="ios" style={{ background: "#0f172a", marginBottom: "16px", border: "1px solid #1e293b" }}>
          <IonCardHeader style={{ paddingBottom: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
              <div>
                <IonCardSubtitle style={{ color: "#38bdf8", fontWeight: 700, letterSpacing: "0.5px" }}>
                  SYNTHETIC MATCH SCENARIO INJECTOR (CHALLENGE.MD §4.D)
                </IonCardSubtitle>
                <IonCardTitle style={{ fontSize: "18px", color: "#f8fafc", marginTop: "2px" }}>
                  Edge-Case Tactical State Simulator
                </IonCardTitle>
              </div>

              {activeScenario && (
                <button
                  onClick={() => baseMemory.resetScenario()}
                  style={{
                    background: "#1e293b",
                    color: "#f8fafc",
                    border: "1px solid #334155",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.2s ease",
                  }}
                >
                  <IonIcon icon={refreshOutline} />
                  Reset to Normal Match Flow
                </button>
              )}
            </div>
          </IonCardHeader>

          <IonCardContent>
            {/* Active Scenario Alert Banner */}
            {activeScenario && currentScenarioObj && (
              <div
                style={{
                  background: "rgba(244, 63, 94, 0.12)",
                  border: "1px solid rgba(244, 63, 94, 0.4)",
                  padding: "12px 16px",
                  borderRadius: "8px",
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
                        boxShadow: "0 0 8px #f43f5e",
                        animation: "pulse 1s infinite",
                      }}
                    />
                    <span style={{ fontSize: "13px", fontWeight: 800, color: "#f43f5e" }}>
                      ACTIVE SIMULATION OVERRIDE: {currentScenarioObj.title.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#cbd5e1", marginTop: "4px" }}>
                    {currentScenarioObj.desc}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ textAlign: "right", fontSize: "11px", color: "#94a3b8" }}>
                    <div>Control Index: <strong style={{ color: "#00e5ff" }}>{control}%</strong></div>
                    <div>Chaos Index: <strong style={{ color: "#f43f5e" }}>{chaos}%</strong></div>
                  </div>
                  <button
                    onClick={() => baseMemory.resetScenario()}
                    style={{
                      background: "#f43f5e",
                      color: "#ffffff",
                      border: "none",
                      padding: "6px 14px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Restore Normal Flow
                  </button>
                </div>
              </div>
            )}

            {/* 4 Scenario Injection Cards Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "12px",
              }}
            >
              {scenarioDefinitions.map((sc) => {
                const isActive = activeScenario === sc.id;
                return (
                  <div
                    key={sc.id}
                    style={{
                      background: isActive ? "#1e293b" : "#020617",
                      border: `1px solid ${isActive ? "#38bdf8" : "#1e293b"}`,
                      borderRadius: "10px",
                      padding: "14px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      transition: "all 0.2s ease",
                      boxShadow: isActive ? "0 0 15px rgba(56, 189, 248, 0.15)" : "none",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <IonIcon icon={sc.icon} style={{ color: "#38bdf8", fontSize: "18px" }} />
                          <span style={{ fontSize: "14px", fontWeight: 800, color: "#f8fafc" }}>
                            {sc.title}
                          </span>
                        </div>
                        <IonBadge color={sc.badgeColor as any} style={{ fontSize: "10px" }}>
                          {sc.category}
                        </IonBadge>
                      </div>

                      <p style={{ fontSize: "12px", color: "#cbd5e1", lineHeight: 1.4, margin: "0 0 10px 0" }}>
                        {sc.desc}
                      </p>

                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
                        <span style={{ background: "#0f172a", border: "1px solid #334155", color: "#00e5ff", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: 700 }}>
                          Control: {sc.controlIdx}%
                        </span>
                        <span style={{ background: "#0f172a", border: "1px solid #334155", color: "#f43f5e", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: 700 }}>
                          Chaos: {sc.chaosIdx}%
                        </span>
                        <span style={{ background: "#0f172a", border: "1px solid #334155", color: "#f59e0b", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: 700 }}>
                          PDR: {sc.pdr}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (isActive) {
                          baseMemory.resetScenario();
                        } else {
                          baseMemory.injectScenario(sc.id);
                        }
                      }}
                      style={{
                        width: "100%",
                        background: isActive ? "#ef4444" : "#38bdf8",
                        color: isActive ? "#ffffff" : "#020617",
                        border: "none",
                        padding: "8px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 800,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <IonIcon icon={isActive ? refreshOutline : flashOutline} />
                      {isActive ? "Reset Scenario" : `Inject ${sc.title}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </IonCardContent>
        </IonCard>

        {/* ======================================================== */}
        {/* TELEMETRY TRANSPORT & CORE MEMORY MONITOR                */}
        {/* ======================================================== */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "16px", marginBottom: "16px" }}>
          {/* Local Server Connection Status */}
          <IonCard mode="ios" style={{ background: "#0f172a", margin: 0, border: "1px solid #1e293b" }}>
            <IonCardHeader style={{ paddingBottom: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <IonCardSubtitle style={{ color: "#38bdf8", fontWeight: 700 }}>
                  <IonIcon icon={serverOutline} style={{ marginRight: "4px", verticalAlign: "middle" }} />
                  LOCAL TELEMETRY TRANSPORT
                </IonCardSubtitle>
                <IonBadge color={serverStatus.isConnected ? "success" : "warning"}>
                  {serverStatus.isConnected ? "Connected" : "Simulated Fallback"}
                </IonBadge>
              </div>
              <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc" }}>
                FastAPI WebSocket Stream (5Hz)
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ background: "#1e293b", padding: "10px 12px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>WebSocket Endpoint</div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#f8fafc", fontFamily: "monospace" }}>
                      ws://localhost:8000/ws/telemetry
                    </div>
                  </div>
                  <IonBadge color="success">Bidirectional</IonBadge>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div style={{ background: "#1e293b", padding: "10px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>Effective Match Clock</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#38bdf8", marginTop: "2px" }}>
                      {formatTime(matchClock)}
                    </div>
                    <div style={{ fontSize: "10px", color: "#64748b" }}>
                      {matchClock.toFixed(1)}s elapsed
                    </div>
                  </div>

                  <div style={{ background: "#1e293b", padding: "10px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>Telemetry Frame ID</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#00e5ff", marginTop: "2px" }}>
                      #{frameId}
                    </div>
                    <div style={{ fontSize: "10px", color: "#10b981" }}>
                      Streaming at 5Hz
                    </div>
                  </div>
                </div>
              </div>
            </IonCardContent>
          </IonCard>

          {/* Gamoventure Swarm Intelligence Agents Topology */}
          <IonCard mode="ios" style={{ background: "#0f172a", margin: 0, border: "1px solid #1e293b" }}>
            <IonCardHeader style={{ paddingBottom: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <IonCardSubtitle style={{ color: "#a855f7", fontWeight: 700 }}>
                  <IonIcon icon={gitNetworkOutline} style={{ marginRight: "4px", verticalAlign: "middle" }} />
                  GAMOVENTURE AI AGENT SWARM
                </IonCardSubtitle>
                <IonBadge color="primary">4 Agents Active</IonBadge>
              </div>
              <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc" }}>
                Shared Blackboard State Engine
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ background: "#1e293b", padding: "8px 12px", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#f8fafc" }}>Telemetry Ingestion Agent</div>
                    <div style={{ fontSize: "10px", color: "#94a3b8" }}>Spatial coordinate parsing &amp; 5Hz drift physics</div>
                  </div>
                  <IonBadge color="success">[Online • 5Hz]</IonBadge>
                </div>

                <div style={{ background: "#1e293b", padding: "8px 12px", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#f8fafc" }}>Tactical Reasoning Agent</div>
                    <div style={{ fontSize: "10px", color: "#94a3b8" }}>Control vs. Chaos volatility &amp; PDR decomposition</div>
                  </div>
                  <IonBadge color="secondary">[Active • Blackboard]</IonBadge>
                </div>

                <div style={{ background: "#1e293b", padding: "8px 12px", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#f8fafc" }}>Broadcast Narrative Agent</div>
                    <div style={{ fontSize: "10px", color: "#94a3b8" }}>Tactical inflection explanation &amp; commentary feed</div>
                  </div>
                  <IonBadge color="tertiary">[Active • 42ms]</IonBadge>
                </div>

                <div style={{ background: "#1e293b", padding: "8px 12px", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#f8fafc" }}>Fan Personalization Agent</div>
                    <div style={{ fontSize: "10px", color: "#94a3b8" }}>4 Persona streams &amp; 5-language localization</div>
                  </div>
                  <IonBadge color="primary">[Active • 4 Modes]</IonBadge>
                </div>
              </div>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default StudioControlPage;
