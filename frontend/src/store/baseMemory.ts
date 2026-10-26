import { useSyncExternalStore } from "react";
import {
  FrameTelemetry,
  PlayerTelemetry,
  PlayerKinematics,
  TacticalBlackboard,
  PersonaMode,
  SupportedLanguage,
  MatchScore,
  GoalscorerItem,
  PlayerProfile,
  HeadToHeadStat,
  MatchEventItem,
  ShotMapItem,
  TacticalInflectionItem,
  SwarmCommentaryItem,
} from "../types/telemetry";

export interface ServerStatus {
  isConnected: boolean;
  latencyMs: number;
  lastSyncTime: number;
}

export interface BaseMemoryState {
  matchClock: number;
  isPlaying: boolean;
  clockOffset: number;
  score: MatchScore;
  homeLineup: PlayerProfile[];
  awayLineup: PlayerProfile[];
  headToHeadStats: HeadToHeadStat[];
  timelineEvents: MatchEventItem[];
  shotMapEvents: ShotMapItem[];
  tacticalInflections: TacticalInflectionItem[];
  swarmCommentary: SwarmCommentaryItem[];
  currentFrame: FrameTelemetry | null;
  blackboard: TacticalBlackboard;
  theme: "dark" | "light";
  selectedPersona: PersonaMode;
  selectedLanguage: SupportedLanguage;
  selectedPlayerId: string;
  activeScenario: string | null;
  isJudgeTourOpen: boolean;
  serverStatus: ServerStatus;
}

// Canonical Tactical Formation Lineup Coordinates (Home: 4-3-3 Left Half, Away: 4-2-3-1 Right Half)
// Non-colliding broadcast layout
const initialHomeLineup: PlayerProfile[] = [
  { id: "home_1", number: 31, name: "Ederson", pos: "GK", rating: 6.8, x: 8, y: 50, team: "home", attributes: { shoot: 20, passing: 88, dribbling: 45, defending: 65, shotAccuracyPct: 40, avgRating: 6.8 } },
  { id: "home_2", number: 2, name: "K. Walker", pos: "RB", rating: 7.1, x: 22, y: 16, team: "home", attributes: { shoot: 55, passing: 78, dribbling: 76, defending: 82, shotAccuracyPct: 60, avgRating: 7.1 } },
  { id: "home_3", number: 3, name: "R. Dias", pos: "CB", rating: 7.4, x: 19, y: 38, team: "home", attributes: { shoot: 40, passing: 82, dribbling: 65, defending: 89, shotAccuracyPct: 50, avgRating: 7.4 } },
  { id: "home_4", number: 25, name: "M. Akanji", pos: "CB", rating: 7.0, x: 19, y: 62, team: "home", attributes: { shoot: 42, passing: 80, dribbling: 68, defending: 84, shotAccuracyPct: 52, avgRating: 7.0 } },
  { id: "home_5", number: 24, name: "J. Gvardiol", pos: "LB", rating: 7.2, x: 22, y: 84, team: "home", attributes: { shoot: 62, passing: 84, dribbling: 79, defending: 81, shotAccuracyPct: 65, avgRating: 7.2 } },
  { id: "home_6", number: 16, name: "Rodri", pos: "DM", rating: 8.3, x: 32, y: 50, team: "home", attributes: { shoot: 78, passing: 93, dribbling: 82, defending: 88, shotAccuracyPct: 75, avgRating: 8.3 } },
  { id: "home_7", number: 20, name: "B. Silva", pos: "CM", rating: 7.9, x: 38, y: 70, team: "home", attributes: { shoot: 74, passing: 89, dribbling: 91, defending: 72, shotAccuracyPct: 70, avgRating: 7.9 } },
  { id: "home_8", number: 17, name: "K. De Bruyne", pos: "CM", rating: 8.8, x: 38, y: 30, team: "home", attributes: { shoot: 86, passing: 96, dribbling: 87, defending: 64, shotAccuracyPct: 82, avgRating: 8.8 } },
  { id: "home_9", number: 47, name: "P. Foden", pos: "RW", rating: 8.2, x: 45, y: 18, team: "home", attributes: { shoot: 84, passing: 86, dribbling: 89, defending: 58, shotAccuracyPct: 80, avgRating: 8.2 } },
  { id: "home_10", number: 10, name: "J. Grealish", pos: "LW", rating: 7.5, x: 45, y: 82, team: "home", attributes: { shoot: 72, passing: 83, dribbling: 88, defending: 52, shotAccuracyPct: 68, avgRating: 7.5 } },
  { id: "home_11", number: 9, name: "E. Haaland", pos: "ST", rating: 8.5, x: 44, y: 50, team: "home", attributes: { shoot: 94, passing: 68, dribbling: 80, defending: 45, shotAccuracyPct: 88, avgRating: 8.5 } },
];

const initialAwayLineup: PlayerProfile[] = [
  { id: "away_1", number: 22, name: "D. Raya", pos: "GK", rating: 6.9, x: 92, y: 50, team: "away", attributes: { shoot: 18, passing: 84, dribbling: 42, defending: 68, shotAccuracyPct: 40, avgRating: 6.9 } },
  { id: "away_2", number: 4, name: "B. White", pos: "RB", rating: 6.8, x: 78, y: 84, team: "away", attributes: { shoot: 50, passing: 79, dribbling: 74, defending: 81, shotAccuracyPct: 55, avgRating: 6.8 } },
  { id: "away_3", number: 2, name: "W. Saliba", pos: "CB", rating: 7.3, x: 81, y: 62, team: "away", attributes: { shoot: 38, passing: 85, dribbling: 71, defending: 88, shotAccuracyPct: 48, avgRating: 7.3 } },
  { id: "away_4", number: 6, name: "Gabriel", pos: "CB", rating: 7.2, x: 81, y: 38, team: "away", attributes: { shoot: 52, passing: 78, dribbling: 66, defending: 86, shotAccuracyPct: 56, avgRating: 7.2 } },
  { id: "away_5", number: 12, name: "J. Timber", pos: "LB", rating: 6.9, x: 78, y: 16, team: "away", attributes: { shoot: 54, passing: 81, dribbling: 78, defending: 80, shotAccuracyPct: 58, avgRating: 6.9 } },
  { id: "away_6", number: 5, name: "T. Partey", pos: "DM", rating: 7.0, x: 68, y: 65, team: "away", attributes: { shoot: 68, passing: 84, dribbling: 79, defending: 83, shotAccuracyPct: 62, avgRating: 7.0 } },
  { id: "away_7", number: 41, name: "D. Rice", pos: "DM", rating: 7.6, x: 68, y: 35, team: "away", attributes: { shoot: 72, passing: 86, dribbling: 80, defending: 87, shotAccuracyPct: 70, avgRating: 7.6 } },
  { id: "away_8", number: 8, name: "M. Ødegaard", pos: "AM", rating: 7.7, x: 62, y: 50, team: "away", attributes: { shoot: 80, passing: 91, dribbling: 86, defending: 64, shotAccuracyPct: 77, avgRating: 7.7 } },
  { id: "away_9", number: 7, name: "B. Saka", pos: "RW", rating: 8.0, x: 56, y: 82, team: "away", attributes: { shoot: 85, passing: 85, dribbling: 89, defending: 62, shotAccuracyPct: 81, avgRating: 8.0 } },
  { id: "away_10", number: 11, name: "G. Martinelli", pos: "LW", rating: 7.2, x: 56, y: 18, team: "away", attributes: { shoot: 78, passing: 76, dribbling: 87, defending: 55, shotAccuracyPct: 72, avgRating: 7.2 } },
  { id: "away_11", number: 29, name: "K. Havertz", pos: "ST", rating: 7.1, x: 54, y: 50, team: "away", attributes: { shoot: 79, passing: 79, dribbling: 78, defending: 60, shotAccuracyPct: 71, avgRating: 7.1 } },
];

const initialHeadToHeadStats: HeadToHeadStat[] = [
  { label: "Possession", home: "58%", away: "42%", homePct: 58 },
  { label: "Expected Goals (xG)", home: "2.45", away: "1.12", homePct: 68 },
  { label: "Total Shots", home: "14", away: "8", homePct: 63 },
  { label: "Shots on Target", home: "6", away: "3", homePct: 66 },
  { label: "Pitch Control", home: "61%", away: "39%", homePct: 61 },
  { label: "Control vs. Chaos Index", home: "74%", away: "52%", homePct: 58 },
  { label: "Pass Difficulty Rating", home: "86%", away: "79%", homePct: 52 },
  { label: "Corner Kicks", home: "5", away: "2", homePct: 71 },
  { label: "Fouls", home: "7", away: "11", homePct: 39 },
  { label: "Yellow Cards", home: "1", away: "2", homePct: 33 },
];

export const normalizePlayerId = (id: string | undefined): string => {
  if (!id) return "";
  if (id.startsWith("h") && !id.startsWith("home_")) {
    const num = id.slice(1);
    if (!isNaN(Number(num))) return `home_${num}`;
  }
  if (id.startsWith("a") && !id.startsWith("away_")) {
    const num = id.slice(1);
    if (!isNaN(Number(num))) return `away_${num}`;
  }
  return id;
};

export function extractGoalscorers(
  events: any[],
  shots: any[],
  homeLineup: PlayerProfile[],
  awayLineup: PlayerProfile[],
  currentClockSec?: number
): GoalscorerItem[] {
  const goalscorers: GoalscorerItem[] = [];
  const seen = new Set<string>();

  // 1. Check goal shots from simulation
  if (Array.isArray(shots)) {
    for (const s of shots) {
      if (s.outcome === "goal" || s.isGoal) {
        const timeSec = typeof s.timestampMs === "number" ? Math.floor(s.timestampMs / 1000) : 0;
        if (currentClockSec !== undefined && timeSec > currentClockSec) continue;
        const minute = s.matchClock || (timeSec > 0 ? `${Math.floor(timeSec / 60)}'` : "1'");
        const key = `${s.playerName || s.playerId}-${minute}-${s.team}`;
        if (!seen.has(key)) {
          seen.add(key);
          goalscorers.push({
            player: s.playerName || "Player",
            minute,
            team: s.team === "away" ? "away" : "home",
          });
        }
      }
    }
  }

  // 2. Check discrete match events
  if (Array.isArray(events)) {
    for (const ev of events) {
      if (ev.type === "goal") {
        const timeSec = typeof ev.timestampMs === "number" ? Math.floor(ev.timestampMs / 1000) : 0;
        if (currentClockSec !== undefined && timeSec > currentClockSec) continue;

        let playerName = "";
        const actorId = ev.actorId ? normalizePlayerId(ev.actorId) : "";
        const player = [...homeLineup, ...awayLineup].find(
          (p) =>
            p.id === actorId ||
            p.id === ev.actorId ||
            p.id.replace("home_", "h_") === ev.actorId ||
            p.id.replace("away_", "a_") === ev.actorId
        );
        if (player) {
          playerName = player.name;
        } else if (ev.description) {
          const match = ev.description.match(/GOAL!\s+([^(\s]+(?:\s+[^(\s]+)?)/i);
          playerName = match ? match[1] : ev.description.split(" ")[1] || "Player";
        } else {
          playerName = "Player";
        }

        const minute = ev.matchClock || (timeSec > 0 ? `${Math.floor(timeSec / 60)}'` : "1'");
        const team = ev.team === "away" ? "away" : "home";
        const key = `${playerName}-${minute}-${team}`;
        if (!seen.has(key)) {
          seen.add(key);
          goalscorers.push({
            player: playerName,
            minute,
            team,
          });
        }
      }
    }
  }

  return goalscorers;
}

export function extractTacticalInflections(
  events: any[],
  currentClockSec?: number
): TacticalInflectionItem[] {
  const inflections: TacticalInflectionItem[] = [];
  const seen = new Set<string>();

  if (Array.isArray(events)) {
    for (const ev of events) {
      const evType = (ev.type || "").toLowerCase();
      if (
        evType === "inflection" ||
        evType === "goal" ||
        (evType === "card" && (ev.subAction?.includes("red") || ev.description?.toLowerCase().includes("red")))
      ) {
        const timeSec = typeof ev.timestampMs === "number" ? Math.floor(ev.timestampMs / 1000) : 0;
        if (currentClockSec !== undefined && currentClockSec > 0 && timeSec > currentClockSec) continue;

        let title = "Tactical Inflection";
        let impact = "Tactical Shift";
        if (evType === "goal") {
          title = "Breakthrough Goal";
          impact = `Score Impact (xG ${(ev.xG || 0.65).toFixed(2)})`;
        } else if (evType === "card") {
          title = "Disciplinary Crisis";
          impact = "Numerical Asymmetry";
        } else if (ev.description?.includes("Chaos") || ev.description?.includes("Compactness")) {
          title = "Momentum Shift";
          impact = "Chaos Index Spike";
        } else if (ev.description?.includes("Control")) {
          title = "Dominance Shift";
          impact = "Territorial Pin";
        }

        const minute = ev.matchClock || (timeSec > 0 ? `${Math.floor(timeSec / 60)}'` : "1'");
        const detail = ev.description || "Tactical inflection registered by Agent Swarm.";
        const key = `${minute}-${title}-${detail.slice(0, 30)}`;

        if (!seen.has(key)) {
          seen.add(key);
          inflections.push({
            time: minute,
            timeSec,
            title,
            detail,
            impact,
          });
        }
      }
    }
  }

  return inflections.reverse();
}

const initialTimelineEvents: MatchEventItem[] = [];

const initialShotMapEvents: ShotMapItem[] = [];

const initialTacticalInflections: TacticalInflectionItem[] = [];

const initialSwarmCommentary: SwarmCommentaryItem[] = [
  { time: "22'", timeSec: 1320, agent: "Tactical Agent", role: "Shape Analyst", text: "City overloading right half-space; De Bruyne slips Haaland through central defensive seam." },
  { time: "17'", timeSec: 1020, agent: "Tactical Agent", role: "Shape Analyst", text: "Arsenal compact 4-4-2 block maintaining 26.4m width, successfully forcing City circulation wide." },
  { time: "11'", timeSec: 660, agent: "Telemetry Agent", role: "Spatial Tracking", text: "High press turnover registered by Rodri (x=66.2m), denying Arsenal transition outlet." },
  { time: "4'", timeSec: 240, agent: "Narrative Agent", role: "Story Synthesizer", text: "Opening phase characterized by sustained City possession, establishing 64% pitch control." },
];

const initialBlackboard: TacticalBlackboard = {
  latest_frame_id: 0,
  current_game_rhythm: "structured_possession",
  control_index: 64,
  chaos_index: 36,
  active_tactical_inflection: false,
  latest_pdr: 0.42,
  narrative_headline: "Man City sustained possession pinning Arsenal low block",
  persona_overviews: {
    analyst:
      "Defensive block compact in central corridor (width 26.4m). Passing network shows 82% ball progression via right half-space.",
    casual:
      "Total siege! City are relentless on the edge of the box, searching for the killer pass.",
    player_cam:
      "Tracking Home #17: 29.8 km/h sprint burst into the penalty box. Off-ball distance covered: 3.4 km.",
    club_centric:
      "City asserting complete control with 68% territorial dominance in the final third.",
  },
};

export function sanitizeText(val: unknown, fallback = "", activeLang: SupportedLanguage = "en"): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "object") {
    const rec = val as Record<string, unknown>;
    const langVal = rec[activeLang] ?? rec.en;
    if (typeof langVal === "string") return sanitizeText(langVal, fallback, activeLang);
    return fallback;
  }
  const s = String(val).trim();
  if (s.includes("NarrativeDraft(") || s.includes("[object Object]")) {
    return fallback;
  }
  return s;
}

export const SCENARIO_MULTILINGUAL: Record<string, Record<SupportedLanguage, string>> = {
  high_possession: {
    en: "Sustained High Possession",
    es: "Posesión Alta Sostenida",
    fr: "Possession Élevée Soutenue",
    ja: "ポゼッション維持",
    ar: "استحواذ مستمر",
  },
  counter_attack_transition: {
    en: "Counter-Attack Transition",
    es: "Transición de Contraataque",
    fr: "Transition de Contre-Attaque",
    ja: "カウンターアタック移行",
    ar: "تحول الهجوم المضاد",
  },
  low_block_siege: {
    en: "Low-Block Defensive Wall",
    es: "Muro Defensivo de Bloque Bajo",
    fr: "Mur Défensif Bloc Bas",
    ja: "ローブロック守備網",
    ar: "جدار دفاعي منخفض",
  },
  box_scramble: {
    en: "Penalty Box Scramble",
    es: "Revuelo en el Área",
    fr: "Mêlée dans la Surface",
    ja: "ペナルティエリアの混戦",
    ar: "فوضى منطقة الجزاء",
  },
  red_card_crisis: {
    en: "Red Card Crisis",
    es: "Crisis de Tarjeta Roja",
    fr: "Crise de Carton Rouge",
    ja: "レッドカード危機",
    ar: "أزمة البطاقة الحمراء",
  },
};

const initialState: BaseMemoryState = {
  theme: "dark",
  matchClock: 1458, // 24:18 min
  isPlaying: true,
  clockOffset: 0,
  score: {
    homeTeam: "MCI",
    awayTeam: "ARS",
    homeScore: 0,
    awayScore: 0,
    period: "1st Half",
    homeMeta: {
      name: "Manchester City",
      shortCode: "MCI",
      color: "#00e5ff",
      manager: "Pep Guardiola",
      formation: "4 - 3 - 3",
    },
    awayMeta: {
      name: "Arsenal",
      shortCode: "ARS",
      color: "#f43f5e",
      manager: "Mikel Arteta",
      formation: "4 - 2 - 3 - 1",
    },
    date: "25.01.2026",
    time: "16:30",
    competition: "Premier League",
    venue: "Etihad Stadium",
    goalscorers: [],
  },
  homeLineup: initialHomeLineup,
  awayLineup: initialAwayLineup,
  headToHeadStats: initialHeadToHeadStats,
  timelineEvents: initialTimelineEvents,
  shotMapEvents: initialShotMapEvents,
  tacticalInflections: initialTacticalInflections,
  swarmCommentary: initialSwarmCommentary,
  currentFrame: null,
  blackboard: initialBlackboard,
  selectedPersona: "analyst",
  selectedLanguage: "en",
  selectedPlayerId: "home_8",
  activeScenario: null,
  isJudgeTourOpen: false,
  serverStatus: {
    isConnected: false,
    latencyMs: 0,
    lastSyncTime: Date.now(),
  },
};

class BaseMemoryStore {
  private state: BaseMemoryState = initialState;
  private listeners: Set<() => void> = new Set();

  getState = (): BaseMemoryState => {
    return this.state;
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  private scenarioCommandHandler: ((cmd: Record<string, unknown>) => void) | null = null;

  setScenarioCommandHandler = (handler: (cmd: Record<string, unknown>) => void) => {
    this.scenarioCommandHandler = handler;
  };

  // --- Actions to update Single Base Memory from Server or UI ---

  updateFrame = (rawFrame: FrameTelemetry | Record<string, any>) => {
    // If user paused playback, freeze updates
    if (!this.state.isPlaying || !rawFrame) {
      return;
    }

    // Normalize incoming players to PlayerKinematics
    const rawPlayers = (rawFrame as any).players || [];
    const normalizedPlayers: PlayerKinematics[] = [];
    const playerMap = new Map<string, PlayerKinematics>();

    if (Array.isArray(rawPlayers)) {
      for (const rp of rawPlayers) {
        const rawId = rp.id || rp.player_id || "";
        const normId = normalizePlayerId(rawId);
        const shirtNum = rp.number ?? rp.shirt_number ?? 0;
        const speedKmh = rp.speedKmH ?? rp.speed_kmh ?? (rp.velocity_mps ? rp.velocity_mps * 3.6 : 0);
        const velMps = rp.velocity_mps ?? (speedKmh ? speedKmh / 3.6 : Math.hypot(rp.vx || 0, rp.vy || 0));
        const headingDeg = rp.heading_deg ?? (rp.vx || rp.vy ? (Math.atan2(rp.vy || 0, rp.vx || 0) * (180 / Math.PI) + 360) % 360 : 0);
        const isCarrier = rp.onBall ?? rp.is_ball_carrier ?? false;

        const p: PlayerKinematics = {
          player_id: normId || rawId,
          id: rawId,
          name: rp.name,
          team: rp.team,
          shirt_number: shirtNum,
          number: shirtNum,
          position: rp.position,
          x: rp.x,
          y: rp.y,
          velocity_mps: Math.round(velMps * 100) / 100,
          speed_kmh: Math.round(speedKmh * 10) / 10,
          speedKmH: Math.round(speedKmh * 10) / 10,
          heading_deg: Math.round(headingDeg),
          is_ball_carrier: isCarrier,
          onBall: isCarrier,
          shortName: rp.shortName,
          role: rp.role,
          distanceMeters: rp.distanceMeters,
          touches: rp.touches,
        };

        normalizedPlayers.push(p);
        if (rawId) playerMap.set(rawId, p);
        if (normId) playerMap.set(normId, p);
      }
    }

    const updatedHome = this.state.homeLineup.map((p) => {
      const live = playerMap.get(p.id) || playerMap.get(p.id.replace("home_", "h"));
      if (!live) return p;
      return {
        ...p,
        x: Math.round((live.x / 105.0) * 1000) / 10,
        y: Math.round((live.y / 68.0) * 1000) / 10,
        speed_kmh: live.speed_kmh,
        is_ball_carrier: live.is_ball_carrier,
      };
    });

    const updatedAway = this.state.awayLineup.map((p) => {
      const live = playerMap.get(p.id) || playerMap.get(p.id.replace("away_", "a"));
      if (!live) return p;
      return {
        ...p,
        x: Math.round((live.x / 105.0) * 1000) / 10,
        y: Math.round((live.y / 68.0) * 1000) / 10,
        speed_kmh: live.speed_kmh,
        is_ball_carrier: live.is_ball_carrier,
      };
    });

    // Normalize ball state
    const rawBall = (rawFrame as any).ball || { x: 52.5, y: 34.0, z: 0 };
    const ballSpeed = rawBall.speedKmH ?? rawBall.speed_kmh ?? 0;
    const normalizedBall: any = {
      ...rawBall,
      speed_kmh: ballSpeed,
      speedKmH: ballSpeed,
      velocity_mps: rawBall.velocity_mps ?? (ballSpeed ? ballSpeed / 3.6 : 0),
    };

    // Tactical metrics (extract from backend MatchMetrics or fallback)
    const rawMetrics = (rawFrame as any).metrics;
    const ctrl = this.state.activeScenario
      ? this.state.blackboard.control_index
      : Math.round(rawMetrics?.controlVsChaosIndex ?? (rawFrame as any).control_chaos?.control ?? 64);
    const chs = this.state.activeScenario
      ? this.state.blackboard.chaos_index
      : Math.round(100 - (rawMetrics?.controlVsChaosIndex ?? (100 - ((rawFrame as any).control_chaos?.chaos ?? 36))));
    const rhythm = this.state.activeScenario
      ? this.state.blackboard.current_game_rhythm
      : (rawMetrics?.gameRhythm ?? (rawFrame as any).game_rhythm ?? "Structured");
    const activeInflection = this.state.activeScenario
      ? true
      : ((rawFrame as any).latestNarrative?.isTacticalInflectionPoint ?? (rawFrame as any).active_tactical_inflection ?? false);
    const pdrValue = typeof rawMetrics?.passDifficultyRating === "number"
      ? rawMetrics.passDifficultyRating / 100.0
      : (typeof (rawFrame as any).latest_pdr === "number" ? (rawFrame as any).latest_pdr : this.state.blackboard.latest_pdr);

    const possHome = Math.min(75, Math.max(35, Math.round(rawMetrics?.possessionShare?.home ?? (ctrl * 0.4 + 35))));
    const pcHome = Math.min(80, Math.max(30, Math.round(rawMetrics?.pitchControl?.home ?? (ctrl * 0.5 + 30))));
    const pdrPct = Math.round(pdrValue * 100);

    const updatedStats = this.state.headToHeadStats.map((st) => {
      if (st.label === "Possession") {
        return { ...st, home: `${possHome}%`, away: `${100 - possHome}%`, homePct: possHome };
      }
      if (st.label === "Pitch Control") {
        return { ...st, home: `${pcHome}%`, away: `${100 - pcHome}%`, homePct: pcHome };
      }
      if (st.label === "Control vs. Chaos Index") {
        return { ...st, home: `${ctrl}%`, away: `${chs}%`, homePct: ctrl };
      }
      if (st.label === "Pass Difficulty Rating") {
        return { ...st, home: `${pdrPct}%`, away: `${Math.max(20, pdrPct - 8)}%`, homePct: pdrPct };
      }
      return st;
    });

    const frameSeconds = (rawFrame as any).matchSeconds ?? (rawFrame as any).match_clock_sec ?? 0;
    const effectiveClock = this.state.serverStatus.isConnected
      ? Math.max(0, frameSeconds + this.state.clockOffset)
      : Math.min(5400, Math.max(0, frameSeconds));

    const frameId = (rawFrame as any).frameId ?? (rawFrame as any).frame_id ?? 0;

    const frame: FrameTelemetry = {
      ...(rawFrame as any),
      frame_id: frameId,
      frameId: frameId,
      match_clock_sec: frameSeconds,
      matchSeconds: frameSeconds,
      matchClock: (rawFrame as any).matchClock || `${Math.floor(frameSeconds / 60)}:${Math.floor(frameSeconds % 60).toString().padStart(2, "0")}`,
      timestamp_ms: (rawFrame as any).timestampMs ?? (rawFrame as any).timestamp_ms ?? Date.now(),
      ball: normalizedBall,
      players: normalizedPlayers,
      control_chaos: { control: ctrl, chaos: chs },
      game_rhythm: rhythm,
      active_tactical_inflection: activeInflection,
    };

    // Synchronize dynamic shots from simulation with true penalty box pitch projection
    let updatedShots = this.state.shotMapEvents;
    if (Array.isArray((rawFrame as any).shots)) {
      updatedShots = (rawFrame as any).shots.map((s: any, idx: number) => {
        const rawX = typeof s.x === "number" ? s.x : 0;
        const rawY = typeof s.y === "number" ? s.y : 34.0;
        const isHome = s.team !== "away";

        // Accurate penalty box projection:
        // Goal is at top (0%), penalty spot ~28%, 18-yard box ~50-65%
        // Home attacks right goal (x=105, y=34), Away attacks left goal (x=0, y=34)
        const distFromGoal = isHome ? Math.max(0, 105.0 - rawX) : Math.max(0, rawX);
        const topPct = Math.max(8, Math.min(88, (distFromGoal / 32.0) * 60 + 8));
        const leftPct = isHome
          ? Math.max(10, Math.min(90, (rawY / 68.0) * 100))
          : Math.max(10, Math.min(90, ((68.0 - rawY) / 68.0) * 100));

        return {
          id: s.id || `s_${idx}`,
          x: `${Math.round(leftPct * 10) / 10}%`,
          y: `${Math.round(topPct * 10) / 10}%`,
          size: Math.round(10 + (s.xG || 0.25) * 14),
          isGoal: s.outcome === "goal",
          label: s.outcome === "goal" ? "Goal" : s.outcome === "saved" ? "Saved" : "Miss",
          playerId: normalizePlayerId(s.playerId),
          playerName: s.playerName || "Shooter",
          minute: s.matchClock || `${Math.floor((s.timestampMs || 0) / 60000)}'`,
          xG: typeof s.xG === "number" ? Math.round(s.xG * 100) / 100 : 0.25,
          xGOT: s.outcome === "goal" ? Math.min(0.99, Math.round(((s.xG || 0.25) + 0.15) * 100) / 100) : 0,
          foot: s.distanceToGoalM && s.distanceToGoalM < 10 ? "Header" : "Right",
          team: s.team === "away" ? "away" : "home",
        };
      });
    }

    // Synchronize dynamic events from simulation
    let updatedEvents = this.state.timelineEvents;
    if (Array.isArray((rawFrame as any).events) && (rawFrame as any).events.length > 0) {
      updatedEvents = (rawFrame as any).events.slice(-25).reverse().map((ev: any, idx: number) => ({
        id: ev.id || `ev_${idx}`,
        time: ev.matchClock || `${Math.floor((ev.timestampMs || 0) / 60000)}'`,
        timeSec: Math.floor((ev.timestampMs || 0) / 1000),
        type: ev.type === "goal" ? "goal" : (typeof ev.type === "string" && ev.type.includes("card") ? "card" : "sub"),
        player: ev.description?.split(" ")[0] || "Player",
        playerId: normalizePlayerId(ev.actorId || "home_7"),
        team: ev.team === "away" ? "away" : "home",
        detail: ev.description,
        score: ev.score ? `${ev.score.home} - ${ev.score.away}` : undefined,
      }));
    }

    // Synchronize narrative into blackboard
    let updatedBlackboard = {
      ...this.state.blackboard,
      latest_frame_id: frameId,
      current_game_rhythm: rhythm,
      control_index: ctrl,
      chaos_index: chs,
      active_tactical_inflection: activeInflection,
      latest_pdr: pdrValue,
    };

    if ((rawFrame as any).latestNarrative) {
      const nar = (rawFrame as any).latestNarrative;
      const lang = this.state.selectedLanguage;
      const headline = nar.headline?.[lang] || nar.headline?.en || updatedBlackboard.narrative_headline;
      const explanation = nar.tacticalExplanation?.[lang] || nar.tacticalExplanation?.en || "";
      updatedBlackboard = {
        ...updatedBlackboard,
        narrative_headline: headline,
        narrative_explanation: explanation,
        persona_overviews: {
          analyst: nar.analystContext || updatedBlackboard.persona_overviews.analyst,
          casual: nar.casualContext || updatedBlackboard.persona_overviews.casual,
          player_cam: nar.playerCamContext || updatedBlackboard.persona_overviews.player_cam,
          club_centric: nar.clubCentricContext?.homeFrame || updatedBlackboard.persona_overviews.club_centric,
        },
      };
    }

    // Dynamically derive score and goalscorers from live frame events and shots
    const dynamicGoalscorers = extractGoalscorers(
      (rawFrame as any).events || [],
      (rawFrame as any).shots || [],
      updatedHome,
      updatedAway,
      effectiveClock
    );

    const liveScore = (rawFrame as any).score;
    const computedHomeScore = liveScore && typeof liveScore.home === "number"
      ? liveScore.home
      : dynamicGoalscorers.filter(g => g.team === "home").length;
    const computedAwayScore = liveScore && typeof liveScore.away === "number"
      ? liveScore.away
      : dynamicGoalscorers.filter(g => g.team === "away").length;

    let period = "1st Half";
    if (effectiveClock >= 5400) {
      period = "Full Time";
    } else if (effectiveClock >= 2700 && effectiveClock < 2760) {
      period = "Halftime";
    } else if (effectiveClock > 2700) {
      period = "2nd Half";
    }

    const updatedScore: MatchScore = {
      ...this.state.score,
      homeScore: computedHomeScore,
      awayScore: computedAwayScore,
      period,
      goalscorers: dynamicGoalscorers,
    };

    const dynamicInflections = extractTacticalInflections(
      (rawFrame as any).events || [],
      effectiveClock
    );

    this.state = {
      ...this.state,
      currentFrame: frame,
      matchClock: effectiveClock,
      score: updatedScore,
      homeLineup: updatedHome,
      awayLineup: updatedAway,
      headToHeadStats: updatedStats,
      shotMapEvents: updatedShots,
      timelineEvents: updatedEvents,
      tacticalInflections: dynamicInflections.length > 0 ? dynamicInflections : this.state.tacticalInflections,
      blackboard: updatedBlackboard,
    };
    this.notify();
  };

  setIsPlaying = (playing: boolean) => {
    this.state = {
      ...this.state,
      isPlaying: playing,
    };
    this.notify();
  };

  injectScenario = (scenarioId: string) => {
    let blackboardUpdate: Partial<TacticalBlackboard> = {};
    let inflectionTitle = "";
    let inflectionDetail = "";
    let inflectionImpact = "";

    if (scenarioId === "low_block_siege") {
      blackboardUpdate = {
        control_index: 82,
        chaos_index: 18,
        current_game_rhythm: "sustained_possession",
        latest_pdr: 0.68,
        active_tactical_inflection: true,
        narrative_headline: "Man City sustained siege: 82% territorial control compressing Arsenal into 18m depth",
        persona_overviews: {
          analyst: "Central corridor compacted to 21.2m. City generating 1.84 xG via De Bruyne half-space delivery, Rest-Defense resting on halfway line.",
          casual: "Total siege! City are relentless on the edge of the box, searching for the killer pass.",
          player_cam: "Tracking Home #17 (De Bruyne): 42 passes completed, hovering in the right half-space channel with 94% execution.",
          club_centric: "City asserting complete territorial authority with 82% control in Arsenal's defensive third.",
        },
      };
      inflectionTitle = "Low-Block Siege Injected";
      inflectionDetail = "Arsenal compressed to 18m block depth. City holding 82% pitch control.";
      inflectionImpact = "Home Control 82%";
    } else if (scenarioId === "rapid_counter" || scenarioId === "counter_attack_transition" || scenarioId === "counter_attack_blitz") {
      blackboardUpdate = {
        control_index: 26,
        chaos_index: 74,
        current_game_rhythm: "transition_frenzy",
        latest_pdr: 0.35,
        active_tactical_inflection: true,
        narrative_headline: "Arsenal rapid counter-attack: Saka breakaway punishing high defensive line in 3 touches",
        persona_overviews: {
          analyst: "Transition Frenzy triggered: City rest-defense fractured by vertical channel pass. Saka sprint velocity clocked at 33.2 km/h.",
          casual: "Lightning breakaway! Saka bursts down the right wing with only the goalkeeper to beat!",
          player_cam: "Tracking Away #8 (Saka): Sprint burst peaked at 33.2 km/h across 48 meters in open transition.",
          club_centric: "Arsenal executing textbook vertical counter-strike, catching City's fullbacks stranded upfield.",
        },
      };
      inflectionTitle = "Rapid Counter Injected";
      inflectionDetail = "Saka sprint burst clocked at 33.2 km/h, breaking rest-defense.";
      inflectionImpact = "Transition Chaos 74%";
    } else if (scenarioId === "red_card_crisis") {
      blackboardUpdate = {
        control_index: 88,
        chaos_index: 42,
        current_game_rhythm: "numerical_asymmetry",
        latest_pdr: 0.76,
        active_tactical_inflection: true,
        narrative_headline: "Red Card Crisis: Arsenal down to 10 men, forced into emergency 5-3-1 bunker",
        persona_overviews: {
          analyst: "Numerical asymmetry (-1 player) alters pitch control surface: City now control 84% of pitch space with 2-man overload on flanks.",
          casual: "Red card drama! Arsenal are down to 10 men and fighting desperately to hold on to the point!",
          player_cam: "Tracking Away #7 (Rice): High-strain defensive shift covering 4.8 km to bridge the missing midfield pivot.",
          club_centric: "Arsenal in heroic defensive resistance, throwing bodies on the line to preserve the draw.",
        },
      };
      inflectionTitle = "Red Card Crisis Injected";
      inflectionDetail = "Arsenal down to 10 men. Emergency 5-3-1 bunker engaged.";
      inflectionImpact = "Numerical Asymmetry -1";
    } else if (scenarioId === "box_scramble" || scenarioId === "final_minutes_desperation") {
      blackboardUpdate = {
        control_index: 15,
        chaos_index: 85,
        current_game_rhythm: "penalty_box_chaos",
        latest_pdr: 0.88,
        active_tactical_inflection: true,
        narrative_headline: "Total Chaos: 6 players contesting rebound in 6-yard box with 0.82 xG goalmouth scramble",
        persona_overviews: {
          analyst: "Maximum volatility state: Chaos index 85%. Ball velocity 0 mps with 8 defenders within 4m radius of goal line.",
          casual: "Heart-in-mouth moment! Desperate goal-line clearances and blocks inside the 6-yard box!",
          player_cam: "Tracking Home #10 (Haaland): 2 consecutive close-range attempts blocked by desperate sliding challenges.",
          club_centric: "City inches away from the winner! Agonizing scramble on the goal-line!",
        },
      };
      inflectionTitle = "Penalty Box Scramble Injected";
      inflectionDetail = "Chaos Index spiked to 85% with 6 players contesting rebound in 6-yard box.";
      inflectionImpact = "Max Chaos 85%";
    }

    const newInflection: TacticalInflectionItem = {
      time: "Live",
      timeSec: this.state.matchClock,
      title: inflectionTitle,
      detail: inflectionDetail,
      impact: inflectionImpact,
    };

    this.state = {
      ...this.state,
      activeScenario: scenarioId,
      blackboard: {
        ...this.state.blackboard,
        ...blackboardUpdate,
      },
      tacticalInflections: [newInflection, ...this.state.tacticalInflections],
    };

    if (this.scenarioCommandHandler) {
      const scenarioMap: Record<string, string> = {
        low_block_siege: "low_block_siege",
        rapid_counter: "counter_attack_transition",
        counter_attack_blitz: "counter_attack_transition",
        counter_attack_transition: "counter_attack_transition",
        red_card_crisis: "low_block_siege",
        box_scramble: "box_scramble",
        final_minutes_desperation: "box_scramble",
        high_possession: "high_possession",
      };
      this.scenarioCommandHandler({
        type: "set_scenario",
        scenario: scenarioMap[scenarioId] || scenarioId,
      });
    }

    this.notify();
  };

  resetScenario = () => {
    this.state = {
      ...this.state,
      activeScenario: null,
      blackboard: {
        ...initialBlackboard,
        latest_frame_id: this.state.blackboard.latest_frame_id,
      },
    };

    if (this.scenarioCommandHandler) {
      this.scenarioCommandHandler({ type: "set_scenario", scenario: "high_possession" });
    }

    this.notify();
  };

  updateBlackboard = (bb: any) => {
    if (!bb) return;
    const lang = this.state.selectedLanguage;
    const headline =
      bb.narrative?.headline?.[lang] ||
      bb.narrative?.headline?.en ||
      bb.narrative_headline ||
      this.state.blackboard.narrative_headline;
    const ctrl =
      typeof bb.control_vs_chaos === "number"
        ? Math.round(bb.control_vs_chaos)
        : (bb.control_index ?? this.state.blackboard.control_index);
    const chs =
      typeof bb.control_vs_chaos === "number"
        ? Math.round(100 - bb.control_vs_chaos)
        : (bb.chaos_index ?? this.state.blackboard.chaos_index);
    const rhythm =
      bb.game_rhythm || bb.current_game_rhythm || this.state.blackboard.current_game_rhythm;
    const pdr =
      typeof bb.pass_difficulty_rating === "number"
        ? bb.pass_difficulty_rating / 100.0
        : (bb.latest_pdr ?? this.state.blackboard.latest_pdr);

    const personaOverviews = {
      analyst:
        bb.analyst_context ||
        bb.persona_overviews?.analyst ||
        this.state.blackboard.persona_overviews.analyst,
      casual:
        bb.casual_context ||
        bb.persona_overviews?.casual ||
        this.state.blackboard.persona_overviews.casual,
      player_cam:
        bb.player_cam_context ||
        bb.persona_overviews?.player_cam ||
        this.state.blackboard.persona_overviews.player_cam,
      club_centric:
        bb.club_centric_context?.homeFrame ||
        bb.persona_overviews?.club_centric ||
        this.state.blackboard.persona_overviews.club_centric,
    };

    this.state = {
      ...this.state,
      blackboard: {
        ...this.state.blackboard,
        latest_frame_id: bb.latest_frame_id ?? this.state.blackboard.latest_frame_id,
        current_game_rhythm: rhythm,
        control_index: ctrl,
        chaos_index: chs,
        latest_pdr: pdr,
        narrative_headline: headline,
        persona_overviews: personaOverviews,
      },
    };
    this.notify();
  };

  setPersona = (persona: PersonaMode) => {
    this.state = {
      ...this.state,
      selectedPersona: persona,
    };
    if (this.scenarioCommandHandler) {
      this.scenarioCommandHandler({ type: "set_persona", persona });
    }
    this.notify();
  };

  setLanguage = (language: SupportedLanguage) => {
    this.state = {
      ...this.state,
      selectedLanguage: language,
    };
    this.notify();
  };

  get language(): SupportedLanguage {
    return this.state.selectedLanguage;
  }

  toggleTheme = () => {
    const nextTheme = this.state.theme === "dark" ? "light" : "dark";
    this.setTheme(nextTheme);
  };

  setTheme = (theme: "dark" | "light") => {
    this.state = {
      ...this.state,
      theme,
    };
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", theme);
    }
    this.notify();
  };

  setSelectedPlayer = (playerId: string) => {
    this.state = {
      ...this.state,
      selectedPlayerId: playerId,
    };
    this.notify();
  };

  setServerStatus = (status: Partial<ServerStatus>) => {
    this.state = {
      ...this.state,
      serverStatus: {
        ...this.state.serverStatus,
        ...status,
      },
    };
    this.notify();
  };

  setJudgeTourOpen = (isOpen: boolean) => {
    this.state = {
      ...this.state,
      isJudgeTourOpen: isOpen,
    };
    this.notify();
  };

  openJudgeTour = () => {
    this.setJudgeTourOpen(true);
  };

  closeJudgeTour = () => {
    this.setJudgeTourOpen(false);
  };

  setMatchClock = (sec: number) => {
    const clamped = Math.min(5400, Math.max(0, sec));
    const rawClock = this.state.currentFrame?.match_clock_sec ?? 0;
    const newOffset = clamped - rawClock;

    const rawEvents = (this.state.currentFrame as any)?.events || [];
    const rawShots = (this.state.currentFrame as any)?.shots || [];
    const filteredGoalscorers = extractGoalscorers(
      rawEvents,
      rawShots,
      this.state.homeLineup,
      this.state.awayLineup,
      clamped
    );

    let period = "1st Half";
    if (clamped >= 5400) {
      period = "Full Time";
    } else if (clamped >= 2700 && clamped < 2760) {
      period = "Halftime";
    } else if (clamped > 2700) {
      period = "2nd Half";
    }

    const dynamicInflections = extractTacticalInflections(
      rawEvents,
      clamped
    );

    this.state = {
      ...this.state,
      matchClock: clamped,
      clockOffset: newOffset,
      tacticalInflections: dynamicInflections.length > 0 ? dynamicInflections : (clamped === 0 ? [] : this.state.tacticalInflections),
      score: {
        ...this.state.score,
        homeScore: filteredGoalscorers.filter((g) => g.team === "home").length,
        awayScore: filteredGoalscorers.filter((g) => g.team === "away").length,
        period,
        goalscorers: filteredGoalscorers,
      },
    };
    this.notify();
  };

  updateScore = (updates: Partial<MatchScore>) => {
    this.state = {
      ...this.state,
      score: {
        ...this.state.score,
        ...updates,
      },
    };
    this.notify();
  };

  updateHeadToHeadStats = (stats: HeadToHeadStat[]) => {
    this.state = {
      ...this.state,
      headToHeadStats: stats,
    };
    this.notify();
  };

  // Helper selector: Get full details of currently selected player
  getSelectedPlayerProfile = (): PlayerProfile => {
    const all = [...this.state.homeLineup, ...this.state.awayLineup];
    const found = all.find((p) => p.id === this.state.selectedPlayerId);
    return found || this.state.homeLineup.find((p) => p.id === "home_8") || this.state.homeLineup[0]; // Default to K. De Bruyne (home_8) if not found
  };
}

export const baseMemory = new BaseMemoryStore();

/**
 * Universal React Hook connecting every screen and component to Single Base Memory
 */
export function useBaseMemory<T>(selector: (state: BaseMemoryState) => T): T {
  return useSyncExternalStore(
    baseMemory.subscribe,
    () => selector(baseMemory.getState()),
    () => selector(baseMemory.getState())
  );
}
