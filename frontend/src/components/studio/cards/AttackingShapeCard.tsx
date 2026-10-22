'use client';

/**
 * The attacking shape.
 *
 * Where each side's players are, how many of them are in the final third,
 * who has the ball, and which passing lanes are open right now. The lanes
 * are drawn on the pitch as an SVG overlay in pitch metres, and the lane
 * with the highest Pass Difficulty Rating (PDR) is highlighted — the hardest
 * pass the game is asking for.
 */

import { useMemo } from 'react';
import {
  Chip,
  EmptyState,
  KeyValue,
  Panel,
  PanelBody,
  PanelHeader,
  PitchNode,
  SectionLabel,
  StatTile,
} from '../primitives';
import { PitchSurface, pitchPercentX, pitchPercentY } from './FormationPitchCard';
import { useStudioStore } from '../../../store/studio-store';
import { TEAM_NAMES } from '../../../lib/narratives';
import { FINAL_THIRD_THRESHOLD, PITCH_LENGTH } from '../../../lib/pitch';
import type { PassingLane, PlayerRole, TeamSide } from '../../../types/telemetry';
import { cn } from '../../../lib/cn';

const ROLE_ORDER: PlayerRole[] = ['GK', 'DF', 'MF', 'FW'];

const ROLE_LABEL: Record<PlayerRole, string> = {
  GK: 'GK',
  DF: 'DEF',
  MF: 'MID',
  FW: 'ATT',
};

export function AttackingShapeCard() {
  const frame = useStudioStore((s) => s.frame);

  const players = useMemo(() => frame?.players ?? [], [frame]);
  const lanes = useMemo(() => frame?.passingLanes ?? [], [frame]);

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    players.forEach((player) => map.set(player.id, player.shortName));
    return map;
  }, [players]);

  /** The hardest pass the game is asking for right now. */
  const topLane = useMemo(() => {
    return lanes.reduce<PassingLane | null>((best, lane) => {
      if (!best) return lane;
      return lane.passDifficultyRating > best.passDifficultyRating ? lane : best;
    }, null);
  }, [lanes]);

  const grouped = useMemo(() => {
    const build = (team: TeamSide) =>
      ROLE_ORDER.map((role) => ({
        role,
        members: players.filter((player) => player.team === team && player.role === role),
      })).filter((group) => group.members.length > 0);
    return { home: build('home'), away: build('away') };
  }, [players]);

  const homeFinalThird = useMemo(
    () => players.filter((player) => player.team === 'home' && player.x > FINAL_THIRD_THRESHOLD).length,
    [players],
  );
  const awayFinalThird = useMemo(
    () =>
      players.filter(
        (player) => player.team === 'away' && player.x < PITCH_LENGTH - FINAL_THIRD_THRESHOLD,
      ).length,
    [players],
  );

  if (!frame) {
    return (
      <Panel className="flex h-full flex-col">
        <PanelHeader title="Attacking Shape" kicker="Live shape and passing lanes" />
        <PanelBody className="flex flex-1 items-center justify-center">
          <EmptyState
            title="No telemetry frame yet"
            description="The attacking shape appears as soon as the synthetic match engine publishes a frame."
          />
        </PanelBody>
      </Panel>
    );
  }

  const possession = frame.ball.possessionTeam;
  const possessionLabel = possession
    ? possession === 'home'
      ? TEAM_NAMES.home
      : TEAM_NAMES.away
    : 'Loose ball';

  return (
    <Panel className="flex h-full flex-col">
      <PanelHeader
        title="Attacking Shape"
        kicker="Live shape and passing lanes"
        actions={<Chip tone="accent">In possession: {possessionLabel}</Chip>}
      />
      <PanelBody className="flex flex-1 flex-col gap-4">
        {/* -------------------------------------------------- */}
        {/* Shape on the pitch                                  */}
        {/* -------------------------------------------------- */}
        <PitchSurface label="Live attacking shape with the passing lanes in play">
          {/* Passing lanes, drawn in pitch metres */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 105 68"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {lanes.map((lane, index) => {
              const isTop =
                topLane !== null &&
                lane.passerId === topLane.passerId &&
                lane.receiverId === topLane.receiverId;
              return (
                <line
                  key={`${lane.passerId}-${lane.receiverId}-${index}`}
                  x1={lane.passerPos.x}
                  y1={lane.passerPos.y}
                  x2={lane.receiverPos.x}
                  y2={lane.receiverPos.y}
                  className={isTop ? 'stroke-accent' : 'stroke-ink-muted'}
                  strokeWidth={isTop ? 0.9 : 0.4}
                  strokeOpacity={isTop ? 0.95 : 0.45}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>

          {/* Players */}
          {players.map((player) => {
            const inTopLane =
              topLane !== null &&
              (player.id === topLane.passerId || player.id === topLane.receiverId);
            return (
              <PitchNode
                key={player.id}
                x={pitchPercentX(player.x)}
                y={pitchPercentY(player.y)}
                tone={player.team}
                size={inTopLane ? 16 : 12}
                selected={inTopLane}
              />
            );
          })}

          {/* The ball */}
          <PitchNode
            x={pitchPercentX(frame.ball.x)}
            y={pitchPercentY(frame.ball.y)}
            tone="ball"
            size={10}
          />
        </PitchSurface>

        {/* -------------------------------------------------- */}
        {/* Where the attack is being built                    */}
        {/* -------------------------------------------------- */}
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            label={`${TEAM_NAMES.home} in final third`}
            value={homeFinalThird}
            tone="home"
            hint={`Past ${FINAL_THIRD_THRESHOLD}m from the home goal line`}
          />
          <StatTile
            label={`${TEAM_NAMES.away} in final third`}
            value={awayFinalThird}
            tone="away"
            hint={`Past ${FINAL_THIRD_THRESHOLD}m from the away goal line`}
          />
        </div>

        <div className="rounded-xl border border-line bg-inset px-3 py-2">
          <KeyValue label="Possession" value={possessionLabel} tone={possession ?? 'default'} />
          <KeyValue
            label="Ball position"
            value={`${frame.ball.x.toFixed(1)}m, ${frame.ball.y.toFixed(1)}m`}
          />
          <KeyValue label="Ball speed" value={`${frame.ball.speedKmH.toFixed(1)} km/h`} />
        </div>

        {/* -------------------------------------------------- */}
        {/* Team shapes                                        */}
        {/* -------------------------------------------------- */}
        <div className="grid grid-cols-2 gap-3">
          {(['home', 'away'] as TeamSide[]).map((team) => (
            <div key={team} className="flex flex-col gap-2">
              <Chip tone={team}>{team === 'home' ? TEAM_NAMES.home : TEAM_NAMES.away}</Chip>
              {grouped[team].map((group) => (
                <div key={group.role} className="flex flex-col gap-0.5">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                    {ROLE_LABEL[group.role]} ({group.members.length})
                  </p>
                  <ul className="space-y-0.5">
                    {group.members.map((player) => (
                      <li
                        key={player.id}
                        className="flex items-baseline justify-between gap-2 text-[11px] text-ink-muted"
                      >
                        <span className="truncate">
                          <span className="text-ink">{player.position}</span> {player.shortName}
                        </span>
                        <span className="tabular-nums">
                          {player.x.toFixed(0)}m
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* -------------------------------------------------- */}
        {/* Passing lanes in play                              */}
        {/* -------------------------------------------------- */}
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <div className="flex items-center justify-between gap-2">
            <SectionLabel>Passing Lanes in Play</SectionLabel>
            <span className="text-[10px] tabular-nums text-ink-muted">{lanes.length} lanes</span>
          </div>
          {lanes.length === 0 ? (
            <p className="rounded-lg border border-line bg-inset px-3 py-2 text-[11px] text-ink-muted">
              No passing lanes are open at this moment.
            </p>
          ) : (
            <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
              {[...lanes]
                .sort((a, b) => b.passDifficultyRating - a.passDifficultyRating)
                .map((lane, index) => {
                  const isTop =
                    topLane !== null &&
                    lane.passerId === topLane.passerId &&
                    lane.receiverId === topLane.receiverId;
                  return (
                    <li
                      key={`${lane.passerId}-${lane.receiverId}-${index}`}
                      className={cn(
                        'rounded-lg border px-2.5 py-2',
                        isTop ? 'border-accent/50 bg-accent-soft' : 'border-line bg-inset',
                      )}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[12px] text-ink">
                          {nameById.get(lane.passerId) ?? 'Unknown'} →{' '}
                          {nameById.get(lane.receiverId) ?? 'Unknown'}
                        </span>
                        <span className="font-mono text-[12px] font-semibold tabular-nums text-accent">
                          {Math.round(lane.passDifficultyRating)}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] text-ink-muted">
                          PDR {Math.round(lane.passDifficultyRating)} / 100
                        </span>
                        <span className="text-[10px] text-ink-muted">
                          Interception risk {Math.round(lane.interceptionRisk * 100)}%
                        </span>
                        <Chip tone={lane.isClear ? 'positive' : 'caution'}>
                          {lane.isClear ? 'Clear' : 'Contested'}
                        </Chip>
                        {isTop ? <Chip tone="accent">Highest PDR</Chip> : null}
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </div>
      </PanelBody>
    </Panel>
  );
}
