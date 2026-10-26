import React, { useEffect, useRef, useCallback } from "react";
import { baseMemory } from "../store/baseMemory";
import { PITCH_LENGTH_METERS, PITCH_WIDTH_METERS } from "../types/telemetry";

export type CameraAngle = "overhead" | "pressing" | "attacking";

interface PitchRadarCanvasProps {
  showVelocityVectors?: boolean;
  showPassingLanes?: boolean;
  showPitchControl?: boolean;
  cameraAngle?: CameraAngle;
  viewEpoch?: number;
}

const safeRoundRect = (
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  if (width <= 0 || height <= 0) return;
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  if (c.roundRect && r > 0) {
    try {
      c.roundRect(x, y, width, height, r);
    } catch {
      c.rect(x, y, width, height);
    }
  } else {
    c.rect(x, y, width, height);
  }
};

export const PitchRadarCanvas: React.FC<PitchRadarCanvasProps> = ({
  showVelocityVectors = true,
  showPassingLanes = true,
  showPitchControl = true,
  cameraAngle = "overhead",
  viewEpoch = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fpsRef = useRef<{ frames: number; lastTime: number; fps: number }>({
    frames: 0,
    lastTime: 0,
    fps: 60,
  });
  const hoveredPlayerIdRef = useRef<string | null>(null);

  const drawFrame = useCallback(
    (time: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) return;

      // Ensure canvas bounding box is valid and visible
      const rect = canvas.getBoundingClientRect();
      if (!rect || rect.width < 10 || rect.height < 10) {
        return;
      }

      // FPS measurement
      fpsRef.current.frames++;
      if (time - fpsRef.current.lastTime >= 1000) {
        fpsRef.current.fps = Math.round(
          (fpsRef.current.frames * 1000) / Math.max(1, time - fpsRef.current.lastTime)
        );
        fpsRef.current.frames = 0;
        fpsRef.current.lastTime = time;
      }

      // Handle Device Pixel Ratio safely
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const displayW = Math.max(10, Math.floor(rect.width * dpr));
      const displayH = Math.max(10, Math.floor(rect.height * dpr));

      if (canvas.width !== displayW || canvas.height !== displayH) {
        canvas.width = displayW;
        canvas.height = displayH;
      }

      const w = canvas.width;
      const h = canvas.height;

      const padX = Math.max(10, 28 * dpr);
      const padY = Math.max(8, 20 * dpr);
      const pitchDrawW = w - padX * 2;
      const pitchDrawH = h - padY * 2;

      // Abort drawing if pitch drawing area is too constrained
      if (pitchDrawW < 20 || pitchDrawH < 20) {
        return;
      }

      let viewMinX = 0;
      let viewMaxX = PITCH_LENGTH_METERS;
      let viewMinY = 0;
      let viewMaxY = PITCH_WIDTH_METERS;

      if (cameraAngle === "pressing") {
        viewMinX = 26;
        viewMaxX = 78;
        viewMinY = 4;
        viewMaxY = 64;
      } else if (cameraAngle === "attacking") {
        viewMinX = 58;
        viewMaxX = 105;
        viewMinY = 6;
        viewMaxY = 62;
      }

      const viewW = Math.max(1, viewMaxX - viewMinX);
      const viewH = Math.max(1, viewMaxY - viewMinY);

      const scaleX = (x: number) => padX + ((x - viewMinX) / viewW) * pitchDrawW;
      const scaleY = (y: number) => padY + ((y - viewMinY) / viewH) * pitchDrawH;

      // Dark pitch background
      ctx.fillStyle = "#070c14";
      ctx.fillRect(0, 0, w, h);

      // Turf with clipping boundary
      ctx.save();
      ctx.beginPath();
      ctx.rect(padX, padY, pitchDrawW, pitchDrawH);
      ctx.clip();

      ctx.fillStyle = "#0b1422";
      ctx.fillRect(padX, padY, pitchDrawW, pitchDrawH);

      // Grass stripes
      const stripes = 10;
      const stripeW = pitchDrawW / stripes;
      if (stripeW > 0) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.015)";
        for (let i = 0; i < stripes; i += 2) {
          ctx.fillRect(padX + i * stripeW, padY, stripeW, pitchDrawH);
        }
      }

      // Pitch lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
      ctx.lineWidth = 1.5 * dpr;
      ctx.strokeRect(padX, padY, pitchDrawW, pitchDrawH);

      // Halfway line & center circle
      const midX = scaleX(PITCH_LENGTH_METERS / 2);
      const midY = scaleY(PITCH_WIDTH_METERS / 2);
      ctx.beginPath();
      ctx.moveTo(midX, padY);
      ctx.lineTo(midX, padY + pitchDrawH);
      ctx.stroke();

      const centerRadius = Math.max(0.5, (9.15 / PITCH_LENGTH_METERS) * pitchDrawW);
      ctx.beginPath();
      ctx.arc(midX, midY, centerRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Penalty boxes
      const penBoxDepth = Math.max(1, (16.5 / PITCH_LENGTH_METERS) * pitchDrawW);
      const penBoxYTop = scaleY((PITCH_WIDTH_METERS - 40.3) / 2);
      const penBoxH = Math.max(1, (40.3 / PITCH_WIDTH_METERS) * pitchDrawH);
      ctx.strokeRect(padX, penBoxYTop, penBoxDepth, penBoxH);
      ctx.strokeRect(padX + pitchDrawW - penBoxDepth, penBoxYTop, penBoxDepth, penBoxH);

      // Read latest frame directly from Single Base Memory
      const memory = baseMemory.getState();
      const frame = memory.currentFrame;
      const selectedPlayerId = memory.selectedPlayerId;

      if (frame) {
        // Dynamic Zonal Pitch Control (Stage 2)
        if (showPitchControl) {
          if (frame.pitchControlCells && frame.pitchControlCells.length > 0) {
            const cellW = pitchDrawW / 21;
            const cellH = pitchDrawH / 17;
            for (const cell of frame.pitchControlCells) {
              const cx = scaleX(cell.x) - cellW / 2;
              const cy = scaleY(cell.y) - cellH / 2;
              const score = cell.controlScore; // -1 to +1
              const strength = Math.min(0.28, Math.max(0.04, Math.abs(score) * 0.28));
              ctx.fillStyle = score > 0 ? `rgba(0, 229, 255, ${strength})` : `rgba(244, 63, 94, ${strength})`;
              ctx.fillRect(cx, cy, cellW + 0.5, cellH + 0.5);
            }
          } else if (frame.players && frame.players.length > 0) {
            const homePlayers = frame.players.filter((p) => p.team === "home");
            const awayPlayers = frame.players.filter((p) => p.team === "away");
            const cols = 14;
            const rows = 9;
            const cellW = pitchDrawW / cols;
            const cellH = pitchDrawH / rows;

            for (let c = 0; c < cols; c++) {
              const mx = (c + 0.5) * (PITCH_LENGTH_METERS / cols);
              for (let r = 0; r < rows; r++) {
                const my = (r + 0.5) * (PITCH_WIDTH_METERS / rows);

                let minHome = 999;
                for (const hp of homePlayers) {
                  const d = Math.hypot(hp.x - mx, hp.y - my);
                  if (d < minHome) minHome = d;
                }

                let minAway = 999;
                for (const ap of awayPlayers) {
                  const d = Math.hypot(ap.x - mx, ap.y - my);
                  if (d < minAway) minAway = d;
                }

                const diff = minAway - minHome;
                const strength = Math.min(0.24, Math.max(0.04, Math.abs(diff) / 30));

                ctx.fillStyle = diff > 0 ? `rgba(0, 229, 255, ${strength})` : `rgba(244, 63, 94, ${strength})`;
                ctx.fillRect(padX + c * cellW, padY + r * cellH, cellW, cellH);
              }
            }
          }
        }

        let carrier: { x: number; y: number } | null = null;
        for (const p of frame.players) {
          const isCarrier = p.is_ball_carrier || (p as any).onBall;
          if (isCarrier) {
            carrier = { x: scaleX(p.x), y: scaleY(p.y) };
            break;
          }
        }

        // Passing lanes
        if (showPassingLanes) {
          if (frame.passingLanes && frame.passingLanes.length > 0) {
            ctx.lineWidth = 1.2 * dpr;
            for (const lane of frame.passingLanes) {
              const alpha = Math.max(0.2, Math.min(0.85, 1 - (lane.interceptionRisk ?? 0.5)));
              ctx.strokeStyle = lane.isClear
                ? `rgba(0, 229, 255, ${alpha})`
                : `rgba(244, 63, 94, ${alpha * 0.7})`;
              ctx.setLineDash(lane.isClear ? [] : [3 * dpr, 3 * dpr]);
              ctx.beginPath();
              ctx.moveTo(scaleX(lane.passerPos.x), scaleY(lane.passerPos.y));
              ctx.lineTo(scaleX(lane.receiverPos.x), scaleY(lane.receiverPos.y));
              ctx.stroke();
              ctx.setLineDash([]);
            }
          } else if (carrier) {
            ctx.lineWidth = 1 * dpr;
            for (const p of frame.players) {
              const isCarrier = p.is_ball_carrier || (p as any).onBall;
              if (p.team === "home" && !isCarrier) {
                ctx.strokeStyle = "rgba(0, 229, 255, 0.25)";
                ctx.setLineDash([3 * dpr, 3 * dpr]);
                ctx.beginPath();
                ctx.moveTo(carrier.x, carrier.y);
                ctx.lineTo(scaleX(p.x), scaleY(p.y));
                ctx.stroke();
                ctx.setLineDash([]);
              }
            }
          }
        }

        // Draw players with clean, un-cluttered dot proportions
        let selectedPlayerData: {
          p: any;
          px: number;
          py: number;
          isHome: boolean;
          radius: number;
          shirtNum: number;
          speed: number;
        } | null = null;

        let hoveredPlayerData: {
          p: any;
          px: number;
          py: number;
          isHome: boolean;
          radius: number;
          shirtNum: number;
        } | null = null;

        for (const p of frame.players) {
          const px = scaleX(p.x);
          const py = scaleY(p.y);
          if (!Number.isFinite(px) || !Number.isFinite(py)) continue;

          const pid = p.player_id || p.id || "";
          const isHome = p.team === "home";
          const isSelected = selectedPlayerId === pid || selectedPlayerId === p.id || selectedPlayerId === p.player_id;
          const isHovered = !isSelected && hoveredPlayerIdRef.current === pid;
          // Refined dot sizes: normal 4.8dpr, selected 6.2dpr
          const radius = Math.max(1, (isSelected ? 6.2 : 4.8) * dpr);
          const shirtNum = p.shirt_number ?? (p as any).number ?? 0;
          const speed = p.speed_kmh ?? (p as any).speedKmH ?? ((p as any).velocity_mps ? (p as any).velocity_mps * 3.6 : 14.2);
          const vel = p.velocity_mps ?? (speed ? speed / 3.6 : 0);
          const heading = p.heading_deg ?? 0;

          if (isSelected) {
            selectedPlayerData = { p, px, py, isHome, radius, shirtNum, speed };
            // Team accent aura + crisp outer white rim (ZERO yellow on players)
            ctx.beginPath();
            ctx.arc(px, py, radius + 3.2 * dpr, 0, Math.PI * 2);
            ctx.strokeStyle = isHome ? "#00e5ff" : "#f43f5e";
            ctx.lineWidth = 1.8 * dpr;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(px, py, radius + 5.0 * dpr, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
            ctx.lineWidth = 0.9 * dpr;
            ctx.stroke();
          } else if (isHovered) {
            hoveredPlayerData = { p, px, py, isHome, radius, shirtNum };
            // Subtle temporary hover ring
            ctx.beginPath();
            ctx.arc(px, py, radius + 2.8 * dpr, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
            ctx.lineWidth = 1.2 * dpr;
            ctx.stroke();
          }

          // Player dot body
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fillStyle = isHome ? "#00e5ff" : "#f43f5e";
          ctx.shadowColor = isHome ? "rgba(0, 229, 255, 0.4)" : "rgba(244, 63, 94, 0.4)";
          ctx.shadowBlur = 4 * dpr;
          ctx.fill();
          ctx.shadowBlur = 0;

          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 0.9 * dpr;
          ctx.stroke();

          // Shirt number (crisp & legible inside dot)
          ctx.fillStyle = "#ffffff";
          ctx.font = `900 ${Math.round(5.5 * dpr)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`${shirtNum}`, px, py);

          // Velocity vector line
          if (showVelocityVectors && vel > 0.5) {
            const rad = (heading * Math.PI) / 180;
            const vecLen = Math.min(14, vel * 2.2) * dpr;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px + Math.cos(rad) * vecLen, py + Math.sin(rad) * vecLen);
            ctx.strokeStyle = isHome ? "rgba(0, 229, 255, 0.65)" : "rgba(244, 63, 94, 0.65)";
            ctx.lineWidth = 1.1 * dpr;
            ctx.stroke();
          }
        }

        // Draw temporary hovered player tooltip (if hovered and not selected)
        if (hoveredPlayerData) {
          const { p, px, py, radius, shirtNum } = hoveredPlayerData;
          const hoverTag = `${p.name} (#${shirtNum})`;
          ctx.font = `600 ${Math.round(6.8 * dpr)}px sans-serif`;
          const textMetrics = ctx.measureText(hoverTag);
          const tagW = textMetrics.width + 10 * dpr;
          const tagH = 13 * dpr;
          const placeBelow = py - padY < 28 * dpr;
          const tagX = Math.max(padX + 2 * dpr, Math.min(padX + pitchDrawW - tagW - 2 * dpr, px - tagW / 2));
          const tagY = placeBelow ? py + radius + 5 * dpr : py - radius - tagH - 5 * dpr;

          ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
          ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
          ctx.lineWidth = 0.8 * dpr;
          ctx.beginPath();
          safeRoundRect(ctx, tagX, tagY, tagW, tagH, 3 * dpr);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(hoverTag, tagX + tagW / 2, tagY + tagH / 2);
        }

        // Draw selected player floating tag LAST (on top of all players so it never gets clipped, with smart orientation)
        if (selectedPlayerData) {
          const { p, px, py, isHome, radius, shirtNum, speed } = selectedPlayerData;
          const nameTag = `${p.name} (#${shirtNum}) • ${speed.toFixed(1)} km/h`;
          ctx.font = `bold ${Math.round(7.5 * dpr)}px sans-serif`;
          const textMetrics = ctx.measureText(nameTag);
          const tagW = textMetrics.width + 12 * dpr;
          const tagH = 15 * dpr;

          // Smart placement: if player is near top of pitch, place tag BELOW the dot to prevent overlapping/clipping
          const placeBelow = py - padY < 32 * dpr;
          const tagX = Math.max(padX + 2 * dpr, Math.min(padX + pitchDrawW - tagW - 2 * dpr, px - tagW / 2));
          const tagY = placeBelow ? py + radius + 7 * dpr : py - radius - tagH - 7 * dpr;

          // Pointer tick line connecting dot to tag
          ctx.beginPath();
          ctx.moveTo(px, placeBelow ? py + radius + 1 * dpr : py - radius - 1 * dpr);
          ctx.lineTo(px, placeBelow ? tagY : tagY + tagH);
          ctx.strokeStyle = isHome ? "#00e5ff" : "#f43f5e";
          ctx.lineWidth = 1 * dpr;
          ctx.stroke();

          // Tag Pill
          ctx.fillStyle = "rgba(11, 18, 32, 0.95)";
          ctx.strokeStyle = isHome ? "#00e5ff" : "#f43f5e";
          ctx.lineWidth = 1 * dpr;
          ctx.beginPath();
          safeRoundRect(ctx, tagX, tagY, tagW, tagH, 4 * dpr);
          ctx.fill();
          ctx.stroke();

          // Tag Text
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(nameTag, tagX + tagW / 2, tagY + tagH / 2);
        }

        // Ball - Gold `#ffd600` strictly reserved for the ball
        if (frame.ball) {
          const bx = scaleX(frame.ball.x);
          const by = scaleY(frame.ball.y);
          if (Number.isFinite(bx) && Number.isFinite(by)) {
            ctx.beginPath();
            ctx.arc(bx, by, Math.max(1, 6 * dpr), 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255, 214, 0, 0.25)";
            ctx.fill();

            ctx.beginPath();
            ctx.arc(bx, by, Math.max(1, 3.8 * dpr), 0, Math.PI * 2);
            ctx.fillStyle = "#ffd600";
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1 * dpr;
            ctx.stroke();
          }
        }
      }

      ctx.restore();

      // Pitch Legend: Compact, high-clarity telemetry strip at bottom center
      const legW = Math.min(pitchDrawW - 16 * dpr, 350 * dpr);
      const legH = 17 * dpr;
      const legX = padX + (pitchDrawW - legW) / 2;
      const legY = padY + pitchDrawH - legH - 4 * dpr;

      ctx.fillStyle = "rgba(7, 12, 20, 0.88)";
      ctx.beginPath();
      safeRoundRect(ctx, legX, legY, legW, legH, 4 * dpr);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 0.8 * dpr;
      ctx.stroke();

      ctx.font = `600 ${Math.round(6.5 * dpr)}px sans-serif`;
      ctx.textBaseline = "middle";
      const itemY = legY + legH / 2;

      let curX = legX + 8 * dpr;
      // 1. Man City control
      ctx.fillStyle = "rgba(0, 229, 255, 0.75)";
      ctx.fillRect(curX, itemY - 3 * dpr, 6 * dpr, 6 * dpr);
      curX += 8 * dpr;
      ctx.fillStyle = "#cbd5e1";
      ctx.textAlign = "left";
      ctx.fillText("MCI Dominance", curX, itemY);
      curX += 60 * dpr;

      // 2. Arsenal control
      ctx.fillStyle = "rgba(244, 63, 94, 0.75)";
      ctx.fillRect(curX, itemY - 3 * dpr, 6 * dpr, 6 * dpr);
      curX += 8 * dpr;
      ctx.fillStyle = "#cbd5e1";
      ctx.fillText("ARS Dominance", curX, itemY);
      curX += 60 * dpr;

      // 3. Movement Vector
      ctx.strokeStyle = "rgba(0, 229, 255, 0.85)";
      ctx.lineWidth = 1.2 * dpr;
      ctx.beginPath();
      ctx.moveTo(curX, itemY);
      ctx.lineTo(curX + 10 * dpr, itemY);
      ctx.stroke();
      curX += 13 * dpr;
      ctx.fillStyle = "#cbd5e1";
      ctx.fillText("Movement", curX, itemY);
      curX += 48 * dpr;

      // 4. Passing Lane
      ctx.strokeStyle = "rgba(0, 229, 255, 0.6)";
      ctx.setLineDash([2 * dpr, 2 * dpr]);
      ctx.beginPath();
      ctx.moveTo(curX, itemY);
      ctx.lineTo(curX + 10 * dpr, itemY);
      ctx.stroke();
      ctx.setLineDash([]);
      curX += 13 * dpr;
      ctx.fillStyle = "#cbd5e1";
      ctx.fillText("Passing Lane", curX, itemY);
      curX += 54 * dpr;

      // 5. Ball
      ctx.fillStyle = "#ffd600";
      ctx.beginPath();
      ctx.arc(curX + 3 * dpr, itemY, 2.5 * dpr, 0, Math.PI * 2);
      ctx.fill();
      curX += 8 * dpr;
      ctx.fillStyle = "#ffd600";
      ctx.fillText("Ball", curX, itemY);

      // Top-Left: Render FPS Badge (Single dedicated role)
      const badgeText = `Renderer: ${fpsRef.current.fps} FPS`;
      ctx.font = `bold ${Math.round(8 * dpr)}px monospace`;
      const textMetrics = ctx.measureText(badgeText);
      const fpsW = textMetrics.width + 12 * dpr;
      const fpsH = 17 * dpr;
      const fpsX = padX + 5 * dpr;
      const fpsY = padY + 5 * dpr;

      ctx.fillStyle = "rgba(7, 12, 20, 0.88)";
      ctx.beginPath();
      safeRoundRect(ctx, fpsX, fpsY, fpsW, fpsH, 4 * dpr);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1 * dpr;
      ctx.stroke();

      ctx.fillStyle = "#10b981";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(badgeText, fpsX + fpsW / 2, fpsY + fpsH / 2);
    },
    [showVelocityVectors, showPassingLanes, showPitchControl, cameraAngle]
  );

  useEffect(() => {
    fpsRef.current.lastTime = performance.now();
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId: number = 0;
    let isCancelled = false;

    const render = (time: number) => {
      if (isCancelled) return;

      try {
        drawFrame(time);
      } catch (err) {
        console.warn("PitchRadarCanvas render error:", err);
      } finally {
        if (!isCancelled) {
          animId = requestAnimationFrame(render);
        }
      }
    };

    animId = requestAnimationFrame(render);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        if (!isCancelled) {
          render(performance.now());
        }
      });
      resizeObserver.observe(canvas);
      if (canvas.parentElement) {
        resizeObserver.observe(canvas.parentElement);
      }
    }

    const handleWakeup = () => {
      if (!isCancelled) {
        render(performance.now());
      }
    };

    document.addEventListener("visibilitychange", handleWakeup);
    window.addEventListener("focus", handleWakeup);
    window.addEventListener("resize", handleWakeup);

    return () => {
      isCancelled = true;
      if (animId) cancelAnimationFrame(animId);
      if (resizeObserver) resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", handleWakeup);
      window.removeEventListener("focus", handleWakeup);
      window.removeEventListener("resize", handleWakeup);
    };
  }, [drawFrame, viewEpoch]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    drawFrame(performance.now());

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const padX = 28;
    const padY = 20;
    const pitchDrawW = rect.width - padX * 2;
    const pitchDrawH = rect.height - padY * 2;

    if (pitchDrawW <= 0 || pitchDrawH <= 0) return;

    let viewMinX = 0;
    let viewMaxX = PITCH_LENGTH_METERS;
    let viewMinY = 0;
    let viewMaxY = PITCH_WIDTH_METERS;

    if (cameraAngle === "pressing") {
      viewMinX = 26;
      viewMaxX = 78;
      viewMinY = 4;
      viewMaxY = 64;
    } else if (cameraAngle === "attacking") {
      viewMinX = 58;
      viewMaxX = 105;
      viewMinY = 6;
      viewMaxY = 62;
    }

    const viewW = Math.max(1, viewMaxX - viewMinX);
    const viewH = Math.max(1, viewMaxY - viewMinY);

    const pitchX = viewMinX + ((clickX - padX) / pitchDrawW) * viewW;
    const pitchY = viewMinY + ((clickY - padY) / pitchDrawH) * viewH;

    const frame = baseMemory.getState().currentFrame;
    if (!frame || !frame.players) return;

    let closest: { id: string; dist: number } | null = null;
    for (const p of frame.players) {
      const d = Math.hypot(p.x - pitchX, p.y - pitchY);
      if (d < 4.0 && (!closest || d < closest.dist)) {
        const id = p.player_id || p.id || "";
        closest = { id, dist: d };
      }
    }

    if (closest && closest.id) {
      baseMemory.setSelectedPlayer(closest.id);
      hoveredPlayerIdRef.current = null;
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const moveX = e.clientX - rect.left;
    const moveY = e.clientY - rect.top;

    const padX = 28;
    const padY = 20;
    const pitchDrawW = rect.width - padX * 2;
    const pitchDrawH = rect.height - padY * 2;
    if (pitchDrawW <= 0 || pitchDrawH <= 0) return;

    let viewMinX = 0;
    let viewMaxX = PITCH_LENGTH_METERS;
    let viewMinY = 0;
    let viewMaxY = PITCH_WIDTH_METERS;

    if (cameraAngle === "pressing") {
      viewMinX = 26;
      viewMaxX = 78;
      viewMinY = 4;
      viewMaxY = 64;
    } else if (cameraAngle === "attacking") {
      viewMinX = 58;
      viewMaxX = 105;
      viewMinY = 6;
      viewMaxY = 62;
    }

    const viewW = Math.max(1, viewMaxX - viewMinX);
    const viewH = Math.max(1, viewMaxY - viewMinY);
    const pitchX = viewMinX + ((moveX - padX) / pitchDrawW) * viewW;
    const pitchY = viewMinY + ((moveY - padY) / pitchDrawH) * viewH;

    const frame = baseMemory.getState().currentFrame;
    if (!frame || !frame.players) {
      hoveredPlayerIdRef.current = null;
      return;
    }

    let closestId: string | null = null;
    let closestDist = 3.6;
    for (const p of frame.players) {
      const d = Math.hypot(p.x - pitchX, p.y - pitchY);
      if (d < closestDist) {
        closestDist = d;
        closestId = p.player_id || p.id || "";
      }
    }
    hoveredPlayerIdRef.current = closestId;
  };

  const handleCanvasPointerLeave = () => {
    hoveredPlayerIdRef.current = null;
  };

  return (
    <div className="radar-container" style={{ width: "100%", aspectRatio: "105/68", position: "relative" }}>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onPointerMove={handleCanvasPointerMove}
        onPointerLeave={handleCanvasPointerLeave}
        style={{ width: "100%", height: "100%", display: "block", cursor: "pointer", touchAction: "pan-y" }}
        title="Click on any player to spotlight across studio"
      />
    </div>
  );
};
