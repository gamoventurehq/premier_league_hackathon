import React, { useState, useEffect } from "react";
import { IonIcon } from "@ionic/react";
import { walkOutline } from "ionicons/icons";
import { useBaseMemory, baseMemory } from "../../store/baseMemory";

export const AttackingShapeCard: React.FC = () => {
  const [selectedTeam, setSelectedTeam] = useState<"home" | "away">("home");
  const score = useBaseMemory((s) => s.score);
  const homeLineup = useBaseMemory((s) => s.homeLineup);
  const awayLineup = useBaseMemory((s) => s.awayLineup);
  const selectedPlayerId = useBaseMemory((s) => s.selectedPlayerId);
  const currentFrame = useBaseMemory((s) => s.currentFrame);
  const controlIndex = useBaseMemory((s) => s.blackboard.control_index);

  // Automatically align selected team with core memory player selection
  useEffect(() => {
    const isAway = awayLineup.some((p) => p.id === selectedPlayerId);
    setSelectedTeam(isAway ? "away" : "home");
  }, [selectedPlayerId, awayLineup]);

  const handleSelectTeam = (team: "home" | "away") => {
    setSelectedTeam(team);
    if (team === "away") {
      baseMemory.setSelectedPlayer("away_9"); // Saka (Arsenal)
    } else {
      baseMemory.setSelectedPlayer("home_11"); // Haaland (Man City)
    }
  };

  // Dynamically resolve active team attacking shape from selected team
  const isAwaySelected = selectedTeam === "away";
  const activeLineup = isAwaySelected ? awayLineup : homeLineup;
  const activeMeta = isAwaySelected ? score.awayMeta : score.homeMeta;

  // Outfield players forming the physical attacking shape
  const outfield = activeLineup.filter((p) => p.pos !== "GK");

  // Compute live dynamic coordinates directly from 10Hz/5Hz simulation telemetry
  // Vertical orientation: Attacking goal at the TOP (0%), Rest defense at BOTTOM (100%)
  const liveNodes = outfield.map((player) => {
    const isSelected = selectedPlayerId === player.id;
    const isHome = !isAwaySelected;

    // Direct physical pitch coordinate projection
    // player.x is 0-100% along pitch length (105m); player.y is 0-100% along width (68m)
    let screenX: number;
    let screenY: number;

    if (isHome) {
      // Home team attacks towards x = 100% (right goal)
      // Attackers near high x appear near TOP of visualizer
      screenY = Math.max(12, Math.min(88, ((100 - player.x) / 100) * 74 + 13));
      screenX = Math.max(12, Math.min(88, (player.y / 100) * 76 + 12));
    } else {
      // Away team attacks towards x = 0% (left goal)
      // Attackers near low x appear near TOP of visualizer
      screenY = Math.max(12, Math.min(88, (player.x / 100) * 74 + 13));
      screenX = Math.max(12, Math.min(88, ((100 - player.y) / 100) * 76 + 12));
    }

    return {
      player,
      isSelected,
      x: Math.round(screenX * 10) / 10,
      y: Math.round(screenY * 10) / 10,
    };
  });

  // Calculate live dynamic ball position in attacking visualizer
  let ballNode: { x: number; y: number } | null = null;
  if (currentFrame?.ball) {
    const isHome = !isAwaySelected;
    const rawBx = currentFrame.ball.x; // 0 to 105m
    const rawBy = currentFrame.ball.y; // 0 to 68m

    const ballScreenY = isHome
      ? Math.max(8, Math.min(92, ((105 - rawBx) / 105) * 74 + 13))
      : Math.max(8, Math.min(92, (rawBx / 105) * 74 + 13));

    const ballScreenX = isHome
      ? Math.max(8, Math.min(92, (rawBy / 68) * 76 + 12))
      : Math.max(8, Math.min(92, ((68 - rawBy) / 68) * 76 + 12));

    ballNode = {
      x: Math.round(ballScreenX * 10) / 10,
      y: Math.round(ballScreenY * 10) / 10,
    };
  }

  // Compute live structural triangulation vectors between proximate teammates
  const connectingLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 0; i < liveNodes.length; i++) {
    for (let j = i + 1; j < liveNodes.length; j++) {
      const p1 = liveNodes[i];
      const p2 = liveNodes[j];
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Connect proximate teammates within tactical support range
      if (dist < 30 && dist > 4) {
        connectingLines.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
      }
    }
  }

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
      {/* Header with Dynamic Team Switcher */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <IonIcon icon={walkOutline} style={{ color: "#10b981", fontSize: "16px" }} />
          <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--ion-text-color)" }}>
            Attacking Shape
          </span>
        </div>

        <div style={{ display: "flex", gap: "4px" }}>
          <button
            onClick={() => handleSelectTeam("home")}
            style={{
              padding: "3px 8px",
              borderRadius: "6px",
              border: selectedTeam === "home" ? `1px solid ${score.homeMeta.color}` : "1px solid rgba(255, 255, 255, 0.08)",
              backgroundColor: selectedTeam === "home" ? "rgba(0, 229, 255, 0.2)" : "transparent",
              color: selectedTeam === "home" ? score.homeMeta.color : "var(--studio-subtext)",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {score.homeMeta.shortCode}
          </button>
          <button
            onClick={() => handleSelectTeam("away")}
            style={{
              padding: "3px 8px",
              borderRadius: "6px",
              border: selectedTeam === "away" ? `1px solid ${score.awayMeta.color}` : "1px solid rgba(255, 255, 255, 0.08)",
              backgroundColor: selectedTeam === "away" ? "rgba(244, 63, 94, 0.2)" : "transparent",
              color: selectedTeam === "away" ? score.awayMeta.color : "var(--studio-subtext)",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {score.awayMeta.shortCode}
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

        {/* Dynamic Structural Connecting Vectors from Live Triangulation */}
        <svg
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        >
          {connectingLines.map((line, i) => (
            <line
              key={`conn-${i}`}
              x1={`${line.x1}%`}
              y1={`${line.y1}%`}
              x2={`${line.x2}%`}
              y2={`${line.y2}%`}
              stroke="rgba(255, 255, 255, 0.22)"
              strokeDasharray="3 3"
              strokeWidth="1.2"
            />
          ))}
        </svg>

        {/* Live Match Ball Node */}
        {ballNode && (
          <div
            style={{
              position: "absolute",
              left: `${ballNode.x}%`,
              top: `${ballNode.y}%`,
              transform: "translate(-50%, -50%)",
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: "#ffffff",
              boxShadow: "0 0 10px #ffffff, 0 0 4px #00e5ff",
              zIndex: 8,
              pointerEvents: "none",
              transition: "left 0.15s linear, top 0.15s linear",
            }}
            title="Live Match Ball"
          />
        )}

        {/* Live Outfield Player Nodes (Streamed 10Hz/5Hz Continuous Tracking) */}
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
                ? `0 0 12px ${activeMeta.color}`
                : player.is_ball_carrier
                ? "0 0 12px #ffd600, 0 0 4px #ffffff"
                : "0 2px 4px rgba(0,0,0,0.4)",
              cursor: "pointer",
              transition: "left 0.25s linear, top 0.25s linear, box-shadow 0.2s ease",
              zIndex: isSelected ? 6 : player.is_ball_carrier ? 5 : 2,
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

export default AttackingShapeCard;
