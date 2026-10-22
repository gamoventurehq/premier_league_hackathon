'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { TelemetryFrame, ExperiencePersona, SyntheticScenarioType } from '../types/telemetry';
import { MockSimulationEngine } from '../lib/mock-simulation';
import { PitchRadarCanvas } from './PitchRadarCanvas';
import { BroadcastHeader } from './BroadcastHeader';
import { ControlVsChaosGauge } from './ControlVsChaosGauge';
import { AnalystExperienceView } from './AnalystExperienceView';
import { CasualExperienceView } from './CasualExperienceView';
import { PlayerCamView } from './PlayerCamView';
import { ClubCentricView } from './ClubCentricView';
import { BroadcastOverlayTicker } from './BroadcastOverlayTicker';

export default function StudioTerminal() {
  const simulation = useMemo(() => new MockSimulationEngine(), []);
  const [frame, setFrame] = useState<TelemetryFrame | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [activePersona, setActivePersona] = useState<ExperiencePersona>('analyst');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('h11'); // Erling Haaland by default

  // Radar layer toggles
  const [showPitchControl, setShowPitchControl] = useState<boolean>(true);
  const [showPassingLanes, setShowPassingLanes] = useState<boolean>(true);
  const [showSpeedVectors, setShowSpeedVectors] = useState<boolean>(true);

  // 5Hz telemetry stream per ADR 0003
  useEffect(() => {
    setFrame(simulation.nextFrame());

    if (!isPlaying) return;

    const interval = setInterval(() => {
      const nextFrame = simulation.nextFrame();
      setFrame(nextFrame);
    }, 200);

    return () => clearInterval(interval);
  }, [isPlaying, simulation]);

  const handleScenarioChange = (scenario: SyntheticScenarioType) => {
    simulation.setScenario(scenario);
    setFrame(simulation.nextFrame());
  };

  return (
    <div className="min-h-screen bg-black text-[#f5f5f7]">
      {/* Broadcast Header Bar */}
      <BroadcastHeader
        matchClock={frame?.matchClock || '68:42'}
        metrics={frame?.metrics || null}
        currentScenario={simulation.getScenario()}
        onScenarioChange={handleScenarioChange}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
      />

      {/* Breadcrumb / Top Bar */}
      <div className="border-b border-white/[0.06] bg-white/[0.02] px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-white/50">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-white/60 hover:text-white transition font-medium"
            >
              <span>←</span>
              <span>Overview</span>
            </Link>
            <span>/</span>
            <span className="text-white font-semibold">Live Studio Terminal</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#30d158] animate-pulse" />
            <span className="font-mono text-[11px] text-[#30d158]">CONNECTED (5Hz SYNC)</span>
          </div>
        </div>
      </div>

      {/* Main Studio Viewport */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left / Center 8 Columns: Radar & Pitch Analytics */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Radar Quick Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 apple-glass px-4 py-2.5 rounded-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-white/40 tracking-tight mr-1">
                  Radar Layers:
                </span>

                <button
                  type="button"
                  onClick={() => setShowPitchControl(!showPitchControl)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold border transition-all ${
                    showPitchControl
                      ? 'bg-[#0a84ff]/20 text-[#64d2ff] border-[#0a84ff]/40 shadow-sm'
                      : 'bg-white/[0.04] text-white/40 border-white/[0.06]'
                  }`}
                >
                  Pitch Control
                </button>

                <button
                  type="button"
                  onClick={() => setShowPassingLanes(!showPassingLanes)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold border transition-all ${
                    showPassingLanes
                      ? 'bg-[#30d158]/20 text-[#30d158] border-[#30d158]/40 shadow-sm'
                      : 'bg-white/[0.04] text-white/40 border-white/[0.06]'
                  }`}
                >
                  Passing Lanes & PDR
                </button>

                <button
                  type="button"
                  onClick={() => setShowSpeedVectors(!showSpeedVectors)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold border transition-all ${
                    showSpeedVectors
                      ? 'bg-[#bf5af2]/20 text-[#bf5af2] border-[#bf5af2]/40 shadow-sm'
                      : 'bg-white/[0.04] text-white/40 border-white/[0.06]'
                  }`}
                >
                  Velocity Vectors
                </button>
              </div>

              <div className="text-[11px] text-white/40 font-medium">
                Tap any player on pitch to lock camera
              </div>
            </div>

            {/* 60FPS Metric Pitch Space Radar (ADR 0003 & ADR 0007) */}
            <PitchRadarCanvas
              frame={frame}
              showPitchControl={showPitchControl}
              showPassingLanes={showPassingLanes}
              showSpeedVectors={showSpeedVectors}
              selectedPlayerId={selectedPlayerId}
              onSelectPlayer={(id) => {
                setSelectedPlayerId(id);
                setActivePersona('player_cam');
              }}
            />

            {/* Control vs. Chaos Index Gauge */}
            <ControlVsChaosGauge metrics={frame?.metrics || null} />

            {/* Broadcast Overlay Lower-Third Ticker & Multilingual Stream */}
            <BroadcastOverlayTicker frame={frame} />
          </div>

          {/* Right 4 Columns: Dynamic Multi-Persona Terminal */}
          <div className="lg:col-span-4 flex flex-col gap-5 sticky top-24">
            {/* Apple Segmented Persona Navigation */}
            <div className="grid grid-cols-4 gap-1 rounded-2xl bg-white/[0.06] p-1 border border-white/[0.1] backdrop-blur-xl">
              <button
                type="button"
                onClick={() => setActivePersona('analyst')}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-semibold transition-all ${
                  activePersona === 'analyst'
                    ? 'bg-white text-black font-bold shadow-md'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                Analyst
              </button>

              <button
                type="button"
                onClick={() => setActivePersona('casual')}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-semibold transition-all ${
                  activePersona === 'casual'
                    ? 'bg-white text-black font-bold shadow-md'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                Casual
              </button>

              <button
                type="button"
                onClick={() => setActivePersona('player_cam')}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-semibold transition-all ${
                  activePersona === 'player_cam'
                    ? 'bg-white text-black font-bold shadow-md'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                Player Cam
              </button>

              <button
                type="button"
                onClick={() => setActivePersona('club_centric')}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-semibold transition-all ${
                  activePersona === 'club_centric'
                    ? 'bg-white text-black font-bold shadow-md'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                Club
              </button>
            </div>

            {/* Active Persona Terminal Display */}
            <div className="rounded-3xl apple-glass p-6 shadow-2xl">
              {activePersona === 'analyst' && <AnalystExperienceView frame={frame} />}
              {activePersona === 'casual' && <CasualExperienceView frame={frame} />}
              {activePersona === 'player_cam' && (
                <PlayerCamView
                  frame={frame}
                  selectedPlayerId={selectedPlayerId}
                  onSelectPlayer={(id) => setSelectedPlayerId(id)}
                />
              )}
              {activePersona === 'club_centric' && <ClubCentricView frame={frame} />}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
