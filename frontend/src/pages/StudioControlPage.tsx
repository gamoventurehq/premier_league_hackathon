import React from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonList,
  IonBadge,
  IonIcon,
} from "@ionic/react";
import { serverOutline, timeOutline, checkmarkCircleOutline, alertCircleOutline } from "ionicons/icons";
import { useBaseMemory } from "../store/baseMemory";

const StudioControlPage: React.FC = () => {
  const serverStatus = useBaseMemory((s) => s.serverStatus);
  const matchClock = useBaseMemory((s) => s.matchClock);
  const frameId = useBaseMemory((s) => s.blackboard.latest_frame_id);
  const persona = useBaseMemory((s) => s.selectedPersona);
  const language = useBaseMemory((s) => s.selectedLanguage);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <IonPage>
      <IonHeader mode="ios">
        <IonToolbar mode="ios">
          <IonTitle>Studio Diagnostics</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
        {/* Local Server Connection Status */}
        <IonCard mode="ios" style={{ background: "#0f172a", marginBottom: "16px" }}>
          <IonCardHeader>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <IonCardSubtitle style={{ color: "#38bdf8", fontWeight: 700 }}>
                <IonIcon icon={serverOutline} style={{ marginRight: "4px" }} />
                Local Telemetry Server
              </IonCardSubtitle>
              <IonBadge color={serverStatus.isConnected ? "success" : "warning"}>
                {serverStatus.isConnected ? "Connected" : "Simulated Fallback"}
              </IonBadge>
            </div>
            <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc" }}>
              FastAPI WebSocket Transport
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonList mode="ios" style={{ background: "transparent" }}>
              <IonItem mode="ios" style={{ ["--background" as string]: "transparent" }}>
                <IonIcon
                  slot="start"
                  icon={serverStatus.isConnected ? checkmarkCircleOutline : alertCircleOutline}
                  color={serverStatus.isConnected ? "success" : "warning"}
                />
                <IonLabel>
                  <h3>WebSocket Endpoint</h3>
                  <p style={{ color: "#94a3b8" }}>ws://localhost:8000/ws/telemetry</p>
                </IonLabel>
              </IonItem>
              <IonItem mode="ios" style={{ ["--background" as string]: "transparent" }}>
                <IonIcon slot="start" icon={timeOutline} color="secondary" />
                <IonLabel>
                  <h3>Match Clock</h3>
                  <p style={{ color: "#94a3b8" }}>
                    {formatTime(matchClock)} ({matchClock.toFixed(1)}s)
                  </p>
                </IonLabel>
              </IonItem>
            </IonList>
          </IonCardContent>
        </IonCard>

        {/* Single Base Memory State Summary */}
        <IonCard mode="ios" style={{ background: "#0f172a" }}>
          <IonCardHeader>
            <IonCardSubtitle style={{ color: "#a855f7", fontWeight: 700 }}>
              Single Base Memory Monitor
            </IonCardSubtitle>
            <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc" }}>
              Active Synchronized State
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                fontSize: "12px",
              }}
            >
              <div style={{ background: "#1e293b", padding: "10px", borderRadius: "8px" }}>
                <div style={{ color: "#94a3b8", fontSize: "10px", textTransform: "uppercase" }}>
                  Frame ID
                </div>
                <div style={{ fontWeight: 800, color: "#f8fafc", fontSize: "15px" }}>
                  #{frameId}
                </div>
              </div>

              <div style={{ background: "#1e293b", padding: "10px", borderRadius: "8px" }}>
                <div style={{ color: "#94a3b8", fontSize: "10px", textTransform: "uppercase" }}>
                  Active Persona
                </div>
                <div style={{ fontWeight: 800, color: "#a855f7", fontSize: "14px", textTransform: "capitalize" }}>
                  {persona.replace(/_/g, " ")}
                </div>
              </div>

              <div style={{ background: "#1e293b", padding: "10px", borderRadius: "8px" }}>
                <div style={{ color: "#94a3b8", fontSize: "10px", textTransform: "uppercase" }}>
                  Language Feed
                </div>
                <div style={{ fontWeight: 800, color: "#00e5ff", fontSize: "14px", textTransform: "uppercase" }}>
                  {language}
                </div>
              </div>

              <div style={{ background: "#1e293b", padding: "10px", borderRadius: "8px" }}>
                <div style={{ color: "#94a3b8", fontSize: "10px", textTransform: "uppercase" }}>
                  Stream Rate
                </div>
                <div style={{ fontWeight: 800, color: "#10b981", fontSize: "14px" }}>
                  5Hz (ADR 0003)
                </div>
              </div>
            </div>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default StudioControlPage;
