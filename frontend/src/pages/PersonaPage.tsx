import React, { useState } from "react";
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
  IonBadge,
  IonProgressBar,
  IonIcon,
} from "@ionic/react";
import {
  analyticsOutline,
  peopleOutline,
  videocamOutline,
  shieldCheckmarkOutline,
  flashOutline,
  radioOutline,
  timeOutline,
  sparklesOutline,
} from "ionicons/icons";
import { useBaseMemory, baseMemory } from "../store/baseMemory";
import { PersonaMode, SupportedLanguage } from "../types/telemetry";
import { StudioChipScroller } from "../components/StudioChipScroller";
import {
  ROSTER_SPOTLIGHT,
  KEY_PLAYER_PRESETS,
  PlayerSpotlightProfile,
} from "../types/playerRoster";

const personaTitles: Record<PersonaMode, string> = {
  analyst: "Analyst Experience",
  casual: "Casual Experience",
  player_cam: "Player Cam Focus",
  club_centric: "Club-Centric Experience",
};

interface MultilingualEntry {
  headline: string;
  commentary: string[];
  tacticalNote: string;
}

const multilingualStreams: Record<SupportedLanguage, MultilingualEntry> = {
  en: {
    headline: "Tactical Press: Manchester City high line pinning Arsenal defenders deep in build-up phase.",
    commentary: [
      "88' Tactical Shift: Arsenal adopt a compact 4-4-2 rest block, successfully narrowing central passing corridors.",
      "84' GOAL EQUALIZER: Bukayo Saka breaks through City's rest-defense in 4 touches, punishing high defensive line.",
      "69' TACTICAL INFLECTION: Kevin De Bruyne curling strike from half-space restores City momentum after sustained low-block pressure.",
      "42' OPENING GOAL: Erling Haaland converts 14-pass sequence from 11m (xG: 0.74, Pass Difficulty Rating: 88%).",
    ],
    tacticalNote: "Pass Difficulty Rating elevated to 0.42. Pitch Control surface indicates 61% Manchester City dominance.",
  },
  es: {
    headline: "Presión Táctica: Línea alta del Manchester City forzando repliegue defensivo del Arsenal.",
    commentary: [
      "88' Ajuste Táctico: El Arsenal adopta un bloque compacto 4-4-2, cerrando eficazmente los pasillos interiores.",
      "84' GOL DE EMPATE: Bukayo Saka rompe la defensa de transición del City en 4 toques con una definición letal.",
      "69' INFLEXIÓN TÁCTICA: Disparo combado de Kevin De Bruyne desde el medio espacio restaura el control del City.",
      "42' PRIMER GOL: Erling Haaland culmina una secuencia de 14 toques desde 11m (xG: 0.74, PDR: 88%).",
    ],
    tacticalNote: "Índice de Dificultad de Pase elevado a 0.42. Dominio espacial de Control de Campo en 61% a favor del City.",
  },
  fr: {
    headline: "Pression Tactique: Le bloc haut de Manchester City étouffe la relance d'Arsenal en phase de construction.",
    commentary: [
      "88' Ajustement Tactique: Arsenal passe en bloc compact 4-4-2 pour verrouiller les couloirs centraux.",
      "84' ÉGALISATION: Bukayo Saka transperce le repli du City en 4 touches sur une contre-attaque fulgurante.",
      "69' TOURNANT TACTIQUE: Frappe brossée de Kevin De Bruyne redonnant l'avantage au terme d'un siège prolongé.",
      "42' OUVERTURE DU SCORE: Erling Haaland concrétise une séquence de 14 passes à 11m du but (xG: 0.74, PDR: 88%).",
    ],
    tacticalNote: "Indice de Difficulté de Passe (PDR) à 0.42. Contrôle du terrain mesuré à 61% pour Manchester City.",
  },
  ja: {
    headline: "戦術的プレス：マンチェスター・シティのハイラインがアーセナルのビルドアップを封じ込める。",
    commentary: [
      "88' 戦術的シフト：アーセナルは4-4-2のコンパクトなブロックを形成し、中央のパス回廊を完全封鎖。",
      "84' 同点ゴール：サカがわずか4タッチでシティのディフェンスラインを突破、電光石火の同点弾を叩き込む。",
      "69' 戦術的インフレクション：デ・ブライネのハーフスペースからのカーブシュートが膠着状態を打破。",
      "42' 先制ゴール：ハーランドが14本のパス連携から11m地点で仕留める（xG: 0.74, PDR: 88%）。",
    ],
    tacticalNote: "パス難易度レーティング（PDR）は0.42。ピッチコントロール確率はマンチェスター・シティが61%を保持。",
  },
  ar: {
    headline: "الضغط التكتيكي: خط مانشستر سيتي المتقدم يفرض حصاراً دفاعياً على أرسنال في مرحلة بناء اللعب.",
    commentary: [
      "88' تحول تكتيكي: أرسنال يتحول إلى كتلة دفاعية مدمجة 4-4-2 لإغلاق ممرات التمرير المركزية.",
      "84' هدف التعادل: بوكايو ساكا يخترق دفاع السيتي بأربع لمسات سريعة مسجلاً هدف التعادل الحاسم.",
      "69' نقطة تحول تكتيكية: تسديدة مقوسة من كيفين دي بروين تعيد الأفضلية بعد حصار تكتيكي متواصل.",
      "42' هدف الافتتاح: إيرلينغ هالاند يحول سلسلة من 14 تمريرة إلى هدف محقق من مسافة 11 متراً.",
    ],
    tacticalNote: "ارتفع مؤشر صعوبة التمرير (PDR) إلى 0.42. نسبة السيطرة على مساحات الملعب تظهر تفوق السيتي بنسبة 61%.",
  },
};

const PersonaPage: React.FC = () => {
  // Reading from the Single Base Memory Store
  const persona = useBaseMemory((s) => s.selectedPersona);
  const language = useBaseMemory((s) => s.selectedLanguage);
  const overviews = useBaseMemory((s) => s.blackboard.persona_overviews);
  const rhythm = useBaseMemory((s) => s.blackboard.current_game_rhythm);
  const control = useBaseMemory((s) => s.blackboard.control_index);
  const chaos = useBaseMemory((s) => s.blackboard.chaos_index);
  const pdr = useBaseMemory((s) => s.blackboard.latest_pdr);
  const score = useBaseMemory((s) => s.score);
  const matchClock = useBaseMemory((s) => s.matchClock);
  const selectedPlayerId = useBaseMemory((s) => s.selectedPlayerId);
  const currentFrame = useBaseMemory((s) => s.currentFrame);

  // Local state for Club-Centric toggle (City vs Arsenal)
  const [clubAllegiance, setClubAllegiance] = useState<"MCI" | "ARS">("MCI");

  const formatTime = (secs: number) => {
    const clamped = Math.min(5400, Math.max(0, Math.floor(secs || 0)));
    const m = Math.floor(clamped / 60);
    const s = Math.floor(clamped % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Resolve currently spotlighted player profile from Single Core Memory
  const profile: PlayerSpotlightProfile =
    (selectedPlayerId && ROSTER_SPOTLIGHT[selectedPlayerId]) ||
    ROSTER_SPOTLIGHT.home_7;

  // Key quick-pick player presets
  const spotlightOptions = KEY_PLAYER_PRESETS;

  // Derive dynamic metrics from live telemetry
  const liveTelemetry = currentFrame?.players?.find((p) => p.player_id === profile.id);
  const playerSpeed = liveTelemetry?.speed_kmh ?? 23.4;
  const isHighSpeedBurst = playerSpeed > 22.0;
  const liveX = liveTelemetry ? liveTelemetry.x : 52.5;
  const liveY = liveTelemetry ? liveTelemetry.y : 34.0;
  const isCarrier = liveTelemetry?.is_ball_carrier ?? false;
  const activeStream = multilingualStreams[language] || multilingualStreams.en;

  return (
    <IonPage>
      <IonHeader mode="ios">
        <IonToolbar mode="ios">
          <IonTitle>Persona Experience</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding" style={{ ["--background" as string]: "#020617" }}>
        {/* Scorebug Synchronized Header Bar */}
        <div className="studio-scoreboard-header" style={{ marginBottom: "16px" }}>
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
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: "rgba(5, 46, 22, 0.7)",
                border: "1px solid #16a34a",
                padding: "2px 7px",
                borderRadius: "6px",
                fontSize: "10.5px",
                color: "#4ade80",
                fontWeight: 700,
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#22c55e",
                  boxShadow: "0 0 6px #22c55e",
                  flexShrink: 0,
                }}
              />
              5Hz Live
            </div>

            <span style={{ color: "rgba(255, 255, 255, 0.2)" }}>•</span>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px",
                color: "#e2e8f0",
                fontVariantNumeric: "tabular-nums",
                fontWeight: 700,
              }}
            >
              <IonIcon icon={timeOutline} style={{ color: "#38bdf8", fontSize: "13px" }} />
              {formatTime(matchClock)}
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

            <IonBadge color="primary" style={{ fontSize: "10.5px", fontWeight: 700 }}>
              {personaTitles[persona]}
            </IonBadge>
          </div>
        </div>

        {/* Persona Mode Switcher with Permanent Non-Vanishing Scroll Line */}
        <div style={{ marginBottom: "16px" }}>
          <StudioChipScroller marginTopTrack={8} gap="6px">
            {[
              { id: "analyst", label: "Analyst", icon: analyticsOutline },
              { id: "casual", label: "Casual", icon: peopleOutline },
              { id: "player_cam", label: "Player Cam", icon: videocamOutline },
              { id: "club_centric", label: "Club-Centric", icon: shieldCheckmarkOutline },
            ].map((p) => {
              const isSelected = persona === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => baseMemory.setPersona(p.id as PersonaMode)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 14px",
                    borderRadius: "10px",
                    border: isSelected ? "1.5px solid #8b5cf6" : "1px solid rgba(255, 255, 255, 0.08)",
                    backgroundColor: isSelected ? "rgba(139, 92, 246, 0.28)" : "#0f172a",
                    color: isSelected ? "#ffffff" : "#94a3b8",
                    fontSize: "12.5px",
                    fontWeight: isSelected ? 800 : 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    boxShadow: isSelected ? "0 0 12px rgba(139, 92, 246, 0.35)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  <IonIcon
                    icon={p.icon}
                    style={{ fontSize: "14px", color: isSelected ? "#c084fc" : "#64748b" }}
                  />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </StudioChipScroller>
        </div>

        {/* ======================================================== */}
        {/* VIEW 1: ANALYST EXPERIENCE (Data-Dense Tactical Models)  */}
        {/* ======================================================== */}
        {persona === "analyst" && (
          <div className="studio-two-col-grid" style={{ marginBottom: "16px" }}>
            {/* Probabilistic Surface & Passing Corridors */}
            <IonCard mode="ios" style={{ background: "#0f172a", margin: 0, border: "1px solid #1e293b" }}>
              <IonCardHeader style={{ paddingBottom: "10px" }}>
                <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc", margin: 0 }}>
                  Defensive Compression &amp; Expected Value
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                    marginBottom: "14px",
                  }}
                >
                  <div
                    style={{
                      background: "#1e293b",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #334155",
                    }}
                  >
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>Cumulative Expected Goals</div>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "#00e5ff", marginTop: "2px" }}>
                      2.45 <span style={{ fontSize: "12px", color: "#64748b" }}>vs</span>{" "}
                      <span style={{ color: "#f43f5e" }}>1.12</span>
                    </div>
                    <div style={{ fontSize: "10px", color: "#38bdf8", marginTop: "4px" }}>
                      MCI xG delta: +1.33
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#1e293b",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #334155",
                    }}
                  >
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>Pass Difficulty Rating (PDR)</div>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "#f59e0b", marginTop: "2px" }}>
                      {(pdr * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Spatial Corridors & Block Density */}
                <div
                  style={{
                    background: "#020617",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid #1e293b",
                    marginBottom: "12px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px" }}>
                    <span style={{ color: "#94a3b8" }}>Central Corridor Width</span>
                    <span style={{ color: "#38bdf8", fontWeight: 700 }}>26.4m (Squeezed)</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px" }}>
                    <span style={{ color: "#94a3b8" }}>Half-Space Progression</span>
                    <span style={{ color: "#00e5ff", fontWeight: 700 }}>82% (Right Channel)</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                    <span style={{ color: "#94a3b8" }}>Defensive Line Depth</span>
                    <span style={{ color: "#f43f5e", fontWeight: 700 }}>18.2m Low-Block</span>
                  </div>
                </div>

                {/* Pitch Control Surface Dominance */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#cbd5e1", marginBottom: "4px" }}>
                    <span>Pitch Control: MCI 61%</span>
                    <span>ARS 39%</span>
                  </div>
                  <IonProgressBar
                    value={0.61}
                    style={{
                      ["--progress-background" as string]: "#00e5ff",
                      ["--buffer-background" as string]: "#f43f5e",
                      height: "8px",
                      borderRadius: "4px",
                    }}
                  />
                </div>
              </IonCardContent>
            </IonCard>

            {/* Tactical Phase & Deep Analyst Reasoning */}
            <IonCard mode="ios" style={{ background: "#0f172a", margin: 0, border: "1px solid #1e293b" }}>
              <IonCardHeader style={{ paddingBottom: "10px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "6px",
                  }}
                >
                  <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc", margin: 0 }}>
                    Swarm Intelligence Reasoning Core
                  </IonCardTitle>
                  <IonBadge
                    color="primary"
                    style={{
                      fontSize: "10px",
                      padding: "4px 8px",
                      borderRadius: "12px",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    {rhythm.replace(/_/g, " ")}
                  </IonBadge>
                </div>
              </IonCardHeader>
              <IonCardContent>
                {/* Active Blackboard Reasoning */}
                <div
                  style={{
                    background: "rgba(124, 58, 237, 0.12)",
                    borderLeft: "3px solid #7c3aed",
                    padding: "12px",
                    borderRadius: "4px 8px 8px 4px",
                    color: "#e2e8f0",
                    fontSize: "13px",
                    lineHeight: 1.5,
                    marginBottom: "14px",
                  }}
                >
                  {overviews.analyst}
                </div>

                {/* Territorial Progression Distribution */}
                <div>
                  <div style={{ marginBottom: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#cbd5e1", marginBottom: "2px" }}>
                      <span>Build-Up Phase (First Third)</span>
                      <span style={{ color: "#38bdf8" }}>28%</span>
                    </div>
                    <IonProgressBar value={0.28} color="tertiary" style={{ height: "6px", borderRadius: "3px" }} />
                  </div>

                  <div style={{ marginBottom: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#cbd5e1", marginBottom: "2px" }}>
                      <span>Progression Phase (Middle Third)</span>
                      <span style={{ color: "#a855f7" }}>46%</span>
                    </div>
                    <IonProgressBar value={0.46} color="primary" style={{ height: "6px", borderRadius: "3px" }} />
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#cbd5e1", marginBottom: "2px" }}>
                      <span>Final Third Penetration (Box Siege)</span>
                      <span style={{ color: "#00e5ff" }}>26%</span>
                    </div>
                    <IonProgressBar value={0.26} color="secondary" style={{ height: "6px", borderRadius: "3px" }} />
                  </div>
                </div>
              </IonCardContent>
            </IonCard>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: CASUAL EXPERIENCE (Storyline, Duels & Milestones) */}
        {/* ======================================================== */}
        {persona === "casual" && (
          <div className="studio-two-col-grid" style={{ marginBottom: "16px" }}>
            {/* Storyline & Emotional Momentum Pendulum */}
            <IonCard mode="ios" style={{ background: "#0f172a", margin: 0, border: "1px solid #1e293b" }}>
              <IonCardHeader style={{ paddingBottom: "10px" }}>
                <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc", margin: 0 }}>
                  Match Momentum
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                {/* Dynamic Momentum Pendulum */}
                <div
                  style={{
                    background: "#020617",
                    padding: "14px",
                    borderRadius: "8px",
                    border: "1px solid #1e293b",
                    marginBottom: "14px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#cbd5e1", marginBottom: "6px" }}>
                    <span style={{ color: "#00e5ff", fontWeight: 700 }}>Manchester City Pressure</span>
                    <span style={{ color: "#f43f5e", fontWeight: 700 }}>Arsenal Counter Threat</span>
                  </div>
                  <IonProgressBar
                    value={control / 100}
                    style={{
                      ["--progress-background" as string]: "#00e5ff",
                      ["--buffer-background" as string]: "#f43f5e",
                      height: "10px",
                      borderRadius: "5px",
                    }}
                  />
                </div>

                {/* Casual Storyline Narrative */}
                <div
                  style={{
                    background: "rgba(56, 189, 248, 0.1)",
                    borderLeft: "3px solid #38bdf8",
                    padding: "12px",
                    borderRadius: "4px 8px 8px 4px",
                    color: "#e2e8f0",
                    fontSize: "14px",
                    lineHeight: 1.5,
                    marginBottom: "14px",
                  }}
                >
                  {overviews.casual}
                </div>

                {/* Key In-Match Duels */}
                <div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div
                      style={{
                        background: "#1e293b",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid #334155",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "6px",
                      }}
                    >
                      <div style={{ minWidth: 0, flex: "1 1 140px" }}>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#f8fafc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          E. Haaland vs W. Saliba
                        </div>
                        <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                          Physical aerial duel and box positioning
                        </div>
                      </div>
                      <IonBadge color="success" style={{ flexShrink: 0 }}>City Advantage</IonBadge>
                    </div>

                    <div
                      style={{
                        background: "#1e293b",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid #334155",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "6px",
                      }}
                    >
                      <div style={{ minWidth: 0, flex: "1 1 140px" }}>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#f8fafc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          Rodri vs D. Rice
                        </div>
                        <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                          Midfield engine room battle for supremacy
                        </div>
                      </div>
                      <IonBadge color="tertiary" style={{ flexShrink: 0 }}>Even Duel</IonBadge>
                    </div>
                  </div>
                </div>
              </IonCardContent>
            </IonCard>

            {/* Plain-Language Explainers & Milestones */}
            <IonCard mode="ios" style={{ background: "#0f172a", margin: 0, border: "1px solid #1e293b" }}>
              <IonCardHeader style={{ paddingBottom: "10px" }}>
                <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc", margin: 0 }}>
                  Tactical Context
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                {/* Plain-English Breakdown */}
                <div
                  style={{
                    background: "#020617",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid #1e293b",
                    marginBottom: "14px",
                  }}
                >
                  <div style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: 1.6 }}>
                    Manchester City are holding onto the ball right outside Arsenal&apos;s 18-yard box, passing back and forth to force a mistake. Arsenal have formed two compact defensive walls to block every shooting lane and are waiting to sprint forward on a counter-attack the second they win the ball.
                  </div>
                </div>

                {/* Player Milestones Alert */}
                <div style={{ marginBottom: "14px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div
                      style={{
                        background: "#1e293b",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: "1px solid #334155",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "#00e5ff" }}>
                        <IonIcon icon={sparklesOutline} />
                        Erling Haaland Goal Milestone
                      </div>
                      <div style={{ fontSize: "11px", color: "#cbd5e1", marginTop: "2px" }}>
                        10th Premier League goal of the campaign, netting in 4 consecutive home fixtures.
                      </div>
                    </div>

                    <div
                      style={{
                        background: "#1e293b",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: "1px solid #334155",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "#f43f5e" }}>
                        <IonIcon icon={flashOutline} />
                        Bukayo Saka Equalizer Impact
                      </div>
                      <div style={{ fontSize: "11px", color: "#cbd5e1", marginTop: "2px" }}>
                        Equalizer scored on just 4 touches, punishing high defensive line in transition.
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    background: "rgba(245, 158, 11, 0.1)",
                    border: "1px solid #f59e0b",
                    padding: "10px",
                    borderRadius: "8px",
                    fontSize: "11px",
                    color: "#fbbf24",
                  }}
                >
                  Kevin De Bruyne curling deliveries from the right half-space test Arsenal&apos;s near-post coverage.
                </div>
              </IonCardContent>
            </IonCard>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 3: PLAYER CAM FOCUS (Dedicated Individual Telemetry) */}
        {/* ======================================================== */}
        {persona === "player_cam" && (
          <div>
            {/* Quick-Pick Key Player Pills Bar with Permanent Scroll Line */}
            <div style={{ marginBottom: "14px" }}>
              <StudioChipScroller marginTopTrack={8} gap="8px">
                {spotlightOptions.map((opt) => {
                  const isSelected = profile.id === opt.id;
                  const isHome = opt.team === "home";
                  return (
                    <button
                      key={opt.id}
                      onClick={() => baseMemory.setSelectedPlayer(opt.id)}
                      style={{
                        background: isSelected ? (isHome ? "#00e5ff" : "#f43f5e") : "#0f172a",
                        color: isSelected ? "#020617" : "#cbd5e1",
                        border: `1px solid ${isSelected ? (isHome ? "#00e5ff" : "#f43f5e") : "#334155"}`,
                        padding: "6px 14px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        transition: "all 0.2s ease",
                      }}
                    >
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </StudioChipScroller>
            </div>

            <div className="studio-two-col-grid" style={{ marginBottom: "16px" }}>
              {/* Player Identity & Live Exertion Telemetry */}
              <IonCard mode="ios" style={{ background: "#0f172a", margin: 0, border: "1px solid #1e293b" }}>
                <IonCardHeader style={{ paddingBottom: "10px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "6px",
                    }}
                  >
                    <IonCardTitle
                      style={{
                        fontSize: "18px",
                        color: "#f8fafc",
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "8px",
                        margin: 0,
                      }}
                    >
                      <span>#{profile.number} {profile.name}</span>
                      <span
                        style={{
                          background: "#1e293b",
                          border: "1px solid #334155",
                          color: "#38bdf8",
                          fontSize: "11px",
                          fontWeight: 800,
                          padding: "2px 8px",
                          borderRadius: "6px",
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                      >
                        {profile.pos}
                      </span>
                    </IonCardTitle>
                    <IonBadge color="primary" style={{ fontSize: "10px", flexShrink: 0 }}>
                      Rating {profile.rating.toFixed(1)}
                    </IonBadge>
                  </div>
                </IonCardHeader>
                <IonCardContent>
                  {/* Live Speed Bar */}
                  <div style={{ background: "#020617", padding: "12px", borderRadius: "8px", border: "1px solid #1e293b", marginBottom: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "12px", color: "#94a3b8" }}>Live Sprint Velocity</span>
                      <span style={{ fontSize: "18px", fontWeight: 800, color: isHighSpeedBurst ? "#f43f5e" : "#00e5ff" }}>
                        {playerSpeed.toFixed(1)} km/h
                      </span>
                    </div>
                    <IonProgressBar
                      value={Math.min(1.0, playerSpeed / 34.0)}
                      color={isHighSpeedBurst ? "danger" : "secondary"}
                      style={{ height: "8px", borderRadius: "4px" }}
                    />
                  </div>

                  {/* Physical Exertion Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
                    <div style={{ background: "#1e293b", padding: "10px", borderRadius: "8px", border: "1px solid #334155" }}>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>Distance Covered</div>
                      <div style={{ fontSize: "16px", fontWeight: 800, color: "#f8fafc", marginTop: "2px" }}>
                        {(3.2 + (matchClock / 1200) * 0.8).toFixed(2)} km
                      </div>
                      <div style={{ fontSize: "10px", color: "#38bdf8", marginTop: "2px" }}>
                        Work rate: Very High
                      </div>
                    </div>

                    <div style={{ background: "#1e293b", padding: "10px", borderRadius: "8px", border: "1px solid #334155" }}>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>Sprint Bursts (&gt;22 km/h)</div>
                      <div style={{ fontSize: "16px", fontWeight: 800, color: "#a855f7", marginTop: "2px" }}>
                        14 Bursts
                      </div>
                      <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>
                        Peak: 32.4 km/h
                      </div>
                    </div>
                  </div>

                  {/* Pitch Metric Position */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "4px",
                      background: "#020617",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      fontSize: "11px",
                    }}
                  >
                    <span style={{ color: "#94a3b8" }}>Pitch Position:</span>
                    <span style={{ color: "#00e5ff", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                      X: {liveX.toFixed(1)}m, Y: {liveY.toFixed(1)}m
                    </span>
                  </div>
                </IonCardContent>
              </IonCard>

              {/* Player Cam Tactical Narrative & Decisive Actions */}
              <IonCard mode="ios" style={{ background: "#0f172a", margin: 0, border: "1px solid #1e293b" }}>
                <IonCardHeader style={{ paddingBottom: "10px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "6px",
                    }}
                  >
                    <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc", margin: 0 }}>
                      Spotlight Feed
                    </IonCardTitle>
                    <IonBadge
                      color={isHighSpeedBurst ? "danger" : "success"}
                      style={{
                        fontSize: "10px",
                        padding: "4px 8px",
                        borderRadius: "12px",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      {isHighSpeedBurst
                        ? "[High-Speed Sprint Burst]"
                        : isCarrier
                        ? "[Active Ball Carrier]"
                        : "[Off-Ball Tactical Run]"}
                    </IonBadge>
                  </div>
                </IonCardHeader>
                <IonCardContent>
                  {/* Real-time Narrative from Blackboard */}
                  <div
                    style={{
                      background: "rgba(124, 58, 237, 0.12)",
                      borderLeft: "3px solid #7c3aed",
                      padding: "12px",
                      borderRadius: "4px 8px 8px 4px",
                      color: "#e2e8f0",
                      fontSize: "13px",
                      lineHeight: 1.5,
                      marginBottom: "14px",
                    }}
                  >
                    {overviews.player_cam}
                  </div>

                  {/* Decisive Actions & Skill Radar Breakdown */}
                  <div style={{ marginBottom: "14px" }}>
                    <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600, marginBottom: "8px" }}>
                      Attributes
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <div style={{ background: "#1e293b", padding: "8px 10px", borderRadius: "6px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                          <span style={{ color: "#94a3b8" }}>Passing Index</span>
                          <span style={{ color: "#38bdf8", fontWeight: 700 }}>
                            {profile.attributes.passing}/100
                          </span>
                        </div>
                      </div>

                      <div style={{ background: "#1e293b", padding: "8px 10px", borderRadius: "6px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                          <span style={{ color: "#94a3b8" }}>Shooting Power</span>
                          <span style={{ color: "#f43f5e", fontWeight: 700 }}>
                            {profile.attributes.shoot}/100
                          </span>
                        </div>
                      </div>

                      <div style={{ background: "#1e293b", padding: "8px 10px", borderRadius: "6px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                          <span style={{ color: "#94a3b8" }}>Dribble Agility</span>
                          <span style={{ color: "#a855f7", fontWeight: 700 }}>
                            {profile.attributes.dribbling}/100
                          </span>
                        </div>
                      </div>

                      <div style={{ background: "#1e293b", padding: "8px 10px", borderRadius: "6px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                          <span style={{ color: "#94a3b8" }}>Defensive Press</span>
                          <span style={{ color: "#10b981", fontWeight: 700 }}>
                            {profile.attributes.defending}/100
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#020617",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #1e293b",
                      fontSize: "11px",
                      color: "#94a3b8",
                    }}
                  >
                    Maintaining width and creating decoy channels to disorganize Arsenal&apos;s defensive double-pivot.
                  </div>
                </IonCardContent>
              </IonCard>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 4: CLUB-CENTRIC EXPERIENCE (Framed Club Execution)  */}
        {/* ======================================================== */}
        {persona === "club_centric" && (
          <div>
            {/* Club Allegiance Selector */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
              <button
                onClick={() => setClubAllegiance("MCI")}
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: clubAllegiance === "MCI" ? "#00e5ff" : "#0f172a",
                  color: clubAllegiance === "MCI" ? "#020617" : "#cbd5e1",
                  border: `1px solid ${clubAllegiance === "MCI" ? "#00e5ff" : "#334155"}`,
                  padding: "8px 4px",
                  borderRadius: "10px",
                  fontWeight: 800,
                  cursor: "pointer",
                  fontSize: "12px",
                  textAlign: "center",
                  transition: "all 0.2s ease",
                }}
              >
                Manchester City Focus
              </button>
              <button
                onClick={() => setClubAllegiance("ARS")}
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: clubAllegiance === "ARS" ? "#f43f5e" : "#0f172a",
                  color: clubAllegiance === "ARS" ? "#020617" : "#cbd5e1",
                  border: `1px solid ${clubAllegiance === "ARS" ? "#f43f5e" : "#334155"}`,
                  padding: "8px 4px",
                  borderRadius: "10px",
                  fontWeight: 800,
                  cursor: "pointer",
                  fontSize: "12px",
                  textAlign: "center",
                  transition: "all 0.2s ease",
                }}
              >
                Arsenal Focus
              </button>
            </div>

            <div className="studio-two-col-grid" style={{ marginBottom: "16px" }}>
              {/* Club Tactical Execution Hub */}
              <IonCard mode="ios" style={{ background: "#0f172a", margin: 0, border: "1px solid #1e293b" }}>
                <IonCardHeader style={{ paddingBottom: "10px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}
                  >
                    <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc", margin: 0 }}>
                      Tactical Execution
                    </IonCardTitle>
                    <IonBadge
                      color={clubAllegiance === "MCI" ? "secondary" : "danger"}
                      style={{
                        padding: "4px 10px",
                        fontSize: "11px",
                        fontWeight: 700,
                        borderRadius: "12px",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      Execution Grade: {clubAllegiance === "MCI" ? "A (8.4/10)" : "A- (8.1/10)"}
                    </IonBadge>
                  </div>
                </IonCardHeader>
                <IonCardContent>
                  {/* Framing Narrative */}
                  <div
                    style={{
                      background: clubAllegiance === "MCI" ? "rgba(0, 229, 255, 0.1)" : "rgba(244, 63, 94, 0.1)",
                      borderLeft: `3px solid ${clubAllegiance === "MCI" ? "#00e5ff" : "#f43f5e"}`,
                      padding: "12px",
                      borderRadius: "4px 8px 8px 4px",
                      color: "#e2e8f0",
                      fontSize: "13px",
                      lineHeight: 1.5,
                      marginBottom: "14px",
                    }}
                  >
                    {overviews.club_centric}
                  </div>

                  {/* Club Tactical KPIs */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
                    <div style={{ background: "#1e293b", padding: "10px", borderRadius: "8px", border: "1px solid #334155" }}>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>Territorial Dominance</div>
                      <div
                        style={{
                          fontSize: "18px",
                          fontWeight: 800,
                          color: clubAllegiance === "MCI" ? "#00e5ff" : "#f43f5e",
                          marginTop: "2px",
                        }}
                      >
                        {clubAllegiance === "MCI" ? "68%" : "32%"}
                      </div>
                      <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>
                        Attacking third occupancy
                      </div>
                    </div>

                    <div style={{ background: "#1e293b", padding: "10px", borderRadius: "8px", border: "1px solid #334155" }}>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>Plan Adherence</div>
                      <div style={{ fontSize: "18px", fontWeight: 800, color: "#10b981", marginTop: "2px" }}>
                        {clubAllegiance === "MCI" ? "92%" : "88%"}
                      </div>
                      <div style={{ fontSize: "10px", color: "#10b981", marginTop: "2px" }}>
                        Structural discipline
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#020617",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #1e293b",
                      fontSize: "11px",
                      color: "#94a3b8",
                    }}
                  >
                    <span style={{ color: clubAllegiance === "MCI" ? "#00e5ff" : "#f43f5e", fontWeight: 700 }}>
                      Coach Instruction:
                    </span>{" "}
                    {clubAllegiance === "MCI"
                      ? "Guardiola demanding 5-man attacking wave into half-spaces to break Arsenal's second block."
                      : "Arteta demanding Saka stay pinned high on the right touchline ready for the first outlet release."}
                  </div>
                </IonCardContent>
              </IonCard>

              {/* Supporter Analysis & Critical Window */}
              <IonCard mode="ios" style={{ background: "#0f172a", margin: 0, border: "1px solid #1e293b" }}>
                <IonCardHeader style={{ paddingBottom: "10px" }}>
                  <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc", margin: 0 }}>
                    Tactical Windows
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <div style={{ background: "#020617", padding: "12px", borderRadius: "8px", border: "1px solid #1e293b", marginBottom: "14px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#f8fafc", marginBottom: "4px" }}>
                      {clubAllegiance === "MCI" ? "Guardiola's Tactical Key:" : "Arteta's Tactical Key:"}
                    </div>
                    <div style={{ fontSize: "12px", color: "#cbd5e1", lineHeight: 1.5 }}>
                      {clubAllegiance === "MCI"
                        ? "Utilize De Bruyne and Bernardo Silva as dual free-eights to overload the space behind Rice, dragging Gabriel forward."
                        : "Maintain vertical compactness between Saliba and Rice. Do not let Haaland isolate 1v1 against the fullback."}
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#1e293b",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #334155",
                    }}
                  >
                    <div style={{ fontSize: "12px", color: "#cbd5e1" }}>
                      {clubAllegiance === "MCI"
                        ? "Minutes 60-75: Expect Guardiola to introduce Doku on the left to force 1v1 overloads against White."
                        : "Minutes 70-85: Arteta likely to introduce Trossard for fresh legs in transitional press resistance."}
                    </div>
                  </div>
                </IonCardContent>
              </IonCard>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MULTILINGUAL BROADCAST STREAM (5 Global Languages)       */}
        {/* ======================================================== */}
        <IonCard mode="ios" style={{ background: "#0f172a", margin: 0, border: "1px solid #1e293b" }}>
          <IonCardHeader style={{ paddingBottom: "10px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <div>
                <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc", margin: 0 }}>
                  Multilingual Commentary
                </IonCardTitle>
              </div>

              {/* Language Selector Segment Tabs with Permanent Non-Vanishing Scroll Line */}
              <div style={{ maxWidth: "100%", width: "100%", minWidth: 0, flex: "1 1 300px" }}>
                <StudioChipScroller marginTopTrack={6} gap="6px">
                  {[
                    { code: "en", label: "English (EN)" },
                    { code: "es", label: "Español (ES)" },
                    { code: "fr", label: "Français (FR)" },
                    { code: "ja", label: "日本語 (JA)" },
                    { code: "ar", label: "العربية (AR)" },
                  ].map((l) => {
                    const isSelected = language === l.code;
                    return (
                      <button
                        key={l.code}
                        onClick={() => baseMemory.setLanguage(l.code as SupportedLanguage)}
                        style={{
                          background: isSelected ? "#38bdf8" : "#1e293b",
                          color: isSelected ? "#020617" : "#cbd5e1",
                          border: `1px solid ${isSelected ? "#38bdf8" : "#334155"}`,
                          padding: "4px 10px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                          transition: "all 0.2s ease",
                        }}
                      >
                        {l.label}
                      </button>
                    );
                  })}
                </StudioChipScroller>
              </div>
            </div>
          </IonCardHeader>

          <IonCardContent>
            {/* Live Teleprompter Box */}
            <div
              dir={language === "ar" ? "rtl" : "ltr"}
              style={{
                background: "#020617",
                border: "1px solid #1e293b",
                borderRadius: "8px",
                padding: "14px",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "11px",
                  color: "#38bdf8",
                  fontWeight: 700,
                  marginBottom: "8px",
                }}
              >
                <IonIcon icon={radioOutline} />
                <span>{language.toUpperCase()}</span>
              </div>

              {/* Current Headline */}
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#f8fafc",
                  marginBottom: "10px",
                  lineHeight: 1.5,
                }}
              >
                &ldquo;{activeStream.headline}&rdquo;
              </div>

              {/* Canonical Tactical Note */}
              <div
                style={{
                  fontSize: "12px",
                  color: "#94a3b8",
                  marginBottom: "12px",
                  fontStyle: "italic",
                }}
              >
                {activeStream.tacticalNote}
              </div>

              {/* Chronological Commentary Stream */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", borderTop: "1px solid #1e293b", paddingTop: "10px" }}>
                {activeStream.commentary.map((entry, idx) => (
                  <div
                    key={idx}
                    style={{
                      fontSize: "12px",
                      color: idx === 0 ? "#e2e8f0" : "#64748b",
                      lineHeight: 1.4,
                    }}
                  >
                    {entry}
                  </div>
                ))}
              </div>
            </div>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default PersonaPage;
