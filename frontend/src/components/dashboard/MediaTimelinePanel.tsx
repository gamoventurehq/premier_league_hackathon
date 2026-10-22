import React, { useState, useRef } from "react";
import { IonIcon } from "@ionic/react";
import {
  playSkipBackOutline,
  playOutline,
  pauseOutline,
  playSkipForwardOutline,
  scanOutline,
  expandOutline,
  repeatOutline,
  settingsOutline,
  footballOutline,
  swapHorizontalOutline,
  warningOutline,
  videocamOutline,
} from "ionicons/icons";
import { useBaseMemory, baseMemory } from "../../store/baseMemory";

interface MatchEventItem {
  id: string;
  time: string;
  timeSec: number;
  type: "goal" | "sub" | "card";
  player: string;
  playerId: string;
  detail?: string;
  score?: string;
  subOut?: string;
}

const simulatedEvents: MatchEventItem[] = [
  { id: "e1", time: "90'+1", timeSec: 5460, type: "card", player: "E. Eze Fouls", playerId: "away_2", detail: "Tactical breakdown" },
  { id: "e2", time: "88'", timeSec: 5280, type: "sub", player: "A. Diallo", subOut: "N. Mazraoui", playerId: "away_7" },
  { id: "e3", time: "87'", timeSec: 5220, type: "goal", player: "K. De Bruyne", score: "2 - 3", playerId: "home_7" },
  { id: "e4", time: "84'", timeSec: 5040, type: "goal", player: "B. Saka", score: "2 - 2", playerId: "away_8" },
  { id: "e5", time: "81'", timeSec: 4860, type: "sub", player: "P. Dorgu", subOut: "B. Šeško", playerId: "away_5" },
  { id: "e6", time: "75'", timeSec: 4500, type: "sub", player: "J. Grealish", subOut: "P. Foden", playerId: "home_11" },
  { id: "e7", time: "69'", timeSec: 4140, type: "goal", player: "E. Haaland", score: "1 - 2", playerId: "home_10" },
  { id: "e8", time: "64'", timeSec: 3840, type: "card", player: "D. Rice Fouls", playerId: "away_7", detail: "Yellow card" },
  { id: "e9", time: "42'", timeSec: 2520, type: "goal", player: "E. Haaland", score: "1 - 0", playerId: "home_10" },
];

const TOTAL_MATCH_SEC = 5400; // 90 minutes

export const MediaTimelinePanel: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string>("e3");
  const timelineTrackRef = useRef<HTMLDivElement | null>(null);

  const matchClock = useBaseMemory((s) => s.matchClock);
  const score = useBaseMemory((s) => s.score);

  const formatClock = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Timeline scrubber drag/click interaction
  const handleTimelineScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const track = timelineTrackRef.current;
    if (!track) return;

    const rect = track.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.min(1, Math.max(0, clickX / rect.width));
    const targetSec = Math.round(pct * TOTAL_MATCH_SEC);

    baseMemory.setMatchClock(targetSec);
  };

  const handleSkip = (deltaSec: number) => {
    const nextSec = Math.min(TOTAL_MATCH_SEC + 300, Math.max(0, matchClock + deltaSec));
    baseMemory.setMatchClock(nextSec);
  };

  const handleSelectEvent = (evt: MatchEventItem) => {
    setSelectedEventId(evt.id);
    baseMemory.setMatchClock(evt.timeSec);
    baseMemory.setSelectedPlayer(evt.playerId);
  };

  const playheadPercent = Math.min(100, Math.max(0, (matchClock / TOTAL_MATCH_SEC) * 100));

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
      {/* Multi-Angle Video Panel */}
      <div
        style={{
          borderRadius: "12px",
          overflow: "hidden",
          border: "1px solid var(--studio-panel-border)",
          backgroundColor: "#020617",
          position: "relative",
        }}
      >
        {/* Main Feed with Broadcast Score Bug */}
        <div
          style={{
            height: "140px",
            background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Live Score Bug Header */}
          <div
            style={{
              position: "absolute",
              top: "8px",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              alignItems: "center",
              backgroundColor: "rgba(15, 23, 42, 0.9)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "6px",
              overflow: "hidden",
              fontSize: "11px",
              fontWeight: 800,
              zIndex: 3,
            }}
          >
            <span style={{ backgroundColor: "#0284c7", color: "#ffffff", padding: "2px 8px" }}>
              {score.homeTeam}
            </span>
            <span style={{ color: "#ffffff", padding: "2px 8px" }}>
              {score.homeScore} - {score.awayScore}
            </span>
            <span style={{ backgroundColor: "#e11d48", color: "#ffffff", padding: "2px 8px" }}>
              {score.awayTeam}
            </span>
            <span style={{ color: "#10b981", padding: "2px 8px", fontFamily: "monospace" }}>
              {formatClock(matchClock)}
            </span>
          </div>

          <div style={{ textAlign: "center", color: "var(--studio-subtext)", fontSize: "12px" }}>
            <IonIcon icon={videocamOutline} style={{ fontSize: "28px", color: "var(--ion-color-secondary)", display: "block", margin: "0 auto 4px" }} />
            <span>Simulated Broadcast Camera (Angle 1)</span>
          </div>
        </div>

        {/* Dual Sub-Angles (Player Cam & Ball Tracking with bounding box) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", height: "100px", borderTop: "1px solid var(--studio-panel-border)" }}>
          {/* Angle 2: Player Cam */}
          <div
            style={{
              backgroundColor: "#0b1220",
              borderRight: "1px solid var(--studio-panel-border)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <span style={{ position: "absolute", top: "4px", left: "6px", fontSize: "9px", color: "#00e5ff", fontWeight: 700 }}>
              Player Cam (K. De Bruyne)
            </span>
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>Optical Isolation</span>
          </div>

          {/* Angle 3: Ball Physics Tracking */}
          <div
            style={{
              backgroundColor: "#070c16",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <span style={{ position: "absolute", top: "4px", left: "6px", fontSize: "9px", color: "#ffd600", fontWeight: 700 }}>
              Ball Tracking
            </span>
            {/* Visual Tracking Bounding Box */}
            <div
              style={{
                width: "40px",
                height: "40px",
                border: "2px solid #ffd600",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 8px rgba(255, 214, 0, 0.4)",
              }}
            >
              <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#ffffff" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Media Playback Controls Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "4px 8px",
          color: "var(--studio-subtext)",
        }}
      >
        <div style={{ display: "flex", gap: "10px" }}>
          <IonIcon icon={repeatOutline} style={{ cursor: "pointer" }} />
          <IonIcon icon={settingsOutline} style={{ cursor: "pointer" }} />
        </div>

        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <button
            onClick={() => handleSkip(-300)}
            title="Rewind 5 minutes"
            style={{ background: "transparent", border: "none", color: "var(--studio-subtext)", cursor: "pointer" }}
          >
            <IonIcon icon={playSkipBackOutline} style={{ fontSize: "18px" }} />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              background: "var(--ion-color-primary)",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(124, 58, 237, 0.4)",
            }}
          >
            <IonIcon icon={isPlaying ? pauseOutline : playOutline} style={{ fontSize: "16px" }} />
          </button>

          <button
            onClick={() => handleSkip(300)}
            title="Fast Forward 5 minutes"
            style={{ background: "transparent", border: "none", color: "var(--studio-subtext)", cursor: "pointer" }}
          >
            <IonIcon icon={playSkipForwardOutline} style={{ fontSize: "18px" }} />
          </button>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <IonIcon icon={scanOutline} style={{ cursor: "pointer" }} />
          <IonIcon icon={expandOutline} style={{ cursor: "pointer" }} />
        </div>
      </div>

      {/* Interactive Multi-Track Scrubber Timeline */}
      <div
        style={{
          backgroundColor: "var(--studio-inner-bg)",
          borderRadius: "10px",
          padding: "10px",
          border: "1px solid var(--studio-panel-border)",
          userSelect: "none",
        }}
      >
        {/* Time Markers */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "9px",
            color: "var(--studio-subtext)",
            fontFamily: "monospace",
            marginBottom: "6px",
          }}
        >
          <span>00:00</span>
          <span>45:00</span>
          <span>90:00</span>
        </div>

        {/* Interactive Scrub Track */}
        <div
          ref={timelineTrackRef}
          onClick={handleTimelineScrub}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "5px",
            position: "relative",
            cursor: "pointer",
            padding: "4px 0",
          }}
        >
          {/* Possession Track */}
          <div style={{ height: "12px", backgroundColor: "rgba(244, 63, 94, 0.25)", borderRadius: "3px", width: "100%" }} />
          {/* Momentum Track */}
          <div style={{ height: "12px", backgroundColor: "rgba(0, 229, 255, 0.25)", borderRadius: "3px", width: "100%" }} />
          {/* Event Chip Track */}
          <div style={{ height: "12px", backgroundColor: "rgba(255, 214, 0, 0.15)", borderRadius: "3px", width: "100%", position: "relative" }}>
            {/* Goal marker chip matching reference image (M. Cunha 69') */}
            <div
              style={{
                position: "absolute",
                left: "76%",
                top: "-2px",
                transform: "translateX(-50%)",
                backgroundColor: "#7c3aed",
                color: "#ffffff",
                padding: "1px 6px",
                borderRadius: "4px",
                fontSize: "8px",
                fontWeight: 800,
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: "2px",
              }}
            >
              <IonIcon icon={footballOutline} style={{ fontSize: "8px" }} />
              <span>Cunha 69'</span>
            </div>
          </div>

          {/* Draggable Scrubber Playhead Line with Glow */}
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${playheadPercent}%`,
              width: "3px",
              backgroundColor: "#ffffff",
              boxShadow: "0 0 10px #ffffff, 0 0 4px #7c3aed",
              transform: "translateX(-50%)",
              zIndex: 5,
            }}
          >
            {/* Playhead handle knob */}
            <div
              style={{
                width: "9px",
                height: "9px",
                borderRadius: "50%",
                backgroundColor: "#ffffff",
                position: "absolute",
                top: "-4px",
                left: "-3px",
                boxShadow: "0 0 6px rgba(0,0,0,0.5)",
              }}
            />
          </div>
        </div>

        <div style={{ textAlign: "center", fontSize: "10px", color: "var(--studio-subtext)", marginTop: "4px" }}>
          Click or scrub along the tracks to jump match time
        </div>
      </div>

      {/* Chronological Match Events Feed (Clickable with Player Focus) */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          maxHeight: "280px",
          overflowY: "auto",
        }}
      >
        <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--studio-subtext)", textTransform: "uppercase" }}>
          Match Events Timeline (Click to Jump)
        </span>

        {simulatedEvents.map((evt) => {
          const isSelected = selectedEventId === evt.id;
          return (
            <div
              key={evt.id}
              onClick={() => handleSelectEvent(evt)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px",
                backgroundColor: isSelected ? "rgba(124, 58, 237, 0.18)" : "var(--studio-inner-bg)",
                borderRadius: "8px",
                fontSize: "11px",
                border: isSelected ? "1.5px solid #7c3aed" : "1px solid var(--studio-panel-border)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontWeight: 800, fontFamily: "monospace", color: isSelected ? "#00e5ff" : "var(--ion-color-primary)", minWidth: "34px" }}>
                  {evt.time}
                </span>
                {evt.type === "goal" && (
                  <IonIcon icon={footballOutline} style={{ color: "#10b981", fontSize: "15px" }} />
                )}
                {evt.type === "sub" && (
                  <IonIcon icon={swapHorizontalOutline} style={{ color: "#38bdf8", fontSize: "15px" }} />
                )}
                {evt.type === "card" && (
                  <IonIcon icon={warningOutline} style={{ color: "#f59e0b", fontSize: "15px" }} />
                )}
                <span style={{ fontWeight: 700, color: "var(--ion-text-color)" }}>
                  {evt.player}
                </span>
              </div>

              {evt.score ? (
                <span
                  style={{
                    backgroundColor: "rgba(16, 185, 129, 0.2)",
                    color: "#10b981",
                    padding: "2px 7px",
                    borderRadius: "4px",
                    fontWeight: 800,
                    fontSize: "10px",
                  }}
                >
                  {evt.score}
                </span>
              ) : evt.subOut ? (
                <span style={{ color: "var(--studio-subtext)", fontSize: "10px" }}>
                  ⇄ {evt.subOut}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};
