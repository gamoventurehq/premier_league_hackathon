'use client';

/**
 * The live pitch renderer.
 *
 * One `<canvas>` draws the whole match moment: the pitch markings, all 22
 * players in their team colours, the ball, the passing lanes and — when it
 * is switched on — the Pitch Control surface. Everything it draws comes from
 * the frame on screen, so the canvas is a view of the simulation and never a
 * second, drifting copy of it.
 *
 * Rendering rules that matter:
 *
 *  - The canvas is sized in CSS pixels and scaled by `devicePixelRatio`, so
 *    the drawing is crisp on a retina display rather than soft.
 *  - The frame is published at 5Hz but the canvas runs at 60FPS: the scene
 *    is interpolated between the last two frames, so motion is smooth
 *    without the data ever being invented.
 *  - `prefers-reduced-motion` is honoured. When it is set, the canvas draws
 *    once per frame change and never animates continuously.
 *  - The animation frame is cancelled on unmount, and when the view is
 *    paused, so nothing is left running in the background.
 *
 * The canvas is a picture, so it carries an accessible name and is
 * described by the textual player list rendered alongside it.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlayerTelemetry, TelemetryFrame } from '../../types/telemetry';
import { PITCH_LENGTH, PITCH_WIDTH } from '../../lib/pitch';
import { CONTROL_CELL_X, CONTROL_CELL_Y } from '../../lib/spatial';
import { cn } from '../../lib/cn';

/* ------------------------------------------------------------------ */
/* Pitch geometry, in metres                                           */
/* ------------------------------------------------------------------ */

const CENTRE_CIRCLE_RADIUS = 9.15;
const PENALTY_AREA_DEPTH = 16.5;
const PENALTY_AREA_WIDTH = 40.32;
const GOAL_AREA_DEPTH = 5.5;
const GOAL_AREA_WIDTH = 18.32;
const GOAL_WIDTH = 7.32;
const GOAL_DEPTH = 2;
const PENALTY_SPOT = 11;
const PITCH_MARGIN = 10;

/** How long the scene takes to travel from the previous frame to the new one. */
const INTERPOLATION_MS = 220;

/**
 * Fallbacks for the theme tokens, used when the stylesheet has not been read
 * (server rendering) so the canvas never draws an undefined colour.
 */
const TOKEN_FALLBACK: Record<string, string> = {
  '--studio-home': '#22d3ee',
  '--studio-away': '#f43f5e',
  '--studio-accent': '#8b5cf6',
  '--studio-accent-2': '#22d3ee',
  '--studio-accent-3': '#f43f5e',
  '--studio-caution': '#ffd60a',
  '--studio-positive': '#30d158',
};

/** The turf is not a theme token — it is the pitch itself. */
const TURF_BASE = 'rgba(4, 26, 17, 0.96)';
const TURF_STRIPE = 'rgba(255, 255, 255, 0.022)';
const MARKING = 'rgba(255, 255, 255, 0.26)';
const MARKING_FAINT = 'rgba(255, 255, 255, 0.16)';

function readTokens(): Record<string, string> {
  if (typeof document === 'undefined') return { ...TOKEN_FALLBACK };
  const computed = getComputedStyle(document.documentElement);
  const tokens: Record<string, string> = { ...TOKEN_FALLBACK };
  for (const key of Object.keys(TOKEN_FALLBACK)) {
    const value = computed.getPropertyValue(key).trim();
    if (value) tokens[key] = value;
  }
  return tokens;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

export interface LivePitchCanvasProps {
  frame: TelemetryFrame | null;
  /** Draw the Pitch Control surface as a cell grid under the players. */
  showControlSurface?: boolean;
  /** Draw the passing lanes currently available to the ball carrier. */
  showPassingLanes?: boolean;
  /** Draw the velocity vector of every player. */
  showSpeedVectors?: boolean;
  /** Highlight the player the studio is tracking. */
  selectedPlayerId?: string | null;
  onSelectPlayer?: (playerId: string) => void;
  /** Stop the animation. The last frame stays on the canvas. */
  paused?: boolean;
  className?: string;
}

interface LayerOptions {
  showControlSurface: boolean;
  showPassingLanes: boolean;
  showSpeedVectors: boolean;
  selectedPlayerId: string | null;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function LivePitchCanvas({
  frame,
  showControlSurface = false,
  showPassingLanes = true,
  showSpeedVectors = false,
  selectedPlayerId = null,
  onSelectPlayer,
  paused = false,
  className,
}: LivePitchCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const optionsRef = useRef<LayerOptions>({
    showControlSurface,
    showPassingLanes,
    showSpeedVectors,
    selectedPlayerId,
  });
  optionsRef.current = {
    showControlSurface,
    showPassingLanes,
    showSpeedVectors,
    selectedPlayerId,
  };

  /** The frame on screen, and the one before it, for interpolation. */
  const currentRef = useRef<TelemetryFrame | null>(null);
  const previousRef = useRef<TelemetryFrame | null>(null);
  const arrivedAtRef = useRef(0);

  const sizeRef = useRef({ width: 0, height: 0 });
  const dprRef = useRef(1);
  const tokenRef = useRef<Record<string, string>>({ ...TOKEN_FALLBACK });
  const tokenReadAtRef = useRef(0);

  const [reducedMotion, setReducedMotion] = useState(false);

  /* ---------------------------------------------------------------- */
  /* Drawing                                                           */
  /* ---------------------------------------------------------------- */

  const draw = useCallback((now?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = sizeRef.current;
    if (width <= 0 || height <= 0) return;

    // The theme can change under us; re-read the tokens at most twice a
    // second rather than on every frame.
    const stamp = now ?? performance.now();
    if (stamp - tokenReadAtRef.current > 500) {
      tokenRef.current = readTokens();
      tokenReadAtRef.current = stamp;
    }
    const tokens = tokenRef.current;

    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const margin = PITCH_MARGIN;
    const scale = Math.min(
      (width - margin * 2) / PITCH_LENGTH,
      (height - margin * 2) / PITCH_WIDTH,
    );
    const originX = (width - PITCH_LENGTH * scale) / 2;
    const originY = (height - PITCH_WIDTH * scale) / 2;
    const X = (metres: number) => originX + metres * scale;
    const Y = (metres: number) => originY + metres * scale;

    const current = currentRef.current;
    const previous = previousRef.current;

    let mix = 1;
    if (previous && current && arrivedAtRef.current > 0) {
      mix = clamp01((stamp - arrivedAtRef.current) / INTERPOLATION_MS);
    }

    const previousPlayers = new Map<string, PlayerTelemetry>();
    if (previous) {
      for (const player of previous.players) previousPlayers.set(player.id, player);
    }

    const positionOf = (player: PlayerTelemetry): { x: number; y: number } => {
      const before = previousPlayers.get(player.id);
      if (!before) return { x: player.x, y: player.y };
      return {
        x: lerp(before.x, player.x, mix),
        y: lerp(before.y, player.y, mix),
      };
    };

    /* ---------------------------------------------------------- */
    /* Turf                                                        */
    /* ---------------------------------------------------------- */

    ctx.fillStyle = TURF_BASE;
    ctx.fillRect(originX, originY, PITCH_LENGTH * scale, PITCH_WIDTH * scale);

    ctx.fillStyle = TURF_STRIPE;
    const stripes = 10;
    const stripeWidth = (PITCH_LENGTH * scale) / stripes;
    for (let i = 0; i < stripes; i += 2) {
      ctx.fillRect(originX + i * stripeWidth, originY, stripeWidth, PITCH_WIDTH * scale);
    }

    /* ---------------------------------------------------------- */
    /* Markings                                                    */
    /* ---------------------------------------------------------- */

    ctx.strokeStyle = MARKING;
    ctx.lineWidth = 1.2;

    // Touchlines.
    ctx.strokeRect(originX, originY, PITCH_LENGTH * scale, PITCH_WIDTH * scale);

    // Half-way line.
    ctx.beginPath();
    ctx.moveTo(X(PITCH_LENGTH / 2), Y(0));
    ctx.lineTo(X(PITCH_LENGTH / 2), Y(PITCH_WIDTH));
    ctx.stroke();

    // Centre circle and centre spot.
    ctx.beginPath();
    ctx.arc(X(PITCH_LENGTH / 2), Y(PITCH_WIDTH / 2), CENTRE_CIRCLE_RADIUS * scale, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = MARKING;
    ctx.beginPath();
    ctx.arc(X(PITCH_LENGTH / 2), Y(PITCH_WIDTH / 2), Math.max(1.5, 0.3 * scale), 0, Math.PI * 2);
    ctx.fill();

    // Penalty areas and goal areas.
    const penaltyTop = (PITCH_WIDTH - PENALTY_AREA_WIDTH) / 2;
    const goalAreaTop = (PITCH_WIDTH - GOAL_AREA_WIDTH) / 2;
    const goalTop = (PITCH_WIDTH - GOAL_WIDTH) / 2;

    ctx.strokeRect(X(0), Y(penaltyTop), PENALTY_AREA_DEPTH * scale, PENALTY_AREA_WIDTH * scale);
    ctx.strokeRect(
      X(PITCH_LENGTH - PENALTY_AREA_DEPTH),
      Y(penaltyTop),
      PENALTY_AREA_DEPTH * scale,
      PENALTY_AREA_WIDTH * scale,
    );
    ctx.strokeStyle = MARKING_FAINT;
    ctx.strokeRect(X(0), Y(goalAreaTop), GOAL_AREA_DEPTH * scale, GOAL_AREA_WIDTH * scale);
    ctx.strokeRect(
      X(PITCH_LENGTH - GOAL_AREA_DEPTH),
      Y(goalAreaTop),
      GOAL_AREA_DEPTH * scale,
      GOAL_AREA_WIDTH * scale,
    );

    // Penalty spots.
    ctx.fillStyle = MARKING;
    for (const spotX of [PENALTY_SPOT, PITCH_LENGTH - PENALTY_SPOT]) {
      ctx.beginPath();
      ctx.arc(X(spotX), Y(PITCH_WIDTH / 2), Math.max(1.5, 0.3 * scale), 0, Math.PI * 2);
      ctx.fill();
    }

    // Goals.
    ctx.strokeStyle = MARKING;
    ctx.strokeRect(
      X(-GOAL_DEPTH),
      Y(goalTop),
      GOAL_DEPTH * scale,
      GOAL_WIDTH * scale,
    );
    ctx.strokeRect(
      X(PITCH_LENGTH),
      Y(goalTop),
      GOAL_DEPTH * scale,
      GOAL_WIDTH * scale,
    );

    if (!current) return;

    const options = optionsRef.current;

    /* ---------------------------------------------------------- */
    /* Pitch Control surface                                       */
    /* ---------------------------------------------------------- */

    if (options.showControlSurface && current.pitchControlCells.length > 0) {
      for (const cell of current.pitchControlCells) {
        const magnitude = Math.abs(cell.controlScore);
        if (magnitude < 0.04) continue;
        ctx.globalAlpha = 0.08 + magnitude * 0.42;
        ctx.fillStyle =
          cell.controlScore > 0 ? tokens['--studio-home'] : tokens['--studio-away'];
        ctx.fillRect(
          X(cell.x - CONTROL_CELL_X / 2),
          Y(cell.y - CONTROL_CELL_Y / 2),
          CONTROL_CELL_X * scale,
          CONTROL_CELL_Y * scale,
        );
      }
      ctx.globalAlpha = 1;
    }

    /* ---------------------------------------------------------- */
    /* Passing lanes                                               */
    /* ---------------------------------------------------------- */

    if (options.showPassingLanes) {
      const previousLanes = new Map<string, (typeof current.passingLanes)[number]>();
      if (previous) {
        for (const lane of previous.passingLanes) {
          previousLanes.set(`${lane.passerId}>${lane.receiverId}`, lane);
        }
      }

      for (const lane of current.passingLanes) {
        const before = previousLanes.get(`${lane.passerId}>${lane.receiverId}`);
        const start = before
          ? {
              x: lerp(before.passerPos.x, lane.passerPos.x, mix),
              y: lerp(before.passerPos.y, lane.passerPos.y, mix),
            }
          : lane.passerPos;
        const end = before
          ? {
              x: lerp(before.receiverPos.x, lane.receiverPos.x, mix),
              y: lerp(before.receiverPos.y, lane.receiverPos.y, mix),
            }
          : lane.receiverPos;

        if (lane.isClear) {
          ctx.strokeStyle = tokens['--studio-positive'];
          ctx.globalAlpha = 0.8;
          ctx.lineWidth = 2;
        } else if (lane.interceptionRisk > 0.66) {
          ctx.strokeStyle = tokens['--studio-accent-3'];
          ctx.globalAlpha = 0.55 + lane.interceptionRisk * 0.35;
          ctx.lineWidth = 1.2;
        } else {
          ctx.strokeStyle = tokens['--studio-caution'];
          ctx.globalAlpha = 0.45 + lane.interceptionRisk * 0.35;
          ctx.lineWidth = 1.4;
        }

        ctx.beginPath();
        ctx.moveTo(X(start.x), Y(start.y));
        ctx.lineTo(X(end.x), Y(end.y));
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    /* ---------------------------------------------------------- */
    /* Players                                                     */
    /* ---------------------------------------------------------- */

    const radius = Math.max(4, 0.95 * scale);
    const carrier = current.players.find((player) => player.onBall);

    for (const player of current.players) {
      const point = positionOf(player);
      const px = X(point.x);
      const py = Y(point.y);
      const isSelected = player.id === options.selectedPlayerId;
      const isCarrier = carrier?.id === player.id;

      // Velocity vector.
      if (options.showSpeedVectors && (player.vx !== 0 || player.vy !== 0)) {
        ctx.strokeStyle =
          player.team === 'home' ? tokens['--studio-home'] : tokens['--studio-away'];
        ctx.globalAlpha = 0.45;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + player.vx * 1.3 * scale, py + player.vy * 1.3 * scale);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      if (isSelected) {
        ctx.strokeStyle = tokens['--studio-accent'];
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, radius + 5, 0, Math.PI * 2);
        ctx.stroke();
      }

      // The ball carrier is ringed so the eye finds the ball instantly.
      if (isCarrier) {
        ctx.strokeStyle = tokens['--studio-accent-2'];
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(px, py, radius + 2.5, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fillStyle =
        player.team === 'home' ? tokens['--studio-home'] : tokens['--studio-away'];
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.3;
      ctx.stroke();

      if (radius >= 6) {
        ctx.fillStyle = '#0b0f14';
        ctx.font = `700 ${Math.round(radius * 0.95)}px ui-sans-serif, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(player.number), px, py);
      }
    }

    /* ---------------------------------------------------------- */
    /* Ball                                                        */
    /* ---------------------------------------------------------- */

    const ballX = previous ? lerp(previous.ball.x, current.ball.x, mix) : current.ball.x;
    const ballY = previous ? lerp(previous.ball.y, current.ball.y, mix) : current.ball.y;
    const ballRadius = Math.max(2.5, 0.45 * scale);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(
      X(ballX) + 1.5,
      Y(ballY) + 1.5,
      ballRadius,
      ballRadius * 0.7,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    ctx.beginPath();
    ctx.arc(X(ballX), Y(ballY), ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = tokens['--studio-caution'];
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }, []);

  /* ---------------------------------------------------------------- */
  /* Frame changes                                                    */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (frame === currentRef.current) return;
    previousRef.current = currentRef.current;
    currentRef.current = frame;
    arrivedAtRef.current = performance.now();
    // A static redraw keeps the canvas in step with the frame when the
    // animation loop is not running.
    draw(performance.now());
  }, [frame, draw]);

  /* ---------------------------------------------------------------- */
  /* Sizing                                                            */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width <= 0 || height <= 0) return;
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      dprRef.current = dpr;
      sizeRef.current = { width, height };
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      draw(performance.now());
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [draw]);

  /* ---------------------------------------------------------------- */
  /* Motion preference                                                 */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  /* ---------------------------------------------------------------- */
  /* Animation                                                         */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (paused || reducedMotion) {
      draw(performance.now());
      return;
    }

    let handle = 0;
    const loop = (now: number) => {
      draw(now);
      handle = requestAnimationFrame(loop);
    };
    handle = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(handle);
  }, [paused, reducedMotion, draw]);

  /* ---------------------------------------------------------------- */
  /* Selection                                                         */
  /* ---------------------------------------------------------------- */

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const current = currentRef.current;
      if (!canvas || !current || !onSelectPlayer) return;

      const rect = canvas.getBoundingClientRect();
      const { width, height } = sizeRef.current;
      if (width <= 0 || height <= 0) return;

      const margin = PITCH_MARGIN;
      const scale = Math.min(
        (width - margin * 2) / PITCH_LENGTH,
        (height - margin * 2) / PITCH_WIDTH,
      );
      const originX = (width - PITCH_LENGTH * scale) / 2;
      const originY = (height - PITCH_WIDTH * scale) / 2;

      const metresX = (event.clientX - rect.left - originX) / scale;
      const metresY = (event.clientY - rect.top - originY) / scale;

      let closest: PlayerTelemetry | null = null;
      let closestDistance = Number.POSITIVE_INFINITY;
      for (const player of current.players) {
        const distance = Math.hypot(player.x - metresX, player.y - metresY);
        if (distance < closestDistance) {
          closestDistance = distance;
          closest = player;
        }
      }

      if (closest && closestDistance < 2.5) {
        onSelectPlayer(closest.id);
      }
    },
    [onSelectPlayer],
  );

  const homeCount = frame?.players.filter((p) => p.team === 'home').length ?? 0;
  const awayCount = frame?.players.filter((p) => p.team === 'away').length ?? 0;
  const description = frame
    ? `Live pitch rendering. ${homeCount} home players, ${awayCount} away players, ball at ${frame.ball.x.toFixed(0)} by ${frame.ball.y.toFixed(0)} metres. Pitch Control ${frame.metrics.pitchControl.home}% home, ${frame.metrics.pitchControl.away}% away.`
    : 'Live pitch rendering. Waiting for the first telemetry frame.';

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full overflow-hidden rounded-2xl border border-line bg-deep-surface',
        className,
      )}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={description}
        aria-describedby="live-pitch-player-list"
        onPointerDown={handlePointerDown}
        className="block w-full cursor-pointer aspect-[105/68]"
      />
    </div>
  );
}

export default LivePitchCanvas;

/* ------------------------------------------------------------------ */
/* Text alternative                                                    */
/* ------------------------------------------------------------------ */

/**
 * The same moment, in words. The canvas is a picture of the pitch; this is
 * the same information as a table, so the page is fully usable without it.
 */
export function PlayerPositionList({
  frame,
  className,
}: {
  frame: TelemetryFrame | null;
  className?: string;
}) {
  if (!frame) {
    return (
      <p className={cn('text-[12px] text-ink-muted', className)}>
        No telemetry frame yet — the player positions appear with the first
        published frame.
      </p>
    );
  }

  const rows = [...frame.players].sort((a, b) => {
    if (a.team !== b.team) return a.team === 'home' ? -1 : 1;
    return a.number - b.number;
  });

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">
          Every player on the pitch, with their position and current speed.
        </caption>
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="py-1.5 pr-3 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted">
              Player
            </th>
            <th scope="col" className="py-1.5 pr-3 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted">
              Position
            </th>
            <th scope="col" className="py-1.5 pr-3 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted">
              Role
            </th>
            <th scope="col" className="py-1.5 pr-3 text-right text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted">
              x
            </th>
            <th scope="col" className="py-1.5 pr-3 text-right text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted">
              y
            </th>
            <th scope="col" className="py-1.5 text-right text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted">
              Speed
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((player) => (
            <tr
              key={player.id}
              className="border-b border-line/60 last:border-b-0"
            >
              <td className="py-1.5 pr-3 text-[12px] text-ink">
                <span
                  className={cn(
                    'mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle',
                    player.team === 'home' ? 'bg-home' : 'bg-away',
                  )}
                  aria-hidden
                />
                {player.number} {player.name}
                {player.onBall ? (
                  <span className="ml-1.5 text-[10px] uppercase tracking-[0.12em] text-accent">
                    ball
                  </span>
                ) : null}
              </td>
              <td className="py-1.5 pr-3 text-[12px] tabular-nums text-ink-strong">
                {player.position}
              </td>
              <td className="py-1.5 pr-3 text-[12px] text-ink-muted">{player.role}</td>
              <td className="py-1.5 pr-3 text-right text-[12px] tabular-nums text-ink-strong">
                {player.x.toFixed(1)} m
              </td>
              <td className="py-1.5 pr-3 text-right text-[12px] tabular-nums text-ink-strong">
                {player.y.toFixed(1)} m
              </td>
              <td className="py-1.5 text-right text-[12px] tabular-nums text-ink-strong">
                {player.speedKmH.toFixed(1)} km/h
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
