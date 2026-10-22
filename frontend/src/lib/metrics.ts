/**
 * Derived match metrics: the Control vs. Chaos Index and Game Rhythm.
 *
 * Both are computed from observable properties of the running match — how
 * often possession changes hands, how long possession sequences last, how
 * often the passer is under pressure — rather than being declared per
 * scenario. The scenario shape influences the underlying behaviour, and the
 * index reads it back out.
 */

import { GameRhythm } from '../types/telemetry';

export interface ChaosSignals {
  /** Possession changes per minute. */
  transitionRate: number;
  /** Turnovers per minute (a turnover is a change caused by a failed action). */
  turnoverRate: number;
  /** Standard deviation of possession sequence length, in passes. */
  sequenceLengthStd: number;
  /** Share of passes attempted under meaningful pressure (0..1). */
  pressureShare: number;
}

export const EMPTY_SIGNALS: ChaosSignals = {
  transitionRate: 0,
  turnoverRate: 0,
  sequenceLengthStd: 0,
  pressureShare: 0,
};

/**
 * Reference scales used to normalise each signal to 0..1. They are the
 * values at which a signal is considered "maximal" for a top-flight match.
 */
const SCALES = {
  transitionRate: 11,
  turnoverRate: 9,
  sequenceLengthStd: 5.5,
  pressureShare: { low: 0.18, high: 0.78 },
};

const WEIGHTS = {
  transitionRate: 0.2,
  turnoverRate: 0.32,
  sequenceLengthStd: 0.24,
  pressureShare: 0.24,
};

function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * The Control vs. Chaos Index: 0 is ultra-structured possession, 100 is
 * transitional chaos.
 */
export function chaosIndexFromSignals(signals: ChaosSignals): number {
  const transitionTerm = Math.min(1, signals.transitionRate / SCALES.transitionRate);
  const turnoverTerm = Math.min(1, signals.turnoverRate / SCALES.turnoverRate);
  const stdTerm = Math.min(1, signals.sequenceLengthStd / SCALES.sequenceLengthStd);
  const pressureTerm = Math.min(
    1,
    Math.max(
      0,
      (signals.pressureShare - SCALES.pressureShare.low) /
        (SCALES.pressureShare.high - SCALES.pressureShare.low),
    ),
  );

  const raw =
    WEIGHTS.transitionRate * transitionTerm +
    WEIGHTS.turnoverRate * turnoverTerm +
    WEIGHTS.sequenceLengthStd * stdTerm +
    WEIGHTS.pressureShare * pressureTerm;

  return Math.max(0, Math.min(100, Math.round(raw * 100)));
}

/** Recompute the signals from the engine's rolling match ledger. */
export function signalsFromLedger(ledger: MatchLedgerSnapshot): ChaosSignals {
  const windowMinutes = Math.max(0.5, ledger.windowSeconds / 60);
  return {
    transitionRate: ledger.transitions / windowMinutes,
    turnoverRate: ledger.turnovers / windowMinutes,
    sequenceLengthStd: standardDeviation(ledger.sequenceLengths),
    pressureShare: ledger.passesAttempted === 0 ? 0 : ledger.passesUnderPressure / ledger.passesAttempted,
  };
}

export interface MatchLedgerSnapshot {
  windowSeconds: number;
  transitions: number;
  turnovers: number;
  sequenceLengths: number[];
  passesAttempted: number;
  passesUnderPressure: number;
}

/** Map the Control vs. Chaos Index onto the canonical Game Rhythm bands. */
export function gameRhythmFromIndex(index: number): GameRhythm {
  if (index < 30) return 'Structured';
  if (index < 48) return 'Fluid';
  if (index < 70) return 'Transitional';
  return 'Chaotic';
}

/** Human-readable band boundaries, used by the studio legend. */
export const RHYTHM_BANDS: { rhythm: GameRhythm; min: number; max: number }[] = [
  { rhythm: 'Structured', min: 0, max: 30 },
  { rhythm: 'Fluid', min: 30, max: 48 },
  { rhythm: 'Transitional', min: 48, max: 70 },
  { rhythm: 'Chaotic', min: 70, max: 100 },
];
