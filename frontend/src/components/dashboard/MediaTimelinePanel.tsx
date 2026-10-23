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
import { MatchEventItem } from "../../types/telemetry";
import { telemetryService } from "../../services/telemetryService";

const TOTAL_MATCH_SEC = 5400; // 90 minutes

export const MediaTimelinePanel: React.FC = () => {
  const isPlaying = useBaseMemory((s) => s.isPlaying);
  const [selectedEventId, setSelectedEventId] = useState<string>("e3");
  const timelineTrackRef = useRef<HTMLDivElement | null>(null);

  const matchClock = useBaseMemory((s) => s.matchClock);
  const score = useBaseMemory((s) => s.score);
  const events = useBaseMemory((s) => s.timelineEvents);
  const currentFrame = useBaseMemory((s) => s.currentFrame);
  const selectedPlayerId = useBaseMemory((s) => s.selectedPlayerId);
  const homeLineup = useBaseMemory((s) => s.homeLineup);
  const awayLineup = useBaseMemory((s) => s.awayLineup);

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
    telemetryService.sendCommand({ command: "seek", time: targetSec });
  };

  const handleSkip = (deltaSec: number) => {
    const nextSec = Math.min(TOTAL_MATCH_SEC + 300, Math.max(0, matchClock + deltaSec));
    baseMemory.setMatchClock(nextSec);
    telemetryService.sendCommand({ command: "seek", time: nextSec });
  };

  const handleSelectEvent = (evt: MatchEventItem) => {
    setSelectedEventId(evt.id);
    baseMemory.setMatchClock(evt.timeSec);
    baseMemory.setSelectedPlayer(evt.playerId);
    telemetryService.sendCommand({ command: "seek", time: evt.timeSec });
  };

  const handleTogglePlay = () => {
    const nextPlaying = !isPlaying;
    baseMemory.setIsPlaying(nextPlaying);
    telemetryService.sendCommand({ command: nextPlaying ? "play" : "pause" });
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
        {/* Main Feed with Broadcast Score Bug & Live Tracking Canvas */}
        <div
          style={{
            height: "140px",
            backgroundColor: "#0d2818",
            backgroundImage: "radial-gradient(ellipse at center, #14532d 0%, #052e16 100%)",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Synthetic Turf Pitch Markings */}
          <div
            style={{
              position: "absolute",
              inset: "8px",
              border: "1.5px solid rgba(255, 255, 255, 0.2)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "8px",
              bottom: "8px",
              width: "1.5px",
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              border: "1.5px solid rgba(255, 255, 255, 0.2)",
              pointerEvents: "none",
            }}
          />

          {/* Live Score Bug Header (Top Left) */}
          <div
            style={{
              position: "absolute",
              top: "10px",
              left: "10px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "rgba(15, 23, 42, 0.85)",
              padding: "4px 8px",
              borderRadius: "6px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(4px)",
              zIndex: 5,
            }}
          >
            <span style={{ fontSize: "11px", fontWeight: 900, color: score.homeMeta.color }}>
              {score.homeMeta.shortCode}
            </span>
            <span style={{ fontSize: "11px", fontWeight: 900, color: "#ffffff" }}>
              {score.homeScore} - {score.awayScore}
            </span>
            <span style={{ fontSize: "11px", fontWeight: 900, color: score.awayMeta.color }}>
              {score.awayMeta.shortCode}
            </span>
            <span style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "monospace", marginLeft: "4px" }}>
              {formatClock(matchClock)}
            </span>
          </div>

          {/* Broadcast HUD Live Indicator (Top Right) */}
          <div
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              backgroundColor: "rgba(15, 23, 42, 0.85)",
              padding: "3px 8px",
              borderRadius: "6px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              fontSize: "9px",
              fontFamily: "monospace",
              color: "#f43f5e",
              fontWeight: 800,
              zIndex: 5,
            }}
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#f43f5e", animation: "pulse 1s infinite" }} />
            <span>LIVE CAM-1</span>
          </div>

          {/* Dynamic Spatial Ball Tracking in Broadcast View */}
          {currentFrame?.ball && (
            <div
              style={{
                position: "absolute",
                left: `${(currentFrame.ball.x / 105.0) * 100}%`,
                top: `${(currentFrame.ball.y / 68.0) * 100}%`,
                transform: "translate(-50%, -50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                pointerEvents: "none",
                zIndex: 6,
                transition: "left 0.2s linear, top 0.2s linear",
              }}
            >
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  backgroundColor: "#ffd600",
                  border: "1.5px solid #ffffff",
                  boxShadow: "0 0 10px #ffd600, 0 0 16px rgba(255,214,0,0.8)",
                }}
              />
              <span
                style={{
                  fontSize: "7px",
                  fontWeight: 800,
                  color: "#ffd600",
                  backgroundColor: "rgba(0,0,0,0.6)",
                  padding: "1px 3px",
                  borderRadius: "2px",
                  marginTop: "2px",
                  fontFamily: "monospace",
                }}
              >
                {currentFrame.ball.speed_kmh.toFixed(1)} km/h
              </span>
            </div>
          )}

          {/* Active Ball Carrier Reticle in View */}
          {(() => {
            const allPlayers = [...homeLineup, ...awayLineup];
            const ballCarrier = allPlayers.find((p) => p.is_ball_carrier);
            if (!ballCarrier) return null;
            return (
              <div
                style={{
                  position: "absolute",
                  left: `${ballCarrier.x}%`,
                  top: `${ballCarrier.y}%`,
                  transform: "translate(-50%, -50%)",
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  border: `1.5px dashed ${ballCarrier.team === "home" ? score.homeMeta.color : score.awayMeta.color}`,
                  animation: "spin 4s linear infinite",
                  pointerEvents: "none",
                  zIndex: 4,
                  transition: "left 0.2s linear, top 0.2s linear",
                }}
              />
            );
          })()}

          {/* Corner PIP 1: Tactical Radar (22 Live Tracking Dots + Ball) */}
          <div
            style={{
              position: "absolute",
              bottom: "8px",
              left: "8px",
              width: "75px",
              height: "46px",
              backgroundColor: "rgba(5, 46, 22, 0.9)",
              borderRadius: "6px",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              overflow: "hidden",
              zIndex: 7,
            }}
            title="Mini Radar Feed"
          >
            <div style={{ position: "relative", width: "100%", height: "100%" }}>
              {homeLineup.map((p) => (
                <div
                  key={p.id}
                  style={{
                    position: "absolute",
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    transform: "translate(-50%, -50%)",
                    width: "3px",
                    height: "3px",
                    borderRadius: "50%",
                    backgroundColor: score.homeMeta.color,
                    transition: "left 0.2s linear, top 0.2s linear",
                  }}
                />
              ))}
              {awayLineup.map((p) => (
                <div
                  key={p.id}
                  style={{
                    position: "absolute",
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    transform: "translate(-50%, -50%)",
                    width: "3px",
                    height: "3px",
                    borderRadius: "50%",
                    backgroundColor: score.awayMeta.color,
                    transition: "left 0.2s linear, top 0.2s linear",
                  }}
                />
              ))}
              {currentFrame?.ball && (
                <div
                  style={{
                    position: "absolute",
                    left: `${(currentFrame.ball.x / 105.0) * 100}%`,
                    top: `${(currentFrame.ball.y / 68.0) * 100}%`,
                    transform: "translate(-50%, -50%)",
                    width: "4px",
                    height: "4px",
                    borderRadius: "50%",
                    backgroundColor: "#ffd600",
                    transition: "left 0.2s linear, top 0.2s linear",
                  }}
                />
              )}
              <span
                style={{
                  position: "absolute",
                  bottom: "2px",
                  left: "3px",
                  fontSize: "7px",
                  fontWeight: 900,
                  color: "rgba(255,255,255,0.7)",
                  letterSpacing: "0.5px",
                }}
              >
                RADAR
              </span>
            </div>
          </div>

          {/* Corner PIP 2: Live Player Cam Tracking */}
          {(() => {
            const allPlayers = [...homeLineup, ...awayLineup];
            const activePlayer = allPlayers.find((p) => p.id === selectedPlayerId) || homeLineup[6];
            const teamColor = activePlayer.team === "home" ? score.homeMeta.color : score.awayMeta.color;
            return (
              <div
                style={{
                  position: "absolute",
                  bottom: "8px",
                  right: "8px",
                  width: "75px",
                  height: "46px",
                  backgroundColor: "rgba(15, 23, 42, 0.9)",
                  borderRadius: "6px",
                  border: `1px solid ${teamColor}`,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  padding: "4px",
                  zIndex: 7,
                }}
                title={`Tracking ${activePlayer.name}`}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "8px", fontWeight: 900, color: teamColor }}>
                    #{activePlayer.number}
                  </span>
                  <span style={{ fontSize: "7px", color: "#10b981", fontWeight: 800 }}>
                    {activePlayer.speed_kmh ? `${activePlayer.speed_kmh.toFixed(1)}k` : "14k"}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "7px",
                    fontWeight: 700,
                    color: "#ffffff",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    marginTop: "1px",
                  }}
                >
                  {activePlayer.name.split(" ").pop()}
                </div>
                <span style={{ fontSize: "6px", color: "var(--studio-subtext)", letterSpacing: "0.5px" }}>
                  PLAYER CAM
                </span>
              </div>
            );
          })()}
        </div>

        {/* Media Controls Bar */}
        <div
          style={{
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "var(--studio-inner-bg)",
            borderTop: "1px solid var(--studio-panel-border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={() => handleSkip(-30)}
              style={{ background: "none", border: "none", color: "var(--studio-subtext)", cursor: "pointer", padding: "2px" }}
              title="Skip back 30s"
            >
              <IonIcon icon={playSkipBackOutline} style={{ fontSize: "14px" }} />
            </button>
            <button
              onClick={handleTogglePlay}
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "50%",
                background: "var(--ion-color-primary)",
                border: "none",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <IonIcon icon={isPlaying ? pauseOutline : playOutline} style={{ fontSize: "14px" }} />
            </button>
            <button
              onClick={() => handleSkip(30)}
              style={{ background: "none", border: "none", color: "var(--studio-subtext)", cursor: "pointer", padding: "2px" }}
              title="Skip forward 30s"
            >
              <IonIcon icon={playSkipForwardOutline} style={{ fontSize: "14px" }} />
            </button>
            <span style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--ion-text-color)", fontWeight: 700 }}>
              {formatClock(matchClock)}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--studio-subtext)" }}>
            <IonIcon icon={repeatOutline} style={{ fontSize: "14px", cursor: "pointer" }} />
            <IonIcon icon={scanOutline} style={{ fontSize: "14px", cursor: "pointer" }} />
            <IonIcon icon={settingsOutline} style={{ fontSize: "14px", cursor: "pointer" }} />
            <IonIcon icon={expandOutline} style={{ fontSize: "14px", cursor: "pointer" }} />
          </div>
        </div>

        {/* Interactive Scrub Bar with Event Markers */}
        <div
          ref={timelineTrackRef}
          onClick={handleTimelineScrub}
          style={{
            height: "14px",
            backgroundColor: "#020617",
            position: "relative",
            cursor: "pointer",
            borderTop: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          {/* Progress fill */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: `${playheadPercent}%`,
              backgroundColor: "rgba(124, 58, 237, 0.4)",
            }}
          />

          {/* Event Tick Markers */}
          {events.map((evt) => {
            const markerPct = Math.min(100, Math.max(0, (evt.timeSec / TOTAL_MATCH_SEC) * 100));
            const color =
              evt.type === "goal"
                ? "#ffd600"
                : evt.type === "card"
                ? "#ef4444"
                : "#00e5ff";
            return (
              <div
                key={evt.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectEvent(evt);
                }}
                style={{
                  position: "absolute",
                  left: `${markerPct}%`,
                  top: "2px",
                  bottom: "2px",
                  width: "3px",
                  backgroundColor: color,
                  borderRadius: "1px",
                  zIndex: 2,
                }}
                title={`${evt.time} - ${evt.player} (${evt.type})`}
              />
            );
          })}

          {/* Playhead thumb */}
          <div
            style={{
              position: "absolute",
              left: `${playheadPercent}%`,
              top: "-1px",
              bottom: "-1px",
              width: "4px",
              backgroundColor: "#ffffff",
              borderRadius: "2px",
              boxShadow: "0 0 6px rgba(255,255,255,0.8)",
              transform: "translateX(-50%)",
              zIndex: 4,
            }}
          />
        </div>
      </div>

      {/* Chronological Match Events Feed */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--ion-text-color)" }}>
            Match Events Timeline
          </span>
          <span style={{ fontSize: "10px", color: "var(--studio-subtext)" }}>
            Click event to seek
          </span>
        </div>

        <div
          style={{
            maxHeight: "360px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            paddingRight: "2px",
          }}
        >
          {events.map((evt) => {
            const isSelected = evt.id === selectedEventId;
            return (
              <div
                key={evt.id}
                onClick={() => handleSelectEvent(evt)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  backgroundColor: isSelected ? "rgba(124, 58, 237, 0.2)" : "var(--studio-inner-bg)",
                  border: isSelected ? "1px solid var(--ion-color-primary)" : "1px solid var(--studio-panel-border)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 900,
                      color: "var(--ion-color-primary)",
                      fontFamily: "monospace",
                      minWidth: "34px",
                    }}
                  >
                    {evt.time}
                  </span>

                  {/* Event Type Icon */}
                  <div
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      backgroundColor:
                        evt.type === "goal"
                          ? "rgba(255, 214, 0, 0.15)"
                          : evt.type === "card"
                          ? "rgba(239, 68, 68, 0.15)"
                          : "rgba(0, 229, 255, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IonIcon
                      icon={
                        evt.type === "goal"
                          ? footballOutline
                          : evt.type === "card"
                          ? warningOutline
                          : swapHorizontalOutline
                      }
                      style={{
                        fontSize: "12px",
                        color:
                          evt.type === "goal"
                            ? "#ffd600"
                            : evt.type === "card"
                            ? "#ef4444"
                            : "#00e5ff",
                      }}
                    />
                  </div>

                  {/* Player & Event Info */}
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--ion-text-color)" }}>
                      {evt.player}
                    </div>
                    {evt.subOut && (
                      <div style={{ fontSize: "10px", color: "var(--studio-subtext)" }}>
                        Sub for: {evt.subOut}
                      </div>
                    )}
                    {evt.detail && (
                      <div style={{ fontSize: "10px", color: "var(--studio-subtext)" }}>
                        {evt.detail}
                      </div>
                    )}
                  </div>
                </div>

                {/* Score badge if goal */}
                {evt.score && (
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 900,
                      color: "#ffffff",
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      padding: "2px 6px",
                      borderRadius: "4px",
                    }}
                  >
                    {evt.score}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
