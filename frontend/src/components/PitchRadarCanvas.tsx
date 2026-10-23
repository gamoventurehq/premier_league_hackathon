import React, { useEffect, useRef } from "react";
import { baseMemory } from "../store/baseMemory";
import { PITCH_LENGTH_METERS, PITCH_WIDTH_METERS } from "../types/telemetry";

interface PitchRadarCanvasProps {
  showVelocityVectors?: boolean;
  showPassingLanes?: boolean;
}

export const PitchRadarCanvas: React.FC<PitchRadarCanvasProps> = ({
  showVelocityVectors = true,
  showPassingLanes = true,
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

      const scaleX = (x: number) => padX + (x / PITCH_LENGTH_METERS) * pitchDrawW;
      const scaleY = (y: number) => padY + (y / PITCH_WIDTH_METERS) * pitchDrawH;

      // Dark pitch background
      ctx.fillStyle = "#070c14";
      ctx.fillRect(0, 0, w, h);

      // Turf
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
      }

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
  }, [showVelocityVectors, showPassingLanes]);

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

    const pitchX = ((clickX - padX) / pitchDrawW) * PITCH_LENGTH_METERS;
    const pitchY = ((clickY - padY) / pitchDrawH) * PITCH_WIDTH_METERS;

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
