import React, { useState, useMemo } from "react";
import { IonIcon } from "@ionic/react";
import { walkOutline, pulseOutline } from "ionicons/icons";
import { useBaseMemory, baseMemory } from "../../store/baseMemory";

interface TacticalNode {
  id: string;
  num: number;
  name: string;
  role: string;
  baseX: number; // percentage 0-100
  baseY: number; // percentage 0-100
  seed: number;
}

const CITY_NODES: TacticalNode[] = [
  { id: "home_10", num: 9, name: "Haaland", role: "ST", baseX: 50, baseY: 22, seed: 1.1 },
  { id: "home_7", num: 17, name: "De Bruyne", role: "CM", baseX: 36, baseY: 42, seed: 2.3 },
  { id: "home_8", num: 20, name: "B. Silva", role: "CM", baseX: 64, baseY: 42, seed: 3.5 },
  { id: "home_9", num: 47, name: "Foden", role: "RW", baseX: 78, baseY: 55, seed: 4.2 },
  { id: "home_11", num: 10, name: "Grealish", role: "LW", baseX: 22, baseY: 55, seed: 5.4 },
  { id: "home_6", num: 16, name: "Rodri", role: "DM", baseX: 50, baseY: 62, seed: 6.1 },
  { id: "home_5", num: 24, name: "Gvardiol", role: "LB", baseX: 26, baseY: 78, seed: 7.3 },
  { id: "home_2", num: 2, name: "Walker", role: "RB", baseX: 74, baseY: 78, seed: 8.5 },
  { id: "home_3", num: 3, name: "Dias", role: "CB", baseX: 42, baseY: 85, seed: 9.2 },
  { id: "home_4", num: 25, name: "Akanji", role: "CB", baseX: 58, baseY: 85, seed: 10.4 },
];

const ARSENAL_NODES: TacticalNode[] = [
  { id: "away_11", num: 29, name: "Havertz", role: "ST", baseX: 50, baseY: 24, seed: 1.3 },
  { id: "away_9", num: 8, name: "Ødegaard", role: "AM", baseX: 60, baseY: 42, seed: 2.5 },
  { id: "away_10", num: 11, name: "Martinelli", role: "LW", baseX: 24, baseY: 52, seed: 3.7 },
  { id: "away_8", num: 7, name: "Saka", role: "RW", baseX: 76, baseY: 52, seed: 4.8 },
  { id: "away_7", num: 41, name: "Rice", role: "DM", baseX: 40, baseY: 62, seed: 5.9 },
  { id: "away_6", num: 5, name: "Partey", role: "DM", baseX: 60, baseY: 64, seed: 6.6 },
  { id: "away_5", num: 12, name: "Timber", role: "LB", baseX: 25, baseY: 78, seed: 7.7 },
  { id: "away_2", num: 4, name: "White", role: "RB", baseX: 75, baseY: 78, seed: 8.8 },
  { id: "away_4", num: 6, name: "Gabriel", role: "CB", baseX: 42, baseY: 85, seed: 9.5 },
  { id: "away_3", num: 2, name: "Saliba", role: "CB", baseX: 58, baseY: 85, seed: 10.9 },
];

export const AttackingShapeCard: React.FC = () => {
  const [team, setTeam] = useState<"home" | "away">("home");
  const matchClock = useBaseMemory((s) => s.matchClock);
  const currentFrame = useBaseMemory((s) => s.currentFrame);
  const selectedPlayerId = useBaseMemory((s) => s.selectedPlayerId);

  const baseNodes = team === "home" ? CITY_NODES : ARSENAL_NODES;
  const teamColor = team === "home" ? "#00e5ff" : "#f43f5e";
  const teamBg = team === "home" ? "rgba(0, 229, 255, 0.18)" : "rgba(244, 63, 94, 0.18)";

  // Tactical phase keyed to matchClock
  const tacticalPhase = useMemo(() => {
    if (matchClock < 1800) {
      return { name: "Opening Build-up", tag: "CONTROL", color: "#38bdf8" };
    }
    if (matchClock < 3600) {
      return { name: "Low-Block Siege", tag: "TERRITORIAL PIN", color: "#10b981" };
    }
    if (matchClock < 4800) {
      return { name: "Flank Overload", tag: "WIDE SQUEEZE", color: "#c084fc" };
    }
    return { name: "Late Transition", tag: "COUNTER RISK", color: "#fb923c" };
  }, [matchClock]);

  // Calculate dynamic node positions synchronized with match clock & frame telemetry
  const { dynamicNodes, polygonPoints, shapeWidthM, shapeDepthM } = useMemo(() => {
    const t = matchClock + (currentFrame ? (currentFrame.frame_id % 30) * 0.05 : 0);
    // In siege phase (1800s - 3600s), compress shape forward
    const forwardSqueeze = (matchClock >= 1800 && matchClock < 3600) ? -4 : 0;

    const calculated = baseNodes.map((node) => {
      // Dynamic kinematic sway simulating team pressing & phase transition
      const dx = Math.sin(t * 0.9 + node.seed) * 2.8 + Math.cos(t * 0.4 + node.seed) * 1.2;
      const dy = Math.cos(t * 0.75 + node.seed) * 2.2 + Math.sin(t * 0.35 + node.seed) * 1.0 + forwardSqueeze;

      const posX = Math.max(12, Math.min(88, node.baseX + dx));
      const posY = Math.max(12, Math.min(88, node.baseY + dy));

      return {
        ...node,
        x: posX,
        y: posY,
      };
    });

    // Hull coordinates order: LB -> CBs -> RB -> RW -> ST -> LW -> LB
    // City: Gvardiol(24) -> Dias(3) -> Akanji(25) -> Walker(2) -> Foden(47) -> Haaland(9) -> Grealish(10)
    // Arsenal: Timber(12) -> Gabriel(6) -> Saliba(2) -> White(4) -> Saka(7) -> Havertz(29) -> Martinelli(11)
    const hullIndices = team === "home" ? [6, 8, 9, 7, 3, 0, 4] : [6, 8, 9, 7, 3, 0, 2];
    const points = hullIndices.map((idx) => `${calculated[idx].x},${calculated[idx].y}`).join(" ");

    const xs = calculated.map((n) => n.x);
    const ys = calculated.map((n) => n.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    // Approximate spatial dimensions on 68m x 105m pitch
    const widthM = ((maxX - minX) / 100) * 68.0;
    const depthM = ((maxY - minY) / 100) * 52.5;

    return {
      dynamicNodes: calculated,
      polygonPoints: points,
      shapeWidthM: widthM.toFixed(1),
      shapeDepthM: depthM.toFixed(1),
    };
  }, [baseNodes, matchClock, currentFrame, team]);

  const handleSelectNode = (nodeId: string) => {
    baseMemory.setSelectedPlayer(nodeId);
  };

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
      {/* Header with Team Switcher */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", minWidth: 0, flexWrap: "wrap", gap: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
          <IonIcon icon={walkOutline} style={{ color: "#10b981", fontSize: "16px", flexShrink: 0 }} />
          <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--ion-text-color)", whiteSpace: "nowrap" }}>
            Attacking Shape
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "3px", backgroundColor: "rgba(16, 185, 129, 0.15)", padding: "1px 6px", borderRadius: "4px" }}>
            <IonIcon icon={pulseOutline} style={{ color: "#10b981", fontSize: "11px", animation: "pulse 1.5s infinite" }} />
            <span style={{ fontSize: "9.5px", color: "#10b981", fontWeight: 800, fontFamily: "monospace" }}>
              LIVE 5Hz
            </span>
          </div>
          <span
            style={{
              fontSize: "9px",
              fontWeight: 800,
              color: tacticalPhase.color,
              backgroundColor: `${tacticalPhase.color}1f`,
              padding: "1px 6px",
              borderRadius: "4px",
              border: `1px solid ${tacticalPhase.color}44`,
              whiteSpace: "nowrap",
            }}
          >
            {tacticalPhase.name}
          </span>
        </div>

        {/* Team Selector Toggle */}
        <div style={{ display: "flex", gap: "4px" }}>
          <button
            onClick={() => setTeam("home")}
            style={{
              padding: "4px 9px",
              borderRadius: "6px",
              border: team === "home" ? "1px solid #00e5ff" : "1px solid transparent",
              backgroundColor: team === "home" ? "rgba(0, 229, 255, 0.2)" : "transparent",
              color: team === "home" ? "#00e5ff" : "var(--studio-subtext)",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            Man City
          </button>
          <button
            onClick={() => setTeam("away")}
            style={{
              padding: "4px 9px",
              borderRadius: "6px",
              border: team === "away" ? "1px solid #f43f5e" : "1px solid transparent",
              backgroundColor: team === "away" ? "rgba(244, 63, 94, 0.2)" : "transparent",
              color: team === "away" ? "#f43f5e" : "var(--studio-subtext)",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            Arsenal
          </button>
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

        {/* Dynamic Attacking Shape Convex Hull SVG Contour */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          <polygon
            points={polygonPoints}
            fill={teamBg}
            stroke={teamColor}
            strokeWidth="1.2"
            strokeDasharray="2 2"
            style={{
              transition: "points 0.18s ease-out",
            }}
          />
        </svg>

        {/* Forward Progression Arrow (Tactical Centroid Momentum) */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "22%",
            bottom: "22%",
            width: "32px",
            transform: "translateX(-50%)",
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            clipPath: "polygon(50% 0%, 0% 30%, 35% 30%, 35% 100%, 65% 100%, 65% 30%, 100% 30%)",
            pointerEvents: "none",
          }}
        />

        {/* Tactical Positions of Key Outfield Players (Live Dynamic Nodes) */}
        {dynamicNodes.map((node) => {
          const isSelected = selectedPlayerId === node.id;

          return (
            <button
              key={node.id}
              onClick={() => handleSelectNode(node.id)}
              title={`${node.name} #${node.num} (${node.role}) - Click to Spotlight`}
              style={{
                position: "absolute",
                left: `${node.x}%`,
                top: `${node.y}%`,
                transform: "translate(-50%, -50%)",
                width: isSelected ? "22px" : "18px",
                height: isSelected ? "22px" : "18px",
                borderRadius: "50%",
                backgroundColor: "#080d16",
                border: isSelected ? "2px solid #ffffff" : `1.5px solid ${teamColor}`,
                boxShadow: isSelected
                  ? `0 0 10px ${teamColor}, 0 0 4px #ffffff`
                  : "0 2px 5px rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: isSelected ? "9.5px" : "8px",
                fontWeight: 900,
                color: isSelected ? "#ffffff" : teamColor,
                cursor: "pointer",
                padding: 0,
                zIndex: isSelected ? 4 : 2,
                transition: "left 0.2s ease-out, top 0.2s ease-out, width 0.15s ease, height 0.15s ease",
              }}
            >
              {node.num}
            </button>
          );
        })}

        {/* Real-time Dynamic Shape Dimensions Badge */}
        <div
          style={{
            position: "absolute",
            left: "8px",
            bottom: "8px",
            backgroundColor: "rgba(15, 23, 42, 0.92)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "6px",
            padding: "4px 8px",
            fontSize: "9.5px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backdropFilter: "blur(4px)",
            zIndex: 3,
          }}
        >
          <span style={{ color: "var(--studio-subtext)" }}>
            Width: <strong style={{ color: "#ffffff", fontFamily: "monospace" }}>{shapeWidthM}m</strong>
          </span>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
          <span style={{ color: "var(--studio-subtext)" }}>
            Depth: <strong style={{ color: "#ffffff", fontFamily: "monospace" }}>{shapeDepthM}m</strong>
          </span>
        </div>
      </div>
    </div>
  );
};

export default AttackingShapeCard;

