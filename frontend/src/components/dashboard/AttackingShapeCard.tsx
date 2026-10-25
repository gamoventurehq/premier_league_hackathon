import React from "react";
import { IonIcon } from "@ionic/react";
import { walkOutline } from "ionicons/icons";

export const AttackingShapeCard: React.FC = () => {
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
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", minWidth: 0, flexWrap: "wrap", gap: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
          <IonIcon icon={walkOutline} style={{ color: "#10b981", fontSize: "16px", flexShrink: 0 }} />
          <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--ion-text-color)", whiteSpace: "nowrap" }}>
            Attacking Shape
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0, flexWrap: "wrap" }}>
          <span style={{ fontSize: "10px", color: "var(--studio-subtext)", fontFamily: "monospace" }}>
            LIVE 5Hz
          </span>
          <span style={{ fontSize: "11px", color: "var(--studio-subtext)", fontWeight: 700, whiteSpace: "nowrap" }}>
            Manchester City
          </span>
        </div>
      </div>

      {/* Attacking Shape Pitch Visualizer */}
      <div
        style={{
          width: "100%",
          aspectRatio: "16/9",
          backgroundColor: "#166534",
          backgroundImage: "radial-gradient(ellipse at center, #15803d 0%, #14532d 100%)",
          borderRadius: "10px",
          position: "relative",
          overflow: "hidden",
          border: "1.5px solid rgba(255, 255, 255, 0.15)",
        }}
      >
        {/* Pitch Markings */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "25%",
            right: "25%",
            height: "40%",
            borderBottom: "1.5px solid rgba(255, 255, 255, 0.3)",
            borderLeft: "1.5px solid rgba(255, 255, 255, 0.3)",
            borderRight: "1.5px solid rgba(255, 255, 255, 0.3)",
          }}
        />

        {/* Forward Progression Arrow (Tactical Centroid Momentum) */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "20%",
            bottom: "20%",
            width: "36px",
            transform: "translateX(-50%)",
            backgroundColor: "rgba(255, 255, 255, 0.12)",
            clipPath: "polygon(50% 0%, 0% 30%, 35% 30%, 35% 100%, 65% 100%, 65% 30%, 100% 30%)",
          }}
        />

        {/* Tactical Positions of Key Contributors */}
        {[
          { num: 9, x: "50%", y: "22%" },
          { num: 17, x: "36%", y: "42%" },
          { num: 20, x: "64%", y: "42%" },
          { num: 47, x: "78%", y: "55%" },
          { num: 10, x: "22%", y: "55%" },
          { num: 16, x: "50%", y: "62%" },
          { num: 24, x: "26%", y: "78%" },
          { num: 2, x: "74%", y: "78%" },
          { num: 3, x: "42%", y: "85%" },
          { num: 25, x: "58%", y: "85%" },
        ].map((node, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: node.x,
              top: node.y,
              transform: "translate(-50%, -50%)",
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              backgroundColor: "#080d16",
              border: "1.5px solid #00e5ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "8px",
              fontWeight: 900,
              color: "#ffffff",
              boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
            }}
          >
            {node.num}
          </div>
        ))}
      </div>
    </div>
  );
};
