import React, { useState } from "react";
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
  IonCardTitle,
  IonCardContent,
  IonBadge,
  IonProgressBar,
  IonIcon,
  IonButton,
} from "@ionic/react";
import {
  analyticsOutline,
  peopleOutline,
  videocamOutline,
  shieldCheckmarkOutline,
  globeOutline,
  pulseOutline,
  flashOutline,
  speedometerOutline,
  flameOutline,
  radioOutline,
  trendingUpOutline,
  timeOutline,
  gitNetworkOutline,
  shieldOutline,
  footballOutline,
  sparklesOutline,
} from "ionicons/icons";
import { useBaseMemory, baseMemory } from "../store/baseMemory";
import { PersonaMode, SupportedLanguage, PlayerProfile } from "../types/telemetry";
import { StudioChipScroller } from "../components/StudioChipScroller";

const personaTitles: Record<PersonaMode, string> = {
  analyst: "Analyst Experience",
  casual: "Casual Experience",
  player_cam: "Player Cam Focus",
  club_centric: "Club-Centric Experience",
};

const personaSubtitles: Record<PersonaMode, string> = {
  analyst: "Probabilistic pitch control models, spatial corridors, and tactical phase metrics.",
  casual: "Storyline-driven commentary, pivotal momentum shifts, and accessible tactical highlights.",
  player_cam: "Dedicated real-time tracking of individual off-ball runs, physical exertion, and sprint bursts.",
  club_centric: "Dynamic tactical execution framing and supporter commentary focused on chosen club.",
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
  const homeLineup = useBaseMemory((s) => s.homeLineup);
  const awayLineup = useBaseMemory((s) => s.awayLineup);

  // Local state for Club-Centric toggle (City vs Arsenal)
  const [clubAllegiance, setClubAllegiance] = useState<"MCI" | "ARS">("MCI");

  const formatTime = (secs: number) => {
    const clamped = Math.min(5400, Math.max(0, Math.floor(secs || 0)));
    const m = Math.floor(clamped / 60);
    const s = Math.floor(clamped % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Resolve currently spotlighted player profile from Single Core Memory
  const allPlayers = [...homeLineup, ...awayLineup];
  const selectedPlayer: PlayerProfile =
    allPlayers.find((p) => p.id === selectedPlayerId) || homeLineup[6];

  // Quick player spotlight list
  const spotlightOptions = [
    { id: "home_10", label: "E. Haaland", number: 9, team: "home" },
    { id: "home_7", label: "K. De Bruyne", number: 17, team: "home" },
    { id: "home_9", label: "P. Foden", number: 47, team: "home" },
    { id: "away_8", label: "B. Saka", number: 7, team: "away" },
    { id: "away_11", label: "K. Havertz", number: 29, team: "away" },
    { id: "away_9", label: "M. Ødegaard", number: 8, team: "away" },
  ];

  // Derive dynamic metrics from live telemetry
  const playerSpeed = selectedPlayer.speed_kmh ?? 23.4;
  const isHighSpeedBurst = playerSpeed > 22.0;
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
        {/* Scorebug Synchronized Header Bar */}
        <div className="studio-scoreboard-header" style={{ marginBottom: "16px" }}>
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
              10Hz / 5Hz Live
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
                  <IonIcon icon={p.icon} style={{ fontSize: "14px", color: isSelected ? "#c084fc" : "#64748b" }} />
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                  <div style={{ color: "#00e5ff", fontWeight: 700, letterSpacing: "0.5px", margin: 0, fontSize: "11px", textTransform: "uppercase" }}>
                    PROBABILISTIC METRICS & SPATIAL CORRIDORS
                  </div>
                  <IonBadge color="tertiary" style={{ fontSize: "10px", padding: "4px 8px", borderRadius: "12px", whiteSpace: "nowrap", flexShrink: 0 }}>
                    Spatial Engine
                  </IonBadge>
                </div>
                <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc" }}>
                  Defensive Compression & Expected Value
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
                  <div style={{ background: "#1e293b", padding: "10px", borderRadius: "8px", border: "1px solid #334155" }}>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>Cumulative Expected Goals</div>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "#00e5ff", marginTop: "2px" }}>
                      2.45 <span style={{ fontSize: "12px", color: "#64748b" }}>vs</span>{" "}
                      <span style={{ color: "#f43f5e" }}>1.12</span>
                    </div>
                    <div style={{ fontSize: "10px", color: "#38bdf8", marginTop: "4px" }}>
                      MCI xG delta: +1.33
                    </div>
                  </div>

                  <div style={{ background: "#1e293b", padding: "10px", borderRadius: "8px", border: "1px solid #334155" }}>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>Pass Difficulty Rating (PDR)</div>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: "#f59e0b", marginTop: "2px" }}>
                      {(pdr * 100).toFixed(1)}%
                    </div>
                    <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "4px" }}>
                      High Friction
                    </div>
                  </div>
                </div>

                {/* Spatial Corridors & Block Density */}
                <div style={{ background: "#020617", padding: "12px", borderRadius: "8px", border: "1px solid #1e293b", marginBottom: "12px" }}>
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
                  <IonProgressBar value={0.61} style={{ ["--progress-background" as string]: "#00e5ff", ["--buffer-background" as string]: "#f43f5e", height: "8px", borderRadius: "4px" }} />
                </div>
              </IonCardContent>
            </IonCard>

            {/* Tactical Phase & Deep Analyst Reasoning */}
            <IonCard mode="ios" style={{ background: "#0f172a", margin: 0, border: "1px solid #1e293b" }}>
              <IonCardHeader style={{ paddingBottom: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                  <div style={{ color: "#a855f7", fontWeight: 700, letterSpacing: "0.5px", margin: 0, fontSize: "11px", textTransform: "uppercase" }}>
                    TACTICAL PHASE & STRUCTURAL REASONING
                  </div>
                  <IonBadge color="primary" style={{ fontSize: "10px", padding: "4px 8px", borderRadius: "12px", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {rhythm.replace(/_/g, " ")}
                  </IonBadge>
                </div>
                <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc" }}>
                  Swarm Intelligence Reasoning Core
                </IonCardTitle>
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
                <div style={{ marginBottom: "14px" }}>
                  <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600, marginBottom: "8px" }}>
                    TERRITORIAL PROGRESSION DISTRIBUTION
                  </div>

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

                <div style={{ background: "#020617", padding: "10px", borderRadius: "8px", border: "1px solid #1e293b", fontSize: "11px", color: "#94a3b8" }}>
                  <span style={{ color: "#38bdf8", fontWeight: 700 }}>Rest-Defense Setup:</span> City maintaining a 3-2 rest defense structure with Rodri and Akanji securing the counter-press pivot.
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                  <div style={{ color: "#38bdf8", fontWeight: 700, letterSpacing: "0.5px", margin: 0, fontSize: "11px", textTransform: "uppercase" }}>
                    MATCH STORYLINE & MOMENTUM
                  </div>
                  <IonBadge color="success" style={{ fontSize: "10px", padding: "4px 8px", borderRadius: "12px", whiteSpace: "nowrap", flexShrink: 0 }}>
                    [Live Momentum]
                  </IonBadge>
                </div>
                <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc" }}>
                  The Flow of the Match
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                {/* Dynamic Momentum Pendulum */}
                <div style={{ background: "#020617", padding: "14px", borderRadius: "8px", border: "1px solid #1e293b", marginBottom: "14px" }}>
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
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#64748b", marginTop: "4px" }}>
                    <span>City Attack Share: {Math.round(control)}%</span>
                    <span>Arsenal Transition: {Math.round(chaos)}%</span>
                  </div>
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
                  <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600, marginBottom: "8px" }}>
                    KEY IN-MATCH DUELS
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ background: "#1e293b", padding: "8px 12px", borderRadius: "8px", border: "1px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                      <div style={{ minWidth: 0, flex: "1 1 140px" }}>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#f8fafc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          E. Haaland vs W. Saliba
                        </div>
                        <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                          Physical aerial & box positioning battle
                        </div>
                      </div>
                      <IonBadge color="primary" style={{ flexShrink: 0 }}>Haaland Lead</IonBadge>
                    </div>

                    <div style={{ background: "#1e293b", padding: "8px 12px", borderRadius: "8px", border: "1px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                      <div style={{ minWidth: 0, flex: "1 1 140px" }}>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#f8fafc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          B. Saka vs J. Gvardiol
                        </div>
                        <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                          1v1 flank sprint duel down the right
                        </div>
                      </div>
                      <IonBadge color="danger" style={{ flexShrink: 0 }}>Saka Ahead</IonBadge>
                    </div>

                    <div style={{ background: "#1e293b", padding: "8px 12px", borderRadius: "8px", border: "1px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ color: "#f59e0b", fontWeight: 700, letterSpacing: "0.5px", fontSize: "11px", textTransform: "uppercase" }}>
                    Casual Fan Overview
                  </div>
                  <IonBadge color="warning" style={{ fontSize: "10px" }}>
                    [Plain Language]
                  </IonBadge>
                </div>
                <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc" }}>
                  What Is Happening Right Now?
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                {/* Plain-English Breakdown */}
                <div style={{ background: "#020617", padding: "12px", borderRadius: "8px", border: "1px solid #1e293b", marginBottom: "14px" }}>
                  <div style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: 1.6 }}>
                    Manchester City are holding onto the ball right outside Arsenal&apos;s 18-yard box, passing back and forth to force a mistake. Arsenal have formed two compact defensive walls to block every shooting lane and are waiting to sprint forward on a counter-attack the second they win the ball.
                  </div>
                </div>

                {/* Player Milestones Alert */}
                <div style={{ marginBottom: "14px" }}>
                  <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600, marginBottom: "8px" }}>
                    IN-MATCH PLAYER MILESTONES
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ background: "#1e293b", padding: "10px 12px", borderRadius: "8px", border: "1px solid #334155" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "#00e5ff" }}>
                        <IonIcon icon={sparklesOutline} />
                        Erling Haaland Goal Milestone
                      </div>
                      <div style={{ fontSize: "11px", color: "#cbd5e1", marginTop: "2px" }}>
                        10th Premier League goal of the campaign, netting in 4 consecutive home fixtures.
                      </div>
                    </div>

                    <div style={{ background: "#1e293b", padding: "10px 12px", borderRadius: "8px", border: "1px solid #334155" }}>
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

                <div style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid #f59e0b", padding: "10px", borderRadius: "8px", fontSize: "11px", color: "#fbbf24" }}>
                  <strong style={{ color: "#fef08a" }}>Fan Tip:</strong> Watch for Kevin De Bruyne's low curling crosses whenever he drifts towards the right corner of the penalty box!
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
                  const isSelected = selectedPlayer.id === opt.id;
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
                      <span>#{opt.number}</span>
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                    <div style={{ color: selectedPlayer.team === "home" ? "#00e5ff" : "#f43f5e", fontWeight: 700, margin: 0, fontSize: "11px", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                      PLAYER CAM SPOTLIGHT • {selectedPlayer.team === "home" ? "MAN CITY" : "ARSENAL"}
                    </div>
                    <IonBadge color="primary" style={{ fontSize: "10px", flexShrink: 0 }}>
                      Rating {selectedPlayer.rating.toFixed(1)}
                    </IonBadge>
                  </div>
                  <IonCardTitle style={{ fontSize: "18px", color: "#f8fafc", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
                    <span>#{selectedPlayer.number} {selectedPlayer.name}</span>
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
                        flexShrink: 0,
                      }}
                    >
                      {selectedPlayer.pos}
                    </span>
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  {/* Live Speed Meter at 5Hz */}
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
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "2px 6px", fontSize: "10px", color: "#64748b", marginTop: "4px" }}>
                      <span>Jog: 12 km/h</span>
                      <span>High-Speed: 22 km/h</span>
                      <span>Sprint Max: 34 km/h</span>
                    </div>
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "4px", background: "#020617", padding: "8px 12px", borderRadius: "6px", fontSize: "11px" }}>
                    <span style={{ color: "#94a3b8" }}>Metric Coordinates (105m x 68m):</span>
                    <span style={{ color: "#00e5ff", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                      X: {((selectedPlayer.x / 100) * 105).toFixed(1)}m, Y: {((selectedPlayer.y / 100) * 68).toFixed(1)}m
                    </span>
                  </div>
                </IonCardContent>
              </IonCard>

              {/* Player Cam Tactical Narrative & Decisive Actions */}
              <IonCard mode="ios" style={{ background: "#0f172a", margin: 0, border: "1px solid #1e293b" }}>
                <IonCardHeader style={{ paddingBottom: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                    <div style={{ color: "#a855f7", fontWeight: 700, margin: 0, fontSize: "11px", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                      INDIVIDUAL TACTICAL PROFILE
                    </div>
                    <IonBadge color={isHighSpeedBurst ? "danger" : "success"} style={{ fontSize: "10px", padding: "4px 8px", borderRadius: "12px", whiteSpace: "nowrap", flexShrink: 0 }}>
                      {isHighSpeedBurst
                        ? "[High-Speed Sprint Burst]"
                        : selectedPlayer.is_ball_carrier
                        ? "[Active Ball Carrier]"
                        : "[Off-Ball Tactical Run]"}
                    </IonBadge>
                  </div>
                  <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc" }}>
                    Continuous Spotlight Feed
                  </IonCardTitle>
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
                      DECISIVE ATTRIBUTES (PERFORMANCE ENGINE)
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <div style={{ background: "#1e293b", padding: "8px 10px", borderRadius: "6px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                          <span style={{ color: "#94a3b8" }}>Passing Index</span>
                          <span style={{ color: "#38bdf8", fontWeight: 700 }}>{selectedPlayer.attributes.passing}/100</span>
                        </div>
                      </div>

                      <div style={{ background: "#1e293b", padding: "8px 10px", borderRadius: "6px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                          <span style={{ color: "#94a3b8" }}>Shooting Power</span>
                          <span style={{ color: "#f43f5e", fontWeight: 700 }}>{selectedPlayer.attributes.shoot}/100</span>
                        </div>
                      </div>

                      <div style={{ background: "#1e293b", padding: "8px 10px", borderRadius: "6px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                          <span style={{ color: "#94a3b8" }}>Dribble Agility</span>
                          <span style={{ color: "#a855f7", fontWeight: 700 }}>{selectedPlayer.attributes.dribbling}/100</span>
                        </div>
                      </div>

                      <div style={{ background: "#1e293b", padding: "8px 10px", borderRadius: "6px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                          <span style={{ color: "#94a3b8" }}>Defensive Press</span>
                          <span style={{ color: "#10b981", fontWeight: 700 }}>{selectedPlayer.attributes.defending}/100</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: "#020617", padding: "10px", borderRadius: "8px", border: "1px solid #1e293b", fontSize: "11px", color: "#94a3b8" }}>
                    <span style={{ color: "#38bdf8", fontWeight: 700 }}>Tactical Duty:</span> Maintaining width and creating decoy channels to disorganize Arsenal&apos;s defensive double-pivot.
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                    <div style={{ color: clubAllegiance === "MCI" ? "#00e5ff" : "#f43f5e", fontWeight: 700, margin: 0, fontSize: "11px", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                      {clubAllegiance === "MCI" ? "MANCHESTER CITY EXECUTION" : "ARSENAL TACTICAL DISCIPLINE"}
                    </div>
                    <IonBadge
                      color={clubAllegiance === "MCI" ? "secondary" : "danger"}
                      style={{ padding: "4px 10px", fontSize: "11px", fontWeight: 700, borderRadius: "12px", whiteSpace: "nowrap", flexShrink: 0 }}
                    >
                      Execution Grade: {clubAllegiance === "MCI" ? "A (8.4/10)" : "A- (8.1/10)"}
                    </IonBadge>
                  </div>
                  <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc" }}>
                    {clubAllegiance === "MCI" ? "Attacking Blueprint & Control Hub" : "Low-Block & Breakaway Counter Hub"}
                  </IonCardTitle>
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
                    {clubAllegiance === "MCI"
                      ? "City asserting complete dominance with 68% territorial control in the final third. Constant overloading of the half-spaces via De Bruyne and Foden to isolate Haaland against Saliba."
                      : "Arsenal exceptionally structured in a resilient 4-2-3-1 low block. Rapid transition triggers primed to exploit City's advanced rest-defense via Saka's blistering counter sprints."}
                  </div>

                  {/* Key Contributors for Club */}
                  <div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600, marginBottom: "8px" }}>
                      PRIMARY CLUB CONTRIBUTORS
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {clubAllegiance === "MCI" ? (
                        <>
                          <div style={{ background: "#1e293b", padding: "8px 12px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "4px 8px" }}>
                            <div style={{ minWidth: 0, flex: "1 1 150px" }}>
                              <div style={{ fontSize: "13px", fontWeight: 700, color: "#f8fafc" }}>Kevin De Bruyne</div>
                              <div style={{ fontSize: "11px", color: "#94a3b8" }}>Playmaking Mastermind • 96 Pass Rating</div>
                            </div>
                            <span style={{ color: "#00e5ff", fontWeight: 700, flexShrink: 0 }}>8.8 Rating</span>
                          </div>
                          <div style={{ background: "#1e293b", padding: "8px 12px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "4px 8px" }}>
                            <div style={{ minWidth: 0, flex: "1 1 150px" }}>
                              <div style={{ fontSize: "13px", fontWeight: 700, color: "#f8fafc" }}>Erling Haaland</div>
                              <div style={{ fontSize: "11px", color: "#94a3b8" }}>Finishing Focal Point • 1 Goal, 94 Shoot</div>
                            </div>
                            <span style={{ color: "#00e5ff", fontWeight: 700, flexShrink: 0 }}>8.5 Rating</span>
                          </div>
                          <div style={{ background: "#1e293b", padding: "8px 12px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "4px 8px" }}>
                            <div style={{ minWidth: 0, flex: "1 1 150px" }}>
                              <div style={{ fontSize: "13px", fontWeight: 700, color: "#f8fafc" }}>Rodri</div>
                              <div style={{ fontSize: "11px", color: "#94a3b8" }}>Rest-Defense Anchor • 93 Pass, 88 Defend</div>
                            </div>
                            <span style={{ color: "#00e5ff", fontWeight: 700, flexShrink: 0 }}>8.3 Rating</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ background: "#1e293b", padding: "8px 12px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "4px 8px" }}>
                            <div style={{ minWidth: 0, flex: "1 1 150px" }}>
                              <div style={{ fontSize: "13px", fontWeight: 700, color: "#f8fafc" }}>Bukayo Saka</div>
                              <div style={{ fontSize: "11px", color: "#94a3b8" }}>Breakaway Weapon • 1 Goal, 4-Touch Counter</div>
                            </div>
                            <span style={{ color: "#f43f5e", fontWeight: 700, flexShrink: 0 }}>8.0 Rating</span>
                          </div>
                          <div style={{ background: "#1e293b", padding: "8px 12px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "4px 8px" }}>
                            <div style={{ minWidth: 0, flex: "1 1 150px" }}>
                              <div style={{ fontSize: "13px", fontWeight: 700, color: "#f8fafc" }}>William Saliba</div>
                              <div style={{ fontSize: "11px", color: "#94a3b8" }}>Defensive Wall • 88 Defend, 4 Tackles Won</div>
                            </div>
                            <span style={{ color: "#f43f5e", fontWeight: 700, flexShrink: 0 }}>7.3 Rating</span>
                          </div>
                          <div style={{ background: "#1e293b", padding: "8px 12px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "4px 8px" }}>
                            <div style={{ minWidth: 0, flex: "1 1 150px" }}>
                              <div style={{ fontSize: "13px", fontWeight: 700, color: "#f8fafc" }}>Declan Rice</div>
                              <div style={{ fontSize: "11px", color: "#94a3b8" }}>Transition Disruptor • 87 Defend, 6 Interceptions</div>
                            </div>
                            <span style={{ color: "#f43f5e", fontWeight: 700, flexShrink: 0 }}>7.6 Rating</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </IonCardContent>
              </IonCard>

              {/* Supporter Pulse & Match Outlook */}
              <IonCard mode="ios" style={{ background: "#0f172a", margin: 0, border: "1px solid #1e293b" }}>
                <IonCardHeader style={{ paddingBottom: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                    <div style={{ color: "#38bdf8", fontWeight: 700, margin: 0, fontSize: "11px", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                      SUPPORTER PULSE & TACTICAL OUTLOOK
                    </div>
                    <IonBadge
                      color="primary"
                      style={{ padding: "4px 10px", fontSize: "11px", fontWeight: 700, borderRadius: "12px", whiteSpace: "nowrap", flexShrink: 0 }}
                    >
                      Etihad Atmosphere
                    </IonBadge>
                  </div>
                  <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc" }}>
                    Fan Commentary Feed
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <div style={{ background: "#020617", padding: "12px", borderRadius: "8px", border: "1px solid #1e293b", marginBottom: "14px" }}>
                    <div style={{ fontSize: "13px", color: "#e2e8f0", lineHeight: 1.5 }}>
                      {clubAllegiance === "MCI" ? (
                        <>
                          <strong style={{ color: "#00e5ff" }}>City Fan Pulse:</strong> "The pressure is immense! Arsenal cannot survive this siege for 90 minutes if De Bruyne keeps sliding those balls into the corridor. Haaland is hungry for the brace!"
                        </>
                      ) : (
                        <>
                          <strong style={{ color: "#f43f5e" }}>Gunners Fan Pulse:</strong> "Saka's goal was sheer perfection on the break! Hold the line, stay discipline in the double pivot, and the second counter will win this game for us!"
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ background: "#1e293b", padding: "12px", borderRadius: "8px", border: "1px solid #334155" }}>
                    <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 600, marginBottom: "4px" }}>
                      NEXT CRITICAL TACTICAL WINDOW
                    </div>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
              <div>
                <div style={{ color: "#00e5ff", fontWeight: 700, letterSpacing: "0.5px", fontSize: "11px", textTransform: "uppercase" }}>
                  MULTILINGUAL BROADCAST STREAM
                </div>
                <IonCardTitle style={{ fontSize: "16px", color: "#f8fafc", marginTop: "2px" }}>
                  Synchronous Localized Commentary Stream
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
                [Live Broadcast Teleprompter • {language.toUpperCase()}]
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
                "{activeStream.headline}"
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

            {/* Broadcast Stream Studio Status Bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "8px",
                fontSize: "11px",
                background: "#020617",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #1e293b",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px 8px", minWidth: 0 }}>
                <IonIcon icon={globeOutline} style={{ color: "#38bdf8", fontSize: "14px", flexShrink: 0 }} />
                <span style={{ color: "#e2e8f0", fontWeight: 700 }}>
                  Gamoventure Premier League Studio Feed
                </span>
                <span style={{ color: "#64748b" }}>•</span>
                <span style={{ color: "#94a3b8" }}>
                  Synchronous 5-Language Stream
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px 8px", flexShrink: 0 }}>
                <span
                  style={{
                    background: "rgba(0, 229, 255, 0.1)",
                    color: "#00e5ff",
                    border: "1px solid rgba(0, 229, 255, 0.25)",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "10px",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  Gamoventure AI Engine
                </span>
                <span
                  style={{
                    background: "rgba(16, 185, 129, 0.1)",
                    color: "#34d399",
                    border: "1px solid rgba(16, 185, 129, 0.25)",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "10px",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  Live Sync 42ms
                </span>
              </div>
            </div>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default PersonaPage;
