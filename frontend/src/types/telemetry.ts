/**
 * Canonical Domain Types for Premier League Studio: Synthetic Match Insights Engine
 * Conforms strictly to CONTEXT.md and ADR 0001 - 0008.
 */

export interface PitchPosition {
  x: number; // 0.0 to 105.0 meters (ADR 0003)
  y: number; // 0.0 to 68.0 meters (ADR 0003)
}

export type TeamSide = 'home' | 'away';

export interface PlayerTelemetry extends PitchPosition {
  id: string;
  name: string;
  number: number;
  team: TeamSide;
  role: 'GK' | 'DF' | 'MF' | 'FW';
  vx: number; // velocity x (m/s)
  vy: number; // velocity y (m/s)
  speedKmH: number; // calculated speed in km/h
  distanceMeters: number; // cumulative distance
  isDesignatedPlayerCam?: boolean;
}

export interface BallTelemetry extends PitchPosition {
  z: number; // height off pitch in meters
  vx: number;
  vy: number;
  vz: number;
  speedKmH: number;
}

export interface PassingLane {
  passerId: string;
  receiverId: string;
  passerPos: PitchPosition;
  receiverPos: PitchPosition;
  interceptionRisk: number; // 0.0 (open) to 1.0 (blocked)
  passDifficultyRating: number; // Pass Difficulty Rating (PDR) 0 to 100
  isClear: boolean;
}

export interface PitchControlCell {
  x: number;
  y: number;
  controlScore: number; // -1.0 (full away control) to +1.0 (full home control)
}

export interface MatchMetrics {
  // Canonical: Control vs. Chaos Index (0 = ultra-structured possession, 100 = transitional chaos)
  controlVsChaosIndex: number;
  // Canonical: Pass Difficulty Rating (PDR) average for current sequence
  passDifficultyRating: number;
  // Canonical: Game Rhythm (possession pace, passes per minute, transition urgency)
  gameRhythm: 'Structured' | 'Fluid' | 'High Intensity' | 'Chaotic Break';
  // Canonical: Pitch Control dominance percentages
  pitchControl: {
    homePercentage: number;
    awayPercentage: number;
    contestedPercentage: number;
  };
  // Tiered Fast-Path metrics (<50ms latency tracking)
  fastPathLatencyMs: number;
  // Deep AI Agent Reasoning latency (<1.5s tracking)
  agentReasoningLatencyMs: number;
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
  matchClock: string; // e.g. "68:42"
  timestamp: number;
  // Canonical: Tactical Inflection Point flag
  isTacticalInflectionPoint: boolean;
  headline: MultilingualNarrative;
  tacticalExplanation: MultilingualNarrative;
  // Persona specific tailored insights
  analystContext: string;
  casualContext: string;
  clubCentricContext: {
    homeFrame: string;
    awayFrame: string;
  };
}

export type SyntheticScenarioType = 
  | 'high_possession' 
  | 'counter_attack_transition' 
  | 'low_block_siege'
  | 'box_scramble';

export interface TelemetryFrame {
  frameId: number;
  matchClock: string;
  scenario: SyntheticScenarioType;
  ball: BallTelemetry;
  players: PlayerTelemetry[];
  passingLanes: PassingLane[];
  metrics: MatchMetrics;
  latestNarrative: NarrativeEvent;
}
