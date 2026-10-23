import { baseMemory } from "../store/baseMemory";
import { FrameTelemetry, PlayerTelemetry } from "../types/telemetry";

class TelemetryService {
  private ws: WebSocket | null = null;
  private fallbackInterval: number | null = null;
  private isStarted = false;
  private retryTimeout: number | null = null;
  private wsUrl = "ws://localhost:8000/ws/telemetry";

  start(customUrl?: string) {
    baseMemory.setScenarioCommandHandler((cmd) => this.sendCommand(cmd));
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
    const state = baseMemory.getState();
    const scenario = state.activeScenario;

    let bx = 77.0 + 11.0 * Math.sin(t * 0.3);
    let by = 34.0 + 15.0 * Math.cos(t * 0.4);
    let bSpeed = Math.abs(Math.cos(t * 0.3)) * 8.5;

    if (scenario === "box_scramble") {
      bx = 98.2 + 1.2 * Math.sin(t * 1.5);
      by = 34.0 + 2.5 * Math.cos(t * 1.8);
      bSpeed = 3.5 + 4.0 * Math.abs(Math.sin(t * 1.2));
    } else if (scenario === "counter_attack") {
      const prog = 0.5 + 0.5 * Math.sin(t * 0.7);
      bx = 35.0 + 35.0 * prog;
      by = 48.0 + 6.0 * Math.cos(t * 0.9);
      bSpeed = 8.5;
    } else if (scenario === "low_block") {
      bx = 79.0 + 7.0 * Math.sin(t * 0.4);
      by = 34.0 + 14.0 * Math.cos(t * 0.3);
      bSpeed = Math.abs(Math.cos(t * 0.3)) * 6.5;
    }

    const HOME_ANCHORS: Record<string, [number, number]> = {
      home_1: [12.0, 34.0],
      home_2: [60.0, 14.0],
      home_3: [52.0, 26.0],
      home_4: [52.0, 42.0],
      home_5: [60.0, 54.0],
      home_6: [66.0, 34.0],
      home_7: [78.0, 22.0],
      home_8: [78.0, 46.0],
      home_9: [84.0, 15.0],
      home_10: [87.0, 34.0],
      home_11: [84.0, 53.0],
    };

    const AWAY_ANCHORS: Record<string, [number, number]> = {
      away_1: [100.0, 34.0],
      away_2: [88.0, 52.0],
      away_3: [91.0, 39.0],
      away_4: [91.0, 27.0],
      away_5: [88.0, 16.0],
      away_6: [79.0, 41.0],
      away_7: [79.0, 27.0],
      away_8: [68.0, 52.0],
      away_9: [73.0, 34.0],
      away_10: [68.0, 16.0],
      away_11: [62.0, 34.0],
    };

    const players: PlayerTelemetry[] = [];

    // Home Team Outfield & GK
    state.homeLineup.forEach((p, i) => {
      const [baseX, baseY] = HOME_ANCHORS[p.id] || [50.0, 34.0];
      let px = baseX;
      let py = baseY;
      let spd = 2.4 + 1.4 * Math.abs(Math.sin(t * 0.6 + i));

      if (scenario === "box_scramble" && (p.id === "home_10" || p.id === "home_7" || p.id === "home_9")) {
        const offset = p.id === "home_10" ? 1.8 : 3.2;
        px = 96.5 + offset * Math.cos(t * 0.8 + i);
        py = 34.0 + offset * Math.sin(t * 0.8 + i);
        spd = 4.2;
      } else if (scenario === "counter_attack" && (p.id === "home_2" || p.id === "home_6")) {
        px = baseX - 12.0 + 3.0 * Math.sin(t * 0.6);
        spd = 7.5;
      } else {
        px = baseX + 2.2 * Math.sin(t * 0.5 + i);
        py = baseY + 1.8 * Math.cos(t * 0.4 + i);
      }

      const dist = Math.hypot(px - bx, py - by);
      const isCarrier = dist < 4.5 && (p.id === "home_7" || p.id === "home_10" || p.id === "home_9");

      players.push({
        player_id: p.id,
        name: p.name,
        team: "home",
        shirt_number: p.number,
        position: p.pos,
        x: Math.max(2, Math.min(102, px)),
        y: Math.max(2, Math.min(66, py)),
        velocity_mps: Math.max(0.1, spd),
        speed_kmh: Math.max(0.3, spd * 3.6),
        heading_deg: (t * 20 + i * 30) % 360,
        is_ball_carrier: isCarrier,
      });
    });

    // Away Team Outfield & GK
    state.awayLineup.forEach((p, i) => {
      const [baseX, baseY] = AWAY_ANCHORS[p.id] || [85.0, 34.0];
      let px = baseX;
      let py = baseY;
      let spd = 2.2 + 1.2 * Math.abs(Math.cos(t * 0.6 + i));

      if (scenario === "red_card_crisis" && p.id === "away_6") {
        px = 106.0;
        py = -4.0;
        spd = 0.0;
      } else if (scenario === "counter_attack" && p.id === "away_8") {
        const prog = 0.5 + 0.5 * Math.sin(t * 0.7);
        px = 36.0 + 34.0 * prog;
        py = 48.0 + 5.0 * Math.cos(t * 0.9);
        spd = 8.8;
      } else if (scenario === "box_scramble" && (p.id === "away_1" || p.id === "away_3" || p.id === "away_4")) {
        px = 98.0 + 1.5 * Math.sin(t * 0.9 + i);
        py = 34.0 + 2.2 * Math.cos(t * 0.9 + i);
        spd = 3.8;
      } else if (scenario === "low_block") {
        px = Math.min(96.0, baseX + 3.0) - 1.2 * Math.sin(t * 0.4 + i);
        py = baseY + 1.2 * Math.sin(t * 0.3 + i);
        spd = 1.8;
      } else {
        px = baseX - 2.0 * Math.sin(t * 0.5 + i);
        py = baseY + 1.8 * Math.sin(t * 0.4 + i);
      }

      const dist = Math.hypot(px - bx, py - by);
      const isCarrier = dist < 4.5 && (p.id === "away_8" || p.id === "away_11" || p.id === "away_9");

      players.push({
        player_id: p.id,
        name: p.name,
        team: "away",
        shirt_number: p.number,
        position: p.pos,
        x: Math.max(2, Math.min(107, px)),
        y: Math.max(-5, Math.min(66, py)),
        velocity_mps: Math.max(0.1, spd),
        speed_kmh: Math.max(0.3, spd * 3.6),
        heading_deg: (180 + t * 20 + i * 30) % 360,
        is_ball_carrier: isCarrier,
      });
    });

    let chaos = Math.round(35.0 + 20.0 * Math.sin(t * 0.2));
    let control = 100 - chaos;
    let rhythm: any = chaos < 45 ? "structured_possession" : "counter_attacking_transition";

    if (scenario === "box_scramble") {
      chaos = 85;
      control = 15;
      rhythm = "penalty_box_chaos";
    } else if (scenario === "counter_attack") {
      chaos = 74;
      control = 26;
      rhythm = "rapid_transition";
    } else if (scenario === "low_block") {
      chaos = 22;
      control = 78;
      rhythm = "low_block_siege";
    } else if (scenario === "red_card_crisis") {
      chaos = 42;
      control = 88;
      rhythm = "numerical_asymmetry";
    }

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
      game_rhythm: rhythm,
      active_tactical_inflection: chaos > 50 || scenario !== null,
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
