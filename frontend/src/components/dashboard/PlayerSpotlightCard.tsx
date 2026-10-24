import React from "react";
import { IonIcon } from "@ionic/react";
import { trophyOutline, openOutline, personOutline } from "ionicons/icons";
import { useBaseMemory } from "../../store/baseMemory";

export interface PlayerSpotlightProfile {
  id: string;
  name: string;
  number: number;
  pos: string;
  club: "Manchester City" | "Arsenal";
  rating: number;
  attributes: {
    shoot: number;
    passing: number;
    dribbling: number;
    defending: number;
  };
  acc: number;
  avg: number;
  hitSpot?: { top: string; right: string };
}

const ROSTER_SPOTLIGHT: Record<string, PlayerSpotlightProfile> = {
  // Manchester City (Home)
  home_1: {
    id: "home_1",
    name: "Ederson",
    number: 31,
    pos: "GK",
    club: "Manchester City",
    rating: 6.8,
    attributes: { shoot: 22, passing: 89, dribbling: 64, defending: 79 },
    acc: 68,
    avg: 72,
    hitSpot: { top: "24px", right: "20px" },
  },
  home_2: {
    id: "home_2",
    name: "K. Walker",
    number: 2,
    pos: "RB",
    club: "Manchester City",
    rating: 7.1,
    attributes: { shoot: 64, passing: 81, dribbling: 79, defending: 83 },
    acc: 68,
    avg: 77,
    hitSpot: { top: "18px", right: "14px" },
  },
  home_3: {
    id: "home_3",
    name: "R. Dias",
    number: 3,
    pos: "CB",
    club: "Manchester City",
    rating: 7.4,
    attributes: { shoot: 48, passing: 85, dribbling: 71, defending: 91 },
    acc: 62,
    avg: 82,
    hitSpot: { top: "22px", right: "24px" },
  },
  home_4: {
    id: "home_4",
    name: "M. Akanji",
    number: 25,
    pos: "CB",
    club: "Manchester City",
    rating: 7.0,
    attributes: { shoot: 50, passing: 83, dribbling: 73, defending: 86 },
    acc: 60,
    avg: 78,
    hitSpot: { top: "20px", right: "18px" },
  },
  home_5: {
    id: "home_5",
    name: "J. Gvardiol",
    number: 24,
    pos: "LB",
    club: "Manchester City",
    rating: 7.2,
    attributes: { shoot: 68, passing: 84, dribbling: 82, defending: 85 },
    acc: 71,
    avg: 80,
    hitSpot: { top: "16px", right: "22px" },
  },
  home_6: {
    id: "home_6",
    name: "Rodri",
    number: 16,
    pos: "DM",
    club: "Manchester City",
    rating: 8.3,
    attributes: { shoot: 78, passing: 92, dribbling: 84, defending: 89 },
    acc: 76,
    avg: 86,
    hitSpot: { top: "12px", right: "16px" },
  },
  home_7: {
    id: "home_7",
    name: "K. De Bruyne",
    number: 17,
    pos: "CM",
    club: "Manchester City",
    rating: 8.8,
    attributes: { shoot: 86, passing: 96, dribbling: 87, defending: 68 },
    acc: 82,
    avg: 89,
    hitSpot: { top: "14px", right: "12px" },
  },
  home_8: {
    id: "home_8",
    name: "B. Silva",
    number: 20,
    pos: "CM",
    club: "Manchester City",
    rating: 7.9,
    attributes: { shoot: 76, passing: 89, dribbling: 92, defending: 72 },
    acc: 75,
    avg: 83,
    hitSpot: { top: "16px", right: "14px" },
  },
  home_9: {
    id: "home_9",
    name: "P. Foden",
    number: 47,
    pos: "RW",
    club: "Manchester City",
    rating: 8.2,
    attributes: { shoot: 85, passing: 88, dribbling: 90, defending: 62 },
    acc: 80,
    avg: 85,
    hitSpot: { top: "12px", right: "10px" },
  },
  home_10: {
    id: "home_10",
    name: "E. Haaland",
    number: 9,
    pos: "ST",
    club: "Manchester City",
    rating: 8.5,
    attributes: { shoot: 95, passing: 74, dribbling: 80, defending: 46 },
    acc: 88,
    avg: 88,
    hitSpot: { top: "10px", right: "10px" },
  },
  home_11: {
    id: "home_11",
    name: "J. Grealish",
    number: 10,
    pos: "LW",
    club: "Manchester City",
    rating: 7.5,
    attributes: { shoot: 74, passing: 85, dribbling: 89, defending: 58 },
    acc: 72,
    avg: 79,
    hitSpot: { top: "18px", right: "16px" },
  },

  // Arsenal (Away)
  away_1: {
    id: "away_1",
    name: "D. Raya",
    number: 22,
    pos: "GK",
    club: "Arsenal",
    rating: 6.9,
    attributes: { shoot: 20, passing: 86, dribbling: 58, defending: 80 },
    acc: 62,
    avg: 74,
    hitSpot: { top: "26px", right: "22px" },
  },
  away_2: {
    id: "away_2",
    name: "B. White",
    number: 4,
    pos: "RB",
    club: "Arsenal",
    rating: 6.8,
    attributes: { shoot: 58, passing: 82, dribbling: 77, defending: 84 },
    acc: 64,
    avg: 76,
    hitSpot: { top: "20px", right: "16px" },
  },
  away_3: {
    id: "away_3",
    name: "W. Saliba",
    number: 2,
    pos: "CB",
    club: "Arsenal",
    rating: 7.3,
    attributes: { shoot: 45, passing: 87, dribbling: 75, defending: 92 },
    acc: 58,
    avg: 84,
    hitSpot: { top: "22px", right: "20px" },
  },
  away_4: {
    id: "away_4",
    name: "Gabriel",
    number: 6,
    pos: "CB",
    club: "Arsenal",
    rating: 7.2,
    attributes: { shoot: 55, passing: 81, dribbling: 68, defending: 90 },
    acc: 60,
    avg: 81,
    hitSpot: { top: "20px", right: "24px" },
  },
  away_5: {
    id: "away_5",
    name: "J. Timber",
    number: 12,
    pos: "LB",
    club: "Arsenal",
    rating: 6.9,
    attributes: { shoot: 60, passing: 83, dribbling: 81, defending: 82 },
    acc: 66,
    avg: 77,
    hitSpot: { top: "18px", right: "18px" },
  },
  away_6: {
    id: "away_6",
    name: "T. Partey",
    number: 5,
    pos: "DM",
    club: "Arsenal",
    rating: 7.0,
    attributes: { shoot: 71, passing: 85, dribbling: 79, defending: 84 },
    acc: 70,
    avg: 79,
    hitSpot: { top: "16px", right: "16px" },
  },
  away_7: {
    id: "away_7",
    name: "D. Rice",
    number: 41,
    pos: "DM",
    club: "Arsenal",
    rating: 7.6,
    attributes: { shoot: 74, passing: 88, dribbling: 82, defending: 89 },
    acc: 74,
    avg: 83,
    hitSpot: { top: "14px", right: "14px" },
  },
  away_8: {
    id: "away_8",
    name: "B. Saka",
    number: 7,
    pos: "RW",
    club: "Arsenal",
    rating: 8.0,
    attributes: { shoot: 85, passing: 87, dribbling: 89, defending: 65 },
    acc: 81,
    avg: 85,
    hitSpot: { top: "12px", right: "12px" },
  },
  away_9: {
    id: "away_9",
    name: "M. Ødegaard",
    number: 8,
    pos: "AM",
    club: "Arsenal",
    rating: 7.7,
    attributes: { shoot: 81, passing: 91, dribbling: 86, defending: 64 },
    acc: 79,
    avg: 83,
    hitSpot: { top: "14px", right: "12px" },
  },
  away_10: {
    id: "away_10",
    name: "G. Martinelli",
    number: 11,
    pos: "LW",
    club: "Arsenal",
    rating: 7.2,
    attributes: { shoot: 80, passing: 78, dribbling: 88, defending: 55 },
    acc: 74,
    avg: 78,
    hitSpot: { top: "16px", right: "14px" },
  },
  away_11: {
    id: "away_11",
    name: "K. Havertz",
    number: 29,
    pos: "ST",
    club: "Arsenal",
    rating: 7.1,
    attributes: { shoot: 82, passing: 80, dribbling: 81, defending: 62 },
    acc: 76,
    avg: 79,
    hitSpot: { top: "12px", right: "14px" },
  },
};

export const PlayerSpotlightCard: React.FC = () => {
  const selectedPlayerId = useBaseMemory((s) => s.selectedPlayerId);

  // Dynamic player lookup: match selected player or default to Kevin De Bruyne (home_7)
  const player = (selectedPlayerId && ROSTER_SPOTLIGHT[selectedPlayerId])
    ? ROSTER_SPOTLIGHT[selectedPlayerId]
    : ROSTER_SPOTLIGHT.home_7;

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
        gap: "14px",
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
              backgroundColor: accentBg,
              border: `2px solid ${accentColor}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: accentColor,
            }}
          >
            <IonIcon icon={personOutline} style={{ fontSize: "22px" }} />
          </div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--ion-text-color)" }}>
              {player.name}
            </div>
            <div style={{ fontSize: "11px", color: "var(--studio-subtext)" }}>
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
