import React, { useState } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonBadge,
  IonButtons,
  IonButton,
  IonIcon,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonProgressBar,
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
} from "ionicons/icons";
import { useBaseMemory, baseMemory } from "../store/baseMemory";
import { PitchRadarCanvas, CameraAngle } from "../components/PitchRadarCanvas";

const LivePitchPage: React.FC = () => {
  const [cameraAngle, setCameraAngle] = useState<CameraAngle>("overhead");
  const [showVectors, setShowVectors] = useState(true);
  const [showLanes, setShowLanes] = useState(true);
  const [showPitchControl, setShowPitchControl] = useState(true);

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
  const homeLineup = useBaseMemory((s) => s.homeLineup);
  const awayLineup = useBaseMemory((s) => s.awayLineup);
  const currentFrame = useBaseMemory((s) => s.currentFrame);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Resolve currently spotlighted player from Single Core Memory
  const allLineupPlayers = [...homeLineup, ...awayLineup];
  const profile =
    allLineupPlayers.find((p) => p.id === selectedPlayerId) || homeLineup[6];
  const isHome = profile.team === "home";
  const teamMeta = isHome ? score.homeMeta : score.awayMeta;

  // Resolve real-time spatial telemetry from current frame
  const liveTelemetry = currentFrame?.players?.find(
    (p) => p.player_id === selectedPlayerId
  );
  const liveSpeed = liveTelemetry?.speed_kmh ?? profile.speed_kmh ?? 14.2;
  const liveX = liveTelemetry ? liveTelemetry.x : (profile.x / 100) * 105;
  const liveY = liveTelemetry ? liveTelemetry.y : (profile.y / 100) * 68;
  const heading = liveTelemetry?.heading_deg ?? 90;
  const isCarrier = liveTelemetry?.is_ball_carrier ?? profile.is_ball_carrier ?? false;

  // Key quick-pick player presets
  const homePresets = [
    { id: "home_10", label: "Haaland #9" },
    { id: "home_7", label: "De Bruyne #17" },
    { id: "home_9", label: "Foden #47" },
  ];

  const awayPresets = [
    { id: "away_8", label: "Saka #7" },
    { id: "away_11", label: "Havertz #29" },
    { id: "away_9", label: "Ødegaard #8" },
  ];

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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#0f172a",
            padding: "10px 16px",
            borderRadius: "12px",
            marginBottom: "14px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontWeight: 800, color: "#00e5ff", fontSize: "15px" }}>
              {score.homeTeam}
            </span>
            <span
              style={{
                background: "#1e293b",
                padding: "3px 10px",
                borderRadius: "6px",
                fontWeight: 900,
                color: "#ffffff",
                letterSpacing: "1px",
                fontSize: "14px",
              }}
            >
              {score.homeScore} - {score.awayScore}
            </span>
            <span style={{ fontWeight: 800, color: "#f43f5e", fontSize: "15px" }}>
              {score.awayTeam}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <IonIcon
              icon={radioOutline}
              color="danger"
              style={{ animation: "pulse 1.5s infinite" }}
            />
            <span
              style={{
                fontFamily: "monospace",
                fontWeight: 700,
                fontSize: "14px",
                color: "#f8fafc",
              }}
            >
              {formatTime(matchClock)}
            </span>
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

        {/* Responsive Studio Pitch Workspace Layout */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.8fr) minmax(360px, 1fr)",
            gap: "16px",
            alignItems: "start",
          }}
        >
          {/* Left Column: 60FPS Pitch Radar Canvas & Controls */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", minWidth: 0 }}>
            <PitchRadarCanvas
              showVelocityVectors={showVectors}
              showPassingLanes={showLanes}
              showPitchControl={showPitchControl}
              cameraAngle={cameraAngle}
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
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <IonIcon icon={videocamOutline} style={{ color: "#38bdf8", fontSize: "14px" }} />
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Camera Angle
                  </span>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
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
                          border: isActive ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.1)",
                          borderRadius: "6px",
                          padding: "4px 10px",
                          fontSize: "11px",
                          fontWeight: isActive ? 700 : 500,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {cam.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Layer Visibility Toggles */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", paddingTop: "6px", borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <IonButton
                  size="small"
                  fill={showPitchControl ? "solid" : "outline"}
                  color="success"
                  onClick={() => setShowPitchControl(!showPitchControl)}
                  style={{ textTransform: "none", fontSize: "11px" }}
                >
                  <IonIcon slot="start" icon={mapOutline} />
                  Pitch Control Zones
                </IonButton>

                <IonButton
                  size="small"
                  fill={showVectors ? "solid" : "outline"}
                  color="secondary"
                  onClick={() => setShowVectors(!showVectors)}
                  style={{ textTransform: "none", fontSize: "11px" }}
                >
                  <IonIcon slot="start" icon={eyeOutline} />
                  Velocity Vectors
                </IonButton>

                <IonButton
                  size="small"
                  fill={showLanes ? "solid" : "outline"}
                  color="primary"
                  onClick={() => setShowLanes(!showLanes)}
                  style={{ textTransform: "none", fontSize: "11px" }}
                >
                  <IonIcon slot="start" icon={gitNetworkOutline} />
                  Passing Lanes
                </IonButton>
              </div>
            </div>
          </div>

          {/* Right Column: Player Telemetry Inspector & Tactical Dominance */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", minWidth: 0 }}>
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
              }}
            >
              <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>
                Spotlight Key Players
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {homePresets.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => baseMemory.setSelectedPlayer(p.id)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "6px",
                      border: selectedPlayerId === p.id ? "1.5px solid #00e5ff" : "1px solid rgba(255,255,255,0.1)",
                      backgroundColor: selectedPlayerId === p.id ? "rgba(0, 229, 255, 0.2)" : "#1e293b",
                      color: selectedPlayerId === p.id ? "#00e5ff" : "#cbd5e1",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
                {awayPresets.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => baseMemory.setSelectedPlayer(p.id)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "6px",
                      border: selectedPlayerId === p.id ? "1.5px solid #f43f5e" : "1px solid rgba(255,255,255,0.1)",
                      backgroundColor: selectedPlayerId === p.id ? "rgba(244, 63, 94, 0.2)" : "#1e293b",
                      color: selectedPlayerId === p.id ? "#f43f5e" : "#cbd5e1",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Player Spatial Telemetry Inspector */}
            <IonCard mode="ios" style={{ margin: "0", background: "#0f172a" }}>
              <IonCardHeader style={{ paddingBottom: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <IonCardSubtitle style={{ color: teamMeta.color, fontWeight: 800 }}>
                    <IonIcon icon={personOutline} style={{ marginRight: "4px" }} />
                    {teamMeta.name} • #{profile.number} {profile.pos}
                  </IonCardSubtitle>
                  {isCarrier && (
                    <IonBadge color="warning" style={{ fontWeight: 800 }}>
                      Active Ball Carrier
                    </IonBadge>
                  )}
                </div>
                <IonCardTitle style={{ fontSize: "17px", color: "#f8fafc", marginTop: "2px" }}>
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
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#94a3b8", fontSize: "10px" }}>
                      <IonIcon icon={speedometerOutline} style={{ color: "#10b981" }} />
                      <span>Live Speed</span>
                    </div>
                    <div style={{ fontSize: "15px", fontWeight: 900, color: "#f8fafc", marginTop: "2px" }}>
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
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#94a3b8", fontSize: "10px" }}>
                      <IonIcon icon={locationOutline} style={{ color: "#00e5ff" }} />
                      <span>Pitch Position</span>
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: 800, color: "#f8fafc", marginTop: "2px", fontFamily: "monospace" }}>
                      X: {liveX.toFixed(1)}m
                    </div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace" }}>
                      Y: {liveY.toFixed(1)}m
                    </div>
                  </div>

                  {/* Heading Angle */}
                  <div style={{ background: "#1e293b", padding: "8px 10px", borderRadius: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#94a3b8", fontSize: "10px" }}>
                      <IonIcon icon={compassOutline} style={{ color: "#a855f7" }} />
                      <span>Heading Vector</span>
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: 800, color: "#f8fafc", marginTop: "2px" }}>
                      {Math.round(heading)}°
                    </div>
                    <span style={{ fontSize: "9px", color: "#94a3b8" }}>
                      {heading < 90 || heading > 270 ? "Attacking Push" : "Rest Defense"}
                    </span>
                  </div>

                  {/* Rating */}
                  <div style={{ background: "#1e293b", padding: "8px 10px", borderRadius: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#94a3b8", fontSize: "10px" }}>
                      <IonIcon icon={flashOutline} style={{ color: "#ffd600" }} />
                      <span>Match Rating</span>
                    </div>
                    <div style={{ fontSize: "15px", fontWeight: 900, color: "#ffd600", marginTop: "2px" }}>
                      {profile.rating.toFixed(1)} / 10
                    </div>
                    <span style={{ fontSize: "9px", color: "#94a3b8" }}>
                      Pass: {profile.attributes.passing}%
                    </span>
                  </div>
                </div>

                {/* Work Rate Sprint Alert Banner */}
                {liveSpeed > 22 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "rgba(239, 68, 68, 0.15)",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      color: "#fca5a5",
                      fontWeight: 700,
                    }}
                  >
                    <IonIcon icon={flashOutline} style={{ color: "#ef4444" }} />
                    <span>High-Speed Sprint Burst: {liveSpeed.toFixed(1)} km/h</span>
                  </div>
                )}
              </IonCardContent>
            </IonCard>

            {/* Tactical Dominance & Rhythm Card */}
            <IonCard mode="ios" style={{ margin: "0", background: "#0f172a" }}>
              <IonCardHeader style={{ paddingBottom: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <IonCardSubtitle style={{ color: "#38bdf8", fontWeight: 800 }}>
                    <IonIcon icon={pulseOutline} style={{ marginRight: "4px" }} />
                    Tactical Dominance
                  </IonCardSubtitle>
                  {activeInflection && (
                    <IonBadge color="danger" style={{ fontWeight: 800 }}>
                      Inflection Active
                    </IonBadge>
                  )}
                </div>
                <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc", marginTop: "2px", textTransform: "capitalize" }}>
                  {rhythm.replace(/_/g, " ")}
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                {/* Pitch Control Dual Axis Bar */}
                <div style={{ marginBottom: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 800, marginBottom: "4px" }}>
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

                <div
                  style={{
                    background: "#1e293b",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    color: "#cbd5e1",
                    lineHeight: "1.4",
                  }}
                >
                  <strong style={{ color: "#00e5ff" }}>Core Memory Linked:</strong> Clicking any player on the canvas or selecting pills updates Spotlight across the entire studio in real time.
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
