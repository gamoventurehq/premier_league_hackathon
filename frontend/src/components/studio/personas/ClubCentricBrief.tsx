'use client';

/**
 * The Club Centric brief.
 *
 * The same moment as the supporters of each club would describe it: one
 * frame from the home bench, one from the away bench, each next to the
 * numbers that club would care about — possession share, Pitch Control,
 * shots and pass completion.
 */

import type { BroadcastLanguage, TelemetryFrame } from '../../../types/telemetry';
import { TEAM_NAMES } from '../../../lib/narratives';
import { cn } from '../../../lib/cn';
import {
  Chip,
  EmptyState,
  KeyValue,
  Panel,
  PanelBody,
  PanelHeader,
  SectionLabel,
  TeamCrest,
} from '../primitives';

export interface ClubCentricBriefProps {
  frame: TelemetryFrame | null;
  language?: BroadcastLanguage;
  className?: string;
}

export function ClubCentricBrief({
  frame,
  language = 'en',
  className,
}: ClubCentricBriefProps) {
  if (!frame) {
    return (
      <Panel className={className}>
        <PanelHeader title="Club Centric" kicker="From each bench, separately" />
        <PanelBody>
          <EmptyState
            title="No telemetry frame yet"
            description="Each club's reading appears with the first published frame."
          />
        </PanelBody>
      </Panel>
    );
  }

  const { metrics, latestNarrative, score, shots } = frame;

  const homeShots = shots.filter((shot) => shot.team === 'home').length;
  const awayShots = shots.filter((shot) => shot.team === 'away').length;

  const clubs = [
    {
      side: 'home' as const,
      name: TEAM_NAMES.home,
      frame: latestNarrative.clubCentricContext.homeFrame,
      possession: metrics.possessionShare.home,
      pitchControl: metrics.pitchControl.home,
      passCompletion: metrics.passCompletion.home,
      shots: homeShots,
    },
    {
      side: 'away' as const,
      name: TEAM_NAMES.away,
      frame: latestNarrative.clubCentricContext.awayFrame,
      possession: metrics.possessionShare.away,
      pitchControl: metrics.pitchControl.away,
      passCompletion: metrics.passCompletion.away,
      shots: awayShots,
    },
  ];

  return (
    <Panel className={cn('flex h-full flex-col', className)}>
      <PanelHeader
        title="Club Centric"
        kicker="From each bench, separately"
        actions={<Chip tone="accent">{frame.matchClock}</Chip>}
      />
      <PanelBody className="flex flex-1 flex-col gap-4">
        <p className="text-[14px] font-semibold leading-snug tracking-tight text-ink">
          {latestNarrative.headline[language]}
        </p>

        {clubs.map((club) => (
          <section
            key={club.side}
            aria-label={`${club.name} reading`}
            className="rounded-xl border border-line bg-inset/50 p-3"
          >
            <div className="flex items-center gap-2">
              <TeamCrest label={club.name} tone={club.side} />
              <p className="min-w-0 truncate text-[13px] font-semibold text-ink">
                {club.name}
              </p>
              <span className="ml-auto font-mono text-[12px] tabular-nums text-ink-strong">
                {club.side === 'home' ? score.home : score.away}
              </span>
            </div>

            <p className="mt-2 text-[12px] leading-relaxed text-ink-strong">
              {club.frame}
            </p>

            <div className="mt-2 border-t border-line pt-1.5">
              <KeyValue
                label="Possession share"
                value={`${club.possession.toFixed(1)}%`}
                tone={club.side}
              />
              <KeyValue
                label="Pitch Control"
                value={`${club.pitchControl}%`}
                tone={club.side}
              />
              <KeyValue
                label="Pass completion"
                value={`${club.passCompletion.toFixed(1)}%`}
              />
              <KeyValue label="Shots" value={club.shots} />
            </div>
          </section>
        ))}

        <div>
          <SectionLabel>What each side is trying to do</SectionLabel>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">
            {latestNarrative.tacticalExplanation[language]}
          </p>
        </div>
      </PanelBody>
    </Panel>
  );
}

export default ClubCentricBrief;
