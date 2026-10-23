import { baseMemory } from "../store/baseMemory";
import { FrameTelemetry, PlayerTelemetry } from "../types/telemetry";

class TelemetryService {
  private ws: WebSocket | null = null;
  private fallbackInterval: number | null = null;
  private isStarted = false;
  private retryTimeout: number | null = null;
  private wsUrl = "ws://localhost:8000/ws/telemetry";

  start(customUrl?: string) {
    if (this.isStarted && this.ws && this.ws.readyState === WebSocket.OPEN) return;
    this.isStarted = true;
    if (customUrl) this.wsUrl = customUrl;

    this.connectWebSocket();
  }

  private connectWebSocket() {
    if (!this.isStarted) return;
    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        baseMemory.setServerStatus({
          isConnected: true,
          lastSyncTime: Date.now(),
        });

        if (this.fallbackInterval) {
          clearInterval(this.fallbackInterval);
          this.fallbackInterval = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.frame) {
            baseMemory.updateFrame(payload.frame);
          }
          if (payload.blackboard) {
            baseMemory.updateBlackboard(payload.blackboard);
          }
          baseMemory.setServerStatus({
            isConnected: true,
            lastSyncTime: Date.now(),
          });
        } catch (err) {
          console.error("Telemetry parse error", err);
        }
      };

      this.ws.onerror = () => {
        baseMemory.setServerStatus({ isConnected: false });
        this.ensureFallback();
      };

      this.ws.onclose = () => {
        baseMemory.setServerStatus({ isConnected: false });
        this.ensureFallback();

        // Retry connection after 3 seconds if still running
        if (this.isStarted && !this.retryTimeout) {
          this.retryTimeout = window.setTimeout(() => {
            this.retryTimeout = null;
            if (this.isStarted) {
              this.connectWebSocket();
            }
          }, 3000);
        }
      };
    } catch {
      baseMemory.setServerStatus({ isConnected: false });
      this.ensureFallback();
    }
  }

  private ensureFallback() {
    if (this.fallbackInterval) return;

    this.fallbackInterval = window.setInterval(() => {
      const state = baseMemory.getState();
      if (!state.isPlaying) return;

      const simClock = state.matchClock + 0.2;
      const mock = this.generateSyntheticFrame(simClock);
      baseMemory.updateFrame(mock);
      baseMemory.updateBlackboard({
        latest_pdr: 0.35 + 0.3 * Math.sin(simClock * 0.4),
      });
    }, 200);
  }

  sendCommand(cmd: Record<string, unknown>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(cmd));
      } catch (err) {
        console.error("Failed to send telemetry command", err);
      }
    }
  }

  private generateSyntheticFrame(tickSec: number): FrameTelemetry {
    const t = tickSec;
    const bx = 52.5 + 24.0 * Math.sin(t * 0.3);
    const by = 34.0 + 16.0 * Math.cos(t * 0.4);
    const bSpeed = Math.abs(Math.cos(t * 0.3)) * 8.0;

    const state = baseMemory.getState();
    const players: PlayerTelemetry[] = [];

    const HOME_ANCHORS: Record<string, [number, number]> = {
      home_1: [7.0, 34.0],
      home_2: [22.0, 12.0],
      home_3: [19.0, 26.0],
      home_4: [19.0, 42.0],
      home_5: [22.0, 56.0],
      home_6: [32.0, 34.0],
      home_7: [38.0, 22.0],
      home_8: [38.0, 46.0],
      home_9: [46.0, 14.0],
      home_10: [45.0, 34.0],
      home_11: [46.0, 54.0],
    };

    const AWAY_ANCHORS: Record<string, [number, number]> = {
      away_1: [98.0, 34.0],
      away_2: [82.0, 56.0],
      away_3: [85.0, 42.0],
      away_4: [85.0, 26.0],
      away_5: [82.0, 12.0],
      away_6: [72.0, 44.0],
      away_7: [72.0, 24.0],
      away_8: [58.0, 54.0],
      away_9: [64.0, 34.0],
      away_10: [58.0, 14.0],
      away_11: [55.0, 34.0],
    };

    // Home Team Outfield & GK
    state.homeLineup.forEach((p, i) => {
      const [baseX, baseY] = HOME_ANCHORS[p.id] || [20.0, 34.0];
      const px = baseX + 2.2 * Math.sin(t * 0.5 + i);
      const py = baseY + 1.8 * Math.cos(t * 0.4 + i);
      const spd = 2.4 + 1.4 * Math.abs(Math.sin(t * 0.6 + i));

      const dist = Math.hypot(px - bx, py - by);
      const isCarrier = dist < 8.0 && (p.id === "home_7" || p.id === "home_10");

      players.push({
        player_id: p.id,
        name: p.name,
        team: "home",
        shirt_number: p.number,
        position: p.pos,
        x: Math.max(2, Math.min(53, px)),
        y: Math.max(2, Math.min(66, py)),
        velocity_mps: Math.max(0.1, spd),
        speed_kmh: Math.max(0.3, spd * 3.6),
        heading_deg: (t * 20 + i * 30) % 360,
        is_ball_carrier: isCarrier,
      });
    });

    // Away Team Outfield & GK
    state.awayLineup.forEach((p, i) => {
      const [baseX, baseY] = AWAY_ANCHORS[p.id] || [80.0, 34.0];
      const px = baseX - 2.0 * Math.sin(t * 0.5 + i);
      const py = baseY + 1.8 * Math.sin(t * 0.4 + i);
      const spd = 2.2 + 1.2 * Math.abs(Math.cos(t * 0.6 + i));

      const dist = Math.hypot(px - bx, py - by);
      const isCarrier = dist < 8.0 && (p.id === "away_8" || p.id === "away_11");

      players.push({
        player_id: p.id,
        name: p.name,
        team: "away",
        shirt_number: p.number,
        position: p.pos,
        x: Math.max(54, Math.min(103, px)),
        y: Math.max(2, Math.min(66, py)),
        velocity_mps: Math.max(0.1, spd),
        speed_kmh: Math.max(0.3, spd * 3.6),
        heading_deg: (180 + t * 20 + i * 30) % 360,
        is_ball_carrier: isCarrier,
      });
    });

    const chaos = Math.round(34.0 + 22.0 * Math.sin(t * 0.2));
    const control = 100 - chaos;

    return {
      frame_id: Math.floor(tickSec * 5),
      timestamp_ms: Date.now(),
      match_clock_sec: tickSec,
      ball: {
        x: Math.max(2, Math.min(103, bx)),
        y: Math.max(2, Math.min(66, by)),
        z: 0,
        velocity_mps: bSpeed,
        speed_kmh: bSpeed * 3.6,
      },
      players,
      control_chaos: { control, chaos },
      game_rhythm: chaos < 45 ? "structured_possession" : "counter_attacking_transition",
      active_tactical_inflection: chaos > 50,
    };
  }

  stop() {
    this.isStarted = false;
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      }
      this.ws = null;
    }
    if (this.fallbackInterval) {
      clearInterval(this.fallbackInterval);
      this.fallbackInterval = null;
    }
  }
}

export const telemetryService = new TelemetryService();
