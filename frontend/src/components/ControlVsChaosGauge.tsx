'use client';

/**
 * The Control vs. Chaos Index gauge.
 *
 * The index runs from 0 (ultra-structured possession) to 100 (transitional
 * chaos); the gauge shows the two ends of that scale meeting in the middle
 * and names the Game Rhythm band the index currently sits in.
 *
 * The value always comes from the frame. When there is no frame, the gauge
 * says so rather than showing a made-up midpoint.
 */

import type { MatchMetrics } from '../types/telemetry';
import { cn } from '../lib/cn';
import { SectionLabel } from './studio/primitives';

export interface ControlVsChaosGaugeProps {
  metrics: MatchMetrics | null;
  className?: string;
}

export function ControlVsChaosGauge({ metrics, className }: ControlVsChaosGaugeProps) {
  if (!metrics) {
    return (
      <div
        className={cn(
          'rounded-2xl border border-line bg-surface/70 p-5 backdrop-blur-xl',
          className,
        )}
      >
        <SectionLabel>Control vs. Chaos Index</SectionLabel>
        <p className="mt-2 text-[12px] text-ink-muted">
          No telemetry frame yet. The index is published with the first frame.
        </p>
      </div>
    );
  }

  const chaos = Math.round(metrics.controlVsChaosIndex);
  const control = 100 - chaos;

  return (
    <div
      className={cn(
        'rounded-2xl border border-line bg-surface/70 p-5 backdrop-blur-xl',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-tight text-ink">
            Control vs. Chaos Index
          </p>
          <p className="mt-0.5 text-[11px] text-ink-muted">
            Possession stability against transition volatility
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-line bg-inset px-3 py-1 text-xs">
          <span className="text-ink-muted">Game Rhythm:</span>
          <span className="font-semibold text-accent-2">{metrics.gameRhythm}</span>
        </div>
      </div>

      <div
        className="relative mt-4 h-3 w-full overflow-hidden rounded-full border border-line bg-inset"
        role="img"
        aria-label={`Control ${control} percent, chaos ${chaos} percent. Game Rhythm ${metrics.gameRhythm}.`}
      >
        <div
          className="h-full rounded-l-full bg-accent transition-[width] duration-300"
          style={{ width: `${control}%` }}
        />
        <div
          className="absolute top-0 right-0 h-full rounded-r-full bg-accent-3 transition-[width] duration-300"
          style={{ width: `${chaos}%` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="font-medium text-accent">
          Structured control:{' '}
          <span className="font-mono font-semibold tabular-nums text-ink">
            {control}%
          </span>
        </span>
        <span className="font-medium text-accent-3">
          Transition chaos:{' '}
          <span className="font-mono font-semibold tabular-nums text-ink">
            {chaos}%
          </span>
        </span>
      </div>
    </div>
  );
}

export default ControlVsChaosGauge;
