import React from "react";
import { IonIcon } from "@ionic/react";
import {
  footballOutline,
  calendarOutline,
  trophyOutline,
  locationOutline,
} from "ionicons/icons";
import { useBaseMemory } from "../../store/baseMemory";

export const MatchScoreCard: React.FC = () => {
  const score = useBaseMemory((s) => s.score);
  const matchClock = useBaseMemory((s) => s.matchClock);
  const serverStatus = useBaseMemory((s) => s.serverStatus);

  const formatTime = (secs: number) => {
    const clamped = Math.min(5400, Math.max(0, Math.floor(secs || 0)));
    const m = Math.floor(clamped / 60);
    const s = Math.floor(clamped % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const homeGoals = score.goalscorers.filter((g) => g.team === "home");
  const awayGoals = score.goalscorers.filter((g) => g.team === "away");

  return (
    <div
      style={{
        backgroundColor: "var(--studio-panel-bg)",
        border: "1px solid var(--studio-panel-border)",
        borderRadius: "16px",
        padding: "16px 14px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--ion-text-color)" }}>
          Match Score
        </span>
      </div>

      {/* Main Scoreboard Section */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
          alignItems: "center",
          gap: "8px",
          textAlign: "center",
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Home Club */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", minWidth: 0 }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              backgroundColor: "rgba(0, 229, 255, 0.12)",
              border: `2px solid ${score.homeMeta.color}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              color: score.homeMeta.color,
              fontSize: "13px",
              flexShrink: 0,
            }}
          >
            {score.homeMeta?.shortCode || "MCI"}
          </div>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--ion-text-color)",
              maxWidth: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={score.homeMeta?.name || "Man City"}
          >
            {score.homeMeta?.name || "Man City"}
          </span>
        </div>

        {/* Center Score & Match Clock */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", minWidth: 0, flexShrink: 0 }}>
          <span style={{ fontSize: "10px", color: "var(--studio-subtext)", fontFamily: "monospace", whiteSpace: "nowrap" }}>
            {score.date} • {score.time}
          </span>
          <div
            style={{
              fontSize: "28px",
              fontWeight: 900,
              letterSpacing: "3px",
              color: "var(--ion-text-color)",
              lineHeight: 1.1,
            }}
          >
            {score.homeScore} - {score.awayScore}
          </div>
          <span
            style={{
              fontSize: "9px",
              fontWeight: 800,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              padding: "2px 7px",
              borderRadius: "4px",
              backgroundColor: serverStatus.isConnected ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
              color: serverStatus.isConnected ? "#10b981" : "#f59e0b",
              whiteSpace: "nowrap",
            }}
          >
            {score.period} ({formatTime(matchClock)})
          </span>
        </div>

        {/* Away Club */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", minWidth: 0 }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              backgroundColor: "rgba(244, 63, 94, 0.12)",
              border: `2px solid ${score.awayMeta.color}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              color: score.awayMeta.color,
              fontSize: "13px",
              flexShrink: 0,
            }}
          >
            {score.awayMeta?.shortCode || "ARS"}
          </div>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--ion-text-color)",
              maxWidth: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={score.awayMeta?.name || "Arsenal"}
          >
            {score.awayMeta?.name || "Arsenal"}
          </span>
        </div>
      </div>

      {/* Goalscorers & Key Events */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          fontSize: "10px",
          color: "var(--studio-subtext)",
          padding: "6px 0",
          borderTop: "1px solid var(--studio-panel-border)",
          borderBottom: "1px solid var(--studio-panel-border)",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: "4px", minWidth: 0, overflow: "hidden" }}>
          {homeGoals.map((g, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px", minWidth: 0, overflow: "hidden" }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.player} {g.minute}</span>
              <IonIcon icon={footballOutline} style={{ fontSize: "11px", color: score.homeMeta.color, flexShrink: 0 }} />
            </div>
          ))}
        </div>

        <div style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: "4px", minWidth: 0, overflow: "hidden" }}>
          {awayGoals.map((g, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: "4px", minWidth: 0, overflow: "hidden" }}>
              <IonIcon icon={footballOutline} style={{ fontSize: "11px", color: score.awayMeta.color, flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.player} {g.minute}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Match Metadata */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: "6px 10px",
          fontSize: "10.5px",
          color: "var(--studio-subtext)",
          textAlign: "center",
        }}
      >
        <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <IonIcon icon={calendarOutline} style={{ color: "#38bdf8" }} />
          <span>{score.date}</span>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <IonIcon icon={trophyOutline} style={{ color: "#ffd600" }} />
          <span>{score.competition}</span>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <IonIcon icon={locationOutline} style={{ color: "#10b981" }} />
          <span>{score.venue}</span>
        </div>
      </div>
    </div>
  );
};
