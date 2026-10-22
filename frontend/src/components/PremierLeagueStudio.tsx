'use client';

import React, { useState, useEffect, useMemo } from 'react';
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

import {
  IonApp,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonIcon,
  setupIonicReact,
} from '@ionic/react';
import {
  analyticsOutline,
  sparklesOutline,
  videocamOutline,
  shieldOutline,
  layersOutline,
  eyeOutline,
} from 'ionicons/icons';

// Initialize Ionic in client component only
setupIonicReact({
  mode: 'ios',
});

export default function PremierLeagueStudio() {
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
    // Generate initial frame immediately on mount
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
    <IonApp className="min-h-screen bg-black text-[#f5f5f7]">
      {/* 1. Apple-Style Ionic Header */}
      <BroadcastHeader
        matchClock={frame?.matchClock || '68:42'}
        metrics={frame?.metrics || null}
        currentScenario={simulation.getScenario()}
        onScenarioChange={handleScenarioChange}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
      />

      {/* Main Studio Content Viewport */}
      <IonContent className="[--background:#000000] p-4 lg:p-6">
        <div className="max-w-[1720px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 p-4">
          {/* Left / Center: Pitch Space Radar Stage */}
          <section className="lg:col-span-8 flex flex-col gap-4">
            {/* Visual Layer Quick Chips */}
            <div className="flex flex-wrap items-center justify-between gap-2 apple-glass px-3.5 py-2 rounded-2xl border border-white/10">
              <div className="flex items-center gap-1.5 flex-wrap">
                <IonIcon icon={layersOutline} className="text-white/40 text-sm ml-1 mr-0.5" />
                <span className="text-xs font-semibold text-white/50 tracking-tight mr-1">
                  Radar Layers:
                </span>

                <button
                  type="button"
                  onClick={() => setShowPitchControl(!showPitchControl)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold border transition-all ${
                    showPitchControl
                      ? 'bg-[#0a84ff]/20 text-[#64d2ff] border-[#0a84ff]/40 shadow-sm'
                      : 'bg-white/5 text-white/40 border-white/5'
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
                      : 'bg-white/5 text-white/40 border-white/5'
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
                      : 'bg-white/5 text-white/40 border-white/5'
                  }`}
                >
                  Velocity Vectors
                </button>
              </div>

              <div className="text-[11px] text-white/40 font-medium flex items-center gap-1.5 mr-1">
                <IonIcon icon={eyeOutline} className="text-white/30 text-xs" />
                <span>Tap any player to focus</span>
              </div>
            </div>

            {/* 60FPS Pitch Radar Canvas (ADR 0003 & ADR 0007) */}
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

            {/* Control vs. Chaos Index Gauge & Game Rhythm */}
            <ControlVsChaosGauge metrics={frame?.metrics || null} />

            {/* Broadcast Overlay Lower-Third Ticker & Multilingual Feed */}
            <BroadcastOverlayTicker frame={frame} />
          </section>

          {/* Right Stage: Apple-Inspired Multi-Persona Studio Panel */}
          <section className="lg:col-span-4 flex flex-col gap-4">
            {/* iOS Segmented Persona Switcher */}
            <IonSegment
              value={activePersona}
              onIonChange={(e) => setActivePersona((e.detail.value as ExperiencePersona) || 'analyst')}
              className="apple-glass rounded-2xl p-1 border border-white/10"
            >
              <IonSegmentButton value="analyst">
                <div className="flex items-center gap-1.5 py-1">
                  <IonIcon icon={analyticsOutline} />
                  <IonLabel>Analyst</IonLabel>
                </div>
              </IonSegmentButton>

              <IonSegmentButton value="casual">
                <div className="flex items-center gap-1.5 py-1">
                  <IonIcon icon={sparklesOutline} />
                  <IonLabel>Casual</IonLabel>
                </div>
              </IonSegmentButton>

              <IonSegmentButton value="player_cam">
                <div className="flex items-center gap-1.5 py-1">
                  <IonIcon icon={videocamOutline} />
                  <IonLabel>Player Cam</IonLabel>
                </div>
              </IonSegmentButton>

              <IonSegmentButton value="club_centric">
                <div className="flex items-center gap-1.5 py-1">
                  <IonIcon icon={shieldOutline} />
                  <IonLabel>Club</IonLabel>
                </div>
              </IonSegmentButton>
            </IonSegment>

            {/* Active Persona Experience Card */}
            <div className="flex-1 rounded-3xl apple-glass p-5 border border-white/10 shadow-2xl">
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
          </section>
        </div>
      </IonContent>
    </IonApp>
  );
}
