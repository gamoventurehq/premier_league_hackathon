'use client';

import React from 'react';
import { SyntheticScenarioType, MatchMetrics } from '../types/telemetry';
import { IonHeader, IonToolbar, IonBadge, IonIcon } from '@ionic/react';
import { play, pause } from 'ionicons/icons';

interface BroadcastHeaderProps {
  matchClock: string;
  metrics: MatchMetrics | null;
  currentScenario: SyntheticScenarioType;
  onScenarioChange: (scenario: SyntheticScenarioType) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

export const BroadcastHeader: React.FC<BroadcastHeaderProps> = ({
  matchClock,
  metrics,
  currentScenario,
  onScenarioChange,
  isPlaying,
  onTogglePlay,
}) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-black/70 backdrop-blur-2xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand & Studio Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-b from-white/15 to-white/5 border border-white/15 shadow-inner">
            <span className="text-sm font-black text-white"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-white">
                Premier League Studio
              </span>
              <span className="hidden sm:inline-block rounded-full bg-rose-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-400 border border-rose-500/20">
                Live
              </span>
            </div>
            <div className="text-[11px] text-white/40 tracking-tight">
              Synthetic Match Insights Engine
            </div>
          </div>
        </div>

        {/* Dynamic Island Scoreboard */}
        <div className="flex items-center gap-3 rounded-full bg-white/[0.07] px-4 py-1.5 border border-white/[0.12] shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#0a84ff]" />
            <span className="text-xs font-bold text-white">MCI</span>
          </div>
          <span className="text-xs font-black tracking-widest text-white font-mono">2 - 1</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white">ARS</span>
            <span className="h-2 w-2 rounded-full bg-[#ff453a]" />
          </div>
          <div className="h-3 w-[1px] bg-white/20" />
          <span className="font-mono text-xs font-semibold text-[#ffd60a]">{matchClock}</span>
        </div>

        {/* Studio Controls */}
        <div className="flex items-center gap-3">
          {/* Latency badge */}
          <div className="hidden md:flex items-center gap-2 text-[11px] font-mono text-white/60 bg-white/[0.04] px-3 py-1 rounded-full border border-white/[0.08]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#30d158] animate-pulse" />
            <span>Fast-Path:</span>
            <span className="text-[#30d158] font-bold">{metrics?.fastPathLatencyMs || 18}ms</span>
          </div>

          {/* Scenario Selector */}
          <select
            value={currentScenario}
            onChange={(e) => onScenarioChange(e.target.value as SyntheticScenarioType)}
            className="rounded-xl border border-white/[0.12] bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white/90 outline-none cursor-pointer backdrop-blur-md transition hover:bg-white/[0.1]"
          >
            <option value="high_possession" className="bg-[#12141a] text-white">High Possession Siege</option>
            <option value="counter_attack_transition" className="bg-[#12141a] text-white">Counter-Attack Transition</option>
            <option value="low_block_siege" className="bg-[#12141a] text-white">Low-Block Defensive Wall</option>
            <option value="box_scramble" className="bg-[#12141a] text-white">Penalty Box Scramble</option>
          </select>

          {/* Play/Pause */}
          <button
            type="button"
            onClick={onTogglePlay}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold tracking-tight transition shadow-sm ${
              isPlaying
                ? 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                : 'bg-[#30d158] text-black hover:bg-[#30d158]/90 font-bold'
            }`}
          >
            <IonIcon icon={isPlaying ? pause : play} className="text-xs" />
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
