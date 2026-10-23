import React, { useState } from "react";
import { IonPage, IonContent, IonIcon } from "@ionic/react";
import { radioOutline, micOutline } from "ionicons/icons";
import { MediaTimelinePanel } from "../components/dashboard/MediaTimelinePanel";
import { MatchScoreCard } from "../components/dashboard/MatchScoreCard";
import { FormationPitchCard } from "../components/dashboard/FormationPitchCard";
import { PlayerSpotlightCard } from "../components/dashboard/PlayerSpotlightCard";
import { ShootMapCard } from "../components/dashboard/ShootMapCard";
import { AttackingShapeCard } from "../components/dashboard/AttackingShapeCard";
import { useBaseMemory } from "../store/baseMemory";
import { StudioRecapModal } from "../components/broadcast/StudioRecapModal";

export const DashboardPage: React.FC = () => {
  const serverStatus = useBaseMemory((s) => s.serverStatus);
  const [isRecapModalOpen, setIsRecapModalOpen] = useState(false);

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
          {/* Brand Info with Gamoventure Attribution */}
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
              Gamoventure
            </span>
            <span style={{ fontSize: "14px", fontWeight: 800, color: "var(--ion-text-color)" }}>
              Premier League Studio: Synthetic Match Insights
            </span>
          </div>

          {/* Right Controls: Teleprompter & Server Live Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={() => setIsRecapModalOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "rgba(124, 58, 237, 0.2)",
                border: "1px solid var(--ion-color-primary)",
                color: "#c084fc",
                padding: "6px 12px",
                borderRadius: "8px",
                fontSize: "11px",
                fontWeight: 800,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title="Open Automated Half-Time Studio Teleprompter & Video Chapters"
            >
              <IonIcon icon={micOutline} style={{ fontSize: "14px" }} />
              <span>HT Studio Teleprompter</span>
            </button>

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

        {/* Studio Teleprompter Modal */}
        <StudioRecapModal
          isOpen={isRecapModalOpen}
          onClose={() => setIsRecapModalOpen(false)}
        />

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
