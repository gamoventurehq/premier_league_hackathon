/**
 * Broadcast Overlay builder.
 *
 * The Broadcast Overlay is the Stage 4 artefact: a synchronized,
 * machine-readable graphical payload that a broadcast graphics engine
 * renders on screen alongside live match video (CONTEXT.md). It is not a UI
 * component — it is a contract between the studio and the graphics engine.
 *
 * The engine's own `broadcastOverlay()` reads its live internal state. This
 * module is the pure equivalent: it takes a `TelemetryFrame` and rebuilds the
 * same payload from it, so the studio can show the overlay for any frame in
 * the scrubber history, not only the one the engine happens to be holding.
 *
 * Pure by construction — no engine access, no clocks, no randomness. The same
 * frame always produces the same payload.
 */

import { TEAM_NAMES } from '../narratives';
import type {
  BroadcastLanguage,
  BroadcastOverlayPayload,
  TelemetryFrame,
} from '../../types/telemetry';

/** The overlay schema version this build emits. */
export const BROADCAST_SCHEMA_VERSION = '1.0.0';

/** The five broadcast languages, in the order the graphics engine expects. */
export const BROADCAST_LANGUAGES: BroadcastLanguage[] = ['en', 'es', 'fr', 'ja', 'ar'];

/**
 * Abbreviate a club name to the standard three-letter form used in the
 * score bug — the initials of each word, topped up from the trailing words
 * when the name has fewer than three.
 *
 * "Manchester City" -> "MCI", "Arsenal" -> "ARS", "West Ham United" -> "WHU".
 */
export function abbreviateTeamName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '---';

  let abbr = words.map((word) => word.charAt(0)).join('');
  if (abbr.length < 3) {
    for (const word of [...words].reverse()) {
      for (let i = 1; i < word.length && abbr.length < 3; i += 1) {
        abbr += word.charAt(i);
      }
      if (abbr.length >= 3) break;
    }
  }
  return abbr.slice(0, 3).toUpperCase();
}

/**
 * Build the Broadcast Overlay payload for a frame.
 *
 * Mirrors the engine's `broadcastOverlay()`, but takes the frame as an
 * argument instead of reading engine state.
 */
export function buildBroadcastOverlay(frame: TelemetryFrame): BroadcastOverlayPayload {
  const narrative = frame.latestNarrative;
  const metrics = frame.metrics;

  return {
    overlayId: `overlay-${frame.scenario}-${Math.round(frame.matchSeconds)}`,
    schemaVersion: BROADCAST_SCHEMA_VERSION,
    syncTimestampMs: Math.round(frame.matchSeconds * 1000),
    matchClock: frame.matchClock,
    lowerThird: {
      headline: narrative.headline.en,
      subline: narrative.tacticalExplanation.en,
      speaker: 'Premier League Studio',
    },
    scoreBug: {
      home: abbreviateTeamName(TEAM_NAMES.home),
      away: abbreviateTeamName(TEAM_NAMES.away),
      homeScore: frame.score.home,
      awayScore: frame.score.away,
    },
    metrics: {
      controlVsChaosIndex: metrics.controlVsChaosIndex,
      passDifficultyRating: metrics.passDifficultyRating,
      pitchControl: { ...metrics.pitchControl },
    },
    languages: {
      en: narrative.headline.en,
      es: narrative.headline.es,
      fr: narrative.headline.fr,
      ja: narrative.headline.ja,
      ar: narrative.headline.ar,
    },
    commentatorCue: narrative.casualContext,
  };
}

/**
 * A readable description of an overlay payload, for the panel's summary.
 * Every number here comes from the payload itself.
 */
export function overlaySummary(payload: BroadcastOverlayPayload): string[] {
  const { scoreBug, metrics, lowerThird } = payload;

  return [
    `Lower third · ${lowerThird.headline}`,
    `Subline · ${lowerThird.subline}`,
    `Score bug · ${scoreBug.home} ${scoreBug.homeScore} – ${scoreBug.awayScore} ${scoreBug.away}`,
    `Control vs. Chaos Index · ${Math.round(metrics.controlVsChaosIndex)}`,
    `Pass Difficulty Rating (PDR) · ${Math.round(metrics.passDifficultyRating)}`,
    `Pitch Control · ${metrics.pitchControl.home}% home · ${metrics.pitchControl.away}% away · ${metrics.pitchControl.contested}% contested`,
    `Sync · ${payload.matchClock} · schema ${payload.schemaVersion} · ${payload.syncTimestampMs} ms`,
  ];
}
