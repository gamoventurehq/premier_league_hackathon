import React from "react";
import { IonPage, IonContent, IonIcon } from "@ionic/react";
import { sunnyOutline, moonOutline, radioOutline } from "ionicons/icons";
import { MediaTimelinePanel } from "../components/dashboard/MediaTimelinePanel";
import { MatchScoreCard } from "../components/dashboard/MatchScoreCard";
import { FormationPitchCard } from "../components/dashboard/FormationPitchCard";
import { PlayerSpotlightCard } from "../components/dashboard/PlayerSpotlightCard";
import { ShootMapCard } from "../components/dashboard/ShootMapCard";
import { AttackingShapeCard } from "../components/dashboard/AttackingShapeCard";
import { useBaseMemory, baseMemory } from "../store/baseMemory";

export const DashboardPage: React.FC = () => {
  const theme = useBaseMemory((s) => s.theme);
  const serverStatus = useBaseMemory((s) => s.serverStatus);

  return (
    <IonPage>
      <IonContent fullscreen className="ion-padding" style={{ backgroundColor: "var(--ion-background-color)" }}>
        {/* Top Studio Bar with Prominent Theme Switcher */}
        <header
          style={{
            maxWidth: "1600px",
            margin: "0 auto 16px auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 18px",
            backgroundColor: "var(--studio-panel-bg)",
            border: "1px solid var(--studio-panel-border)",
            borderRadius: "14px",
          }}
        >
          {/* Brand Info */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                backgroundColor: "#7c3aed",
                color: "#ffffff",
                padding: "2px 8px",
                borderRadius: "6px",
                fontSize: "10px",
                fontWeight: 900,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              Premier League
            </span>
            <span style={{ fontSize: "14px", fontWeight: 800, color: "var(--ion-text-color)" }}>
              Synthetic Match Insights Studio
            </span>
          </div>

          {/* Right Controls: Server Live Badge + Prominent Light/Dark Mode Toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11px",
                fontWeight: 700,
                color: serverStatus.isConnected ? "#10b981" : "#f59e0b",
              }}
            >
              <IonIcon icon={radioOutline} style={{ animation: "pulse 1.5s infinite" }} />
              <span>{serverStatus.isConnected ? "Live 5Hz Stream" : "Synthetic Fallback"}</span>
            </div>

            {/* Prominent Light / Dark Theme Button (Strictly SVG Icons, No Emojis) */}
            <button
              onClick={() => baseMemory.toggleTheme()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 14px",
                borderRadius: "10px",
                backgroundColor: "var(--studio-inner-bg)",
                border: "1px solid var(--studio-panel-border)",
                color: "var(--ion-text-color)",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <IonIcon
                icon={theme === "dark" ? sunnyOutline : moonOutline}
                style={{ fontSize: "16px", color: theme === "dark" ? "#f59e0b" : "#475569" }}
              />
              <span>{theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}</span>
            </button>
          </div>
        </header>

        {/* 3-Column Studio Grid matching Reference Image */}
        <div className="studio-dashboard-grid" style={{ maxWidth: "1600px", margin: "0 auto" }}>
          {/* Column 1: Video Multi-Feed, Time Scrubber & Chronological Event List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <MediaTimelinePanel />
          </div>

          {/* Column 2: Match Scorecard, Formation & Tactical Lineup Pitch */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <MatchScoreCard />
            <FormationPitchCard />
          </div>

          {/* Column 3: Spotlight Player of the Match, Shoot Map & Attacking Shape */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <PlayerSpotlightCard />
            <ShootMapCard />
            <AttackingShapeCard />
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default DashboardPage;
