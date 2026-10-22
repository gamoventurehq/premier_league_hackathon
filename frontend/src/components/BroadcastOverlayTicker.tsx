'use client';

import React, { useState } from 'react';
import { TelemetryFrame, BroadcastLanguage } from '../types/telemetry';
import {
  IonCard,
  IonCardContent,
  IonBadge,
  IonIcon,
} from '@ionic/react';
import {
  tvOutline,
  warningOutline,
  globeOutline,
} from 'ionicons/icons';

interface BroadcastOverlayTickerProps {
  frame: TelemetryFrame | null;
}

const LANGUAGES: { code: BroadcastLanguage; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' }
];

export const BroadcastOverlayTicker: React.FC<BroadcastOverlayTickerProps> = ({ frame }) => {
  const [selectedLanguage, setSelectedLanguage] = useState<BroadcastLanguage>('en');
  const narrative = frame?.latestNarrative;
  const isInflection = narrative?.isTacticalInflectionPoint;

  return (
    <IonCard className="apple-glass rounded-3xl overflow-hidden shadow-2xl border border-white/10 m-0">
      <IonCardContent className="p-4 space-y-3">
        {/* Top Bar: Feed Header & Multilingual Language Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-[#0a84ff]/20 flex items-center justify-center text-[#0a84ff]">
              <IonIcon icon={tvOutline} className="text-sm" />
            </div>
            <span className="text-xs font-bold text-white tracking-tight">
              Broadcast Overlay Feed
            </span>
            {isInflection && (
              <IonBadge color="danger" className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                <IonIcon icon={warningOutline} className="text-xs" />
                Tactical Inflection Point
              </IonBadge>
            )}
          </div>

          {/* Multilingual Broadcast Stream Selector */}
          <div className="flex items-center gap-1 bg-black/40 border border-white/10 p-1 rounded-xl">
            <IonIcon icon={globeOutline} className="text-white/40 text-xs ml-1.5 mr-1" />
            <span className="text-[10px] text-white/50 uppercase font-semibold mr-1">Language:</span>
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSelectedLanguage(lang.code)}
                className={`rounded-lg px-2 py-1 text-xs font-semibold transition-all ${
                  selectedLanguage === lang.code
                    ? 'bg-white/20 text-white shadow-sm'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                {lang.flag} {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lower-Third Narrative Presentation */}
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex flex-col items-center justify-center rounded-2xl bg-white/5 border border-white/10 px-4 py-2 min-w-24 text-center">
            <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold">MATCH CLOCK</span>
            <span className="text-sm font-black text-[#ffd60a] font-mono">{frame?.matchClock || '68:42'}</span>
            <span className="text-[8px] text-[#30d158] font-bold mt-0.5">&lt;50ms SYNC</span>
          </div>

          <div className="flex-1">
            <h4 className="text-sm font-bold text-white tracking-tight">
              {narrative?.headline[selectedLanguage] || 'Sustained Possession Sequence in Final Third'}
            </h4>
            <p className="mt-1 text-xs text-white/70 leading-relaxed font-sans">
              {narrative?.tacticalExplanation[selectedLanguage] ||
                'Continuous tracking telemetry processed via Azure AI Foundry narrative synthesis.'}
            </p>
          </div>
        </div>
      </IonCardContent>
    </IonCard>
  );
};
