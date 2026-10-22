'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

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

  const heroRef = useRef<HTMLDivElement>(null);
  const studioSectionRef = useRef<HTMLDivElement>(null);
  const bentoGridRef = useRef<HTMLDivElement>(null);

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

  // GSAP Entrance Animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero headline gentle fade-in
      gsap.fromTo(
        '.gsap-hero-anim',
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 1.1, stagger: 0.15, ease: 'power3.out' }
      );

      // Bento cards scale and reveal on scroll
      gsap.fromTo(
        '.gsap-bento-card',
        { opacity: 0, y: 30, scale: 0.98 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          stagger: 0.12,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: bentoGridRef.current,
            start: 'top 85%',
          },
        }
      );
    });

    return () => ctx.revert();
  }, []);

  const handleScenarioChange = (scenario: SyntheticScenarioType) => {
    simulation.setScenario(scenario);
    setFrame(simulation.nextFrame());
  };

  const scrollToStudio = () => {
    studioSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <main className="overflow-x-hidden w-full max-w-full min-h-screen bg-black text-[#f5f5f7]">
      {/* 1. Floating Apple-Style Glass Navigation Header */}
      <BroadcastHeader
        matchClock={frame?.matchClock || '68:42'}
        metrics={frame?.metrics || null}
        currentScenario={simulation.getScenario()}
        onScenarioChange={handleScenarioChange}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
      />

      {/* 2. ATTENTION: Editorial Cinematic Hero (Wide container, 2-line title rule) */}
      <section
        ref={heroRef}
        className="relative flex flex-col items-center justify-center pt-28 pb-36 px-4 text-center overflow-hidden"
      >
        {/* Subtle Ambient Stadium Radial Lighting */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-[#0a84ff]/20 via-[#64d2ff]/10 to-transparent blur-[140px] pointer-events-none rounded-full" />
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[350px] bg-gradient-to-bl from-[#ff453a]/15 via-[#bf5af2]/10 to-transparent blur-[120px] pointer-events-none rounded-full" />

        <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center">
          {/* Subtle Technology pill badge */}
          <div className="gsap-hero-anim inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3.5 py-1 text-xs font-semibold text-white/70 border border-white/[0.1] backdrop-blur-md mb-6">
            <span className="h-2 w-2 rounded-full bg-[#30d158] animate-pulse" />
            <span>Microsoft Premier League Hackathon</span>
            <span className="text-white/30">•</span>
            <span>Inside the Game</span>
          </div>

          {/* Guaranteed 2-Line Cinematic Title */}
          <h1 className="gsap-hero-anim max-w-5xl text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.08]">
            Football Intelligence.
            <br />
            <span className="text-white/60 font-medium">Reimagined for Every Eye.</span>
          </h1>

          {/* Understated Editorial Subheading */}
          <p className="gsap-hero-anim max-w-2xl text-base sm:text-lg text-white/50 font-normal leading-relaxed mt-6">
            Synthetic pitch space telemetry, instantaneous passing corridor evaluations, and personalized multi-persona narrative arcs powered by Azure AI Foundry.
          </p>

          {/* Two High-Contrast CTAs */}
          <div className="gsap-hero-anim flex flex-wrap items-center justify-center gap-4 mt-8">
            <button
              type="button"
              onClick={scrollToStudio}
              className="rounded-full bg-white px-7 py-3 text-sm font-bold text-black transition-all hover:bg-white/90 hover:scale-105 active:scale-95 shadow-xl"
            >
              Open Studio Terminal
            </button>
            <button
              type="button"
              onClick={() => {
                setActivePersona('analyst');
                scrollToStudio();
              }}
              className="rounded-full bg-white/[0.08] px-7 py-3 text-sm font-semibold text-white border border-white/[0.12] transition-all hover:bg-white/[0.15] hover:scale-105 active:scale-95 backdrop-blur-md"
            >
              Switch to Analyst Experience
            </button>
          </div>
        </div>
      </section>

      {/* 3. MAIN STUDIO INTERFACE: Broadcast Radar & Dynamic Personas */}
      <section
        ref={studioSectionRef}
        className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left / Center 8 Columns: Radar & Core Gauges */}
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
                Tap any player on the pitch to inspect
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
      </section>

      {/* 4. INTEREST: The Mathematically Flawless Gapless Bento Grid */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-28 border-t border-white/[0.06]">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Architecture Designed for Real-Time Precision
          </h2>
          <p className="text-sm sm:text-base text-white/50 mt-3 font-normal">
            Four specialized architectural pillars harmonized into a zero-stutter broadcast feed.
          </p>
        </div>

        {/* Gapless Dense Bento Grid */}
        <div
          ref={bentoGridRef}
          className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 grid-flow-dense"
        >
          {/* Card 1: Pitch Control & Spatial Geometry (Span 2 cols) */}
          <div className="gsap-bento-card md:col-span-2 rounded-3xl apple-glass p-8 flex flex-col justify-between apple-glass-interactive">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="h-2 w-2 rounded-full bg-[#0a84ff]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#0a84ff]">
                  Spatial Analytics
                </span>
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Pitch Control Modeling
              </h3>
              <p className="text-xs text-white/50 mt-2 leading-relaxed">
                Dynamic Voronoi access surfaces calculated from player sprint coordinates and velocity vectors over the standard 105m × 68m pitch.
              </p>
            </div>
            <div className="mt-8 rounded-2xl bg-white/[0.04] p-4 border border-white/[0.08] flex items-center justify-between font-mono text-xs">
              <span className="text-white/60">Spatial Sampling</span>
              <span className="text-[#30d158] font-bold">10Hz Synchronous</span>
            </div>
          </div>

          {/* Card 2: Tiered Fast-Path Architecture (Span 1 col) */}
          <div className="gsap-bento-card md:col-span-1 rounded-3xl apple-glass p-8 flex flex-col justify-between apple-glass-interactive">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="h-2 w-2 rounded-full bg-[#30d158]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#30d158]">
                  Zero Broadcast Stutter
                </span>
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Tiered Fast-Path
              </h3>
              <p className="text-xs text-white/50 mt-2 leading-relaxed">
                Separates sub-50ms deterministic statistics from 1.5s deep AI agent narrative reasoning.
              </p>
            </div>
            <div className="mt-8 text-2xl font-black text-white font-mono">
              &lt;50<span className="text-xs font-normal text-white/40 ml-1">ms</span>
            </div>
          </div>

          {/* Card 3: AI Swarm & Multilingual Narration (Span 1 col) */}
          <div className="gsap-bento-card md:col-span-1 rounded-3xl apple-glass p-8 flex flex-col justify-between apple-glass-interactive">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="h-2 w-2 rounded-full bg-[#bf5af2]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#bf5af2]">
                  Azure AI Foundry
                </span>
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Multilingual Swarm
              </h3>
              <p className="text-xs text-white/50 mt-2 leading-relaxed">
                Synchronous live narrative generation across English, Spanish, French, Japanese, and Arabic.
              </p>
            </div>
            <div className="mt-8 flex gap-1.5 text-base">
              <span>🇬🇧</span>
              <span>🇪🇸</span>
              <span>🇫🇷</span>
              <span>🇯🇵</span>
              <span>🇸🇦</span>
            </div>
          </div>

          {/* Card 4: Pass Difficulty Rating (Span 2 cols) */}
          <div className="gsap-bento-card md:col-span-2 rounded-3xl apple-glass p-8 flex flex-col justify-between apple-glass-interactive">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="h-2 w-2 rounded-full bg-[#ffd60a]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#ffd60a]">
                  Pass Difficulty Rating
                </span>
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Corridor Risk Evaluation
              </h3>
              <p className="text-xs text-white/50 mt-2 leading-relaxed">
                Computes interception density, receiver pressure, and corridor width for every passing option on the pitch in real time.
              </p>
            </div>
            <div className="mt-8 flex items-center justify-between text-xs text-white/50 font-mono">
              <span>Pass Completion Precision</span>
              <span className="text-[#ffd60a] font-bold">xP Probabilistic Matrix</span>
            </div>
          </div>

          {/* Card 5: Multi-Persona Presentation (Span 2 cols) */}
          <div className="gsap-bento-card md:col-span-2 rounded-3xl apple-glass p-8 flex flex-col justify-between apple-glass-interactive">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="h-2 w-2 rounded-full bg-[#ff453a]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#ff453a]">
                  Adaptive Delivery
                </span>
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Analyst & Casual Experiences
              </h3>
              <p className="text-xs text-white/50 mt-2 leading-relaxed">
                One unified stream projected seamlessly into deep spatial telemetry for technical directors or accessible storytelling for casual supporters.
              </p>
            </div>
            <div className="mt-8 flex items-center gap-2 text-xs font-medium text-white/60">
              <span className="rounded-full bg-white/[0.08] px-3 py-1">Analyst Experience</span>
              <span className="rounded-full bg-white/[0.08] px-3 py-1">Casual Experience</span>
              <span className="rounded-full bg-white/[0.08] px-3 py-1">Player Cam</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. ACTION: Minimalist Apple Footer */}
      <footer className="border-t border-white/[0.08] py-16 px-4 text-center">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.08] border border-white/10 mb-4">
            <span className="text-base font-black text-white"></span>
          </div>
          <p className="text-xs text-white/40 max-w-md leading-relaxed">
            Premier League Studio: Synthetic Match Insights Engine. Developed by Gamoventure for the Microsoft Premier League Hackathon: Inside the Game.
          </p>
          <div className="mt-6 flex gap-6 text-xs text-white/50 font-medium">
            <span>Synthetic Telemetry Only</span>
            <span>•</span>
            <span>Azure AI Foundry</span>
            <span>•</span>
            <span>Canonical CONTEXT.md Compliance</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
