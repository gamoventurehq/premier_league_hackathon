import React, { useState, useRef, useEffect } from "react";
import { IonIcon } from "@ionic/react";
import {
  playSkipBackOutline,
  playOutline,
  pauseOutline,
  playSkipForwardOutline,
  scanOutline,
  expandOutline,
  contractOutline,
  repeatOutline,
  settingsOutline,
  closeOutline,
  footballOutline,
  swapHorizontalOutline,
  warningOutline,
  videocamOutline,
  shieldCheckmarkOutline,
  handLeftOutline,
  flashOutline,
  gitBranchOutline,
  refreshOutline,
  radioOutline,
  checkmarkDoneOutline,
  arrowForwardCircleOutline,
  shuffleOutline,
  sparklesOutline,
  trendingUpOutline,
  arrowUpCircleOutline,
  flameOutline,
  navigateOutline,
  gitCompareOutline,
  flagOutline,
  locateOutline,
  alertCircleOutline,
  pulseOutline,
  handRightOutline,
} from "ionicons/icons";
import { useBaseMemory, baseMemory } from "../../store/baseMemory";
import { MatchEvent } from "../../types/telemetry";
import { telemetryService } from "../../services/telemetryService";

export function getMatchEventVisuals(evt: MatchEvent) {
  switch (evt.type) {
    case "clearance":
      return { icon: shieldCheckmarkOutline, color: "#3b82f6", bg: "rgba(59, 130, 246, 0.18)", tag: "CLEARANCE" };
    case "block":
      return { icon: handLeftOutline, color: "#6366f1", bg: "rgba(99, 102, 241, 0.18)", tag: "BLOCK" };
    case "tackle":
      return { icon: flashOutline, color: "#0284c7", bg: "rgba(2, 132, 199, 0.18)", tag: "TACKLE" };
    case "interception":
      return { icon: gitBranchOutline, color: "#06b6d4", bg: "rgba(6, 182, 212, 0.18)", tag: "INTERCEPT" };
    case "recovery":
      return { icon: refreshOutline, color: "#0ea5e9", bg: "rgba(14, 165, 233, 0.18)", tag: "RECOVERY" };
    case "save":
      return { icon: shieldCheckmarkOutline, color: "#ec4899", bg: "rgba(236, 72, 153, 0.18)", tag: "REFLEX SAVE" };
    case "punch":
      return { icon: radioOutline, color: "#d946ef", bg: "rgba(217, 70, 239, 0.18)", tag: "PUNCH" };
    case "claim":
      return { icon: checkmarkDoneOutline, color: "#a855f7", bg: "rgba(168, 85, 247, 0.18)", tag: "CLAIM" };
    case "goal_kick":
      return { icon: arrowForwardCircleOutline, color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.18)", tag: "GOAL KICK" };
    case "cross":
      return { icon: shuffleOutline, color: "#10b981", bg: "rgba(16, 185, 129, 0.18)", tag: "CROSS" };
    case "key_pass":
      return { icon: sparklesOutline, color: "#eab308", bg: "rgba(234, 179, 8, 0.18)", tag: "KEY PASS" };
    case "progressive_carry":
      return { icon: trendingUpOutline, color: "#14b8a6", bg: "rgba(20, 184, 166, 0.18)", tag: "CARRY" };
    case "aerial_duel":
      return { icon: arrowUpCircleOutline, color: "#f97316", bg: "rgba(249, 115, 22, 0.18)", tag: "AERIAL DUEL" };
    case "shot":
      return { icon: flameOutline, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.18)", tag: "SHOT" };
    case "goal":
      return { icon: footballOutline, color: "#22c55e", bg: "rgba(34, 197, 94, 0.22)", tag: "GOAL" };
    case "pass":
      return { icon: swapHorizontalOutline, color: "#64748b", bg: "rgba(100, 116, 139, 0.18)", tag: "PASS" };
    case "carry":
      return { icon: navigateOutline, color: "#64748b", bg: "rgba(100, 116, 139, 0.18)", tag: "CARRY" };
    case "duel":
      return { icon: gitCompareOutline, color: "#f97316", bg: "rgba(249, 115, 22, 0.18)", tag: "DUEL" };
    case "turnover":
      return { icon: repeatOutline, color: "#e11d48", bg: "rgba(225, 29, 72, 0.18)", tag: "TURNOVER" };
    case "corner_kick":
      return { icon: flagOutline, color: "#c084fc", bg: "rgba(192, 132, 252, 0.18)", tag: "CORNER" };
    case "free_kick":
      return { icon: locateOutline, color: "#38bdf8", bg: "rgba(56, 189, 248, 0.18)", tag: "FREE KICK" };
    case "yellow_card":
      return { icon: warningOutline, color: "#eab308", bg: "rgba(234, 179, 8, 0.22)", tag: "CAUTION" };
    case "red_card":
      return { icon: alertCircleOutline, color: "#ef4444", bg: "rgba(239, 68, 68, 0.25)", tag: "RED CARD" };
    case "foul":
      return { icon: warningOutline, color: "#fb923c", bg: "rgba(251, 146, 60, 0.18)", tag: "FOUL" };
    case "offside":
      return { icon: handRightOutline, color: "#94a3b8", bg: "rgba(148, 163, 184, 0.18)", tag: "OFFSIDE" };
    case "inflection":
      return { icon: pulseOutline, color: "#00e5ff", bg: "rgba(0, 229, 255, 0.20)", tag: "INFLECTION" };
    default:
      return { icon: footballOutline, color: "#38bdf8", bg: "rgba(56, 189, 248, 0.18)", tag: "EVENT" };
  }
}

const sampleMatchEvents: MatchEvent[] = [
  { id: "e1", matchClock: "90'+1", timestampMs: 5460000, type: "yellow_card", actorId: "away_2", targetId: null, x: 75, y: 30, team: "away", pitchSector: "Defensive Corridor", description: "E. Eze Cautioned • Tactical Breakdown" },
  { id: "e2", matchClock: "88'", timestampMs: 5280000, type: "tackle", actorId: "away_7", targetId: null, x: 60, y: 35, team: "away", pitchSector: "Midfield Pivot", description: "D. Rice Ground Challenge Won" },
  { id: "e3", matchClock: "87'", timestampMs: 5220000, type: "key_pass", actorId: "home_7", targetId: "home_10", x: 68, y: 22, team: "home", pitchSector: "Right Half-Space", pdr: 88, description: "K. De Bruyne Line-Breaking Key Pass" },
  { id: "e4", matchClock: "84'", timestampMs: 5040000, type: "goal", actorId: "away_8", targetId: null, x: 92, y: 32, team: "away", score: { home: 1, away: 1 }, speedKmH: 33.8, xG: 0.72, pitchSector: "Right Flank", description: "B. Saka Equalizer Goal!" },
  { id: "e5", matchClock: "81'", timestampMs: 4860000, type: "cross", actorId: "away_5", targetId: null, x: 88, y: 15, team: "away", pitchSector: "Left Channel", pdr: 82, description: "P. Dorgu Whipped Cross" },
  { id: "e6", matchClock: "75'", timestampMs: 4500000, type: "progressive_carry", actorId: "home_11", targetId: null, x: 55, y: 48, team: "home", speedKmH: 29.4, pitchSector: "Left Flank", description: "J. Grealish Vertical Progression" },
  { id: "e7", matchClock: "69'", timestampMs: 4140000, type: "clearance", actorId: "away_6", targetId: null, x: 12, y: 34, team: "away", pitchSector: "Penalty Box", description: "Gabriel Critical Box Clearance" },
  { id: "e8", matchClock: "64'", timestampMs: 3840000, type: "save", actorId: "away_1", targetId: null, x: 5, y: 34, team: "away", speedKmH: 98.2, xG: 0.64, pitchSector: "Goal Line", description: "D. Raya Reflex Diving Save" },
  { id: "e9", matchClock: "42'", timestampMs: 2520000, type: "goal", actorId: "home_10", targetId: "home_7", x: 95, y: 34, team: "home", score: { home: 1, away: 0 }, speedKmH: 108.4, xG: 0.78, pitchSector: "Penalty Box", description: "E. Haaland Opening Goal!" },
];

const TOTAL_MATCH_SEC = 5400; // 90 minutes

export const MediaTimelinePanel: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLooping, setIsLooping] = useState(false);
  const [isTrackingVisible, setIsTrackingVisible] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [streamQuality, setStreamQuality] = useState<"1080p60" | "720p60" | "4K HDR">("1080p60");
  const [interpolationMode, setInterpolationMode] = useState<"AI 5Hz" | "Raw 20Hz" | "Direct Telemetry">("AI 5Hz");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>("e3");

  const videoPanelRef = useRef<HTMLDivElement | null>(null);
  const timelineTrackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    const el = videoPanelRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const matchClock = useBaseMemory((s) => s.matchClock);
  const score = useBaseMemory((s) => s.score);
  const liveMatchEvents = useBaseMemory((s) => s.matchEvents);
  const displayEvents: MatchEvent[] = (liveMatchEvents && liveMatchEvents.length > 0)
    ? liveMatchEvents
    : sampleMatchEvents;

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
    telemetryService.jumpToSeconds(targetSec);
  };

  const handleSkip = (deltaSec: number) => {
    const nextSec = Math.min(TOTAL_MATCH_SEC + 300, Math.max(0, matchClock + deltaSec));
    baseMemory.setMatchClock(nextSec);
    telemetryService.jumpToSeconds(nextSec);
  };

  const handleSelectEvent = (evt: MatchEvent) => {
    setSelectedEventId(evt.id);
    const targetSec = evt.timestampMs ? Math.round(evt.timestampMs / 1000) : 0;
    baseMemory.setMatchClock(targetSec);
    telemetryService.jumpToSeconds(targetSec);
    if (evt.actorId) {
      baseMemory.setSelectedPlayer(evt.actorId);
    }
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
        ref={videoPanelRef}
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

          <div style={{ textAlign: "center", color: "var(--studio-subtext)", fontSize: "12px", marginTop: "16px" }}>
            <IonIcon icon={videocamOutline} style={{ fontSize: "28px", color: "var(--ion-color-secondary)", display: "block", margin: "0 auto 4px" }} />
            <span>Main Camera</span>
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
            {isTrackingVisible && (
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
                  transition: "opacity 0.2s ease",
                }}
              >
                <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#ffffff" }} />
              </div>
            )}
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
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={() => setIsLooping(!isLooping)}
            title={isLooping ? "Loop Playback: Active" : "Loop Playback: Off"}
            style={{
              background: isLooping ? "rgba(0, 229, 255, 0.15)" : "transparent",
              border: isLooping ? "1px solid rgba(0, 229, 255, 0.4)" : "1px solid transparent",
              borderRadius: "6px",
              padding: "4px",
              color: isLooping ? "#00e5ff" : "var(--studio-subtext)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              transition: "all 0.15s ease",
            }}
          >
            <IonIcon icon={repeatOutline} style={{ fontSize: "16px" }} />
          </button>

          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            title="Camera & Stream Settings"
            style={{
              background: isSettingsOpen ? "rgba(124, 58, 237, 0.2)" : "transparent",
              border: isSettingsOpen ? "1px solid var(--ion-color-primary)" : "1px solid transparent",
              borderRadius: "6px",
              padding: "4px",
              color: isSettingsOpen ? "#c084fc" : "var(--studio-subtext)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              transition: "all 0.15s ease",
            }}
          >
            <IonIcon icon={settingsOutline} style={{ fontSize: "16px" }} />
          </button>
        </div>

        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <button
            onClick={() => handleSkip(-300)}
            title="Rewind 5 minutes"
            style={{ background: "transparent", border: "none", color: "var(--studio-subtext)", cursor: "pointer", display: "flex", alignItems: "center" }}
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
            style={{ background: "transparent", border: "none", color: "var(--studio-subtext)", cursor: "pointer", display: "flex", alignItems: "center" }}
          >
            <IonIcon icon={playSkipForwardOutline} style={{ fontSize: "18px" }} />
          </button>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={() => setIsTrackingVisible(!isTrackingVisible)}
            title={isTrackingVisible ? "Hide Bounding Box Tracking" : "Show Bounding Box Tracking"}
            style={{
              background: isTrackingVisible ? "rgba(255, 214, 0, 0.12)" : "transparent",
              border: isTrackingVisible ? "1px solid rgba(255, 214, 0, 0.35)" : "1px solid transparent",
              borderRadius: "6px",
              padding: "4px",
              color: isTrackingVisible ? "#ffd600" : "var(--studio-subtext)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              transition: "all 0.15s ease",
            }}
          >
            <IonIcon icon={scanOutline} style={{ fontSize: "16px" }} />
          </button>

          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Maximize / Fullscreen"}
            style={{
              background: isFullscreen ? "rgba(16, 185, 129, 0.15)" : "transparent",
              border: isFullscreen ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid transparent",
              borderRadius: "6px",
              padding: "4px",
              color: isFullscreen ? "#10b981" : "var(--studio-subtext)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              transition: "all 0.15s ease",
            }}
          >
            <IonIcon icon={isFullscreen ? contractOutline : expandOutline} style={{ fontSize: "16px" }} />
          </button>
        </div>
      </div>

      {/* Camera & Stream Settings Modal / Dropdown */}
      {isSettingsOpen && (
        <div
          style={{
            backgroundColor: "var(--studio-inner-bg)",
            border: "1px solid var(--ion-color-primary)",
            borderRadius: "10px",
            padding: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            fontSize: "11px",
            animation: "fadeIn 0.15s ease",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 800, color: "var(--ion-text-color)" }}>Video & Stream Settings</span>
            <button
              onClick={() => setIsSettingsOpen(false)}
              style={{ background: "transparent", border: "none", color: "var(--studio-subtext)", cursor: "pointer" }}
            >
              <IonIcon icon={closeOutline} style={{ fontSize: "16px" }} />
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <div>
              <span style={{ color: "var(--studio-subtext)", fontSize: "10px", display: "block", marginBottom: "4px" }}>
                Resolution
              </span>
              <div style={{ display: "flex", gap: "4px" }}>
                {(["720p60", "1080p60", "4K HDR"] as const).map((q) => (
                  <button
                    key={q}
                    onClick={() => setStreamQuality(q)}
                    style={{
                      padding: "3px 6px",
                      borderRadius: "4px",
                      border: streamQuality === q ? "1px solid #7c3aed" : "1px solid var(--studio-panel-border)",
                      backgroundColor: streamQuality === q ? "rgba(124, 58, 237, 0.3)" : "transparent",
                      color: streamQuality === q ? "#ffffff" : "var(--studio-subtext)",
                      fontSize: "9.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span style={{ color: "var(--studio-subtext)", fontSize: "10px", display: "block", marginBottom: "4px" }}>
                Telemetry Sync
              </span>
              <div style={{ display: "flex", gap: "4px" }}>
                {(["AI 5Hz", "Raw 20Hz"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setInterpolationMode(mode)}
                    style={{
                      padding: "3px 6px",
                      borderRadius: "4px",
                      border: interpolationMode === mode ? "1px solid #00e5ff" : "1px solid var(--studio-panel-border)",
                      backgroundColor: interpolationMode === mode ? "rgba(0, 229, 255, 0.2)" : "transparent",
                      color: interpolationMode === mode ? "#00e5ff" : "var(--studio-subtext)",
                      fontSize: "9.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--ion-text-color)" }}>
            Match Events Timeline
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--studio-subtext)", fontFamily: "monospace" }}>
              {displayEvents.length} Events Logged
            </span>
            <span style={{ fontSize: "9px", fontWeight: 800, color: "#10b981", backgroundColor: "rgba(16, 185, 129, 0.15)", padding: "1px 5px", borderRadius: "4px", fontFamily: "monospace" }}>
              {displayEvents.filter((e) => (e.timestampMs ? e.timestampMs / 1000 : 0) <= matchClock).length} elapsed ({formatClock(matchClock)})
            </span>
          </div>
        </div>

        {displayEvents.map((evt) => {
          const evtSec = evt.timestampMs ? evt.timestampMs / 1000 : 0;
          const isElapsed = evtSec <= matchClock;
          const isSelected = selectedEventId === evt.id;
          const visuals = getMatchEventVisuals(evt);
          const metricPill = evt.xG !== undefined
            ? `xG: ${evt.xG.toFixed(2)}`
            : evt.pdr !== undefined
            ? `PDR: ${Math.round(evt.pdr)}%`
            : evt.speedKmH
            ? `${evt.speedKmH.toFixed(1)} km/h`
            : evt.score && evt.type === "goal"
            ? `${evt.score.home} - ${evt.score.away}`
            : evt.pitchSector
            ? evt.pitchSector
            : null;

          return (
            <div
              key={evt.id}
              onClick={() => handleSelectEvent(evt)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px",
                backgroundColor: isSelected
                  ? "rgba(124, 58, 237, 0.18)"
                  : isElapsed
                  ? "var(--studio-inner-bg)"
                  : "rgba(15, 23, 42, 0.4)",
                borderRadius: "8px",
                fontSize: "11px",
                border: isSelected
                  ? "1.5px solid #7c3aed"
                  : isElapsed
                  ? "1px solid var(--studio-panel-border)"
                  : "1px dashed rgba(255, 255, 255, 0.08)",
                cursor: "pointer",
                transition: "all 0.15s ease",
                gap: "8px",
                minWidth: 0,
                opacity: isElapsed ? 1 : 0.45,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: "1 1 0%" }}>
                <span style={{ fontWeight: 800, fontFamily: "monospace", color: isSelected ? "#00e5ff" : "var(--ion-color-primary)", minWidth: "34px", flexShrink: 0 }}>
                  {evt.matchClock}
                </span>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "22px",
                    height: "22px",
                    borderRadius: "5px",
                    backgroundColor: visuals.bg,
                    flexShrink: 0,
                  }}
                >
                  <IonIcon icon={visuals.icon} style={{ color: visuals.color, fontSize: "14px" }} />
                </div>

                <span
                  style={{
                    backgroundColor: visuals.bg,
                    color: visuals.color,
                    padding: "1px 5px",
                    borderRadius: "3px",
                    fontWeight: 900,
                    fontSize: "8.5px",
                    letterSpacing: "0.4px",
                    flexShrink: 0,
                  }}
                >
                  {visuals.tag}
                </span>

                <span
                  title={evt.description || `${evt.actorId || 'Player'} ${evt.type}`}
                  style={{
                    fontWeight: 700,
                    color: "var(--ion-text-color)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: "1 1 0%",
                    minWidth: 0,
                  }}
                >
                  {evt.description || `${evt.actorId || 'Player'} ${evt.type}`}
                </span>
              </div>

              {metricPill && (
                <span
                  title={String(metricPill)}
                  style={{
                    backgroundColor: evt.type === "goal" ? "rgba(34, 197, 94, 0.2)" : "rgba(255, 255, 255, 0.08)",
                    color: evt.type === "goal" ? "#22c55e" : "#94a3b8",
                    padding: "2px 7px",
                    borderRadius: "4px",
                    fontWeight: 800,
                    fontSize: "9.5px",
                    fontFamily: "monospace",
                    flexShrink: 0,
                    maxWidth: "90px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    border: evt.type === "goal" ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                >
                  {metricPill}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
