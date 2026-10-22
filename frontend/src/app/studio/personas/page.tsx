'use client';

/**
 * Personas.
 *
 * One moment, told four ways. The Analyst reads it as measurements, the
 * Casual listener hears it as a story, the Player Cam sees it from the
 * pitch, and each club hears it from its own bench.
 *
 * The segmented control picks the experience the studio is publishing, but
 * all four briefs stay on screen — a judge should be able to see the same
 * moment resolved four ways, and to see the headline change with the
 * broadcast language.
 */

import Link from 'next/link';
import { ArrowLeft, Languages } from 'lucide-react';

import { BroadcastHeader } from '../../../components/BroadcastHeader';
import { AnalystBrief } from '../../../components/studio/personas/AnalystBrief';
import { CasualBrief } from '../../../components/studio/personas/CasualBrief';
import { ClubCentricBrief } from '../../../components/studio/personas/ClubCentricBrief';
import { PlayerCamBrief } from '../../../components/studio/personas/PlayerCamBrief';
import {
  Chip,
  EmptyState,
  Panel,
  PanelBody,
  PanelHeader,
  SectionLabel,
  SegmentedControl,
} from '../../../components/studio/primitives';
import { useStudioActions, useStudioStore } from '../../../store/studio-store';
import { cn } from '../../../lib/cn';
import type { BroadcastLanguage, ExperiencePersona } from '../../../types/telemetry';

const PERSONA_OPTIONS: {
  value: ExperiencePersona;
  label: string;
  description: string;
}[] = [
  { value: 'analyst', label: 'Analyst', description: 'Measurements and evidence' },
  { value: 'casual', label: 'Casual', description: 'Storylines and moments' },
  { value: 'player_cam', label: 'Player Cam', description: 'One player, one camera' },
  { value: 'club_centric', label: 'Club', description: 'From each bench, separately' },
];

const LANGUAGE_OPTIONS: {
  value: BroadcastLanguage;
  label: string;
  description: string;
}[] = [
  { value: 'en', label: 'EN', description: 'English' },
  { value: 'es', label: 'ES', description: 'Spanish' },
  { value: 'fr', label: 'FR', description: 'French' },
  { value: 'ja', label: 'JA', description: 'Japanese' },
  { value: 'ar', label: 'AR', description: 'Arabic' },
];

function PersonasRoute() {
  const frame = useStudioStore((state) => state.frame);
  const scenario = useStudioStore((state) => state.scenario);
  const playing = useStudioStore((state) => state.playing);
  const persona = useStudioStore((state) => state.persona);
  const language = useStudioStore((state) => state.language);
  const selectedPlayerId = useStudioStore((state) => state.selectedPlayerId);
  const actions = useStudioActions();

  const narrative = frame?.latestNarrative;
  const metrics = frame?.metrics;

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
            <span className="text-ink">Personas</span>
          </div>
          <SegmentedControl
            options={LANGUAGE_OPTIONS}
            value={language}
            onChange={actions.setLanguage}
            label="Broadcast language"
          />
        </div>

        {/* The moment, once, in the selected language. */}
        <Panel className="mb-4">
          <PanelHeader
            title="One moment, four voices"
            kicker="The narrative as the studio is publishing it right now"
            actions={
              frame ? <Chip tone="neutral">{frame.matchClock}</Chip> : null
            }
          />
          <PanelBody className="flex flex-col gap-3">
            {!narrative ? (
              <EmptyState
                title="No telemetry frame yet"
                description="The four experiences are written from the first published frame."
              />
            ) : (
              <>
                <p className="text-[15px] font-semibold leading-snug tracking-tight text-ink">
                  {narrative.headline[language]}
                </p>
                <p className="text-[12px] leading-relaxed text-ink-strong">
                  {narrative.tacticalExplanation[language]}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-ink-muted">
                  <Languages className="h-3.5 w-3.5" aria-hidden />
                  <span>
                    Broadcast language: {LANGUAGE_OPTIONS.find((option) => option.value === language)?.description}
                  </span>
                </div>
              </>
            )}
          </PanelBody>
        </Panel>

        {/* The experience selector. */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <SectionLabel>Experience</SectionLabel>
          <SegmentedControl
            options={PERSONA_OPTIONS}
            value={persona}
            onChange={actions.setPersona}
            label="Choose the experience the studio publishes"
          />
        </div>

        {/* The four briefs. */}
        <div className="grid gap-4 md:grid-cols-2">
          <AnalystBrief
            frame={frame}
            language={language}
            className={cn(persona === 'analyst' && 'ring-1 ring-accent/40')}
          />
          <CasualBrief
            frame={frame}
            language={language}
            className={cn(persona === 'casual' && 'ring-1 ring-accent/40')}
          />
          <PlayerCamBrief
            frame={frame}
            language={language}
            selectedPlayerId={selectedPlayerId}
            onSelectPlayer={actions.selectPlayer}
            className={cn(persona === 'player_cam' && 'ring-1 ring-accent/40')}
          />
          <ClubCentricBrief
            frame={frame}
            language={language}
            className={cn(persona === 'club_centric' && 'ring-1 ring-accent/40')}
          />
        </div>
      </div>
    </div>
  );
}

export default function PersonasPage() {
  return <PersonasRoute />;
}
