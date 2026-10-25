import React from "react";
import { IonIcon } from "@ionic/react";
import { trophyOutline, personOutline } from "ionicons/icons";
import { useBaseMemory, baseMemory } from "../../store/baseMemory";
import { StudioChipScroller } from "../StudioChipScroller";

const KEY_PLAYER_PRESETS = [
  { id: "home_10", label: "Haaland #9", team: "home" },
  { id: "home_7", label: "De Bruyne #17", team: "home" },
  { id: "home_9", label: "Foden #47", team: "home" },
  { id: "home_6", label: "Rodri #16", team: "home" },
  { id: "away_8", label: "Saka #7", team: "away" },
  { id: "away_9", label: "Odegaard #8", team: "away" },
  { id: "away_7", label: "Rice #41", team: "away" },
  { id: "away_3", label: "Saliba #2", team: "away" },
];

export const PlayerSpotlightCard: React.FC = () => {
  const selectedPlayerId = useBaseMemory((s) => s.selectedPlayerId);
  const homeLineup = useBaseMemory((s) => s.homeLineup);
  const awayLineup = useBaseMemory((s) => s.awayLineup);
  const score = useBaseMemory((s) => s.score);
  const currentFrame = useBaseMemory((s) => s.currentFrame);

  // Dynamically resolve the selected player from Single Core Memory
  const allPlayers = [...homeLineup, ...awayLineup];
  const player = allPlayers.find((p) => p.id === selectedPlayerId) || homeLineup[6]; // default to CM
  const isHome = player.team === "home";
  const teamMeta = isHome ? score.homeMeta : score.awayMeta;
  const club = teamMeta.name;
  const num = player.number;

  // Real-time spatial speed and ball carrier state from 5Hz tracking stream
  const liveTelemetry = currentFrame?.players?.find(
    (p) => p.player_id === selectedPlayerId || p.id === selectedPlayerId
  );
  const liveSpeed = liveTelemetry?.speed_kmh ?? (liveTelemetry as any)?.speedKmH ?? player.speed_kmh ?? 14.2;
  const isCarrier = liveTelemetry?.is_ball_carrier ?? (liveTelemetry as any)?.onBall ?? player.is_ball_carrier ?? false;

  const { shoot, passing, dribbling, defending, shotAccuracyPct, avgRating } = player.attributes;

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
            Player Spotlight
          </span>
        </div>
        <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--studio-subtext)", textTransform: "uppercase" }}>
          Player of the Match
        </span>
      </div>

      {/* Key Players Preset Horizontal Scroll Option */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--studio-subtext)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Key Squad Roster
          </span>
          <span style={{ fontSize: "9px", color: "#64748b" }}>Scroll ⇄</span>
        </div>
        <StudioChipScroller gap="6px" marginTopTrack={6}>
          {KEY_PLAYER_PRESETS.map((p) => {
            const isSelected = selectedPlayerId === p.id;
            const isHomeP = p.team === "home";
            const teamColor = isHomeP ? score.homeMeta.color : score.awayMeta.color;
            return (
              <button
                key={p.id}
                onClick={() => baseMemory.setSelectedPlayer(p.id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: isSelected ? `1.5px solid ${teamColor}` : "1px solid rgba(255,255,255,0.1)",
                  backgroundColor: isSelected
                    ? isHomeP
                      ? "rgba(0, 229, 255, 0.2)"
                      : "rgba(244, 63, 94, 0.2)"
                    : "var(--studio-inner-bg)",
                  color: isSelected ? teamColor : "var(--studio-subtext)",
                  fontSize: "11px",
                  fontWeight: isSelected ? 800 : 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: teamColor, flexShrink: 0 }} />
                <span>{p.label}</span>
              </button>
            );
          })}
        </StudioChipScroller>
      </div>

      {/* Player Profile & Rating */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              backgroundColor: isHome ? "rgba(0, 229, 255, 0.15)" : "rgba(244, 63, 94, 0.15)",
              border: `2px solid ${teamMeta.color}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: teamMeta.color,
              flexShrink: 0,
            }}
          >
            <IonIcon icon={personOutline} style={{ fontSize: "20px" }} />
          </div>
          <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--ion-text-color)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {player.name}
            </div>
            <div style={{ fontSize: "11px", color: "var(--studio-subtext)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {club} • #{num} • {player.pos}
            </div>
          </div>
        </div>

        {/* Rating Badge */}
        <div
          style={{
            backgroundColor: player.rating >= 8.0 ? "#10b981" : player.rating >= 7.2 ? "#3b82f6" : "#f59e0b",
            color: "#ffffff",
            fontWeight: 900,
            fontSize: "13px",
            padding: "4px 8px",
            borderRadius: "6px",
            flexShrink: 0,
            boxShadow: player.rating >= 8.0 ? "0 0 10px rgba(16, 185, 129, 0.45)" : "0 2px 6px rgba(0,0,0,0.3)",
          }}
        >
          {player.rating.toFixed(1)}
        </div>
      </div>

      {/* Live In-Match Telemetry Metrics */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "6px",
          backgroundColor: "var(--studio-inner-bg)",
          borderRadius: "8px",
          padding: "6px 10px",
          border: "1px solid var(--studio-panel-border)",
          fontSize: "11px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color: "var(--studio-subtext)" }}>Live Speed:</span>
          <span style={{ fontWeight: 800, color: "#10b981", fontFamily: "monospace" }}>
            {`${liveSpeed.toFixed(1)} km/h`}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color: "var(--studio-subtext)" }}>Status:</span>
          <span
            style={{
              fontWeight: 800,
              color: isCarrier ? "#ffd600" : "#38bdf8",
              backgroundColor: isCarrier ? "rgba(255, 214, 0, 0.15)" : "rgba(56, 189, 248, 0.12)",
              padding: "2px 6px",
              borderRadius: "4px",
              fontSize: "10px",
            }}
          >
            {isCarrier ? "Ball Carrier" : "Off-Ball Track"}
          </span>
        </div>
      </div>

      {/* Metrics Row: 4 Attribute Bars + Circular Accuracy Target */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto",
          gap: "12px",
          alignItems: "center",
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Attribute Bars */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: 0, flex: 1 }}>
          {[
            { label: "Shoot", val: shoot, color: "#10b981" },
            { label: "Passing", val: passing, color: "#00e5ff" },
            { label: "Dribbling", val: dribbling, color: "#3b82f6" },
            { label: "Defending", val: defending, color: "#f59e0b" },
          ].map((attr) => (
            <div key={attr.label} style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
              <span style={{ fontSize: "10px", color: "var(--studio-subtext)", width: "48px", flexShrink: 0 }}>
                {attr.label}
              </span>
              <div
                style={{
                  flex: 1,
                  height: "5px",
                  borderRadius: "3px",
                  backgroundColor: "var(--studio-inner-bg)",
                  overflow: "hidden",
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: `${attr.val}%`,
                    height: "100%",
                    backgroundColor: attr.color,
                    borderRadius: "3px",
                    transition: "width 0.3s ease",
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
            width: "92px",
            flexShrink: 0,
            boxSizing: "border-box",
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
            {/* Ball hit spot position derived from accuracy */}
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: teamMeta.color,
                position: "absolute",
                top: `${30 - Math.round(shotAccuracyPct * 0.15)}px`,
                right: `${24 - Math.round(shotAccuracyPct * 0.12)}px`,
                boxShadow: `0 0 6px ${teamMeta.color}`,
                transition: "all 0.3s ease",
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", marginTop: "6px", fontSize: "9px" }}>
            <span style={{ color: "var(--studio-subtext)" }}>Acc: <strong>{shotAccuracyPct}%</strong></span>
            <span style={{ color: "var(--studio-subtext)" }}>Avg: <strong>{avgRating}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
