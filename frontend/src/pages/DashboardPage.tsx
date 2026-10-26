import React, { useState } from "react";
import {
  IonPage,
  IonContent,
  IonIcon,
} from "@ionic/react";
import {
  micOutline,
  footballOutline,
  videocamOutline,
  mapOutline,
  layersOutline,
} from "ionicons/icons";
import { MediaTimelinePanel } from "../components/dashboard/MediaTimelinePanel";
import { MatchScoreCard } from "../components/dashboard/MatchScoreCard";
import { FormationPitchCard } from "../components/dashboard/FormationPitchCard";
import { PlayerSpotlightCard } from "../components/dashboard/PlayerSpotlightCard";
import { ShootMapCard } from "../components/dashboard/ShootMapCard";
import { AttackingShapeCard } from "../components/dashboard/AttackingShapeCard";
import { useBaseMemory } from "../store/baseMemory";
import { StudioRecapModal } from "../components/broadcast/StudioRecapModal";
import { JudgeQuickTourPill } from "../components/JudgeQuickTourPill";
import { StudioTopBar } from "../components/StudioTopBar";

export const DashboardPage: React.FC = () => {
  const [isRecapModalOpen, setIsRecapModalOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<"match" | "video" | "spotlight" | "all">("match");

  return (
    <IonPage className="studio-header-bar-page">
      {/* Unified Responsive Studio Top Bar (renders studio-header-bar on desktop with var(--studio-panel-bg)) */}
      <StudioTopBar
        title="PL Studio"
        subtitle="Synthetic Match Insights"
        showRecap={true}
        onOpenRecap={() => setIsRecapModalOpen(true)}
      />

      <IonContent fullscreen className="ion-padding" style={{ backgroundColor: "var(--ion-background-color)" }}>

        {/* Mobile View Switcher (iOS Segmented Pills - Hidden on Desktop) */}
        <div className="ion-hide-md-up" style={{ marginBottom: "12px" }}>
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
              { id: "match", label: "Match", icon: footballOutline },
              { id: "video", label: "Video", icon: videocamOutline },
              { id: "spotlight", label: "Maps", icon: mapOutline },
              { id: "all", label: "All", icon: layersOutline },
            ].map((sec) => (
              <button
                key={sec.id}
                onClick={() => setMobileSection(sec.id as any)}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  padding: "7px 2px",
                  borderRadius: "8px",
                  border: mobileSection === sec.id ? "1px solid rgba(124, 58, 237, 0.6)" : "1px solid transparent",
                  backgroundColor: mobileSection === sec.id ? "rgba(124, 58, 237, 0.32)" : "transparent",
                  color: mobileSection === sec.id ? "#ffffff" : "var(--studio-subtext)",
                  boxShadow: mobileSection === sec.id ? "0 2px 10px rgba(124, 58, 237, 0.4)" : "none",
                  fontSize: "10.5px",
                  fontWeight: mobileSection === sec.id ? 800 : 600,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <IonIcon icon={sec.icon} style={{ fontSize: "12px", color: mobileSection === sec.id ? "#c084fc" : "var(--studio-subtext)" }} />
                <span>{sec.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Studio Teleprompter Modal */}
        <StudioRecapModal
          isOpen={isRecapModalOpen}
          onClose={() => setIsRecapModalOpen(false)}
        />

        {/* 3-Column Studio Grid matching Reference Image */}
        <div className="studio-dashboard-grid" style={{ maxWidth: "1600px", margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
          {/* Column 1: Video Multi-Feed, Time Scrubber & Chronological Event List */}
          <div
            className={`studio-col-video ${mobileSection !== "all" && mobileSection !== "video" ? "ion-hide-md-down" : ""}`}
            style={{ display: "flex", flexDirection: "column", gap: "16px", minWidth: 0, width: "100%", boxSizing: "border-box" }}
          >
            <MediaTimelinePanel />
          </div>

          {/* Column 2: Match Scorecard, Formation & Tactical Lineup Pitch */}
          <div
            className={`studio-col-match ${mobileSection !== "all" && mobileSection !== "match" ? "ion-hide-md-down" : ""}`}
            style={{ display: "flex", flexDirection: "column", gap: "16px", minWidth: 0, width: "100%", boxSizing: "border-box" }}
          >
            <MatchScoreCard />
            <FormationPitchCard />
            {mobileSection === "match" && (
              <div className="ion-hide-md-up" style={{ minWidth: 0, width: "100%", boxSizing: "border-box" }}>
                <AttackingShapeCard />
              </div>
            )}
          </div>

          {/* Column 3: Spotlight Player of the Match, Shoot Map & Attacking Shape */}
          <div
            className={`studio-col-spotlight ${mobileSection !== "all" && mobileSection !== "spotlight" ? "ion-hide-md-down" : ""}`}
            style={{ display: "flex", flexDirection: "column", gap: "16px", minWidth: 0, width: "100%", boxSizing: "border-box" }}
          >
            <PlayerSpotlightCard />

            {/* Tactical Pitch Visualizers: Shoot Map (Left) & Attacking Shape (Right) side-by-side */}
            <div
              className="studio-maps-grid"
              style={{
                display: "grid",
                gap: "16px",
                width: "100%",
                maxWidth: "100%",
                boxSizing: "border-box",
                minWidth: 0,
              }}
            >
              <ShootMapCard />
              <AttackingShapeCard />
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default DashboardPage;
