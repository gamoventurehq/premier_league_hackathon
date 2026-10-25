import React from "react";
import { IonIcon } from "@ionic/react";
import { trophyOutline, personOutline } from "ionicons/icons";
import { useBaseMemory, baseMemory } from "../../store/baseMemory";
import { StudioChipScroller } from "../StudioChipScroller";

import {
  KEY_PLAYER_PRESETS,
  ROSTER_SPOTLIGHT,
} from "../../types/playerRoster";

export const PlayerSpotlightCard: React.FC = () => {
  const selectedPlayerId = useBaseMemory((s) => s.selectedPlayerId);
  const matchClock = useBaseMemory((s) => s.matchClock);

  // Dynamic player lookup: match selected player or default to Kevin De Bruyne (home_7)
  const player = (selectedPlayerId && ROSTER_SPOTLIGHT[selectedPlayerId])
    ? ROSTER_SPOTLIGHT[selectedPlayerId]
    : ROSTER_SPOTLIGHT.home_7;

  // Chronological match milestones based on matchClock
  const playerMilestone = (() => {
    if (player.id === "home_10" && matchClock >= 2520) {
      return { text: "Goal 42' ⚽", color: "#10b981", bg: "rgba(16, 185, 129, 0.2)" };
    }
    if (player.id === "away_8" && matchClock >= 5040) {
      return { text: "Goal 84' ⚽", color: "#10b981", bg: "rgba(16, 185, 129, 0.2)" };
    }
    if (player.id === "home_7" && matchClock >= 2520) {
      return { text: "Key Pass 42' 🎯", color: "#00e5ff", bg: "rgba(0, 229, 255, 0.2)" };
    }
    if (player.id === "away_7" && matchClock >= 5280) {
      return { text: "Tackle Won 88' 🛡️", color: "#38bdf8", bg: "rgba(56, 189, 248, 0.2)" };
    }
    return null;
  })();

  const isHome = player.club === "Manchester City";
  const accentColor = isHome ? "#00e5ff" : "#f43f5e";
  const accentBg = isHome ? "rgba(0, 229, 255, 0.15)" : "rgba(244, 63, 94, 0.15)";
  const ratingBadgeBg = player.rating >= 8.0 ? "#10b981" : player.rating >= 7.3 ? "#3b82f6" : "#f59e0b";

  return (
    <div
      style={{
        backgroundColor: "var(--studio-panel-bg)",
        border: "1px solid var(--studio-panel-border)",
        borderRadius: "16px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <IonIcon icon={trophyOutline} style={{ color: "var(--ion-color-primary)", fontSize: "16px" }} />
          <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--ion-text-color)" }}>
            {selectedPlayerId && selectedPlayerId !== "home_7" ? "Player Spotlight" : "Player of the Match"}
          </span>
        </div>
        {playerMilestone && (
          <span
            style={{
              fontSize: "10px",
              fontWeight: 800,
              color: playerMilestone.color,
              backgroundColor: playerMilestone.bg,
              padding: "2px 8px",
              borderRadius: "12px",
              border: `1px solid ${playerMilestone.color}55`,
            }}
          >
            {playerMilestone.text}
          </span>
        )}
      </div>

      {/* Key Players Preset Horizontal Scroller */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <StudioChipScroller gap="6px">
          {KEY_PLAYER_PRESETS.map((preset) => {
            const isSelected = (selectedPlayerId || "home_7") === preset.id;
            const teamColor = preset.team === "home" ? "#00e5ff" : "#f43f5e";
            return (
              <button
                key={preset.id}
                onClick={() => baseMemory.setSelectedPlayer(preset.id)}
                style={{
                  background: isSelected
                    ? `linear-gradient(135deg, ${teamColor}33, ${teamColor}11)`
                    : "rgba(255, 255, 255, 0.04)",
                  border: isSelected ? `1.5px solid ${teamColor}` : "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "16px",
                  padding: "4px 10px",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: isSelected ? "#ffffff" : "var(--studio-subtext)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  boxShadow: isSelected ? `0 0 8px ${teamColor}44` : "none",
                  transition: "all 0.15s ease",
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: teamColor,
                  }}
                />
                {preset.label}
              </button>
            );
          })}
        </StudioChipScroller>
      </div>

      {/* Player Profile & Rating */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              backgroundColor: accentBg,
              border: `2px solid ${accentColor}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: accentColor,
              flexShrink: 0,
            }}
          >
            <IonIcon icon={personOutline} style={{ fontSize: "22px" }} />
          </div>
          <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--ion-text-color)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {player.name}
            </div>
            <div style={{ fontSize: "11px", color: "var(--studio-subtext)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {player.club} • #{player.number}
            </div>
          </div>
        </div>

        {/* Rating Badge */}
        <div
          style={{
            backgroundColor: ratingBadgeBg,
            color: "#ffffff",
            fontWeight: 900,
            fontSize: "13px",
            padding: "4px 8px",
            borderRadius: "6px",
            boxShadow: `0 2px 6px ${ratingBadgeBg}66`,
            flexShrink: 0,
          }}
        >
          {player.rating.toFixed(1)}
        </div>
      </div>

      {/* Metrics Row: 4 Attribute Bars + Circular Accuracy Target */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: "16px", alignItems: "center" }}>
        {/* Attribute Bars */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[
            { label: "Shoot", val: player.attributes.shoot, color: "#10b981" },
            { label: "Passing", val: player.attributes.passing, color: "#00e5ff" },
            { label: "Dribbling", val: player.attributes.dribbling, color: "#3b82f6" },
            { label: "Defending", val: player.attributes.defending, color: "#f59e0b" },
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
                top: player.hitSpot?.top || "14px",
                right: player.hitSpot?.right || "12px",
                boxShadow: "0 0 6px #ffd600",
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", marginTop: "6px", fontSize: "9px" }}>
            <span style={{ color: "var(--studio-subtext)" }}>Acc: <strong>{player.acc}%</strong></span>
            <span style={{ color: "var(--studio-subtext)" }}>Avg: <strong>{player.avg}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
