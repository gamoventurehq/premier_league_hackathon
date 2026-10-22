'use client';

/**
 * The scorecard.
 *
 * The score, the clock, the Synthetic Match Scenario the fixture is running,
 * and the headline metrics a viewer checks first: Pitch Control, the Pass
 * Difficulty Rating (PDR), the Control vs. Chaos Index, Game Rhythm, pass
 * completion, shots and the top sprint speed.
 *
 * Every value is read from the frame on screen. There is no fixture state
 * baked into this file.
 */

import {
  Chip,
  EmptyState,
  KeyValue,
  Panel,
  PanelBody,
  PanelHeader,
  SplitBar,
  StatTile,
  TeamCrest,
} from '../primitives';
import { useStudioStore } from '../../../store/studio-store';
import { TEAM_NAMES } from '../../../lib/narratives';
import { SCENARIOS } from '../../../lib/pitch';
import type { GameRhythm } from '../../../types/telemetry';

const RHYTHM_TONE: Record<GameRhythm, 'neutral' | 'accent' | 'positive' | 'caution'> = {
  Structured: 'positive',
  Fluid: 'accent',
  Transitional: 'caution',
  Chaotic: 'neutral',
};

function formatOne(value: number): string {
  return value.toFixed(1);
}

export function MatchScoreCard() {
  const frame = useStudioStore((s) => s.frame);

  if (!frame) {
    return (
      <Panel className="flex h-full flex-col">
        <PanelHeader title="Match Score" kicker="Synthetic Match Scenario" />
        <PanelBody className="flex flex-1 items-center justify-center">
          <EmptyState
            title="No telemetry frame yet"
            description="The scorecard fills in as soon as the synthetic match engine publishes a frame."
          />
        </PanelBody>
      </Panel>
    );
  }

  const { score, metrics } = frame;
  const scenarioLabel = SCENARIOS[frame.scenario].label;
  const pitchControl = metrics.pitchControl;

  return (
    <Panel className="flex h-full flex-col">
      <PanelHeader
        title="Match Score"
        kicker="Synthetic Match Scenario"
        actions={<Chip tone="accent">{scenarioLabel}</Chip>}
      />
      <PanelBody className="flex flex-1 flex-col gap-4">
        {/* -------------------------------------------------- */}
        {/* Scoreboard                                          */}
        {/* -------------------------------------------------- */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex flex-col items-center gap-1.5 text-center">
            <TeamCrest label={TEAM_NAMES.home} tone="home" />
            <span className="text-[12px] font-semibold leading-tight text-ink">
              {TEAM_NAMES.home}
            </span>
            <span className="text-[10px] uppercase tracking-[0.14em] text-home">Home</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <div aria-live="polite" className="flex flex-col items-center">
              <span className="sr-only">
                {TEAM_NAMES.home} {score.home}, {TEAM_NAMES.away} {score.away}
              </span>
              <span
                aria-hidden
                className="text-[34px] font-semibold leading-none tabular-nums tracking-tight text-ink"
              >
                {score.home} – {score.away}
              </span>
            </div>
            <p
              aria-live="polite"
              className="font-mono text-[12px] font-semibold tabular-nums text-ink-muted"
            >
              {frame.matchClock}
            </p>
            <p className="text-[10px] tabular-nums text-ink-muted">
              Elapsed {Math.floor(frame.matchSeconds / 60)}:
              {String(Math.floor(frame.matchSeconds % 60)).padStart(2, '0')} of match time
            </p>
          </div>

          <div className="flex flex-col items-center gap-1.5 text-center">
            <TeamCrest label={TEAM_NAMES.away} tone="away" />
            <span className="text-[12px] font-semibold leading-tight text-ink">
              {TEAM_NAMES.away}
            </span>
            <span className="text-[10px] uppercase tracking-[0.14em] text-away">Away</span>
          </div>
        </div>

        {/* -------------------------------------------------- */}
        {/* Pitch Control                                       */}
        {/* -------------------------------------------------- */}
        <div className="flex flex-col gap-2 rounded-xl border border-line bg-inset px-3 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-muted">
              Pitch Control
            </p>
            <p className="text-[10px] tabular-nums text-ink-muted">
              Contested {formatOne(pitchControl.contested)}%
            </p>
          </div>
          <SplitBar
            home={pitchControl.home}
            away={pitchControl.away}
            label={`Pitch Control: home ${formatOne(pitchControl.home)} percent, away ${formatOne(
              pitchControl.away,
            )} percent, contested ${formatOne(pitchControl.contested)} percent`}
          />
          <div className="grid grid-cols-2 gap-3">
            <KeyValue
              label={`${TEAM_NAMES.home} Pitch Control`}
              value={`${formatOne(pitchControl.home)}%`}
              tone="home"
            />
            <KeyValue
              label={`${TEAM_NAMES.away} Pitch Control`}
              value={`${formatOne(pitchControl.away)}%`}
              tone="away"
            />
          </div>
        </div>

        {/* -------------------------------------------------- */}
        {/* Headline metrics                                    */}
        {/* -------------------------------------------------- */}
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            label="Pass Difficulty Rating (PDR)"
            value={Math.round(metrics.passDifficultyRating)}
            unit="/ 100"
            tone="accent"
          />
          <StatTile
            label="Control vs. Chaos Index"
            value={Math.round(metrics.controlVsChaosIndex)}
            unit="/ 100"
          />
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-inset px-3 py-2.5">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-muted">
            Game Rhythm
          </p>
          <Chip tone={RHYTHM_TONE[metrics.gameRhythm]}>{metrics.gameRhythm}</Chip>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <StatTile
              label={`${TEAM_NAMES.home} Pass Completion`}
              value={`${metrics.passCompletion.home}%`}
              tone="home"
            />
            <StatTile
              label={`${TEAM_NAMES.away} Pass Completion`}
              value={`${metrics.passCompletion.away}%`}
              tone="away"
            />
          </div>
          <div className="flex flex-col gap-2">
            <StatTile
              label={`${TEAM_NAMES.home} Shots`}
              value={metrics.shotCount.home}
              tone="home"
            />
            <StatTile
              label={`${TEAM_NAMES.away} Shots`}
              value={metrics.shotCount.away}
              tone="away"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-line pt-3">
          <StatTile
            label="Top Sprint Speed"
            value={formatOne(metrics.topSprintKmH)}
            unit="km/h"
          />
          <StatTile
            label="Ball Progression"
            value={metrics.ballProgressionM}
            unit="m"
            tone={frame.ball.possessionTeam === 'away' ? 'away' : 'home'}
            hint={
              frame.ball.possessionTeam
                ? `Net metres gained per possession, ${TEAM_NAMES[frame.ball.possessionTeam]} in possession`
                : 'Net metres gained per possession'
            }
          />
        </div>

        <p className="text-[10px] leading-relaxed text-ink-muted">
          Synthetic Match Scenario: {scenarioLabel}. All values are read from the live
          telemetry frame.
        </p>
      </PanelBody>
    </Panel>
  );
}
