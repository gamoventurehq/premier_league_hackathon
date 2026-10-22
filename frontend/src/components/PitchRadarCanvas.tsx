'use client';

import React, { useRef, useEffect } from 'react';
import { TelemetryFrame, PitchPosition } from '../types/telemetry';
import { IonBadge, IonIcon } from '@ionic/react';
import { eyeOutline, radioOutline } from 'ionicons/icons';

interface PitchRadarCanvasProps {
  frame: TelemetryFrame | null;
  showPitchControl: boolean;
  showPassingLanes: boolean;
  showSpeedVectors: boolean;
  selectedPlayerId?: string;
  onSelectPlayer?: (playerId: string) => void;
}

// 105m × 68m standard pitch per ADR 0003
const PITCH_LENGTH_M = 105.0;
const PITCH_WIDTH_M = 68.0;

export const PitchRadarCanvas: React.FC<PitchRadarCanvasProps> = ({
  frame,
  showPitchControl,
  showPassingLanes,
  showSpeedVectors,
  selectedPlayerId,
  onSelectPlayer,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      const scaleX = (m: number) => (m / PITCH_LENGTH_M) * width;
      const scaleY = (m: number) => (m / PITCH_WIDTH_M) * height;

      ctx.clearRect(0, 0, width, height);

      // Deep Apple Dark Stadium Turf
      const grad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width * 0.7);
      grad.addColorStop(0, '#0c1a14');
      grad.addColorStop(1, '#050c09');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Apple subtle pitch turf bands
      ctx.fillStyle = 'rgba(255, 255, 255, 0.012)';
      const stripes = 10;
      const stripeWidth = width / stripes;
      for (let i = 0; i < stripes; i += 2) {
        ctx.fillRect(i * stripeWidth, 0, stripeWidth, height);
      }

      // 1. Apple-Clean Crisp Pitch Markings
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = 1.2;

      // Outer pitch boundary
      ctx.strokeRect(0, 0, width, height);

      // Halfway line
      ctx.beginPath();
      ctx.moveTo(scaleX(52.5), 0);
      ctx.lineTo(scaleX(52.5), height);
      ctx.stroke();

      // Center circle (9.15m radius)
      ctx.beginPath();
      ctx.arc(scaleX(52.5), scaleY(34.0), scaleX(9.15), 0, Math.PI * 2);
      ctx.stroke();

      // Center spot
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(scaleX(52.5), scaleY(34.0), 2, 0, Math.PI * 2);
      ctx.fill();

      // Penalty Areas
      const penDepth = scaleX(16.5);
      const penTopY = scaleY(13.84);
      const penHeight = scaleY(40.32);

      ctx.strokeRect(0, penTopY, penDepth, penHeight);
      ctx.strokeRect(width - penDepth, penTopY, penDepth, penHeight);

      // Goal Areas
      const goalDepth = scaleX(5.5);
      const goalTopY = scaleY(24.84);
      const goalHeight = scaleY(18.32);

      ctx.strokeRect(0, goalTopY, goalDepth, goalHeight);
      ctx.strokeRect(width - goalDepth, goalTopY, goalDepth, goalHeight);

      // 2. Pitch Control Gradient Contours (CONTEXT.md)
      if (showPitchControl && frame) {
        const homePct = frame.metrics.pitchControl.homePercentage / 100;
        const pitchControlGrad = ctx.createLinearGradient(0, 0, width, 0);
        pitchControlGrad.addColorStop(0, 'rgba(10, 132, 255, 0.16)');
        pitchControlGrad.addColorStop(Math.min(0.85, homePct), 'rgba(10, 132, 255, 0.08)');
        pitchControlGrad.addColorStop(Math.min(1.0, homePct + 0.12), 'rgba(255, 69, 58, 0.08)');
        pitchControlGrad.addColorStop(1, 'rgba(255, 69, 58, 0.16)');
        ctx.fillStyle = pitchControlGrad;
        ctx.fillRect(0, 0, width, height);

        // Control partition line
        const boundaryX = scaleX(homePct * PITCH_LENGTH_M);
        ctx.strokeStyle = 'rgba(100, 210, 255, 0.35)';
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(boundaryX, 0);
        ctx.lineTo(boundaryX, height);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 3. Passing Lanes & PDR Badges (CONTEXT.md)
      if (showPassingLanes && frame) {
        frame.passingLanes.forEach((lane) => {
          const fromX = scaleX(lane.passerPos.x);
          const fromY = scaleY(lane.passerPos.y);
          const toX = scaleX(lane.receiverPos.x);
          const toY = scaleY(lane.receiverPos.y);

          const laneColor = lane.isClear
            ? 'rgba(48, 209, 88, 0.75)'
            : 'rgba(255, 159, 10, 0.8)';

          ctx.strokeStyle = laneColor;
          ctx.lineWidth = lane.isClear ? 2.2 : 1.4;
          ctx.beginPath();
          ctx.moveTo(fromX, fromY);
          ctx.lineTo(toX, toY);
          ctx.stroke();

          // Apple pill badge for PDR
          const midX = (fromX + toX) / 2;
          const midY = (fromY + toY) / 2;

          ctx.fillStyle = 'rgba(28, 28, 30, 0.9)';
          ctx.beginPath();
          ctx.roundRect(midX - 17, midY - 8, 34, 15, 6);
          ctx.fill();
          ctx.strokeStyle = laneColor;
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = '600 8.5px -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`PDR ${lane.passDifficultyRating}`, midX, midY + 3);
        });
      }

      // 4. Players
      if (frame) {
        frame.players.forEach((p) => {
          const px = scaleX(p.x);
          const py = scaleY(p.y);
          const isSelected = p.id === selectedPlayerId || p.isDesignatedPlayerCam;

          // Speed vector indicator
          if (showSpeedVectors && (p.vx !== 0 || p.vy !== 0)) {
            const vecLength = scaleX(p.vx * 1.4);
            const vecWidth = scaleY(p.vy * 1.4);
            ctx.strokeStyle = p.team === 'home' ? 'rgba(10, 132, 255, 0.5)' : 'rgba(255, 69, 58, 0.5)';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px + vecLength, py + vecWidth);
            ctx.stroke();
          }

          // Player spotlight halo
          if (isSelected) {
            ctx.strokeStyle = '#0a84ff';
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.arc(px, py, 14, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(10, 132, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(px, py, 19, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Player Node
          ctx.beginPath();
          ctx.arc(px, py, 8.5, 0, Math.PI * 2);
          ctx.fillStyle = p.team === 'home' ? '#0a84ff' : '#ff453a';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Squad number
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 8px -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${p.number}`, px, py);

          // Player Name Label (Apple SF typography)
          ctx.font = '500 9px -apple-system, sans-serif';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.fillText(p.name.split(' ').pop() || '', px, py - 12);
        });

        // 5. Ball
        const bx = scaleX(frame.ball.x);
        const by = scaleY(frame.ball.y);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.arc(bx + 2, by + 2, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffd60a';
        ctx.beginPath();
        ctx.arc(bx, by, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [frame, showPitchControl, showPassingLanes, showSpeedVectors, selectedPlayerId]);

  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const containerWidth = container.clientWidth;
      const targetHeight = (containerWidth * PITCH_WIDTH_M) / PITCH_LENGTH_M;

      canvas.width = containerWidth;
      canvas.height = targetHeight;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-3xl apple-glass border border-white/10 shadow-2xl"
    >
      <canvas
        ref={canvasRef}
        className="block cursor-crosshair"
        onClick={(e) => {
          if (!frame || !canvasRef.current || !onSelectPlayer) return;
          const rect = canvasRef.current.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const clickY = e.clientY - rect.top;

          const scaleX = (m: number) => (m / PITCH_LENGTH_M) * canvasRef.current!.width;
          const scaleY = (m: number) => (m / PITCH_WIDTH_M) * canvasRef.current!.height;

          const clickedPlayer = frame.players.find((p) => {
            const px = scaleX(p.x);
            const py = scaleY(p.y);
            return Math.hypot(clickX - px, clickY - py) < 18;
          });

          if (clickedPlayer) {
            onSelectPlayer(clickedPlayer.id);
          }
        }}
      />

      {/* Floating Apple Glass Status Indicator */}
      <div className="absolute top-3.5 left-3.5 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs backdrop-blur-xl border border-white/10 shadow-lg">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#30d158] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#30d158]"></span>
        </span>
        <span className="font-semibold text-white/90 text-[11px]">Pitch Space Radar</span>
        <span className="text-[10px] text-white/40 font-mono">105m × 68m</span>
        <IonBadge color="success" className="text-[9px] px-1.5 py-0.5 rounded-full font-mono">
          60 FPS
        </IonBadge>
      </div>
    </div>
  );
};
