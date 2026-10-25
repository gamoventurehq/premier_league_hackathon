import React, { useState, useEffect } from "react";
import { IonIcon } from "@ionic/react";
import { locateOutline, personOutline, footballOutline } from "ionicons/icons";
import { useBaseMemory, baseMemory } from "../../store/baseMemory";

export interface DashboardShot {
  id: string;
  team: "home" | "away";
  playerId: string;
  playerName: string;
  minute: string;
  timeSec: number;
  xG: number;
  xGOT: number;
  distanceM: number;
  foot: "Left" | "Right" | "Header";
  outcome: "goal" | "saved" | "blocked" | "miss";
  x: string;
  y: string;
  size: number;
}

const MAN_CITY_SHOTS: DashboardShot[] = [
  {
    id: "mc_3",
    team: "home",
    playerId: "home_9",
    playerName: "P. Foden",
    minute: "31'",
    timeSec: 1860,
    xG: 0.12,
    xGOT: 0.00,
    distanceM: 17.5,
    foot: "Left",
    outcome: "blocked",
    x: "58%",
    y: "35%",
    size: 11,
  },
  {
    id: "mc_1",
    team: "home",
    playerId: "home_10",
    playerName: "E. Haaland",
    minute: "42'",
    timeSec: 2520,
    xG: 0.74,
    xGOT: 0.88,
    distanceM: 11.2,
    foot: "Left",
    outcome: "goal",
    x: "48%",
    y: "25%",
    size: 20,
  },
  {
    id: "mc_4",
    team: "home",
    playerId: "home_6",
    playerName: "Rodri",
    minute: "54'",
    timeSec: 3240,
    xG: 0.06,
    xGOT: 0.00,
    distanceM: 25.1,
    foot: "Right",
    outcome: "miss",
    x: "32%",
    y: "55%",
    size: 9,
  },
  {
    id: "mc_2",
    team: "home",
    playerId: "home_7",
    playerName: "K. De Bruyne",
    minute: "69'",
    timeSec: 4140,
    xG: 0.22,
    xGOT: 0.48,
    distanceM: 20.8,
    foot: "Right",
    outcome: "saved",
    x: "42%",
    y: "45%",
    size: 14,
  },
  {
    id: "mc_5",
    team: "home",
    playerId: "home_11",
    playerName: "J. Grealish",
    minute: "76'",
    timeSec: 4560,
    xG: 0.24,
    xGOT: 0.35,
    distanceM: 13.9,
    foot: "Right",
    outcome: "saved",
    x: "65%",
    y: "60%",
    size: 14,
  },
  {
    id: "mc_6",
    team: "home",
    playerId: "home_8",
    playerName: "B. Silva",
    minute: "82'",
    timeSec: 4920,
    xG: 0.10,
    xGOT: 0.00,
    distanceM: 16.4,
    foot: "Left",
    outcome: "blocked",
    x: "52%",
    y: "32%",
    size: 11,
  },
];

const ARSENAL_SHOTS: DashboardShot[] = [
  {
    id: "ars_6",
    team: "away",
    playerId: "away_8",
    playerName: "B. Saka",
    minute: "18'",
    timeSec: 1080,
    xG: 0.19,
    xGOT: 0.32,
    distanceM: 16.1,
    foot: "Left",
    outcome: "saved",
    x: "57%",
    y: "36%",
    size: 13,
  },
  {
    id: "ars_2",
    team: "away",
    playerId: "away_9",
    playerName: "M. Ødegaard",
    minute: "28'",
    timeSec: 1680,
    xG: 0.24,
    xGOT: 0.51,
    distanceM: 19.2,
    foot: "Left",
    outcome: "saved",
    x: "43%",
    y: "43%",
    size: 14,
  },
  {
    id: "ars_3",
    team: "away",
    playerId: "away_11",
    playerName: "K. Havertz",
    minute: "39'",
    timeSec: 2340,
    xG: 0.38,
    xGOT: 0.44,
    distanceM: 10.5,
    foot: "Header",
    outcome: "saved",
    x: "46%",
    y: "31%",
    size: 16,
  },
  {
    id: "ars_4",
    team: "away",
    playerId: "away_10",
    playerName: "G. Martinelli",
    minute: "61'",
    timeSec: 3660,
    xG: 0.14,
    xGOT: 0.00,
    distanceM: 15.3,
    foot: "Right",
    outcome: "miss",
    x: "63%",
    y: "54%",
    size: 10,
  },
  {
    id: "ars_5",
    team: "away",
    playerId: "away_7",
    playerName: "D. Rice",
    minute: "72'",
    timeSec: 4320,
    xG: 0.08,
    xGOT: 0.00,
    distanceM: 23.0,
    foot: "Right",
    outcome: "blocked",
    x: "36%",
    y: "57%",
    size: 9,
  },
  {
    id: "ars_1",
    team: "away",
    playerId: "away_8",
    playerName: "B. Saka",
    minute: "84'",
    timeSec: 5040,
    xG: 0.72,
    xGOT: 0.85,
    distanceM: 9.8,
    foot: "Left",
    outcome: "goal",
    x: "51%",
    y: "23%",
    size: 20,
  },
];

export const ShootMapCard: React.FC = () => {
  const [team, setTeam] = useState<"home" | "away">("home");
  const matchClock = useBaseMemory((s) => s.matchClock);
  const selectedPlayerId = useBaseMemory((s) => s.selectedPlayerId);

  const allTeamShots = team === "home" ? MAN_CITY_SHOTS : ARSENAL_SHOTS;
  // Chronological time-gated filter: only show shots that have happened up to matchClock
  const elapsedShots = allTeamShots.filter((s) => s.timeSec <= matchClock);

  const [selectedShotId, setSelectedShotId] = useState<string>("");

  // Default selection when team or elapsed shots change
  useEffect(() => {
    if (elapsedShots.length > 0) {
      // Prefer keeping current if still valid, else latest elapsed shot
      const exists = elapsedShots.some((s) => s.id === selectedShotId);
      if (!exists) {
        setSelectedShotId(elapsedShots[elapsedShots.length - 1].id);
      }
    } else {
      setSelectedShotId("");
    }
  }, [team, elapsedShots.length]);

  // Synchronize when a player is selected elsewhere in the studio
  useEffect(() => {
    if (!selectedPlayerId) return;
    const matchingShot = elapsedShots.find((s) => s.playerId === selectedPlayerId);
    if (matchingShot) {
      setSelectedShotId(matchingShot.id);
    }
  }, [selectedPlayerId, elapsedShots]);

  const selectedShot = elapsedShots.find((s) => s.id === selectedShotId) || (elapsedShots.length > 0 ? elapsedShots[elapsedShots.length - 1] : null);

  const handleSelectShot = (shot: DashboardShot) => {
    setSelectedShotId(shot.id);
    baseMemory.setSelectedPlayer(shot.playerId);
  };

  const formatClock = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getOutcomeBadge = (outcome: DashboardShot["outcome"]) => {
    switch (outcome) {
      case "goal":
        return { label: "GOAL", color: "#22c55e", bg: "rgba(34, 197, 94, 0.2)" };
      case "saved":
        return { label: "SAVED", color: "#38bdf8", bg: "rgba(56, 189, 248, 0.2)" };
      case "blocked":
        return { label: "BLOCKED", color: "#fbbf24", bg: "rgba(251, 191, 36, 0.2)" };
      case "miss":
      default:
        return { label: "MISS", color: "#94a3b8", bg: "rgba(148, 163, 184, 0.2)" };
    }
  };

  const outcomeBadge = selectedShot ? getOutcomeBadge(selectedShot.outcome) : null;

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
      }}
    >
      {/* Header with Team Switcher */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <IonIcon icon={locateOutline} style={{ color: "#00e5ff", fontSize: "16px" }} />
          <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--ion-text-color)" }}>
            Shoot Map
          </span>
          <span style={{ fontSize: "10px", color: "var(--studio-subtext)", fontFamily: "monospace" }}>
            ({elapsedShots.length} / {allTeamShots.length} Shots)
          </span>
        </div>

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
          }}
        />
        {/* Penalty Spot */}
        <div
          style={{
            position: "absolute",
            top: "48%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "5px",
            height: "5px",
            borderRadius: "50%",
            backgroundColor: "rgba(255, 255, 255, 0.5)",
          }}
        />

        {/* Empty state when no shots have occurred yet */}
        {elapsedShots.length === 0 && (
          <div
            style={{
              position: "absolute",
              top: "45%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              backgroundColor: "rgba(15, 23, 42, 0.88)",
              border: "1px dashed rgba(255, 255, 255, 0.25)",
              borderRadius: "8px",
              padding: "6px 12px",
              color: "var(--studio-subtext)",
              fontSize: "10.5px",
              textAlign: "center",
              zIndex: 3,
              whiteSpace: "nowrap",
            }}
          >
            No {team === "home" ? "City" : "Arsenal"} shots logged yet ({formatClock(matchClock)})
          </div>
        )}

        {/* Shot Locations (Interactive Clickable Dots - Time-Gated) */}
        {elapsedShots.map((shot) => {
          const isSelected = selectedShot && shot.id === selectedShot.id;
          const isGoal = shot.outcome === "goal";
          const teamAccent = team === "home" ? "#00e5ff" : "#f43f5e";

          return (
            <button
              key={shot.id}
              onClick={() => handleSelectShot(shot)}
              title={`${shot.playerName} (${shot.minute}) - ${shot.outcome.toUpperCase()} [xG: ${shot.xG.toFixed(2)}]`}
              style={{
                position: "absolute",
                left: shot.x,
                top: shot.y,
                transform: "translate(-50%, -50%)",
                width: `${shot.size}px`,
                height: `${shot.size}px`,
                borderRadius: "50%",
                backgroundColor: isGoal ? "#ffd600" : isSelected ? teamAccent : "rgba(255, 255, 255, 0.45)",
                border: isSelected
                  ? "2px solid #ffffff"
                  : isGoal
                  ? "2px solid #ffffff"
                  : "1px solid rgba(255, 255, 255, 0.7)",
                boxShadow: isSelected
                  ? `0 0 12px ${isGoal ? "#ffd600" : teamAccent}, 0 0 4px #ffffff`
                  : isGoal
                  ? "0 0 10px #ffd600"
                  : "none",
                cursor: "pointer",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                outline: isSelected ? `2px solid ${teamAccent}` : "none",
                outlineOffset: "2px",
                transition: "all 0.15s ease",
                zIndex: isSelected ? 4 : isGoal ? 3 : 2,
              }}
            >
              {isGoal && (
                <IonIcon
                  icon={footballOutline}
                  style={{
                    fontSize: `${Math.max(10, shot.size - 6)}px`,
                    color: "#0f172a",
                  }}
                />
              )}
            </button>
          );
        })}

        {/* Selected Shot Detail Tooltip Card */}
        {selectedShot && outcomeBadge ? (
          <div
            style={{
              position: "absolute",
              right: "8px",
              bottom: "8px",
              backgroundColor: "rgba(15, 23, 42, 0.94)",
              border: `1px solid ${selectedShot.outcome === "goal" ? "#ffd600" : "rgba(255, 255, 255, 0.18)"}`,
              borderRadius: "8px",
              padding: "8px 10px",
              fontSize: "10px",
              color: "#f8fafc",
              backdropFilter: "blur(6px)",
              minWidth: "120px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
              zIndex: 5,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", marginBottom: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "5px", minWidth: 0 }}>
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    backgroundColor: team === "home" ? "#0284c7" : "#e11d48",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <IonIcon icon={personOutline} style={{ fontSize: "10px", color: "#ffffff" }} />
                </div>
                <strong style={{ fontSize: "11px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {selectedShot.playerName} {selectedShot.minute}
                </strong>
              </div>

              <span
                style={{
                  backgroundColor: outcomeBadge.bg,
                  color: outcomeBadge.color,
                  padding: "1px 5px",
                  borderRadius: "3px",
                  fontSize: "8.5px",
                  fontWeight: 900,
                  flexShrink: 0,
                }}
              >
                {outcomeBadge.label}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", marginTop: "2px" }}>
              <span>xG</span>
              <strong style={{ color: "#10b981", fontFamily: "monospace" }}>{selectedShot.xG.toFixed(2)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8" }}>
              <span>xGOT</span>
              <strong style={{ color: "#00e5ff", fontFamily: "monospace" }}>{selectedShot.xGOT.toFixed(2)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8" }}>
              <span>Distance</span>
              <strong style={{ color: "#ffffff", fontFamily: "monospace" }}>{selectedShot.distanceM.toFixed(1)}m</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8" }}>
              <span>Body</span>
              <strong style={{ color: "#ffffff" }}>{selectedShot.foot}</strong>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ShootMapCard;
