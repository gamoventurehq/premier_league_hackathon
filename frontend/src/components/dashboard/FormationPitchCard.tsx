import React, { useState, useRef } from "react";
import { IonIcon } from "@ionic/react";
import {
  personOutline,
  flashOutline,
  chevronBackOutline,
  chevronForwardOutline,
} from "ionicons/icons";
import { useBaseMemory, baseMemory } from "../../store/baseMemory";
import { telemetryService } from "../../services/telemetryService";

export const FormationPitchCard: React.FC = () => {
  const [activeTab, setActiveTab] = useState("LINEUP");
  const tabScrollRef = useRef<HTMLDivElement>(null);

  const scrollTabs = (direction: "left" | "right") => {
    if (tabScrollRef.current) {
      tabScrollRef.current.scrollBy({
        left: direction === "left" ? -100 : 100,
        behavior: "smooth",
      });
    }
  };

  const handleTabClick = (tab: string, e: React.MouseEvent<HTMLButtonElement>) => {
    setActiveTab(tab);
    e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
  };
  const matchClock = useBaseMemory((s) => s.matchClock);
  const currentFrame = useBaseMemory((s) => s.currentFrame);
  const selectedPlayerId = useBaseMemory((s) => s.selectedPlayerId);
  const homeLineup = useBaseMemory((s) => s.homeLineup);
  const awayLineup = useBaseMemory((s) => s.awayLineup);
  const score = useBaseMemory((s) => s.score);
  const headToHeadStats = useBaseMemory((s) => s.headToHeadStats);
  const tacticalInflections = useBaseMemory((s) => s.tacticalInflections);
  const swarmCommentary = useBaseMemory((s) => s.swarmCommentary);
  const narrativeHeadline = useBaseMemory((s) => s.blackboard.narrative_headline);

  const getShortName = (fullName: string) => {
    const parts = fullName.trim().split(" ");
    if (parts.length > 1) {
      if (parts[0] === "De" || parts[0] === "Van") return `${parts[0]} ${parts[1]}`;
      return parts[parts.length - 1];
    }
    return fullName;
  };

  return (
    <div
      className="studio-panel-box"
      style={{
        backgroundColor: "var(--studio-panel-bg)",
        border: "1px solid var(--studio-panel-border)",
        borderRadius: "16px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Sticky Tab Switcher Bar with Scroll Option (952x608 & Responsive) */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 15,
          backgroundColor: "var(--studio-panel-bg)",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          width: "100%",
          paddingBottom: "8px",
          borderBottom: "1px solid var(--studio-panel-border)",
          boxSizing: "border-box",
        }}
      >
        <button
          type="button"
          onClick={() => scrollTabs("left")}
          aria-label="Scroll tabs left"
          title="Scroll tabs left"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "6px",
            color: "var(--studio-subtext)",
            width: "22px",
            height: "26px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
            padding: 0,
            transition: "all 0.15s ease",
          }}
        >
          <IonIcon icon={chevronBackOutline} style={{ fontSize: "14px" }} />
        </button>

        <div
          ref={tabScrollRef}
          className="studio-chip-scroll"
          onWheel={(e) => {
            if (e.deltaY !== 0) {
              e.currentTarget.scrollLeft += e.deltaY;
            }
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            overflowX: "auto",
            scrollBehavior: "smooth",
            WebkitOverflowScrolling: "touch",
            flex: 1,
            minWidth: 0,
            padding: "2px 0",
          }}
        >
          {["SUMMARY", "STATISTICS", "LINEUP", "PLAYERS", "COMMENTS"].map((tab) => (
            <button
              key={tab}
              onClick={(e) => handleTabClick(tab, e)}
              style={{
                padding: "5px 11px",
                borderRadius: "8px",
                border: activeTab === tab ? "1px solid rgba(16, 185, 129, 0.6)" : "1px solid rgba(255, 255, 255, 0.05)",
                backgroundColor: activeTab === tab ? "rgba(16, 185, 129, 0.22)" : "rgba(255, 255, 255, 0.03)",
                color: activeTab === tab ? "#34d399" : "var(--studio-subtext)",
                boxShadow: activeTab === tab ? "0 0 10px rgba(16, 185, 129, 0.35)" : "none",
                fontWeight: activeTab === tab ? 800 : 600,
                fontSize: "11px",
                letterSpacing: "0.5px",
                whiteSpace: "nowrap",
                flexShrink: 0,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scrollTabs("right")}
          aria-label="Scroll tabs right"
          title="Scroll tabs right"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "6px",
            color: "var(--studio-subtext)",
            width: "22px",
            height: "26px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
            padding: 0,
            transition: "all 0.15s ease",
          }}
        >
          <IonIcon icon={chevronForwardOutline} style={{ fontSize: "14px" }} />
        </button>
      </div>

      {/* Tab 1: Tactical Lineup & Pitch */}
      {activeTab === "LINEUP" && (
        <>
          {/* Formation Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0 8px",
              fontSize: "12px",
              fontWeight: 800,
              color: "var(--ion-text-color)",
            }}
          >
            <span style={{ color: score.homeMeta.color }}>{score.homeMeta.formation}</span>
            <span style={{ color: "var(--studio-subtext)", fontSize: "11px", letterSpacing: "1px" }}>
              FORMATION
            </span>
            <span style={{ color: score.awayMeta.color }}>{score.awayMeta.formation}</span>
          </div>

          {/* Tactical Lineup Pitch */}
          <div
            style={{
              width: "100%",
              aspectRatio: "16/10",
              backgroundColor: "#166534",
              backgroundImage:
                "radial-gradient(ellipse at center, #15803d 0%, #14532d 100%)",
              borderRadius: "12px",
              position: "relative",
              overflow: "hidden",
              border: "2px solid rgba(255, 255, 255, 0.15)",
              boxShadow: "inset 0 0 40px rgba(0, 0, 0, 0.4)",
            }}
          >
            {/* Pitch Lines */}
            <div
              style={{
                position: "absolute",
                inset: "8px",
                border: "1.5px solid rgba(255, 255, 255, 0.35)",
                pointerEvents: "none",
              }}
            />
            {/* Halfway Line */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "8px",
                bottom: "8px",
                width: "1.5px",
                backgroundColor: "rgba(255, 255, 255, 0.35)",
                pointerEvents: "none",
              }}
            />
            {/* Center Circle */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                width: "70px",
                height: "70px",
                borderRadius: "50%",
                border: "1.5px solid rgba(255, 255, 255, 0.35)",
                pointerEvents: "none",
              }}
            />

            {/* Home Players */}
            {homeLineup.map((p) => {
              const isSelected = selectedPlayerId === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => baseMemory.setSelectedPlayer(p.id)}
                  style={{
                    position: "absolute",
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    transform: "translate(-50%, -50%)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    cursor: "pointer",
                    zIndex: isSelected ? 10 : 2,
                    transition: "left 0.2s linear, top 0.2s linear",
                  }}
                >
                  <div
                    style={{
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      backgroundColor: score.homeMeta.color,
                      border: isSelected ? "2.5px solid #ffd600" : "1.5px solid #ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "9px",
                      fontWeight: 900,
                      color: "#080d16",
                      boxShadow: isSelected
                        ? "0 0 12px #ffd600"
                        : p.is_ball_carrier
                        ? `0 0 10px ${score.homeMeta.color}`
                        : "0 2px 4px rgba(0,0,0,0.5)",
                    }}
                  >
                    {p.number}
                  </div>
                  <span
                    style={{
                      fontSize: "8px",
                      fontWeight: 700,
                      color: "#ffffff",
                      textShadow: "0 1px 2px #000000",
                      marginTop: "2px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {getShortName(p.name)}
                  </span>
                  <span
                    style={{
                      fontSize: "7px",
                      fontWeight: 800,
                      backgroundColor: p.rating >= 8.0 ? "#10b981" : "#f59e0b",
                      color: "#ffffff",
                      padding: "0 3px",
                      borderRadius: "3px",
                      marginTop: "1px",
                    }}
                  >
                    {p.rating.toFixed(1)}
                  </span>
                </div>
              );
            })}

            {/* Away Players */}
            {awayLineup.map((p) => {
              const isSelected = selectedPlayerId === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => baseMemory.setSelectedPlayer(p.id)}
                  style={{
                    position: "absolute",
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    transform: "translate(-50%, -50%)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    cursor: "pointer",
                    zIndex: isSelected ? 10 : 2,
                    transition: "left 0.2s linear, top 0.2s linear",
                  }}
                >
                  <div
                    style={{
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      backgroundColor: score.awayMeta.color,
                      border: isSelected ? "2.5px solid #ffd600" : "1.5px solid #ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "9px",
                      fontWeight: 900,
                      color: "#ffffff",
                      boxShadow: isSelected
                        ? "0 0 12px #ffd600"
                        : p.is_ball_carrier
                        ? `0 0 10px ${score.awayMeta.color}`
                        : "0 2px 4px rgba(0,0,0,0.5)",
                    }}
                  >
                    {p.number}
                  </div>
                  <span
                    style={{
                      fontSize: "8px",
                      fontWeight: 700,
                      color: "#ffffff",
                      textShadow: "0 1px 2px #000000",
                      marginTop: "2px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {getShortName(p.name)}
                  </span>
                  <span
                    style={{
                      fontSize: "7px",
                      fontWeight: 800,
                      backgroundColor: p.rating >= 8.0 ? "#10b981" : "#f59e0b",
                      color: "#ffffff",
                      padding: "0 3px",
                      borderRadius: "3px",
                      marginTop: "1px",
                    }}
                  >
                    {p.rating.toFixed(1)}
                  </span>
                </div>
              );
            })}

            {/* Live 5Hz Spatial Ball */}
            {currentFrame?.ball && (
              <div
                style={{
                  position: "absolute",
                  left: `${(currentFrame.ball.x / 105.0) * 100}%`,
                  top: `${(currentFrame.ball.y / 68.0) * 100}%`,
                  transform: "translate(-50%, -50%)",
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  backgroundColor: "#ffd600",
                  border: "2px solid #ffffff",
                  boxShadow: "0 0 10px #ffd600, 0 0 18px rgba(255, 214, 0, 0.7)",
                  zIndex: 8,
                  pointerEvents: "none",
                  transition: "left 0.2s linear, top 0.2s linear",
                }}
              />
            )}
          </div>

          {/* Head Coach / Managers Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "8px",
              paddingTop: "6px",
              borderTop: "1px solid var(--studio-panel-border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(0, 229, 255, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: score.homeMeta.color,
                  flexShrink: 0,
                }}
              >
                <IonIcon icon={personOutline} style={{ fontSize: "16px" }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--ion-text-color)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {score.homeMeta.manager}
                </div>
                <div style={{ fontSize: "10px", color: "var(--studio-subtext)" }}>
                  Head Coach
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px", minWidth: 0 }}>
              <div style={{ textAlign: "right", minWidth: 0 }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--ion-text-color)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {score.awayMeta.manager}
                </div>
                <div style={{ fontSize: "10px", color: "var(--studio-subtext)" }}>
                  Head Coach
                </div>
              </div>
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(244, 63, 94, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: score.awayMeta.color,
                  flexShrink: 0,
                }}
              >
                <IonIcon icon={personOutline} style={{ fontSize: "16px" }} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Tab 2: Head-to-Head Match Statistics */}
      {activeTab === "STATISTICS" && (
        <div
          style={{
            minHeight: "470px",
            maxHeight: "470px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            padding: "8px 4px",
          }}
        >
          {/* Header Legend */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 800, color: score.homeMeta.color }}>
              {score.homeMeta.name}
            </span>
            <span style={{ fontSize: "11px", color: "var(--studio-subtext)", fontWeight: 700, textTransform: "uppercase" }}>
              Match Comparison
            </span>
            <span style={{ fontSize: "12px", fontWeight: 800, color: score.awayMeta.color }}>
              {score.awayMeta.name}
            </span>
          </div>

          {headToHeadStats.map((stat) => (
            <div
              key={stat.label}
              style={{
                backgroundColor: "var(--studio-inner-bg)",
                borderRadius: "10px",
                padding: "8px 12px",
                border: "1px solid var(--studio-panel-border)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 700, marginBottom: "6px" }}>
                <span style={{ color: score.homeMeta.color }}>{stat.home}</span>
                <span style={{ color: "var(--ion-text-color)" }}>{stat.label}</span>
                <span style={{ color: score.awayMeta.color }}>{stat.away}</span>
              </div>
              {/* Dual Proportional Bar */}
              <div style={{ display: "flex", height: "6px", borderRadius: "3px", overflow: "hidden", backgroundColor: "rgba(255,255,255,0.06)" }}>
                <div style={{ width: `${stat.homePct}%`, backgroundColor: score.homeMeta.color, transition: "width 0.3s ease" }} />
                <div style={{ width: `${100 - stat.homePct}%`, backgroundColor: score.awayMeta.color, transition: "width 0.3s ease" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: AI Tactical Narrative Summary */}
      {activeTab === "SUMMARY" && (
        <div
          style={{
            minHeight: "470px",
            maxHeight: "470px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            padding: "8px 4px",
          }}
        >
          {/* AI Narrative Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 14px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(0, 229, 255, 0.1))",
              border: "1px solid rgba(124, 58, 237, 0.3)",
            }}
          >
            <IonIcon icon={flashOutline} style={{ color: "#00e5ff", fontSize: "18px" }} />
            <div>
              <div style={{ fontSize: "12px", fontWeight: 800, color: "var(--ion-text-color)" }}>
                Tactical Inflection Engine • Live Narrative
              </div>
            </div>
          </div>

          {/* Match Story Card */}
          <div
            style={{
              backgroundColor: "var(--studio-inner-bg)",
              borderRadius: "10px",
              padding: "12px",
              border: "1px solid var(--studio-panel-border)",
              fontSize: "12px",
              lineHeight: "1.5",
              color: "var(--ion-text-color)",
            }}
          >
            <span style={{ fontWeight: 800, color: "#10b981", display: "block", marginBottom: "4px" }}>
              {narrativeHeadline}
            </span>
            {score.homeMeta.name} sustained dominant Pitch Control by pinning {score.awayMeta.name}'s defensive line with structured position play, while {score.awayMeta.name} sought rapid transition corridors via counter-attacking opportunities.
          </div>

          {/* Tactical Inflection Points List */}
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--studio-subtext)", textTransform: "uppercase" }}>
            Tactical Inflection Points
          </span>

          {tacticalInflections.map((inflection) => {
            const isNear = inflection.timeSec !== undefined && Math.abs(matchClock - inflection.timeSec) < 45;
            return (
              <div
                key={inflection.time + inflection.title}
                onClick={() => {
                  if (inflection.timeSec !== undefined) {
                    baseMemory.setMatchClock(inflection.timeSec);
                    telemetryService.sendCommand({ command: "seek", time: inflection.timeSec });
                  }
                }}
                style={{
                  backgroundColor: isNear ? "rgba(124, 58, 237, 0.18)" : "var(--studio-inner-bg)",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  border: isNear ? "1.5px solid #7c3aed" : "1px solid var(--studio-panel-border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                title={`Click to seek match clock to ${inflection.time}`}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 900, color: "#7c3aed", fontFamily: "monospace" }}>
                      {inflection.time}
                    </span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ion-text-color)" }}>
                      {inflection.title}
                    </span>
                  </div>
                  <span style={{ fontSize: "9px", fontWeight: 800, color: "#10b981", backgroundColor: "rgba(16, 185, 129, 0.15)", padding: "2px 6px", borderRadius: "4px" }}>
                    {inflection.impact}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: "11px", color: "var(--studio-subtext)", lineHeight: "1.4" }}>
                  {inflection.detail}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 4: Interactive Player Roster Ratings */}
      {activeTab === "PLAYERS" && (
        <div
          style={{
            minHeight: "470px",
            maxHeight: "470px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            padding: "8px 4px",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--studio-subtext)", textTransform: "uppercase" }}>
            Match Squad Roster
          </div>

          {[...homeLineup, ...awayLineup].map((p) => {
            const isSelected = selectedPlayerId === p.id;
            const teamColor = p.team === "home" ? score.homeMeta.color : score.awayMeta.color;
            const teamCode = p.team === "home" ? score.homeMeta.shortCode : score.awayMeta.shortCode;
            return (
              <div
                key={p.id}
                onClick={() => baseMemory.setSelectedPlayer(p.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  backgroundColor: isSelected ? "rgba(124, 58, 237, 0.2)" : "var(--studio-inner-bg)",
                  borderRadius: "8px",
                  border: isSelected ? "1.5px solid #7c3aed" : "1px solid var(--studio-panel-border)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 900, color: teamColor, minWidth: "28px" }}>
                    {teamCode}
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--studio-subtext)", minWidth: "18px" }}>
                    #{p.number}
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ion-text-color)" }}>
                    {p.name}
                  </span>
                  <span style={{ fontSize: "9px", padding: "1px 5px", borderRadius: "4px", backgroundColor: "rgba(255,255,255,0.08)", color: "var(--studio-subtext)" }}>
                    {p.pos}
                  </span>
                </div>
                <div
                  style={{
                    backgroundColor: p.rating >= 8.0 ? "#10b981" : p.rating >= 7.3 ? "#3b82f6" : "#f59e0b",
                    color: "#ffffff",
                    fontSize: "11px",
                    fontWeight: 900,
                    padding: "2px 7px",
                    borderRadius: "4px",
                  }}
                >
                  {p.rating.toFixed(1)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 5: Broadcast Multi-Agent Commentary */}
      {activeTab === "COMMENTS" && (
        <div
          style={{
            minHeight: "470px",
            maxHeight: "470px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            padding: "8px 4px",
          }}
        >
          {swarmCommentary.map((comment, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: "var(--studio-inner-bg)",
                borderRadius: "10px",
                padding: "10px 12px",
                border: "1px solid var(--studio-panel-border)",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 900, color: "#00e5ff", fontFamily: "monospace" }}>
                    {comment.time}
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--ion-text-color)" }}>
                    {comment.agent}
                  </span>
                </div>
                <span style={{ fontSize: "9px", color: "var(--studio-subtext)" }}>
                  {comment.role}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: "11px", color: "var(--studio-subtext)", lineHeight: "1.4" }}>
                {comment.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
