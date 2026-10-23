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
} from "ionicons/icons";
import { useBaseMemory, baseMemory } from "../store/baseMemory";
import { telemetryService } from "../services/telemetryService";

const TacticalPage: React.FC = () => {
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

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Derive PDR sub-factor metrics from live PDR
  const corridorCongestion = Math.min(95, Math.max(25, Math.round(pdr * 85 + 10)));
  const passerPressure = Math.min(92, Math.max(20, Math.round(pdr * 70 + 20)));
  const laneRestriction = Math.min(90, Math.max(30, Math.round((1 - pdr) * 60 + 35)));

  // Derive phase distribution from control/chaos index
  const buildUpPct = Math.round(25 + (control - 50) * 0.2);
  const progressionPct = Math.round(45 - Math.abs(control - 50) * 0.1);
  const finalThirdPct = 100 - buildUpPct - progressionPct;

  return (
    <IonPage>
      <IonHeader mode="ios">
        <IonToolbar mode="ios">
          <IonTitle>Tactical Intelligence</IonTitle>
          <IonButtons slot="end">
            <IonBadge color={serverStatus.isConnected ? "success" : "warning"}>
              {serverStatus.isConnected ? "Live 5Hz" : "Synthetic"}
            </IonBadge>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
        {/* iOS Broadcast Scoreboard Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#0f172a",
            padding: "10px 16px",
            borderRadius: "12px",
            marginBottom: "16px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontWeight: 800, color: "#00e5ff", fontSize: "15px" }}>
              {score.homeTeam}
            </span>
            <span
              style={{
                background: "#1e293b",
                padding: "3px 10px",
                borderRadius: "6px",
                fontWeight: 900,
                color: "#ffffff",
                letterSpacing: "1px",
                fontSize: "14px",
              }}
            >
              {score.homeScore} - {score.awayScore}
            </span>
            <span style={{ fontWeight: 800, color: "#f43f5e", fontSize: "15px" }}>
              {score.awayTeam}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <IonIcon
              icon={radioOutline}
              color="danger"
              style={{ animation: "pulse 1.5s infinite" }}
            />
            <span
              style={{
                fontFamily: "monospace",
                fontWeight: 700,
                fontSize: "14px",
                color: "#f8fafc",
              }}
            >
              {formatTime(matchClock)}
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
        </div>

        {/* 2-Column Responsive Tactical Studio Workspace */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
            gap: "16px",
            alignItems: "start",
          }}
        >
          {/* Left Column: Quantitative Tactical Engines */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* 1. Control vs. Chaos Index (CONTEXT.md & ADR 0001) */}
            <IonCard mode="ios" style={{ margin: "0", background: "#0f172a" }}>
              <IonCardHeader>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <IonCardSubtitle style={{ color: "#00e5ff", fontWeight: 800 }}>
                    <IonIcon icon={trendingUpOutline} style={{ marginRight: "4px" }} />
                    Control vs. Chaos Index
                  </IonCardSubtitle>
                  <span style={{ fontFamily: "monospace", fontWeight: 800, color: "#f8fafc", fontSize: "14px" }}>
                    {Math.round(control)}% / {Math.round(chaos)}%
                  </span>
                </div>
                <IonCardTitle style={{ fontSize: "17px", color: "#f8fafc", marginTop: "2px" }}>
                  Possession Volatility & Shape Stability
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                {/* Dual axis visualizer */}
                <div
                  style={{
                    width: "100%",
                    height: "12px",
                    borderRadius: "6px",
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
                      transition: "width 0.3s ease",
                    }}
                  />
                  <div
                    style={{
                      width: `${chaos}%`,
                      background: "linear-gradient(90deg, #f59e0b, #f43f5e)",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "11px",
                    color: "#94a3b8",
                    marginBottom: "12px",
                  }}
                >
                  <span style={{ color: "#38bdf8", fontWeight: 700 }}>
                    Structured Control ({Math.round(control)}%)
                  </span>
                  <span style={{ color: "#fb7185", fontWeight: 700 }}>
                    Transition Chaos ({Math.round(chaos)}%)
                  </span>
                </div>

                {/* Tactical Volatility State Chip */}
                <div
                  style={{
                    background: "#1e293b",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#cbd5e1",
                    lineHeight: "1.4",
                    borderLeft: `3px solid ${control > 55 ? "#00e5ff" : "#f43f5e"}`,
                  }}
                >
                  <strong style={{ color: "#f8fafc" }}>
                    {control > 55 ? "Positional Dominance" : "Transition Frenzy"}:{" "}
                  </strong>
                  {control > 55
                    ? "Manchester City are circulating patiently in the central corridor, pinning Arsenal into a low block."
                    : "Arsenal are disrupting build-up play and looking for vertical counter-attack channels behind the defensive line."}
                </div>
              </IonCardContent>
            </IonCard>

            {/* 2. Pass Difficulty Rating (PDR) Decomposition (CONTEXT.md Stage 2) */}
            <IonCard mode="ios" style={{ margin: "0", background: "#0f172a" }}>
              <IonCardHeader>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <IonCardSubtitle style={{ color: "#f59e0b", fontWeight: 800 }}>
                    <IonIcon icon={flameOutline} style={{ marginRight: "4px" }} />
                    Pass Difficulty Rating (PDR)
                  </IonCardSubtitle>
                  <span style={{ fontFamily: "monospace", fontWeight: 900, color: "#f59e0b", fontSize: "16px" }}>
                    {pdr.toFixed(2)}
                  </span>
                </div>
                <IonCardTitle style={{ fontSize: "17px", color: "#f8fafc", marginTop: "2px" }}>
                  Passing Corridor Congestion Engine
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <IonProgressBar
                  mode="ios"
                  value={Math.min(1.0, pdr)}
                  color={pdr > 0.6 ? "danger" : pdr > 0.35 ? "warning" : "success"}
                  style={{ height: "10px", borderRadius: "5px", marginBottom: "8px" }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "11px",
                    color: "#94a3b8",
                    marginBottom: "14px",
                  }}
                >
                  <span>Clean Passing Corridor</span>
                  <span>Extreme Defensive Pressure</span>
                </div>

                {/* Sub-factor Breakdown Meters */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                      <span style={{ color: "#cbd5e1" }}>Corridor Interceptor Density</span>
                      <strong style={{ color: "#f8fafc" }}>{corridorCongestion}%</strong>
                    </div>
                    <IonProgressBar mode="ios" value={corridorCongestion / 100} color="warning" style={{ height: "6px", borderRadius: "3px" }} />
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                      <span style={{ color: "#cbd5e1" }}>Passer Closing Pressure</span>
                      <strong style={{ color: "#f8fafc" }}>{passerPressure}%</strong>
                    </div>
                    <IonProgressBar mode="ios" value={passerPressure / 100} color="danger" style={{ height: "6px", borderRadius: "3px" }} />
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
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
                <IonCardSubtitle style={{ color: "#a855f7", fontWeight: 800 }}>
                  <IonIcon icon={analyticsOutline} style={{ marginRight: "4px" }} />
                  Phase of Play Breakdown
                </IonCardSubtitle>
                <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc", marginTop: "2px" }}>
                  Territorial Progression Distribution
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", textAlign: "center" }}>
                  <div style={{ background: "#1e293b", padding: "10px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase" }}>Build-Up</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#38bdf8", marginTop: "2px" }}>{buildUpPct}%</div>
                    <span style={{ fontSize: "9px", color: "#64748b" }}>First 35m</span>
                  </div>
                  <div style={{ background: "#1e293b", padding: "10px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase" }}>Progression</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#10b981", marginTop: "2px" }}>{progressionPct}%</div>
                    <span style={{ fontSize: "9px", color: "#64748b" }}>Central 35m</span>
                  </div>
                  <div style={{ background: "#1e293b", padding: "10px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase" }}>Final Third</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#f59e0b", marginTop: "2px" }}>{finalThirdPct}%</div>
                    <span style={{ fontSize: "9px", color: "#64748b" }}>Penalty Box</span>
                  </div>
                </div>
              </IonCardContent>
            </IonCard>
          </div>

          {/* Right Column: Qualitative Explainability & Inflection Feed */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* 4. Game Rhythm & Tactical Arc (CONTEXT.md Stage 3: Explain) */}
            <IonCard mode="ios" style={{ margin: "0", background: "#0f172a" }}>
              <IonCardHeader>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <IonCardSubtitle style={{ color: "#a855f7", fontWeight: 800 }}>
                    <IonIcon icon={pulseOutline} style={{ marginRight: "4px" }} />
                    Tactical Arc & Tempo
                  </IonCardSubtitle>
                  {activeInflection && (
                    <IonBadge color="danger" style={{ fontWeight: 800 }}>
                      Inflection Active
                    </IonBadge>
                  )}
                </div>
                <IonCardTitle style={{ fontSize: "18px", color: "#f8fafc", marginTop: "2px", textTransform: "capitalize" }}>
                  {rhythm.replace(/_/g, " ")}
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <p style={{ margin: 0, color: "#cbd5e1", fontSize: "13px", lineHeight: "1.5" }}>
                  {headline}
                </p>
              </IonCardContent>
            </IonCard>

            {/* 5. Tactical Inflection Points Timeline (CONTEXT.md Stage 3: Explain) */}
            <IonCard mode="ios" style={{ margin: "0", background: "#0f172a" }}>
              <IonCardHeader>
                <IonCardSubtitle style={{ color: "#10b981", fontWeight: 800 }}>
                  <IonIcon icon={flashOutline} style={{ marginRight: "4px" }} />
                  Tactical Inflection Points
                </IonCardSubtitle>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc", marginTop: "2px" }}>
                    Structural Mutations & Win-Probability Shifts
                  </IonCardTitle>
                  <span style={{ fontSize: "10px", color: "#94a3b8" }}>Click to seek clock</span>
                </div>
              </IonCardHeader>
              <IonCardContent style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {tacticalInflections.map((inflection) => {
                  const isActive = Math.abs(matchClock - inflection.timeSec) < 300;
                  return (
                    <div
                      key={inflection.time}
                      onClick={() => {
                        baseMemory.setMatchClock(inflection.timeSec);
                        telemetryService.sendCommand({ command: "seek", time: inflection.timeSec });
                      }}
                      style={{
                        backgroundColor: isActive ? "rgba(124, 58, 237, 0.2)" : "#1e293b",
                        borderRadius: "10px",
                        padding: "10px 12px",
                        border: isActive ? "1.5px solid #7c3aed" : "1px solid rgba(255, 255, 255, 0.08)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                      title="Seek match clock to this tactical inflection"
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 900, color: "#7c3aed", fontFamily: "monospace" }}>
                            {inflection.time}
                          </span>
                          <strong style={{ fontSize: "12px", color: "#f8fafc" }}>
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
                })}
              </IonCardContent>
            </IonCard>

            {/* 6. Multi-Agent Swarm Tactical Insights Feed (ADR 0002 & ADR 0006) */}
            <IonCard mode="ios" style={{ margin: "0", background: "#0f172a" }}>
              <IonCardHeader>
                <IonCardSubtitle style={{ color: "#00e5ff", fontWeight: 800 }}>
                  <IonIcon icon={gitNetworkOutline} style={{ marginRight: "4px" }} />
                  Swarm Intelligence Blackboard
                </IonCardSubtitle>
                <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc", marginTop: "2px" }}>
                  Autonomous Agent Swarm Commentary
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {swarmCommentary.slice(0, 3).map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "#1e293b",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "10px", fontWeight: 900, color: "#00e5ff", fontFamily: "monospace" }}>
                          {item.time}
                        </span>
                        <span style={{ fontSize: "11px", fontWeight: 800, color: "#f8fafc" }}>
                          {item.agent}
                        </span>
                      </div>
                      <span style={{ fontSize: "9px", color: "#94a3b8" }}>{item.role}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8", lineHeight: "1.4" }}>
                      {item.text}
                    </p>
                  </div>
                ))}
              </IonCardContent>
            </IonCard>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default TacticalPage;
