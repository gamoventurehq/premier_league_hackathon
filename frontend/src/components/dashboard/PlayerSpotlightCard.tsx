import React from "react";
import { IonIcon } from "@ionic/react";
import { trophyOutline, openOutline, personOutline } from "ionicons/icons";
import { useBaseMemory } from "../../store/baseMemory";

export const PlayerSpotlightCard: React.FC = () => {
  const selectedPlayerId = useBaseMemory((s) => s.selectedPlayerId);

  return (
    <div
      style={{
        backgroundColor: "var(--studio-panel-bg)",
        border: "1px solid var(--studio-panel-border)",
        borderRadius: "16px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
      }}
    >
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <IonIcon icon={trophyOutline} style={{ color: "var(--ion-color-primary)", fontSize: "16px" }} />
          <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--ion-text-color)" }}>
            Player of the Match
          </span>
        </div>
        <IonIcon icon={openOutline} style={{ fontSize: "15px", color: "var(--studio-subtext)", cursor: "pointer" }} />
      </div>

      {/* Player Profile & Rating */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              backgroundColor: "rgba(124, 58, 237, 0.15)",
              border: "2px solid #7c3aed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#7c3aed",
            }}
          >
            <IonIcon icon={personOutline} style={{ fontSize: "22px" }} />
          </div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--ion-text-color)" }}>
              K. De Bruyne
            </div>
            <div style={{ fontSize: "11px", color: "var(--studio-subtext)" }}>
              Manchester City • #{selectedPlayerId ? selectedPlayerId.replace("home_", "") : "17"}
            </div>
          </div>
        </div>

        {/* Rating Badge */}
        <div
          style={{
            backgroundColor: "#10b981",
            color: "#ffffff",
            fontWeight: 900,
            fontSize: "13px",
            padding: "4px 8px",
            borderRadius: "6px",
            boxShadow: "0 2px 6px rgba(16, 185, 129, 0.4)",
          }}
        >
          8.8
        </div>
      </div>

      {/* Metrics Row: 4 Attribute Bars + Circular Accuracy Target */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: "16px", alignItems: "center" }}>
        {/* Attribute Bars */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[
            { label: "Shoot", val: 82, color: "#10b981" },
            { label: "Passing", val: 94, color: "#00e5ff" },
            { label: "Dribbling", val: 85, color: "#3b82f6" },
            { label: "Defending", val: 68, color: "#f59e0b" },
          ].map((attr) => (
            <div key={attr.label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "10px", color: "var(--studio-subtext)", width: "50px" }}>
                {attr.label}
              </span>
              <div
                style={{
                  flex: 1,
                  height: "5px",
                  borderRadius: "3px",
                  backgroundColor: "var(--studio-inner-bg)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${attr.val}%`,
                    height: "100%",
                    backgroundColor: attr.color,
                    borderRadius: "3px",
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Circular Shot Radar / Target */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "8px",
            backgroundColor: "var(--studio-inner-bg)",
            borderRadius: "10px",
            border: "1px solid var(--studio-panel-border)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              border: "1.5px dashed var(--studio-subtext)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            {/* Center target crosshair */}
            <div style={{ width: "100%", height: "1px", backgroundColor: "rgba(255,255,255,0.2)", position: "absolute" }} />
            <div style={{ height: "100%", width: "1px", backgroundColor: "rgba(255,255,255,0.2)", position: "absolute" }} />
            {/* Ball hit spot */}
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#ffd600",
                position: "absolute",
                top: "14px",
                right: "12px",
                boxShadow: "0 0 6px #ffd600",
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", marginTop: "6px", fontSize: "9px" }}>
            <span style={{ color: "var(--studio-subtext)" }}>Acc: <strong>78%</strong></span>
            <span style={{ color: "var(--studio-subtext)" }}>Avg: <strong>85</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
