'use client';

import React, { useState } from 'react';
import { TelemetryFrame, TeamSide } from '../types/telemetry';
import {
  IonCard,
  IonCardContent,
  IonBadge,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonLabel,
} from '@ionic/react';
import {
  shieldOutline,
  locateOutline,
  flagOutline,
} from 'ionicons/icons';

interface ClubCentricViewProps {
  frame: TelemetryFrame | null;
}

export const ClubCentricView: React.FC<ClubCentricViewProps> = ({ frame }) => {
  const [selectedClub, setSelectedClub] = useState<TeamSide>('home');
  const narrative = frame?.latestNarrative;

  return (
    <div className="space-y-4">
      {/* Title & Badge */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-xl bg-[#bf5af2]/20 flex items-center justify-center text-[#bf5af2]">
            <IonIcon icon={shieldOutline} className="text-base" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Club-Centric Experience</h3>
            <span className="text-[10px] text-white/50">Supporter Perspective Framing</span>
          </div>
        </div>
        <IonBadge color="tertiary" className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full">
          Supporter Lens
        </IonBadge>
      </div>

      {/* iOS Segmented Control for Club Switching */}
      <IonSegment
        value={selectedClub}
        onIonChange={(e) => setSelectedClub((e.detail.value as TeamSide) || 'home')}
        className="w-full"
      >
        <IonSegmentButton value="home">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#0a84ff] inline-block"></span>
            <IonLabel>Man City</IonLabel>
          </div>
        </IonSegmentButton>
        <IonSegmentButton value="away">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#ff453a] inline-block"></span>
            <IonLabel>Arsenal FC</IonLabel>
          </div>
        </IonSegmentButton>
      </IonSegment>

      {/* Club Tactical Narrative Framing */}
      <IonCard className="apple-glass rounded-2xl overflow-hidden border border-white/10 m-0">
        <IonCardContent className="p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#bf5af2]">
            <IonIcon icon={locateOutline} />
            {selectedClub === 'home' ? 'Manchester City Tactical Plan' : 'Arsenal Tactical Execution'}
          </div>
          <p className="text-xs text-white/90 leading-relaxed font-medium">
            {selectedClub === 'home'
              ? narrative?.clubCentricContext.homeFrame || 'Analyzing City build-up structures...'
              : narrative?.clubCentricContext.awayFrame || 'Analyzing Arsenal defensive shape and transitions...'}
          </p>
        </IonCardContent>
      </IonCard>

      {/* Key Match Directives */}
      <IonCard className="apple-glass rounded-2xl overflow-hidden border border-white/10 m-0">
        <IonCardContent className="p-4 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white/90">
            <IonIcon icon={flagOutline} className="text-[#30d158]" />
            Key Tactical Directives
          </div>
          <div className="space-y-2 text-xs">
            {selectedClub === 'home' ? (
              <>
                <div className="rounded-xl bg-white/5 p-2.5 border border-white/5 text-[11px] text-white/80">
                  1. High territorial sustain: 68% pitch control pinning Arsenal defensive shape.
                </div>
                <div className="rounded-xl bg-white/5 p-2.5 border border-white/5 text-[11px] text-white/80">
                  2. De Bruyne half-space runs between Saliba and White.
                </div>
              </>
            ) : (
              <>
                <div className="rounded-xl bg-white/5 p-2.5 border border-white/5 text-[11px] text-white/80">
                  1. Compact low block within 20m of penalty line to restrict Haaland space.
                </div>
                <div className="rounded-xl bg-white/5 p-2.5 border border-white/5 text-[11px] text-white/80">
                  2. Rapid vertical releases to Saka and Martinelli within 2 touches.
                </div>
              </>
            )}
          </div>
        </IonCardContent>
      </IonCard>
    </div>
  );
};
