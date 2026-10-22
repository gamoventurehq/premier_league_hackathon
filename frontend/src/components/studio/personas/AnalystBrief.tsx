'use client';

/**
 * The Analyst brief.
 *
 * The Analyst reads the match as a set of measurements: the Pass Difficulty
 * Rating of the release, the Pitch Control split, the Control vs. Chaos
 * Index, and the passing lanes that are open right now. The narrative is the
 * short version; the numbers underneath are the evidence.
 *
 * Every figure comes from the frame on screen.
 */

import type { BroadcastLanguage, TelemetryFrame } from '../../../types/telemetry';
import { cn } from '../../../lib/cn';
import {
  Chip,
  EmptyState,
  KeyValue,
  MeterTrack,
  Panel,
  PanelBody,
  PanelHeader,
  SectionLabel,
  SplitBar,
  StatTile,
} from '../primitives';

export interface AnalystBriefProps {
  frame: TelemetryFrame | null;
  /** The language the headline is read in. */
  language?: BroadcastLanguage;
  className?: string;
}

export function AnalystBrief({
  frame,
  language = 'en',
  className,
}: AnalystBriefProps) {
  if (!frame) {
    return (
      <Panel className={className}>
        <PanelHeader title="Analyst" kicker="Probabilistic & spatial telemetry" />
        <PanelBody>
          <EmptyState
            title="No telemetry frame yet"
            description="The Analyst brief is written from the first published frame."
          />
        </PanelBody>
      </Panel>
    );
  }

  const { metrics, latestNarrative } = frame;
  const pitchControl = metrics.pitchControl;

  return (
    <Panel className={cn('flex h-full flex-col', className)}>
      <PanelHeader
        title="Analyst"
        kicker="Probabilistic & spatial telemetry"
        actions={<Chip tone="accent">{frame.matchClock}</Chip>}
      />
      <PanelBody className="flex flex-1 flex-col gap-4">
        <div>
          <p className="text-[14px] font-semibold leading-snug tracking-tight text-ink">
            {latestNarrative.headline[language]}
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-strong">
            {latestNarrative.analystContext}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
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
          <StatTile
            label="Pitch Control"
            value={`${pitchControl.home}%`}
            tone="home"
            hint={`${pitchControl.away}% away · ${pitchControl.contested}% contested`}
          />
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

        <div>
          <SectionLabel>Passing lanes on this frame</SectionLabel>
          {frame.passingLanes.length === 0 ? (
            <p className="mt-1.5 text-[12px] text-ink-muted">
              No passing lanes are open on this frame.
            </p>
          ) : (
            <ul className="mt-1.5 flex flex-col gap-1">
              {frame.passingLanes.map((lane) => {
                const passer = frame.players.find((p) => p.id === lane.passerId);
                const receiver = frame.players.find((p) => p.id === lane.receiverId);
                return (
                  <li
                    key={`${lane.passerId}-${lane.receiverId}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-line bg-inset/60 px-2.5 py-1.5"
                  >
                    <span className="min-w-0 truncate text-[11px] text-ink-strong">
                      {passer?.shortName ?? lane.passerId} →{' '}
                      {receiver?.shortName ?? lane.receiverId}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <span className="font-mono text-[10px] tabular-nums text-ink-muted">
                        PDR {lane.passDifficultyRating}
                      </span>
                      <Chip tone={lane.isClear ? 'positive' : 'caution'}>
                        {lane.isClear ? 'Clear' : 'Contested'}
                      </Chip>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-line pt-2">
          <KeyValue
            label="Tier 1 · deterministic metrics"
            value={`${metrics.fastPathLatencyMs.toFixed(2)} ms`}
            tone="accent"
          />
          <KeyValue
            label="Tier 2 · agent reasoning"
            value={`${metrics.agentReasoningLatencyMs.toFixed(2)} ms`}
            tone="accent"
          />
          <MeterTrack
            className="mt-2"
            value={metrics.controlVsChaosIndex}
            max={100}
            label="Control vs. Chaos Index"
          />
        </div>
      </PanelBody>
    </Panel>
  );
}

export default AnalystBrief;
