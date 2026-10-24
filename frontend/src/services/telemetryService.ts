import { baseMemory, normalizeFrame, normalizeBlackboard } from "../store/baseMemory";
import { FrameTelemetry, PlayerKinematics } from "../types/telemetry";

class TelemetryService {
  private ws: WebSocket | null = null;
  private fallbackInterval: number | null = null;
  private isStarted = false;
  private wsUrl = "ws://localhost:8000/ws/telemetry";

  start(customUrl?: string) {
    if (this.isStarted) return;
    this.isStarted = true;
    if (customUrl) this.wsUrl = customUrl;

    this.connectWebSocket();
  }

  private connectWebSocket() {
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
          const payload = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
          if (payload.frame) {
            const normalizedFrame = normalizeFrame(payload.frame);
            baseMemory.updateFrame(normalizedFrame);
          }
          if (payload.blackboard) {
            const normalizedBb = normalizeBlackboard(payload.blackboard, baseMemory.getState().blackboard);
            baseMemory.updateBlackboard(normalizedBb);
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

        // Retry connection after 3 seconds
        setTimeout(() => {
          if (this.isStarted) {
            this.connectWebSocket();
          }
        }, 3000);
      };
    } catch {
      baseMemory.setServerStatus({ isConnected: false });
      this.ensureFallback();
    }
  }

  private ensureFallback() {
    if (this.fallbackInterval) return;

    let simClock = baseMemory.getState().matchClock;

    this.fallbackInterval = window.setInterval(() => {
      simClock += 0.2;
      const mock = this.generateSyntheticFrame(simClock);
      baseMemory.updateFrame(mock);
      baseMemory.updateBlackboard({
        latest_pdr: 0.35 + 0.3 * Math.sin(simClock * 0.4),
      });
    }, 200);
  }

  private generateSyntheticFrame(tickSec: number): FrameTelemetry {
    const t = tickSec;
    const bx = 52.5 + 24.0 * Math.sin(t * 0.3);
    const by = 34.0 + 16.0 * Math.cos(t * 0.4);
    const bSpeed = Math.abs(Math.cos(t * 0.3)) * 8.0;

    const players: PlayerKinematics[] = [];

    // Home Team (11)
    for (let i = 0; i < 11; i++) {
      const baseX = 12.0 + (i % 4) * 22.0;
      const baseY = 10.0 + Math.floor(i / 4) * 20.0;
      const px = baseX + 3.0 * Math.sin(t * 0.5 + i);
      const py = baseY + 2.5 * Math.cos(t * 0.4 + i);
      const spd = 2.5 + 1.8 * Math.sin(t * 0.6 + i);

      players.push({
        player_id: `home_${i + 1}`,
        name: `Home Player ${i + 1}`,
        team: "home",
        shirt_number: i + 1,
        position: i === 0 ? "GK" : i < 5 ? "DEF" : i < 9 ? "MID" : "FWD",
        x: Math.max(1, Math.min(104, px)),
        y: Math.max(1, Math.min(67, py)),
        velocity_mps: Math.max(0.1, spd),
        speed_kmh: Math.max(0.3, spd * 3.6),
        heading_deg: (t * 20 + i * 30) % 360,
        is_ball_carrier: i === 6,
      });
    }

    // Away Team (11)
    for (let i = 0; i < 11; i++) {
      const baseX = 93.0 - (i % 4) * 22.0;
      const baseY = 10.0 + Math.floor(i / 4) * 20.0;
      const px = baseX - 3.0 * Math.sin(t * 0.5 + i);
      const py = baseY + 2.5 * Math.sin(t * 0.4 + i);
      const spd = 2.4 + 1.5 * Math.cos(t * 0.6 + i);

      players.push({
        player_id: `away_${i + 1}`,
        name: `Away Player ${i + 1}`,
        team: "away",
        shirt_number: i + 1,
        position: i === 0 ? "GK" : i < 5 ? "DEF" : i < 9 ? "MID" : "FWD",
        x: Math.max(1, Math.min(104, px)),
        y: Math.max(1, Math.min(67, py)),
        velocity_mps: Math.max(0.1, spd),
        speed_kmh: Math.max(0.3, spd * 3.6),
        heading_deg: (180 + t * 20 + i * 30) % 360,
        is_ball_carrier: false,
      });
    }

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
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.fallbackInterval) {
      clearInterval(this.fallbackInterval);
      this.fallbackInterval = null;
    }
  }
}

export const telemetryService = new TelemetryService();
