import React, { useEffect, useRef } from "react";
import { baseMemory } from "../store/baseMemory";
import { PITCH_LENGTH_METERS, PITCH_WIDTH_METERS } from "../types/telemetry";

export type CameraAngle = "overhead" | "pressing" | "attacking";

interface PitchRadarCanvasProps {
  showVelocityVectors?: boolean;
  showPassingLanes?: boolean;
  showPitchControl?: boolean;
  cameraAngle?: CameraAngle;
}

export const PitchRadarCanvas: React.FC<PitchRadarCanvasProps> = ({
  showVelocityVectors = true,
  showPassingLanes = true,
  showPitchControl = true,
  cameraAngle = "overhead",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fpsRef = useRef<{ frames: number; lastTime: number; fps: number }>({
    frames: 0,
    lastTime: 0,
    fps: 60,
  });

  useEffect(() => {
    fpsRef.current.lastTime = performance.now();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let animId: number;

    const render = (time: number) => {
      // FPS measurement
      fpsRef.current.frames++;
      if (time - fpsRef.current.lastTime >= 1000) {
        fpsRef.current.fps = Math.round(
          (fpsRef.current.frames * 1000) / (time - fpsRef.current.lastTime)
        );
        fpsRef.current.frames = 0;
        fpsRef.current.lastTime = time;
      }

      // Handle Device Pixel Ratio
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const displayW = Math.floor(rect.width * dpr);
      const displayH = Math.floor(rect.height * dpr);

      if (canvas.width !== displayW || canvas.height !== displayH) {
        canvas.width = displayW;
        canvas.height = displayH;
      }

      const w = canvas.width;
      const h = canvas.height;

      const padX = 28 * dpr;
      const padY = 20 * dpr;
      const pitchDrawW = w - padX * 2;
      const pitchDrawH = h - padY * 2;

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

      const viewW = viewMaxX - viewMinX;
      const viewH = viewMaxY - viewMinY;

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
      ctx.fillStyle = "rgba(255, 255, 255, 0.015)";
      for (let i = 0; i < stripes; i += 2) {
        ctx.fillRect(padX + i * stripeW, padY, stripeW, pitchDrawH);
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

      const centerRadius = (9.15 / PITCH_LENGTH_METERS) * pitchDrawW;
      ctx.beginPath();
      ctx.arc(midX, midY, centerRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Penalty boxes
      const penBoxDepth = (16.5 / PITCH_LENGTH_METERS) * pitchDrawW;
      const penBoxYTop = scaleY((PITCH_WIDTH_METERS - 40.3) / 2);
      const penBoxH = (40.3 / PITCH_WIDTH_METERS) * pitchDrawH;
      ctx.strokeRect(padX, penBoxYTop, penBoxDepth, penBoxH);
      ctx.strokeRect(padX + pitchDrawW - penBoxDepth, penBoxYTop, penBoxDepth, penBoxH);

      // Read latest frame directly from Single Base Memory
      const memory = baseMemory.getState();
      const frame = memory.currentFrame;
      const selectedPlayerId = memory.selectedPlayerId;

      if (frame) {
        // Dynamic Zonal Pitch Control (Stage 2: Positional State & Pitch Control Zones)
        if (showPitchControl && frame.players && frame.players.length > 0) {
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

        let carrier: { x: number; y: number } | null = null;
        for (const p of frame.players) {
          if (p.is_ball_carrier) {
            carrier = { x: scaleX(p.x), y: scaleY(p.y) };
            break;
          }
        }

        // Passing lanes
        if (showPassingLanes && carrier) {
          ctx.lineWidth = 1 * dpr;
          for (const p of frame.players) {
            if (p.team === "home" && !p.is_ball_carrier) {
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

        // Draw players
        for (const p of frame.players) {
          const px = scaleX(p.x);
          const py = scaleY(p.y);
          const isHome = p.team === "home";
          const isSelected = selectedPlayerId === p.player_id;
          const radius = (isSelected ? 8.5 : 6.5) * dpr;

          if (isSelected) {
            ctx.beginPath();
            ctx.arc(px, py, radius + 4 * dpr, 0, Math.PI * 2);
            ctx.strokeStyle = "#ffd600";
            ctx.lineWidth = 2 * dpr;
            ctx.stroke();

            // Floating player name & live speed callout
            const nameTag = `${p.name} (#${p.shirt_number}) • ${p.speed_kmh ? p.speed_kmh.toFixed(1) : "14.2"} km/h`;
            ctx.font = `bold ${Math.round(8 * dpr)}px sans-serif`;
            const textMetrics = ctx.measureText(nameTag);
            const tagW = textMetrics.width + 12 * dpr;
            const tagH = 16 * dpr;
            const tagX = Math.max(padX, Math.min(padX + pitchDrawW - tagW, px - tagW / 2));
            const tagY = Math.max(padY + 2 * dpr, py - radius - 20 * dpr);

            ctx.fillStyle = "rgba(15, 23, 42, 0.94)";
            ctx.strokeStyle = isHome ? "#00e5ff" : "#f43f5e";
            ctx.lineWidth = 1 * dpr;
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(tagX, tagY, tagW, tagH, 4 * dpr);
            } else {
              ctx.rect(tagX, tagY, tagW, tagH);
            }
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(nameTag, tagX + tagW / 2, tagY + tagH / 2);
          }

          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fillStyle = isHome ? "#00e5ff" : "#f43f5e";
          ctx.shadowColor = isHome ? "rgba(0, 229, 255, 0.5)" : "rgba(244, 63, 94, 0.5)";
          ctx.shadowBlur = 6 * dpr;
          ctx.fill();
          ctx.shadowBlur = 0;

          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1 * dpr;
          ctx.stroke();

          // Shirt number
          ctx.fillStyle = "#ffffff";
          ctx.font = `bold ${Math.round(6.5 * dpr)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`${p.shirt_number}`, px, py);

          // Velocity vector
          if (showVelocityVectors && p.velocity_mps > 0.5) {
            const rad = (p.heading_deg * Math.PI) / 180;
            const vecLen = Math.min(18, p.velocity_mps * 2.8) * dpr;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px + Math.cos(rad) * vecLen, py + Math.sin(rad) * vecLen);
            ctx.strokeStyle = isHome ? "rgba(0, 229, 255, 0.7)" : "rgba(244, 63, 94, 0.7)";
            ctx.lineWidth = 1.2 * dpr;
            ctx.stroke();
          }
        }

        // Ball
        const bx = scaleX(frame.ball.x);
        const by = scaleY(frame.ball.y);
        ctx.beginPath();
        ctx.arc(bx, by, 7 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 214, 0, 0.3)";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(bx, by, 4.5 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = "#ffd600";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.2 * dpr;
        ctx.stroke();

        // Pitch Control Dominance Header
        const ctrl = frame.control_chaos.control;
        const pcText = `Pitch Control: MCI ${Math.round(ctrl)}% • ARS ${Math.round(100 - ctrl)}%`;
        const pcW = 190 * dpr;
        const pcH = 22 * dpr;
        const pcX = padX + pitchDrawW - pcW - 6 * dpr;
        const pcY = padY + 6 * dpr;

        ctx.fillStyle = "rgba(10, 16, 28, 0.85)";
        ctx.fillRect(pcX, pcY, pcW, pcH);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        ctx.lineWidth = 1 * dpr;
        ctx.strokeRect(pcX, pcY, pcW, pcH);

        ctx.fillStyle = "#38bdf8";
        ctx.font = `bold ${Math.round(9.5 * dpr)}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(pcText, pcX + pcW / 2, pcY + pcH / 2);
      }

      ctx.restore();

      // FPS badge
      ctx.fillStyle = "rgba(10, 16, 28, 0.8)";
      ctx.fillRect(padX + 6 * dpr, padY + 6 * dpr, 84 * dpr, 22 * dpr);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 1 * dpr;
      ctx.strokeRect(padX + 6 * dpr, padY + 6 * dpr, 84 * dpr, 22 * dpr);

      ctx.fillStyle = "#10b981";
      ctx.font = `bold ${Math.round(9.5 * dpr)}px monospace`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`${fpsRef.current.fps} FPS • 5Hz`, padX + 12 * dpr, padY + 17 * dpr);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [showVelocityVectors, showPassingLanes, showPitchControl, cameraAngle]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const padX = 28;
    const padY = 20;
    const pitchDrawW = rect.width - padX * 2;
    const pitchDrawH = rect.height - padY * 2;

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

    const viewW = viewMaxX - viewMinX;
    const viewH = viewMaxY - viewMinY;

    const pitchX = viewMinX + ((clickX - padX) / pitchDrawW) * viewW;
    const pitchY = viewMinY + ((clickY - padY) / pitchDrawH) * viewH;

    const frame = baseMemory.getState().currentFrame;
    if (!frame) return;

    let closest: { id: string; dist: number } | null = null;
    for (const p of frame.players) {
      const d = Math.hypot(p.x - pitchX, p.y - pitchY);
      if (d < 4.0 && (!closest || d < closest.dist)) {
        closest = { id: p.player_id, dist: d };
      }
    }

    if (closest) {
      baseMemory.setSelectedPlayer(closest.id);
    }
  };

  return (
    <div className="radar-container" style={{ width: "100%", aspectRatio: "105/68", position: "relative" }}>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{ width: "100%", height: "100%", display: "block", cursor: "pointer" }}
        title="Click on any player to spotlight across studio"
      />
    </div>
  );
};
