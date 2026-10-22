'use client';

import React from 'react';
import { MatchMetrics } from '../types/telemetry';

interface ControlVsChaosGaugeProps {
  metrics: MatchMetrics | null;
}

export const ControlVsChaosGauge: React.FC<ControlVsChaosGaugeProps> = ({ metrics }) => {
  const chaosScore = metrics ? Math.round(metrics.controlVsChaosIndex) : 50;
  const controlScore = 100 - chaosScore;

  return (
    <div className="rounded-3xl apple-glass p-5 shadow-2xl">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-xs font-semibold text-white tracking-tight block">
            Control vs. Chaos Index
          </span>
          <span className="text-[11px] text-white/40">
            Real-time balance of possession stability vs. transition volatility
          </span>
        </div>

        <div className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.08] px-3 py-1 rounded-full text-xs">
          <span className="text-white/40">Game Rhythm:</span>
          <span className="font-semibold text-[#64d2ff]">{metrics?.gameRhythm || 'Structured'}</span>
        </div>
      </div>

      {/* Apple Clean Progress Surface */}
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-white/[0.06] p-0.5 border border-white/[0.08]">
        <div
          className="h-full rounded-l-full bg-gradient-to-r from-[#0a84ff] to-[#64d2ff] transition-all duration-300"
          style={{ width: `${controlScore}%` }}
        />
        <div
          className="absolute top-0 right-0 h-full rounded-r-full bg-gradient-to-l from-[#ff453a] to-[#ff9f0a] transition-all duration-300"
          style={{ width: `${chaosScore}%` }}
        />
        <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-white/40 z-10" />
      </div>

      {/* Metrics breakdown */}
      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="text-[#64d2ff] font-medium">
          Structured Possession: <span className="font-mono text-white font-bold">{controlScore}%</span>
        </div>
        <div className="text-[#ff453a] font-medium">
          Transition Volatility: <span className="font-mono text-white font-bold">{chaosScore}%</span>
        </div>
      </div>
    </div>
  );
};
