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
  sunnyOutline,
  moonOutline,
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
        backgroundColor: "#070c18",
        borderRight: "1px solid rgba(255, 255, 255, 0.08)",
        userSelect: "none",
        zIndex: 999,
        position: "relative",
      }}
    >
      {/* Top Section: Brand Icon & Core Destination Navigation */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", width: "100%" }}>
        {/* Brand Crest */}
        <div
          title="Gamoventure • Premier League Studio"
          aria-label="Gamoventure Premier League Studio"
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: "#7c3aed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            cursor: "pointer",
            marginBottom: "8px",
          }}
          onClick={() => onSelectTab("dashboard")}
        >
          <IonIcon icon={shieldOutline} style={{ fontSize: "20px" }} />
        </div>

        {/* Core Navigation Items (Consistent neutral inactive, single clear active accent) */}
        <nav style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", width: "100%" }}>
          <button
            onClick={() => onSelectTab("dashboard")}
            title="Dashboard Overview"
            aria-label="Dashboard Overview"
            style={{
              background: activeTab === "dashboard" ? "rgba(56, 189, 248, 0.12)" : "transparent",
              border: activeTab === "dashboard" ? "1px solid rgba(56, 189, 248, 0.3)" : "1px solid transparent",
              borderRadius: "8px",
              width: "40px",
              height: "40px",
              cursor: "pointer",
              color: activeTab === "dashboard" ? "#38bdf8" : "#94a3b8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
            }}
          >
            <IonIcon icon={homeOutline} style={{ fontSize: "20px" }} />
          </button>

          <button
            onClick={() => onSelectTab("pitch")}
            title="Live Pitch Radar"
            aria-label="Live Pitch Radar"
            style={{
              background: activeTab === "pitch" ? "rgba(56, 189, 248, 0.12)" : "transparent",
              border: activeTab === "pitch" ? "1px solid rgba(56, 189, 248, 0.3)" : "1px solid transparent",
              borderRadius: "8px",
              width: "40px",
              height: "40px",
              cursor: "pointer",
              color: activeTab === "pitch" ? "#38bdf8" : "#94a3b8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
            }}
          >
            <IonIcon icon={footballOutline} style={{ fontSize: "20px" }} />
          </button>

          <button
            onClick={() => onSelectTab("tactical")}
            title="Tactical Intelligence"
            aria-label="Tactical Intelligence"
            style={{
              background: activeTab === "tactical" ? "rgba(56, 189, 248, 0.12)" : "transparent",
              border: activeTab === "tactical" ? "1px solid rgba(56, 189, 248, 0.3)" : "1px solid transparent",
              borderRadius: "8px",
              width: "40px",
              height: "40px",
              cursor: "pointer",
              color: activeTab === "tactical" ? "#38bdf8" : "#94a3b8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
            }}
          >
            <IonIcon icon={analyticsOutline} style={{ fontSize: "20px" }} />
          </button>

          <button
            onClick={() => onSelectTab("personas")}
            title="Multi-Persona Stream"
            aria-label="Multi-Persona Stream"
            style={{
              background: activeTab === "personas" ? "rgba(56, 189, 248, 0.12)" : "transparent",
              border: activeTab === "personas" ? "1px solid rgba(56, 189, 248, 0.3)" : "1px solid transparent",
              borderRadius: "8px",
              width: "40px",
              height: "40px",
              cursor: "pointer",
              color: activeTab === "personas" ? "#38bdf8" : "#94a3b8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
            }}
          >
            <IonIcon icon={peopleOutline} style={{ fontSize: "20px" }} />
          </button>

          <button
            onClick={() => onSelectTab("diagnostics")}
            title="Studio Diagnostics"
            aria-label="Studio Diagnostics"
            style={{
              background: activeTab === "diagnostics" ? "rgba(56, 189, 248, 0.12)" : "transparent",
              border: activeTab === "diagnostics" ? "1px solid rgba(56, 189, 248, 0.3)" : "1px solid transparent",
              borderRadius: "8px",
              width: "40px",
              height: "40px",
              cursor: "pointer",
              color: activeTab === "diagnostics" ? "#38bdf8" : "#94a3b8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
            }}
          >
            <IonIcon icon={settingsOutline} style={{ fontSize: "20px" }} />
          </button>

          {/* Divider between core navigation and tools */}
          <div
            style={{
              width: "28px",
              height: "1px",
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              margin: "4px 0",
            }}
          />

          {/* Tactical Copilot Tool */}
          {onOpenCopilot && (
            <button
              onClick={onOpenCopilot}
              title="Tactical Copilot (Azure MCP) [Cmd+K]"
              aria-label="Tactical Copilot"
              style={{
                background: "transparent",
                border: "1px solid transparent",
                borderRadius: "8px",
                width: "40px",
                height: "40px",
                cursor: "pointer",
                color: "#94a3b8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#38bdf8";
                e.currentTarget.style.backgroundColor = "rgba(56, 189, 248, 0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#94a3b8";
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <IonIcon icon={sparklesOutline} style={{ fontSize: "19px" }} />
            </button>
          )}
        </nav>
      </div>

      {/* Bottom Section: Profile */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{ color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          title="Broadcaster Profile"
          aria-label="Broadcaster Profile"
        >
          <IonIcon icon={personCircleOutline} style={{ fontSize: "26px" }} />
        </div>
      </div>
    </aside>
  );
};
