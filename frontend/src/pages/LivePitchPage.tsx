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
  IonButton,
  IonIcon,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
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
  locateOutline,
} from "ionicons/icons";
import { useBaseMemory, baseMemory } from "../store/baseMemory";
import { PitchRadarCanvas, CameraAngle } from "../components/PitchRadarCanvas";
import { StudioTopBar } from "../components/StudioTopBar";

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
  const homeLineup = useBaseMemory((s) => s.homeLineup);
  const awayLineup = useBaseMemory((s) => s.awayLineup);
  const currentFrame = useBaseMemory((s) => s.currentFrame);

  const formatTime = (secs: number) => {
    const clamped = Math.min(5400, Math.max(0, Math.floor(secs || 0)));
    const m = Math.floor(clamped / 60);
    const s = Math.floor(clamped % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Resolve currently spotlighted player from Single Core Memory with robust fallbacks
  const allLineupPlayers = [...homeLineup, ...awayLineup];
  const defaultPlayer = {
    id: "home_8",
    number: 17,
    name: "K. De Bruyne",
    pos: "CM",
    rating: 8.8,
    x: 38,
    y: 30,
    team: "home" as const,
    speed_kmh: 14.2,
    is_ball_carrier: false,
    attributes: { shoot: 86, passing: 96, dribbling: 87, defending: 64, shotAccuracyPct: 82, avgRating: 8.8 },
  };
  const profile =
    allLineupPlayers.find((p) => p.id === selectedPlayerId) ||
    homeLineup.find((p) => p.id === "home_8") ||
    homeLineup[0] ||
    defaultPlayer;
  const isHome = profile.team === "home";
  const defaultMeta = { name: isHome ? "Man City" : "Arsenal", color: isHome ? "#00e5ff" : "#f43f5e" };
  const teamMeta = (isHome ? score?.homeMeta : score?.awayMeta) || defaultMeta;

  // Resolve real-time spatial telemetry from current frame
  const liveTelemetry = currentFrame?.players?.find(
    (p) => p.player_id === selectedPlayerId || p.id === selectedPlayerId
  );
  const liveSpeed = liveTelemetry?.speed_kmh ?? (liveTelemetry as any)?.speedKmH ?? profile.speed_kmh ?? 14.2;
  const liveX = liveTelemetry ? liveTelemetry.x : (profile.x / 100) * 105;
  const liveY = liveTelemetry ? liveTelemetry.y : (profile.y / 100) * 68;
  const heading = liveTelemetry?.heading_deg ?? 90;
  const isCarrier = liveTelemetry?.is_ball_carrier ?? (liveTelemetry as any)?.onBall ?? profile.is_ball_carrier ?? false;

  // Key quick-pick player presets
  const homePresets = [
    { id: "home_11", label: "Haaland #9" },
    { id: "home_8", label: "De Bruyne #17" },
    { id: "home_7", label: "Bernardo #20" },
    { id: "home_9", label: "Foden #47" },
  ];

  const awayPresets = [
    { id: "away_9", label: "Saka #7" },
    { id: "away_8", label: "Ødegaard #8" },
    { id: "away_11", label: "Havertz #29" },
  ];

  const cameraOptions = [
    { id: "overhead", label: "Full 105m", desc: "Overhead" },
    { id: "pressing", label: "Midfield", desc: "Pressing" },
    { id: "attacking", label: "Penalty Box", desc: "Attacking" },
  ] as const;

  return (
    <IonPage>
      {/* Unified Responsive Studio Top Bar */}
      <StudioTopBar
        title="Live Pitch"
        subtitle="10Hz Spatial Kinematics"
      />

      <IonContent fullscreen className="ion-padding">
        {/* iOS Broadcast Scoreboard Header */}
        <div className="studio-scoreboard-header" style={{ marginBottom: "14px" }}>
          <div className="studio-ribbon-row-teams">
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: 800, color: "#00e5ff", fontSize: "14px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#00e5ff", boxShadow: "0 0 8px #00e5ff", flexShrink: 0 }} />
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
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: 800, color: "#f43f5e", fontSize: "14px" }}>
              {score.awayTeam}
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f43f5e", boxShadow: "0 0 8px #f43f5e", flexShrink: 0 }} />
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
                LIVE MATCH SIMULATION
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
                onClick={() => setMobileTab(tab.id as any)}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  padding: "7px 2px",
                  borderRadius: "8px",
                  border: mobileTab === tab.id ? "1px solid rgba(56, 189, 248, 0.6)" : "1px solid transparent",
                  backgroundColor: mobileTab === tab.id ? "rgba(56, 189, 248, 0.28)" : "transparent",
                  color: mobileTab === tab.id ? "#ffffff" : "var(--studio-subtext)",
                  boxShadow: mobileTab === tab.id ? "0 2px 10px rgba(56, 189, 248, 0.35)" : "none",
                  fontSize: "10.5px",
                  fontWeight: mobileTab === tab.id ? 800 : 600,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <IonIcon icon={tab.icon} style={{ fontSize: "12px", color: mobileTab === tab.id ? "#38bdf8" : "var(--studio-subtext)" }} />
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
          {/* Left Column: 60FPS Pitch Radar Canvas & Clean Segmented Controls */}
          <div
            className={mobileTab !== "all" && mobileTab !== "pitch" ? "ion-hide-md-down" : ""}
            style={{ display: "flex", flexDirection: "column", gap: "10px", minWidth: 0 }}
          >
            {/* Radar Canvas with live interactive touch & player clicks */}
            <PitchRadarCanvas
              showVelocityVectors={showVectors}
              showPassingLanes={showLanes}
              showPitchControl={showPitchControl}
              cameraAngle={cameraAngle}
              viewEpoch={viewEpoch}
            />

            {/* Clean Floating Control Deck (Zero Sliders - Instant Segmented Switchers) */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                background: "#0f172a",
                padding: "12px 14px",
                borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                boxShadow: "0 4px 14px rgba(0, 0, 0, 0.35)",
              }}
            >
              {/* Row 1: Camera Angle Segmented Control */}
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
                  <span style={{ fontSize: "11px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Camera Perspective
                  </span>
                </div>

                {/* Cupertino-style Segmented Segment */}
                <div
                  style={{
                    display: "inline-flex",
                    background: "rgba(2, 6, 23, 0.8)",
                    padding: "3px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    gap: "3px",
                  }}
                >
                  {cameraOptions.map((cam) => {
                    const isActive = cameraAngle === cam.id;
                    return (
                      <button
                        key={cam.id}
                        onClick={() => setCameraAngle(cam.id)}
                        style={{
                          background: isActive
                            ? "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)"
                            : "transparent",
                          color: isActive ? "#ffffff" : "#94a3b8",
                          border: isActive ? "1px solid rgba(56, 189, 248, 0.4)" : "1px solid transparent",
                          borderRadius: "6px",
                          padding: "5px 12px",
                          fontSize: "11px",
                          fontWeight: isActive ? 800 : 600,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          boxShadow: isActive ? "0 2px 8px rgba(2, 132, 199, 0.35)" : "none",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {cam.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 2: Tactical Layer Toggles (Crisp Pill Chips) */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "8px",
                  borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                  paddingTop: "9px",
                }}
              >
                <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  Active Tactical Layers:
                </span>

                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  {/* Pitch Control Toggle */}
                  <button
                    onClick={() => setShowPitchControl(!showPitchControl)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "5px 10px",
                      borderRadius: "7px",
                      border: showPitchControl ? "1px solid rgba(16, 185, 129, 0.6)" : "1px solid rgba(255, 255, 255, 0.1)",
                      backgroundColor: showPitchControl ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.03)",
                      color: showPitchControl ? "#34d399" : "#94a3b8",
                      fontSize: "11px",
                      fontWeight: showPitchControl ? 800 : 500,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <IonIcon icon={mapOutline} style={{ fontSize: "12px" }} />
                    <span>Pitch Zones</span>
                  </button>

                  {/* Velocity Vectors Toggle */}
                  <button
                    onClick={() => setShowVectors(!showVectors)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "5px 10px",
                      borderRadius: "7px",
                      border: showVectors ? "1px solid rgba(56, 189, 248, 0.6)" : "1px solid rgba(255, 255, 255, 0.1)",
                      backgroundColor: showVectors ? "rgba(56, 189, 248, 0.2)" : "rgba(255, 255, 255, 0.03)",
                      color: showVectors ? "#38bdf8" : "#94a3b8",
                      fontSize: "11px",
                      fontWeight: showVectors ? 800 : 500,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <IonIcon icon={eyeOutline} style={{ fontSize: "12px" }} />
                    <span>Vectors</span>
                  </button>

                  {/* Passing Lanes Toggle */}
                  <button
                    onClick={() => setShowLanes(!showLanes)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "5px 10px",
                      borderRadius: "7px",
                      border: showLanes ? "1px solid rgba(168, 85, 247, 0.6)" : "1px solid rgba(255, 255, 255, 0.1)",
                      backgroundColor: showLanes ? "rgba(168, 85, 247, 0.2)" : "rgba(255, 255, 255, 0.03)",
                      color: showLanes ? "#c084fc" : "#94a3b8",
                      fontSize: "11px",
                      fontWeight: showLanes ? 800 : 500,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <IonIcon icon={gitNetworkOutline} style={{ fontSize: "12px" }} />
                    <span>Passing Lanes</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Player Telemetry Inspector & Tactical Dominance */}
          <div
            className={mobileTab !== "all" && mobileTab !== "player" ? "ion-hide-md-down" : ""}
            style={{ display: "flex", flexDirection: "column", gap: "12px", minWidth: 0, width: "100%", maxWidth: "100%", boxSizing: "border-box" }}
          >
            {/* Quick Player Spotlight Selector (Clean, 2-group buttons without endless sliders) */}
            <div
              style={{
                background: "#0f172a",
                padding: "12px 14px",
                borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Spotlight Key Players
                </span>
                <span style={{ fontSize: "10px", color: "#64748b" }}>Click or tap dot on pitch</span>
              </div>

              {/* Home Team Key Picks */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "10px", fontWeight: 800, color: "#00e5ff", width: "32px" }}>MCI:</span>
                {homePresets.map((p) => {
                  const isSelected = selectedPlayerId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => baseMemory.setSelectedPlayer(p.id)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "5px 10px",
                        borderRadius: "6px",
                        border: isSelected ? "1.5px solid #00e5ff" : "1px solid rgba(255,255,255,0.08)",
                        backgroundColor: isSelected ? "rgba(0, 229, 255, 0.2)" : "#1e293b",
                        color: isSelected ? "#00e5ff" : "#cbd5e1",
                        fontSize: "11px",
                        fontWeight: isSelected ? 800 : 600,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#00e5ff", flexShrink: 0 }} />
                      {p.label}
                    </button>
                  );
                })}
              </div>

              {/* Away Team Key Picks */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "10px", fontWeight: 800, color: "#f43f5e", width: "32px" }}>ARS:</span>
                {awayPresets.map((p) => {
                  const isSelected = selectedPlayerId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => baseMemory.setSelectedPlayer(p.id)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "5px 10px",
                        borderRadius: "6px",
                        border: isSelected ? "1.5px solid #f43f5e" : "1px solid rgba(255,255,255,0.08)",
                        backgroundColor: isSelected ? "rgba(244, 63, 94, 0.2)" : "#1e293b",
                        color: isSelected ? "#f43f5e" : "#cbd5e1",
                        fontSize: "11px",
                        fontWeight: isSelected ? 800 : 600,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f43f5e", flexShrink: 0 }} />
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Player Spatial Telemetry Inspector */}
            <IonCard mode="ios" style={{ margin: "0", background: "#0f172a" }}>
              <IonCardHeader style={{ paddingBottom: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
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

            {/* Tactical Control & Territorial Dominance Card */}
            <IonCard mode="ios" style={{ margin: "0", background: "#0f172a" }}>
              <IonCardHeader style={{ paddingBottom: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                  <IonCardSubtitle style={{ color: "#38bdf8", fontWeight: 800, margin: 0 }}>
                    <IonIcon icon={pulseOutline} style={{ marginRight: "4px" }} />
                    Tactical Control & Territorial Dominance
                  </IonCardSubtitle>
                  {activeInflection && (
                    <IonBadge color="danger" style={{ fontWeight: 800, flexShrink: 0 }}>
                      Inflection Active
                    </IonBadge>
                  )}
                </div>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                  Rolling 5-min spatial pitch control (Voronoi & kinematic projection)
                </div>
                <IonCardTitle style={{ fontSize: "15px", color: "#f8fafc", marginTop: "4px", textTransform: "capitalize" }}>
                  Phase: {rhythm.replace(/_/g, " ")}
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                {/* Pitch Control Dual Axis Bar */}
                <div style={{ marginBottom: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 800, marginBottom: "4px" }}>
                    <span style={{ color: "#00e5ff" }}>Man City: {Math.round(controlIndex)}%</span>
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
                      }}
                    />
                    <div
                      style={{
                        width: `${chaosIndex}%`,
                        background: "linear-gradient(90deg, #f59e0b, #f43f5e)",
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
                  <strong style={{ color: "#00e5ff" }}>Territory Breakdown:</strong> Measures the active share of pitch space controlled by kinematic sprint cones. Values over 55% indicate sustained territorial pinning.
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
