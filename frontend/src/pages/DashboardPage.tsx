import React, { useState } from "react";
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonBadge,
  IonIcon,
} from "@ionic/react";
import {
  radioOutline,
  micOutline,
  footballOutline,
  videocamOutline,
  mapOutline,
  layersOutline,
  sunnyOutline,
  moonOutline,
} from "ionicons/icons";
import { MediaTimelinePanel } from "../components/dashboard/MediaTimelinePanel";
import { MatchScoreCard } from "../components/dashboard/MatchScoreCard";
import { FormationPitchCard } from "../components/dashboard/FormationPitchCard";
import { PlayerSpotlightCard } from "../components/dashboard/PlayerSpotlightCard";
import { ShootMapCard } from "../components/dashboard/ShootMapCard";
import { AttackingShapeCard } from "../components/dashboard/AttackingShapeCard";
import { useBaseMemory, baseMemory } from "../store/baseMemory";
import { StudioRecapModal } from "../components/broadcast/StudioRecapModal";

export const DashboardPage: React.FC = () => {
  const theme = useBaseMemory((s) => s.theme);
  const serverStatus = useBaseMemory((s) => s.serverStatus);
  const [isRecapModalOpen, setIsRecapModalOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<"match" | "video" | "spotlight" | "all">("match");

  return (
    <IonPage>
      {/* Mobile-Only iOS Unified Header */}
      <IonHeader mode="ios" className="ion-hide-md-up">
        <IonToolbar mode="ios">
          <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingLeft: "10px" }}>
            <span
              style={{
                backgroundColor: "#7c3aed",
                color: "#ffffff",
                padding: "2px 6px",
                borderRadius: "4px",
                fontSize: "9px",
                fontWeight: 900,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              Gamoventure
            </span>
            <span style={{ fontSize: "14px", fontWeight: 800, color: "#f8fafc" }}>PL Studio</span>
          </div>
          <IonButtons slot="end">
            <IonButton
              fill="clear"
              size="small"
              onClick={() => setIsRecapModalOpen(true)}
              style={{ color: "#c084fc", fontSize: "11px", fontWeight: 700 }}
              title="Open Half-Time Teleprompter"
            >
              <IonIcon slot="start" icon={micOutline} style={{ fontSize: "14px" }} />
              Recap
            </IonButton>
            <IonBadge color={serverStatus.isConnected ? "success" : "warning"} style={{ marginRight: "10px", fontSize: "10px" }}>
              {serverStatus.isConnected ? "10Hz / 5Hz" : "Sync"}
            </IonBadge>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding" style={{ backgroundColor: "var(--ion-background-color)" }}>
        {/* Desktop-Only Top Studio Bar */}
        <header
          className="studio-header-bar ion-hide-md-down"
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
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          {/* Brand Info with Gamoventure Attribution */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
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

          {/* Right Controls: Theme, Teleprompter & Server Live Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <button
              onClick={() => baseMemory.toggleTheme()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "var(--studio-inner-bg)",
                border: "1px solid var(--studio-panel-border)",
                borderRadius: "8px",
                padding: "6px 12px",
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--ion-text-color)",
                cursor: "pointer",
              }}
              title={`Theme: ${theme === "dark" ? "Dark" : "Light"}`}
            >
              <IonIcon
                icon={theme === "dark" ? sunnyOutline : moonOutline}
                style={{ fontSize: "14px", color: theme === "dark" ? "#f59e0b" : "#475569" }}
              />
              <span>{theme === "dark" ? "Dark" : "Light"}</span>
            </button>
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
              <span>{serverStatus.isConnected ? "Live 10Hz Engine • 5Hz Stream" : "Synthetic Fallback"}</span>
            </div>
          </div>
        </header>

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
