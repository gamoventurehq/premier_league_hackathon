'use client';

import React from 'react';
import { MatchMetrics } from '../types/telemetry';
import { IonCard, IonCardContent, IonBadge, IonIcon } from '@ionic/react';
import { flashOutline, shieldCheckmarkOutline, gitCommitOutline } from 'ionicons/icons';

interface ControlVsChaosGaugeProps {
  metrics: MatchMetrics | null;
}

export const ControlVsChaosGauge: React.FC<ControlVsChaosGaugeProps> = ({ metrics }) => {
  const chaosScore = metrics ? Math.round(metrics.controlVsChaosIndex) : 50;
  const controlScore = 100 - chaosScore;

  return (
    <IonCard className="apple-glass rounded-2xl overflow-hidden shadow-2xl border border-white/10 m-0">
      <IonCardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-[#ffd60a]/15 flex items-center justify-center text-[#ffd60a]">
              <IonIcon icon={flashOutline} className="text-sm" />
            </div>
            <div>
              <span className="text-xs font-semibold text-white tracking-tight block">
                Control vs. Chaos Index
              </span>
              <span className="text-[10px] text-white/40 font-medium">
                Dual-Axis Possession Volatility
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
            <IonIcon icon={gitCommitOutline} className="text-[#64d2ff] text-xs" />
            <span className="text-[10px] text-white/60 font-medium">Game Rhythm:</span>
            <span className="text-[11px] font-semibold text-[#64d2ff]">
              {metrics?.gameRhythm || 'Structured'}
            </span>
          </div>
        </div>

        {/* Dual-axis Smooth Bar */}
        <div className="relative h-3.5 w-full overflow-hidden rounded-full bg-black/60 p-0.5 border border-white/10 shadow-inner">
          <div
            className="h-full rounded-l-full bg-gradient-to-r from-[#0a84ff] to-[#64d2ff] transition-all duration-300"
            style={{ width: `${controlScore}%` }}
          />
          <div
            className="absolute top-0 right-0 h-full rounded-r-full bg-gradient-to-l from-[#ff453a] to-[#ff9f0a] transition-all duration-300"
            style={{ width: `${chaosScore}%` }}
          />
          {/* Subtle Apple center tick */}
          <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-white/60 z-10 shadow-sm" />
        </div>

        {/* Readouts */}
        <div className="mt-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-[#64d2ff] font-medium">
            <IonIcon icon={shieldCheckmarkOutline} className="text-sm" />
            <span>Structured Possession: <strong className="font-mono text-white">{controlScore}%</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-[#ff453a] font-medium">
            <IonIcon icon={flashOutline} className="text-sm" />
            <span>Transitional Volatility: <strong className="font-mono text-white">{chaosScore}%</strong></span>
          </div>
        </div>
      </IonCardContent>
    </IonCard>
  );
};
