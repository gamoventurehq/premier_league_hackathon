import React from "react";
import { IonIcon } from "@ionic/react";
import {
  openOutline,
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
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div
      style={{
        backgroundColor: "var(--studio-panel-bg)",
        border: "1px solid var(--studio-panel-border)",
        borderRadius: "16px",
        padding: "18px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
      }}
    >
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--ion-text-color)" }}>
          Match Score
        </span>
        <IonIcon
          icon={openOutline}
          style={{ fontSize: "16px", color: "var(--studio-subtext)", cursor: "pointer" }}
        />
      </div>

      {/* Main Scoreboard Section */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: "12px",
          textAlign: "center",
        }}
      >
        {/* Home Club */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: "rgba(0, 229, 255, 0.12)",
              border: "2px solid #00e5ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              color: "#00e5ff",
              fontSize: "14px",
            }}
          >
            {score.homeTeam}
          </div>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--ion-text-color)" }}>
            Man City
          </span>
        </div>

        {/* Center Score & Match Clock */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
          <span style={{ fontSize: "11px", color: "var(--studio-subtext)", fontFamily: "monospace" }}>
            25.01.2026 • 16:30
          </span>
          <div
            style={{
              fontSize: "32px",
              fontWeight: 900,
              letterSpacing: "4px",
              color: "var(--ion-text-color)",
              lineHeight: 1.1,
            }}
          >
            {score.homeScore} - {score.awayScore}
          </div>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 800,
              letterSpacing: "1px",
              textTransform: "uppercase",
              padding: "2px 8px",
              borderRadius: "4px",
              backgroundColor: serverStatus.isConnected ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
              color: serverStatus.isConnected ? "#10b981" : "#f59e0b",
            }}
          >
            {score.period} ({formatTime(matchClock)})
          </span>
        </div>

        {/* Away Club */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: "rgba(244, 63, 94, 0.12)",
              border: "2px solid #f43f5e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              color: "#f43f5e",
              fontSize: "14px",
            }}
          >
            {score.awayTeam}
          </div>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--ion-text-color)" }}>
            Arsenal
          </span>
        </div>
      </div>

      {/* Goalscorers & Key Events */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          fontSize: "11px",
          color: "var(--studio-subtext)",
          padding: "8px 0",
          borderTop: "1px solid var(--studio-panel-border)",
          borderBottom: "1px solid var(--studio-panel-border)",
        }}
      >
        <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
            <span>E. Haaland 42'</span>
            <IonIcon icon={footballOutline} style={{ fontSize: "12px", color: "var(--ion-color-secondary)" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
            <span>K. De Bruyne 68'</span>
            <IonIcon icon={footballOutline} style={{ fontSize: "12px", color: "var(--ion-color-secondary)" }} />
          </div>
        </div>

        <div style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <IonIcon icon={footballOutline} style={{ fontSize: "12px", color: "var(--ion-color-tertiary)" }} />
            <span>B. Saka 51'</span>
          </div>
        </div>
      </div>

      {/* Bottom Match Metadata */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          fontSize: "11px",
          color: "var(--studio-subtext)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <IonIcon icon={calendarOutline} />
          <span>25/01/2026 - 16:30</span>
        </div>
        <span>•</span>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <IonIcon icon={trophyOutline} />
          <span>Premier League</span>
        </div>
        <span>•</span>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <IonIcon icon={locationOutline} />
          <span>Etihad Stadium</span>
        </div>
      </div>
    </div>
  );
};
