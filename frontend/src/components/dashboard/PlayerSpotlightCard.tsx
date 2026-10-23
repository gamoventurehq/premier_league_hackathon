import React from "react";
import { useNavigate } from "react-router-dom";
import { IonIcon } from "@ionic/react";
import { trophyOutline, openOutline, personOutline } from "ionicons/icons";
import { useBaseMemory, baseMemory } from "../../store/baseMemory";

export const PlayerSpotlightCard: React.FC = () => {
  const navigate = useNavigate();
  const selectedPlayerId = useBaseMemory((s) => s.selectedPlayerId);
  const homeLineup = useBaseMemory((s) => s.homeLineup);
  const awayLineup = useBaseMemory((s) => s.awayLineup);
  const score = useBaseMemory((s) => s.score);

  // Dynamically resolve the selected player from Single Core Memory
  const allPlayers = [...homeLineup, ...awayLineup];
  const player = allPlayers.find((p) => p.id === selectedPlayerId) || homeLineup[6]; // default to CM
  const isHome = player.team === "home";
  const teamMeta = isHome ? score.homeMeta : score.awayMeta;

  const { shoot, passing, dribbling, defending, shotAccuracyPct, avgRating } = player.attributes;

  const handleOpenPlayerExperience = () => {
    baseMemory.setPersona("player_cam");
    navigate("/personas");
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
        gap: "14px",
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
        <IonIcon
          icon={openOutline}
          onClick={handleOpenPlayerExperience}
          title="Open Player Cam Experience"
          style={{ fontSize: "15px", color: "var(--studio-subtext)", cursor: "pointer" }}
        />
      </div>

      {/* Player Profile & Rating */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              backgroundColor: isHome ? "rgba(0, 229, 255, 0.15)" : "rgba(244, 63, 94, 0.15)",
              border: `2px solid ${teamMeta.color}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: teamMeta.color,
            }}
          >
            <IonIcon icon={personOutline} style={{ fontSize: "22px" }} />
          </div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--ion-text-color)" }}>
              {player.name}
            </div>
            <div style={{ fontSize: "11px", color: "var(--studio-subtext)" }}>
              {teamMeta.name} • #{player.number} • {player.pos}
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
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
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
          backgroundColor: "var(--studio-inner-bg)",
          borderRadius: "8px",
          padding: "6px 12px",
          border: "1px solid var(--studio-panel-border)",
          fontSize: "11px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color: "var(--studio-subtext)" }}>Live Speed:</span>
          <span style={{ fontWeight: 800, color: "#10b981", fontFamily: "monospace" }}>
            {player.speed_kmh ? `${player.speed_kmh.toFixed(1)} km/h` : "14.2 km/h"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color: "var(--studio-subtext)" }}>Status:</span>
          <span
            style={{
              fontWeight: 800,
              color: player.is_ball_carrier ? "#ffd600" : "#38bdf8",
              backgroundColor: player.is_ball_carrier ? "rgba(255, 214, 0, 0.15)" : "rgba(56, 189, 248, 0.12)",
              padding: "2px 6px",
              borderRadius: "4px",
              fontSize: "10px",
            }}
          >
            {player.is_ball_carrier ? "Ball Carrier" : "Off-Ball Track"}
          </span>
        </div>
      </div>

      {/* Metrics Row: 4 Attribute Bars + Circular Accuracy Target */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: "16px", alignItems: "center" }}>
        {/* Attribute Bars */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[
            { label: "Shoot", val: shoot, color: "#10b981" },
            { label: "Passing", val: passing, color: "#00e5ff" },
            { label: "Dribbling", val: dribbling, color: "#3b82f6" },
            { label: "Defending", val: defending, color: "#f59e0b" },
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
