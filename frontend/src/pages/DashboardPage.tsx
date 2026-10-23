import React from "react";
import { IonPage, IonContent, IonIcon } from "@ionic/react";
import { radioOutline } from "ionicons/icons";
import { MediaTimelinePanel } from "../components/dashboard/MediaTimelinePanel";
import { MatchScoreCard } from "../components/dashboard/MatchScoreCard";
import { FormationPitchCard } from "../components/dashboard/FormationPitchCard";
import { PlayerSpotlightCard } from "../components/dashboard/PlayerSpotlightCard";
import { ShootMapCard } from "../components/dashboard/ShootMapCard";
import { AttackingShapeCard } from "../components/dashboard/AttackingShapeCard";
import { useBaseMemory } from "../store/baseMemory";

export const DashboardPage: React.FC = () => {
  const serverStatus = useBaseMemory((s) => s.serverStatus);

  return (
    <IonPage>
      <IonContent fullscreen className="ion-padding" style={{ backgroundColor: "var(--ion-background-color)" }}>
        {/* Top Studio Bar */}
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

          {/* Right Controls: Server Live Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11px",
                fontWeight: 700,
                color: serverStatus.isConnected ? "#10b981" : "#f59e0b",
                backgroundColor: "var(--studio-inner-bg)",
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid var(--studio-panel-border)",
              }}
            >
              <IonIcon icon={radioOutline} style={{ animation: "pulse 1.5s infinite" }} />
              <span>{serverStatus.isConnected ? "Live 5Hz Stream" : "Synthetic Fallback"}</span>
            </div>
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
