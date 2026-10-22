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
} from "@ionic/react";
import { eyeOutline, gitNetworkOutline, radioOutline } from "ionicons/icons";
import { useBaseMemory, baseMemory } from "../store/baseMemory";
import { PitchRadarCanvas } from "../components/PitchRadarCanvas";

const LivePitchPage: React.FC = () => {
  const [showVectors, setShowVectors] = useState(true);
  const [showLanes, setShowLanes] = useState(true);

  // Subscribe to Single Base Memory
  const score = useBaseMemory((s) => s.score);
  const matchClock = useBaseMemory((s) => s.matchClock);
  const serverStatus = useBaseMemory((s) => s.serverStatus);
  const activeInflection = useBaseMemory(
    (s) => s.blackboard.active_tactical_inflection
  );
  const rhythm = useBaseMemory((s) => s.blackboard.current_game_rhythm);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

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
            padding: "12px 16px",
            borderRadius: "14px",
            marginBottom: "16px",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontWeight: 800, color: "#00e5ff", fontSize: "16px" }}>
              {score.homeTeam}
            </span>
            <span
              style={{
                background: "#1e293b",
                padding: "4px 10px",
                borderRadius: "8px",
                fontWeight: 900,
                color: "#ffffff",
              }}
            >
              {score.homeScore} - {score.awayScore}
            </span>
            <span style={{ fontWeight: 800, color: "#f43f5e", fontSize: "16px" }}>
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
                fontSize: "15px",
                color: "#f8fafc",
              }}
            >
              {formatTime(matchClock)}
            </span>
            <span
              style={{
                fontSize: "11px",
                color: "#94a3b8",
                textTransform: "uppercase",
              }}
            >
              {score.period}
            </span>
          </div>
        </div>

        {/* 60FPS Pitch Radar Canvas (ADR 0003 & ADR 0007) */}
        <PitchRadarCanvas
          showVelocityVectors={showVectors}
          showPassingLanes={showLanes}
        />

        {/* Radar Controls */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginTop: "12px",
            marginBottom: "12px",
          }}
        >
          <IonButton
            size="small"
            fill={showVectors ? "solid" : "outline"}
            color="secondary"
            onClick={() => setShowVectors(!showVectors)}
            style={{ textTransform: "none", fontSize: "12px" }}
          >
            <IonIcon slot="start" icon={eyeOutline} />
            Velocity Vectors
          </IonButton>

          <IonButton
            size="small"
            fill={showLanes ? "solid" : "outline"}
            color="primary"
            onClick={() => setShowLanes(!showLanes)}
            style={{ textTransform: "none", fontSize: "12px" }}
          >
            <IonIcon slot="start" icon={gitNetworkOutline} />
            Passing Lanes
          </IonButton>
        </div>

        {/* Status Card synchronized with Single Base Memory */}
        <IonCard mode="ios" style={{ margin: "0", background: "#0f172a" }}>
          <IonCardContent>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: "#94a3b8",
                  }}
                >
                  Current Game Rhythm (ADR 0003)
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 800,
                    color: "#f8fafc",
                    textTransform: "capitalize",
                    marginTop: "2px",
                  }}
                >
                  {rhythm.replace(/_/g, " ")}
                </div>
              </div>

              {activeInflection && (
                <IonBadge color="danger">Tactical Inflection Point</IonBadge>
              )}
            </div>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default LivePitchPage;
