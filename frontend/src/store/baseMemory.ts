import { useSyncExternalStore } from "react";
import {
  FrameTelemetry,
  PlayerTelemetry,
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

const initialState: BaseMemoryState = {
  matchClock: 1458, // 24:18 min
  isPlaying: true,
  clockOffset: 1458,
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

  updateFrame = (frame: FrameTelemetry) => {
    // If user paused playback, freeze updates
    if (!this.state.isPlaying) {
      return;
    }

    // Map live tracking positions to team lineups
    const playerMap = new Map<string, PlayerTelemetry>();
    if (frame.players && Array.isArray(frame.players)) {
      for (const p of frame.players) {
        playerMap.set(p.player_id, p);
      }
    }

    const updatedHome = this.state.homeLineup.map((p) => {
      const live = playerMap.get(p.id);
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
      const live = playerMap.get(p.id);
      if (!live) return p;
      return {
        ...p,
        x: Math.round((live.x / 105.0) * 1000) / 10,
        y: Math.round((live.y / 68.0) * 1000) / 10,
        speed_kmh: live.speed_kmh,
        is_ball_carrier: live.is_ball_carrier,
      };
    });

    // If a synthetic scenario is active, preserve its macro tactical values
    const ctrl = this.state.activeScenario ? this.state.blackboard.control_index : frame.control_chaos.control;
    const chs = this.state.activeScenario ? this.state.blackboard.chaos_index : frame.control_chaos.chaos;
    const rhythm = this.state.activeScenario ? this.state.blackboard.current_game_rhythm : frame.game_rhythm;
    const activeInflection = this.state.activeScenario ? true : frame.active_tactical_inflection;

    const possHome = Math.min(75, Math.max(35, Math.round(ctrl * 0.4 + 35)));
    const pcHome = Math.min(80, Math.max(30, Math.round(ctrl * 0.5 + 30)));

    const updatedStats = this.state.headToHeadStats.map((st) => {
      if (st.label === "Possession") {
        return { ...st, home: `${possHome}%`, away: `${100 - possHome}%`, homePct: possHome };
      }
      if (st.label === "Pitch Control") {
        return { ...st, home: `${pcHome}%`, away: `${100 - pcHome}%`, homePct: pcHome };
      }
      if (st.label === "Control vs. Chaos Index") {
        return { ...st, home: `${Math.round(ctrl)}%`, away: `${Math.round(chs)}%`, homePct: Math.round(ctrl) };
      }
      return st;
    });

    // Effective clock incorporates user scrub seek offset
    const effectiveClock = Math.max(0, frame.match_clock_sec + this.state.clockOffset);

    this.state = {
      ...this.state,
      currentFrame: frame,
      matchClock: effectiveClock,
      homeLineup: updatedHome,
      awayLineup: updatedAway,
      headToHeadStats: updatedStats,
      blackboard: {
        ...this.state.blackboard,
        latest_frame_id: frame.frame_id,
        current_game_rhythm: rhythm,
        control_index: ctrl,
        chaos_index: chs,
        active_tactical_inflection: activeInflection,
      },
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
      this.scenarioCommandHandler({ command: "inject_scenario", scenario: scenarioId });
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
      this.scenarioCommandHandler({ command: "reset_scenario" });
    }

    this.notify();
  };

  updateBlackboard = (blackboardUpdates: Partial<TacticalBlackboard>) => {
    this.state = {
      ...this.state,
      blackboard: {
        ...this.state.blackboard,
        ...blackboardUpdates,
      },
    };
    this.notify();
  };

  setPersona = (persona: PersonaMode) => {
    this.state = {
      ...this.state,
      selectedPersona: persona,
    };
    this.notify();
  };

  setLanguage = (language: SupportedLanguage) => {
    this.state = {
      ...this.state,
      selectedLanguage: language,
    };
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
    const rawClock = this.state.currentFrame?.match_clock_sec ?? 0;
    const newOffset = sec - rawClock;
    this.state = {
      ...this.state,
      matchClock: sec,
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
