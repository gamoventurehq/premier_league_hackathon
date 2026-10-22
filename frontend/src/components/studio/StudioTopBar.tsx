'use client';

/**
 * The studio's top bar.
 *
 * The branch's header was an Ionic toolbar with a purple "Premier League"
 * badge, a pulsing radio icon, and a light/dark button. The information is
 * the same here; the chrome is the studio's own:
 *
 *  - the connection badge reports where the telemetry is coming from (the
 *    Azure-native WebSocket, or the in-browser simulation), and it never
 *    shows a number the store did not measure;
 *  - the persona, language, and Synthetic Match Scenario switchers are the
 *    three axes the studio can be re-expressed along;
 *  - the transport control scrubs the published frame history.
 *
 * Every control here is labelled, and every control that changes a piece of
 * studio state goes through the store — never through local component state.
 */

import { useCallback, useRef, useState } from 'react';
import { Moon, Pause, Play, Shield, Sun } from 'lucide-react';

import { cn } from '../../lib/cn';
import { SCENARIOS } from '../../lib/pitch';
import { useStudioActions, useStudioStore } from '../../store/studio-store';
import type {
  BroadcastLanguage,
  ExperiencePersona,
  SyntheticScenarioType,
} from '../../types/telemetry';
import { IconButton, SegmentedControl } from './primitives';
import type { SegmentedOption } from './primitives';


/* ------------------------------------------------------------------ */
/* Option tables                                                       */
/* ------------------------------------------------------------------ */

/**
 * The four personas of the Multi-Persona Presentation. The short label is
 * what fits in the bar; the description is the canonical name from
 * CONTEXT.md, and it is what the option's tooltip shows.
 */
const PERSONA_OPTIONS: SegmentedOption<ExperiencePersona>[] = [
  {
    value: 'analyst',
    label: 'Analyst',
    description: 'Analyst Experience — probabilistic metrics, spatial heatmaps, and phase breakdowns.',
  },
  {
    value: 'casual',
    label: 'Casual',
    description: 'Casual Experience — narrative first, key duels, and plain-language tactical explanation.',
  },
  {
    value: 'player_cam',
    label: 'Player Cam',
    description: 'Player Cam — the off-ball perspective of one designated player.',
  },
  {
    value: 'club_centric',
    label: 'Club',
    description: 'Club-Centric Experience — the match framed around one club’s execution.',
  },
];

/** The five broadcast languages of the Multilingual Broadcast Stream. */
const LANGUAGE_OPTIONS: SegmentedOption<BroadcastLanguage>[] = [
  { value: 'en', label: 'EN', description: 'English' },
  { value: 'es', label: 'ES', description: 'Spanish' },
  { value: 'fr', label: 'FR', description: 'French' },
  { value: 'ja', label: 'JA', description: 'Japanese' },
  { value: 'ar', label: 'AR', description: 'Arabic' },
];

/** The four Synthetic Match Scenarios the engine can run. */
const SCENARIO_OPTIONS: SegmentedOption<SyntheticScenarioType>[] = [
  {
    value: 'high_possession',
    label: 'High Possession',
    description: SCENARIOS.high_possession.label,
  },
  {
    value: 'counter_attack_transition',
    label: 'Counter Attack',
    description: SCENARIOS.counter_attack_transition.label,
  },
  {
    value: 'low_block_siege',
    label: 'Low Block',
    description: SCENARIOS.low_block_siege.label,
  },
  {
    value: 'box_scramble',
    label: 'Box Scramble',
    description: SCENARIOS.box_scramble.label,
  },
];

/* ------------------------------------------------------------------ */
/* Connection badge                                                    */
/* ------------------------------------------------------------------ */

const CONNECTION_STATES = {
  live: { label: 'Live stream', tone: 'text-positive' },
  local: { label: 'Simulation running locally', tone: 'text-caution' },
  connecting: { label: 'Connecting', tone: 'text-caution' },
  offline: { label: 'Offline', tone: 'text-accent-3' },
} as const;

function ConnectionBadge() {
  const connection = useStudioStore((s) => s.connection);
  const latencyMs = useStudioStore((s) => s.latencyMs);
  const state = CONNECTION_STATES[connection];

  return (
    <div className="flex items-center gap-2 rounded-full border border-line bg-inset px-2.5 py-1">
      {/*
        The live region covers the state label only. The latency readout
        changes on every published frame, and a live region that updates
        five times a second is noise, not information.
      */}
      <span role="status" aria-live="polite" className="flex items-center gap-2">
        <span className={cn('flex items-center', state.tone)}>
          <span
            aria-hidden="true"
            className="block h-1.5 w-1.5 rounded-full bg-current"
          />
        </span>
        <span className={cn('text-[11px] font-medium', state.tone)}>{state.label}</span>
      </span>
      {connection === 'live' ? (
        <span className="text-[11px] tabular-nums text-ink-muted">
          {Math.round(latencyMs)} ms
        </span>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Transport control                                                   */
/* ------------------------------------------------------------------ */

function TransportControl() {
  const frames = useStudioStore((s) => s.frames);
  const cursor = useStudioStore((s) => s.cursor);
  const playing = useStudioStore((s) => s.playing);
  const language = useStudioStore((s) => s.language);
  const actions = useStudioActions();

  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const lastIndex = Math.max(0, frames.length - 1);
  const activeIndex = cursor < 0 ? lastIndex : Math.min(cursor, lastIndex);
  const activeFrame = frames[activeIndex] ?? null;
  const progressPercent = frames.length > 1 ? (activeIndex / lastIndex) * 100 : 0;
  const isRtl = language === 'ar';

  /**
   * Seek to the frame under the pointer. The track is a physical bar, so
   * the ratio is mirrored in right-to-left layouts.
   */
  const seekToClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track || frames.length === 0) return;
      const rect = track.getBoundingClientRect();
      if (rect.width === 0) return;
      const raw = (clientX - rect.left) / rect.width;
      const ratio = isRtl ? 1 - raw : raw;
      const index = Math.round(Math.min(1, Math.max(0, ratio)) * lastIndex);
      // Scrubbing is an inspection gesture, so it pauses the stream: the
      // frame under the pointer must not be yanked away by the next
      // publication.
      actions.setPlaying(false);
      actions.setCursor(index);
    },
    [actions, frames.length, isRtl, lastIndex],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (frames.length === 0) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
      seekToClientX(event.clientX);
    },
    [frames.length, seekToClientX],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      seekToClientX(event.clientX);
    },
    [dragging, seekToClientX],
  );

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (frames.length === 0) return;
      let next = activeIndex;
      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowDown':
          next = activeIndex - 1;
          break;
        case 'ArrowRight':
        case 'ArrowUp':
          next = activeIndex + 1;
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
          next = lastIndex;
          break;
        default:
          return;
      }
      event.preventDefault();
      actions.setPlaying(false);
      actions.setCursor(next);
    },
    [actions, activeIndex, frames.length, lastIndex],
  );

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      {/*
        The button's accessible name states the action, so it must not also
        be a toggle button carrying `aria-pressed` — the two would
        contradict each other in a screen reader announcement.
      */}
      <IconButton
        label={playing ? 'Pause the match simulation' : 'Play the match simulation'}
        onClick={() => actions.togglePlaying()}
        className="shrink-0"
      >
        {playing ? (
          <Pause className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Play className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </IconButton>

      <p
        aria-live="polite"
        className="w-14 shrink-0 font-mono text-[12px] font-semibold tabular-nums text-ink"
      >
        {activeFrame ? activeFrame.matchClock : '—'}
        {activeFrame ? null : <span className="sr-only">No telemetry published yet</span>}
      </p>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Match timeline"
        aria-valuemin={0}
        aria-valuemax={lastIndex}
        aria-valuenow={activeIndex}
        aria-valuetext={activeFrame ? activeFrame.matchClock : 'No telemetry published yet'}
        aria-disabled={frames.length === 0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative h-8 min-w-0 flex-1 touch-none rounded-full border border-line bg-inset',
          frames.length === 0 ? 'opacity-50' : 'cursor-pointer',
        )}
      >
        <div
          className="absolute inset-y-1 start-0 rounded-full bg-accent/30"
          style={{ width: `${progressPercent}%` }}
        >
          <span
            aria-hidden="true"
            className={cn(
              'absolute end-0 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-accent',
              'ltr:-translate-x-1/2 rtl:translate-x-1/2',
            )}
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Top bar                                                             */
/* ------------------------------------------------------------------ */

export function StudioTopBar() {
  const persona = useStudioStore((s) => s.persona);
  const language = useStudioStore((s) => s.language);
  const theme = useStudioStore((s) => s.theme);
  const actions = useStudioActions();

  return (
    <header className="z-30 border-b border-line bg-surface/80 backdrop-blur-xl sm:sticky sm:top-0">
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-3 px-4 py-3 sm:px-6">
        {/* Brand and theme */}
        <div className="flex items-center gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent"
            >
              <Shield className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold leading-tight tracking-tight text-ink">
                Premier League Studio
              </p>
              <p className="truncate text-[10px] uppercase leading-tight tracking-[0.14em] text-ink-muted">
                Synthetic Match Insights Engine
              </p>
            </div>
          </div>

          <div className="ms-auto shrink-0">
            <IconButton
              label={theme === 'dark' ? 'Switch to the light theme' : 'Switch to the dark theme'}
              onClick={() => actions.toggleTheme()}
            >
              {theme === 'dark' ? (
                <Sun className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Moon className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </IconButton>
          </div>
        </div>

        {/*
          The presentation axes. The three switchers together are wider
          than a 360px viewport — and wider than the content column of a
          1024px screen — so the strip scrolls sideways on its own rather
          than widening the page. The vertical padding (and its negative
          margin) keeps the focus ring of a switcher from being clipped by
          the scroll container.
        */}
        <div className="-my-1 flex min-w-0 gap-2 overflow-x-auto py-1">
          <div className="shrink-0">
            <SegmentedControl
              label="Multi-Persona Presentation"
              options={PERSONA_OPTIONS}
              value={persona}
              onChange={actions.setPersona}
            />
          </div>
          <div className="shrink-0">
            <SegmentedControl
              label="Broadcast language"
              options={LANGUAGE_OPTIONS}
              value={language}
              onChange={actions.setLanguage}
            />
          </div>
          <div className="shrink-0">
            <ScenarioSwitcher />
          </div>
        </div>

        {/* The connection badge and the transport */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="shrink-0 self-start">
            <ConnectionBadge />
          </div>
          <TransportControl />
        </div>
      </div>
    </header>
  );
}

/**
 * The Synthetic Match Scenario switcher.
 *
 * The scenario names are long, so — unlike the persona and language
 * switchers — this one wraps instead of scrolling sideways.
 */
function ScenarioSwitcher() {
  const scenario = useStudioStore((s) => s.scenario);
  const actions = useStudioActions();

  return (
    <div
      role="radiogroup"
      aria-label="Synthetic Match Scenario"
      className="flex flex-wrap items-center gap-1 rounded-full border border-line bg-inset p-0.5"
    >
      {SCENARIO_OPTIONS.map((option) => {
        const active = option.value === scenario;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.description}
            onClick={() => actions.setScenario(option.value)}
            className={cn(
              'rounded-full px-3 py-1 text-[11px] font-medium transition-colors',
              active ? 'bg-accent text-white' : 'text-ink-muted hover:text-ink',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
