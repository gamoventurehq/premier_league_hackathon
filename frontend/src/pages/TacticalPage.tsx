import React, { useState } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardHeader,
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
  gitNetworkOutline,
  flashOutline,
  analyticsOutline,
  layersOutline,
} from "ionicons/icons";
import { useBaseMemory, baseMemory, sanitizeText } from "../store/baseMemory";
import { SupportedLanguage } from "../types/telemetry";

const GAME_RHYTHM_LOCALIZATIONS: Record<string, Record<SupportedLanguage, string>> = {
  structured_possession: {
    en: "Structured Possession",
    es: "Posesión Estructurada",
    fr: "Possession Structurée",
    ja: "構造化されたポゼッション",
    ar: "استحواذ منظم",
  },
  counter_attacking_transition: {
    en: "Counter-Attacking Transition",
    es: "Transición de Contraataque",
    fr: "Transition de Contre-Attaque",
    ja: "電光石火のカウンター転換",
    ar: "تحول هجومي مرتد",
  },
  sustained_possession: {
    en: "Sustained Possession",
    es: "Asedio Posesional",
    fr: "Siège de Possession",
    ja: "持続的ポゼッション包囲",
    ar: "استحواذ متواصل",
  },
  transition_frenzy: {
    en: "Transition Frenzy",
    es: "Frenesí Transicional",
    fr: "Frénésie de Transition",
    ja: "高速トランジション戦",
    ar: "فوضى التحولات السريعة",
  },
  numerical_asymmetry: {
    en: "Numerical Asymmetry",
    es: "Asimetría Numérica",
    fr: "Asymétrie Numérique",
    ja: "数的非対称（退場危機）",
    ar: "نقص عددي حرج",
  },
  penalty_box_chaos: {
    en: "Penalty Box Chaos",
    es: "Caos en el Área",
    fr: "Chaos dans la Surface",
    ja: "ペナルティエリアの乱戦",
    ar: "فوضى داخل منطقة الجزاء",
  },
};

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
  const selectedLanguage = useBaseMemory((s) => s.selectedLanguage);
  const headline = useBaseMemory((s) => s.blackboard.narrative_headline);
  const explanation = useBaseMemory((s) => s.blackboard.narrative_explanation);
  const tacticalInflections = useBaseMemory((s) => s.tacticalInflections);
  const swarmCommentary = useBaseMemory((s) => s.swarmCommentary);

  const formatTime = (secs: number) => {
    const clamped = Math.min(5400, Math.max(0, Math.floor(secs || 0)));
    const m = Math.floor(clamped / 60);
    const s = Math.floor(clamped % 60);
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
        <div className="studio-scoreboard-header" style={{ marginBottom: "16px" }}>
          <div className="studio-ribbon-row-teams">
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: 800, color: "#00e5ff", fontSize: "14px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#00e5ff", boxShadow: "0 0 8px #00e5ff", flexShrink: 0 }} />
              {score.homeTeam}
            </span>
            <span
              style={{
                fontSize: "18px",
                fontWeight: 900,
                color: "#ffffff",
                letterSpacing: "1px",
                fontFamily: "monospace",
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
            <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#38bdf8", fontSize: "12px" }}>
              {formatTime(matchClock)}
            </span>
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>•</span>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#e2e8f0" }}>{score.period}</span>
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>•</span>
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>Etihad Stadium</span>
          </div>
        </div>

        {/* Mobile Segmented Pill Switcher (Visible on Mobile only) */}
        <div className="ion-hide-md-up" style={{ marginBottom: "14px" }}>
          <div
            style={{
              display: "flex",
              backgroundColor: "rgba(15, 23, 42, 0.95)",
              border: "1px solid var(--studio-panel-border)",
              borderRadius: "10px",
              padding: "3px",
              gap: "4px",
              boxShadow: "inset 0 1px 3px rgba(0,0,0,0.5)",
            }}
          >
            {[
              { id: "indices", label: "Tactical Indices", icon: trendingUpOutline },
              { id: "intel", label: "Swarm Intel", icon: gitNetworkOutline },
              { id: "all", label: "All Intelligence", icon: layersOutline },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMobileTab(tab.id as "indices" | "intel" | "all")}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  padding: "7px 2px",
                  borderRadius: "8px",
                  border: mobileTab === tab.id ? "1px solid rgba(124, 58, 237, 0.6)" : "1px solid transparent",
                  backgroundColor: mobileTab === tab.id ? "rgba(124, 58, 237, 0.32)" : "transparent",
                  color: mobileTab === tab.id ? "#ffffff" : "var(--studio-subtext)",
                  boxShadow: mobileTab === tab.id ? "0 2px 10px rgba(124, 58, 237, 0.4)" : "none",
                  fontSize: "10px",
                  fontWeight: mobileTab === tab.id ? 800 : 600,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <IonIcon icon={tab.icon} style={{ fontSize: "12px", color: mobileTab === tab.id ? "#c084fc" : "var(--studio-subtext)" }} />
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
            {/* 1. Control vs. Chaos Index */}
            <IonCard mode="ios" style={{ margin: "0", background: "#0f172a" }}>
              <IonCardHeader>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                  <IonCardTitle style={{ fontSize: "17px", color: "#f8fafc", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                    <IonIcon icon={trendingUpOutline} style={{ color: "#00e5ff" }} />
                    Control vs. Chaos Index
                  </IonCardTitle>
                  <span style={{ fontFamily: "monospace", fontWeight: 800, color: "#f8fafc", fontSize: "14px", flexShrink: 0 }}>
                    {Math.round(control)}% / {Math.round(chaos)}%
                  </span>
                </div>
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
                    marginBottom: "12px",
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

            {/* 2. Pass Difficulty Rating (PDR) Decomposition */}
            <IonCard mode="ios" style={{ margin: "0", background: "#0f172a" }}>
              <IonCardHeader>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                  <IonCardTitle style={{ fontSize: "17px", color: "#f8fafc", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                    <IonIcon icon={flameOutline} style={{ color: "#f59e0b" }} />
                    Pass Difficulty Rating (PDR)
                  </IonCardTitle>
                  <span style={{ fontFamily: "monospace", fontWeight: 900, color: "#f59e0b", fontSize: "16px", flexShrink: 0 }}>
                    {pdr.toFixed(2)}
                  </span>
                </div>
              </IonCardHeader>
              <IonCardContent>
                <IonProgressBar
                  mode="ios"
                  value={Math.min(1.0, pdr)}
                  color={pdr > 0.6 ? "danger" : pdr > 0.35 ? "warning" : "success"}
                  style={{ height: "10px", borderRadius: "5px", marginBottom: "14px" }}
                />

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

            {/* 3. Positional Phase Distribution */}
            <IonCard mode="ios" style={{ margin: "0", background: "#0f172a" }}>
              <IonCardHeader>
                <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                  <IonIcon icon={analyticsOutline} style={{ color: "#a855f7" }} />
                  Territorial Progression
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))", gap: "6px", textAlign: "center" }}>
                  <div style={{ background: "#1e293b", padding: "10px 8px", borderRadius: "8px" }}>
                    <span style={{ fontSize: "10px", color: "#94a3b8", display: "block" }}>Build-Up</span>
                    <strong style={{ fontSize: "14px", color: "#38bdf8" }}>{buildUpPct}%</strong>
                  </div>
                  <div style={{ background: "#1e293b", padding: "10px 8px", borderRadius: "8px" }}>
                    <span style={{ fontSize: "10px", color: "#94a3b8", display: "block" }}>Progression</span>
                    <strong style={{ fontSize: "14px", color: "#a855f7" }}>{progressionPct}%</strong>
                  </div>
                  <div style={{ background: "#1e293b", padding: "10px 8px", borderRadius: "8px" }}>
                    <span style={{ fontSize: "10px", color: "#94a3b8", display: "block" }}>Final 3rd</span>
                    <strong style={{ fontSize: "14px", color: "#10b981" }}>{finalThirdPct}%</strong>
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
            {/* 4. Game Rhythm & Tactical Arc */}
            <IonCard mode="ios" style={{ margin: "0", background: "#0f172a" }}>
              <IonCardHeader>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                  <IonCardTitle style={{ fontSize: "17px", color: "#f8fafc", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                    <IonIcon icon={pulseOutline} style={{ color: "#a855f7" }} />
                    {GAME_RHYTHM_LOCALIZATIONS[rhythm]?.[selectedLanguage] || rhythm.replace(/_/g, " ")}
                  </IonCardTitle>
                  {activeInflection && (
                    <IonBadge color="danger" style={{ fontWeight: 800, flexShrink: 0 }}>
                      Inflection Active
                    </IonBadge>
                  )}
                </div>
              </IonCardHeader>
              <IonCardContent>
                <p style={{ margin: 0, color: "#f8fafc", fontSize: "14px", fontWeight: 600, lineHeight: "1.5" }}>
                  {sanitizeText(headline, "Manchester City and Arsenal contest tactical space in high-tempo Premier League clash.", selectedLanguage)}
                </p>
                {explanation && (
                  <p style={{ margin: "8px 0 0 0", color: "#94a3b8", fontSize: "12px", lineHeight: "1.5" }}>
                    {sanitizeText(explanation, "", selectedLanguage)}
                  </p>
                )}
              </IonCardContent>
            </IonCard>

            {/* 5. Tactical Inflection Points Timeline */}
            <IonCard mode="ios" style={{ margin: "0", background: "#0f172a" }}>
              <IonCardHeader>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "4px" }}>
                  <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                    <IonIcon icon={flashOutline} style={{ color: "#10b981" }} />
                    Tactical Inflection Points
                  </IonCardTitle>
                  <IonBadge color="success" style={{ fontWeight: 800, flexShrink: 0 }}>
                    {tacticalInflections.length}
                  </IonBadge>
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
                      title={`${inflection.time} • ${inflection.title}`}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: "1 1 180px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 900, color: "#7c3aed", fontFamily: "monospace", flexShrink: 0 }}>
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
                })}
              </IonCardContent>
            </IonCard>

            {/* 6. Multi-Agent Swarm Tactical Insights Feed */}
            <IonCard mode="ios" style={{ margin: "0", background: "#0f172a" }}>
              <IonCardHeader>
                <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                  <IonIcon icon={gitNetworkOutline} style={{ color: "#00e5ff" }} />
                  Swarm Commentary
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
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "4px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                        <span style={{ fontSize: "10px", fontWeight: 900, color: "#00e5ff", fontFamily: "monospace", flexShrink: 0 }}>
                          {item.time}
                        </span>
                        <span style={{ fontSize: "11px", fontWeight: 800, color: "#f8fafc" }}>
                          {item.agent}
                        </span>
                      </div>
                      <span style={{ fontSize: "9px", color: "#94a3b8", flexShrink: 0 }}>{item.role}</span>
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
