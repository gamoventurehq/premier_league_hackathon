'use client';

/**
 * Formation view.
 *
 * Both teams on one pitch, drawn in CSS: the half-way line, the centre
 * circle and the penalty areas are absolutely positioned divs, the players
 * are placed at their live coordinates in metres. The faint ring behind a
 * player is their formation anchor (`homeX` / `homeY`), so the viewer can
 * read the gap between the shape the team set out in and the shape they are
 * actually in.
 *
 * Clicking a player selects them in the Single Base Memory, which the Player
 * Spotlight card reacts to.
 */

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import {
  Chip,
  EmptyState,
  Panel,
  PanelBody,
  PanelHeader,
  PitchNode,
  SectionLabel,
} from '../primitives';
import { useStudioActions, useStudioStore } from '../../../store/studio-store';
import { TEAM_NAMES } from '../../../lib/narratives';
import { PITCH_LENGTH, PITCH_WIDTH } from '../../../lib/pitch';
import type { PlayerMatchStats, PlayerRole, TeamSide } from '../../../types/telemetry';
import { cn } from '../../../lib/cn';

/* ------------------------------------------------------------------ */
/* Shared pitch surface                                                */
/* ------------------------------------------------------------------ */

/**
 * The pitch itself. Shared with the Shoot Map, the Player Spotlight and the
 * Attacking Shape so all four read as the same ground.
 *
 * The container keeps the 105:68 aspect ratio, so a percentage of its width
 * is a percentage of the pitch length and a percentage of its height is a
 * percentage of the pitch width.
 */
export function PitchSurface({
  children,
  className,
  label,
}: {
  children?: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'relative aspect-[105/68] w-full overflow-hidden rounded-xl border border-line bg-inset',
        className,
      )}
    >
      {/* Half-way line */}
      <div className="absolute left-1/2 top-0 h-full border-l border-line-strong" />
      {/* Centre circle */}
      <div className="absolute left-1/2 top-1/2 aspect-square w-[17.43%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-line-strong" />
      {/* Centre spot */}
      <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink-muted" />
      {/* Home penalty area and goal area */}
      <div className="absolute left-0 top-1/2 h-[59.29%] w-[15.71%] -translate-y-1/2 border-r border-line-strong" />
      <div className="absolute left-0 top-1/2 h-[26.94%] w-[5.24%] -translate-y-1/2 border-r border-line-strong" />
      {/* Away penalty area and goal area */}
      <div className="absolute right-0 top-1/2 h-[59.29%] w-[15.71%] -translate-y-1/2 border-l border-line-strong" />
      <div className="absolute right-0 top-1/2 h-[26.94%] w-[5.24%] -translate-y-1/2 border-l border-line-strong" />
      {children}
    </div>
  );
}

/** Pitch metres to the percentage the pitch container uses. */
export function pitchPercentX(x: number): number {
  return (x / PITCH_LENGTH) * 100;
}

export function pitchPercentY(y: number): number {
  return (y / PITCH_WIDTH) * 100;
}

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */

const ROLE_ORDER: PlayerRole[] = ['GK', 'DF', 'MF', 'FW'];

const ROLE_LABEL: Record<PlayerRole, string> = {
  GK: 'Goalkeeper',
  DF: 'Defence',
  MF: 'Midfield',
  FW: 'Attack',
};

function shapeOf(stats: PlayerMatchStats[], team: TeamSide): string {
  const counts = ROLE_ORDER.map((role) => ({
    role,
    count: stats.filter((stat) => stat.team === team && stat.role === role).length,
  }));
  return counts.map((entry) => entry.count).join('-');
}

export function FormationPitchCard() {
  const frame = useStudioStore((s) => s.frame);
  const selectedPlayerId = useStudioStore((s) => s.selectedPlayerId);
  const actions = useStudioActions();

  const statsById = useMemo(() => {
    const map = new Map<string, PlayerMatchStats>();
    frame?.playerStats.forEach((stat) => map.set(stat.id, stat));
    return map;
  }, [frame]);

  const players = useMemo(() => frame?.players ?? [], [frame]);

  if (!frame) {
    return (
      <Panel className="flex h-full flex-col">
        <PanelHeader title="Formation" kicker="Live shape" />
        <PanelBody className="flex flex-1 items-center justify-center">
          <EmptyState
            title="No telemetry frame yet"
            description="The formation appears as soon as the synthetic match engine publishes a frame."
          />
        </PanelBody>
      </Panel>
    );
  }

  const homeShape = shapeOf(frame.playerStats, 'home');
  const awayShape = shapeOf(frame.playerStats, 'away');

  return (
    <Panel className="flex h-full flex-col">
      <PanelHeader
        title="Formation"
        kicker="Live shape"
        actions={
          selectedPlayerId ? (
            <button
              type="button"
              onClick={() => actions.selectPlayer(null)}
              className="rounded-full border border-line px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
            >
              Clear selection
            </button>
          ) : null
        }
      />
      <PanelBody className="flex flex-1 flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12px] font-semibold text-home">
            {TEAM_NAMES.home} <span className="text-ink-muted">{homeShape}</span>
          </span>
          <span className="text-[10px] uppercase tracking-[0.16em] text-ink-muted">Formation</span>
          <span className="text-[12px] font-semibold text-away">
            <span className="text-ink-muted">{awayShape}</span> {TEAM_NAMES.away}
          </span>
        </div>

        <PitchSurface label="Live player positions for both teams">
          {/* Formation anchors */}
          {players.map((player) => (
            <span
              key={`anchor-${player.id}`}
              aria-hidden
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-line-strong"
              style={{
                left: `${pitchPercentX(player.homeX)}%`,
                top: `${pitchPercentY(player.homeY)}%`,
                width: 14,
                height: 14,
              }}
            />
          ))}

          {/* Players */}
          {players.map((player) => {
            const stat = statsById.get(player.id);
            const selected = selectedPlayerId === player.id;
            const teamName = player.team === 'home' ? TEAM_NAMES.home : TEAM_NAMES.away;
            const rating = stat ? stat.rating.toFixed(1) : '—';
            return (
              <button
                key={player.id}
                type="button"
                onClick={() => actions.selectPlayer(player.id)}
                aria-pressed={selected}
                aria-label={`${player.name}, number ${player.number}, ${player.position}, ${ROLE_LABEL[player.role]}, ${teamName}, rating ${rating}`}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${pitchPercentX(player.x)}%`,
                  top: `${pitchPercentY(player.y)}%`,
                }}
              >
                <span className="relative block h-8 w-8">
                  <PitchNode
                    x={50}
                    y={50}
                    tone={player.team}
                    size={20}
                    selected={selected}
                  />
                </span>
                <span
                  className={cn(
                    'absolute left-1/2 top-8 flex -translate-x-1/2 flex-col items-center whitespace-nowrap text-center leading-tight',
                    selected ? 'text-ink' : 'text-ink-muted',
                  )}
                >
                  <span className="text-[9px] font-semibold text-ink">
                    {player.number} {player.shortName}
                  </span>
                  <span className="text-[8px] tabular-nums text-ink-muted">
                    {player.position} · {rating}
                  </span>
                </span>
              </button>
            );
          })}
        </PitchSurface>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="flex items-center gap-1.5 text-[10px] text-ink-muted">
            <span className="h-2 w-2 rounded-full bg-home" aria-hidden />
            {TEAM_NAMES.home}
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-ink-muted">
            <span className="h-2 w-2 rounded-full bg-away" aria-hidden />
            {TEAM_NAMES.away}
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-ink-muted">
            <span
              className="h-2.5 w-2.5 rounded-full border border-line-strong"
              aria-hidden
            />
            Formation anchor
          </span>
        </div>

        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <SectionLabel>Player Ratings</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            {(['home', 'away'] as TeamSide[]).map((team) => (
              <div key={team} className="flex flex-col gap-1">
                <Chip tone={team}>{team === 'home' ? TEAM_NAMES.home : TEAM_NAMES.away}</Chip>
                {frame.playerStats
                  .filter((stat) => stat.team === team)
                  .map((stat) => (
                    <button
                      key={stat.id}
                      type="button"
                      onClick={() => actions.selectPlayer(stat.id)}
                      aria-pressed={selectedPlayerId === stat.id}
                      className={cn(
                        'flex items-baseline justify-between gap-2 rounded-md px-1.5 py-1 text-left text-[11px] transition-colors',
                        selectedPlayerId === stat.id
                          ? 'bg-accent-soft text-ink'
                          : 'text-ink-muted hover:bg-inset hover:text-ink',
                      )}
                    >
                      <span className="truncate">
                        {stat.number} {stat.shortName}{' '}
                        <span className="text-ink-muted">{stat.position}</span>
                      </span>
                      <span className="tabular-nums text-ink">{stat.rating.toFixed(1)}</span>
                    </button>
                  ))}
              </div>
            ))}
          </div>
        </div>
      </PanelBody>
    </Panel>
  );
}
