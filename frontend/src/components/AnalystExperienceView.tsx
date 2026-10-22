'use client';

import React from 'react';
import { TelemetryFrame } from '../types/telemetry';
import {
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonCardContent,
  IonBadge,
  IonIcon,
  IonProgressBar,
} from '@ionic/react';
import {
  analyticsOutline,
  locateOutline,
  pieChartOutline,
  gitNetworkOutline,
  hardwareChipOutline,
} from 'ionicons/icons';

interface AnalystExperienceViewProps {
  frame: TelemetryFrame | null;
}

export const AnalystExperienceView: React.FC<AnalystExperienceViewProps> = ({ frame }) => {
  const metrics = frame?.metrics;
  const pdr = metrics?.passDifficultyRating || 65;

  return (
    <div className="space-y-4">
      {/* Title & Badge */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-xl bg-[#0a84ff]/20 flex items-center justify-center text-[#0a84ff]">
            <IonIcon icon={analyticsOutline} className="text-base" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Analyst Experience</h3>
            <span className="text-[10px] text-white/50">Probabilistic & Spatial Diagnostics</span>
          </div>
        </div>
        <IonBadge color="primary" className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full">
          Deep Spatial Telemetry
        </IonBadge>
      </div>

      {/* Pass Difficulty Rating (PDR) Card */}
      <IonCard className="apple-glass rounded-2xl overflow-hidden border border-white/10 m-0">
        <IonCardContent className="p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/90 flex items-center gap-1.5">
              <IonIcon icon={locateOutline} className="text-[#ffd60a]" />
              Pass Difficulty Rating (PDR)
            </span>
            <span className="font-mono font-bold text-sm text-[#ffd60a]">{pdr} <span className="text-[10px] text-white/40">/ 100</span></span>
          </div>

          {/* Apple Style Progress Bar */}
          <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                pdr > 75 ? 'bg-[#ff453a]' : pdr > 50 ? 'bg-[#ff9f0a]' : 'bg-[#30d158]'
              }`}
              style={{ width: `${pdr}%` }}
            />
          </div>

          <p className="text-[11px] text-white/50 leading-relaxed pt-1">
            Evaluated against defender obstruction density, passer compression, velocity vectors, and corridor width.
          </p>
        </IonCardContent>
      </IonCard>

      {/* Pitch Control Dominance */}
      <IonCard className="apple-glass rounded-2xl overflow-hidden border border-white/10 m-0">
        <IonCardContent className="p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/90 flex items-center gap-1.5">
              <IonIcon icon={pieChartOutline} className="text-[#64d2ff]" />
              Pitch Control Dominance
            </span>
            <span className="text-[10px] font-mono text-white/40">Voronoi Metric</span>
          </div>

          <div className="flex h-3 w-full rounded-full overflow-hidden text-[9px] font-bold text-white shadow-inner bg-black/40">
            <div
              className="bg-[#0a84ff] flex items-center justify-center transition-all duration-300"
              style={{ width: `${metrics?.pitchControl.homePercentage || 50}%` }}
            >
              {metrics?.pitchControl.homePercentage}%
            </div>
            <div
              className="bg-white/20 flex items-center justify-center transition-all duration-300"
              style={{ width: `${metrics?.pitchControl.contestedPercentage || 10}%` }}
            >
              {metrics?.pitchControl.contestedPercentage}%
            </div>
            <div
              className="bg-[#ff453a] flex items-center justify-center transition-all duration-300"
              style={{ width: `${metrics?.pitchControl.awayPercentage || 40}%` }}
            >
              {metrics?.pitchControl.awayPercentage}%
            </div>
          </div>

          <div className="flex justify-between text-[10px] font-medium text-white/60">
            <span className="text-[#0a84ff]">MCI Pitch Control</span>
            <span className="text-white/40">Contested</span>
            <span className="text-[#ff453a]">ARS Pitch Control</span>
          </div>
        </IonCardContent>
      </IonCard>

      {/* Passing Lane Telemetry */}
      <IonCard className="apple-glass rounded-2xl overflow-hidden border border-white/10 m-0">
        <IonCardContent className="p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white/90 mb-1">
            <IonIcon icon={gitNetworkOutline} className="text-[#30d158]" />
            Active Passing Lane Telemetry
          </div>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {frame?.passingLanes.map((lane, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-[11px] border border-white/5"
              >
                <span className="text-white/80">
                  Corridor <strong className="text-[#64d2ff]">{lane.passerId}</strong> &rarr;{' '}
                  <strong className="text-white">{lane.receiverId}</strong>
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-white/50 text-[10px]">PDR {lane.passDifficultyRating}</span>
                  <IonBadge
                    color={lane.isClear ? 'success' : 'warning'}
                    className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                  >
                    {lane.isClear ? 'OPEN' : 'CONTESTED'}
                  </IonBadge>
                </div>
              </div>
            ))}
          </div>
        </IonCardContent>
      </IonCard>

      {/* Tactical Inflection Context */}
      <IonCard className="apple-glass-subtle rounded-2xl overflow-hidden border-l-4 border-l-[#0a84ff] border-white/10 m-0">
        <IonCardContent className="p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#0a84ff] uppercase tracking-wider">
            <IonIcon icon={hardwareChipOutline} />
            Tactical Reasoning Engine
          </div>
          <p className="text-xs text-white/80 leading-relaxed font-mono">
            {frame?.latestNarrative.analystContext || 'Ingesting continuous tracking stream...'}
          </p>
        </IonCardContent>
      </IonCard>
    </div>
  );
};
