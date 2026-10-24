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
  IonProgressBar,
  IonBadge,
  IonIcon,
} from "@ionic/react";
import { flameOutline, pulseOutline, trendingUpOutline } from "ionicons/icons";
import { useBaseMemory } from "../store/baseMemory";

const TacticalPage: React.FC = () => {
  // Reading from the Single Base Memory Store
  const control = useBaseMemory((s) => s.blackboard.control_index);
  const chaos = useBaseMemory((s) => s.blackboard.chaos_index);
  const pdr = useBaseMemory((s) => s.blackboard.latest_pdr);
  const rhythm = useBaseMemory((s) => s.blackboard.current_game_rhythm);
  const inflection = useBaseMemory(
    (s) => s.blackboard.active_tactical_inflection
  );
  const headline = useBaseMemory((s) => s.blackboard.narrative_headline);

  return (
    <IonPage>
      <IonHeader mode="ios">
        <IonToolbar mode="ios">
          <IonTitle>Tactical Intelligence</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
        {/* Control vs. Chaos Index (CONTEXT.md) */}
        <IonCard mode="ios" style={{ background: "#0f172a", marginBottom: "16px" }}>
          <IonCardHeader>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <IonCardSubtitle style={{ color: "#00e5ff", fontWeight: 700 }}>
                <IonIcon icon={trendingUpOutline} style={{ marginRight: "4px" }} />
                Control vs. Chaos Index
              </IonCardSubtitle>
              <span style={{ fontFamily: "monospace", fontWeight: 800, color: "#f8fafc" }}>
                {Math.round(control)}% / {Math.round(chaos)}%
              </span>
            </div>
            <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc" }}>
              Possession Stability & Volatility
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            {/* Dual axis visualizer */}
            <div
              style={{
                width: "100%",
                height: "12px",
                borderRadius: "6px",
                display: "flex",
                overflow: "hidden",
                background: "#020617",
                marginBottom: "8px",
              }}
            >
              <div
                style={{
                  width: `${control}%`,
                  background: "linear-gradient(90deg, #00e5ff, #3b82f6)",
                  transition: "width 0.3s ease",
                }}
              />
              <div
                style={{
                  width: `${chaos}%`,
                  background: "linear-gradient(90deg, #f59e0b, #f43f5e)",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "11px",
                color: "#94a3b8",
              }}
            >
              <span>Structured Control ({Math.round(control)}%)</span>
              <span>Transition Chaos ({Math.round(chaos)}%)</span>
            </div>
          </IonCardContent>
        </IonCard>

        {/* Pass Difficulty Rating (PDR) (CONTEXT.md) */}
        <IonCard mode="ios" style={{ background: "#0f172a", marginBottom: "16px" }}>
          <IonCardHeader>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <IonCardSubtitle style={{ color: "#f59e0b", fontWeight: 700 }}>
                <IonIcon icon={flameOutline} style={{ marginRight: "4px" }} />
                Pass Difficulty Rating (PDR)
              </IonCardSubtitle>
              <span style={{ fontFamily: "monospace", fontWeight: 800, color: "#f59e0b" }}>
                {pdr.toFixed(2)}
              </span>
            </div>
            <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc" }}>
              Passing Corridor Congestion
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonProgressBar
              mode="ios"
              value={Math.min(1.0, pdr)}
              color={pdr > 0.6 ? "danger" : pdr > 0.35 ? "warning" : "success"}
              style={{ height: "10px", borderRadius: "5px" }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "11px",
                color: "#94a3b8",
                marginTop: "8px",
              }}
            >
              <span>Clean Passing Corridor</span>
              <span>Extreme Defensive Pressure</span>
            </div>
          </IonCardContent>
        </IonCard>

        {/* Game Rhythm & Tactical Arc */}
        <IonCard mode="ios" style={{ background: "#0f172a" }}>
          <IonCardHeader>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <IonCardSubtitle style={{ color: "#a855f7", fontWeight: 700 }}>
                <IonIcon icon={pulseOutline} style={{ marginRight: "4px" }} />
                Tactical Arc & Tempo
              </IonCardSubtitle>
              {inflection && <IonBadge color="danger">Inflection Active</IonBadge>}
            </div>
            <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc", textTransform: "capitalize" }}>
              {rhythm.replace(/_/g, " ")}
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p style={{ margin: 0, color: "#cbd5e1", fontSize: "13px", lineHeight: 1.5 }}>
              {headline}
            </p>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default TacticalPage;
