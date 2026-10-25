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
} from "ionicons/icons";

interface SidebarNavProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeTab,
  onSelectTab,
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
