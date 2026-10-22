'use client';

/**
 * Broadcast Overlay panel.
 *
 * The Broadcast Overlay is the Stage 4 artefact: a machine-readable
 * graphical payload for a broadcast graphics engine (CONTEXT.md). This panel
 * shows it twice — as a judge reads it (the lower third, the score bug, the
 * metric values, in any of the five broadcast languages) and as the engine
 * receives it (the exact JSON, copyable).
 *
 * The JSON shown is the real payload, not a rendering of it: what is copied
 * is what a graphics engine would consume.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, TriangleAlert, Tv } from 'lucide-react';
import { useStudioActions, useStudioStore } from '../../store/studio-store';
import type { BroadcastLanguage } from '../../types/telemetry';
import { cn } from '../../lib/cn';
import {
  BROADCAST_LANGUAGES,
  buildBroadcastOverlay,
  overlaySummary,
} from '../../lib/studio/broadcast-overlay';
import {
  Chip,
  EmptyState,
  Panel,
  PanelBody,
  PanelHeader,
  SectionLabel,
  SegmentedControl,
  StatTile,
} from './primitives';

/** The five broadcast languages and their names, in engine order. */
const LANGUAGE_NAMES: Record<BroadcastLanguage, { label: string; description: string }> = {
  en: { label: 'EN', description: 'English' },
  es: { label: 'ES', description: 'Spanish' },
  fr: { label: 'FR', description: 'French' },
  ja: { label: 'JA', description: 'Japanese' },
  ar: { label: 'AR', description: 'Arabic' },
};

const LANGUAGE_OPTIONS: { value: BroadcastLanguage; label: string; description: string }[] =
  BROADCAST_LANGUAGES.map((value) => ({ value, ...LANGUAGE_NAMES[value] }));

type CopyState = 'idle' | 'copied' | 'failed';

export function BroadcastOverlayPanel() {
  const frame = useStudioStore((s) => s.frame);
  const language = useStudioStore((s) => s.language);
  const { setLanguage } = useStudioActions();

  const [copyState, setCopyState] = useState<CopyState>('idle');
  const preRef = useRef<HTMLPreElement | null>(null);

  const payload = useMemo(
    () => (frame ? buildBroadcastOverlay(frame) : null),
    [frame],
  );

  const json = useMemo(
    () => (payload ? JSON.stringify(payload, null, 2) : ''),
    [payload],
  );

  const summary = useMemo(
    () => (payload ? overlaySummary(payload) : []),
    [payload],
  );

  // A new payload invalidates the previous copy result.
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
      // Graceful degradation: select the payload text so it can be copied by
      // hand, and say so.
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

  if (!frame || !payload) {
    return (
      <Panel className="flex h-full flex-col">
        <PanelHeader
          title="Broadcast Overlay"
          kicker="Stage 4 artefact · machine-readable payload"
        />
        <PanelBody className="flex-1">
          <EmptyState
            title="No overlay yet"
            description="The Broadcast Overlay is emitted with the first telemetry frame. Nothing to synchronise until the match stream starts."
          />
        </PanelBody>
      </Panel>
    );
  }

  const localisedHeadline =
    payload.languages[language] ?? payload.lowerThird.headline;

  const copyLabel =
    copyState === 'copied'
      ? 'Copied'
      : copyState === 'failed'
        ? 'Copy failed'
        : 'Copy JSON';

  return (
    <Panel className="flex h-full flex-col">
      <PanelHeader
        title="Broadcast Overlay"
        kicker="Stage 4 artefact · machine-readable payload"
        actions={
          <>
            <Chip tone="neutral">schema {payload.schemaVersion}</Chip>
            <Chip tone="accent">{payload.overlayId}</Chip>
          </>
        }
      />

      <PanelBody className="flex flex-1 flex-col gap-4">
        {/* ---------------------------------------------------------- */}
        {/* Language switch                                            */}
        {/* ---------------------------------------------------------- */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionLabel>Broadcast language</SectionLabel>
          <SegmentedControl
            options={LANGUAGE_OPTIONS}
            value={language}
            onChange={(next) => setLanguage(next)}
            label="Broadcast language for the overlay preview"
          />
        </div>

        {/* ---------------------------------------------------------- */}
        {/* The overlay, as a graphics engine would draw it            */}
        {/* ---------------------------------------------------------- */}
        <section
          aria-label="Overlay preview"
          className="overflow-hidden rounded-xl border border-line bg-surface-raised/60"
        >
          <div className="flex items-start gap-3 border-b border-line px-3 py-2.5">
            <Tv className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold leading-snug text-ink">
                {localisedHeadline}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-strong">
                {payload.lowerThird.subline}
              </p>
              <p className="mt-1.5 text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                {payload.lowerThird.speaker}
              </p>
            </div>

            {/* The score bug */}
            <div className="shrink-0 rounded-lg border border-line bg-inset px-2.5 py-1.5 text-center">
              <p className="text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                {payload.matchClock}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[13px] font-semibold tabular-nums">
                <span className="text-home">{payload.scoreBug.home}</span>
                <span className="text-ink-muted">{payload.scoreBug.homeScore}</span>
                <span className="text-ink-muted">–</span>
                <span className="text-ink-muted">{payload.scoreBug.awayScore}</span>
                <span className="text-away">{payload.scoreBug.away}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 px-3 py-2.5 sm:grid-cols-4">
            <StatTile
              label="Control vs. Chaos Index"
              value={Math.round(payload.metrics.controlVsChaosIndex)}
              unit="/ 100"
            />
            <StatTile
              label="Pass Difficulty Rating (PDR)"
              value={Math.round(payload.metrics.passDifficultyRating)}
              unit="/ 100"
            />
            <StatTile
              label="Pitch Control"
              value={`${payload.metrics.pitchControl.home}%`}
              tone="home"
              hint={`${payload.metrics.pitchControl.away}% away · ${payload.metrics.pitchControl.contested}% contested`}
            />
            <StatTile
              label="Sync"
              value={payload.syncTimestampMs}
              unit="ms"
              hint={`Match clock ${payload.matchClock}`}
            />
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* Readable summary                                           */}
        {/* ---------------------------------------------------------- */}
        <section aria-label="Overlay summary">
          <SectionLabel>Overlay summary</SectionLabel>
          <ul className="mt-1.5 flex flex-col gap-1">
            {summary.map((line) => (
              <li
                key={line}
                className="text-[12px] leading-relaxed text-ink-strong"
              >
                {line}
              </li>
            ))}
          </ul>
          <div className="mt-2 border-t border-line pt-2">
            <SectionLabel>Commentator cue</SectionLabel>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-strong">
              {payload.commentatorCue}
            </p>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* The raw payload                                            */}
        {/* ---------------------------------------------------------- */}
        <section aria-label="Raw overlay payload" className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SectionLabel>Raw payload</SectionLabel>
            <button
              type="button"
              onClick={handleCopy}
              aria-label={
                copyState === 'copied'
                  ? 'Overlay JSON copied to the clipboard'
                  : copyState === 'failed'
                    ? 'Copy failed — the overlay JSON has been selected instead'
                    : 'Copy the overlay JSON payload to the clipboard'
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
              {copyLabel}
            </button>
          </div>

          <p className="sr-only" role="status" aria-live="polite">
            {copyState === 'copied'
              ? 'Overlay JSON copied to the clipboard.'
              : copyState === 'failed'
                ? 'Copy failed. The overlay JSON has been selected so it can be copied manually.'
                : ''}
          </p>

          <pre
            ref={preRef}
            tabIndex={0}
            aria-label="Broadcast Overlay JSON payload"
            className="mt-1.5 max-h-72 min-h-0 flex-1 overflow-auto rounded-xl border border-line bg-inset p-3 font-mono text-[11px] leading-relaxed text-ink"
          >
            {json}
          </pre>
        </section>
      </PanelBody>
    </Panel>
  );
}

export default BroadcastOverlayPanel;
