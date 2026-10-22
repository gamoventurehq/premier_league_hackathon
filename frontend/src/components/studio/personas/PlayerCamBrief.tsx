'use client';

/**
 * The Player Cam brief.
 *
 * The camera is on one player. The brief says who it is, where they are on
 * the pitch, how fast they are moving and what the camera can see right now
 * — the position, not the aggregate.
 *
 * The camera falls back to the designated Player Cam player when the studio
 * has not been told to follow anybody else.
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
  StatTile,
  TeamCrest,
} from '../primitives';

export interface PlayerCamBriefProps {
  frame: TelemetryFrame | null;
  language?: BroadcastLanguage;
  /** The player the studio is currently tracking, if any. */
  selectedPlayerId?: string | null;
  onSelectPlayer?: (playerId: string) => void;
  className?: string;
}

export function PlayerCamBrief({
  frame,
  language = 'en',
  selectedPlayerId = null,
  onSelectPlayer,
  className,
}: PlayerCamBriefProps) {
  if (!frame) {
    return (
      <Panel className={className}>
        <PanelHeader title="Player Cam" kicker="One player, one camera" />
        <PanelBody>
          <EmptyState
            title="No telemetry frame yet"
            description="The camera finds its player with the first published frame."
          />
        </PanelBody>
      </Panel>
    );
  }

  const designated = frame.players.find((player) => player.isDesignatedPlayerCam);
  const tracked =
    frame.players.find((player) => player.id === selectedPlayerId) ?? designated;

  const { latestNarrative } = frame;

  return (
    <Panel className={cn('flex h-full flex-col', className)}>
      <PanelHeader
        title="Player Cam"
        kicker="One player, one camera"
        actions={<Chip tone="positive">{frame.matchClock}</Chip>}
      />
      <PanelBody className="flex flex-1 flex-col gap-4">
        <div>
          <p className="text-[14px] font-semibold leading-snug tracking-tight text-ink">
            {latestNarrative.headline[language]}
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-strong">
            {latestNarrative.playerCamContext}
          </p>
        </div>

        {tracked ? (
          <>
            <div className="flex items-center gap-3 rounded-xl border border-line bg-inset/60 p-3">
              <TeamCrest
                label={tracked.team === 'home' ? TEAM_NAMES.home : TEAM_NAMES.away}
                tone={tracked.team}
              />
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold tracking-tight text-ink">
                  #{tracked.number} {tracked.name}
                </p>
                <p className="text-[11px] text-ink-muted">
                  {tracked.team === 'home' ? TEAM_NAMES.home : TEAM_NAMES.away} ·{' '}
                  {tracked.position} · {tracked.role}
                </p>
              </div>
              {tracked.onBall ? (
                <Chip tone="accent" className="ml-auto">
                  On the ball
                </Chip>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatTile
                label="Current speed"
                value={tracked.speedKmH.toFixed(1)}
                unit="km/h"
                tone="accent"
              />
              <StatTile
                label="Distance covered"
                value={(tracked.distanceMeters / 1000).toFixed(2)}
                unit="km"
              />
              <StatTile
                label="Pitch position"
                value={`${tracked.x.toFixed(1)}`}
                unit="m x"
                hint={`${tracked.y.toFixed(1)} m across`}
              />
              <StatTile label="Touches" value={tracked.touches} />
            </div>

            <div>
              <SectionLabel>Camera target</SectionLabel>
              <label className="sr-only" htmlFor="player-cam-target">
                Choose the player the camera follows
              </label>
              <select
                id="player-cam-target"
                value={tracked.id}
                onChange={(event) => onSelectPlayer?.(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line bg-inset px-3 py-2 text-[12px] font-medium text-ink outline-none transition-colors hover:border-line-strong"
              >
                {frame.players.map((player) => (
                  <option
                    key={player.id}
                    value={player.id}
                    className="bg-surface text-ink"
                  >
                    #{player.number} {player.name} ·{' '}
                    {player.team === 'home' ? TEAM_NAMES.home : TEAM_NAMES.away}
                    {player.isDesignatedPlayerCam ? ' · designated' : ''}
                  </option>
                ))}
              </select>
              {designated ? (
                <p className="mt-1.5 text-[11px] text-ink-muted">
                  The designated Player Cam player is #{designated.number}{' '}
                  {designated.name}.
                </p>
              ) : null}
            </div>

            <div className="border-t border-line pt-2">
              <KeyValue
                label="Position on the pitch"
                value={`${tracked.x.toFixed(1)} m · ${tracked.y.toFixed(1)} m`}
              />
              <KeyValue
                label="Heading"
                value={`${tracked.vx.toFixed(1)} · ${tracked.vy.toFixed(1)} m/s`}
              />
              <KeyValue
                label="Formation anchor"
                value={`${tracked.homeX.toFixed(1)} m · ${tracked.homeY.toFixed(1)} m`}
              />
            </div>
          </>
        ) : (
          <p className="text-[12px] text-ink-muted">
            No player is designated for the camera on this frame.
          </p>
        )}
      </PanelBody>
    </Panel>
  );
}

export default PlayerCamBrief;
