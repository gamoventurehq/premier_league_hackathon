'use client';

import React, { useState } from 'react';
import { TelemetryFrame, BroadcastLanguage } from '../types/telemetry';

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
    <div className="rounded-3xl apple-glass p-5 shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3 mb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-white tracking-tight uppercase">
            Broadcast Overlay
          </span>
          {isInflection && (
            <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[10px] font-bold text-rose-400 border border-rose-500/30 flex items-center gap-1.5 animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              Tactical Inflection Point
            </span>
          )}
        </div>

        {/* Apple Pill Language Selector */}
        <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.06]">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => setSelectedLanguage(lang.code)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                selectedLanguage === lang.code
                  ? 'bg-white/20 text-white font-bold shadow-sm'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              <span className="mr-1">{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-4">
        <div className="hidden sm:flex flex-col items-center justify-center rounded-2xl bg-white/[0.04] px-4 py-2 min-w-24 text-center border border-white/[0.06]">
          <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold">MATCH CLOCK</span>
          <span className="text-sm font-black text-[#ffd60a] font-mono">{frame?.matchClock || '68:42'}</span>
          <span className="text-[9px] text-[#30d158] font-bold mt-0.5">&lt;50ms SYNC</span>
        </div>

        <div className="flex-1">
          <h4 className="text-sm font-bold text-white tracking-tight">
            {narrative?.headline[selectedLanguage] || 'Sustained Possession Sequence in Final Third'}
          </h4>
          <p className="mt-1 text-xs text-white/60 leading-relaxed">
            {narrative?.tacticalExplanation[selectedLanguage] ||
              'Real-time tactical intelligence synthesized via Azure AI Foundry narrative agents.'}
          </p>
        </div>
      </div>
    </div>
  );
};
