'use client';

import React from 'react';
import { TelemetryFrame } from '../types/telemetry';

interface CasualExperienceViewProps {
  frame: TelemetryFrame | null;
}

export const CasualExperienceView: React.FC<CasualExperienceViewProps> = ({ frame }) => {
  const narrative = frame?.latestNarrative;

  return (
    <div className="space-y-4">
      {/* View Header */}
      <div className="flex items-center justify-between pb-1 border-b border-white/[0.08]">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">Casual Experience</h3>
          <span className="text-[11px] text-white/40">Storylines, Duels & Moments</span>
        </div>
        <span className="text-[10px] font-semibold text-[#ffd60a] bg-[#ffd60a]/10 px-2.5 py-0.5 rounded-full border border-[#ffd60a]/20">
          NARRATIVE
        </span>
      </div>

      {/* Story Arc Headline */}
      <div className="rounded-2xl apple-glass-card p-4 space-y-2 border border-white/[0.1]">
        <span className="text-[10px] font-bold text-[#ffd60a] uppercase tracking-wider block">
          Current Story Arc
        </span>
        <h4 className="text-sm font-bold text-white tracking-tight">
          {narrative?.headline.en || 'Analyzing Match Dynamics'}
        </h4>
        <p className="text-xs text-white/60 leading-relaxed">
          {narrative?.casualContext || 'Real-time narrative unfolding...'}
        </p>
      </div>

      {/* Key Pitch Duel */}
      <div className="rounded-2xl apple-glass-card p-4 space-y-3">
        <span className="text-xs font-semibold text-white/80 block">
          Key Duel: Haaland vs. Saliba
        </span>

        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl bg-white/[0.04] p-3 border border-white/[0.06]">
            <span className="text-[11px] font-bold text-[#0a84ff]">Erling Haaland</span>
            <div className="text-lg font-black text-white mt-1 font-mono">
              34.8 <span className="text-[10px] text-white/40 font-normal">km/h</span>
            </div>
            <div className="text-[10px] text-white/40 mt-0.5">Top Sprint Burst</div>
          </div>
          <div className="rounded-xl bg-white/[0.04] p-3 border border-white/[0.06]">
            <span className="text-[11px] font-bold text-[#ff453a]">William Saliba</span>
            <div className="text-lg font-black text-white mt-1 font-mono">
              5 <span className="text-[10px] text-white/40 font-normal">duels</span>
            </div>
            <div className="text-[10px] text-white/40 mt-0.5">80% In-Box Win Rate</div>
          </div>
        </div>
      </div>

      {/* Player Milestone */}
      <div className="rounded-2xl apple-glass-card p-4">
        <span className="text-xs font-semibold text-white/80 block mb-2.5">
          Milestone Spotlight
        </span>
        <div className="flex items-start gap-3 rounded-xl bg-white/[0.03] p-3 border border-white/[0.05]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#bf5af2]/15 text-[#bf5af2] font-black text-sm">
            100
          </div>
          <div>
            <div className="text-xs font-bold text-white">Rodri — 100 Pitch Touches</div>
            <p className="text-[11px] text-white/50 mt-0.5 leading-snug">
              Surpassed 100 touches with a 94.2% completion accuracy rating.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
