import { useSyncExternalStore } from "react";
import {
  FrameTelemetry,
  PlayerTelemetry,
  PlayerKinematics,
  TacticalBlackboard,
  PersonaMode,
  SupportedLanguage,
  MatchScore,
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
  { id: "home_7", number: 17, name: "K. De Bruyne", pos: "CM", rating: 8.8, x: 38, y: 30, team: "home", attributes: { shoot: 86, passing: 96, dribbling: 87, defending: 64, shotAccuracyPct: 82, avgRating: 8.8 } },
  { id: "home_8", number: 20, name: "B. Silva", pos: "CM", rating: 7.9, x: 38, y: 70, team: "home", attributes: { shoot: 74, passing: 89, dribbling: 91, defending: 72, shotAccuracyPct: 70, avgRating: 7.9 } },
  { id: "home_9", number: 47, name: "P. Foden", pos: "RW", rating: 8.2, x: 45, y: 18, team: "home", attributes: { shoot: 84, passing: 86, dribbling: 89, defending: 58, shotAccuracyPct: 80, avgRating: 8.2 } },
  { id: "home_10", number: 9, name: "E. Haaland", pos: "ST", rating: 8.5, x: 44, y: 50, team: "home", attributes: { shoot: 94, passing: 68, dribbling: 80, defending: 45, shotAccuracyPct: 88, avgRating: 8.5 } },
  { id: "home_11", number: 10, name: "J. Grealish", pos: "LW", rating: 7.5, x: 45, y: 82, team: "home", attributes: { shoot: 72, passing: 83, dribbling: 88, defending: 52, shotAccuracyPct: 68, avgRating: 7.5 } },
];

const initialAwayLineup: PlayerProfile[] = [
  { id: "away_1", number: 22, name: "D. Raya", pos: "GK", rating: 6.9, x: 92, y: 50, team: "away", attributes: { shoot: 18, passing: 84, dribbling: 42, defending: 68, shotAccuracyPct: 40, avgRating: 6.9 } },
  { id: "away_2", number: 4, name: "B. White", pos: "RB", rating: 6.8, x: 78, y: 84, team: "away", attributes: { shoot: 50, passing: 79, dribbling: 74, defending: 81, shotAccuracyPct: 55, avgRating: 6.8 } },
  { id: "away_3", number: 2, name: "W. Saliba", pos: "CB", rating: 7.3, x: 81, y: 62, team: "away", attributes: { shoot: 38, passing: 85, dribbling: 71, defending: 88, shotAccuracyPct: 48, avgRating: 7.3 } },
  { id: "away_4", number: 6, name: "Gabriel", pos: "CB", rating: 7.2, x: 81, y: 38, team: "away", attributes: { shoot: 52, passing: 78, dribbling: 66, defending: 86, shotAccuracyPct: 56, avgRating: 7.2 } },
  { id: "away_5", number: 12, name: "J. Timber", pos: "LB", rating: 6.9, x: 78, y: 16, team: "away", attributes: { shoot: 54, passing: 81, dribbling: 78, defending: 80, shotAccuracyPct: 58, avgRating: 6.9 } },
  { id: "away_6", number: 5, name: "T. Partey", pos: "DM", rating: 7.0, x: 68, y: 65, team: "away", attributes: { shoot: 68, passing: 84, dribbling: 79, defending: 83, shotAccuracyPct: 62, avgRating: 7.0 } },
  { id: "away_7", number: 41, name: "D. Rice", pos: "DM", rating: 7.6, x: 68, y: 35, team: "away", attributes: { shoot: 72, passing: 86, dribbling: 80, defending: 87, shotAccuracyPct: 70, avgRating: 7.6 } },
  { id: "away_8", number: 7, name: "B. Saka", pos: "RW", rating: 8.0, x: 56, y: 82, team: "away", attributes: { shoot: 85, passing: 85, dribbling: 89, defending: 62, shotAccuracyPct: 81, avgRating: 8.0 } },
  { id: "away_9", number: 8, name: "M. Ødegaard", pos: "AM", rating: 7.7, x: 62, y: 50, team: "away", attributes: { shoot: 80, passing: 91, dribbling: 86, defending: 64, shotAccuracyPct: 77, avgRating: 7.7 } },
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

const initialTimelineEvents: MatchEventItem[] = [
  { id: "e1", time: "90'+1", timeSec: 5460, type: "card", player: "E. Eze", playerId: "away_2", team: "away", detail: "Tactical breakdown" },
  { id: "e2", time: "88'", timeSec: 5280, type: "sub", player: "A. Diallo", playerId: "away_7", team: "away", subOut: "N. Mazraoui" },
  { id: "e3", time: "87'", timeSec: 5220, type: "goal", player: "K. De Bruyne", playerId: "home_7", team: "home", score: "2 - 3" },
  { id: "e4", time: "84'", timeSec: 5040, type: "goal", player: "B. Saka", playerId: "away_8", team: "away", score: "2 - 2" },
  { id: "e5", time: "81'", timeSec: 4860, type: "sub", player: "P. Dorgu", playerId: "away_5", team: "away", subOut: "B. Sesko" },
  { id: "e6", time: "75'", timeSec: 4500, type: "sub", player: "J. Grealish", playerId: "home_11", team: "home", subOut: "P. Foden" },
  { id: "e7", time: "69'", timeSec: 4140, type: "goal", player: "E. Haaland", playerId: "home_10", team: "home", score: "1 - 2" },
  { id: "e8", time: "64'", timeSec: 3840, type: "card", player: "D. Rice", playerId: "away_7", team: "away", detail: "Yellow card" },
  { id: "e9", time: "42'", timeSec: 2520, type: "goal", player: "E. Haaland", playerId: "home_10", team: "home", score: "1 - 0" },
];

const initialShotMapEvents: ShotMapItem[] = [
  { id: "s1", x: "48%", y: "25%", size: 18, isGoal: true, label: "Goal", playerId: "home_10", playerName: "E. Haaland", minute: "42'", xG: 0.74, xGOT: 0.81, foot: "Left", team: "home" },
  { id: "s2", x: "42%", y: "45%", size: 14, isGoal: false, label: "Saved", playerId: "home_7", playerName: "K. De Bruyne", minute: "31'", xG: 0.28, xGOT: 0.35, foot: "Right", team: "home" },
  { id: "s3", x: "58%", y: "35%", size: 10, isGoal: false, label: "Blocked", playerId: "home_9", playerName: "P. Foden", minute: "19'", xG: 0.15, xGOT: 0.0, foot: "Left", team: "home" },
  { id: "s4", x: "32%", y: "55%", size: 8, isGoal: false, label: "Miss", playerId: "home_8", playerName: "B. Silva", minute: "14'", xG: 0.09, xGOT: 0.0, foot: "Left", team: "home" },
  { id: "s5", x: "65%", y: "60%", size: 12, isGoal: false, label: "Saved", playerId: "home_6", playerName: "Rodri", minute: "8'", xG: 0.12, xGOT: 0.22, foot: "Right", team: "home" },
  { id: "s6", x: "52%", y: "30%", size: 16, isGoal: true, label: "Goal", playerId: "away_8", playerName: "B. Saka", minute: "84'", xG: 0.58, xGOT: 0.72, foot: "Left", team: "away" },
  { id: "s7", x: "40%", y: "42%", size: 12, isGoal: false, label: "Saved", playerId: "away_11", playerName: "K. Havertz", minute: "62'", xG: 0.32, xGOT: 0.41, foot: "Header", team: "away" },
  { id: "s8", x: "60%", y: "52%", size: 10, isGoal: false, label: "Blocked", playerId: "away_10", playerName: "G. Martinelli", minute: "54'", xG: 0.18, xGOT: 0.0, foot: "Right", team: "away" },
];

const initialTacticalInflections: TacticalInflectionItem[] = [
  {
    time: "42'",
    timeSec: 2520,
    title: "Low-Block Breakthrough",
    detail: "Haaland finished from 11m following a 14-pass sequence. Shot xG: 0.74, Pass Difficulty Rating: 88%.",
    impact: "Home Momentum +28%",
  },
  {
    time: "69'",
    timeSec: 4140,
    title: "Flank Overload Adjustment",
    detail: "Guardiola introduced Grealish to stretch Arsenal's 4-2-3-1, creating space for De Bruyne's curling strike.",
    impact: "Control Index 74%",
  },
  {
    time: "84'",
    timeSec: 5040,
    title: "Rapid Counter-Transition",
    detail: "Saka broke City's rest-defense in 4 touches, punishing high line positioning with an equalizer.",
    impact: "Game Rhythm Shift",
  },
];

const initialSwarmCommentary: SwarmCommentaryItem[] = [
  { time: "88'", timeSec: 5280, agent: "Tactical Agent", role: "Shape Analyst", text: "Arsenal shifted into a narrow 4-4-2 block to restrict central progression, forcing City wide." },
  { time: "84'", timeSec: 5040, agent: "Narrative Agent", role: "Story Synthesizer", text: "Saka's clinical counter-attack punctures City's momentum and restores emotional equilibrium." },
  { time: "69'", timeSec: 4140, agent: "Telemetry Agent", role: "Spatial Tracking", text: "Centroid compression detected: City squeezed Arsenal's defensive line within 18 meters." },
  { time: "42'", timeSec: 2520, agent: "Personalization Agent", role: "Casual Focus", text: "Haaland's lethal instinct on display! 10th Premier League goal of the campaign in emphatic fashion." },
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
    homeScore: 1,
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
    goalscorers: [
      { player: "E. Haaland", minute: "42'", team: "home" },
      { player: "K. De Bruyne", minute: "68'", team: "home" },
      { player: "B. Saka", minute: "51'", team: "away" },
    ],
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
  selectedPlayerId: "home_7",
  activeScenario: null,
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

    const normalizePlayerId = (id: string | undefined): string => {
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

    // Synchronize dynamic shots if provided by simulation
    let updatedShots = this.state.shotMapEvents;
    if ((rawFrame as any).shots && Array.isArray((rawFrame as any).shots) && (rawFrame as any).shots.length > 0) {
      updatedShots = (rawFrame as any).shots.map((s: any, idx: number) => ({
        id: s.id || `s_${idx}`,
        x: `${Math.round((s.x / 105.0) * 100)}%`,
        y: `${Math.round((s.y / 68.0) * 100)}%`,
        size: Math.round(10 + (s.xG || 0.3) * 12),
        isGoal: s.outcome === "goal",
        label: s.outcome === "goal" ? "Goal" : (s.outcome === "saved" ? "Saved" : "Miss"),
        playerId: normalizePlayerId(s.playerId),
        playerName: s.playerName,
        minute: s.matchClock || `${Math.floor(s.timestampMs / 60000)}'`,
        xG: s.xG,
        xGOT: s.outcome === "goal" ? Math.min(0.99, s.xG + 0.15) : 0,
        foot: "Right",
        team: s.team,
      }));
    }

    // Synchronize dynamic events if provided by simulation
    let updatedEvents = this.state.timelineEvents;
    if ((rawFrame as any).events && Array.isArray((rawFrame as any).events) && (rawFrame as any).events.length > 0) {
      updatedEvents = (rawFrame as any).events.slice(-15).reverse().map((ev: any, idx: number) => ({
        id: ev.id || `ev_${idx}`,
        time: ev.matchClock || `${Math.floor(ev.timestampMs / 60000)}'`,
        timeSec: Math.floor((ev.timestampMs || 0) / 1000),
        type: ev.type === "goal" ? "goal" : (ev.type.includes("card") ? "card" : "sub"),
        player: ev.description?.split(" ")[0] || "Player",
        playerId: normalizePlayerId(ev.actorId || "home_7"),
        team: ev.team || "home",
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

    const liveScore = (rawFrame as any).score;
    const updatedScore = liveScore && typeof liveScore.home === "number" && typeof liveScore.away === "number"
      ? {
          ...this.state.score,
          homeScore: liveScore.home,
          awayScore: liveScore.away,
        }
      : this.state.score;

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
    } else if (scenarioId === "rapid_counter") {
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
    } else if (scenarioId === "box_scramble") {
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
        counter_attack_transition: "counter_attack_transition",
        red_card_crisis: "low_block_siege",
        box_scramble: "box_scramble",
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

  setMatchClock = (sec: number) => {
    const clamped = Math.min(5400, Math.max(0, sec));
    const rawClock = this.state.currentFrame?.match_clock_sec ?? 0;
    const newOffset = clamped - rawClock;
    this.state = {
      ...this.state,
      matchClock: clamped,
      clockOffset: newOffset,
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
    return found || this.state.homeLineup[6]; // Default to K. De Bruyne (home_7) if not found
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
