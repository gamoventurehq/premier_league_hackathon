import React from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCardContent,
  IonBadge,
  IonSelect,
  IonSelectOption,
  IonItem,
  IonList,
} from "@ionic/react";
import { useBaseMemory, baseMemory } from "../store/baseMemory";
import { PersonaMode, SupportedLanguage } from "../types/telemetry";

const personaTitles: Record<PersonaMode, string> = {
  analyst: "Analyst Experience",
  casual: "Casual Experience",
  player_cam: "Player Cam Focus",
  club_centric: "Club-Centric (Man City)",
};

const personaDescriptions: Record<PersonaMode, string> = {
  analyst: "Probabilistic pitch control models, passing networks, and tactical phase metrics.",
  casual: "Storyline-driven commentary, pivotal momentum shifts, and accessible tactical highlights.",
  player_cam: "Continuous tracking of Home #7 off-ball runs, physical exertion, and sprint bursts.",
  club_centric: "Tactical execution framing focused on Manchester City's attacking structure.",
};

const multilingualTranslations: Record<SupportedLanguage, string> = {
  en: "Tactical Press: Manchester City high line pinning Arsenal defenders deep in build-up phase.",
  es: "Presión Táctica: Línea alta del Manchester City forzando repliegue defensivo del Arsenal.",
  fr: "Pression Tactique: Le bloc haut de Manchester City étouffe la relance d'Arsenal.",
  ja: "戦術的プレス：マンチェスター・シティのハイラインがアーセナルのビルドアップを封じ込める。",
  ar: "الضغط التكتيكي: خط مانشستر سيتي المتقدم يفرض حصاراً دفاعياً على أرسنال."
};

const PersonaPage: React.FC = () => {
  // Reading from Single Base Memory
  const persona = useBaseMemory((s) => s.selectedPersona);
  const language = useBaseMemory((s) => s.selectedLanguage);
  const overviews = useBaseMemory((s) => s.blackboard.persona_overviews);
  const rhythm = useBaseMemory((s) => s.blackboard.current_game_rhythm);

  return (
    <IonPage>
      <IonHeader mode="ios">
        <IonToolbar mode="ios">
          <IonTitle>Persona Experience</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
        {/* iOS Native Segmented Control for Persona Switching */}
        <div style={{ marginBottom: "16px" }}>
          <IonSegment
            mode="ios"
            value={persona}
            onIonChange={(e) => {
              if (e.detail.value) {
                // Updating Single Base Memory propagates to ALL screens
                baseMemory.setPersona(e.detail.value as PersonaMode);
              }
            }}
          >
            <IonSegmentButton value="analyst">
              <IonLabel>Analyst</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="casual">
              <IonLabel>Casual</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="player_cam">
              <IonLabel>Player Cam</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="club_centric">
              <IonLabel>Club</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </div>

        {/* Active Persona Insight Card */}
        <IonCard mode="ios" style={{ background: "#0f172a", marginBottom: "16px" }}>
          <IonCardHeader>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <IonCardSubtitle style={{ color: "#a855f7", fontWeight: 700 }}>
                {personaTitles[persona]}
              </IonCardSubtitle>
              <IonBadge color="primary">{rhythm.replace(/_/g, " ")}</IonBadge>
            </div>
            <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc", marginTop: "4px" }}>
              Tailored Tactical Narrative
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <div
              style={{
                background: "rgba(124, 58, 237, 0.12)",
                borderLeft: "3px solid #7c3aed",
                padding: "12px",
                borderRadius: "4px 8px 8px 4px",
                color: "#e2e8f0",
                fontSize: "14px",
                lineHeight: 1.5,
                marginBottom: "12px",
              }}
            >
              {overviews[persona] || overviews.analyst}
            </div>

            <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
              {personaDescriptions[persona]}
            </p>
          </IonCardContent>
        </IonCard>

        {/* Multilingual Localization (ADR 0003 & CONTEXT.md) */}
        <IonCard mode="ios" style={{ background: "#0f172a" }}>
          <IonCardHeader>
            <IonCardSubtitle style={{ color: "#00e5ff", fontWeight: 700 }}>
              Multilingual Broadcast Stream
            </IonCardSubtitle>
            <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc" }}>
              Synchronous Commentary Feed
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonList mode="ios" style={{ background: "transparent", padding: 0 }}>
              <IonItem mode="ios" style={{ ["--background" as string]: "#1e293b", borderRadius: "10px", marginBottom: "12px" }}>
                <IonLabel style={{ color: "#94a3b8" }}>Target Language</IonLabel>
                <IonSelect
                  mode="ios"
                  value={language}
                  onIonChange={(e) => {
                    if (e.detail.value) {
                      baseMemory.setLanguage(e.detail.value as SupportedLanguage);
                    }
                  }}
                  interface="action-sheet"
                >
                  <IonSelectOption value="en">English (EN)</IonSelectOption>
                  <IonSelectOption value="es">Español (ES)</IonSelectOption>
                  <IonSelectOption value="fr">Français (FR)</IonSelectOption>
                  <IonSelectOption value="ja">日本語 (JA)</IonSelectOption>
                  <IonSelectOption value="ar">العربية (AR)</IonSelectOption>
                </IonSelect>
              </IonItem>
            </IonList>

            <div
              style={{
                background: "#020617",
                padding: "12px",
                borderRadius: "8px",
                fontSize: "13px",
                color: "#38bdf8",
                fontStyle: "italic",
              }}
            >
              "{multilingualTranslations[language]}"
            </div>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default PersonaPage;
