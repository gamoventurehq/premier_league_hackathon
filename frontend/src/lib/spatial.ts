/**
 * Spatial analytics: Pitch Control surfaces and Passing Lane geometry.
 *
 * Both metrics are computed from the live synthetic telemetry — nothing here
 * is pre-baked. Pitch Control is a distance-decay Voronoi surface; the Pass
 * Difficulty Rating is the four-factor composite defined in CONTEXT.md:
 * passer pressure, receiver coverage, trajectory distance and defender
 * velocity vectors.
 */

import { PassingLane, PitchControlCell, TeamSide } from '../types/telemetry';
import {
  CORRIDOR_INTERCEPT_RADIUS,
  GOAL_HALF_WIDTH,
  MAX_SPRINT_SPEED,
  PITCH_LENGTH,
  PITCH_WIDTH,
  clampToPitch,
  targetGoal,
} from './pitch';

/* ------------------------------------------------------------------ */
/* Pitch Control                                                       */
/* ------------------------------------------------------------------ */

/** A player as seen by the control model. */
export interface ControlActor {
  x: number;
  y: number;
  team: TeamSide;
  /** Peak sprint speed in m/s, used to weight how far a player reaches. */
  sprintSpeedMs: number;
}

/** Grid resolution of the Pitch Control surface (5m x 4m cells). */
export const CONTROL_CELL_X = 5;
export const CONTROL_CELL_Y = 4;

/** A cell is contested when neither side is meaningfully in control. */
export const CONTESTED_THRESHOLD = 0.08;

export interface PitchControlResult {
  cells: PitchControlCell[];
  homePercent: number;
  awayPercent: number;
  contestedPercent: number;
}

/**
 * Distance-decay control surface.
 *
 * Each cell accumulates an inverse-distance weight from every player. A
 * player's reach scales with their peak sprint speed, so a faster side
 * genuinely compresses space. The signed control score is the normalised
 * difference between the two sides' weights.
 */
export function computePitchControl(actors: ControlActor[]): PitchControlResult {
  const cells: PitchControlCell[] = [];
  let homeCells = 0;
  let awayCells = 0;
  let contestedCells = 0;

  for (let ix = 0; ix < PITCH_LENGTH / CONTROL_CELL_X; ix += 1) {
    const x = ix * CONTROL_CELL_X + CONTROL_CELL_X / 2;
    for (let iy = 0; iy < PITCH_WIDTH / CONTROL_CELL_Y; iy += 1) {
      const y = iy * CONTROL_CELL_Y + CONTROL_CELL_Y / 2;

      let homeWeight = 0;
      let awayWeight = 0;

      for (const actor of actors) {
        const d = Math.hypot(x - actor.x, y - actor.y);
        // Inverse-distance decay, floored so a player on the spot cannot
        // singularly dominate the surface.
        const weight = (1 / (d + 1)) * (0.6 + 0.4 * (actor.sprintSpeedMs / MAX_SPRINT_SPEED));
        if (actor.team === 'home') homeWeight += weight;
        else awayWeight += weight;
      }

      const total = homeWeight + awayWeight;
      const controlScore = total > 0 ? (homeWeight - awayWeight) / total : 0;

      if (Math.abs(controlScore) < CONTESTED_THRESHOLD) {
        contestedCells += 1;
      } else if (controlScore > 0) {
        homeCells += 1;
      } else {
        awayCells += 1;
      }

      cells.push({ x, y, controlScore, homeWeight, awayWeight });
    }
  }

  const totalCells = cells.length;
  return {
    cells,
    homePercent: (homeCells / totalCells) * 100,
    awayPercent: (awayCells / totalCells) * 100,
    contestedPercent: (contestedCells / totalCells) * 100,
  };
}

/* ------------------------------------------------------------------ */
/* Passing Lanes and Pass Difficulty Rating                            */
/* ------------------------------------------------------------------ */

export interface LaneActor {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface LaneContext {
  passer: LaneActor;
  receiver: LaneActor;
  opponents: LaneActor[];
}

/** Segment projection of a point onto a line, clamped to the segment. */
function pointSegmentDistance(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): { distance: number; t: number } {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { distance: Math.hypot(px - ax, py - ay), t: 0 };
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return { distance: Math.hypot(px - cx, py - cy), t };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Evaluate a single Passing Lane.
 *
 * The Pass Difficulty Rating is the four-factor composite from CONTEXT.md:
 * trajectory distance, passer pressure, receiver coverage and defender
 * velocity vectors. Interception risk and corridor width are carried
 * alongside as supporting evidence.
 */
export function evaluateLane(context: LaneContext): PassingLane {
  const { passer, receiver, opponents } = context;

  const dx = receiver.x - passer.x;
  const dy = receiver.y - passer.y;
  const length = Math.hypot(dx, dy);
  const ux = length > 0 ? dx / length : 0;
  const uy = length > 0 ? dy / length : 0;

  // --- Passer pressure: how tightly is the passer marked? ---
  let nearestToPasser = Infinity;
  // --- Receiver coverage: how many opponents are close to the receiver? ---
  let nearestToReceiver = Infinity;
  let coveringCount = 0;
  // --- Corridor geometry ---
  let nearestToCorridor = Infinity;
  let interceptorCount = 0;
  // Opponents close enough to the corridor to step into it. A pass that
  // merely has a defender within a few metres of its lane is not safe,
  // even if nobody is standing on it right now.
  let nearInterceptors = 0;
  // --- Defender velocity alignment: who is closing onto the pass axis? ---
  let alignment = 0;

  for (const opponent of opponents) {
    const dPasser = Math.hypot(opponent.x - passer.x, opponent.y - passer.y);
    if (dPasser < nearestToPasser) nearestToPasser = dPasser;

    const dReceiver = Math.hypot(opponent.x - receiver.x, opponent.y - receiver.y);
    if (dReceiver < nearestToReceiver) nearestToReceiver = dReceiver;
    if (dReceiver <= 5) coveringCount += 1;

    const corridor = pointSegmentDistance(opponent.x, opponent.y, passer.x, passer.y, receiver.x, receiver.y);
    if (corridor.distance < nearestToCorridor) nearestToCorridor = corridor.distance;
    if (corridor.distance <= CORRIDOR_INTERCEPT_RADIUS) interceptorCount += 1;
    if (corridor.distance <= 4) nearInterceptors += 1;

    // Closing rate onto the pass axis, signed so that a defender moving
    // towards the receiver's side of the pass scores positive.
    const closing = -(opponent.vx * ux + opponent.vy * uy);
    if (closing > 0 && corridor.distance <= 9) {
      const proximity = 1 - corridor.distance / 9;
      alignment = Math.max(alignment, clamp01((closing / MAX_SPRINT_SPEED) * proximity + proximity * 0.25));
    }
  }

  const passerPressure = clamp01(1 - (nearestToPasser - 0.5) / 7);
  const receiverProximity = nearestToReceiver === Infinity ? 0 : clamp01(1 - nearestToReceiver / 6);
  const receiverCoverage = clamp01(0.5 * receiverProximity + 0.5 * clamp01(coveringCount / 2));
  const corridorWidthM = nearestToCorridor === Infinity ? 12 : Math.min(12, nearestToCorridor * 2);
  const interceptorDensity = clamp01(interceptorCount / 2);
  const nearInterceptorDensity = clamp01(nearInterceptors / 3);
  const interceptionRisk = clamp01(
    0.34 * interceptorDensity +
      0.3 * nearInterceptorDensity +
      0.22 * alignment +
      0.14 * receiverCoverage,
  );

  // --- The Pass Difficulty Rating composite (CONTEXT.md) ---
  const distanceTerm = clamp01(length / 32);
  const passDifficultyRating = Math.round(
    100 *
      (0.22 * distanceTerm +
        0.24 * passerPressure +
        0.26 * receiverCoverage +
        0.28 * alignment),
  );

  return {
    passerId: passer.id,
    receiverId: receiver.id,
    passerPos: { x: passer.x, y: passer.y },
    receiverPos: { x: receiver.x, y: receiver.y },
    interceptionRisk: Number(interceptionRisk.toFixed(3)),
    passDifficultyRating: Math.max(0, Math.min(100, passDifficultyRating)),
    isClear: interceptorCount === 0 && alignment < 0.2,
    corridorWidthM: Number(corridorWidthM.toFixed(2)),
    interceptorCount,
    passerPressure: Number(passerPressure.toFixed(3)),
    receiverCoverage: Number(receiverCoverage.toFixed(3)),
    defenderVelocityAlignment: Number(alignment.toFixed(3)),
  };
}

/**
 * Aggregate the Pass Difficulty Rating across the live lanes.
 *
 * The headline PDR is the weighted mean of the lanes on the pitch, weighted
 * by pass length, so a long, contested lane moves the number more than a
 * short, safe one.
 */
export function aggregatePdr(lanes: PassingLane[]): number {
  if (lanes.length === 0) return 0;
  let weighted = 0;
  let totalWeight = 0;
  for (const lane of lanes) {
    const length = Math.hypot(
      lane.receiverPos.x - lane.passerPos.x,
      lane.receiverPos.y - lane.passerPos.y,
    );
    const weight = Math.max(1, length);
    weighted += lane.passDifficultyRating * weight;
    totalWeight += weight;
  }
  return Math.round(weighted / totalWeight);
}

/* ------------------------------------------------------------------ */
/* Shot geometry                                                       */
/* ------------------------------------------------------------------ */

/** Expected goals for a shot, from distance, angle and defensive pressure. */
export function expectedGoals(
  shooterX: number,
  shooterY: number,
  team: TeamSide,
  nearestDefenderDistance: number,
): number {
  const goal = targetGoal(team);
  const dx = goal.x - shooterX;
  const dy = goal.y - shooterY;
  const distance = Math.hypot(dx, dy);
  if (distance < 1) return 0.05;

  // Angular width of the goal as seen from the shooting position.
  const angle = 2 * Math.atan2(GOAL_HALF_WIDTH, distance);
  const angleTerm = Math.min(1, angle / 0.55);

  // Distance decay. Calibrated against top-flight shooting: roughly 0.10 xG
  // from 16 metres, 0.23 xG from 8 metres, 0.05 xG from 22 metres.
  const distanceTerm = Math.exp(-distance / 14);

  // Defenders block. A defender two metres away removes about a third of
  // the chance; a defender right on top of the shooter takes it to nothing.
  const pressureTerm = Math.max(0.35, 1 - nearestDefenderDistance / 6);

  const xg = 0.68 * angleTerm * distanceTerm * pressureTerm;
  return Math.max(0.01, Math.min(0.85, xg));
}

/** Probability that a shot with the given xG is scored. */
export function goalProbability(xg: number): number {
  // Real conversion tracks expected goals closely; the small multiplier
  // accounts for the fact that xG already discounts the goalkeeper's reach.
  return 1 - Math.exp(-1.15 * xg);
}

export { clampToPitch };
