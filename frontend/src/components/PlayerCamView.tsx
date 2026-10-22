'use client';

import React from 'react';
import { TelemetryFrame } from '../types/telemetry';

interface PlayerCamViewProps {
  frame: TelemetryFrame | null;
  selectedPlayerId?: string;
  onSelectPlayer: (id: string) => void;
}

export const PlayerCamView: React.FC<PlayerCamViewProps> = ({
  frame,
  selectedPlayerId,
  onSelectPlayer,
}) => {
  const trackedPlayer =
    frame?.players.find((p) => p.id === selectedPlayerId) ||
    frame?.players.find((p) => p.isDesignatedPlayerCam) ||
    frame?.players[10];

  if (!trackedPlayer) return null;

  return (
    <div className="space-y-4">
      {/* View Header */}
      <div className="flex items-center justify-between pb-1 border-b border-white/[0.08]">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">Player Cam</h3>
          <span className="text-[11px] text-white/40">Dedicated Individual Spotlight</span>
        </div>
        <span className="text-[10px] font-semibold text-[#30d158] bg-[#30d158]/10 px-2.5 py-0.5 rounded-full border border-[#30d158]/20 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#30d158] animate-ping" />
          Active Lock
        </span>
      </div>

      {/* Tracked Player Identity & Selector */}
      <div className="rounded-2xl apple-glass-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-2xl font-black text-white text-base shadow-md ${
                trackedPlayer.team === 'home' ? 'bg-[#0a84ff]' : 'bg-[#ff453a]'
              }`}
            >
              #{trackedPlayer.number}
            </div>
            <div>
              <div className="text-base font-extrabold text-white tracking-tight">{trackedPlayer.name}</div>
              <div className="text-xs text-white/40">
                {trackedPlayer.team === 'home' ? 'Manchester City' : 'Arsenal FC'} • {trackedPlayer.role}
              </div>
            </div>
          </div>

          <select
            value={trackedPlayer.id}
            onChange={(e) => onSelectPlayer(e.target.value)}
            className="rounded-xl border border-white/[0.1] bg-white/[0.06] px-2.5 py-1.5 text-xs font-semibold text-white/90 outline-none cursor-pointer backdrop-blur-md"
          >
            {frame?.players.map((p) => (
              <option key={p.id} value={p.id} className="bg-[#12141a] text-white">
                #{p.number} {p.name} ({p.team.toUpperCase()})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Physical Telemetry Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl apple-glass-card p-3.5">
          <span className="text-xs text-white/50 block">Current Velocity</span>
          <div className="text-xl font-black text-white font-mono mt-1">
            {trackedPlayer.speedKmH} <span className="text-xs font-normal text-white/40">km/h</span>
          </div>
          <div className="mt-2 h-1 w-full bg-white/[0.08] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0a84ff] rounded-full transition-all duration-200"
              style={{ width: `${Math.min(100, (trackedPlayer.speedKmH / 36) * 100)}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl apple-glass-card p-3.5">
          <span className="text-xs text-white/50 block">Distance Covered</span>
          <div className="text-xl font-black text-white font-mono mt-1">
            {(trackedPlayer.distanceMeters / 1000).toFixed(2)}{' '}
            <span className="text-xs font-normal text-white/40">km</span>
          </div>
          <div className="mt-2 text-[10px] text-white/40">Work-rate: High</div>
        </div>
      </div>

      {/* Coordinate Positioning */}
      <div className="rounded-2xl apple-glass-card p-3.5">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-white/70 font-semibold">Pitch Space Coordinates (105m × 68m)</span>
          <span className="font-mono text-xs text-[#bf5af2] font-bold">
            x: {trackedPlayer.x}m, y: {trackedPlayer.y}m
          </span>
        </div>
        <p className="text-[11px] text-white/40 leading-relaxed">
          Off-ball spatial tracking with velocity vectors sampled synchronously at 10Hz.
        </p>
      </div>
    </div>
  );
};
