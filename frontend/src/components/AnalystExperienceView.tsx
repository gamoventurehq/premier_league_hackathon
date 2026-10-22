'use client';

import React from 'react';
import { TelemetryFrame } from '../types/telemetry';

interface AnalystExperienceViewProps {
  frame: TelemetryFrame | null;
}

export const AnalystExperienceView: React.FC<AnalystExperienceViewProps> = ({ frame }) => {
  const metrics = frame?.metrics;
  const pdr = metrics?.passDifficultyRating || 65;

  return (
    <div className="space-y-4">
      {/* View Header */}
      <div className="flex items-center justify-between pb-1 border-b border-white/[0.08]">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">Analyst Experience</h3>
          <span className="text-[11px] text-white/40">Probabilistic & Spatial Telemetry</span>
        </div>
        <span className="text-[10px] font-mono text-[#0a84ff] bg-[#0a84ff]/10 px-2.5 py-0.5 rounded-full border border-[#0a84ff]/20 font-semibold">
          10Hz RAW TELEMETRY
        </span>
      </div>

      {/* Pass Difficulty Rating (PDR) */}
      <div className="rounded-2xl apple-glass-card p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white/80">
            Pass Difficulty Rating (PDR)
          </span>
          <span className="font-mono font-bold text-sm text-[#ffd60a]">
            {pdr} <span className="text-[10px] text-white/40">/ 100</span>
          </span>
        </div>

        {/* Minimal Apple Bar */}
        <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              pdr > 75 ? 'bg-[#ff453a]' : pdr > 50 ? 'bg-[#ff9f0a]' : 'bg-[#30d158]'
            }`}
            style={{ width: `${pdr}%` }}
          />
        </div>

        <p className="text-[11px] text-white/40 leading-relaxed pt-0.5">
          Composite evaluation of receiver coverage, defender velocities, passer pressure, and lane corridor obstruction.
        </p>
      </div>

      {/* Pitch Control Dominance */}
      <div className="rounded-2xl apple-glass-card p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white/80">
            Pitch Control Dominance
          </span>
          <span className="text-[10px] font-mono text-white/40">Voronoi Metric</span>
        </div>

        <div className="flex h-2.5 w-full rounded-full overflow-hidden text-[8px] font-bold text-white bg-white/[0.06]">
          <div
            className="bg-[#0a84ff] transition-all duration-300"
            style={{ width: `${metrics?.pitchControl.homePercentage || 50}%` }}
          />
          <div
            className="bg-white/20 transition-all duration-300"
            style={{ width: `${metrics?.pitchControl.contestedPercentage || 10}%` }}
          />
          <div
            className="bg-[#ff453a] transition-all duration-300"
            style={{ width: `${metrics?.pitchControl.awayPercentage || 40}%` }}
          />
        </div>

        <div className="flex justify-between text-[10px] font-medium text-white/50">
          <span className="text-[#0a84ff]">MCI: {metrics?.pitchControl.homePercentage}%</span>
          <span>Contested: {metrics?.pitchControl.contestedPercentage}%</span>
          <span className="text-[#ff453a]">ARS: {metrics?.pitchControl.awayPercentage}%</span>
        </div>
      </div>

      {/* Active Passing Lanes */}
      <div className="rounded-2xl apple-glass-card p-4 space-y-2">
        <span className="text-xs font-semibold text-white/80 block">
          Passing Lane Obstructive Density
        </span>
        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
          {frame?.passingLanes.map((lane, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-1.5 text-[11px] border border-white/[0.05]"
            >
              <span className="text-white/70">
                Lane <strong className="text-white">{lane.passerId}</strong> &rarr; <strong className="text-white">{lane.receiverId}</strong>
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-white/40 text-[10px]">PDR {lane.passDifficultyRating}</span>
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    lane.isClear
                      ? 'bg-[#30d158]/15 text-[#30d158]'
                      : 'bg-[#ff9f0a]/15 text-[#ff9f0a]'
                  }`}
                >
                  {lane.isClear ? 'OPEN' : 'CONTESTED'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tactical Explanation */}
      <div className="rounded-2xl bg-white/[0.03] p-3.5 border-l-2 border-l-[#0a84ff] border-white/[0.06]">
        <span className="text-[10px] font-bold text-[#0a84ff] uppercase tracking-wider block mb-1">
          Tactical Reasoning Engine
        </span>
        <p className="text-xs text-white/70 leading-relaxed font-mono">
          {frame?.latestNarrative.analystContext || 'Ingesting continuous pitch tracking telemetry...'}
        </p>
      </div>
    </div>
  );
};
