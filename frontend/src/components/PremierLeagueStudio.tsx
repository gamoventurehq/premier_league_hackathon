'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function PremierLeagueOverview() {
  const heroRef = useRef<HTMLDivElement>(null);
  const bentoGridRef = useRef<HTMLDivElement>(null);
  const pipelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero elements entrance
      gsap.fromTo(
        '.gsap-hero-anim',
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 1.0, stagger: 0.12, ease: 'power3.out' }
      );

      // Feature Bento cards reveal
      gsap.fromTo(
        '.gsap-bento-card',
        { opacity: 0, y: 28, scale: 0.98 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.7,
          stagger: 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: bentoGridRef.current,
            start: 'top 85%',
          },
        }
      );

      // Pipeline cards reveal
      gsap.fromTo(
        '.gsap-pipeline-step',
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.08,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: pipelineRef.current,
            start: 'top 85%',
          },
        }
      );
    });

    return () => ctx.revert();
  }, []);

  return (
    <main className="overflow-x-hidden w-full max-w-full min-h-screen bg-black text-[#f5f5f7]">
      {/* 1. Minimal Apple Frosted Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-black/70 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-b from-white/15 to-white/5 border border-white/15 shadow-inner">
              <span className="text-sm font-black text-white"></span>
            </div>
            <div>
              <span className="text-sm font-semibold tracking-tight text-white block">
                Premier League Studio
              </span>
              <span className="text-[11px] text-white/40 tracking-tight">
                Synthetic Match Insights Engine
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-white/50 bg-white/[0.04] px-3 py-1 rounded-full border border-white/[0.06]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#30d158] animate-pulse" />
              <span>Azure AI Foundry</span>
            </div>
            <Link
              href="/studio"
              className="rounded-full bg-white px-5 py-2 text-xs font-bold text-black transition-all hover:bg-white/90 hover:scale-105 active:scale-95 shadow-md"
            >
              Enter Studio →
            </Link>
          </div>
        </div>
      </header>

      {/* 2. ATTENTION: Editorial Cinematic Hero */}
      <section
        ref={heroRef}
        className="relative flex flex-col items-center justify-center pt-28 pb-32 px-4 text-center overflow-hidden"
      >
        {/* Stadium Ambient Radial Lights */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-[#0a84ff]/20 via-[#64d2ff]/10 to-transparent blur-[140px] pointer-events-none rounded-full" />
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[350px] bg-gradient-to-bl from-[#ff453a]/15 via-[#bf5af2]/10 to-transparent blur-[120px] pointer-events-none rounded-full" />

        <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center">
          {/* Contest Badge */}
          <div className="gsap-hero-anim inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-1.5 text-xs font-semibold text-white/70 border border-white/[0.1] backdrop-blur-md mb-8">
            <span className="h-2 w-2 rounded-full bg-[#30d158] animate-pulse" />
            <span>Microsoft Premier League Hackathon: Inside the Game</span>
          </div>

          {/* Guaranteed 2-Line Cinematic Title */}
          <h1 className="gsap-hero-anim max-w-5xl text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.08]">
            Football Intelligence.
            <br />
            <span className="text-white/60 font-medium">Reimagined for Every Eye.</span>
          </h1>

          {/* Clean Description */}
          <p className="gsap-hero-anim max-w-2xl text-base sm:text-lg text-white/50 font-normal leading-relaxed mt-6">
            A real-time insights engine powered by Azure AI Foundry that transforms streaming synthetic football telemetry into explainable broadcast narratives and personalized fan experiences.
          </p>

          {/* Single Primary Action Button */}
          <div className="gsap-hero-anim flex flex-col sm:flex-row items-center gap-4 mt-10">
            <Link
              href="/studio"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-bold text-black transition-all hover:bg-white/90 hover:scale-105 active:scale-95 shadow-2xl"
            >
              <span>Enter Live Studio</span>
              <span className="text-base">→</span>
            </Link>

            <a
              href="#architecture"
              className="inline-flex items-center justify-center rounded-full bg-white/[0.08] px-8 py-3.5 text-sm font-semibold text-white border border-white/[0.12] transition-all hover:bg-white/[0.15] hover:scale-105 active:scale-95 backdrop-blur-md"
            >
              Explore Architecture
            </a>
          </div>

          {/* Live System Specs Strip */}
          <div className="gsap-hero-anim mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl">
            <div className="rounded-2xl bg-white/[0.04] p-4 border border-white/[0.06] backdrop-blur-md text-left">
              <span className="text-[10px] uppercase font-bold text-white/40 block">PITCH STANDARD</span>
              <span className="text-base font-bold text-white font-mono mt-0.5 block">105m × 68m</span>
              <span className="text-[10px] text-white/40">Metric Telemetry</span>
            </div>
            <div className="rounded-2xl bg-white/[0.04] p-4 border border-white/[0.06] backdrop-blur-md text-left">
              <span className="text-[10px] uppercase font-bold text-white/40 block">FAST-PATH SYNC</span>
              <span className="text-base font-bold text-[#30d158] font-mono mt-0.5 block">&lt;50ms</span>
              <span className="text-[10px] text-white/40">Deterministic Math</span>
            </div>
            <div className="rounded-2xl bg-white/[0.04] p-4 border border-white/[0.06] backdrop-blur-md text-left">
              <span className="text-[10px] uppercase font-bold text-white/40 block">AI REASONING</span>
              <span className="text-base font-bold text-[#64d2ff] font-mono mt-0.5 block">&lt;1.5s</span>
              <span className="text-[10px] text-white/40">Azure AI Swarm</span>
            </div>
            <div className="rounded-2xl bg-white/[0.04] p-4 border border-white/[0.06] backdrop-blur-md text-left">
              <span className="text-[10px] uppercase font-bold text-white/40 block">DATA PROVENANCE</span>
              <span className="text-base font-bold text-[#ffd60a] font-mono mt-0.5 block">100% Synthetic</span>
              <span className="text-[10px] text-white/40">Zero Scraped Feeds</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. THE 5-STAGE PIPELINE: Clear Project Explanation */}
      <section id="pipeline" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 border-t border-white/[0.06]">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0a84ff] block mb-2">
            The 5-Stage Pipeline
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            From Synthetic Coordinates to Broadcast Storytelling
          </h2>
          <p className="text-sm sm:text-base text-white/50 mt-3 font-normal leading-relaxed">
            How the engine digests real-time football geometry and delivers synchronized intelligence.
          </p>
        </div>

        <div ref={pipelineRef} className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="gsap-pipeline-step rounded-3xl apple-glass p-6 flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono font-bold text-white/40">01 / INGEST</span>
              <h3 className="text-lg font-bold text-white mt-2">Synthetic Telemetry</h3>
              <p className="text-xs text-white/50 mt-2 leading-relaxed">
                Continuous 10Hz player and ball coordinates (x, y, t) on the standard 105m × 68m pitch.
              </p>
            </div>
            <div className="mt-6 text-[11px] font-mono text-[#0a84ff]">Azure Event Hubs</div>
          </div>

          <div className="gsap-pipeline-step rounded-3xl apple-glass p-6 flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono font-bold text-white/40">02 / INTERPRET</span>
              <h3 className="text-lg font-bold text-white mt-2">Spatial Analytics</h3>
              <p className="text-xs text-white/50 mt-2 leading-relaxed">
                Voronoi Pitch Control, passing lane risk matrices, and Pass Difficulty Ratings (PDR).
              </p>
            </div>
            <div className="mt-6 text-[11px] font-mono text-[#30d158]">&lt;50ms Fast-Path</div>
          </div>

          <div className="gsap-pipeline-step rounded-3xl apple-glass p-6 flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono font-bold text-white/40">03 / EXPLAIN</span>
              <h3 className="text-lg font-bold text-white mt-2">Tactical Reasoning</h3>
              <p className="text-xs text-white/50 mt-2 leading-relaxed">
                Control vs. Chaos Index, Game Rhythm shifts, and Tactical Inflection Point detection.
              </p>
            </div>
            <div className="mt-6 text-[11px] font-mono text-[#bf5af2]">Azure AI Swarm</div>
          </div>

          <div className="gsap-pipeline-step rounded-3xl apple-glass p-6 flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono font-bold text-white/40">04 / RENDER</span>
              <h3 className="text-lg font-bold text-white mt-2">Broadcast Overlays</h3>
              <p className="text-xs text-white/50 mt-2 leading-relaxed">
                Machine-readable lower-third graphics and commentator prompts synced with match video.
              </p>
            </div>
            <div className="mt-6 text-[11px] font-mono text-[#ffd60a]">Timed JSON Payloads</div>
          </div>

          <div className="gsap-pipeline-step rounded-3xl apple-glass p-6 flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono font-bold text-white/40">05 / PERSONALIZE</span>
              <h3 className="text-lg font-bold text-white mt-2">Audience Adaptation</h3>
              <p className="text-xs text-white/50 mt-2 leading-relaxed">
                Analyst vs. Casual viewing modes, Player Cam spotlight, and 5 global broadcast languages.
              </p>
            </div>
            <div className="mt-6 text-[11px] font-mono text-[#ff453a]">Multi-Persona Engine</div>
          </div>
        </div>
      </section>

      {/* 4. ARCHITECTURE & HERO TECH: Gapless Bento Grid */}
      <section id="architecture" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 border-t border-white/[0.06]">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-[#30d158] block mb-2">
            Engineering & Infrastructure
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Cloud-Native Architecture on Microsoft Azure
          </h2>
          <p className="text-sm sm:text-base text-white/50 mt-3 font-normal">
            Aligned with Microsoft Premier League Hackathon judging pillars: technological depth, multi-agent innovation, and real-world applicability.
          </p>
        </div>

        {/* Mathematically Gapless Bento Grid */}
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

      {/* 5. CALL TO ACTION: Enter Studio Banner */}
      <section className="mx-auto max-w-5xl px-4 py-24 text-center">
        <div className="rounded-3xl apple-glass p-12 border border-white/[0.1] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[#0a84ff]/20 to-transparent blur-3xl pointer-events-none" />
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Ready to Experience the Engine?
          </h2>
          <p className="text-sm sm:text-base text-white/50 mt-3 max-w-xl mx-auto leading-relaxed">
            Interact with the 60FPS pitch radar, switch viewer personas, inspect player telemetry, and toggle synthetic match scenarios.
          </p>
          <div className="mt-8">
            <Link
              href="/studio"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-9 py-4 text-sm font-bold text-black transition-all hover:bg-white/90 hover:scale-105 active:scale-95 shadow-2xl"
            >
              <span>Launch Studio Terminal</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 6. ACTION: Minimalist Apple Footer */}
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
