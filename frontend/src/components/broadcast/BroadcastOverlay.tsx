import React, { useState, useEffect } from "react";
import { IonIcon } from "@ionic/react";
import {
  flashOutline,
  footballOutline,
  speedometerOutline,
  chatbubbleEllipsesOutline,
  codeSlashOutline,
  closeCircleOutline,
  shieldCheckmarkOutline,
  sparklesOutline,
  warningOutline,
} from "ionicons/icons";
import { useBaseMemory, SupportedLanguage } from "../../store/baseMemory";
import { PlayerKinematics, MatchEvent } from "../../types/telemetry";

export type BroadcastOverlayMode = "auto" | "dominance" | "goal" | "tactical" | "sprint" | "cue" | "defense" | "keeper" | "attack" | "disciplinary";

const OVERLAY_LOCALIZATIONS: Record<SupportedLanguage, {
  pitchControl: string;
  territorialTilt: string;
  gameRhythm: string;
  passDifficulty: string;
  cueTitle: string;
  cueDesc: string;
  cueSubplot: string;
  cueDetail: string;
  inflectionDesc: string;
}> = {
  en: {
    pitchControl: "PITCH CONTROL SHARE",
    territorialTilt: "TERRITORIAL TILT",
    gameRhythm: "Game Rhythm",
    passDifficulty: "Pass Difficulty Rating",
    cueTitle: "ZONE 14 CENTRAL OVERLOAD",
    cueDesc: "City overload on right half-space forcing Arsenal into 5-4-1 low-block defensive shape.",
    cueSubplot: "SUBPLOT ACTIVE",
    cueDetail: "DE BRUYNE ROAMING",
    inflectionDesc: "Low-Block Turnover • 4 Touches Box-to-Box in 5.2s • Line Gap: 18.2m",
  },
  es: {
    pitchControl: "CONTROL DE CAMPO",
    territorialTilt: "INCLINACIÓN TERRITORIAL",
    gameRhythm: "Ritmo de Juego",
    passDifficulty: "Dificultad de Pase",
    cueTitle: "SOBRECARGA CENTRAL ZONA 14",
    cueDesc: "Sobrecarga de Man City en el medio espacio derecho forzando al Arsenal a bloque defensivo 5-4-1.",
    cueSubplot: "SUBTRAMA ACTIVA",
    cueDetail: "DE BRUYNE LIBRE",
    inflectionDesc: "Recuperación en bloque bajo • 4 toques área a área en 5.2s • Espacio entre líneas: 18.2m",
  },
  fr: {
    pitchControl: "CONTRÔLE DU TERRAIN",
    territorialTilt: "BASCULE TERRITORIALE",
    gameRhythm: "Rythme de Jeu",
    passDifficulty: "Difficulté de Passe",
    cueTitle: "SURCHARGE CENTRALE ZONE 14",
    cueDesc: "Surcharge de Man City dans le demi-espace droit forçant Arsenal en bloc défensif 5-4-1.",
    cueSubplot: "INTRIGUE ACTIVE",
    cueDetail: "DE BRUYNE EN LIBERTÉ",
    inflectionDesc: "Récupération en bloc bas • 4 touches de surface à surface en 5.2s • Intervalle: 18.2m",
  },
  ja: {
    pitchControl: "ピッチ支配率",
    territorialTilt: "テリトリアル・ティルト",
    gameRhythm: "ゲームリズム",
    passDifficulty: "パス難易度評価",
    cueTitle: "ゾーン14 中央密集",
    cueDesc: "シティが右ハーフスペースで数的優位を作り、アーセナルを5-4-1ローブロックに圧縮。",
    cueSubplot: "サブプロット作動中",
    cueDetail: "デ・ブライネ自由自在",
    inflectionDesc: "ローブロックでのボール奪取 • 5.2秒でボックス・トゥ・ボックス4タッチ • ライン間隔: 18.2m",
  },
  ar: {
    pitchControl: "الاستحواذ على الملعب",
    territorialTilt: "الميل الإقليمي",
    gameRhythm: "إيقاع المباراة",
    passDifficulty: "تصنيف صعوبة التمرير",
    cueTitle: "زيادة عددية مركزية في المنطقة 14",
    cueDesc: "زيادة عددية للسيتي في نصف المساحة الأيمن تجبر آرسنال على التراجع لكتلة دفاعية 5-4-1.",
    cueSubplot: "حبكة تكتيكية نشطة",
    cueDetail: "دي بروين يتحرك بحرية",
    inflectionDesc: "استرجاع الكرة في الدفاع المنخفض • 4 لمسات من منطقة لمنطقة في 5.2 ثانية • الفجوة: 18.2م",
  },
};

interface BroadcastOverlayProps {
  isVisible: boolean;
  activeMode: BroadcastOverlayMode;
  onModeChange?: (mode: BroadcastOverlayMode) => void;
  onToggleVisible: () => void;
}

export const BroadcastOverlay: React.FC<BroadcastOverlayProps> = ({
  isVisible,
  activeMode,
  onToggleVisible,
}) => {
  const currentFrame = useBaseMemory((s) => s.currentFrame);
  const matchClock = useBaseMemory((s) => s.matchClock);
  const score = useBaseMemory((s) => s.score);
  const selectedLanguage = useBaseMemory((s) => s.selectedLanguage);

  const loc = OVERLAY_LOCALIZATIONS[selectedLanguage] || OVERLAY_LOCALIZATIONS.en;

  const [showJsonPayload, setShowJsonPayload] = useState(false);
  const [resolvedMode, setResolvedMode] = useState<
    "dominance" | "goal" | "tactical" | "sprint" | "cue" | "defense" | "keeper" | "attack" | "disciplinary"
  >("dominance");
  const [activeEvent, setActiveEvent] = useState<MatchEvent | null>(null);

  // Find fastest active player or ball carrier
  const allPlayers = currentFrame?.players ?? [];
  const maxSpeedPlayer = allPlayers.reduce<PlayerKinematics | undefined>((prev, curr) =>
    (curr.speed_kmh || 0) > (prev?.speed_kmh || 0) ? curr : prev
  , allPlayers[0]);

  const controlPct = currentFrame?.control_chaos?.control ?? 61;
  const pitchControlStat = {
    home: `${Math.round(controlPct)}%`,
    away: `${Math.round(100 - controlPct)}%`,
    homePct: Math.round(controlPct),
  };
  const homeColor = "#00e5ff";
  const awayColor = "#f43f5e";
  const homeCode = score.homeTeam || "MCI";
  const awayCode = score.awayTeam || "ARS";

  // Determine effective display mode (Auto-Live dynamically cycles or responds to real-time events)
  useEffect(() => {
    if (activeMode !== "auto") {
      setResolvedMode(activeMode);
      return;
    }

    // Inspect recent live events from currentFrame for reactive lower-third triggers
    const recentEvent = currentFrame?.events && currentFrame.events.length > 0
      ? currentFrame.events[currentFrame.events.length - 1]
      : null;

    if (recentEvent) {
      setActiveEvent(recentEvent);
      if (recentEvent.type === "goal") {
        setResolvedMode("goal");
        return;
      }
      if (["clearance", "block", "interception", "tackle", "recovery"].includes(recentEvent.type)) {
        setResolvedMode("defense");
        return;
      }
      if (["save", "punch", "claim", "goal_kick"].includes(recentEvent.type)) {
        setResolvedMode("keeper");
        return;
      }
      if (["cross", "key_pass", "progressive_carry", "aerial_duel"].includes(recentEvent.type)) {
        setResolvedMode("attack");
        return;
      }
      if (["yellow_card", "red_card", "foul", "corner_kick", "free_kick"].includes(recentEvent.type)) {
        setResolvedMode("disciplinary");
        return;
      }
    }

    // Auto-Live logic based on live telemetry & clock
    if (currentFrame?.active_tactical_inflection) {
      setResolvedMode("tactical");
    } else if (maxSpeedPlayer && (maxSpeedPlayer.speed_kmh || 0) > 23.0) {
      setResolvedMode("sprint");
    } else if (matchClock >= 2500 && matchClock <= 2580) {
      // Haaland Goal window (42')
      setResolvedMode("goal");
    } else if (matchClock >= 5000 && matchClock <= 5080) {
      // Saka Equalizer window (84')
      setResolvedMode("tactical");
    } else {
      // Default to live dominance & momentum
      setResolvedMode("dominance");
    }
  }, [activeMode, currentFrame, matchClock, maxSpeedPlayer]);

  if (!isVisible) {
    return null;
  }

  // Construct machine-readable time-indexed JSON payload (Stage 4 requirement)
  const jsonPayload = {
    producer: "Gamoventure Premier League Studio Graphics",
    timestamp_iso: new Date().toISOString(),
    match_clock_sec: matchClock,
    overlay_mode: resolvedMode,
    is_live_stream: true,
    languages: {
      active: selectedLanguage,
      available: ["en", "es", "fr", "ja", "ar"],
    },
    data: {
      match: `${score.homeTeam} vs ${score.awayTeam}`,
      score: `${score.homeScore} - ${score.awayScore}`,
      pitch_control: {
        home_pct: pitchControlStat.homePct,
        away_pct: 100 - pitchControlStat.homePct,
      },
      control_vs_chaos: {
        control: currentFrame?.control_chaos?.control ?? 68,
        chaos: currentFrame?.control_chaos?.chaos ?? 32,
      },
      game_rhythm: currentFrame?.game_rhythm ?? "High Tempo Transition",
      active_sprint: {
        player: maxSpeedPlayer?.name ?? "B. Saka",
        team: maxSpeedPlayer?.team === "home" ? score.homeTeam : score.awayTeam,
        speed_kmh: Number(maxSpeedPlayer?.speed_kmh?.toFixed(1) ?? "33.8"),
      },
      latest_event: activeEvent,
      tactical_cue: loc.cueDesc,
    },
  };

  return (
    <>
      {/* Lower-Third Broadcast Graphic Bar */}
      <div
        style={{
          position: "absolute",
          left: "10px",
          right: "10px",
          bottom: "10px",
          borderRadius: "8px",
          backgroundColor: "rgba(10, 15, 30, 0.94)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.7), 0 0 12px rgba(124, 58, 237, 0.3)",
          backdropFilter: "blur(12px)",
          padding: "8px 12px",
          zIndex: 8,
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          animation: "slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Header Bar with Gamoventure Attribution & Mode Tag */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span
              style={{
                backgroundColor: "#7c3aed",
                color: "#ffffff",
                fontSize: "8px",
                fontWeight: 900,
                letterSpacing: "0.5px",
                padding: "2px 6px",
                borderRadius: "4px",
                textTransform: "uppercase",
              }}
            >
              Gamoventure Studio Graphics
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span
                style={{
                  width: "5px",
                  height: "5px",
                  borderRadius: "50%",
                  backgroundColor: "#10b981",
                  animation: "pulse 1.5s infinite",
                }}
              />
              <span style={{ fontSize: "8px", color: "#94a3b8", fontFamily: "monospace", fontWeight: 700 }}>
                BROADCAST OVERLAY • {resolvedMode.toUpperCase()}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              onClick={() => setShowJsonPayload(true)}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#cbd5e1",
                fontSize: "8px",
                fontWeight: 800,
                padding: "2px 6px",
                borderRadius: "4px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "3px",
              }}
              title="Inspect Time-Indexed JSON Payload"
            >
              <IonIcon icon={codeSlashOutline} style={{ fontSize: "10px" }} />
              <span>JSON</span>
            </button>
            <button
              onClick={onToggleVisible}
              style={{
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                padding: "0 2px",
                display: "flex",
                alignItems: "center",
              }}
              title="Dismiss Broadcast Overlay"
            >
              <IonIcon icon={closeCircleOutline} style={{ fontSize: "13px" }} />
            </button>
          </div>
        </div>

        {/* Dynamic Graphic Content per Resolved Mode */}
        {resolvedMode === "dominance" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "11px", fontWeight: 900, color: homeColor }}>
                  {homeCode} {pitchControlStat.home}
                </span>
                <span style={{ fontSize: "9px", color: "#94a3b8" }}>{loc.pitchControl}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "9px", color: "#94a3b8" }}>{loc.territorialTilt}</span>
                <span style={{ fontSize: "11px", fontWeight: 900, color: awayColor }}>
                  {pitchControlStat.away} {awayCode}
                </span>
              </div>
            </div>

            {/* Split Dominance Bar */}
            <div
              style={{
                height: "6px",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                borderRadius: "3px",
                overflow: "hidden",
                display: "flex",
              }}
            >
              <div
                style={{
                  width: `${pitchControlStat.homePct}%`,
                  backgroundColor: homeColor,
                  transition: "width 0.3s ease",
                }}
              />
              <div
                style={{
                  width: `${100 - pitchControlStat.homePct}%`,
                  backgroundColor: awayColor,
                  transition: "width 0.3s ease",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8px", color: "#cbd5e1" }}>
              <span>{loc.gameRhythm}: <strong style={{ color: "#38bdf8" }}>{currentFrame?.game_rhythm ?? "High Tempo"}</strong></span>
              <span>{loc.passDifficulty}: <strong style={{ color: "#a855f7" }}>86% vs 79%</strong></span>
            </div>
          </div>
        )}

        {resolvedMode === "goal" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px 8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
              <div
                style={{
                  backgroundColor: "rgba(255, 214, 0, 0.2)",
                  border: "1px solid #ffd600",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  flexShrink: 0,
                }}
              >
                <IonIcon icon={footballOutline} style={{ color: "#ffd600", fontSize: "14px" }} />
                <span style={{ fontSize: "10px", fontWeight: 900, color: "#ffd600" }}>GOAL 42'</span>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: "12px", fontWeight: 900, color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  E. HAALAND <span style={{ fontSize: "10px", color: "#94a3b8" }}>(MAN CITY)</span>
                </div>
                <div style={{ fontSize: "8px", color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  14-Pass Build-up Sequence • Shot Velocity: <strong style={{ color: "#ffd600" }}>108.4 km/h</strong>
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: "11px", fontWeight: 900, color: "#10b981", fontFamily: "monospace" }}>
                0.78 xG
              </div>
              <div style={{ fontSize: "7px", color: "#94a3b8" }}>POST-SHOT xG 0.94</div>
            </div>
          </div>
        )}

        {resolvedMode === "tactical" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px 8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
              <div
                style={{
                  backgroundColor: "rgba(0, 229, 255, 0.2)",
                  border: "1px solid #00e5ff",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  flexShrink: 0,
                }}
              >
                <IonIcon icon={flashOutline} style={{ color: "#00e5ff", fontSize: "14px" }} />
                <span style={{ fontSize: "9px", fontWeight: 900, color: "#00e5ff" }}>INFLECTION</span>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: "11px", fontWeight: 900, color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  RAPID COUNTER-TRANSITION • B. SAKA (84')
                </div>
                <div style={{ fontSize: "8px", color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  Low-Block Turnover • 4 Touches Box-to-Box in 5.2s • Line Gap: 18.2m
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: "10px", fontWeight: 900, color: "#38bdf8", fontFamily: "monospace" }}>
                MOMENTUM +34%
              </div>
              <div style={{ fontSize: "7px", color: "#94a3b8" }}>CHAOS INDEX 58%</div>
            </div>
          </div>
        )}

        {resolvedMode === "sprint" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px 8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
              <div
                style={{
                  backgroundColor: "rgba(16, 185, 129, 0.2)",
                  border: "1px solid #10b981",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  flexShrink: 0,
                }}
              >
                <IonIcon icon={speedometerOutline} style={{ color: "#10b981", fontSize: "14px" }} />
                <span style={{ fontSize: "9px", fontWeight: 900, color: "#10b981" }}>SPRINT BURST</span>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: "11px", fontWeight: 900, color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {maxSpeedPlayer?.name ?? "B. SAKA"} • <span style={{ color: "#10b981" }}>{maxSpeedPlayer?.speed_kmh?.toFixed(1) ?? "33.8"} km/h</span>
                </div>
                <div style={{ fontSize: "8px", color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  Match-High Velocity • 9th Sprint &gt; 25 km/h • High-Intensity Run
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: "10px", fontWeight: 900, color: "#10b981", fontFamily: "monospace" }}>
                94% WORK RATE
              </div>
              <div style={{ fontSize: "7px", color: "#94a3b8" }}>PHYSICAL INTENSITY</div>
            </div>
          </div>
        )}

        {resolvedMode === "cue" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px 8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
              <div
                style={{
                  backgroundColor: "rgba(168, 85, 247, 0.2)",
                  border: "1px solid #a855f7",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  flexShrink: 0,
                }}
              >
                <IonIcon icon={chatbubbleEllipsesOutline} style={{ color: "#a855f7", fontSize: "14px" }} />
                <span style={{ fontSize: "9px", fontWeight: 900, color: "#a855f7" }}>CUE CARD</span>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: "11px", fontWeight: 900, color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  ZONE 14 CENTRAL OVERLOAD
                </div>
                <div style={{ fontSize: "8px", color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  City overload on right half-space forcing Arsenal into 5-4-1 low-block defensive shape.
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: "9px", fontWeight: 800, color: "#c084fc" }}>
                SUBPLOT ACTIVE
              </div>
              <div style={{ fontSize: "7px", color: "#94a3b8" }}>DE BRUYNE ROAMING</div>
            </div>
          </div>
        )}

        {resolvedMode === "defense" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px 8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
              <div
                style={{
                  backgroundColor: "rgba(59, 130, 246, 0.2)",
                  border: "1px solid #3b82f6",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  flexShrink: 0,
                }}
              >
                <IonIcon icon={shieldCheckmarkOutline} style={{ color: "#3b82f6", fontSize: "14px" }} />
                <span style={{ fontSize: "9px", fontWeight: 900, color: "#3b82f6" }}>
                  {(activeEvent?.type ?? "DEFENSIVE STOP").toUpperCase()}
                </span>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: "11px", fontWeight: 900, color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {activeEvent?.description ?? "Critical Defensive Intervention"}
                </div>
                <div style={{ fontSize: "8px", color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  Sector: <strong style={{ color: "#38bdf8" }}>{activeEvent?.pitchSector ?? "Penalty Box"}</strong> • Rest-Defense Compactness Preserved
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: "10px", fontWeight: 900, color: "#3b82f6", fontFamily: "monospace" }}>
                xT PREVENTED: -0.28
              </div>
              <div style={{ fontSize: "7px", color: "#94a3b8" }}>xG DENIED: 0.42</div>
            </div>
          </div>
        )}

        {resolvedMode === "keeper" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px 8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
              <div
                style={{
                  backgroundColor: "rgba(236, 72, 153, 0.2)",
                  border: "1px solid #ec4899",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  flexShrink: 0,
                }}
              >
                <IonIcon icon={shieldCheckmarkOutline} style={{ color: "#ec4899", fontSize: "14px" }} />
                <span style={{ fontSize: "9px", fontWeight: 900, color: "#ec4899" }}>
                  {(activeEvent?.type === "punch" ? "BOX PUNCH" : activeEvent?.type === "claim" ? "HIGH CATCH" : "REFLEX SAVE")}
                </span>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: "11px", fontWeight: 900, color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {activeEvent?.description ?? "Goalkeeper Decisive Action"}
                </div>
                <div style={{ fontSize: "8px", color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  Reaction Time: <strong style={{ color: "#ec4899" }}>0.28s</strong> • Sector: <strong style={{ color: "#ffffff" }}>{activeEvent?.pitchSector ?? "Goal Mouth"}</strong>
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: "10px", fontWeight: 900, color: "#ec4899", fontFamily: "monospace" }}>
                {activeEvent?.speedKmH ? `${activeEvent.speedKmH.toFixed(0)} km/h` : "94 km/h"} STOP
              </div>
              <div style={{ fontSize: "7px", color: "#94a3b8" }}>POST-SHOT xG 0.88</div>
            </div>
          </div>
        )}

        {resolvedMode === "attack" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px 8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
              <div
                style={{
                  backgroundColor: "rgba(16, 185, 129, 0.2)",
                  border: "1px solid #10b981",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  flexShrink: 0,
                }}
              >
                <IonIcon icon={sparklesOutline} style={{ color: "#10b981", fontSize: "14px" }} />
                <span style={{ fontSize: "9px", fontWeight: 900, color: "#10b981" }}>
                  {(activeEvent?.type ?? "ATTACKING DANGER").toUpperCase()}
                </span>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: "11px", fontWeight: 900, color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {activeEvent?.description ?? "Line-Breaking Transition Trigger"}
                </div>
                <div style={{ fontSize: "8px", color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  Vertical Progression in <strong style={{ color: "#10b981" }}>{activeEvent?.pitchSector ?? "Half-Space"}</strong> • High Danger Index
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: "10px", fontWeight: 900, color: "#10b981", fontFamily: "monospace" }}>
                PDR: {activeEvent?.pdr ? `${Math.round(activeEvent.pdr)}%` : "84%"}
              </div>
              <div style={{ fontSize: "7px", color: "#94a3b8" }}>xT +0.32</div>
            </div>
          </div>
        )}

        {resolvedMode === "disciplinary" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px 8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
              <div
                style={{
                  backgroundColor: activeEvent?.type === "red_card" ? "rgba(239, 68, 68, 0.25)" : "rgba(234, 179, 8, 0.25)",
                  border: activeEvent?.type === "red_card" ? "1px solid #ef4444" : "1px solid #eab308",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  flexShrink: 0,
                }}
              >
                <IonIcon icon={warningOutline} style={{ color: activeEvent?.type === "red_card" ? "#ef4444" : "#eab308", fontSize: "14px" }} />
                <span style={{ fontSize: "9px", fontWeight: 900, color: activeEvent?.type === "red_card" ? "#ef4444" : "#eab308" }}>
                  {(activeEvent?.type ?? "DISCIPLINARY").toUpperCase()}
                </span>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: "11px", fontWeight: 900, color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {activeEvent?.description ?? "Match Official Whistle / Booking"}
                </div>
                <div style={{ fontSize: "8px", color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  Sector: <strong style={{ color: "#ffffff" }}>{activeEvent?.pitchSector ?? "Central Corridor"}</strong> • Match Rhythm Interrupted
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: "10px", fontWeight: 900, color: activeEvent?.type === "red_card" ? "#ef4444" : "#eab308", fontFamily: "monospace" }}>
                REFEREE DECISION
              </div>
              <div style={{ fontSize: "7px", color: "#94a3b8" }}>DISCIPLINARY ACTION</div>
            </div>
          </div>
        )}
      </div>

      {/* Time-Indexed JSON Payload Modal Dialog (Stage 4 requirement) */}
      {showJsonPayload && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "12px",
          }}
          onClick={() => setShowJsonPayload(false)}
        >
          <div
            style={{
              backgroundColor: "#0b1329",
              border: "1px solid var(--studio-panel-border)",
              borderRadius: "14px",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "85dvh",
              padding: "14px 12px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.8)",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <IonIcon icon={codeSlashOutline} style={{ color: "var(--ion-color-primary)", fontSize: "20px" }} />
                <span style={{ fontSize: "14px", fontWeight: 800, color: "#ffffff" }}>
                  Time-Indexed Broadcast Overlay JSON
                </span>
              </div>
              <button
                onClick={() => setShowJsonPayload(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  fontSize: "18px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0 }}>
              Produced by <strong>Gamoventure Premier League Studio Engine</strong>.
              Ready for real-time live television lower-third graphics engines and teleprompter synchronizers.
            </p>

            <pre
              style={{
                backgroundColor: "#020617",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "8px",
                padding: "12px",
                fontSize: "10px",
                fontFamily: "monospace",
                color: "#38bdf8",
                maxHeight: "260px",
                overflowY: "auto",
                margin: 0,
              }}
            >
              {JSON.stringify(jsonPayload, null, 2)}
            </pre>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(jsonPayload, null, 2));
                  alert("Broadcast Overlay JSON copied to clipboard!");
                }}
                style={{
                  backgroundColor: "var(--ion-color-primary)",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 14px",
                  color: "#ffffff",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Copy JSON Payload
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
