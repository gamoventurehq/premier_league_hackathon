'use client';

/**
 * Tactical.
 *
 * The reading of the match: the shape both teams are holding right now, the
 * Pitch Control split, the Control vs. Chaos Index, the Game Rhythm, whether
 * a Tactical Inflection Point is active, and the Pitch Control surface as
 * the grid of cells it actually is.
 *
 * The headline is read in the language the studio is currently broadcasting
 * in.
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, LayoutGrid, Radio } from 'lucide-react';

import { BroadcastHeader } from '../../../components/BroadcastHeader';
import {
  Chip,
  EmptyState,
  KeyValue,
  Panel,
  PanelBody,
  PanelHeader,
  PitchNode,
  SectionLabel,
  SegmentedControl,
  SplitBar,
  StatMeter,
  StatTile,
} from '../../../components/studio/primitives';
import { useStudioActions, useStudioStore } from '../../../store/studio-store';
import { PITCH_LENGTH, PITCH_WIDTH, SCENARIOS } from '../../../lib/pitch';
import { TEAM_NAMES } from '../../../lib/narratives';
import { cn } from '../../../lib/cn';
import type { BroadcastLanguage, PitchControlCell, TelemetryFrame } from '../../../types/telemetry';

const LANGUAGE_OPTIONS: { value: BroadcastLanguage; label: string; description: string }[] = [
  { value: 'en', label: 'EN', description: 'English' },
  { value: 'es', label: 'ES', description: 'Spanish' },
  { value: 'fr', label: 'FR', description: 'French' },
  { value: 'ja', label: 'JA', description: 'Japanese' },
  { value: 'ar', label: 'AR', description: 'Arabic' },
];

/** Bucket a control score into a token class: sign picks the side, magnitude the strength. */
function controlClass(score: number): string {
  const magnitude = Math.abs(score);
  if (magnitude < 0.08) return 'bg-inset';
  if (score > 0) {
    if (magnitude > 0.6) return 'bg-home/85';
    if (magnitude > 0.3) return 'bg-home/60';
    if (magnitude > 0.15) return 'bg-home/40';
    return 'bg-home/20';
  }
  if (magnitude > 0.6) return 'bg-away/85';
  if (magnitude > 0.3) return 'bg-away/60';
  if (magnitude > 0.15) return 'bg-away/40';
  return 'bg-away/20';
}

/**
 * The Pitch Control surface, drawn as the grid of cells the engine actually
 * computes. One cell per 5m x 4m of pitch.
 */
function ControlSurfaceGrid({ cells }: { cells: PitchControlCell[] }) {
  const { columns, rows } = useMemo(() => {
    const xs = Array.from(new Set(cells.map((cell) => cell.x))).sort((a, b) => a - b);
    const ys = Array.from(new Set(cells.map((cell) => cell.y))).sort((a, b) => a - b);
    return { columns: xs, rows: ys };
  }, [cells]);

  if (cells.length === 0) {
    return (
      <p className="text-[12px] text-ink-muted">
        The Pitch Control surface has not been computed for this frame.
      </p>
    );
  }

  const byPosition = new Map(cells.map((cell) => [`${cell.x}:${cell.y}`, cell]));

  return (
    <div
      role="img"
      aria-label={`Pitch Control surface: ${columns.length} by ${rows.length} cells across the pitch.`}
      className="grid w-full gap-px overflow-hidden rounded-lg border border-line bg-line"
      style={{
        gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows.length}, minmax(0, 1fr))`,
        aspectRatio: `${PITCH_LENGTH} / ${PITCH_WIDTH}`,
      }}
    >
      {rows.map((y) =>
        columns.map((x) => {
          const cell = byPosition.get(`${x}:${y}`);
          if (!cell) return null;
          return (
            <span
              key={`${x}:${y}`}
              title={`${x} m, ${y} m — control score ${cell.controlScore.toFixed(2)}`}
              className={cn('block h-full w-full', controlClass(cell.controlScore))}
            />
          );
        }),
      )}
    </div>
  );
}

/** The shape both teams are holding on this frame. */
function ShapePitch({ frame }: { frame: TelemetryFrame }) {
  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-line bg-deep-surface aspect-[105/68]">
      {/* The halfway line, for orientation. */}
      <span
        aria-hidden
        className="absolute top-0 bottom-0 left-1/2 w-px bg-line"
      />
      {frame.players.map((player) => (
        <PitchNode
          key={player.id}
          x={(player.x / PITCH_LENGTH) * 100}
          y={(player.y / PITCH_WIDTH) * 100}
          tone={player.team}
          size={player.role === 'GK' ? 9 : 11}
          label={`${player.name}, ${player.position}, ${player.role}`}
        />
      ))}
    </div>
  );
}

function TacticalRoute() {
  const frame = useStudioStore((state) => state.frame);
  const scenario = useStudioStore((state) => state.scenario);
  const playing = useStudioStore((state) => state.playing);
  const language = useStudioStore((state) => state.language);
  const actions = useStudioActions();

  const metrics = frame?.metrics;
  const narrative = frame?.latestNarrative;
  const inflectionActive = narrative?.isTacticalInflectionPoint ?? false;

  const homePlayers = frame?.players.filter((player) => player.team === 'home') ?? [];
  const awayPlayers = frame?.players.filter((player) => player.team === 'away') ?? [];

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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] text-ink-muted">
            <Link
              href="/studio"
              className="inline-flex items-center gap-1 rounded-md transition-colors hover:text-ink"
            >
              <ArrowLeft className="h-3 w-3" aria-hidden />
              Studio dashboard
            </Link>
            <span aria-hidden>/</span>
            <span className="text-ink">Tactical</span>
          </div>
          <SegmentedControl
            options={LANGUAGE_OPTIONS}
            value={language}
            onChange={actions.setLanguage}
            label="Broadcast language for the tactical narrative"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex flex-col gap-4">
            {/* The narrative */}
            <Panel>
              <PanelHeader
                title="Tactical reading"
                kicker="The moment, as the tactical agent describes it"
                actions={
                  inflectionActive ? (
                    <Chip tone="caution">Tactical Inflection Point</Chip>
                  ) : (
                    <Chip tone="neutral">No Tactical Inflection Point</Chip>
                  )
                }
              />
              <PanelBody className="flex flex-col gap-3">
                {!narrative ? (
                  <EmptyState
                    title="No telemetry frame yet"
                    description="The tactical reading appears with the first published frame."
                  />
                ) : (
                  <>
                    <p className="text-[15px] font-semibold leading-snug tracking-tight text-ink">
                      {narrative.headline[language]}
                    </p>
                    <p className="text-[12px] leading-relaxed text-ink-strong">
                      {narrative.tacticalExplanation[language]}
                    </p>
                    <p className="text-[11px] text-ink-muted">
                      {narrative.analystContext}
                    </p>
                  </>
                )}
              </PanelBody>
            </Panel>

            {/* The shape */}
            <Panel>
              <PanelHeader
                title="Current shape"
                kicker="Both teams, as they are arranged on this frame"
                actions={
                  frame ? (
                    <Chip tone="neutral">{frame.matchClock}</Chip>
                  ) : null
                }
              />
              <PanelBody className="flex flex-col gap-4">
                {!frame ? (
                  <EmptyState
                    title="No shape to draw yet"
                    description="The formation appears with the first published frame."
                  />
                ) : (
                  <>
                    <ShapePitch frame={frame} />
                    <div className="grid gap-4 sm:grid-cols-2">
                      {[homePlayers, awayPlayers].map((players, index) => (
                        <div key={index}>
                          <SectionLabel>
                            {index === 0 ? TEAM_NAMES.home : TEAM_NAMES.away}
                          </SectionLabel>
                          <ul className="mt-1.5 flex flex-col gap-0.5">
                            {players.map((player) => (
                              <li
                                key={player.id}
                                className="flex items-center justify-between gap-2 text-[12px] text-ink-strong"
                              >
                                <span className="min-w-0 truncate">
                                  {player.position} · {player.name}
                                </span>
                                <span className="shrink-0 font-mono text-[10px] tabular-nums text-ink-muted">
                                  {player.role} · {player.x.toFixed(0)}m
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </PanelBody>
            </Panel>
          </div>

          <div className="flex flex-col gap-4">
            <Panel>
              <PanelHeader title="Control" kicker="Who owns the pitch right now" />
              <PanelBody className="flex flex-col gap-4">
                {!metrics ? (
                  <EmptyState
                    title="No telemetry frame yet"
                    description="Pitch Control appears with the first published frame."
                  />
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <StatTile
                        label="Pitch Control"
                        value={`${metrics.pitchControl.home}%`}
                        tone="home"
                        hint={`${metrics.pitchControl.away}% away`}
                      />
                      <StatTile
                        label="Contested"
                        value={`${metrics.pitchControl.contested}%`}
                        hint="Neither side in control"
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
                        home={metrics.pitchControl.home}
                        away={metrics.pitchControl.away}
                        label={`Pitch Control: ${metrics.pitchControl.home}% home, ${metrics.pitchControl.away}% away, ${metrics.pitchControl.contested}% contested`}
                      />
                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-ink-muted">
                        <span className="text-home">Home {metrics.pitchControl.home}%</span>
                        <span>Contested {metrics.pitchControl.contested}%</span>
                        <span className="text-away">Away {metrics.pitchControl.away}%</span>
                      </div>
                    </div>

                    <StatMeter
                      label="Control vs. Chaos Index"
                      value={metrics.controlVsChaosIndex}
                      max={100}
                      unit="/ 100"
                      tone="caution"
                    />

                    <div className="border-t border-line pt-2">
                      <KeyValue
                        label="Tactical Inflection Point"
                        value={inflectionActive ? 'Active' : 'None'}
                        tone={inflectionActive ? 'accent' : 'default'}
                      />
                      <KeyValue
                        label="Pass Difficulty Rating (PDR)"
                        value={Math.round(metrics.passDifficultyRating)}
                        tone="accent"
                      />
                    </div>
                  </>
                )}
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader
                title="Pitch Control surface"
                kicker="The grid the engine computes"
                actions={<LayoutGrid className="h-3.5 w-3.5 text-ink-muted" aria-hidden />}
              />
              <PanelBody>
                {frame ? (
                  <>
                    <ControlSurfaceGrid cells={frame.pitchControlCells} />
                    <div className="mt-2 flex items-center gap-3 text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-sm bg-home" aria-hidden />
                        Home control
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-sm bg-away" aria-hidden />
                        Away control
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-sm bg-inset" aria-hidden />
                        Contested
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-[12px] text-ink-muted">
                    The surface is computed with the first published frame.
                  </p>
                )}
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader
                title="Live connection"
                kicker="Where the numbers come from"
                actions={<Radio className="h-3.5 w-3.5 text-ink-muted" aria-hidden />}
              />
              <PanelBody>
                <KeyValue label="Scenario" value={SCENARIOS[scenario].label} />
                <KeyValue label="Frame" value={frame ? `#${frame.frameId}` : '—'} />
                <KeyValue label="Match clock" value={frame?.matchClock ?? '—'} />
                <KeyValue label="Game Rhythm" value={metrics?.gameRhythm ?? '—'} />
              </PanelBody>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TacticalPage() {
  return <TacticalRoute />;
}
