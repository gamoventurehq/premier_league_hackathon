import React from "react";
import { IonIcon } from "@ionic/react";
import { walkOutline } from "ionicons/icons";
import { useBaseMemory, baseMemory } from "../../store/baseMemory";

// Tactical Attacking Shape Base Anchors (Rest defense at base/bottom, forwards at arrow tip/top)
const MAN_CITY_ATTACKING_BASE: Record<string, { x: number; y: number }> = {
  home_10: { x: 50, y: 22 }, // E. Haaland (ST)
  home_9: { x: 76, y: 28 },  // P. Foden (RW)
  home_11: { x: 24, y: 28 }, // J. Grealish (LW)
  home_7: { x: 36, y: 46 },  // K. De Bruyne (CM)
  home_8: { x: 64, y: 46 },  // B. Silva (CM)
  home_6: { x: 50, y: 62 },  // Rodri (DM)
  home_5: { x: 22, y: 76 },  // J. Gvardiol (LB)
  home_2: { x: 78, y: 76 },  // K. Walker (RB)
  home_3: { x: 40, y: 86 },  // R. Dias (CB)
  home_4: { x: 60, y: 86 },  // M. Akanji (CB)
};

const ARSENAL_ATTACKING_BASE: Record<string, { x: number; y: number }> = {
  away_11: { x: 50, y: 22 }, // K. Havertz (ST)
  away_8: { x: 76, y: 28 },  // B. Saka (RW)
  away_10: { x: 24, y: 28 }, // G. Martinelli (LW)
  away_9: { x: 50, y: 42 },  // M. Odegaard (AM)
  away_7: { x: 36, y: 58 },  // D. Rice (DM)
  away_6: { x: 64, y: 58 },  // T. Partey (DM)
  away_5: { x: 22, y: 76 },  // J. Timber (LB)
  away_2: { x: 78, y: 76 },  // B. White (RB)
  away_4: { x: 40, y: 86 },  // Gabriel (CB)
  away_3: { x: 60, y: 86 },  // W. Saliba (CB)
};

export const AttackingShapeCard: React.FC = () => {
  const score = useBaseMemory((s) => s.score);
  const homeLineup = useBaseMemory((s) => s.homeLineup);
  const awayLineup = useBaseMemory((s) => s.awayLineup);
  const selectedPlayerId = useBaseMemory((s) => s.selectedPlayerId);
  const currentFrame = useBaseMemory((s) => s.currentFrame);
  const controlIndex = useBaseMemory((s) => s.blackboard.control_index);

  // Dynamically resolve active team attacking shape from Single Core Memory
  const isAwaySelected = awayLineup.some((p) => p.id === selectedPlayerId);
  const activeLineup = isAwaySelected ? awayLineup : homeLineup;
  const activeMeta = isAwaySelected ? score.awayMeta : score.homeMeta;
  const baseMap = isAwaySelected ? ARSENAL_ATTACKING_BASE : MAN_CITY_ATTACKING_BASE;

  // Outfield players forming the attacking shape
  const outfield = activeLineup.filter((p) => p.pos !== "GK");

  // Dynamic collective momentum shift from live ball & rhythm
  const ball = currentFrame?.ball;
  const ballShiftX = ball ? (ball.y - 34.0) * 0.25 : 0;
  const ballSurgeY = ball ? (ball.x - 52.5) * 0.12 : 0;

  // Compute live dynamic coordinates for each player node
  const liveNodes = outfield.map((player) => {
    const base = baseMap[player.id] || { x: 50, y: 50 };
    const isSelected = selectedPlayerId === player.id;

    // Real-time micro-drift driven by 5Hz physics engine
    const driftX = Math.sin(player.x * 0.5 + player.number) * 3.5 + ballShiftX;
    const driftY = Math.cos(player.y * 0.4 + player.number) * 2.8 - ballSurgeY - (player.speed_kmh && player.speed_kmh > 14 ? 3.5 : 0);

    const x = Math.max(12, Math.min(88, base.x + driftX));
    const y = Math.max(14, Math.min(88, base.y + driftY));

    return {
      player,
      isSelected,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
    };
  });

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
            LIVE 10Hz / 5Hz
          </span>
          <span style={{ fontSize: "11px", color: activeMeta.color, fontWeight: 700, whiteSpace: "nowrap" }}>
            {activeMeta.name}
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
        {/* Pitch Penalty Box Markings */}
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
            pointerEvents: "none",
          }}
        />

        {/* Forward Progression Arrow (Pulsing dynamically with live Control Index) */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "18%",
            bottom: "18%",
            width: "38px",
            transform: "translateX(-50%)",
            backgroundColor: `rgba(255, 255, 255, ${0.12 + (controlIndex / 100) * 0.18})`,
            clipPath: "polygon(50% 0%, 0% 30%, 35% 30%, 35% 100%, 65% 100%, 65% 30%, 100% 30%)",
            pointerEvents: "none",
            transition: "background-color 0.4s ease",
          }}
        />

        {/* Dynamic Structural Connecting Vectors */}
        <svg
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        >
          {liveNodes.slice(0, 4).map((node, i) => {
            const next = liveNodes[(i + 1) % 4];
            return (
              <line
                key={`line-${i}`}
                x1={`${node.x}%`}
                y1={`${node.y}%`}
                x2={`${next.x}%`}
                y2={`${next.y}%`}
                stroke="rgba(255, 255, 255, 0.15)"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
            );
          })}
        </svg>

        {/* Live Outfield Player Nodes (Smooth 5Hz Continuous Motion) */}
        {liveNodes.map(({ player, isSelected, x, y }) => (
          <div
            key={player.id}
            onClick={() => baseMemory.setSelectedPlayer(player.id)}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              transform: "translate(-50%, -50%)",
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              backgroundColor: isSelected ? activeMeta.color : "#080d16",
              border: isSelected ? "2px solid #ffffff" : `1.5px solid ${activeMeta.color}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "9px",
              fontWeight: 900,
              color: isSelected ? "#080d16" : "#ffffff",
              boxShadow: isSelected
                ? `0 0 10px ${activeMeta.color}`
                : player.is_ball_carrier
                ? "0 0 10px #ffd600"
                : "0 2px 4px rgba(0,0,0,0.4)",
              cursor: "pointer",
              transition: "left 0.25s linear, top 0.25s linear, box-shadow 0.2s ease",
              zIndex: isSelected ? 5 : 2,
            }}
            title={`${player.name} (#${player.number})`}
          >
            {player.number}
          </div>
        ))}
      </div>
    </div>
  );
};
