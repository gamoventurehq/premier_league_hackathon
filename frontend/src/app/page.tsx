'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// Dynamically import the Ionic-driven studio client with ssr: false to eliminate SSR hydration mismatches
const PremierLeagueStudio = dynamic(
  () => import('../components/PremierLeagueStudio'),
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
          Loading live synthetic match insights engine...
        </div>
      </div>
    ),
  }
);

export default function Page() {
  return <PremierLeagueStudio />;
}
