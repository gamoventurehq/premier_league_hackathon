'use client';

/**
 * Live Pitch.
 *
 * The centrepiece: the pitch as the simulation sees it. Every player, the
 * ball, the passing lanes and the Pitch Control surface, drawn from the frame
 * on screen — with the frame's own metrics underneath and the event feed
 * that produced them.
 *
 * The text alternative sits directly below the canvas: the same information
 * as a table of players, positions and speeds.
 */

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, GitBranch, Ruler, Waves, Wind } from 'lucide-react';

import { BroadcastHeader } from '../../../components/BroadcastHeader';
import {
  LivePitchCanvas,
  PlayerPositionList,
} from '../../../components/studio/LivePitchCanvas';
import {
  Chip,
  EmptyState,
  Panel,
  PanelBody,
  PanelHeader,
  SectionLabel,
  SplitBar,
  StatMeter,
  StatTile,
} from '../../../components/studio/primitives';
import { useStudioActions, useStudioStore } from '../../../store/studio-store';
import { cn } from '../../../lib/cn';

function PitchRoute() {
  const frame = useStudioStore((state) => state.frame);
  const scenario = useStudioStore((state) => state.scenario);
  const playing = useStudioStore((state) => state.playing);
  const selectedPlayerId = useStudioStore((state) => state.selectedPlayerId);
  const actions = useStudioActions();

  const [showControlSurface, setShowControlSurface] = useState(true);
  const [showPassingLanes, setShowPassingLanes] = useState(true);
  const [showSpeedVectors, setShowSpeedVectors] = useState(false);

  const metrics = frame?.metrics;
  const pitchControl = metrics?.pitchControl;

  const layers = [
    {
      key: 'surface',
      label: 'Pitch Control surface',
      icon: Ruler,
      active: showControlSurface,
      onClick: () => setShowControlSurface((value) => !value),
    },
    {
      key: 'lanes',
      label: 'Passing lanes',
      icon: GitBranch,
      active: showPassingLanes,
      onClick: () => setShowPassingLanes((value) => !value),
    },
    {
      key: 'vectors',
      label: 'Speed vectors',
      icon: Wind,
      active: showSpeedVectors,
      onClick: () => setShowSpeedVectors((value) => !value),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <BroadcastHeader
        matchClock={frame?.matchClock ?? '--:--'}
        metrics={metrics ?? null}
        score={frame ? frame.score : null}
        currentScenario={scenario}
        onScenarioChange={actions.setScenario}
        isPlaying={playing}
        onTogglePlay={actions.togglePlaying}
        compact
      />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <div className="mb-4 flex items-center gap-2 text-[11px] text-ink-muted">
          <Link
            href="/studio"
            className="inline-flex items-center gap-1 rounded-md transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-3 w-3" aria-hidden />
            Studio dashboard
          </Link>
          <span aria-hidden>/</span>
          <span className="text-ink">Live Pitch</span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* The pitch */}
          <div className="flex flex-col gap-4">
            <Panel>
              <PanelHeader
                title="Live Pitch"
                kicker="Every player, the ball and the passing lanes"
                actions={
                  frame ? (
                    <Chip tone="neutral">{frame.matchClock}</Chip>
                  ) : (
                    <Chip tone="caution">Waiting for telemetry</Chip>
                  )
                }
              />
              <PanelBody className="flex flex-col gap-3">
                <LivePitchCanvas
                  frame={frame}
                  showControlSurface={showControlSurface}
                  showPassingLanes={showPassingLanes}
                  showSpeedVectors={showSpeedVectors}
                  selectedPlayerId={selectedPlayerId}
                  onSelectPlayer={actions.selectPlayer}
                  paused={!playing}
                />

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink-muted">
                    Layers
                  </span>
                  {layers.map((layer) => {
                    const Icon = layer.icon;
                    return (
                      <button
                        key={layer.key}
                        type="button"
                        onClick={layer.onClick}
                        aria-pressed={layer.active}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                          layer.active
                            ? 'border-accent/40 bg-accent-soft text-accent'
                            : 'border-line bg-inset text-ink-muted hover:border-line-strong hover:text-ink',
                        )}
                      >
                        <Icon className="h-3 w-3" aria-hidden />
                        {layer.label}
                      </button>
                    );
                  })}
                </div>

                {frame ? (
                  <p className="text-[11px] text-ink-muted">
                    Click a player on the pitch to track them. The designated
                    Player Cam player is ringed on the canvas.
                  </p>
                ) : null}
              </PanelBody>
            </Panel>

            {/* The text alternative to the canvas. */}
            <Panel>
              <PanelHeader
                title="Players on the pitch"
                kicker="The canvas, in words"
                actions={<Waves className="h-3.5 w-3.5 text-ink-muted" aria-hidden />}
              />
              <PanelBody>
                <div id="live-pitch-player-list">
                  <PlayerPositionList frame={frame} />
                </div>
              </PanelBody>
            </Panel>
          </div>

          {/* The frame's own numbers. */}
          <div className="flex flex-col gap-4">
            <Panel>
              <PanelHeader title="This frame" kicker="Straight from the simulation" />
              <PanelBody className="flex flex-col gap-4">
                {!frame || !metrics || !pitchControl ? (
                  <EmptyState
                    title="No telemetry frame yet"
                    description="The metrics appear as soon as the first frame is published."
                  />
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <StatTile
                        label="Pitch Control"
                        value={`${pitchControl.home}%`}
                        tone="home"
                        hint={`${pitchControl.away}% away · ${pitchControl.contested}% contested`}
                      />
                      <StatTile
                        label="Pass Difficulty Rating (PDR)"
                        value={Math.round(metrics.passDifficultyRating)}
                        unit="/ 100"
                        tone="accent"
                      />
                      <StatTile
                        label="Control vs. Chaos Index"
                        value={Math.round(metrics.controlVsChaosIndex)}
                        unit="/ 100"
                      />
                      <StatTile label="Game Rhythm" value={metrics.gameRhythm} tone="accent" />
                    </div>

                    <div>
                      <SectionLabel>Pitch Control split</SectionLabel>
                      <SplitBar
                        className="mt-2"
                        home={pitchControl.home}
                        away={pitchControl.away}
                        label={`Pitch Control: ${pitchControl.home}% home, ${pitchControl.away}% away, ${pitchControl.contested}% contested`}
                      />
                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-ink-muted">
                        <span className="text-home">Home {pitchControl.home}%</span>
                        <span>Contested {pitchControl.contested}%</span>
                        <span className="text-away">Away {pitchControl.away}%</span>
                      </div>
                    </div>

                    <StatMeter
                      label="Pass Difficulty Rating (PDR)"
                      value={metrics.passDifficultyRating}
                      max={100}
                      unit="/ 100"
                      tone="accent"
                    />

                    <StatMeter
                      label="Control vs. Chaos Index"
                      value={metrics.controlVsChaosIndex}
                      max={100}
                      unit="/ 100"
                      tone="caution"
                    />
                  </>
                )}
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader
                title="Event feed"
                kicker="What the engine just recorded"
              />
              <PanelBody>
                {!frame ? (
                  <EmptyState
                    title="No events yet"
                    description="The feed fills as the match is played."
                  />
                ) : frame.events.length === 0 ? (
                  <p className="text-[12px] text-ink-muted">
                    No events have been recorded on this frame.
                  </p>
                ) : (
                  <ol className="flex flex-col gap-1.5">
                    {[...frame.events].reverse().map((event) => (
                      <li
                        key={event.id}
                        className="flex items-start gap-2 rounded-lg border border-line bg-inset/50 px-2.5 py-1.5"
                      >
                        <span className="mt-0.5 shrink-0 font-mono text-[10px] tabular-nums text-ink-muted">
                          {event.matchClock}
                        </span>
                        <span className="min-w-0 flex-1 text-[12px] leading-relaxed text-ink-strong">
                          {event.description}
                        </span>
                        <Chip tone="neutral">{event.type}</Chip>
                      </li>
                    ))}
                  </ol>
                )}
              </PanelBody>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PitchPage() {
  return <PitchRoute />;
}
