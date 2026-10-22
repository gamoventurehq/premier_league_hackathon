'use client';

/**
 * Player of the match.
 *
 * The standout is derived from the frame, never named by hand: the highest
 * match rating, broken by touches, then by shots, then by completed passes.
 * If the viewer picks somebody on the pitch, the spotlight follows that
 * player instead — the card is a lens on the Single Base Memory, not a fixed
 * story about one player.
 */

import { useMemo } from 'react';
import {
  Chip,
  EmptyState,
  Panel,
  PanelBody,
  PanelHeader,
  PitchNode,
  StatTile,
  TeamCrest,
} from '../primitives';
import { PitchSurface, pitchPercentX, pitchPercentY } from './FormationPitchCard';
import { useStudioStore } from '../../../store/studio-store';
import { TEAM_NAMES } from '../../../lib/narratives';
import type { PlayerMatchStats } from '../../../types/telemetry';

/** Highest rating, then touches, then shots, then completed passes. */
function pickStandout(stats: PlayerMatchStats[]): PlayerMatchStats | null {
  return stats.reduce<PlayerMatchStats | null>((best, candidate) => {
    if (!best) return candidate;
    if (candidate.rating !== best.rating) return candidate.rating > best.rating ? candidate : best;
    if (candidate.touches !== best.touches)
      return candidate.touches > best.touches ? candidate : best;
    if (candidate.shots !== best.shots) return candidate.shots > best.shots ? candidate : best;
    return candidate.passesCompleted > best.passesCompleted ? candidate : best;
  }, null);
}

export function PlayerSpotlightCard() {
  const frame = useStudioStore((s) => s.frame);
  const selectedPlayerId = useStudioStore((s) => s.selectedPlayerId);

  const standout = useMemo(() => pickStandout(frame?.playerStats ?? []), [frame]);
  const selected = useMemo(
    () => frame?.playerStats.find((stat) => stat.id === selectedPlayerId) ?? null,
    [frame, selectedPlayerId],
  );

  const subject = selected ?? standout;

  const live = useMemo(
    () => frame?.players.find((player) => player.id === subject?.id) ?? null,
    [frame, subject],
  );

  if (!frame || !subject) {
    return (
      <Panel className="flex h-full flex-col">
        <PanelHeader title="Player Spotlight" kicker="Player of the match" />
        <PanelBody className="flex flex-1 items-center justify-center">
          <EmptyState
            title="No player statistics yet"
            description="The spotlight picks the standout of the match from the live player statistics."
          />
        </PanelBody>
      </Panel>
    );
  }

  const teamName = subject.team === 'home' ? TEAM_NAMES.home : TEAM_NAMES.away;
  const isSelected = selected !== null;

  return (
    <Panel className="flex h-full flex-col">
      <PanelHeader
        title="Player Spotlight"
        kicker={isSelected ? 'Selected player' : 'Player of the match'}
        actions={
          <Chip tone={isSelected ? 'accent' : 'positive'}>
            {isSelected ? 'Selected' : 'Standout'}
          </Chip>
        }
      />
      <PanelBody className="flex flex-1 flex-col gap-4">
        {/* Identity */}
        <div className="flex items-center gap-3">
          <TeamCrest label={teamName} tone={subject.team} className="h-10 w-10 text-[12px]" />
          <div className="min-w-0">
            <p className="truncate text-[16px] font-semibold tracking-tight text-ink">
              {subject.name}
            </p>
            <p className="text-[11px] text-ink-muted">
              Number {subject.number} · {subject.position} · {teamName}
            </p>
          </div>
          <div className="ml-auto flex flex-col items-end">
            <p className="text-[26px] font-semibold leading-none tabular-nums text-accent">
              {subject.rating.toFixed(1)}
            </p>
            <p className="text-[10px] uppercase tracking-[0.14em] text-ink-muted">Rating</p>
          </div>
        </div>

        {/* Live position */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-muted">
            Live position
          </p>
          <PitchSurface
            className="mx-auto max-w-[340px]"
            label={`Live position of ${subject.name}`}
          >
            {frame.players
              .filter((player) => player.team === subject.team && player.id !== subject.id)
              .map((player) => (
                <span key={`mate-${player.id}`} aria-hidden className="opacity-40">
                  <PitchNode
                    x={pitchPercentX(player.x)}
                    y={pitchPercentY(player.y)}
                    tone={subject.team}
                    size={8}
                  />
                </span>
              ))}
            {live ? (
              <PitchNode
                x={pitchPercentX(live.x)}
                y={pitchPercentY(live.y)}
                tone={subject.team}
                size={18}
                selected
              />
            ) : null}
            <PitchNode
              x={pitchPercentX(frame.ball.x)}
              y={pitchPercentY(frame.ball.y)}
              tone="ball"
              size={10}
            />
          </PitchSurface>
          <p className="text-[11px] text-ink-muted">
            {live
              ? `${live.x.toFixed(1)}m from the home goal line, ${live.y.toFixed(1)}m across the pitch.`
              : 'Live coordinates for this player are not in the current frame.'}
          </p>
        </div>

        {/* Match numbers */}
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Touches" value={subject.touches} />
          <StatTile label="Completed Passes" value={subject.passesCompleted} />
          <StatTile label="Shots" value={subject.shots} />
          <StatTile label="Top Speed" value={subject.topSpeedKmH.toFixed(1)} unit="km/h" />
        </div>

        <div className="border-t border-line pt-3">
          <StatTile
            label="Distance Covered"
            value={(subject.distanceMeters / 1000).toFixed(2)}
            unit="km"
            className="w-full"
          />
        </div>
      </PanelBody>
    </Panel>
  );
}
