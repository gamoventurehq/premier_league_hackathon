import React, { useState, useEffect } from "react";
import { IonIcon } from "@ionic/react";
import { locateOutline, personOutline } from "ionicons/icons";
import { useBaseMemory, baseMemory } from "../../store/baseMemory";
import { ShotMapItem } from "../../types/telemetry";

export const ShootMapCard: React.FC = () => {
  const [team, setTeam] = useState<"home" | "away">("home");
  const score = useBaseMemory((s) => s.score);
  const shotMapEvents = useBaseMemory((s) => s.shotMapEvents);
  const selectedPlayerId = useBaseMemory((s) => s.selectedPlayerId);
  const awayLineup = useBaseMemory((s) => s.awayLineup);
  const [selectedShotId, setSelectedShotId] = useState<string>("s1");

  // Automatically align shoot map team and active shot with Single Core Memory
  useEffect(() => {
    const isAway = awayLineup.some((p) => p.id === selectedPlayerId);
    setTeam(isAway ? "away" : "home");
    const playerShot = shotMapEvents.find((s) => s.playerId === selectedPlayerId);
    if (playerShot) {
      setSelectedShotId(playerShot.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlayerId]);

  const handleTeamSelect = (targetTeam: "home" | "away") => {
    setTeam(targetTeam);
    if (targetTeam === "away") {
      baseMemory.setSelectedPlayer("away_9"); // Saka
    } else {
      baseMemory.setSelectedPlayer("home_11"); // Haaland
    }
  };

  const filteredShots = shotMapEvents.filter((s) => s.team === team);
  const activeShot: ShotMapItem | undefined =
    filteredShots.find((s) => s.id === selectedShotId) ||
    filteredShots[0];

  const handleShotClick = (shot: ShotMapItem) => {
    setSelectedShotId(shot.id);
    baseMemory.setSelectedPlayer(shot.playerId);
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
      {/* Header with Dynamic Team Switcher */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <IonIcon icon={locateOutline} style={{ color: score.homeMeta.color, fontSize: "16px" }} />
          <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--ion-text-color)" }}>
            Shoot Map
          </span>
        </div>

        <div style={{ display: "flex", gap: "4px" }}>
          <button
            onClick={() => handleTeamSelect("home")}
            style={{
              padding: "3px 8px",
              borderRadius: "6px",
              border: team === "home" ? `1px solid ${score.homeMeta.color}` : "1px solid rgba(255, 255, 255, 0.08)",
              backgroundColor: team === "home" ? "rgba(0, 229, 255, 0.2)" : "transparent",
              color: team === "home" ? score.homeMeta.color : "var(--studio-subtext)",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {score.homeMeta.shortCode}
          </button>
          <button
            onClick={() => handleTeamSelect("away")}
            style={{
              padding: "3px 8px",
              borderRadius: "6px",
              border: team === "away" ? `1px solid ${score.awayMeta.color}` : "1px solid rgba(255, 255, 255, 0.08)",
              backgroundColor: team === "away" ? "rgba(244, 63, 94, 0.2)" : "transparent",
              color: team === "away" ? score.awayMeta.color : "var(--studio-subtext)",
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
            pointerEvents: "none",
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
            pointerEvents: "none",
          }}
        />

        {/* Dynamic Shot Locations from Single Core Memory */}
        {filteredShots.length === 0 ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255, 255, 255, 0.7)",
              fontSize: "11px",
              fontStyle: "italic",
              gap: "4px",
              pointerEvents: "none",
              padding: "0 16px",
              textAlign: "center",
            }}
          >
            <span>No shots recorded yet for {team === "home" ? score.homeMeta.name : score.awayMeta.name}</span>
            <span style={{ fontSize: "9.5px", opacity: 0.75 }}>Live attempts will plot dynamically from match events</span>
          </div>
        ) : (
          filteredShots.map((shot) => {
            const isSelected = activeShot?.id === shot.id;
            return (
              <div
                key={shot.id}
                onClick={() => handleShotClick(shot)}
                style={{
                  position: "absolute",
                  left: shot.x,
                  top: shot.y,
                  transform: "translate(-50%, -50%)",
                  width: `${shot.size}px`,
                  height: `${shot.size}px`,
                  borderRadius: "50%",
                  backgroundColor: shot.isGoal ? "#ffd600" : "rgba(255, 255, 255, 0.4)",
                  border: isSelected
                    ? "2.5px solid #00e5ff"
                    : shot.isGoal
                    ? "2px solid #ffffff"
                    : "1px solid rgba(255, 255, 255, 0.6)",
                  boxShadow: shot.isGoal
                    ? "0 0 10px #ffd600"
                    : isSelected
                    ? "0 0 8px #00e5ff"
                    : "none",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  zIndex: isSelected ? 5 : 2,
                }}
                title={`${shot.playerName} (${shot.minute}) - ${shot.label}`}
              />
            );
          })
        )}

        {/* Dynamic Selected Shot Detail Tooltip Card */}
        {activeShot && (
          <div
            style={{
              position: "absolute",
              right: "8px",
              bottom: "8px",
              backgroundColor: "rgba(15, 23, 42, 0.92)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "8px",
              padding: "8px 10px",
              fontSize: "10px",
              color: "#f8fafc",
              backdropFilter: "blur(4px)",
              minWidth: "120px",
              zIndex: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
              <div
                style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  backgroundColor: "var(--ion-color-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IonIcon icon={personOutline} style={{ fontSize: "10px", color: "#ffffff" }} />
              </div>
              <strong style={{ fontSize: "11px" }}>
                {activeShot.playerName} {activeShot.minute}
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8" }}>
              <span>Outcome</span>
              <strong style={{ color: activeShot.isGoal ? "#ffd600" : "#ffffff" }}>
                {activeShot.label}
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8" }}>
              <span>xG</span>
              <strong style={{ color: "#10b981" }}>{activeShot.xG.toFixed(2)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8" }}>
              <span>xGOT</span>
              <strong style={{ color: "#00e5ff" }}>{activeShot.xGOT.toFixed(2)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8" }}>
              <span>Foot</span>
              <strong style={{ color: "#ffffff" }}>{activeShot.foot}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
