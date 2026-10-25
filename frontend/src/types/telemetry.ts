/**
 * Canonical Domain Types for Premier League Studio: Synthetic Match Insights Engine
 * Conforms strictly to CONTEXT.md and ADR 0001 - 0008.
 *
 * This module is the single shared contract between the frontend studio and the
 * `backend/` FastAPI service (ADR 0005). Any change here must be mirrored by
 * `backend/app/models.py` — the WebSocket payload is the same shape.
 */

export const PITCH_LENGTH_METERS = 105.0;
export const PITCH_WIDTH_METERS = 68.0;

export interface Vector2D {
  x: number;
  y: number;
}

export interface PitchPosition {
  x: number; // 0.0 to 105.0 meters (ADR 0003)
  y: number; // 0.0 to 68.0 meters (ADR 0003)
}

export type TeamSide = 'home' | 'away';

export type PlayerRole = 'GK' | 'DF' | 'MF' | 'FW';

export interface PlayerTelemetry extends PitchPosition {
  id: string;
  name: string;
  shortName: string;
  number: number;
  team: TeamSide;
  role: PlayerRole;
  /** Granular formation position, e.g. "LB", "AM", "ST". */
  position: string;
  vx: number; // velocity x (m/s)
  vy: number; // velocity y (m/s)
  speedKmH: number; // calculated speed in km/h
  distanceMeters: number; // cumulative distance
  touches: number; // touches on the ball this match
  // Formation anchor — the player is pulled back toward this point (ADR 0001).
  homeX: number;
  homeY: number;
  onBall: boolean;
  isDesignatedPlayerCam?: boolean;
}

export interface BallTelemetry extends PitchPosition {
  z: number; // height off pitch in meters
  vx: number;
  vy: number;
  vz: number;
  speedKmH: number;
  possessionTeam: TeamSide | null;
  possessionPlayerId: string | null;
  lastTouchBy: string | null;
}

export interface PassingLane {
  passerId: string;
  receiverId: string;
  passerPos: PitchPosition;
  receiverPos: PitchPosition;
  interceptionRisk: number; // 0.0 (open) to 1.0 (blocked)
  passDifficultyRating: number; // Pass Difficulty Rating (PDR) 0 to 100
  isClear: boolean;
  // Supporting evidence for the PDR composite (CONTEXT.md definition).
  corridorWidthM: number; // metres of clear corridor across the pass axis
  interceptorCount: number; // opponents within 1.5m of the corridor
  passerPressure: number; // 0.0 to 1.0 pressure on the passer
  receiverCoverage: number; // 0.0 to 1.0 coverage of the receiver
  defenderVelocityAlignment: number; // 0.0 to 1.0, opponent closing rate onto the pass axis
}

export interface PitchControlCell extends PitchPosition {
  controlScore: number; // -1.0 (full away control) to +1.0 (full home control)
  homeWeight: number;
  awayWeight: number;
}

/** Game Rhythm — the temporal pacing of match actions (CONTEXT.md). */
export type GameRhythm = 'Structured' | 'Fluid' | 'Transitional' | 'Chaotic';

export type MatchEventType =
  // Existing baseline
  | 'pass'
  | 'carry'
  | 'shot'
  | 'duel'
  | 'tackle'
  | 'interception'
  | 'foul'
  | 'goal'
  | 'turnover'
  | 'inflection'
  // Defensive
  | 'clearance'
  | 'block'
  | 'recovery'
  // Goalkeeping
  | 'save'
  | 'claim'
  | 'punch'
  | 'goal_kick'
  // Attacking
  | 'cross'
  | 'key_pass'
  | 'progressive_carry'
  | 'aerial_duel'
  // Set Pieces & Disciplinary
  | 'corner_kick'
  | 'free_kick'
  | 'yellow_card'
  | 'red_card'
  | 'offside';

export interface MatchEvent {
  id: string;
  type: MatchEventType;
  matchClock: string;
  timestampMs: number;
  team: TeamSide | null;
  actorId: string | null;
  targetId: string | null;
  x: number;
  y: number;
  /** Expected goals for shots. */
  xG?: number;
  /** Pass Difficulty Rating for pass events. */
  pdr?: number;
  completed?: boolean;
  /** The score at the moment the event happened. */
  score?: { home: number; away: number };
  description: string;
  pitchSector?: string;
  speedKmH?: number;
  subAction?: string;
  secondaryActorId?: string;
}

/**
 * A single shot, kept in full so the studio's Shoot Map and the match
 * summary can plot it. Every field is derived from the simulation.
 */
export interface ShotRecord extends PitchPosition {
  id: string;
  team: TeamSide;
  playerId: string;
  playerName: string;
  matchClock: string;
  timestampMs: number;
  /** Expected goals for this shot, 0-1. */
  xG: number;
  /** Metres from the goalmouth. */
  distanceToGoalM: number;
  outcome: 'goal' | 'saved' | 'missed';
  onTarget: boolean;
}

/**
 * Per-player match statistics. Derived from the simulation ledger, never
 * hand-authored.
 */
export interface PlayerMatchStats {
  id: string;
  name: string;
  shortName: string;
  number: number;
  team: TeamSide;
  role: PlayerRole;
  /** Granular formation position, e.g. "LB", "AM", "ST". */
  position: string;
  touches: number;
  passesAttempted: number;
  passesCompleted: number;
  shots: number;
  distanceMeters: number;
  topSpeedKmH: number;
  /** Match rating on the 0-10 studio scale. */
  rating: number;
}

export interface MatchMetrics {
  // Canonical: Control vs. Chaos Index (0 = ultra-structured possession, 100 = transitional chaos)
  controlVsChaosIndex: number;
  // Canonical: Pass Difficulty Rating (PDR) — weighted mean of the live lanes
  passDifficultyRating: number;
  // Canonical: Game Rhythm
  gameRhythm: GameRhythm;
  // Canonical: Pitch Control
  pitchControl: {
    home: number;
    away: number;
    contested: number;
  };
  // Tiered Fast-Path metrics (<50ms latency tracking)
  fastPathLatencyMs: number;
  // Deep AI Agent Reasoning latency (<1.5s tracking)
  agentReasoningLatencyMs: number;
  // Derived match statistics
  possessionShare: { home: number; away: number };
  passCompletion: { home: number; away: number };
  shotCount: { home: number; away: number };
  duelCount: number;
  topSprintKmH: number;
  ballProgressionM: number;
}

export type ExperiencePersona =
  | 'analyst'
  | 'casual'
  | 'player_cam'
  | 'club_centric';

export type BroadcastLanguage = 'en' | 'es' | 'fr' | 'ja' | 'ar';

export interface MultilingualNarrative {
  en: string;
  es: string;
  fr: string;
  ja: string;
  ar: string;
}

export interface NarrativeEvent {
  id: string;
  matchClock: string; // e.g. "68:42" — authoritative for the moment described
  timestamp: number;
  // Canonical: Tactical Inflection Point flag
  isTacticalInflectionPoint: boolean;
  headline: MultilingualNarrative;
  tacticalExplanation: MultilingualNarrative;
  // Persona specific tailored insights
  analystContext: string;
  casualContext: string;
  /** The Player Cam persona reads from the pitch, not from the numbers. */
  playerCamContext: string;
  clubCentricContext: {
    homeFrame: string;
    awayFrame: string;
  };
}

/**
 * Broadcast Overlay — a synchronized, machine-readable graphical payload
 * (CONTEXT.md). This is the Stage 4 artefact consumed by broadcast graphic
 * engines; it is not a UI component.
 */
export interface BroadcastOverlayPayload {
  overlayId: string;
  schemaVersion: string;
  /** Milliseconds since the start of the match, for sync against match video. */
  syncTimestampMs: number;
  matchClock: string;
  lowerThird: {
    headline: string;
    subline: string;
    speaker: string;
  };
  scoreBug: {
    home: string;
    away: string;
    homeScore: number;
    awayScore: number;
  };
  metrics: {
    controlVsChaosIndex: number;
    passDifficultyRating: number;
    pitchControl: { home: number; away: number; contested: number };
  };
  languages: Partial<Record<BroadcastLanguage, string>>;
  commentatorCue: string;
}

/**
 * Agent swarm trace (ADR 0002, ADR 0006). Rendered by the studio so the
 * four-agent architecture is visible rather than merely asserted.
 */
export type AgentRole =
  | 'telemetry_ingestion'
  | 'tactical_reasoning'
  | 'broadcast_narrative'
  | 'fan_personalization';

export interface AgentTrace {
  role: AgentRole;
  label: string;
  status: 'idle' | 'running' | 'complete' | 'fallback';
  latencyMs: number;
  /** Shared tactical state keys this agent read or wrote (the blackboard). */
  reads: string[];
  writes: string[];
  summary: string;
}

export type SyntheticScenarioType =
  | 'high_possession'
  | 'counter_attack_transition'
  | 'low_block_siege'
  | 'box_scramble';

export interface TelemetryFrame {
  frameId: number;
  matchClock: string;
  /** Absolute elapsed match seconds — the clock authority, with minute rollover. */
  matchSeconds: number;
  scenario: SyntheticScenarioType;
  score: { home: number; away: number };
  ball: BallTelemetry;
  players: PlayerTelemetry[];
  passingLanes: PassingLane[];
  pitchControlCells: PitchControlCell[];
  /** Most recent discrete match events, newest last. */
  events: MatchEvent[];
  /** Every shot taken in the fixture, for the Shoot Map. */
  shots: ShotRecord[];
  /** Per-player match statistics, for the Player Spotlight and Formation cards. */
  playerStats: PlayerMatchStats[];
  metrics: MatchMetrics;
  latestNarrative: NarrativeEvent;
  agentTrace: AgentTrace[];
}

/**
 * Studio Kinematics & Blackboard Types
 * Used by Ionic React Visualizer components and high-frequency canvas.
 */

export interface PlayerKinematics {
  player_id: string;
  name: string;
  team: 'home' | 'away';
  shirt_number: number;
  position: string;
  x: number;
  y: number;
  velocity_mps: number;
  speed_kmh: number;
  heading_deg: number;
  is_ball_carrier?: boolean;

  // Canonical Pydantic fields compatibility
  id?: string;
  number?: number;
  onBall?: boolean;
  vx?: number;
  vy?: number;
  speedKmH?: number;
  shortName?: string;
  role?: string;
  distanceMeters?: number;
  touches?: number;
}

export interface BallKinematics {
  x: number;
  y: number;
  z: number;
  velocity_mps: number;
  speed_kmh: number;
  carrier_player_id?: string | null;

  // Canonical Pydantic fields compatibility
  vx?: number;
  vy?: number;
  vz?: number;
  speedKmH?: number;
  possessionTeam?: TeamSide | null;
  possessionPlayerId?: string | null;
}

export interface ControlChaosIndex {
  control: number;
  chaos: number;
}

export interface FrameTelemetry {
  frame_id: number;
  timestamp_ms: number;
  match_clock_sec: number;
  ball: BallKinematics;
  players: PlayerKinematics[];
  control_chaos: ControlChaosIndex;
  game_rhythm: string;
  active_tactical_inflection: boolean;

  // Canonical Pydantic fields compatibility
  frameId?: number;
  matchClock?: string;
  matchSeconds?: number;
  scenario?: string;
  score?: { home: number; away: number };
  passingLanes?: PassingLane[];
  pitchControlCells?: PitchControlCell[];
  metrics?: MatchMetrics;
  latestNarrative?: NarrativeEvent;
  agentTrace?: AgentTrace[];
  events?: MatchEvent[];
  shots?: ShotRecord[];
  playerStats?: PlayerMatchStats[];
}

export interface TacticalBlackboard {
  latest_frame_id: number;
  current_game_rhythm: string;
  control_index: number;
  chaos_index: number;
  active_tactical_inflection: boolean;
  latest_pdr: number;
  narrative_headline: string;
  narrative_explanation?: string;
  narrative_multilingual?: {
    headline?: Record<string, string>;
    tacticalExplanation?: Record<string, string>;
  };
  persona_overviews: {
    analyst: string;
    casual: string;
    player_cam: string;
    club_centric?: string;
  };
}

export type PersonaMode = ExperiencePersona;
export type SupportedLanguage = BroadcastLanguage;
export type StudioPlayerTelemetry = PlayerKinematics;
export type StudioBallTelemetry = BallKinematics;

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
  team: 'home' | 'away';
  number: number;
  pos: string;
  rating: number;
  x: number;
  y: number;
  speed_kmh?: number;
  is_ball_carrier?: boolean;
  attributes: PlayerAttributes;
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
  team: 'home' | 'away';
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
  type: 'goal' | 'sub' | 'card' | 'inflection';
  player: string;
  playerId: string;
  team: 'home' | 'away';
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
  foot: 'Left' | 'Right' | 'Header';
  team: 'home' | 'away';
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

