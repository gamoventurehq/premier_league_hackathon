'use client';

/**
 * The Casual brief.
 *
 * The same moment, told the way a supporter would be told it: what just
 * happened, in order, with the score. No indices, no corridors — the
 * language is the product here, and every line of it is generated from the
 * live frame.
 */

import type { BroadcastLanguage, MatchEvent, TelemetryFrame } from '../../../types/telemetry';
import { TEAM_NAMES } from '../../../lib/narratives';
import { cn } from '../../../lib/cn';
import {
  Chip,
  EmptyState,
  Panel,
  PanelBody,
  PanelHeader,
  SectionLabel,
} from '../primitives';

export interface CasualBriefProps {
  frame: TelemetryFrame | null;
  language?: BroadcastLanguage;
  className?: string;
}

type EventTone = 'neutral' | 'accent' | 'positive' | 'caution' | 'home' | 'away';

const EVENT_TONE: Record<MatchEvent['type'], EventTone> = {
  pass: 'neutral',
  carry: 'neutral',
  shot: 'accent',
  duel: 'neutral',
  tackle: 'caution',
  interception: 'caution',
  foul: 'caution',
  goal: 'positive',
  turnover: 'caution',
  inflection: 'accent',
};

export function CasualBrief({
  frame,
  language = 'en',
  className,
}: CasualBriefProps) {
  if (!frame) {
    return (
      <Panel className={className}>
        <PanelHeader title="Casual" kicker="Storylines, duels and moments" />
        <PanelBody>
          <EmptyState
            title="No telemetry frame yet"
            description="The story starts with the first published frame."
          />
        </PanelBody>
      </Panel>
    );
  }

  const { latestNarrative, score, events } = frame;
  const recent = [...events].reverse().slice(0, 8);

  return (
    <Panel className={cn('flex h-full flex-col', className)}>
      <PanelHeader
        title="Casual"
        kicker="Storylines, duels and moments"
        actions={<Chip tone="accent">{frame.matchClock}</Chip>}
      />
      <PanelBody className="flex flex-1 flex-col gap-4">
        <div>
          <p className="text-[14px] font-semibold leading-snug tracking-tight text-ink">
            {latestNarrative.headline[language]}
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-strong">
            {latestNarrative.casualContext}
          </p>
        </div>

        <div className="rounded-xl border border-line bg-inset/60 px-3 py-2.5">
          <p className="text-[13px] font-semibold tabular-nums text-ink">
            <span className="text-home">{TEAM_NAMES.home}</span>{' '}
            <span className="text-ink-muted">{score.home}</span>
            <span className="px-1 text-ink-muted">–</span>
            <span className="text-ink-muted">{score.away}</span>{' '}
            <span className="text-away">{TEAM_NAMES.away}</span>
          </p>
          <p className="mt-1 text-[11px] text-ink-muted">
            {recent[0]?.description ?? 'The match is under way.'}
          </p>
        </div>

        <div>
          <SectionLabel>What just happened</SectionLabel>
          {recent.length === 0 ? (
            <p className="mt-1.5 text-[12px] text-ink-muted">
              Nothing has happened yet — the match is about to start.
            </p>
          ) : (
            <ol className="mt-1.5 flex flex-col gap-1.5">
              {recent.map((event) => (
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
                  <Chip tone={EVENT_TONE[event.type]}>{event.type}</Chip>
                </li>
              ))}
            </ol>
          )}
        </div>
      </PanelBody>
    </Panel>
  );
}

export default CasualBrief;
