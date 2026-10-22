'use client';

/**
 * The pitch radar, in its original shape.
 *
 * This is the component the dashboard has always used: a single canvas that
 * renders the pitch, the players, the passing lanes and the speed vectors,
 * with the layers switchable. It now lives beside the rest of the studio and
 * draws through `LivePitchCanvas`, so there is exactly one renderer in the
 * product and both views stay in step with the frame.
 *
 * The field names it used to read — `pitchControl.homePercentage`,
 * `contestedPercentage` and `awayPercentage` — are gone: the current
 * contract is `pitchControl.home`, `pitchControl.contested` and
 * `pitchControl.away`, and the Pitch Control surface is drawn from the
 * frame's own control cells rather than from a guessed gradient.
 */

import { LivePitchCanvas } from './LivePitchCanvas';
import type { TelemetryFrame } from '../../types/telemetry';

export interface PitchRadarCanvasProps {
  frame: TelemetryFrame | null;
  /** Draw the Pitch Control surface under the players. */
  showPitchControl?: boolean;
  /** Draw the passing lanes currently available. */
  showPassingLanes?: boolean;
  /** Draw the velocity vector of every player. */
  showSpeedVectors?: boolean;
  selectedPlayerId?: string | null;
  onSelectPlayer?: (playerId: string) => void;
  paused?: boolean;
  className?: string;
}

export function PitchRadarCanvas({
  frame,
  showPitchControl = true,
  showPassingLanes = true,
  showSpeedVectors = false,
  selectedPlayerId = null,
  onSelectPlayer,
  paused = false,
  className,
}: PitchRadarCanvasProps) {
  return (
    <LivePitchCanvas
      frame={frame}
      showControlSurface={showPitchControl}
      showPassingLanes={showPassingLanes}
      showSpeedVectors={showSpeedVectors}
      selectedPlayerId={selectedPlayerId}
      onSelectPlayer={onSelectPlayer}
      paused={paused}
      className={className}
    />
  );
}

export default PitchRadarCanvas;
