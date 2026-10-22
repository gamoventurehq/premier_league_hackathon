'use client';

import React, { useState } from 'react';
import { TelemetryFrame, TeamSide } from '../types/telemetry';

interface ClubCentricViewProps {
  frame: TelemetryFrame | null;
}

export const ClubCentricView: React.FC<ClubCentricViewProps> = ({ frame }) => {
  const [selectedClub, setSelectedClub] = useState<TeamSide>('home');
  const narrative = frame?.latestNarrative;

  return (
    <div className="space-y-4">
      {/* View Header */}
      <div className="flex items-center justify-between pb-1 border-b border-white/[0.08]">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">Club-Centric Experience</h3>
          <span className="text-[11px] text-white/40">Supporter Perspective Framing</span>
        </div>
        <span className="text-[10px] font-semibold text-[#bf5af2] bg-[#bf5af2]/10 px-2.5 py-0.5 rounded-full border border-[#bf5af2]/20">
          SUPPORTER
        </span>
      </div>

      {/* Apple Styled Segment Tabs */}
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-white/[0.05] p-1 border border-white/[0.08]">
        <button
          type="button"
          onClick={() => setSelectedClub('home')}
          className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition-all ${
            selectedClub === 'home'
              ? 'bg-white/20 text-white shadow-sm'
              : 'text-white/40 hover:text-white'
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-[#0a84ff]" />
          <span>Man City</span>
        </button>
        <button
          type="button"
          onClick={() => setSelectedClub('away')}
          className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition-all ${
            selectedClub === 'away'
              ? 'bg-white/20 text-white shadow-sm'
              : 'text-white/40 hover:text-white'
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-[#ff453a]" />
          <span>Arsenal FC</span>
        </button>
      </div>

      {/* Tactical Framing */}
      <div className="rounded-2xl apple-glass-card p-4 space-y-2">
        <span className="text-xs font-semibold text-[#bf5af2] block">
          {selectedClub === 'home' ? 'Manchester City Tactical Plan' : 'Arsenal Tactical Execution'}
        </span>
        <p className="text-xs text-white/80 leading-relaxed font-medium">
          {selectedClub === 'home'
            ? narrative?.clubCentricContext.homeFrame || 'Analyzing City build-up structures...'
            : narrative?.clubCentricContext.awayFrame || 'Analyzing Arsenal defensive shape and transitions...'}
        </p>
      </div>

      {/* Match Priorities */}
      <div className="rounded-2xl apple-glass-card p-4 space-y-2">
        <span className="text-xs font-semibold text-white/80 block">
          Key Tactical Directives
        </span>
        <div className="space-y-2 text-xs">
          {selectedClub === 'home' ? (
            <>
              <div className="rounded-xl bg-white/[0.03] p-2.5 border border-white/[0.05] text-[11px] text-white/70">
                1. High territorial sustain: 68% pitch control pinning Arsenal defensive shape.
              </div>
              <div className="rounded-xl bg-white/[0.03] p-2.5 border border-white/[0.05] text-[11px] text-white/70">
                2. De Bruyne half-space runs between Saliba and White.
              </div>
            </>
          ) : (
            <>
              <div className="rounded-xl bg-white/[0.03] p-2.5 border border-white/[0.05] text-[11px] text-white/70">
                1. Compact low block within 20m of penalty line to restrict Haaland space.
              </div>
              <div className="rounded-xl bg-white/[0.03] p-2.5 border border-white/[0.05] text-[11px] text-white/70">
                2. Rapid vertical releases to Saka and Martinelli within 2 touches.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
