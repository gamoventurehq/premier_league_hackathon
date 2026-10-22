'use client';

/**
 * The broadcast header.
 *
 * The strip that sits above every studio view: the identity of the product,
 * the score bug (which reads the live score, never a fixed one), the match
 * clock, the fast-path latency, the Synthetic Match Scenario selector and
 * the transport controls.
 *
 * It used to be built from Ionic components. The studio is a Next.js
 * application now, so the header is built from `lucide-react` icons and the
 * token classes in `globals.css` — no component library, no literal colours.
 */

import { Pause, Play, Radio, Zap } from 'lucide-react';
import type { MatchMetrics, SyntheticScenarioType } from '../types/telemetry';
import { SCENARIOS, SCENARIO_ORDER } from '../lib/pitch';
import { TEAM_NAMES } from '../lib/narratives';
import { cn } from '../lib/cn';

export interface BroadcastHeaderProps {
  matchClock: string;
  metrics: MatchMetrics | null;
  /** The live score. The header never carries a score of its own. */
  score: { home: number; away: number } | null;
  currentScenario: SyntheticScenarioType;
  onScenarioChange: (scenario: SyntheticScenarioType) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  /**
   * Render only the scoreboard strip. The studio shell already carries the
   * brand, the match clock, the scenario switch and the transport control,
   * so a secondary route uses the compact form to avoid repeating them.
   */
  compact?: boolean;
}

/** "Manchester City" -> "MCI", "Arsenal" -> "ARS". */
function abbreviate(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '---';
  let abbreviation = words.map((word) => word.charAt(0)).join('');
  if (abbreviation.length < 3) {
    for (const word of [...words].reverse()) {
      for (let i = 1; i < word.length && abbreviation.length < 3; i += 1) {
        abbreviation += word.charAt(i);
      }
      if (abbreviation.length >= 3) break;
    }
  }
  return abbreviation.slice(0, 3).toUpperCase();
}

export function BroadcastHeader({
  matchClock,
  metrics,
  score,
  currentScenario,
  onScenarioChange,
  isPlaying,
  onTogglePlay,
  compact = false,
}: BroadcastHeaderProps) {
  const homeLabel = abbreviate(TEAM_NAMES.home);
  const awayLabel = abbreviate(TEAM_NAMES.away);

  return (
    <header
      className={cn(
        'w-full border-b border-line bg-surface/80 backdrop-blur-xl',
        // The studio shell already owns a sticky top bar, so the compact
        // scoreboard strip stays in the flow instead of stacking on top of it.
        compact ? '' : 'sticky top-0 z-50',
      )}
    >
      <div
        className={cn(
          'mx-auto flex flex-wrap items-center gap-3 px-4 sm:px-6 lg:px-8',
          compact ? 'h-12 justify-end' : 'h-16 justify-between',
        )}
      >
        {/* Brand */}
        {compact ? null : (
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-line-strong bg-surface-raised text-[13px] font-semibold text-ink"
            >
              PL
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tracking-tight text-ink">
                  Premier League Studio
                </span>
                <span className="hidden items-center gap-1 rounded-full border border-positive/40 bg-positive/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-positive sm:inline-flex">
                  <Radio className="h-2.5 w-2.5" aria-hidden />
                  Live
                </span>
              </div>
              <div className="text-[11px] text-ink-muted">
                Synthetic Match Insights Engine
              </div>
            </div>
          </div>
        )}

        {/* Score bug */}
        <div className="flex items-center gap-3 rounded-full border border-line bg-inset px-4 py-1.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-home" aria-hidden />
            <span className="text-xs font-bold text-ink">{homeLabel}</span>
          </div>
          <span className="font-mono text-xs font-semibold tabular-nums text-ink">
            {score ? `${score.home} – ${score.away}` : '– –'}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-ink">{awayLabel}</span>
            <span className="h-2 w-2 rounded-full bg-away" aria-hidden />
          </div>
          <span className="h-3 w-px bg-line" aria-hidden />
          <span className="font-mono text-xs font-semibold tabular-nums text-ink-strong">
            {matchClock}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-line bg-inset px-3 py-1 font-mono text-[11px] text-ink-muted md:flex">
            <Zap className="h-3 w-3 text-positive" aria-hidden />
            <span>Fast-Path:</span>
            <span className="font-semibold tabular-nums text-positive">
              {metrics ? `${metrics.fastPathLatencyMs.toFixed(1)}ms` : '—'}
            </span>
          </div>

          {compact ? null : (
            <>
              <label className="sr-only" htmlFor="broadcast-scenario">
                Synthetic Match Scenario
              </label>
              <select
                id="broadcast-scenario"
                value={currentScenario}
                onChange={(event) =>
                  onScenarioChange(event.target.value as SyntheticScenarioType)
                }
                className="rounded-xl border border-line bg-inset px-3 py-1.5 text-xs font-medium text-ink outline-none transition-colors hover:border-line-strong"
              >
                {SCENARIO_ORDER.map((scenario) => (
                  <option key={scenario} value={scenario} className="bg-surface text-ink">
                    {SCENARIOS[scenario].label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={onTogglePlay}
                aria-label={isPlaying ? 'Pause the match stream' : 'Play the match stream'}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-semibold tracking-tight transition-colors',
                  isPlaying
                    ? 'border-line bg-inset text-ink hover:border-line-strong'
                    : 'border-positive/40 bg-positive/15 text-positive',
                )}
              >
                {isPlaying ? (
                  <Pause className="h-3 w-3" aria-hidden />
                ) : (
                  <Play className="h-3 w-3" aria-hidden />
                )}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default BroadcastHeader;
