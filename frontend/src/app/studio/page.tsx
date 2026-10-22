'use client';

/**
 * The studio dashboard.
 *
 * This is the composition of the six cards the branch's studio was built
 * around, laid out the way the branch laid them out and re-expressed in
 * the token system: the moment rail on the left, the match state and the
 * shape of the game in the middle, the individual players and the shots
 * that produced the scoreline on the right.
 *
 * Every number on this page comes from the live telemetry frame. Nothing is
 * hard-coded, and nothing is a mock: the same cards read the same frame
 * whether it arrives over the WebSocket from the Azure-native backend or
 * from the simulation running in the browser.
 */

import { AttackingShapeCard } from '../../components/studio/cards/AttackingShapeCard';
import { FormationPitchCard } from '../../components/studio/cards/FormationPitchCard';
import { MatchScoreCard } from '../../components/studio/cards/MatchScoreCard';
import { MediaTimelinePanel } from '../../components/studio/cards/MediaTimelinePanel';
import { PlayerSpotlightCard } from '../../components/studio/cards/PlayerSpotlightCard';
import { ShootMapCard } from '../../components/studio/cards/ShootMapCard';

export default function StudioPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="min-w-0">
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">
          Match Dashboard
        </h1>
        <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-ink-muted">
          The Synthetic Match Scenario as the studio sees it right now: the
          scoreline and the metrics behind it, the shape each side is
          holding, and the players the match has been about.
        </p>
      </header>

      <div className="studio-dashboard-grid">
        <div className="flex min-w-0 flex-col gap-4">
          <MediaTimelinePanel />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <MatchScoreCard />
          <FormationPitchCard />
          <AttackingShapeCard />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <PlayerSpotlightCard />
          <ShootMapCard />
        </div>
      </div>
    </div>
  );
}
