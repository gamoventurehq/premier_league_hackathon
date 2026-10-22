'use client';

/**
 * The shot map.
 *
 * Every shot the fixture has produced, plotted at the metre it was taken
 * from. The marker is sized and coloured by the outcome — a goal, a save or
 * a miss — and the list beside the plot says the same thing in words, so the
 * outcome never depends on colour alone.
 *
 * The aggregates (total shots, shots on target, total expected goals and the
 * median shot distance) are computed from the shot ledger on the frame.
 */

import { useMemo } from 'react';
import {
  Chip,
  EmptyState,
  Panel,
  PanelBody,
  PanelHeader,
  SectionLabel,
  StatTile,
} from '../primitives';
import { PitchSurface, pitchPercentX, pitchPercentY } from './FormationPitchCard';
import { useStudioStore } from '../../../store/studio-store';
import { TEAM_NAMES } from '../../../lib/narratives';
import type { ShotRecord } from '../../../types/telemetry';
import { cn } from '../../../lib/cn';

const OUTCOME_LABEL: Record<ShotRecord['outcome'], string> = {
  goal: 'Goal',
  saved: 'Saved',
  missed: 'Missed',
};

const OUTCOME_STYLE: Record<ShotRecord['outcome'], { marker: string; text: string }> = {
  goal: { marker: 'bg-positive', text: 'text-positive' },
  saved: { marker: 'bg-accent', text: 'text-accent' },
  missed: { marker: 'bg-ink-muted', text: 'text-ink-muted' },
};

const OUTCOME_SIZE: Record<ShotRecord['outcome'], number> = {
  goal: 16,
  saved: 12,
  missed: 9,
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function ShootMapCard() {
  const frame = useStudioStore((s) => s.frame);

  const shots = useMemo(() => frame?.shots ?? [], [frame]);

  const aggregates = useMemo(() => {
    const totalShots = shots.length;
    const onTarget = shots.filter((shot) => shot.onTarget).length;
    const expectedGoals = shots.reduce((sum, shot) => sum + shot.xG, 0);
    const medianDistance = median(shots.map((shot) => shot.distanceToGoalM));
    return { totalShots, onTarget, expectedGoals, medianDistance };
  }, [shots]);

  if (!frame) {
    return (
      <Panel className="flex h-full flex-col">
        <PanelHeader title="Shoot Map" kicker="Every shot in the fixture" />
        <PanelBody className="flex flex-1 items-center justify-center">
          <EmptyState
            title="No telemetry frame yet"
            description="The shoot map plots every shot the synthetic fixture has produced."
          />
        </PanelBody>
      </Panel>
    );
  }

  return (
    <Panel className="flex h-full flex-col">
      <PanelHeader
        title="Shoot Map"
        kicker="Every shot in the fixture"
        actions={<Chip tone="accent">{aggregates.totalShots} shots</Chip>}
      />
      <PanelBody className="flex flex-1 flex-col gap-3">
        {shots.length === 0 ? (
          <EmptyState
            title="No shots yet"
            description="Nothing has been struck at goal in this fixture so far."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Total Shots" value={aggregates.totalShots} />
              <StatTile label="Shots on Target" value={aggregates.onTarget} />
              <StatTile
                label="Total Expected Goals"
                value={aggregates.expectedGoals.toFixed(2)}
                unit="xG"
              />
              <StatTile
                label="Median Shot Distance"
                value={aggregates.medianDistance.toFixed(1)}
                unit="m"
              />
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
              <div className="flex flex-col gap-2">
                <SectionLabel>Shot Plot</SectionLabel>
                <PitchSurface label="Shot map for the current frame">
                  {shots.map((shot) => {
                    const style = OUTCOME_STYLE[shot.outcome];
                    const size = OUTCOME_SIZE[shot.outcome];
                    const teamName =
                      shot.team === 'home' ? TEAM_NAMES.home : TEAM_NAMES.away;
                    return (
                      <span
                        key={shot.id}
                        role="img"
                        aria-label={`${OUTCOME_LABEL[shot.outcome]} by ${shot.playerName} for ${teamName} at ${shot.matchClock}, expected goals ${shot.xG.toFixed(2)}, ${shot.distanceToGoalM.toFixed(1)} metres from goal`}
                        title={`${OUTCOME_LABEL[shot.outcome]} — ${shot.playerName} (${teamName}) ${shot.matchClock} — xG ${shot.xG.toFixed(
                          2,
                        )} — ${shot.distanceToGoalM.toFixed(1)}m from goal`}
                        className={cn(
                          'absolute -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-black/40',
                          style.marker,
                        )}
                        style={{
                          left: `${pitchPercentX(shot.x)}%`,
                          top: `${pitchPercentY(shot.y)}%`,
                          width: size,
                          height: size,
                        }}
                      />
                    );
                  })}
                </PitchSurface>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {(['goal', 'saved', 'missed'] as ShotRecord['outcome'][]).map((outcome) => (
                    <span
                      key={outcome}
                      className="flex items-center gap-1.5 text-[10px] text-ink-muted"
                    >
                      <span
                        className={cn(
                          'h-2 w-2 rounded-full',
                          OUTCOME_STYLE[outcome].marker,
                        )}
                        aria-hidden
                      />
                      {OUTCOME_LABEL[outcome]}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <SectionLabel>Shots</SectionLabel>
                <ul className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                  {[...shots].reverse().map((shot) => {
                    const style = OUTCOME_STYLE[shot.outcome];
                    const teamName =
                      shot.team === 'home' ? TEAM_NAMES.home : TEAM_NAMES.away;
                    return (
                      <li
                        key={shot.id}
                        className="rounded-lg border border-line bg-inset px-2.5 py-2"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-mono text-[11px] font-semibold tabular-nums text-ink-muted">
                            {shot.matchClock}
                          </span>
                          <span className={cn('text-[10px] font-semibold uppercase tracking-[0.12em]', style.text)}>
                            {OUTCOME_LABEL[shot.outcome]}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-[12px] text-ink">{shot.playerName}</p>
                        <p className="text-[10px] text-ink-muted">
                          {teamName} · xG {shot.xG.toFixed(2)} · {shot.distanceToGoalM.toFixed(1)}m
                          from goal
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </>
        )}
      </PanelBody>
    </Panel>
  );
}
