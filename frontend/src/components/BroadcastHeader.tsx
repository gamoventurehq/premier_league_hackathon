'use client';

import React from 'react';
import { SyntheticScenarioType, MatchMetrics } from '../types/telemetry';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonBadge,
  IonButton,
  IonIcon,
  IonSelect,
  IonSelectOption,
} from '@ionic/react';
import {
  play,
  pause,
  timerOutline,
  pulseOutline,
  speedometerOutline,
  layersOutline,
  radioOutline,
} from 'ionicons/icons';

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
    <IonHeader className="border-b border-white/10 bg-black/80 backdrop-blur-2xl sticky top-0 z-50">
      <IonToolbar className="[--background:transparent] [--color:#f5f5f7] px-4 py-1">
        <div className="flex flex-wrap items-center justify-between gap-4 w-full">
          {/* Brand & Studio Title */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-b from-white/20 to-white/5 border border-white/20 flex items-center justify-center font-semibold text-white shadow-inner">
              <span className="text-sm tracking-tight font-black"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tracking-tight text-white">
                  Premier League Studio
                </span>
                <span className="text-[10px] font-medium text-white/50 tracking-wide uppercase">
                  Insights Engine
                </span>
                <IonBadge color="danger" className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold flex items-center gap-1 shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse inline-block mr-1"></span>
                  Live Sim
                </IonBadge>
              </div>
              <div className="text-[11px] text-white/40 tracking-tight font-medium">
                Azure AI Foundry • Tiered Fast-Path & Agent Swarm
              </div>
            </div>
          </div>

          {/* Apple Dynamic Island Style Scoreboard */}
          <div className="flex items-center gap-4 bg-[#1c1c1e]/80 border border-white/10 rounded-full px-5 py-1.5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#0a84ff]"></span>
              <span className="text-xs font-bold text-white tracking-wide">MCI</span>
            </div>
            <div className="text-sm font-black text-white tracking-widest font-mono">
              2 <span className="text-white/30 font-light mx-0.5">:</span> 1
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide">ARS</span>
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff453a]"></span>
            </div>
            <div className="h-4 w-[1px] bg-white/15"></div>
            <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-[#ffd60a]">
              <IonIcon icon={timerOutline} className="text-sm opacity-80" />
              <span>{matchClock}</span>
              <span className="text-[9px] text-white/40 uppercase ml-0.5">2H</span>
            </div>
          </div>

          {/* Fast-Path Latency Badges & Controls */}
          <div className="flex items-center gap-3">
            {/* Fast-Path Latency Pill */}
            <div className="hidden sm:flex items-center gap-2 bg-[#1c1c1e]/60 border border-white/10 rounded-full px-3 py-1">
              <IonIcon icon={speedometerOutline} className="text-[#30d158] text-sm" />
              <div className="text-left">
                <div className="text-[8px] uppercase tracking-wider text-white/50 font-bold">Fast-Path</div>
                <div className="text-xs font-mono font-bold text-[#30d158]">
                  {metrics ? `${metrics.fastPathLatencyMs}ms` : '--'}
                </div>
              </div>
            </div>

            {/* Agent Narrative Latency Pill */}
            <div className="hidden sm:flex items-center gap-2 bg-[#1c1c1e]/60 border border-white/10 rounded-full px-3 py-1">
              <IonIcon icon={pulseOutline} className="text-[#64d2ff] text-sm" />
              <div className="text-left">
                <div className="text-[8px] uppercase tracking-wider text-white/50 font-bold">AI Swarm</div>
                <div className="text-xs font-mono font-bold text-[#64d2ff]">
                  {metrics ? `${metrics.agentReasoningLatencyMs}ms` : '--'}
                </div>
              </div>
            </div>

            {/* Synthetic Scenario Selector */}
            <div className="flex items-center bg-[#1c1c1e]/90 border border-white/15 rounded-xl px-2 py-0.5 shadow-sm">
              <IonIcon icon={layersOutline} className="text-white/60 text-sm ml-1 mr-1" />
              <select
                value={currentScenario}
                onChange={(e) => onScenarioChange(e.target.value as SyntheticScenarioType)}
                className="bg-transparent text-xs font-medium text-white/90 outline-none cursor-pointer py-1 pr-2"
              >
                <option value="high_possession" className="bg-[#1c1c1e] text-white">High Possession Siege</option>
                <option value="counter_attack_transition" className="bg-[#1c1c1e] text-white">Counter-Attack Transition</option>
                <option value="low_block_siege" className="bg-[#1c1c1e] text-white">Low-Block Defensive Wall</option>
                <option value="box_scramble" className="bg-[#1c1c1e] text-white">Penalty Box Scramble</option>
              </select>
            </div>

            {/* Play/Pause Button */}
            <IonButton
              fill="solid"
              size="small"
              onClick={onTogglePlay}
              className="[--border-radius:12px] font-semibold text-xs tracking-tight"
              color={isPlaying ? 'warning' : 'success'}
            >
              <IonIcon slot="start" icon={isPlaying ? pause : play} />
              {isPlaying ? 'Pause' : 'Resume'}
            </IonButton>
          </div>
        </div>
      </IonToolbar>
    </IonHeader>
  );
};
