'use client';

/**
 * Diagnostics.
 *
 * The engine's own numbers, and the honesty panel: what the studio is
 * reading, where every figure came from, what the four agents did with the
 * shared tactical blackboard, and the machine-readable Broadcast Overlay
 * payload exactly as a graphics engine would receive it.
 *
 * Nothing on this page is decorative. If a number cannot be read from the
 * frame, it is not shown.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Copy, Cpu, Gauge, TriangleAlert } from 'lucide-react';

import { BroadcastHeader } from '../../../components/BroadcastHeader';
import {
  Chip,
  EmptyState,
  KeyValue,
  Panel,
  PanelBody,
  PanelHeader,
  SectionLabel,
  SplitBar,
  StatMeter,
  StatTile,
} from '../../../components/studio/primitives';
import { useStudioActions, useStudioStore } from '../../../store/studio-store';
import { buildBroadcastOverlay } from '../../../lib/studio/broadcast-overlay';
import { SCENARIOS } from '../../../lib/pitch';
import { cn } from '../../../lib/cn';
import type { AgentTrace, TelemetryFrame } from '../../../types/telemetry';

type AgentStatus = AgentTrace['status'];

const STATUS_TONE: Record<
  AgentStatus,
  { label: string; dot: string; text: string }
> = {
  idle: { label: 'Idle', dot: 'bg-ink-muted', text: 'text-ink-muted' },
  running: { label: 'Running', dot: 'bg-accent-2', text: 'text-accent-2' },
  complete: { label: 'Complete', dot: 'bg-positive', text: 'text-positive' },
  fallback: { label: 'Fallback', dot: 'bg-caution', text: 'text-caution' },
};

/**
 * The seed the fixture was generated from.
 *
 * The published frame does not carry it yet — the engine holds it — so this
 * reads it if a producer adds it, and says plainly that it is missing
 * otherwise. It is never invented.
 */
function readSeed(frame: TelemetryFrame | null): number | null {
  if (!frame) return null;
  const candidate = (frame as { seed?: unknown }).seed;
  return typeof candidate === 'number' ? candidate : null;
}

type CopyState = 'idle' | 'copied' | 'failed';

function DiagnosticsRoute() {
  const frame = useStudioStore((state) => state.frame);
  const scenario = useStudioStore((state) => state.scenario);
  const playing = useStudioStore((state) => state.playing);
  const connection = useStudioStore((state) => state.connection);
  const actions = useStudioActions();

  const [copyState, setCopyState] = useState<CopyState>('idle');
  const preRef = useRef<HTMLPreElement | null>(null);

  const metrics = frame?.metrics;
  const seed = readSeed(frame);

  const payload = useMemo(
    () => (frame ? buildBroadcastOverlay(frame) : null),
    [frame],
  );
  const json = useMemo(() => (payload ? JSON.stringify(payload, null, 2) : ''), [payload]);

  useEffect(() => {
    setCopyState('idle');
  }, [json]);

  const handleCopy = useCallback(async () => {
    if (!json) return;
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard API unavailable');
      }
      await navigator.clipboard.writeText(json);
      setCopyState('copied');
    } catch {
      // Degrade gracefully: select the payload so it can be copied by hand.
      const node = preRef.current;
      if (node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
      setCopyState('failed');
    }
  }, [json]);

  const shots = frame?.shots ?? [];
  const homeShotsOnTarget = shots.filter(
    (shot) => shot.team === 'home' && shot.onTarget,
  ).length;
  const awayShotsOnTarget = shots.filter(
    (shot) => shot.team === 'away' && shot.onTarget,
  ).length;
  const homeExpectedGoals = shots
    .filter((shot) => shot.team === 'home')
    .reduce((sum, shot) => sum + shot.xG, 0);
  const awayExpectedGoals = shots
    .filter((shot) => shot.team === 'away')
    .reduce((sum, shot) => sum + shot.xG, 0);
  const fouls = frame?.events.filter((event) => event.type === 'foul').length ?? 0;

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
          <span className="text-ink">Diagnostics</span>
        </div>

        {!frame || !metrics ? (
          <Panel>
            <PanelHeader title="Diagnostics" kicker="The engine's own numbers" />
            <PanelBody>
              <EmptyState
                title="No telemetry frame yet"
                description="Diagnostics reads the published frame. Every figure on this page is read from it."
              />
            </PanelBody>
          </Panel>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {/* ------------------------------------------------- */}
            {/* Match identity                                       */}
            {/* ------------------------------------------------- */}
            <Panel>
              <PanelHeader
                title="Match identity"
                kicker="Which fixture is on the wire"
                actions={<Chip tone="neutral">{connection}</Chip>}
              />
              <PanelBody>
                <KeyValue
                  label="Synthetic Match Scenario"
                  value={SCENARIOS[frame.scenario].label}
                  tone="accent"
                />
                <KeyValue label="Scenario key" value={frame.scenario} />
                <KeyValue label="Match clock" value={frame.matchClock} />
                <KeyValue
                  label="Elapsed match time"
                  value={`${frame.matchSeconds.toFixed(1)} s`}
                />
                <KeyValue label="Frame" value={`#${frame.frameId}`} />
                <KeyValue
                  label="Seed"
                  value={seed === null ? 'Not published in the frame' : seed}
                />
                <KeyValue
                  label="Narrative"
                  value={`${frame.latestNarrative.matchClock} · ${frame.latestNarrative.isTacticalInflectionPoint ? 'Tactical Inflection Point' : 'no inflection'}`}
                />
              </PanelBody>
            </Panel>

            {/* ------------------------------------------------- */}
            {/* Engine metrics                                       */}
            {/* ------------------------------------------------- */}
            <Panel>
              <PanelHeader
                title="Engine metrics"
                kicker="Tier 1 · deterministic, Tier 2 · agent reasoning"
                actions={<Gauge className="h-3.5 w-3.5 text-ink-muted" aria-hidden />}
              />
              <PanelBody className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <StatTile
                    label="Pitch Control"
                    value={`${metrics.pitchControl.home}%`}
                    tone="home"
                    hint={`${metrics.pitchControl.away}% away · ${metrics.pitchControl.contested}% contested`}
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
                    home={metrics.pitchControl.home}
                    away={metrics.pitchControl.away}
                    label={`Pitch Control: ${metrics.pitchControl.home}% home, ${metrics.pitchControl.away}% away, ${metrics.pitchControl.contested}% contested`}
                  />
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
                    label="Tier 1 · fast-path latency"
                    value={`${metrics.fastPathLatencyMs.toFixed(2)} ms`}
                    tone="accent"
                  />
                  <KeyValue
                    label="Tier 2 · agent reasoning latency"
                    value={`${metrics.agentReasoningLatencyMs.toFixed(2)} ms`}
                    tone="accent"
                  />
                  <KeyValue
                    label="Ball progression"
                    value={`${metrics.ballProgressionM.toFixed(1)} m`}
                  />
                </div>
              </PanelBody>
            </Panel>

            {/* ------------------------------------------------- */}
            {/* Match statistics                                     */}
            {/* ------------------------------------------------- */}
            <Panel>
              <PanelHeader
                title="Match statistics"
                kicker="Everything the engine has counted so far"
              />
              <PanelBody>
                <div className="grid grid-cols-3 gap-3">
                  <StatTile
                    label="Goals"
                    value={`${frame.score.home} – ${frame.score.away}`}
                    tone="accent"
                  />
                  <StatTile
                    label="Shots"
                    value={`${metrics.shotCount.home} – ${metrics.shotCount.away}`}
                  />
                  <StatTile
                    label="Shots on target"
                    value={`${homeShotsOnTarget} – ${awayShotsOnTarget}`}
                  />
                  <StatTile
                    label="Expected goals"
                    value={`${homeExpectedGoals.toFixed(2)} – ${awayExpectedGoals.toFixed(2)}`}
                  />
                  <StatTile
                    label="Pass completion"
                    value={`${metrics.passCompletion.home.toFixed(1)}% – ${metrics.passCompletion.away.toFixed(1)}%`}
                  />
                  <StatTile
                    label="Possession share"
                    value={`${metrics.possessionShare.home.toFixed(1)}% – ${metrics.possessionShare.away.toFixed(1)}%`}
                  />
                  <StatTile label="Duels" value={metrics.duelCount} />
                  <StatTile label="Fouls" value={fouls} hint="in the visible event window" />
                  <StatTile
                    label="Top sprint speed"
                    value={metrics.topSprintKmH.toFixed(1)}
                    unit="km/h"
                  />
                </div>
              </PanelBody>
            </Panel>

            {/* ------------------------------------------------- */}
            {/* Agent swarm                                          */}
            {/* ------------------------------------------------- */}
            <Panel>
              <PanelHeader
                title="Agent Swarm"
                kicker="Four agents over the shared tactical blackboard"
                actions={<Cpu className="h-3.5 w-3.5 text-ink-muted" aria-hidden />}
              />
              <PanelBody className="flex flex-col gap-2.5">
                {frame.agentTrace.length === 0 ? (
                  <p className="text-[12px] text-ink-muted">
                    This frame carries no agent trace.
                  </p>
                ) : (
                  frame.agentTrace.map((agent) => {
                    const status = STATUS_TONE[agent.status];
                    return (
                      <article
                        key={agent.role}
                        className="rounded-xl border border-line bg-inset/60 p-3"
                      >
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <h3 className="text-[13px] font-semibold tracking-tight text-ink">
                            {agent.label}
                          </h3>
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className={cn('h-1.5 w-1.5 rounded-full', status.dot)}
                              aria-hidden
                            />
                            <span
                              className={cn(
                                'text-[11px] font-medium uppercase tracking-[0.1em]',
                                status.text,
                              )}
                            >
                              {status.label}
                            </span>
                          </span>
                          <span className="ml-auto font-mono text-[11px] tabular-nums text-ink-muted">
                            {agent.latencyMs.toFixed(2)} ms
                          </span>
                        </div>

                        <p className="mt-0.5 font-mono text-[10px] text-ink-muted">
                          {agent.role}
                        </p>
                        <p className="mt-1.5 text-[12px] leading-relaxed text-ink-strong">
                          {agent.summary}
                        </p>

                        {agent.status === 'fallback' ? (
                          <p className="mt-2 rounded-lg border border-caution/40 bg-caution/10 px-2.5 py-1.5 text-[11px] leading-relaxed text-caution">
                            Running on the rule-based fallback path — this agent
                            kept publishing output without a model in the loop.
                          </p>
                        ) : null}

                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <div>
                            <SectionLabel>Reads</SectionLabel>
                            <ul className="mt-1 flex flex-wrap gap-1">
                              {agent.reads.length > 0 ? (
                                agent.reads.map((key) => (
                                  <li
                                    key={`${agent.role}-read-${key}`}
                                    className="rounded border border-line bg-surface/60 px-1.5 py-0.5 font-mono text-[10px] leading-none text-ink-muted"
                                  >
                                    {key}
                                  </li>
                                ))
                              ) : (
                                <li className="text-[11px] text-ink-muted">Nothing</li>
                              )}
                            </ul>
                          </div>
                          <div>
                            <SectionLabel>Writes</SectionLabel>
                            <ul className="mt-1 flex flex-wrap gap-1">
                              {agent.writes.length > 0 ? (
                                agent.writes.map((key) => (
                                  <li
                                    key={`${agent.role}-write-${key}`}
                                    className="rounded border border-line bg-surface/60 px-1.5 py-0.5 font-mono text-[10px] leading-none text-ink-muted"
                                  >
                                    {key}
                                  </li>
                                ))
                              ) : (
                                <li className="text-[11px] text-ink-muted">Nothing</li>
                              )}
                            </ul>
                          </div>
                        </div>
                      </article>
                    );
                  })
                )}
              </PanelBody>
            </Panel>

            {/* ------------------------------------------------- */}
            {/* Broadcast Overlay                                    */}
            {/* ------------------------------------------------- */}
            <Panel className="lg:col-span-2">
              <PanelHeader
                title="Broadcast Overlay"
                kicker="Stage 4 artefact · the machine-readable payload"
                actions={
                  payload ? (
                    <Chip tone="accent">schema {payload.schemaVersion}</Chip>
                  ) : null
                }
              />
              <PanelBody className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <SectionLabel>Payload</SectionLabel>
                  <button
                    type="button"
                    onClick={handleCopy}
                    aria-label={
                      copyState === 'copied'
                        ? 'Broadcast Overlay JSON copied to the clipboard'
                        : copyState === 'failed'
                          ? 'Copy failed — the overlay JSON has been selected instead'
                          : 'Copy the Broadcast Overlay JSON to the clipboard'
                    }
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                      copyState === 'copied'
                        ? 'border-positive/40 bg-positive/10 text-positive'
                        : copyState === 'failed'
                          ? 'border-caution/40 bg-caution/10 text-caution'
                          : 'border-line bg-inset text-ink-muted hover:border-line-strong hover:text-ink',
                    )}
                  >
                    {copyState === 'copied' ? (
                      <Check className="h-3 w-3" aria-hidden />
                    ) : copyState === 'failed' ? (
                      <TriangleAlert className="h-3 w-3" aria-hidden />
                    ) : (
                      <Copy className="h-3 w-3" aria-hidden />
                    )}
                    {copyState === 'copied'
                      ? 'Copied'
                      : copyState === 'failed'
                        ? 'Copy failed'
                        : 'Copy JSON'}
                  </button>
                </div>

                <p className="sr-only" role="status" aria-live="polite">
                  {copyState === 'copied'
                    ? 'Broadcast Overlay JSON copied to the clipboard.'
                    : copyState === 'failed'
                      ? 'Copy failed. The Broadcast Overlay JSON has been selected so it can be copied manually.'
                      : ''}
                </p>

                <pre
                  ref={preRef}
                  tabIndex={0}
                  aria-label="Broadcast Overlay JSON payload"
                  className="max-h-96 overflow-auto rounded-xl border border-line bg-inset p-3 font-mono text-[11px] leading-relaxed text-ink"
                >
                  {json}
                </pre>
              </PanelBody>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DiagnosticsPage() {
  return <DiagnosticsRoute />;
}
