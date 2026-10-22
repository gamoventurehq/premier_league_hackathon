export const PITCH_LENGTH_METERS = 105.0;
export const PITCH_WIDTH_METERS = 68.0;

export interface Vector2D {
  x: number;
  y: number;
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

export type PersonaMode = "analyst" | "casual" | "player_cam" | "club_centric";
export type SupportedLanguage = "en" | "es" | "fr" | "ja" | "ar";
