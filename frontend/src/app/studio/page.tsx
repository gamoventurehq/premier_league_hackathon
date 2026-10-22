'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const StudioTerminal = dynamic(
  () => import('../../components/StudioTerminal'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <div className="h-10 w-10 rounded-2xl bg-gradient-to-b from-white/20 to-white/5 border border-white/20 flex items-center justify-center text-lg font-black mb-3 shadow-inner">
          
        </div>
        <div className="text-sm font-semibold tracking-tight text-white">
          Premier League Studio
        </div>
        <div className="text-xs text-white/40 mt-1 font-mono">
          Initializing 60FPS Pitch Space Radar & Multi-Persona Engine...
        </div>
      </div>
    ),
  }
);

export default function StudioPage() {
  return <StudioTerminal />;
}
