import React from "react";
import { IonIcon } from "@ionic/react";
import {
  homeOutline,
  footballOutline,
  analyticsOutline,
  peopleOutline,
  settingsOutline,
  personCircleOutline,
  shieldOutline,
  sparklesOutline,
} from "ionicons/icons";

interface SidebarNavProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenCopilot?: () => void;
  onOpenJudgeTour?: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenCopilot,
  onOpenJudgeTour,
}) => {
  return (
    <aside
      className="studio-sidebar-nav"
      style={{
        width: "64px",
        minWidth: "64px",
        flexShrink: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 0",
        backgroundColor: "var(--studio-panel-bg)",
        borderRight: "1px solid var(--studio-panel-border)",
        userSelect: "none",
        zIndex: 999,
        position: "relative",
      }}
    >
      {/* Top Studio Brand Icon */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
        <div
          title="Gamoventure • Premier League Studio"
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #7c3aed, #00e5ff)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            boxShadow: "0 4px 12px rgba(124, 58, 237, 0.4)",
            cursor: "pointer",
          }}
          onClick={() => onSelectTab("dashboard")}
        >
          <IonIcon icon={shieldOutline} style={{ fontSize: "22px" }} />
        </div>

        {/* Navigation Items */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <button
            onClick={() => onSelectTab("dashboard")}
            title="Dashboard Overview"
            style={{
              background: activeTab === "dashboard" ? "rgba(124, 58, 237, 0.18)" : "transparent",
              border: "none",
              borderRadius: "10px",
              padding: "10px",
              cursor: "pointer",
              color: activeTab === "dashboard" ? "var(--ion-color-primary)" : "var(--studio-subtext)",
              transition: "all 0.2s ease",
            }}
          >
            <IonIcon icon={homeOutline} style={{ fontSize: "20px", display: "block" }} />
          </button>

          <button
            onClick={() => onSelectTab("pitch")}
            title="Live Pitch Radar"
            style={{
              background: activeTab === "pitch" ? "rgba(124, 58, 237, 0.18)" : "transparent",
              border: "none",
              borderRadius: "10px",
              padding: "10px",
              cursor: "pointer",
              color: activeTab === "pitch" ? "var(--ion-color-primary)" : "var(--studio-subtext)",
              transition: "all 0.2s ease",
            }}
          >
            <IonIcon icon={footballOutline} style={{ fontSize: "20px", display: "block" }} />
          </button>

          <button
            onClick={() => onSelectTab("tactical")}
            title="Tactical Intelligence"
            style={{
              background: activeTab === "tactical" ? "rgba(124, 58, 237, 0.18)" : "transparent",
              border: "none",
              borderRadius: "10px",
              padding: "10px",
              cursor: "pointer",
              color: activeTab === "tactical" ? "var(--ion-color-primary)" : "var(--studio-subtext)",
              transition: "all 0.2s ease",
            }}
          >
            <IonIcon icon={analyticsOutline} style={{ fontSize: "20px", display: "block" }} />
          </button>

          <button
            onClick={() => onSelectTab("personas")}
            title="Multi-Persona Stream"
            style={{
              background: activeTab === "personas" ? "rgba(124, 58, 237, 0.18)" : "transparent",
              border: "none",
              borderRadius: "10px",
              padding: "10px",
              cursor: "pointer",
              color: activeTab === "personas" ? "var(--ion-color-primary)" : "var(--studio-subtext)",
              transition: "all 0.2s ease",
            }}
          >
            <IonIcon icon={peopleOutline} style={{ fontSize: "20px", display: "block" }} />
          </button>

          <button
            onClick={() => onSelectTab("diagnostics")}
            title="Studio Diagnostics"
            style={{
              background: activeTab === "diagnostics" ? "rgba(124, 58, 237, 0.18)" : "transparent",
              border: "none",
              borderRadius: "10px",
              padding: "10px",
              cursor: "pointer",
              color: activeTab === "diagnostics" ? "var(--ion-color-primary)" : "var(--studio-subtext)",
              transition: "all 0.2s ease",
            }}
          >
            <IonIcon icon={settingsOutline} style={{ fontSize: "20px", display: "block" }} />
          </button>

          {onOpenCopilot && (
            <button
              onClick={onOpenCopilot}
              title="Tactical Copilot (Azure MCP) [Cmd+K]"
              style={{
                background: "rgba(0, 229, 255, 0.12)",
                border: "1px solid rgba(0, 229, 255, 0.3)",
                borderRadius: "10px",
                padding: "10px",
                cursor: "pointer",
                color: "#00e5ff",
                boxShadow: "0 0 10px rgba(0, 229, 255, 0.2)",
                transition: "all 0.2s ease",
              }}
            >
              <IonIcon icon={sparklesOutline} style={{ fontSize: "20px", display: "block" }} />
            </button>
          )}

          {onOpenJudgeTour && (
            <button
              onClick={onOpenJudgeTour}
              title="🏆 Judge Quick Tour • Hero Tech Stack [Cmd+J]"
              style={{
                background: "linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.3) 100%)",
                border: "1px solid rgba(245, 158, 11, 0.65)",
                borderRadius: "10px",
                padding: "8px",
                cursor: "pointer",
                color: "#fbbf24",
                boxShadow: "0 0 14px rgba(245, 158, 11, 0.35)",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                lineHeight: 1,
              }}
            >
              <span role="img" aria-label="Judge Quick Tour">🏆</span>
            </button>
          )}
        </nav>
      </div>

      {/* Bottom Section: Profile */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
        <div style={{ color: "var(--studio-subtext)", cursor: "pointer" }} title="Broadcaster Profile">
          <IonIcon icon={personCircleOutline} style={{ fontSize: "28px" }} />
        </div>
      </div>
    </aside>
  );
};
