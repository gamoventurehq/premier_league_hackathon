import React, { useState } from "react";
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
  IonProgressBar,
  IonBadge,
  IonIcon,
  IonButtons,
} from "@ionic/react";
import {
  flameOutline,
  pulseOutline,
  trendingUpOutline,
  radioOutline,
  gitNetworkOutline,
  speedometerOutline,
  flashOutline,
  timeOutline,
  shieldOutline,
  analyticsOutline,
  layersOutline,
} from "ionicons/icons";
import { useBaseMemory, baseMemory } from "../store/baseMemory";
import { telemetryService } from "../services/telemetryService";
import { JudgeQuickTourPill } from "../components/JudgeQuickTourPill";
import { StudioTopBar } from "../components/StudioTopBar";

const TacticalPage: React.FC = () => {
  const [mobileTab, setMobileTab] = useState<"indices" | "intel" | "all">("indices");
  // Reading from the Single Base Memory Store
  const score = useBaseMemory((s) => s.score);
  const matchClock = useBaseMemory((s) => s.matchClock);
  const serverStatus = useBaseMemory((s) => s.serverStatus);
  const control = useBaseMemory((s) => s.blackboard.control_index);
  const chaos = useBaseMemory((s) => s.blackboard.chaos_index);
  const pdr = useBaseMemory((s) => s.blackboard.latest_pdr);
  const rhythm = useBaseMemory((s) => s.blackboard.current_game_rhythm);
  const activeInflection = useBaseMemory(
    (s) => s.blackboard.active_tactical_inflection
  );
  const headline = useBaseMemory((s) => s.blackboard.narrative_headline);
  const tacticalInflections = useBaseMemory((s) => s.tacticalInflections);
  const swarmCommentary = useBaseMemory((s) => s.swarmCommentary);

  // Synchronize events strictly to current match clock (prevents future events appearing)
  const filteredInflections = tacticalInflections.filter((inf) => (inf.timeSec || 0) <= matchClock);
  const filteredCommentary = swarmCommentary.filter((item) => (item.timeSec || 0) <= matchClock);

  const formatTime = (secs: number) => {
    const clamped = Math.min(5400, Math.max(0, Math.floor(secs || 0)));
    const m = Math.floor(clamped / 60);
    const s = Math.floor(clamped % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // PDR (0.00 to 1.00 normalized scale) semantic interpretation
  const pdrLevel = pdr > 0.65 ? "High Difficulty" : pdr > 0.38 ? "Moderate Pressure" : "Low Difficulty (Clean)";
  const pdrColor = pdr > 0.65 ? "#f43f5e" : pdr > 0.38 ? "#f59e0b" : "#10b981";
  const pdrTakeaway = pdr > 0.65
    ? "Arsenal defensive trap is compressing the central passing corridor, forcing long or contested release balls."
    : pdr > 0.38
    ? "Man City are circulating patiently through the half-spaces despite moderate congestion in the central channel."
    : "Uncontested circulation: passing corridors into the final third remain open with minimal pressing resistance.";

  // Derive PDR sub-factor metrics aligned with live PDR
  const corridorCongestion = Math.min(95, Math.max(25, Math.round(pdr * 85 + 10)));
  const passerPressure = Math.min(92, Math.max(20, Math.round(pdr * 70 + 20)));
  const laneRestriction = Math.min(90, Math.max(30, Math.round((1 - pdr) * 60 + 35)));

  // Territorial progression distribution across pitch thirds
  const buildUpPct = Math.round(25 + (control - 50) * 0.2);
  const progressionPct = Math.round(45 - Math.abs(control - 50) * 0.1);
  const finalThirdPct = 100 - buildUpPct - progressionPct;

  return (
    <IonPage>
      {/* Unified Responsive Studio Top Bar */}
      <StudioTopBar
        title="Tactical Intelligence"
        subtitle="Blackboard PDR & Inflection Swarm"
      />

      <IonContent fullscreen className="ion-padding">
        {/* iOS Broadcast Scoreboard Header */}
        <div className="studio-scoreboard-header" style={{ marginBottom: "16px" }}>
          <div className="studio-ribbon-row-teams">
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: 800, color: "#00e5ff", fontSize: "14px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#00e5ff", boxShadow: "0 0 8px #00e5ff", flexShrink: 0 }} />
              {score.homeTeam}
            </span>
            <span
              style={{
                background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
                padding: "3px 10px",
                borderRadius: "8px",
                fontWeight: 900,
                color: "#ffffff",
                letterSpacing: "1.5px",
                fontSize: "13px",
                flexShrink: 0,
                border: "1px solid rgba(255, 255, 255, 0.12)",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.4)",
              }}
            >
              {score.homeScore} - {score.awayScore}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: 800, color: "#f43f5e", fontSize: "14px" }}>
              {score.awayTeam}
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f43f5e", boxShadow: "0 0 8px #f43f5e", flexShrink: 0 }} />
            </span>
          </div>

          <div className="studio-ribbon-row-meta">
            <div style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
              <IonIcon
                icon={radioOutline}
                color="danger"
                style={{ animation: "pulse 1.5s infinite", fontSize: "13px" }}
              />
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#f43f5e", letterSpacing: "0.5px" }}>
                LIVE MATCH SIMULATION
              </span>
            </div>
            <span style={{ color: "rgba(255, 255, 255, 0.2)" }}>•</span>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <IonIcon icon={timeOutline} style={{ color: "#38bdf8", fontSize: "13px" }} />
              <span
                style={{
                  fontFamily: "monospace",
                  fontWeight: 700,
                  fontSize: "13px",
                  color: "#f8fafc",
                }}
              >
                {formatTime(matchClock)}
              </span>
            </div>
            <span style={{ color: "rgba(255, 255, 255, 0.2)" }}>•</span>
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
        </div>

        {/* Mobile View Switcher */}
        <div className="ion-hide-md-up" style={{ marginBottom: "12px" }}>
          <div
            style={{
              display: "flex",
              backgroundColor: "rgba(15, 23, 42, 0.95)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "10px",
              padding: "3px",
              gap: "4px",
              boxShadow: "inset 0 1px 3px rgba(0,0,0,0.5)",
            }}
          >
            {[
              { id: "indices", label: "Indices", icon: analyticsOutline },
              { id: "intel", label: "Intel", icon: flashOutline },
              { id: "all", label: "All", icon: layersOutline },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMobileTab(tab.id as any)}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  padding: "7px 2px",
                  borderRadius: "8px",
                  border: mobileTab === tab.id ? "1px solid rgba(0, 229, 255, 0.6)" : "1px solid transparent",
                  backgroundColor: mobileTab === tab.id ? "rgba(0, 229, 255, 0.25)" : "transparent",
                  color: mobileTab === tab.id ? "#ffffff" : "var(--studio-subtext)",
                  boxShadow: mobileTab === tab.id ? "0 2px 10px rgba(0, 229, 255, 0.35)" : "none",
                  fontSize: "10.5px",
                  fontWeight: mobileTab === tab.id ? 800 : 600,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <IonIcon icon={tab.icon} style={{ fontSize: "12px", color: mobileTab === tab.id ? "#00e5ff" : "var(--studio-subtext)" }} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 2-Column Responsive Tactical Studio Workspace */}
        <div
          className="studio-two-col-grid"
          style={{
            alignItems: "start",
          }}
        >
          {/* Left Column: Quantitative Tactical Engines */}
          <div
            className={`studio-col-left ${mobileTab !== "all" && mobileTab !== "indices" ? "ion-hide-md-down" : ""}`}
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {/* 1. Control vs. Chaos Index (CONTEXT.md & ADR 0001) */}
            <IonCard mode="ios" style={{ margin: "0", background: "#0f172a" }}>
              <IonCardHeader>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                  <IonCardSubtitle style={{ color: "#00e5ff", fontWeight: 800, margin: 0 }}>
                    <IonIcon icon={trendingUpOutline} style={{ marginRight: "4px" }} />
                    Control vs. Chaos Index (Rolling 5-min)
                  </IonCardSubtitle>
                  <span style={{ fontFamily: "monospace", fontWeight: 800, color: "#f8fafc", fontSize: "13px", flexShrink: 0 }}>
                    {Math.round(control)}% Control • {Math.round(chaos)}% Chaos
                  </span>
                </div>
                <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc", marginTop: "2px" }}>
                  {control > 55 ? "Territorial Dominance: Man City Sustained Possession" : "High Volatility: Rapid Transition Phase"}
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                {/* Dual axis visualizer */}
                <div
                  style={{
                    width: "100%",
                    height: "10px",
                    borderRadius: "5px",
                    display: "flex",
                    overflow: "hidden",
                    background: "#020617",
                    marginBottom: "8px",
                  }}
                >
                  <div
                    style={{
                      width: `${control}%`,
                      background: "linear-gradient(90deg, #00e5ff, #3b82f6)",
                    }}
                  />
                  <div
                    style={{
                      width: `${chaos}%`,
                      background: "linear-gradient(90deg, #f59e0b, #f43f5e)",
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "4px 8px",
                    fontSize: "11px",
                    color: "#94a3b8",
                    marginBottom: "12px",
                  }}
                >
                  <span style={{ color: "#38bdf8", fontWeight: 700 }}>
                    Man City Control ({Math.round(control)}%)
                  </span>
                  <span style={{ color: "#fb7185", fontWeight: 700 }}>
                    Arsenal Transition ({Math.round(chaos)}%)
                  </span>
                </div>

                {/* Tactical Volatility State Box with clean status pill (No side-tab slop) */}
                <div
                  style={{
                    background: "#1e293b",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#cbd5e1",
                    lineHeight: "1.4",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: control > 55 ? "#00e5ff" : "#f43f5e" }} />
                    <strong style={{ color: "#f8fafc" }}>
                      {control > 55 ? "Positional Dominance" : "Transition Frenzy"}
                    </strong>
                  </div>
                  <p style={{ margin: 0 }}>
                    {control > 55
                      ? "Manchester City are circulating patiently in the central corridor, pinning Arsenal into a low block."
                      : "Arsenal are disrupting build-up play and looking for vertical counter-attack channels behind the defensive line."}
                  </p>
                </div>
              </IonCardContent>
            </IonCard>

            {/* 2. Pass Difficulty Rating (PDR) Decomposition (CONTEXT.md Stage 2) */}
            <IonCard mode="ios" style={{ margin: "0", background: "#0f172a" }}>
              <IonCardHeader>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                  <IonCardSubtitle style={{ color: "#f59e0b", fontWeight: 800, margin: 0 }}>
                    <IonIcon icon={flameOutline} style={{ marginRight: "4px" }} />
                    Pass Difficulty Rating (Scale: 0.00 to 1.00)
                  </IonCardSubtitle>
                  <span style={{ fontFamily: "monospace", fontWeight: 900, color: pdrColor, fontSize: "15px", flexShrink: 0 }}>
                    {pdr.toFixed(2)} • {pdrLevel}
                  </span>
                </div>
                <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc", marginTop: "2px" }}>
                  Passing Corridor Pressure & Congestion
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonProgressBar
                  mode="ios"
                  value={Math.min(1.0, pdr)}
                  color={pdr > 0.6 ? "danger" : pdr > 0.38 ? "warning" : "success"}
                  style={{ height: "8px", borderRadius: "4px", marginBottom: "6px" }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "4px 8px",
                    fontSize: "10.5px",
                    color: "#94a3b8",
                    marginBottom: "10px",
                  }}
                >
                  <span>Scale 0.00 (Uncontested)</span>
                  <span>Scale 1.00 (Extreme Pressure)</span>
                </div>

                {/* Clear Tactical Takeaway Callout */}
                <div
                  style={{
                    background: "#1e293b",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    color: "#cbd5e1",
                    lineHeight: "1.4",
                    marginBottom: "12px",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                  }}
                >
                  <strong style={{ color: pdrColor }}>Takeaway: </strong>
                  {pdrTakeaway}
                </div>

                {/* Sub-factor Breakdown Meters */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "3px" }}>
                      <span style={{ color: "#cbd5e1" }}>Corridor Interceptor Density</span>
                      <strong style={{ color: "#f8fafc" }}>{corridorCongestion}%</strong>
                    </div>
                    <IonProgressBar mode="ios" value={corridorCongestion / 100} color="warning" style={{ height: "6px", borderRadius: "3px" }} />
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "3px" }}>
                      <span style={{ color: "#cbd5e1" }}>Passer Closing Pressure</span>
                      <strong style={{ color: "#f8fafc" }}>{passerPressure}%</strong>
                    </div>
                    <IonProgressBar mode="ios" value={passerPressure / 100} color="danger" style={{ height: "6px", borderRadius: "3px" }} />
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "3px" }}>
                      <span style={{ color: "#cbd5e1" }}>Passing Window Restriction</span>
                      <strong style={{ color: "#f8fafc" }}>{laneRestriction}%</strong>
                    </div>
                    <IonProgressBar mode="ios" value={laneRestriction / 100} color="primary" style={{ height: "6px", borderRadius: "3px" }} />
                  </div>
                </div>
              </IonCardContent>
            </IonCard>

            {/* 3. Positional Phase Distribution (CHALLENGE.md Stage 2) */}
            <IonCard mode="ios" style={{ margin: "0", background: "#0f172a" }}>
              <IonCardHeader>
                <IonCardSubtitle style={{ color: "#38bdf8", fontWeight: 800 }}>
                  <IonIcon icon={analyticsOutline} style={{ marginRight: "4px" }} />
                  Pitch Space Allocation
                </IonCardSubtitle>
                <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc", marginTop: "2px" }}>
                  Spatial Progression: Positional Thirds
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))", gap: "6px", textAlign: "center" }}>
                  <div style={{ background: "#1e293b", padding: "8px 4px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                    <div style={{ fontSize: "9px", color: "#94a3b8", textTransform: "uppercase" }}>Defensive Third</div>
                    <div style={{ fontSize: "15px", fontWeight: 800, color: "#38bdf8", marginTop: "2px" }}>{buildUpPct}%</div>
                    <span style={{ fontSize: "8px", color: "#64748b" }}>0 - 35m</span>
                  </div>
                  <div style={{ background: "#1e293b", padding: "8px 4px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                    <div style={{ fontSize: "9px", color: "#94a3b8", textTransform: "uppercase" }}>Middle Third</div>
                    <div style={{ fontSize: "15px", fontWeight: 800, color: "#10b981", marginTop: "2px" }}>{progressionPct}%</div>
                    <span style={{ fontSize: "8px", color: "#64748b" }}>35 - 70m</span>
                  </div>
                  <div style={{ background: "#1e293b", padding: "8px 4px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                    <div style={{ fontSize: "9px", color: "#94a3b8", textTransform: "uppercase" }}>Attacking Third</div>
                    <div style={{ fontSize: "15px", fontWeight: 800, color: "#f59e0b", marginTop: "2px" }}>{finalThirdPct}%</div>
                    <span style={{ fontSize: "8px", color: "#64748b" }}>70 - 105m</span>
                  </div>
                </div>
              </IonCardContent>
            </IonCard>
          </div>

          {/* Right Column: Qualitative Explainability & Inflection Feed */}
          <div
            className={`studio-col-right ${mobileTab !== "all" && mobileTab !== "intel" ? "ion-hide-md-down" : ""}`}
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {/* 4. Game Rhythm & Tactical Arc (CONTEXT.md Stage 3: Explain) */}
            <IonCard mode="ios" style={{ margin: "0", background: "#0f172a" }}>
              <IonCardHeader>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                  <IonCardSubtitle style={{ color: "#38bdf8", fontWeight: 800, margin: 0 }}>
                    <IonIcon icon={pulseOutline} style={{ marginRight: "4px" }} />
                    Tactical Phase & Tempo
                  </IonCardSubtitle>
                  {activeInflection && (
                    <IonBadge color="danger" style={{ fontWeight: 800, flexShrink: 0 }}>
                      Inflection Active
                    </IonBadge>
                  )}
                </div>
                <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc", marginTop: "2px", textTransform: "capitalize" }}>
                  Phase: {rhythm.replace(/_/g, " ")}
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <p style={{ margin: 0, color: "#cbd5e1", fontSize: "13px", lineHeight: "1.5" }}>
                  {headline}
                </p>
              </IonCardContent>
            </IonCard>

            {/* 5. Tactical Inflection Points Timeline (Synchronized to Match Clock) */}
            <IonCard mode="ios" style={{ margin: "0", background: "#0f172a" }}>
              <IonCardHeader>
                <IonCardSubtitle style={{ color: "#10b981", fontWeight: 800 }}>
                  <IonIcon icon={flashOutline} style={{ marginRight: "4px" }} />
                  Tactical Inflections Timeline
                </IonCardSubtitle>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "4px" }}>
                  <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc", marginTop: "2px" }}>
                    Tactical Mutations (Up to {formatTime(matchClock)})
                  </IonCardTitle>
                  <span style={{ fontSize: "10px", color: "#94a3b8", flexShrink: 0 }}>Click to seek clock</span>
                </div>
              </IonCardHeader>
              <IonCardContent style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {filteredInflections.length === 0 ? (
                  <div
                    style={{
                      background: "#1e293b",
                      padding: "14px 16px",
                      borderRadius: "8px",
                      textAlign: "center",
                      color: "#94a3b8",
                      fontSize: "12px",
                      border: "1px dashed rgba(255, 255, 255, 0.1)",
                    }}
                  >
                    Early match phase ({formatTime(matchClock)}) — Swarm telemetry observing tactical shape mutations.
                  </div>
                ) : (
                  filteredInflections.map((inflection) => {
                    const isActive = Math.abs(matchClock - inflection.timeSec) < 300;
                    return (
                      <div
                        key={inflection.time}
                        onClick={() => {
                          baseMemory.setMatchClock(inflection.timeSec);
                          telemetryService.sendCommand({ command: "seek", time: inflection.timeSec });
                        }}
                        style={{
                          backgroundColor: isActive ? "rgba(56, 189, 248, 0.15)" : "#1e293b",
                          borderRadius: "10px",
                          padding: "10px 12px",
                          border: isActive ? "1.5px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.08)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        title="Seek match clock to this tactical inflection"
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: "1 1 180px" }}>
                            <span style={{ fontSize: "11px", fontWeight: 900, color: "#38bdf8", fontFamily: "monospace", flexShrink: 0 }}>
                              {inflection.time}
                            </span>
                            <strong style={{ fontSize: "12px", color: "#f8fafc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {inflection.title}
                            </strong>
                          </div>
                          <span
                            style={{
                              fontSize: "9px",
                              fontWeight: 800,
                              color: "#10b981",
                              backgroundColor: "rgba(16, 185, 129, 0.15)",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              flexShrink: 0,
                            }}
                          >
                            {inflection.impact}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8", lineHeight: "1.4" }}>
                          {inflection.detail}
                        </p>
                      </div>
                    );
                  })
                )}
              </IonCardContent>
            </IonCard>

            {/* 6. Multi-Agent Swarm Tactical Insights Feed (ADR 0002 & ADR 0006) */}
            <IonCard mode="ios" style={{ margin: "0", background: "#0f172a" }}>
              <IonCardHeader>
                <IonCardSubtitle style={{ color: "#00e5ff", fontWeight: 800 }}>
                  <IonIcon icon={gitNetworkOutline} style={{ marginRight: "4px" }} />
                  Autonomous Agent Swarm
                </IonCardSubtitle>
                <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc", marginTop: "2px" }}>
                  Swarm Intelligence Commentary (Up to {formatTime(matchClock)})
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {filteredCommentary.length === 0 ? (
                  <div
                    style={{
                      background: "#1e293b",
                      padding: "14px 16px",
                      borderRadius: "8px",
                      textAlign: "center",
                      color: "#94a3b8",
                      fontSize: "12px",
                      border: "1px dashed rgba(255, 255, 255, 0.1)",
                    }}
                  >
                    Agent Swarm observing opening match structures ({formatTime(matchClock)}).
                  </div>
                ) : (
                  filteredCommentary.slice(0, 4).map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: "#1e293b",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                      }}
                    >
                      {/* Lead with the insight text as the hero element */}
                      <p style={{ margin: 0, fontSize: "12px", color: "#f8fafc", lineHeight: "1.4", fontWeight: 600 }}>
                        {item.text}
                      </p>
                      {/* Subtle agent source and timestamp metadata */}
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>
                        <span style={{ fontWeight: 800, color: "#00e5ff", fontFamily: "monospace" }}>
                          {item.time}
                        </span>
                        <span>•</span>
                        <span style={{ color: "#cbd5e1" }}>{item.agent}</span>
                        <span>({item.role})</span>
                      </div>
                    </div>
                  ))
                )}
              </IonCardContent>
            </IonCard>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default TacticalPage;
