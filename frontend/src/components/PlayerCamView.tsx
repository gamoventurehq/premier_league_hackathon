'use client';

import React from 'react';
import { TelemetryFrame } from '../types/telemetry';
import {
  IonCard,
  IonCardContent,
  IonBadge,
  IonIcon,
} from '@ionic/react';
import {
  videocamOutline,
  speedometerOutline,
  footstepsOutline,
  compassOutline,
} from 'ionicons/icons';

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
      {/* Title & Badge */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-xl bg-[#30d158]/20 flex items-center justify-center text-[#30d158]">
            <IonIcon icon={videocamOutline} className="text-base" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Player Cam</h3>
            <span className="text-[10px] text-white/50">Continuous Individual Spotlight</span>
          </div>
        </div>
        <IonBadge color="success" className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping mr-0.5"></span>
          Active Lock
        </IonBadge>
      </div>

      {/* Tracked Player Identity & Selector */}
      <IonCard className="apple-glass rounded-2xl overflow-hidden border border-white/10 m-0">
        <IonCardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl font-black text-white text-base shadow-lg ${
                  trackedPlayer.team === 'home' ? 'bg-[#0a84ff]' : 'bg-[#ff453a]'
                }`}
              >
                #{trackedPlayer.number}
              </div>
              <div>
                <div className="text-base font-extrabold text-white tracking-tight">{trackedPlayer.name}</div>
                <div className="text-xs text-white/50 font-medium">
                  {trackedPlayer.team === 'home' ? 'Manchester City' : 'Arsenal FC'} • {trackedPlayer.role}
                </div>
              </div>
            </div>

            {/* iOS Styled Select */}
            <select
              value={trackedPlayer.id}
              onChange={(e) => onSelectPlayer(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-white/90 outline-none cursor-pointer backdrop-blur-md"
            >
              {frame?.players.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#1c1c1e] text-white">
                  #{p.number} {p.name} ({p.team.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        </IonCardContent>
      </IonCard>

      {/* Real-Time Physical Metrics */}
      <div className="grid grid-cols-2 gap-2.5">
        <IonCard className="apple-glass rounded-2xl overflow-hidden border border-white/10 m-0">
          <IonCardContent className="p-3.5">
            <div className="flex items-center gap-1.5 text-xs text-white/50 mb-1">
              <IonIcon icon={speedometerOutline} className="text-[#0a84ff]" /> Current Velocity
            </div>
            <div className="text-xl font-black text-white font-mono">
              {trackedPlayer.speedKmH} <span className="text-xs font-normal text-white/40">km/h</span>
            </div>
            <div className="mt-2 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0a84ff] rounded-full transition-all duration-200"
                style={{ width: `${Math.min(100, (trackedPlayer.speedKmH / 36) * 100)}%` }}
              />
            </div>
          </IonCardContent>
        </IonCard>

        <IonCard className="apple-glass rounded-2xl overflow-hidden border border-white/10 m-0">
          <IonCardContent className="p-3.5">
            <div className="flex items-center gap-1.5 text-xs text-white/50 mb-1">
              <IonIcon icon={footstepsOutline} className="text-[#ffd60a]" /> Cumulative Distance
            </div>
            <div className="text-xl font-black text-white font-mono">
              {(trackedPlayer.distanceMeters / 1000).toFixed(2)}{' '}
              <span className="text-xs font-normal text-white/40">km</span>
            </div>
            <div className="mt-2 text-[10px] text-white/40">Work-rate: High Intensity</div>
          </IonCardContent>
        </IonCard>
      </div>

      {/* Coordinate & Vector Card */}
      <IonCard className="apple-glass rounded-2xl overflow-hidden border border-white/10 m-0">
        <IonCardContent className="p-3.5">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-white/80 font-semibold flex items-center gap-1.5">
              <IonIcon icon={compassOutline} className="text-[#bf5af2]" /> Pitch Space Coordinates (105m × 68m)
            </span>
            <span className="font-mono text-xs text-[#bf5af2] font-bold">
              x: {trackedPlayer.x}m, y: {trackedPlayer.y}m
            </span>
          </div>
          <p className="text-[11px] text-white/50 leading-relaxed">
            Continuous positional telemetry sampled at 10Hz, downsampled to 5Hz over WebSockets per ADR 0003.
          </p>
        </IonCardContent>
      </IonCard>
    </div>
  );
};
