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
} from '@ionic/react';
import {
  sparklesOutline,
  trendingUpOutline,
  flashOutline,
  ribbonOutline,
} from 'ionicons/icons';

interface CasualExperienceViewProps {
  frame: TelemetryFrame | null;
}

export const CasualExperienceView: React.FC<CasualExperienceViewProps> = ({ frame }) => {
  const narrative = frame?.latestNarrative;

  return (
    <div className="space-y-4">
      {/* Title & Badge */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-xl bg-[#ff9f0a]/20 flex items-center justify-center text-[#ff9f0a]">
            <IonIcon icon={sparklesOutline} className="text-base" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Casual Experience</h3>
            <span className="text-[10px] text-white/50">Storylines, Duels & Moments</span>
          </div>
        </div>
        <IonBadge color="warning" className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full">
          Storyline & Narrative
        </IonBadge>
      </div>

      {/* Main Headline Arc Card */}
      <IonCard className="apple-glass rounded-2xl overflow-hidden border border-white/10 m-0 bg-gradient-to-br from-white/10 to-transparent">
        <IonCardContent className="p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#ffd60a] uppercase tracking-wider">
            <IonIcon icon={trendingUpOutline} />
            Live Match Narrative
          </div>
          <h4 className="text-sm font-bold text-white tracking-tight">
            {narrative?.headline.en || 'Analyzing Match Story Arc'}
          </h4>
          <p className="text-xs text-white/70 leading-relaxed">
            {narrative?.casualContext || 'Real-time narrative unfolding...'}
          </p>
        </IonCardContent>
      </IonCard>

      {/* Key Pitch Duel Spotlight */}
      <IonCard className="apple-glass rounded-2xl overflow-hidden border border-white/10 m-0">
        <IonCardContent className="p-4 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white/90">
            <IonIcon icon={flashOutline} className="text-[#ff453a]" />
            Key Pitch Duel: Haaland vs. Saliba
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-center">
            <div className="rounded-2xl bg-white/5 p-3 border border-white/5">
              <span className="text-[11px] font-bold text-[#0a84ff]">Erling Haaland</span>
              <div className="text-lg font-black text-white mt-0.5 font-mono">
                34.8 <span className="text-[10px] text-white/40 font-normal">km/h</span>
              </div>
              <div className="text-[10px] text-white/50 font-medium">Top Sprint Burst</div>
            </div>
            <div className="rounded-2xl bg-white/5 p-3 border border-white/5">
              <span className="text-[11px] font-bold text-[#ff453a]">William Saliba</span>
              <div className="text-lg font-black text-white mt-0.5 font-mono">
                5 <span className="text-[10px] text-white/40 font-normal">duels</span>
              </div>
              <div className="text-[10px] text-white/50 font-medium">80% In-Box Win Rate</div>
            </div>
          </div>
        </IonCardContent>
      </IonCard>

      {/* Milestone Spotlight */}
      <IonCard className="apple-glass rounded-2xl overflow-hidden border border-white/10 m-0">
        <IonCardContent className="p-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white/90 mb-2.5">
            <IonIcon icon={ribbonOutline} className="text-[#bf5af2]" />
            Player Milestone Tracker
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-white/5 p-3 border border-white/5">
            <div className="rounded-xl bg-[#bf5af2]/20 p-2.5 text-[#bf5af2] font-black text-sm">
              100
            </div>
            <div>
              <div className="text-xs font-bold text-white">Rodri — 100 Pitch Touches</div>
              <p className="text-[11px] text-white/60 mt-0.5 leading-snug">
                Rodri surpasses 100 touches in this match with a 94.2% completion accuracy.
              </p>
            </div>
          </div>
        </IonCardContent>
      </IonCard>
    </div>
  );
};
