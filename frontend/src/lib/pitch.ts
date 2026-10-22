/**
 * Pitch geometry, squad definitions and scenario formations.
 *
 * Coordinate system (ADR 0003): a 105m x 68m pitch, origin at the centre of
 * the HOME goal line. `x` runs 0 -> 105 (home attacks towards +x, away towards
 * -x), `y` runs 0 -> 68 across the touchlines.
 */

import { PlayerRole, SyntheticScenarioType, TeamSide } from '../types/telemetry';

export const PITCH_LENGTH = 105;
export const PITCH_WIDTH = 68;
export const PITCH_CENTRE_X = PITCH_LENGTH / 2;
export const PITCH_CENTRE_Y = PITCH_WIDTH / 2;

export const HOME_GOAL = { x: 0, y: PITCH_CENTRE_Y };
export const AWAY_GOAL = { x: PITCH_LENGTH, y: PITCH_CENTRE_Y };

/** Goal mouth half-width, used for shot angle. */
export const GOAL_HALF_WIDTH = 3.66;

/** Distance from a goal line beyond which a position counts as "final third". */
export const FINAL_THIRD_THRESHOLD = 70;

/** Metres of clearance either side of a Passing Lane that counts as an interceptor. */
export const CORRIDOR_INTERCEPT_RADIUS = 1.5;

/** Maximum sprint speed assumed for Pitch Control weighting (m/s). */
export const MAX_SPRINT_SPEED = 8.5;

export type SlotLine = 'gk' | 'def' | 'mid' | 'fwd';

export interface SquadPlayer {
  id: string;
  name: string;
  shortName: string;
  number: number;
  team: TeamSide;
  role: PlayerRole;
  slot: SlotLine;
  /** Granular formation position, e.g. "RB", "AM", "ST". */
  position: string;
  /** Normalised lateral position, 0 = one touchline, 1 = the other. */
  lateral: number;
  /** Metres of forward bias applied on top of the line height. */
  bias: number;
}

export const SQUAD: SquadPlayer[] = [
  // Manchester City (home, attacks towards +x)
  { id: 'h1', name: 'Ederson', shortName: 'Ederson', number: 31, team: 'home', role: 'GK', slot: 'gk', position: 'GK', lateral: 0.5, bias: 0 },
  { id: 'h2', name: 'Kyle Walker', shortName: 'Walker', number: 2, team: 'home', role: 'DF', slot: 'def', position: 'RB', lateral: 0.16, bias: 0 },
  { id: 'h3', name: 'Rúben Dias', shortName: 'Dias', number: 3, team: 'home', role: 'DF', slot: 'def', position: 'RCB', lateral: 0.38, bias: 0 },
  { id: 'h4', name: 'Manuel Akanji', shortName: 'Akanji', number: 25, team: 'home', role: 'DF', slot: 'def', position: 'LCB', lateral: 0.60, bias: 0 },
  { id: 'h5', name: 'Josko Gvardiol', shortName: 'Gvardiol', number: 24, team: 'home', role: 'DF', slot: 'def', position: 'LB', lateral: 0.84, bias: 0 },
  { id: 'h6', name: 'Rodri', shortName: 'Rodri', number: 16, team: 'home', role: 'MF', slot: 'mid', position: 'CDM', lateral: 0.44, bias: 0 },
  { id: 'h7', name: 'Bernardo Silva', shortName: 'Bernardo', number: 20, team: 'home', role: 'MF', slot: 'mid', position: 'RCM', lateral: 0.70, bias: 2 },
  { id: 'h8', name: 'Kevin De Bruyne', shortName: 'De Bruyne', number: 17, team: 'home', role: 'MF', slot: 'mid', position: 'AM', lateral: 0.26, bias: 9 },
  { id: 'h9', name: 'Phil Foden', shortName: 'Foden', number: 47, team: 'home', role: 'FW', slot: 'fwd', position: 'RW', lateral: 0.16, bias: 0 },
  { id: 'h10', name: 'Jack Grealish', shortName: 'Grealish', number: 10, team: 'home', role: 'FW', slot: 'fwd', position: 'LW', lateral: 0.48, bias: 0 },
  { id: 'h11', name: 'Erling Haaland', shortName: 'Haaland', number: 9, team: 'home', role: 'FW', slot: 'fwd', position: 'ST', lateral: 0.80, bias: 0 },

  // Arsenal (away, attacks towards -x)
  { id: 'a1', name: 'David Raya', shortName: 'Raya', number: 22, team: 'away', role: 'GK', slot: 'gk', position: 'GK', lateral: 0.5, bias: 0 },
  { id: 'a2', name: 'Ben White', shortName: 'White', number: 4, team: 'away', role: 'DF', slot: 'def', position: 'RB', lateral: 0.16, bias: 0 },
  { id: 'a3', name: 'William Saliba', shortName: 'Saliba', number: 2, team: 'away', role: 'DF', slot: 'def', position: 'RCB', lateral: 0.38, bias: 0 },
  { id: 'a4', name: 'Gabriel', shortName: 'Gabriel', number: 6, team: 'away', role: 'DF', slot: 'def', position: 'LCB', lateral: 0.60, bias: 0 },
  { id: 'a5', name: 'Jurriën Timber', shortName: 'Timber', number: 12, team: 'away', role: 'DF', slot: 'def', position: 'LB', lateral: 0.84, bias: 0 },
  { id: 'a6', name: 'Thomas Partey', shortName: 'Partey', number: 5, team: 'away', role: 'MF', slot: 'mid', position: 'CDM', lateral: 0.36, bias: 0 },
  { id: 'a7', name: 'Declan Rice', shortName: 'Rice', number: 41, team: 'away', role: 'MF', slot: 'mid', position: 'RCM', lateral: 0.56, bias: 0 },
  { id: 'a8', name: 'Martin Ødegaard', shortName: 'Ødegaard', number: 8, team: 'away', role: 'MF', slot: 'mid', position: 'AM', lateral: 0.76, bias: 7 },
  { id: 'a9', name: 'Bukayo Saka', shortName: 'Saka', number: 7, team: 'away', role: 'FW', slot: 'fwd', position: 'RW', lateral: 0.16, bias: 0 },
  { id: 'a10', name: 'Gabriel Martinelli', shortName: 'Martinelli', number: 11, team: 'away', role: 'FW', slot: 'fwd', position: 'LW', lateral: 0.44, bias: 0 },
  { id: 'a11', name: 'Kai Havertz', shortName: 'Havertz', number: 29, team: 'away', role: 'FW', slot: 'fwd', position: 'ST', lateral: 0.72, bias: 0 },
];

/**
 * The shape of a team in a given Synthetic Match Scenario.
 *
 * `def` / `mid` / `fwd` are the x distances from the team's OWN goal line at
 * which each line sits. `spread` widens the lateral spacing of the shape.
 */
export interface TeamShape {
  gk: number;
  def: number;
  mid: number;
  fwd: number;
  spread: number;
  /** How far the whole shape slides towards the ball, in metres. */
  ballShift: number;
}

export interface ScenarioProfile {
  /** The match moment this Synthetic Match Scenario is anchored to. */
  anchorSeconds: number;
  home: TeamShape;
  away: TeamShape;
  /** Baseline probability that the home team is the one in possession. */
  homePossession: number;
  /** Average seconds a player holds the ball before a decision is taken. */
  decisionInterval: number;
  /** Preference for forward passes, 0 (safe) to 1 (vertical). */
  verticality: number;
  /** Multiplier on the chance a pass is intercepted. */
  interceptionBias: number;
  /**
   * How much harder the side without the ball makes the favoured side's
   * circulation work. 0 means the two sides are treated identically;
   * 0.1 is the edge that turns `homePossession` into a visible split.
   */
  possessionEdge: number;
  /** Multiplier on the chance a possession sequence ends in a shot. */
  shotBias: number;
  /** Multiplier on how aggressively opponents close down the carrier. */
  pressIntensity: number;
  /** Chance per decision of a loose-ball duel. */
  duelRate: number;
  /** Multiplier on ball speed. */
  tempo: number;
  label: string;
}

export const SCENARIOS: Record<SyntheticScenarioType, ScenarioProfile> = {
  high_possession: {
    anchorSeconds: 68 * 60 + 40,
    home: { gk: 5, def: 18, mid: 40, fwd: 62, spread: 1.18, ballShift: 6 },
    away: { gk: 5, def: 20, mid: 44, fwd: 60, spread: 0.82, ballShift: 4 },
    homePossession: 0.78,
    decisionInterval: 2.1,
    verticality: 0.52,
    interceptionBias: 0.9,
    possessionEdge: 0.12,
    shotBias: 1.0,
    pressIntensity: 0.85,
    duelRate: 0.14,
    tempo: 0.95,
    label: 'Sustained High Possession',
  },
  counter_attack_transition: {
    anchorSeconds: 74 * 60 + 10,
    home: { gk: 5, def: 16, mid: 38, fwd: 60, spread: 1.22, ballShift: 9 },
    away: { gk: 5, def: 18, mid: 38, fwd: 66, spread: 1.05, ballShift: 8 },
    homePossession: 0.34,
    decisionInterval: 1.1,
    verticality: 0.86,
    interceptionBias: 1.55,
    possessionEdge: 0.10,
    shotBias: 1.35,
    pressIntensity: 1.5,
    duelRate: 0.42,
    tempo: 1.45,
    label: 'Counter-Attack Transition',
  },
  low_block_siege: {
    anchorSeconds: 82 * 60 + 5,
    home: { gk: 5, def: 18, mid: 44, fwd: 66, spread: 1.26, ballShift: 5 },
    away: { gk: 5, def: 14, mid: 32, fwd: 56, spread: 0.62, ballShift: 2 },
    homePossession: 0.85,
    decisionInterval: 2.8,
    verticality: 0.3,
    interceptionBias: 1.35,
    possessionEdge: 0.14,
    shotBias: 0.75,
    pressIntensity: 0.6,
    duelRate: 0.1,
    tempo: 0.8,
    label: 'Low-Block Defensive Wall',
  },
  box_scramble: {
    anchorSeconds: 89 * 60 + 50,
    home: { gk: 5, def: 26, mid: 48, fwd: 64, spread: 0.9, ballShift: 4 },
    away: { gk: 5, def: 20, mid: 36, fwd: 58, spread: 0.7, ballShift: 3 },
    homePossession: 0.6,
    decisionInterval: 0.7,
    verticality: 0.78,
    interceptionBias: 1.7,
    possessionEdge: 0.09,
    shotBias: 2.6,
    pressIntensity: 2.0,
    duelRate: 0.75,
    tempo: 1.7,
    label: 'Penalty Box Scramble',
  },
};

export const SCENARIO_ORDER: SyntheticScenarioType[] = [
  'high_possession',
  'counter_attack_transition',
  'low_block_siege',
  'box_scramble',
];

/** Attack direction for a side: home pushes towards +x, away towards -x. */
export function attackDirection(team: TeamSide): 1 | -1 {
  return team === 'home' ? 1 : -1;
}

/** The goal a side attacks. */
export function targetGoal(team: TeamSide): { x: number; y: number } {
  return team === 'home' ? AWAY_GOAL : HOME_GOAL;
}

/** The goal a side defends. */
export function ownGoal(team: TeamSide): { x: number; y: number } {
  return team === 'home' ? HOME_GOAL : AWAY_GOAL;
}

export function clampToPitch(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}
