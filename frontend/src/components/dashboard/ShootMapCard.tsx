import React, { useState } from "react";
import { IonIcon } from "@ionic/react";
import { locateOutline, personOutline } from "ionicons/icons";

export const ShootMapCard: React.FC = () => {
  const [team, setTeam] = useState<"home" | "away">("home");

  return (
    <div
      style={{
        backgroundColor: "var(--studio-panel-bg)",
        border: "1px solid var(--studio-panel-border)",
        borderRadius: "16px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      {/* Header with Team Switcher */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <IonIcon icon={locateOutline} style={{ color: "#00e5ff", fontSize: "16px" }} />
          <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--ion-text-color)" }}>
            Shoot Map
          </span>
        </div>

        <div style={{ display: "flex", gap: "4px" }}>
          <button
            onClick={() => setTeam("home")}
            style={{
              padding: "3px 8px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: team === "home" ? "rgba(0, 229, 255, 0.2)" : "transparent",
              color: team === "home" ? "#00e5ff" : "var(--studio-subtext)",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Man City
          </button>
          <button
            onClick={() => setTeam("away")}
            style={{
              padding: "3px 8px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: team === "away" ? "rgba(244, 63, 94, 0.2)" : "transparent",
              color: team === "away" ? "#f43f5e" : "var(--studio-subtext)",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Arsenal
          </button>
        </div>
      </div>

      {/* Penalty Box Shoot Map Pitch */}
      <div
        style={{
          width: "100%",
          aspectRatio: "16/9",
          backgroundColor: "#166534",
          backgroundImage: "radial-gradient(ellipse at top, #15803d 0%, #14532d 100%)",
          borderRadius: "10px",
          position: "relative",
          overflow: "hidden",
          border: "1.5px solid rgba(255, 255, 255, 0.15)",
        }}
      >
        {/* Goal Post & Penalty Box Lines */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "22%",
            right: "22%",
            height: "70%",
            borderBottom: "1.5px solid rgba(255, 255, 255, 0.35)",
            borderLeft: "1.5px solid rgba(255, 255, 255, 0.35)",
            borderRight: "1.5px solid rgba(255, 255, 255, 0.35)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "35%",
            right: "35%",
            height: "35%",
            borderBottom: "1.5px solid rgba(255, 255, 255, 0.35)",
            borderLeft: "1.5px solid rgba(255, 255, 255, 0.35)",
            borderRight: "1.5px solid rgba(255, 255, 255, 0.35)",
          }}
        />

        {/* Shot Locations (Synthetic Data based on match events) */}
        {[
          { x: "48%", y: "25%", size: 18, isGoal: true, label: "Goal" },
          { x: "42%", y: "45%", size: 14, isGoal: false, label: "Saved" },
          { x: "58%", y: "35%", size: 10, isGoal: false, label: "Blocked" },
          { x: "32%", y: "55%", size: 8, isGoal: false, label: "Miss" },
          { x: "65%", y: "60%", size: 12, isGoal: false, label: "Saved" },
        ].map((shot, idx) => (
          <div
            key={idx}
            style={{
              position: "absolute",
              left: shot.x,
              top: shot.y,
              transform: "translate(-50%, -50%)",
              width: `${shot.size}px`,
              height: `${shot.size}px`,
              borderRadius: "50%",
              backgroundColor: shot.isGoal ? "#ffd600" : "rgba(255, 255, 255, 0.4)",
              border: shot.isGoal ? "2px solid #ffffff" : "1px solid rgba(255, 255, 255, 0.6)",
              boxShadow: shot.isGoal ? "0 0 10px #ffd600" : "none",
            }}
          />
        ))}

        {/* Selected Shot Detail Tooltip Card */}
        <div
          style={{
            position: "absolute",
            right: "8px",
            bottom: "8px",
            backgroundColor: "rgba(15, 23, 42, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "8px",
            padding: "8px 10px",
            fontSize: "10px",
            color: "#f8fafc",
            backdropFilter: "blur(4px)",
            minWidth: "110px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
            <div
              style={{
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                backgroundColor: "#7c3aed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IonIcon icon={personOutline} style={{ fontSize: "10px", color: "#ffffff" }} />
            </div>
            <strong style={{ fontSize: "11px" }}>E. Haaland 42'</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8" }}>
            <span>xG</span>
            <strong style={{ color: "#10b981" }}>0.74</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8" }}>
            <span>xGOT</span>
            <strong style={{ color: "#00e5ff" }}>0.81</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8" }}>
            <span>Foot</span>
            <strong style={{ color: "#ffffff" }}>Left</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
