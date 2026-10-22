'use client';

/**
 * Match timeline.
 *
 * The branch of the studio this card came from carried three fake video
 * feeds and a set of hand-written match events. There is no video in the
 * synthetic fixture, so the video strip is replaced by the thing a viewer
 * actually needs when they join a match late: where the key moments were,
 * where the scrubber is, and what happened, in order.
 *
 * Everything on screen is read from the Single Base Memory — the rolling
 * frame window, the cursor, and the events carried by the frame on screen.
 * Nothing here is authored.
 */

import { useCallback, useMemo, useRef } from 'react';
import { Activity, Goal, Target } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  Chip,
  EmptyState,
  Panel,
  PanelBody,
  PanelHeader,
  SectionLabel,
} from '../primitives';
import { useStudioActions, useStudioStore } from '../../../store/studio-store';
import { TEAM_NAMES } from '../../../lib/narratives';
import { SCENARIOS } from '../../../lib/pitch';
import type { MatchEvent, MatchEventType } from '../../../types/telemetry';
import { cn } from '../../../lib/cn';

type ChipTone = 'neutral' | 'accent' | 'home' | 'away' | 'positive' | 'caution';

/** The event types that earn a place on the moment rail. */
const KEY_EVENT_TYPES: MatchEventType[] = ['goal', 'shot', 'inflection'];

const EVENT_PRESENTATION: Record<MatchEventType, { label: string; tone: ChipTone }> = {
  pass: { label: 'Pass', tone: 'neutral' },
  carry: { label: 'Carry', tone: 'neutral' },
  shot: { label: 'Shot', tone: 'accent' },
  duel: { label: 'Duel', tone: 'caution' },
  tackle: { label: 'Tackle', tone: 'caution' },
  interception: { label: 'Interception', tone: 'accent' },
  foul: { label: 'Foul', tone: 'caution' },
  goal: { label: 'Goal', tone: 'positive' },
  turnover: { label: 'Turnover', tone: 'accent' },
  inflection: { label: 'Tactical Inflection Point', tone: 'accent' },
};

const EVENT_ICON: Partial<Record<MatchEventType, LucideIcon>> = {
  goal: Goal,
  shot: Target,
  inflection: Activity,
};

const EVENT_COLOR: Record<ChipTone, string> = {
  neutral: 'text-ink-muted',
  accent: 'text-accent',
  home: 'text-home',
  away: 'text-away',
  positive: 'text-positive',
  caution: 'text-caution',
};

function teamLabel(event: MatchEvent): string {
  if (!event.team) return 'Neutral';
  return TEAM_NAMES[event.team];
}

export function MediaTimelinePanel() {
  const frames = useStudioStore((s) => s.frames);
  const cursor = useStudioStore((s) => s.cursor);
  const frame = useStudioStore((s) => s.frame);
  const actions = useStudioActions();
  const trackRef = useRef<HTMLDivElement | null>(null);

  const lastIndex = Math.max(0, frames.length - 1);
  const activeIndex = cursor < 0 ? lastIndex : Math.min(cursor, lastIndex);
  const progressPercent = frames.length > 1 ? (activeIndex / lastIndex) * 100 : 0;

  const events = useMemo(() => frame?.events ?? [], [frame]);
  const keyEvents = useMemo(
    () => events.filter((event) => KEY_EVENT_TYPES.includes(event.type)),
    [events],
  );
  const chronologicalEvents = useMemo(() => [...events].reverse(), [events]);

  /** The bounds of the published window, in match seconds. */
  const windowBounds = useMemo(() => {
    const start = frames[0]?.matchSeconds ?? 0;
    const end = frames[frames.length - 1]?.matchSeconds ?? start;
    return { start, end, span: Math.max(1, end - start) };
  }, [frames]);

  /**
   * Move the scrubber to the frame that shows an event: the first published
   * frame at or after the moment the event happened.
   */
  const selectEvent = useCallback(
    (event: MatchEvent) => {
      if (frames.length === 0) return;
      const eventSeconds = event.timestampMs / 1000;
      let index = frames.findIndex((f) => f.matchSeconds >= eventSeconds);
      if (index < 0) index = frames.length - 1;
      actions.setCursor(index);
      if (event.actorId) actions.selectPlayer(event.actorId);
    },
    [actions, frames],
  );

  const handleTrackClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const track = trackRef.current;
      if (!track || frames.length === 0) return;
      const rect = track.getBoundingClientRect();
      if (rect.width === 0) return;
      const ratio = (event.clientX - rect.left) / rect.width;
      actions.setCursor(Math.round(ratio * (frames.length - 1)));
    },
    [actions, frames.length],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (frames.length === 0) return;
      let next = activeIndex;
      switch (event.key) {
        case 'ArrowLeft':
          next = activeIndex - 1;
          break;
        case 'ArrowRight':
          next = activeIndex + 1;
          break;
        case 'ArrowDown':
          next = activeIndex - 5;
          break;
        case 'ArrowUp':
          next = activeIndex + 5;
          break;
        case 'PageDown':
          next = activeIndex - 10;
          break;
        case 'PageUp':
          next = activeIndex + 10;
          break;
        case 'Home':
          next = 0;
          break;
        case 'End':
          next = frames.length - 1;
          break;
        default:
          return;
      }
      event.preventDefault();
      actions.setCursor(next);
    },
    [actions, activeIndex, frames.length],
  );

  const scenarioLabel = frame ? SCENARIOS[frame.scenario].label : 'Synthetic Match Scenario';

  return (
    <Panel className="flex h-full flex-col">
      <PanelHeader
        title="Match Timeline"
        kicker={scenarioLabel}
        actions={frame ? <Chip tone="accent">Frame {frame.frameId}</Chip> : null}
      />
      <PanelBody className="flex min-h-0 flex-1 flex-col gap-4">
        {frames.length === 0 || !frame ? (
          <EmptyState
            title="No match frames published yet"
            description="The timeline appears as soon as the synthetic match engine publishes its first frame."
          />
        ) : (
          <>
            {/* -------------------------------------------------- */}
            {/* Scrubber                                              */}
            {/* -------------------------------------------------- */}
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <SectionLabel>Match Clock</SectionLabel>
                <p
                  aria-live="polite"
                  className="font-mono text-[13px] font-semibold tabular-nums text-ink"
                >
                  {frame.matchClock}
                </p>
              </div>

              <div
                ref={trackRef}
                role="slider"
                tabIndex={0}
                aria-label="Moment rail — scrub the published frames"
                aria-valuemin={0}
                aria-valuemax={lastIndex}
                aria-valuenow={activeIndex}
                aria-valuetext={frame.matchClock}
                onClick={handleTrackClick}
                onKeyDown={handleKeyDown}
                className="relative h-8 w-full cursor-pointer rounded-full border border-line bg-inset"
              >
                <div
                  className="absolute inset-y-1 left-0 rounded-full bg-accent/30"
                  style={{ width: `${progressPercent}%` }}
                />
                <div
                  className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ring-2 ring-accent/30"
                  style={{ left: `${progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between font-mono text-[10px] tabular-nums text-ink-muted">
                <span>{frames[0]?.matchClock ?? '00:00'}</span>
                <span className="text-ink">
                  {activeIndex + 1} / {frames.length} frames
                </span>
                <span>{frames[frames.length - 1]?.matchClock ?? '00:00'}</span>
              </div>
            </div>

            {/* -------------------------------------------------- */}
            {/* Moment rail                                           */}
            {/* -------------------------------------------------- */}
            <div className="flex flex-col gap-2">
              <SectionLabel>Moment Rail</SectionLabel>
              {keyEvents.length === 0 ? (
                <p className="rounded-lg border border-line bg-inset px-3 py-2 text-[11px] text-ink-muted">
                  No goals, shots or Tactical Inflection Points in this window yet.
                </p>
              ) : (
                <div className="relative h-9 w-full rounded-lg border border-line bg-inset">
                  <div className="absolute inset-x-2 top-1/2 border-t border-line" />
                  {keyEvents.map((event) => {
                    const presentation = EVENT_PRESENTATION[event.type];
                    const Icon = EVENT_ICON[event.type];
                    const offset = ((event.timestampMs / 1000 - windowBounds.start) / windowBounds.span) * 100;
                    const left = Math.max(2, Math.min(98, offset));
                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => selectEvent(event)}
                        title={`${presentation.label} — ${event.matchClock} — ${event.description}`}
                        aria-label={`${presentation.label} at ${event.matchClock}. ${event.description}. ${teamLabel(event)}.`}
                        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-line bg-surface-raised p-1 text-ink transition-colors hover:border-line-strong"
                        style={{ left: `${left}%` }}
                      >
                        {Icon ? (
                          <Icon className={cn('h-3 w-3', EVENT_COLOR[presentation.tone])} aria-hidden />
                        ) : (
                          <span
                            className={cn('block h-1.5 w-1.5 rounded-full bg-ink-muted')}
                            aria-hidden
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* -------------------------------------------------- */}
            {/* Chronological event list                             */}
            {/* -------------------------------------------------- */}
            <div className="flex min-h-0 flex-1 flex-col gap-2">
              <SectionLabel>Chronological Events</SectionLabel>
              {chronologicalEvents.length === 0 ? (
                <p className="rounded-lg border border-line bg-inset px-3 py-2 text-[11px] text-ink-muted">
                  No events recorded in this frame window.
                </p>
              ) : (
                <ul className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                  {chronologicalEvents.map((event) => {
                    const presentation = EVENT_PRESENTATION[event.type];
                    const Icon = EVENT_ICON[event.type];
                    return (
                      <li key={event.id}>
                        <button
                          type="button"
                          onClick={() => selectEvent(event)}
                          className="flex w-full items-start gap-2 rounded-lg border border-line bg-inset px-2.5 py-2 text-left transition-colors hover:border-line-strong"
                        >
                          <span className="mt-0.5 font-mono text-[11px] font-semibold tabular-nums text-ink-muted">
                            {event.matchClock}
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className="flex flex-wrap items-center gap-1.5">
                              {Icon ? (
                                <Icon
                                  className={cn('h-3 w-3', EVENT_COLOR[presentation.tone])}
                                  aria-hidden
                                />
                              ) : null}
                              <Chip tone={presentation.tone}>{presentation.label}</Chip>
                              <span className="text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                                {teamLabel(event)}
                              </span>
                              {event.score ? (
                                <span className="font-mono text-[10px] font-semibold tabular-nums text-ink">
                                  {event.score.home} – {event.score.away}
                                </span>
                              ) : null}
                            </span>
                            <span className="truncate text-[12px] text-ink">{event.description}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </PanelBody>
    </Panel>
  );
}
