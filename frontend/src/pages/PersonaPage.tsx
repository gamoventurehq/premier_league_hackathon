import React, { useState } from "react";
import {
  IonContent,
  IonPage,
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
  chevronDownOutline,
  chevronUpOutline,
  timeOutline,
  sparklesOutline,
  flashOutline,
  radioOutline,
  arrowForwardOutline,
} from "ionicons/icons";
import { useBaseMemory, baseMemory } from "../store/baseMemory";
import { PersonaMode, SupportedLanguage, PlayerProfile } from "../types/telemetry";
import { StudioChipScroller } from "../components/StudioChipScroller";
import { StudioTopBar } from "../components/StudioTopBar";

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

const languageNames: Record<SupportedLanguage, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  ja: "日本語",
  ar: "العربية",
};

// Timestamps aligned with early match clock (~24:18)
const multilingualStreams: Record<SupportedLanguage, MultilingualEntry> = {
  en: {
    headline: "Tactical Press: Manchester City high line pinning Arsenal defenders deep in build-up phase.",
    commentary: [
      "22' Tactical Shift: Arsenal adopt a compact 4-4-2 rest block, successfully narrowing central passing corridors.",
      "17' High Press Turnover: Bernardo Silva intercepts Saliba's outlet pass, triggering rapid half-space rotation.",
      "11' Deep Progression: De Bruyne curling cross from right half-space cleared by Gabriel inside the 6-yard box.",
      "4' Build-up Sequence: 14-pass sequence from back third establishes early City positional control.",
    ],
    tacticalNote: "Pass Difficulty Rating at 0.35. Pitch Control surface indicates 61% Manchester City dominance.",
  },
  es: {
    headline: "Presión Táctica: Línea alta del Manchester City forzando repliegue defensivo del Arsenal.",
    commentary: [
      "22' Ajuste Táctico: El Arsenal adopta un bloque compacto 4-4-2, cerrando eficazmente los pasillos interiores.",
      "17' Recuperación en Presión Alta: Bernardo Silva intercepta la salida de Saliba, provocando rotación rápida.",
      "11' Progresión Profunda: Centro combado de De Bruyne desde el medio espacio despejado por Gabriel.",
      "4' Secuencia de Salida: Sucesión de 14 pases consolida el control posicional inicial del City.",
    ],
    tacticalNote: "Índice de Dificultad de Pase (PDR) en 0.35. Control de Campo en 61% a favor del City.",
  },
  fr: {
    headline: "Pression Tactique: Le bloc haut de Manchester City étouffe la relance d'Arsenal en phase de construction.",
    commentary: [
      "22' Ajustement Tactique: Arsenal passe en bloc compact 4-4-2 pour verrouiller les couloirs centraux.",
      "17' Récupération Haute: Bernardo Silva coupe la relance de Saliba et déclenche la transition immédiate.",
      "11' Incursion Latérale: Centre brossé de De Bruyne écarté in extremis par Gabriel dans les 6 mètres.",
      "4' Séquence Collective: 14 passes consécutives installent le siège posé de Manchester City.",
    ],
    tacticalNote: "Indice de Difficulté de Passe (PDR) à 0.35. Contrôle du terrain mesuré à 61% pour City.",
  },
  ja: {
    headline: "戦術的プレス：マンチェスター・シティのハイラインがアーセナルのビルドアップを封じ込める。",
    commentary: [
      "22' 戦術的シフト：アーセナルは4-4-2のコンパクトなブロックを形成し、中央のパス回廊を遮断。",
      "17' ハイプレスターンオーバー：ベルナルド・シウバがサリバの配球をカットし、即時縦パスを展開。",
      "11' 決定機演出：デ・ブライネの右ハーフスペースからの正確なクロスをガブリエウがゴール前でクリア。",
      "4' ビルドアップ：後方からの14本パス連携でシティがゲームの主導権を握る。",
    ],
    tacticalNote: "パス難易度レーティング（PDR）は0.35。ピッチコントロール確率はマンチェスター・シティが61%を保持。",
  },
  ar: {
    headline: "الضغط التكتيكي: خط مانشستر سيتي المتقدم يفرض حصاراً دفاعياً على أرسنال في مرحلة بناء اللعب.",
    commentary: [
      "22' تحول تكتيكي: أرسنال يتحول إلى كتلة دفاعية مدمجة 4-4-2 لإغلاق ممرات التمرير المركزية.",
      "17' افتكاك متقدم: برناردو سيلفا يقطع تمريرة ساليبا الطولية ويبدأ هجمة سريعة.",
      "11' توغل عميق: عرضية متقنة من دي بروين من نصف المساحة يبعدها غابرييل من منطقة الست ياردات.",
      "4' تدوير الكرة: سلسلة من 14 تمريرة تفرض سيطرة مبكرة لمانشستر سيتي على مجريات اللعب.",
    ],
    tacticalNote: "مؤشر صعوبة التمرير (PDR) عند 0.35. نسبة السيطرة على مساحات الملعب تشير إلى تفوق السيتي بنسبة 61%.",
  },
};

const PersonaPage: React.FC = () => {
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
  const homeLineup = useBaseMemory((s) => s.homeLineup);
  const awayLineup = useBaseMemory((s) => s.awayLineup);

  // Local state
  const [clubAllegiance, setClubAllegiance] = useState<"MCI" | "ARS">("MCI");
  const [isCommentaryExpanded, setIsCommentaryExpanded] = useState<boolean>(false);
  const [showAnalystReasoning, setShowAnalystReasoning] = useState<boolean>(false);

  const formatTime = (secs: number) => {
    const clamped = Math.min(5400, Math.max(0, Math.floor(secs || 0)));
    const m = Math.floor(clamped / 60);
    const s = Math.floor(clamped % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Resolve currently spotlighted player profile from Single Core Memory
  const allPlayers = [...homeLineup, ...awayLineup];
  const selectedPlayer: PlayerProfile =
    allPlayers.find((p) => p.id === selectedPlayerId) ||
    homeLineup.find((p) => p.id === "home_8") ||
    homeLineup[0];

  // Canonical roster options
  const spotlightOptions = [
    { id: "home_11", label: "E. Haaland", number: 9, team: "home" },
    { id: "home_8", label: "K. De Bruyne", number: 17, team: "home" },
    { id: "home_7", label: "B. Silva", number: 20, team: "home" },
    { id: "home_9", label: "P. Foden", number: 47, team: "home" },
    { id: "away_9", label: "B. Saka", number: 7, team: "away" },
    { id: "away_8", label: "M. Ødegaard", number: 8, team: "away" },
    { id: "away_11", label: "K. Havertz", number: 29, team: "away" },
  ];

  // Derive dynamic metrics
  const playerSpeed = selectedPlayer.speed_kmh ?? 23.4;
  const isHighSpeedBurst = playerSpeed > 22.0;
  const activeStream = multilingualStreams[language] || multilingualStreams.en;
  const activeLanguageName = languageNames[language] || "English";

  return (
    <IonPage>
      <StudioTopBar
        title="Personas"
        subtitle="Analyst, Casual & Multi-Language"
      />

      <IonContent fullscreen className="ion-padding" style={{ ["--background" as string]: "#020617" }}>
        {/* ======================================================== */}
        {/* SHARED MAX-WIDTH CONTAINER (Pixel-Perfect Alignment)    */}
        {/* ======================================================== */}
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {/* ======================================================== */}
          {/* SCOREBUG SYNCHRONIZED STRIP                             */}
          {/* ======================================================== */}
          <div
            className="studio-scoreboard-header"
            style={{
              margin: 0,
              background: "#0b1222",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "12px",
              padding: "10px 16px",
            }}
          >
            <div className="studio-ribbon-row-teams">
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: 800, color: "#00e5ff", fontSize: "14px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#00e5ff", flexShrink: 0 }} />
                {score.homeTeam}
              </span>
              <span
                style={{
                  background: "#1e293b",
                  padding: "4px 12px",
                  borderRadius: "8px",
                  fontWeight: 900,
                  color: "#ffffff",
                  letterSpacing: "1.5px",
                  fontSize: "13px",
                  flexShrink: 0,
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                }}
              >
                {score.homeScore} - {score.awayScore}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: 800, color: "#f43f5e", fontSize: "14px" }}>
                {score.awayTeam}
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f43f5e", flexShrink: 0 }} />
              </span>
            </div>

            <div className="studio-ribbon-row-meta">
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(16, 185, 129, 0.12)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  color: "#34d399",
                  fontWeight: 700,
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "#10b981",
                    flexShrink: 0,
                  }}
                />
                Simulated 10Hz Feed
              </div>

              <span style={{ color: "rgba(255, 255, 255, 0.2)" }}>•</span>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "12px",
                  color: "#e2e8f0",
                  fontVariantNumeric: "tabular-nums",
                  fontWeight: 700,
                }}
              >
                <IonIcon icon={timeOutline} style={{ color: "#38bdf8", fontSize: "14px" }} />
                {formatTime(matchClock)}
              </div>

              <span style={{ color: "rgba(255, 255, 255, 0.2)" }}>•</span>

              <span
                style={{
                  background: "#1e293b",
                  border: "1px solid #334155",
                  color: "#e2e8f0",
                  fontSize: "10.5px",
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {score.period}
              </span>

              <IonBadge color="primary" style={{ fontSize: "10.5px", fontWeight: 700, padding: "4px 8px", borderRadius: "6px" }}>
                {personaTitles[persona]}
              </IonBadge>
            </div>
          </div>

          {/* ======================================================== */}
          {/* PERSONA SEGMENTED NAVIGATION                             */}
          {/* ======================================================== */}
          <div>
            <StudioChipScroller marginTopTrack={6} gap="8px">
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
                      padding: "8px 16px",
                      borderRadius: "8px",
                      border: isSelected ? "1.5px solid #8b5cf6" : "1px solid rgba(255, 255, 255, 0.08)",
                      backgroundColor: isSelected ? "rgba(139, 92, 246, 0.2)" : "#0f172a",
                      color: isSelected ? "#ffffff" : "#94a3b8",
                      fontSize: "13px",
                      fontWeight: isSelected ? 800 : 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    <IonIcon icon={p.icon} style={{ fontSize: "15px", color: isSelected ? "#c084fc" : "#64748b" }} />
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </StudioChipScroller>
          </div>

          {/* ======================================================== */}
          {/* VIEW 1: ANALYST EXPERIENCE (Metrics & Tactical Models)   */}
          {/* ======================================================== */}
          {persona === "analyst" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Compact 3-Metric Summary Bar (Flat, Zero Nesting) */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    background: "#0f172a",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "10px",
                    padding: "14px 16px",
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Cumulative Expected Goals (xG)
                  </div>
                  <div style={{ fontSize: "22px", fontWeight: 800, color: "#00e5ff", marginTop: "4px" }}>
                    2.45 <span style={{ fontSize: "14px", color: "#64748b", fontWeight: 600 }}>vs</span>{" "}
                    <span style={{ color: "#f43f5e" }}>1.12</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#38bdf8", marginTop: "4px" }}>
                    MCI Delta +1.33 • Sustained High Threat
                  </div>
                </div>

                <div
                  style={{
                    background: "#0f172a",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "10px",
                    padding: "14px 16px",
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Pass Difficulty Rating (PDR)
                  </div>
                  <div style={{ fontSize: "22px", fontWeight: 800, color: "#f59e0b", marginTop: "4px" }}>
                    {pdr.toFixed(2)}{" "}
                    <span style={{ fontSize: "12px", color: "#fbbf24", fontWeight: 600 }}>
                      • Moderate Friction
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                    Scale: 0.00 (Effortless) → 1.00 (Extreme)
                  </div>
                </div>

                <div
                  style={{
                    background: "#0f172a",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "10px",
                    padding: "14px 16px",
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Territorial Pitch Control
                  </div>
                  <div style={{ fontSize: "22px", fontWeight: 800, color: "#38bdf8", marginTop: "4px" }}>
                    61% <span style={{ fontSize: "14px", color: "#64748b", fontWeight: 600 }}>vs</span> 39%
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                    Manchester City Rest-Defense Locking High Line
                  </div>
                </div>
              </div>

              {/* 2-Column Tactical Analysis Grid */}
              <div className="studio-two-col-grid">
                {/* Tactical Visualization: Positional Thirds & Squeezed Corridor */}
                <IonCard mode="ios" style={{ background: "#0f172a", margin: 0, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <IonCardHeader style={{ paddingBottom: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                      <IonCardSubtitle style={{ color: "#00e5ff", fontWeight: 700, letterSpacing: "0.5px", margin: 0 }}>
                        SPATIAL CORRIDORS & PENETRATION
                      </IonCardSubtitle>
                      <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>
                        Stage 2 & 5 Engine
                      </span>
                    </div>
                    <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc", marginTop: "4px" }}>
                      Positional Thirds & Channel Utilization
                    </IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    {/* Channel Metrics */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: "8px" }}>
                        <span style={{ color: "#94a3b8" }}>Central Corridor Width</span>
                        <span style={{ color: "#38bdf8", fontWeight: 700 }}>26.4m (Squeezed Block)</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: "8px" }}>
                        <span style={{ color: "#94a3b8" }}>Right Half-Space Overload</span>
                        <span style={{ color: "#00e5ff", fontWeight: 700 }}>82% (De Bruyne Channel)</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                        <span style={{ color: "#94a3b8" }}>Arsenal Defensive Depth</span>
                        <span style={{ color: "#f43f5e", fontWeight: 700 }}>18.2m (Deep Low-Block)</span>
                      </div>
                    </div>

                    {/* Thirds Breakdown */}
                    <div style={{ marginTop: "16px" }}>
                      <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 700, marginBottom: "8px", textTransform: "uppercase" }}>
                        Territorial Progression By Pitch Third
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#cbd5e1", marginBottom: "3px" }}>
                            <span>First Third (City Build-Up)</span>
                            <span style={{ color: "#38bdf8", fontWeight: 700 }}>28%</span>
                          </div>
                          <IonProgressBar value={0.28} color="tertiary" style={{ height: "6px", borderRadius: "3px" }} />
                        </div>

                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#cbd5e1", marginBottom: "3px" }}>
                            <span>Middle Third (Sustained Progression)</span>
                            <span style={{ color: "#a855f7", fontWeight: 700 }}>46%</span>
                          </div>
                          <IonProgressBar value={0.46} color="primary" style={{ height: "6px", borderRadius: "3px" }} />
                        </div>

                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#cbd5e1", marginBottom: "3px" }}>
                            <span>Final Third (Box Penetration Siege)</span>
                            <span style={{ color: "#00e5ff", fontWeight: 700 }}>26%</span>
                          </div>
                          <IonProgressBar value={0.26} color="secondary" style={{ height: "6px", borderRadius: "3px" }} />
                        </div>
                      </div>
                    </div>
                  </IonCardContent>
                </IonCard>

                {/* Evidence-Backed Tactical Insights + Engine Disclosure */}
                <IonCard mode="ios" style={{ background: "#0f172a", margin: 0, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <IonCardHeader style={{ paddingBottom: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                      <IonCardSubtitle style={{ color: "#a855f7", fontWeight: 700, letterSpacing: "0.5px", margin: 0 }}>
                        EVIDENCE-BACKED OBSERVATIONS
                      </IonCardSubtitle>
                      <IonBadge color="primary" style={{ fontSize: "10px", padding: "4px 8px", borderRadius: "6px" }}>
                        {rhythm.replace(/_/g, " ")}
                      </IonBadge>
                    </div>
                    <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc", marginTop: "4px" }}>
                      Match Insights & Phase Dynamics
                    </IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    {/* Ranked Observations */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "14px" }}>
                      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                        <span style={{ color: "#38bdf8", fontWeight: 800, fontSize: "12px", minWidth: "24px" }}>22'</span>
                        <div style={{ fontSize: "12px", color: "#cbd5e1", lineHeight: 1.45 }}>
                          <strong style={{ color: "#f8fafc" }}>Central Constriction:</strong> Arsenal compressing 4-4-2 rest block into a 26.4m corridor, forcing 82% of City attacks into wide channels.
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                        <span style={{ color: "#38bdf8", fontWeight: 800, fontSize: "12px", minWidth: "24px" }}>17'</span>
                        <div style={{ fontSize: "12px", color: "#cbd5e1", lineHeight: 1.45 }}>
                          <strong style={{ color: "#f8fafc" }}>Counter-Press Interception:</strong> Bernardo Silva registering second turnover within 25m of Arsenal goal, keeping PDR suppressed at 0.35.
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                        <span style={{ color: "#38bdf8", fontWeight: 800, fontSize: "12px", minWidth: "24px" }}>11'</span>
                        <div style={{ fontSize: "12px", color: "#cbd5e1", lineHeight: 1.45 }}>
                          <strong style={{ color: "#f8fafc" }}>Rest-Defense Setup:</strong> Rodri and Akanji forming a 3-2 rest defense pivot that neutralizes Arsenal transitional release triggers.
                        </div>
                      </div>
                    </div>

                    {/* Progressive Disclosure: Swarm Reasoning Core */}
                    <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "12px" }}>
                      <button
                        onClick={() => setShowAnalystReasoning(!showAnalystReasoning)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#c084fc",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: 0,
                          marginBottom: showAnalystReasoning ? "8px" : "0",
                        }}
                      >
                        <IonIcon icon={showAnalystReasoning ? chevronUpOutline : chevronDownOutline} />
                        {showAnalystReasoning ? "Hide Swarm Reasoning Core" : "Show Swarm Reasoning Core"}
                      </button>

                      {showAnalystReasoning && (
                        <div
                          style={{
                            background: "rgba(139, 92, 246, 0.08)",
                            padding: "10px 12px",
                            borderRadius: "6px",
                            color: "#e2e8f0",
                            fontSize: "12px",
                            lineHeight: 1.5,
                            marginTop: "6px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#a855f7", fontWeight: 700, fontSize: "11px", marginBottom: "4px" }}>
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#a855f7" }} />
                            Blackboard Agent Swarm Telemetry
                          </div>
                          {overviews.analyst}
                        </div>
                      )}
                    </div>
                  </IonCardContent>
                </IonCard>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 2: CASUAL EXPERIENCE (Plain Language & Flow)        */}
          {/* ======================================================== */}
          {persona === "casual" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Hero "What Is Happening Right Now?" Explainer Card */}
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "12px",
                  padding: "18px 20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#38bdf8" }} />
                  <span style={{ color: "#38bdf8", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Plain-English Match Summary
                  </span>
                </div>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#f8fafc", marginBottom: "8px" }}>
                  What is happening right now?
                </div>
                <div style={{ fontSize: "14px", color: "#cbd5e1", lineHeight: 1.6, maxWidth: "900px" }}>
                  Manchester City are controlling possession right outside Arsenal&apos;s penalty area, patiently looking for an opening. Arsenal have organized a dense double defensive wall to block all shooting lanes, waiting for the right moment to launch a counter-attack.
                </div>
                <div style={{ marginTop: "12px", fontSize: "12px", color: "#94a3b8" }}>
                  {overviews.casual}
                </div>
              </div>

              {/* 2-Column Casual Flow Grid */}
              <div className="studio-two-col-grid">
                {/* Visual Momentum Indicator */}
                <IonCard mode="ios" style={{ background: "#0f172a", margin: 0, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <IonCardHeader style={{ paddingBottom: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                      <IonCardSubtitle style={{ color: "#38bdf8", fontWeight: 700, letterSpacing: "0.5px", margin: 0 }}>
                        MATCH FLOW & MOMENTUM
                      </IonCardSubtitle>
                      <IonBadge color="success" style={{ fontSize: "10px", padding: "4px 8px", borderRadius: "6px" }}>
                        Attacking Wave
                      </IonBadge>
                    </div>
                    <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc", marginTop: "4px" }}>
                      Who Is Threatening?
                    </IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <div style={{ marginBottom: "16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#cbd5e1", marginBottom: "6px" }}>
                        <span style={{ color: "#00e5ff", fontWeight: 800 }}>Manchester City Siege ({Math.round(control)}%)</span>
                        <span style={{ color: "#f43f5e", fontWeight: 800 }}>Arsenal Break Threat ({Math.round(chaos)}%)</span>
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

                    <div style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.5 }}>
                      <strong style={{ color: "#e2e8f0" }}>Game Rhythm: </strong>
                      City have established 68% territory in Arsenal&apos;s half over the last 10 minutes. Arsenal&apos;s primary threat relies on quick direct release passes to Bukayo Saka.
                    </div>
                  </IonCardContent>
                </IonCard>

                {/* Key Moments & Player Milestones */}
                <IonCard mode="ios" style={{ background: "#0f172a", margin: 0, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <IonCardHeader style={{ paddingBottom: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <IonCardSubtitle style={{ color: "#f59e0b", fontWeight: 700, letterSpacing: "0.5px", margin: 0 }}>
                        KEY MATCH MILESTONES
                      </IonCardSubtitle>
                      <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>First Half</span>
                    </div>
                    <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc", marginTop: "4px" }}>
                      Pivotal Moments So Far
                    </IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                        <IonIcon icon={sparklesOutline} style={{ color: "#00e5ff", fontSize: "16px", marginTop: "2px", flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: 700, color: "#f8fafc" }}>
                            Haaland Positioning Milestone
                          </div>
                          <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                            4 touches inside the penalty box, targeting his 10th Premier League goal of the campaign.
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                        <IonIcon icon={flashOutline} style={{ color: "#f43f5e", fontSize: "16px", marginTop: "2px", flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: 700, color: "#f8fafc" }}>
                            Saka Breakaway Watch
                          </div>
                          <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                            Arsenal looking to spring Saka against Gvardiol on transition moments.
                          </div>
                        </div>
                      </div>
                    </div>
                  </IonCardContent>
                </IonCard>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 3: PLAYER CAM FOCUS (Synchronized Telemetry)        */}
          {/* ======================================================== */}
          {persona === "player_cam" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Quick-Pick Player Switcher Chips */}
              <div>
                <StudioChipScroller marginTopTrack={6} gap="8px">
                  {spotlightOptions.map((opt) => {
                    const isSelected = selectedPlayer.id === opt.id;
                    const isHome = opt.team === "home";
                    return (
                      <button
                        key={opt.id}
                        onClick={() => baseMemory.setSelectedPlayer(opt.id)}
                        style={{
                          background: isSelected ? (isHome ? "#00e5ff" : "#f43f5e") : "#0f172a",
                          color: isSelected ? "#020617" : "#cbd5e1",
                          border: `1px solid ${isSelected ? (isHome ? "#00e5ff" : "#f43f5e") : "rgba(255, 255, 255, 0.1)"}`,
                          padding: "6px 14px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        <span>#{opt.number}</span>
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </StudioChipScroller>
              </div>

              {/* Player Header & Exertion Grid */}
              <div
                style={{
                  background: "#0f172a",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "12px",
                  padding: "16px 20px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: selectedPlayer.team === "home" ? "#00e5ff" : "#f43f5e", textTransform: "uppercase" }}>
                      Player Spotlight • {selectedPlayer.team === "home" ? "Manchester City" : "Arsenal"}
                    </div>
                    <div style={{ fontSize: "20px", fontWeight: 800, color: "#f8fafc", marginTop: "2px" }}>
                      #{selectedPlayer.number} {selectedPlayer.name}
                      <span
                        style={{
                          marginLeft: "8px",
                          background: "#1e293b",
                          border: "1px solid #334155",
                          color: "#38bdf8",
                          fontSize: "11px",
                          fontWeight: 800,
                          padding: "2px 8px",
                          borderRadius: "4px",
                        }}
                      >
                        {selectedPlayer.pos}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <IonBadge color="primary" style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "6px" }}>
                      Rating {selectedPlayer.rating.toFixed(1)}
                    </IonBadge>
                    <IonBadge color={isHighSpeedBurst ? "danger" : "secondary"} style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "6px" }}>
                      {isHighSpeedBurst ? "Sprint Burst" : "Active Run"}
                    </IonBadge>
                  </div>
                </div>

                {/* 4 Core Metrics Flat Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                  <div style={{ background: "#020617", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>Live Sprint Velocity</div>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: isHighSpeedBurst ? "#f43f5e" : "#00e5ff", marginTop: "2px" }}>
                      {playerSpeed.toFixed(1)} km/h
                    </div>
                    <IonProgressBar
                      value={Math.min(1.0, playerSpeed / 34.0)}
                      color={isHighSpeedBurst ? "danger" : "secondary"}
                      style={{ height: "6px", borderRadius: "3px", marginTop: "6px" }}
                    />
                  </div>

                  <div style={{ background: "#020617", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>Distance Covered</div>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "#f8fafc", marginTop: "2px" }}>
                      {(3.2 + (matchClock / 1200) * 0.8).toFixed(2)} km
                    </div>
                    <div style={{ fontSize: "10.5px", color: "#38bdf8", marginTop: "4px" }}>
                      Work rate: High
                    </div>
                  </div>

                  <div style={{ background: "#020617", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>Sprint Bursts (&gt;22 km/h)</div>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "#a855f7", marginTop: "2px" }}>
                      14 Bursts
                    </div>
                    <div style={{ fontSize: "10.5px", color: "#94a3b8", marginTop: "4px" }}>
                      Peak: 32.4 km/h
                    </div>
                  </div>

                  <div style={{ background: "#020617", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>Pitch Coordinates</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#38bdf8", marginTop: "2px", fontVariantNumeric: "tabular-nums" }}>
                      {((selectedPlayer.x / 100) * 105).toFixed(1)}m × {((selectedPlayer.y / 100) * 68).toFixed(1)}m
                    </div>
                    <div style={{ fontSize: "10.5px", color: "#94a3b8", marginTop: "4px" }}>
                      Standard 105m × 68m Pitch
                    </div>
                  </div>
                </div>

                {/* Tactical Role & Duty */}
                <div style={{ marginTop: "12px", padding: "10px 12px", background: "rgba(255, 255, 255, 0.03)", borderRadius: "6px", fontSize: "12px", color: "#cbd5e1" }}>
                  <strong style={{ color: "#38bdf8" }}>Role in Phase: </strong>
                  {selectedPlayer.team === "home"
                    ? "Operating in the right half-space channel, creating passing lanes and drawing defenders out of the central block."
                    : "Maintaining compact rest structure on the flank, primed to sprint into open space on transition."}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 4: CLUB-CENTRIC EXPERIENCE (Club Selector)          */}
          {/* ======================================================== */}
          {persona === "club_centric" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Segmented Club Selector Switcher */}
              <div style={{ display: "flex", gap: "10px", width: "100%", maxWidth: "420px" }}>
                <button
                  onClick={() => setClubAllegiance("MCI")}
                  style={{
                    flex: 1,
                    background: clubAllegiance === "MCI" ? "#00e5ff" : "#0f172a",
                    color: clubAllegiance === "MCI" ? "#020617" : "#cbd5e1",
                    border: `1.5px solid ${clubAllegiance === "MCI" ? "#00e5ff" : "rgba(255, 255, 255, 0.1)"}`,
                    padding: "8px 16px",
                    borderRadius: "8px",
                    fontWeight: 800,
                    cursor: "pointer",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: clubAllegiance === "MCI" ? "#020617" : "#00e5ff" }} />
                  Manchester City
                </button>

                <button
                  onClick={() => setClubAllegiance("ARS")}
                  style={{
                    flex: 1,
                    background: clubAllegiance === "ARS" ? "#f43f5e" : "#0f172a",
                    color: clubAllegiance === "ARS" ? "#020617" : "#cbd5e1",
                    border: `1.5px solid ${clubAllegiance === "ARS" ? "#f43f5e" : "rgba(255, 255, 255, 0.1)"}`,
                    padding: "8px 16px",
                    borderRadius: "8px",
                    fontWeight: 800,
                    cursor: "pointer",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: clubAllegiance === "ARS" ? "#020617" : "#f43f5e" }} />
                  Arsenal
                </button>
              </div>

              {/* 2-Column Club Hub */}
              <div className="studio-two-col-grid">
                {/* Tactical Execution & Contributors */}
                <IonCard mode="ios" style={{ background: "#0f172a", margin: 0, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <IonCardHeader style={{ paddingBottom: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                      <IonCardSubtitle style={{ color: clubAllegiance === "MCI" ? "#00e5ff" : "#f43f5e", fontWeight: 700, margin: 0 }}>
                        {clubAllegiance === "MCI" ? "CITY ATTACKING BLUEPRINT" : "ARSENAL COUNTER-ATTACK BLUEPRINT"}
                      </IonCardSubtitle>
                      <IonBadge
                        color={clubAllegiance === "MCI" ? "secondary" : "danger"}
                        style={{ padding: "4px 8px", fontSize: "10.5px", borderRadius: "6px" }}
                      >
                        Grade: {clubAllegiance === "MCI" ? "A (8.4/10)" : "A- (8.1/10)"}
                      </IonBadge>
                    </div>
                    <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc", marginTop: "4px" }}>
                      Tactical Plan & Execution
                    </IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <div style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: 1.5, marginBottom: "14px" }}>
                      {clubAllegiance === "MCI"
                        ? "City are dominating with 61% possession, pressing high and utilizing Kevin De Bruyne's right half-space deliveries to break down Arsenal's compact shape."
                        : "Arsenal are executing a disciplined 4-4-2 rest block, denying central space and looking for quick direct balls to Bukayo Saka on the right."}
                    </div>

                    <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", marginBottom: "8px" }}>
                      Key Contributors ({clubAllegiance === "MCI" ? "Man City" : "Arsenal"})
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {clubAllegiance === "MCI" ? (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#020617", padding: "8px 12px", borderRadius: "6px" }}>
                            <span style={{ fontSize: "13px", color: "#f8fafc", fontWeight: 700 }}>Kevin De Bruyne</span>
                            <span style={{ fontSize: "12px", color: "#00e5ff", fontWeight: 700 }}>8.8 Rating</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#020617", padding: "8px 12px", borderRadius: "6px" }}>
                            <span style={{ fontSize: "13px", color: "#f8fafc", fontWeight: 700 }}>Erling Haaland</span>
                            <span style={{ fontSize: "12px", color: "#00e5ff", fontWeight: 700 }}>8.5 Rating</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#020617", padding: "8px 12px", borderRadius: "6px" }}>
                            <span style={{ fontSize: "13px", color: "#f8fafc", fontWeight: 700 }}>Rodri</span>
                            <span style={{ fontSize: "12px", color: "#00e5ff", fontWeight: 700 }}>8.3 Rating</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#020617", padding: "8px 12px", borderRadius: "6px" }}>
                            <span style={{ fontSize: "13px", color: "#f8fafc", fontWeight: 700 }}>Bukayo Saka</span>
                            <span style={{ fontSize: "12px", color: "#f43f5e", fontWeight: 700 }}>8.0 Rating</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#020617", padding: "8px 12px", borderRadius: "6px" }}>
                            <span style={{ fontSize: "13px", color: "#f8fafc", fontWeight: 700 }}>William Saliba</span>
                            <span style={{ fontSize: "12px", color: "#f43f5e", fontWeight: 700 }}>7.3 Rating</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#020617", padding: "8px 12px", borderRadius: "6px" }}>
                            <span style={{ fontSize: "13px", color: "#f8fafc", fontWeight: 700 }}>Declan Rice</span>
                            <span style={{ fontSize: "12px", color: "#f43f5e", fontWeight: 700 }}>7.6 Rating</span>
                          </div>
                        </>
                      )}
                    </div>
                  </IonCardContent>
                </IonCard>

                {/* Supporter Pulse & Tactical Window */}
                <IonCard mode="ios" style={{ background: "#0f172a", margin: 0, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <IonCardHeader style={{ paddingBottom: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <IonCardSubtitle style={{ color: "#38bdf8", fontWeight: 700, letterSpacing: "0.5px", margin: 0 }}>
                        SUPPORTER PULSE & OUTLOOK
                      </IonCardSubtitle>
                      <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600 }}>Fan Voice</span>
                    </div>
                    <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc", marginTop: "4px" }}>
                      Atmosphere & Outlook
                    </IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <div style={{ background: "#020617", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.06)", marginBottom: "14px" }}>
                      <div style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: 1.5 }}>
                        {clubAllegiance === "MCI" ? (
                          <>
                            <strong style={{ color: "#00e5ff" }}>City Fan Pulse: </strong>
                            &ldquo;The pressure is relentless! If we keep overloading the right side with De Bruyne, the breakthrough is bound to come before halftime.&rdquo;
                          </>
                        ) : (
                          <>
                            <strong style={{ color: "#f43f5e" }}>Gunners Fan Pulse: </strong>
                            &ldquo;Solid defensive shape so far. If Saliba stays tight on Haaland, Saka can catch them out on a quick counter-attack.&rdquo;
                          </>
                        )}
                      </div>
                    </div>

                    <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "12px", borderRadius: "8px" }}>
                      <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", marginBottom: "4px" }}>
                        Next Critical Tactical Window
                      </div>
                      <div style={{ fontSize: "12px", color: "#e2e8f0" }}>
                        {clubAllegiance === "MCI"
                          ? "Minutes 30-45: Expect sustained wide overloads to test Gabriel and Saliba's aerial clearances."
                          : "Minutes 30-45: Look for Rice to step into midfield interceptions and immediately release Saka down the flank."}
                      </div>
                    </div>
                  </IonCardContent>
                </IonCard>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* COLLAPSIBLE COMPACT LIVE COMMENTARY COMPONENT            */}
          {/* Matches media_1793028408496.png                          */}
          {/* ======================================================== */}
          <div
            style={{
              background: "#0f172a",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "12px",
              padding: "14px 18px",
            }}
          >
            {/* Header: Broadcast Icon, Title, Subtitle, Live Badge, Chevron */}
            <div
              onClick={() => setIsCommentaryExpanded(!isCommentaryExpanded)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "6px",
                    background: "rgba(16, 185, 129, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#10b981",
                  }}
                >
                  <IonIcon icon={radioOutline} style={{ fontSize: "16px" }} />
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#f8fafc" }}>
                    Live Commentary
                  </div>
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                    {activeLanguageName} • Live match feed
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    background: "rgba(16, 185, 129, 0.15)",
                    color: "#34d399",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                >
                  Live
                </span>
                <button
                  type="button"
                  aria-label={isCommentaryExpanded ? "Collapse Live Commentary" : "Expand Live Commentary"}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    padding: 0,
                    cursor: "pointer",
                  }}
                >
                  <IonIcon
                    icon={isCommentaryExpanded ? chevronDownOutline : chevronUpOutline}
                    style={{ fontSize: "18px" }}
                  />
                </button>
              </div>
            </div>

            {/* Collapsed Snippet */}
            {!isCommentaryExpanded && (
              <div style={{ marginTop: "10px" }}>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#e2e8f0",
                    lineHeight: 1.45,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  &ldquo;{activeStream.headline}&rdquo;
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "8px",
                    fontSize: "11px",
                    color: "#64748b",
                  }}
                >
                  <span>Latest commentary</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCommentaryExpanded(true);
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#cbd5e1",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "11px",
                      fontWeight: 600,
                      padding: 0,
                    }}
                  >
                    View full feed <IonIcon icon={arrowForwardOutline} />
                  </button>
                </div>
              </div>
            )}

            {/* Expanded Full Commentary View */}
            {isCommentaryExpanded && (
              <div style={{ marginTop: "14px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "14px" }}>
                {/* 5-Language Chips */}
                <div style={{ marginBottom: "12px" }}>
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
                          }}
                        >
                          {l.label}
                        </button>
                      );
                    })}
                  </StudioChipScroller>
                </div>

                {/* Teleprompter Box */}
                <div
                  dir={language === "ar" ? "rtl" : "ltr"}
                  style={{
                    background: "#020617",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    borderRadius: "8px",
                    padding: "12px 14px",
                    marginBottom: "12px",
                  }}
                >
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#f8fafc", marginBottom: "8px", lineHeight: 1.5 }}>
                    &ldquo;{activeStream.headline}&rdquo;
                  </div>
                  <div style={{ fontSize: "11.5px", color: "#94a3b8", fontStyle: "italic", marginBottom: "12px" }}>
                    {activeStream.tacticalNote}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", borderTop: "1px solid rgba(255, 255, 255, 0.06)", paddingTop: "8px" }}>
                    {activeStream.commentary.map((entry, idx) => (
                      <div
                        key={idx}
                        style={{
                          fontSize: "12px",
                          color: idx === 0 ? "#e2e8f0" : "#64748b",
                          lineHeight: 1.45,
                        }}
                      >
                        {entry}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Engine Sync Footer */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "8px",
                    fontSize: "11px",
                    color: "#94a3b8",
                  }}
                >
                  <span>Gamoventure AI Engine • Live Sync 42ms</span>
                  <button
                    onClick={() => setIsCommentaryExpanded(false)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#38bdf8",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontWeight: 600,
                      padding: 0,
                    }}
                  >
                    Collapse feed ↑
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default PersonaPage;
