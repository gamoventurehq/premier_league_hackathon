import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonBadge,
  IonButtons,
  IonIcon,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonProgressBar,
  useIonViewDidEnter,
  useIonViewWillEnter,
} from "@ionic/react";
import {
  eyeOutline,
  gitNetworkOutline,
  radioOutline,
  mapOutline,
  speedometerOutline,
  locationOutline,
  compassOutline,
  pulseOutline,
  personOutline,
  flashOutline,
  videocamOutline,
  timeOutline,
  layersOutline,
} from "ionicons/icons";
import { useBaseMemory, baseMemory } from "../store/baseMemory";
import { PitchRadarCanvas, CameraAngle } from "../components/PitchRadarCanvas";
import { StudioChipScroller } from "../components/StudioChipScroller";
import {
  ROSTER_SPOTLIGHT,
  KEY_PLAYER_PRESETS,
  PlayerSpotlightProfile,
} from "../types/playerRoster";

const LivePitchPage: React.FC = () => {
  const [cameraAngle, setCameraAngle] = useState<CameraAngle>("overhead");
  const [showVectors, setShowVectors] = useState(true);
  const [showLanes, setShowLanes] = useState(true);
  const [showPitchControl, setShowPitchControl] = useState(true);
  const [mobileTab, setMobileTab] = useState<"pitch" | "player" | "all">("pitch");
  const [viewEpoch, setViewEpoch] = useState(0);
  const location = useLocation();

  // Wake up and refresh canvas every time this view enters or is navigated to
  useIonViewDidEnter(() => {
    setViewEpoch((v) => v + 1);
  });

  useIonViewWillEnter(() => {
    setViewEpoch((v) => v + 1);
  });

  useEffect(() => {
    if (location.pathname === "/pitch") {
      setViewEpoch((v) => v + 1);
    }
  }, [location.pathname]);

  // Subscribe to Single Base Memory
  const score = useBaseMemory((s) => s.score);
  const matchClock = useBaseMemory((s) => s.matchClock);
  const serverStatus = useBaseMemory((s) => s.serverStatus);
  const activeInflection = useBaseMemory(
    (s) => s.blackboard.active_tactical_inflection
  );
  const rhythm = useBaseMemory((s) => s.blackboard.current_game_rhythm);
  const controlIndex = useBaseMemory((s) => s.blackboard.control_index);
  const chaosIndex = useBaseMemory((s) => s.blackboard.chaos_index);
  const selectedPlayerId = useBaseMemory((s) => s.selectedPlayerId);
  const currentFrame = useBaseMemory((s) => s.currentFrame);

  const formatTime = (secs: number) => {
    const clamped = Math.min(5400, Math.max(0, Math.floor(secs || 0)));
    const m = Math.floor(clamped / 60);
    const s = Math.floor(clamped % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Resolve currently spotlighted player from Single Core Memory with robust fallbacks
  const profile: PlayerSpotlightProfile =
    (selectedPlayerId && ROSTER_SPOTLIGHT[selectedPlayerId]) ||
    ROSTER_SPOTLIGHT.home_7;
  const isHome = profile.club === "Manchester City";
  const teamColor = isHome ? "#00e5ff" : "#f43f5e";

  // Resolve real-time spatial telemetry from current frame
  const liveTelemetry = currentFrame?.players?.find(
    (p) => p.player_id === selectedPlayerId
  );
  const liveSpeed = liveTelemetry?.speed_kmh ?? 14.2;
  const liveX = liveTelemetry ? liveTelemetry.x : 52.5;
  const liveY = liveTelemetry ? liveTelemetry.y : 34.0;
  const heading = liveTelemetry?.heading_deg ?? 90;

  // Key quick-pick player presets
  const homePresets = KEY_PLAYER_PRESETS.filter((p) => p.team === "home");
  const awayPresets = KEY_PLAYER_PRESETS.filter((p) => p.team === "away");

  return (
    <IonPage>
      <IonHeader mode="ios">
        <IonToolbar mode="ios">
          <IonTitle>Live Pitch Radar</IonTitle>
          <IonButtons slot="end">
            <IonBadge color={serverStatus.isConnected ? "success" : "warning"}>
              {serverStatus.isConnected ? "Live 5Hz" : "Synthetic"}
            </IonBadge>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
        {/* iOS Broadcast Scoreboard Header */}
        <div className="studio-scoreboard-header" style={{ marginBottom: "14px" }}>
          <div className="studio-ribbon-row-teams">
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontWeight: 800,
                color: "#00e5ff",
                fontSize: "14px",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#00e5ff",
                  boxShadow: "0 0 8px #00e5ff",
                  flexShrink: 0,
                }}
              />
              {score.homeTeam}
            </span>
            <span
              style={{
                background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
                padding: "3px 10px",
                borderRadius: "8px",
                fontWeight: 900,
                color: "#ffffff",
                letterSpacing: "1.5px",
                fontSize: "13px",
                flexShrink: 0,
                border: "1px solid rgba(255, 255, 255, 0.12)",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.4)",
              }}
            >
              {score.homeScore} - {score.awayScore}
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontWeight: 800,
                color: "#f43f5e",
                fontSize: "14px",
              }}
            >
              {score.awayTeam}
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#f43f5e",
                  boxShadow: "0 0 8px #f43f5e",
                  flexShrink: 0,
                }}
              />
            </span>
          </div>

          <div className="studio-ribbon-row-meta">
            <div style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
              <IonIcon
                icon={radioOutline}
                color="danger"
                style={{ animation: "pulse 1.5s infinite", fontSize: "13px" }}
              />
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#f43f5e", letterSpacing: "0.5px" }}>
                LIVE 5Hz
              </span>
            </div>
            <span style={{ color: "rgba(255, 255, 255, 0.2)" }}>•</span>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <IonIcon icon={timeOutline} style={{ color: "#38bdf8", fontSize: "13px" }} />
              <span
                style={{
                  fontFamily: "monospace",
                  fontWeight: 700,
                  fontSize: "13px",
                  color: "#f8fafc",
                }}
              >
                {formatTime(matchClock)}
              </span>
            </div>
            <span style={{ color: "rgba(255, 255, 255, 0.2)" }}>•</span>
            <span
              style={{
                background: "#1e293b",
                border: "1px solid #334155",
                color: "#e2e8f0",
                fontSize: "10px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              {score.period}
            </span>
          </div>
        </div>

        {/* Mobile View Switcher */}
        <div className="ion-hide-md-up" style={{ marginBottom: "12px" }}>
          <div
            style={{
              display: "flex",
              backgroundColor: "rgba(15, 23, 42, 0.95)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "10px",
              padding: "3px",
              gap: "4px",
              boxShadow: "inset 0 1px 3px rgba(0,0,0,0.5)",
            }}
          >
            {[
              { id: "pitch", label: "Radar", icon: mapOutline },
              { id: "player", label: "Spotlight", icon: personOutline },
              { id: "all", label: "All", icon: layersOutline },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMobileTab(tab.id as "pitch" | "player" | "all")}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  padding: "7px 2px",
                  borderRadius: "8px",
                  border:
                    mobileTab === tab.id
                      ? "1px solid rgba(56, 189, 248, 0.6)"
                      : "1px solid transparent",
                  backgroundColor:
                    mobileTab === tab.id ? "rgba(56, 189, 248, 0.28)" : "transparent",
                  color: mobileTab === tab.id ? "#ffffff" : "var(--studio-subtext)",
                  boxShadow:
                    mobileTab === tab.id ? "0 2px 10px rgba(56, 189, 248, 0.35)" : "none",
                  fontSize: "10.5px",
                  fontWeight: mobileTab === tab.id ? 800 : 600,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <IonIcon
                  icon={tab.icon}
                  style={{
                    fontSize: "12px",
                    color: mobileTab === tab.id ? "#38bdf8" : "var(--studio-subtext)",
                  }}
                />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Responsive Studio Pitch Workspace Layout */}
        <div
          className="studio-pitch-grid"
          style={{
            gap: "16px",
            alignItems: "start",
          }}
        >
          {/* Left Column: 60FPS Pitch Radar Canvas & Controls */}
          <div
            className={mobileTab !== "all" && mobileTab !== "pitch" ? "ion-hide-md-down" : ""}
            style={{ display: "flex", flexDirection: "column", gap: "10px", minWidth: 0 }}
          >
            <PitchRadarCanvas
              showVelocityVectors={showVectors}
              showPassingLanes={showLanes}
              showPitchControl={showPitchControl}
              cameraAngle={cameraAngle}
              viewEpoch={viewEpoch}
            />

            {/* Viewport & Layer Visibility Controls */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                background: "#0f172a",
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              {/* Camera Angle Selector */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <IonIcon icon={videocamOutline} style={{ color: "#38bdf8", fontSize: "14px" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <StudioChipScroller marginTopTrack={6} gap="6px">
                    {(
                      [
                        { id: "overhead", label: "Overhead (105m)" },
                        { id: "pressing", label: "Pressing Zone" },
                        { id: "attacking", label: "Attacking Box" },
                      ] as const
                    ).map((cam) => {
                      const isActive = cameraAngle === cam.id;
                      return (
                        <button
                          key={cam.id}
                          onClick={() => setCameraAngle(cam.id)}
                          style={{
                            background: isActive ? "#0284c7" : "rgba(255, 255, 255, 0.05)",
                            color: isActive ? "#ffffff" : "#94a3b8",
                            border: isActive
                              ? "1px solid #38bdf8"
                              : "1px solid rgba(255, 255, 255, 0.1)",
                            borderRadius: "6px",
                            padding: "4px 10px",
                            fontSize: "11px",
                            fontWeight: isActive ? 700 : 500,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            flexShrink: 0,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {cam.label}
                        </button>
                      );
                    })}
                  </StudioChipScroller>
                </div>
              </div>

              {/* Layer Visibility Toggles with Permanent Non-Vanishing Scroll Line */}
              <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.05)", paddingTop: "6px" }}>
                <StudioChipScroller marginTopTrack={6} gap="8px">
                  <button
                    onClick={() => setShowPitchControl(!showPitchControl)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "6px 10px",
                      borderRadius: "8px",
                      border: showPitchControl
                        ? "1.5px solid #10b981"
                        : "1px solid rgba(255, 255, 255, 0.12)",
                      backgroundColor: showPitchControl
                        ? "rgba(16, 185, 129, 0.22)"
                        : "rgba(255, 255, 255, 0.04)",
                      color: showPitchControl ? "#34d399" : "#94a3b8",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                      transition: "all 0.15s ease",
                    }}
                  >
                    <IonIcon icon={mapOutline} style={{ fontSize: "13px" }} />
                    <span>Pitch Control Zones</span>
                  </button>

                  <button
                    onClick={() => setShowVectors(!showVectors)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "6px 10px",
                      borderRadius: "8px",
                      border: showVectors
                        ? "1.5px solid #38bdf8"
                        : "1px solid rgba(255, 255, 255, 0.12)",
                      backgroundColor: showVectors
                        ? "rgba(56, 189, 248, 0.22)"
                        : "rgba(255, 255, 255, 0.04)",
                      color: showVectors ? "#38bdf8" : "#94a3b8",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                      transition: "all 0.15s ease",
                    }}
                  >
                    <IonIcon icon={eyeOutline} style={{ fontSize: "13px" }} />
                    <span>Velocity Vectors</span>
                  </button>

                  <button
                    onClick={() => setShowLanes(!showLanes)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "6px 10px",
                      borderRadius: "8px",
                      border: showLanes
                        ? "1.5px solid var(--ion-color-primary)"
                        : "1px solid rgba(255, 255, 255, 0.12)",
                      backgroundColor: showLanes
                        ? "rgba(124, 58, 237, 0.25)"
                        : "rgba(255, 255, 255, 0.04)",
                      color: showLanes ? "#c084fc" : "#94a3b8",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                      transition: "all 0.15s ease",
                    }}
                  >
                    <IonIcon icon={gitNetworkOutline} style={{ fontSize: "13px" }} />
                    <span>Passing Lanes</span>
                  </button>
                </StudioChipScroller>
              </div>
            </div>
          </div>

          {/* Right Column: Player Telemetry Inspector & Tactical Dominance */}
          <div
            className={mobileTab !== "all" && mobileTab !== "player" ? "ion-hide-md-down" : ""}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              minWidth: 0,
              width: "100%",
              maxWidth: "100%",
              boxSizing: "border-box",
            }}
          >
            {/* Quick Player Spotlight Switcher */}
            <div
              style={{
                background: "#0f172a",
                padding: "10px 12px",
                borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                width: "100%",
                maxWidth: "100%",
                boxSizing: "border-box",
                overflow: "hidden",
              }}
            >
              <StudioChipScroller gap="6px" marginTopTrack={6}>
                {homePresets.map((p) => {
                  const isSelected = (selectedPlayerId || "home_7") === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => baseMemory.setSelectedPlayer(p.id)}
                      style={{
                        background: isSelected ? "#00e5ff" : "rgba(0, 229, 255, 0.08)",
                        color: isSelected ? "#020617" : "#38bdf8",
                        border: `1px solid ${isSelected ? "#00e5ff" : "rgba(0, 229, 255, 0.25)"}`,
                        borderRadius: "6px",
                        padding: "4px 8px",
                        fontSize: "11px",
                        fontWeight: isSelected ? 800 : 600,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        transition: "all 0.15s ease",
                      }}
                    >
                      {p.label}
                    </button>
                  );
                })}
                {awayPresets.map((p) => {
                  const isSelected = selectedPlayerId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => baseMemory.setSelectedPlayer(p.id)}
                      style={{
                        background: isSelected ? "#f43f5e" : "rgba(244, 63, 94, 0.08)",
                        color: isSelected ? "#ffffff" : "#fb7185",
                        border: `1px solid ${isSelected ? "#f43f5e" : "rgba(244, 63, 94, 0.25)"}`,
                        borderRadius: "6px",
                        padding: "4px 8px",
                        fontSize: "11px",
                        fontWeight: isSelected ? 800 : 600,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        transition: "all 0.15s ease",
                      }}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </StudioChipScroller>
            </div>

            {/* Selected Player Telemetry Card */}
            <IonCard mode="ios" style={{ margin: "0", background: "#0f172a" }}>
              <IonCardHeader style={{ paddingBottom: "8px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "6px",
                  }}
                >
                  <span
                    style={{
                      color: teamColor,
                      fontWeight: 800,
                      letterSpacing: "0.5px",
                      fontSize: "12px",
                      margin: 0,
                    }}
                  >
                    #{profile.number} • {profile.club.toUpperCase()} • {profile.pos}
                  </span>
                </div>
                <IonCardTitle style={{ fontSize: "18px", color: "#f8fafc", marginTop: "2px" }}>
                  {profile.name}
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                {/* Telemetry Metrics Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                    marginBottom: "10px",
                  }}
                >
                  {/* Speed Meter */}
                  <div style={{ background: "#1e293b", padding: "8px 10px", borderRadius: "8px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        color: "#94a3b8",
                        fontSize: "10px",
                      }}
                    >
                      <IonIcon icon={speedometerOutline} style={{ color: "#10b981" }} />
                      <span>Live Speed</span>
                    </div>
                    <div
                      style={{
                        fontSize: "15px",
                        fontWeight: 900,
                        color: "#f8fafc",
                        marginTop: "2px",
                      }}
                    >
                      {liveSpeed.toFixed(1)} km/h
                    </div>
                    <IonProgressBar
                      mode="ios"
                      value={Math.min(1.0, liveSpeed / 34.0)}
                      color={liveSpeed > 24 ? "danger" : liveSpeed > 18 ? "warning" : "success"}
                      style={{ height: "4px", borderRadius: "2px", marginTop: "5px" }}
                    />
                  </div>

                  {/* Spatial Coordinates */}
                  <div style={{ background: "#1e293b", padding: "8px 10px", borderRadius: "8px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        color: "#94a3b8",
                        fontSize: "10px",
                      }}
                    >
                      <IonIcon icon={locationOutline} style={{ color: "#00e5ff" }} />
                      <span>Pitch Position</span>
                    </div>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: 800,
                        color: "#f8fafc",
                        marginTop: "2px",
                        fontFamily: "monospace",
                      }}
                    >
                      X: {liveX.toFixed(1)}m
                    </div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace" }}>
                      Y: {liveY.toFixed(1)}m
                    </div>
                  </div>

                  {/* Heading Angle */}
                  <div style={{ background: "#1e293b", padding: "8px 10px", borderRadius: "8px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        color: "#94a3b8",
                        fontSize: "10px",
                      }}
                    >
                      <IonIcon icon={compassOutline} style={{ color: "#a855f7" }} />
                      <span>Heading Vector</span>
                    </div>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: 800,
                        color: "#f8fafc",
                        marginTop: "2px",
                      }}
                    >
                      {Math.round(heading)}°
                    </div>
                  </div>

                  {/* Rating */}
                  <div style={{ background: "#1e293b", padding: "8px 10px", borderRadius: "8px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        color: "#94a3b8",
                        fontSize: "10px",
                      }}
                    >
                      <IonIcon icon={flashOutline} style={{ color: "#ffd600" }} />
                      <span>Match Rating</span>
                    </div>
                    <div
                      style={{
                        fontSize: "15px",
                        fontWeight: 900,
                        color: "#ffd600",
                        marginTop: "2px",
                      }}
                    >
                      {profile.rating.toFixed(1)} / 10
                    </div>
                  </div>
                </div>
              </IonCardContent>
            </IonCard>

            {/* Tactical Dominance & Rhythm Card */}
            <IonCard mode="ios" style={{ margin: "0", background: "#0f172a" }}>
              <IonCardHeader style={{ paddingBottom: "8px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "6px",
                  }}
                >
                  <span style={{ color: "#38bdf8", fontWeight: 800, fontSize: "12px", margin: 0, display: "inline-flex", alignItems: "center" }}>
                    <IonIcon icon={pulseOutline} style={{ marginRight: "4px" }} />
                    Tactical Dominance
                  </span>
                  {activeInflection && (
                    <IonBadge color="danger" style={{ fontWeight: 800, flexShrink: 0 }}>
                      Inflection Active
                    </IonBadge>
                  )}
                </div>
                <IonCardTitle
                  style={{
                    fontSize: "16px",
                    color: "#f8fafc",
                    marginTop: "2px",
                    textTransform: "capitalize",
                  }}
                >
                  {rhythm.replace(/_/g, " ")}
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                {/* Pitch Control Dual Axis Bar */}
                <div style={{ marginBottom: "10px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "11px",
                      fontWeight: 800,
                      marginBottom: "4px",
                    }}
                  >
                    <span style={{ color: "#00e5ff" }}>City: {Math.round(controlIndex)}%</span>
                    <span style={{ color: "#f43f5e" }}>Arsenal: {Math.round(chaosIndex)}%</span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: "8px",
                      borderRadius: "4px",
                      display: "flex",
                      overflow: "hidden",
                      background: "#020617",
                    }}
                  >
                    <div
                      style={{
                        width: `${controlIndex}%`,
                        background: "linear-gradient(90deg, #00e5ff, #3b82f6)",
                        transition: "width 0.3s ease",
                      }}
                    />
                    <div
                      style={{
                        width: `${chaosIndex}%`,
                        background: "linear-gradient(90deg, #f59e0b, #f43f5e)",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                </div>
              </IonCardContent>
            </IonCard>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default LivePitchPage;
