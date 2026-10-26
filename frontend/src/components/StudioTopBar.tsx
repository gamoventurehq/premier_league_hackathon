import React from "react";
import { IonHeader, IonToolbar, IonIcon } from "@ionic/react";
import { radioOutline, micOutline } from "ionicons/icons";
import { JudgeQuickTourPill } from "./JudgeQuickTourPill";
import { useBaseMemory } from "../store/baseMemory";

interface StudioTopBarProps {
  title?: string;
  subtitle?: string;
  onOpenRecap?: () => void;
  showRecap?: boolean;
}

export const StudioTopBar: React.FC<StudioTopBarProps> = ({
  title = "Premier League Studio",
  subtitle = "Synthetic Match Insights",
  onOpenRecap,
  showRecap = false,
}) => {
  const serverStatus = useBaseMemory((s) => s.serverStatus);

  return (
    <>
      {/* 📱 Mobile & Compact Viewports (< 768px): Unified iOS Cupertino Top Bar with zero overlap */}
      <IonHeader mode="ios" className="ion-hide-md-up studio-mobile-header-root">
        <IonToolbar mode="ios" className="studio-mobile-toolbar">
          <div className="studio-mobile-toolbar-inner">
            {/* Left: Gamoventure Brand Pill & Page Title */}
            <div className="studio-mobile-nav-left">
              <span className="studio-brand-badge">
                Gamoventure
              </span>
              <span className="studio-mobile-nav-title">
                {title}
              </span>
            </div>

            {/* Right: Actions, Tour Pill & Live Status (flex-shrink-0, perfectly spaced) */}
            <div className="studio-mobile-nav-right">
              {showRecap && onOpenRecap && (
                <button
                  type="button"
                  onClick={onOpenRecap}
                  className="studio-mobile-recap-btn"
                  title="Open Half-Time Studio Teleprompter"
                >
                  <IonIcon icon={micOutline} style={{ fontSize: "13px" }} />
                  <span className="studio-mobile-recap-text">Recap</span>
                </button>
              )}

              <JudgeQuickTourPill compact={true} />

              <div
                className={`studio-mobile-status-dot ${serverStatus.isConnected ? "live" : "sync"}`}
                title={serverStatus.isConnected ? "Live 10Hz Engine / 5Hz Stream" : "Synthetic Fallback"}
              >
                <span className="studio-status-pulse" />
                <span className="studio-status-label">
                  {serverStatus.isConnected ? "10Hz" : "Sync"}
                </span>
              </div>
            </div>
          </div>
        </IonToolbar>
      </IonHeader>

      {/* 💻 Desktop & Tablet Viewports (>= 768px): Broadcast Studio Bar */}
      <header className="studio-header-bar ion-hide-md-down">
        {/* Brand Info */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
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
              flexShrink: 0,
            }}
          >
            Gamoventure
          </span>
          <span
            style={{
              fontSize: "14px",
              fontWeight: 800,
              color: "#f8fafc",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}: <span style={{ color: "#94a3b8", fontWeight: 500 }}>{subtitle}</span>
          </span>
        </div>

        {/* Right Controls: Judge Tour, Teleprompter & Server Live Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexShrink: 0 }}>
          <JudgeQuickTourPill />

          {showRecap && onOpenRecap && (
            <button
              onClick={onOpenRecap}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "transparent",
                border: "none",
                color: "#cbd5e1",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                padding: "6px 8px",
                borderRadius: "6px",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#cbd5e1")}
              title="Open Automated Half-Time Studio Teleprompter & Video Chapters"
            >
              <IonIcon icon={micOutline} style={{ fontSize: "14px", color: "#94a3b8" }} />
              <span>HT Studio Teleprompter</span>
            </button>
          )}

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "11px",
              color: "#94a3b8",
              fontWeight: 500,
              paddingLeft: "4px",
            }}
            title={serverStatus.isConnected ? "Simulation Engine 10Hz active with 5Hz broadcast pipeline" : "Running on fallback synthetic generator"}
          >
            <span
              style={{
                display: "inline-block",
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: serverStatus.isConnected ? "#10b981" : "#f59e0b",
              }}
            />
            <span>
              {serverStatus.isConnected ? "✓ Engine 10Hz · Stream 5Hz" : "Synthetic Fallback"}
            </span>
          </div>
        </div>
      </header>
    </>
  );
};
