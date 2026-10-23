export const PITCH_LENGTH_METERS = 105.0;
export const PITCH_WIDTH_METERS = 68.0;

export interface Vector2D {
  x: number;
  y: number;
}

export interface PlayerAttributes {
  shoot: number;
  passing: number;
  dribbling: number;
  defending: number;
  shotAccuracyPct: number;
  avgRating: number;
}

export interface PlayerProfile {
  id: string;
  name: string;
  team: "home" | "away";
  number: number;
  pos: string; // GK, RB, CB, LB, DM, CM, RW, LW, ST, AM
  rating: number;
  x: number;
  y: number;
  speed_kmh?: number;
  is_ball_carrier?: boolean;
  attributes: PlayerAttributes;
}

export interface PlayerTelemetry {
  player_id: string;
  name: string;
  team: "home" | "away";
  shirt_number: number;
  position: string;
  x: number;
  y: number;
  velocity_mps: number;
  speed_kmh: number;
  heading_deg: number;
  is_ball_carrier?: boolean;
}

export interface BallTelemetry {
  x: number;
  y: number;
  z: number;
  velocity_mps: number;
  speed_kmh: number;
  carrier_player_id?: string | null;
}

export interface ControlChaosIndex {
  control: number;
  chaos: number;
}

export interface FrameTelemetry {
  frame_id: number;
  timestamp_ms: number;
  match_clock_sec: number;
  ball: BallTelemetry;
  players: PlayerTelemetry[];
  control_chaos: ControlChaosIndex;
  game_rhythm: string;
  active_tactical_inflection: boolean;
}

export interface TacticalBlackboard {
  latest_frame_id: number;
  current_game_rhythm: string;
  control_index: number;
  chaos_index: number;
  active_tactical_inflection: boolean;
  latest_pdr: number;
  narrative_headline: string;
  persona_overviews: {
    analyst: string;
    casual: string;
    player_cam: string;
    club_centric?: string;
  };
}

export interface TeamMetadata {
  name: string;
  shortCode: string;
  color: string;
  manager: string;
  formation: string;
}

export interface GoalscorerItem {
  player: string;
  minute: string;
  team: "home" | "away";
}

export interface MatchScore {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  period: string;
  homeMeta: TeamMetadata;
  awayMeta: TeamMetadata;
  date: string;
  time: string;
  competition: string;
  venue: string;
  goalscorers: GoalscorerItem[];
}

export interface HeadToHeadStat {
  label: string;
  home: string;
  away: string;
  homePct: number;
}

export interface MatchEventItem {
  id: string;
  time: string;
  timeSec: number;
  type: "goal" | "sub" | "card" | "inflection";
  player: string;
  playerId: string;
  team: "home" | "away";
  detail?: string;
  score?: string;
  subOut?: string;
}

export interface ShotMapItem {
  id: string;
  x: string;
  y: string;
  size: number;
  isGoal: boolean;
  label: string;
  playerId: string;
  playerName: string;
  minute: string;
  xG: number;
  xGOT: number;
  foot: "Left" | "Right" | "Header";
  team: "home" | "away";
}

export interface TacticalInflectionItem {
  time: string;
  timeSec: number;
  title: string;
  detail: string;
  impact: string;
}

export interface SwarmCommentaryItem {
  time: string;
  timeSec: number;
  agent: string;
  role: string;
  text: string;
}

export type PersonaMode = "analyst" | "casual" | "player_cam" | "club_centric";
export type SupportedLanguage = "en" | "es" | "fr" | "ja" | "ar";
