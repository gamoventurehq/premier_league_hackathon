'use client';

/**
 * Agent Swarm panel.
 *
 * The studio is driven by four agents over a shared tactical blackboard. This
 * panel makes that architecture visible rather than merely asserted: for the
 * frame on screen it shows what each agent did, how long it took, and which
 * blackboard keys it read and wrote — plus the blackboard state itself, and
 * the latency of the two pipeline tiers.
 *
 * A judge must be able to see the system degrade gracefully: an agent that
 * falls back to the rule-based path says so in words, next to the output it
 * still produced.
 */

import { useMemo } from 'react';
import {
  Activity,
  Brain,
  Globe2,
  Layers,
  Radio,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useStudioStore } from '../../store/studio-store';
import type { AgentRole, AgentTrace } from '../../types/telemetry';
import { cn } from '../../lib/cn';
import {
  FAST_PATH_LABEL,
  agentLabel,
  latencyNote,
} from '../../lib/studio/latency';
import {
  Chip,
  KeyValue,
  MeterTrack,
  Panel,
  PanelBody,
  PanelHeader,
  SectionLabel,
  StatTile,
} from './primitives';

/* ------------------------------------------------------------------ */
/* Status vocabulary                                                   */
/* ------------------------------------------------------------------ */

type AgentStatus = AgentTrace['status'];

interface StatusMeta {
  /** Human label — status is never conveyed by colour alone. */
  label: string;
  /** The dot colour. */
  dot: string;
  /** The text colour. */
  text: string;
}

const STATUS_META: Record<AgentStatus, StatusMeta> = {
  idle: { label: 'Idle', dot: 'bg-ink-muted', text: 'text-ink-muted' },
  running: { label: 'Running', dot: 'bg-accent-2', text: 'text-accent-2' },
  complete: { label: 'Complete', dot: 'bg-positive', text: 'text-positive' },
  fallback: { label: 'Fallback', dot: 'bg-caution', text: 'text-caution' },
};

const AGENT_ICONS: Record<AgentRole, LucideIcon> = {
  telemetry_ingestion: Radio,
  tactical_reasoning: Brain,
  broadcast_narrative: Globe2,
  fan_personalization: Users,
};

/** The canonical order the swarm runs in. */
const AGENT_ORDER: AgentRole[] = [
  'telemetry_ingestion',
  'tactical_reasoning',
  'broadcast_narrative',
  'fan_personalization',
];

/**
 * What "fallback" means, in words. The rule-based path keeps producing
 * output without a model in the loop, so the studio degrades rather than
 * fails.
 */
const FALLBACK_NOTE =
  'Fell back to the rule-based path — this agent kept publishing output without a model in the loop, so the panel never goes blank.';

/* ------------------------------------------------------------------ */
/* Small local atoms                                                   */
/* ------------------------------------------------------------------ */

function BlackboardKey({ value }: { value: string }) {
  return (
    <li className="rounded border border-line bg-surface/60 px-1.5 py-0.5 font-mono text-[10px] leading-none text-ink-muted">
      {value}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

export function AgentSwarmPanel() {
  const frame = useStudioStore((s) => s.frame);
  const connection = useStudioStore((s) => s.connection);

  const trace = frame?.agentTrace ?? [];

  const orderedTrace = useMemo(() => {
    return [...trace].sort(
      (a, b) => AGENT_ORDER.indexOf(a.role) - AGENT_ORDER.indexOf(b.role),
    );
  }, [trace]);

  /** Every blackboard key the swarm writes to — the shared surface. */
  const blackboardKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const agent of trace) {
      for (const key of agent.writes) keys.add(key);
    }
    return Array.from(keys);
  }, [trace]);

  const fallingBack = useMemo(
    () => orderedTrace.filter((agent) => agent.status === 'fallback').length,
    [orderedTrace],
  );

  if (!frame) {
    return (
      <Panel>
        <PanelHeader title="Agent Swarm" kicker="Four agents · shared tactical blackboard" />
        <PanelBody>
          <p className="text-[12px] text-ink-muted">
            No telemetry frame yet. The agent swarm starts publishing as soon as the
            first frame arrives.
          </p>
        </PanelBody>
      </Panel>
    );
  }

  const { metrics, latestNarrative } = frame;
  const inflectionActive = latestNarrative.isTacticalInflectionPoint;

  return (
    <Panel className="flex h-full flex-col">
      <PanelHeader
        title="Agent Swarm"
        kicker="Four agents · shared tactical blackboard"
        actions={
          <>
            <Chip tone="neutral">{frame.matchClock}</Chip>
            {fallingBack > 0 ? (
              <Chip tone="caution">
                {fallingBack} on fallback path
              </Chip>
            ) : null}
          </>
        }
      />

      <PanelBody className="flex flex-1 flex-col gap-4">
        {/* ---------------------------------------------------------- */}
        {/* The blackboard                                              */}
        {/* ---------------------------------------------------------- */}
        <section
          aria-label="Shared tactical blackboard"
          className="rounded-xl border border-line bg-surface-raised/60 p-3"
        >
          <div className="flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-accent" aria-hidden />
            <SectionLabel>Shared tactical blackboard</SectionLabel>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile
              label="Game Rhythm"
              value={metrics.gameRhythm}
              tone="accent"
            />
            <StatTile
              label="Control vs. Chaos Index"
              value={Math.round(metrics.controlVsChaosIndex)}
              unit="/ 100"
            />
            <StatTile
              label="Pass Difficulty Rating (PDR)"
              value={Math.round(metrics.passDifficultyRating)}
              unit="/ 100"
            />
            <StatTile
              label="Tactical Inflection Point"
              value={inflectionActive ? 'Active' : 'None'}
              tone={inflectionActive ? 'accent' : 'default'}
              hint={inflectionActive ? 'Phase change detected' : 'No phase change'}
            />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <SectionLabel>Control vs. Chaos Index</SectionLabel>
                <span className="text-[11px] font-semibold tabular-nums text-ink">
                  {Math.round(metrics.controlVsChaosIndex)}
                </span>
              </div>
              <MeterTrack
                value={metrics.controlVsChaosIndex}
                tone="accent"
                className="mt-1.5"
                label="Control vs. Chaos Index"
              />
            </div>
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <SectionLabel>Pitch Control</SectionLabel>
                <span className="text-[11px] font-semibold tabular-nums text-ink">
                  {metrics.pitchControl.home}%
                </span>
              </div>
              <MeterTrack
                value={metrics.pitchControl.home}
                tone="home"
                className="mt-1.5"
                label={`Pitch Control, home ${metrics.pitchControl.home} percent`}
              />
              <MeterTrack
                value={metrics.pitchControl.away}
                tone="away"
                className="mt-1.5"
                label={`Pitch Control, away ${metrics.pitchControl.away} percent`}
              />
            </div>
          </div>

          <div className="mt-3 border-t border-line pt-2">
            <div className="flex items-baseline justify-between gap-3 py-1">
              <span className="text-[12px] text-ink-muted">Pitch Control split</span>
              <span className="text-[13px] font-medium tabular-nums text-ink">
                {metrics.pitchControl.home}% home · {metrics.pitchControl.away}% away ·{' '}
                {metrics.pitchControl.contested}% contested
              </span>
            </div>
            <KeyValue
              label={FAST_PATH_LABEL}
              value={`${metrics.fastPathLatencyMs.toFixed(2)} ms`}
              tone="accent"
            />
            <KeyValue
              label={agentLabel(connection)}
              value={`${metrics.agentReasoningLatencyMs.toFixed(2)} ms`}
              tone="accent"
            />
            <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">
              {latencyNote(connection)}
            </p>
          </div>

          {blackboardKeys.length > 0 ? (
            <div className="mt-3 border-t border-line pt-2">
              <SectionLabel>Blackboard keys written</SectionLabel>
              <ul className="mt-1.5 flex flex-wrap gap-1">
                {blackboardKeys.map((key) => (
                  <BlackboardKey key={key} value={key} />
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        {/* ---------------------------------------------------------- */}
        {/* The agents                                                  */}
        {/* ---------------------------------------------------------- */}
        <section aria-label="Agent traces" className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-accent" aria-hidden />
            <SectionLabel>Agents on this frame</SectionLabel>
          </div>

          {orderedTrace.map((agent) => {
            const status = STATUS_META[agent.status];
            const Icon = AGENT_ICONS[agent.role] ?? Activity;

            return (
              <article
                key={agent.role}
                className="rounded-xl border border-line bg-inset/60 p-3"
              >
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-raised text-accent">
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h3 className="text-[13px] font-semibold tracking-tight text-ink">
                        {agent.label}
                      </h3>

                      {/* Status: coloured dot *and* a text status. */}
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
                        <span className="sr-only">
                          {`Status: ${agent.status}`}
                        </span>
                      </span>

                      <span className="text-[11px] tabular-nums text-ink-muted">
                        {agent.latencyMs} ms
                      </span>
                    </div>

                    <p className="mt-0.5 font-mono text-[10px] leading-none text-ink-muted">
                      {agent.role}
                    </p>
                  </div>
                </div>

                <p className="mt-2 text-[12px] leading-relaxed text-ink-strong">
                  {agent.summary}
                </p>

                {agent.status === 'fallback' ? (
                  <p className="mt-2 rounded-lg border border-caution/40 bg-caution/10 px-2.5 py-1.5 text-[11px] leading-relaxed text-caution">
                    {FALLBACK_NOTE}
                  </p>
                ) : null}

                <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                  <div className="min-w-0">
                    <SectionLabel>Reads</SectionLabel>
                    <ul className="mt-1 flex flex-wrap gap-1">
                      {agent.reads.length > 0 ? (
                        agent.reads.map((key) => (
                          <BlackboardKey key={`${agent.role}-read-${key}`} value={key} />
                        ))
                      ) : (
                        <li className="text-[11px] text-ink-muted">Nothing</li>
                      )}
                    </ul>
                  </div>
                  <div className="min-w-0">
                    <SectionLabel>Writes</SectionLabel>
                    <ul className="mt-1 flex flex-wrap gap-1">
                      {agent.writes.length > 0 ? (
                        agent.writes.map((key) => (
                          <BlackboardKey key={`${agent.role}-write-${key}`} value={key} />
                        ))
                      ) : (
                        <li className="text-[11px] text-ink-muted">Nothing</li>
                      )}
                    </ul>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </PanelBody>
    </Panel>
  );
}

export default AgentSwarmPanel;
