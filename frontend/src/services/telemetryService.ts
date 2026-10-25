import { baseMemory, normalizeFrame, normalizeBlackboard } from "../store/baseMemory";
import { FrameTelemetry, PlayerKinematics, MatchEvent, MatchEventType, ShotRecord } from "../types/telemetry";

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

    // Authentic airborne ball elevation for crosses, duels, and clearances
    const isAirborne = (t % 12.0 < 3.2);
    const ballZ = isAirborne ? Math.max(0, 2.4 * Math.sin(((t % 12.0) / 3.2) * Math.PI)) : 0;

    // 26-Type Visual Taxonomy Event Stream Generation for Offline / Demo Mode
    const synthTemplates: Array<{
      type: MatchEventType;
      actorId: string;
      secondaryActorId?: string;
      team: "home" | "away";
      sector: string;
      speedKmH: number;
      xG?: number;
      pdr?: number;
      desc: string;
    }> = [
      { type: "key_pass", actorId: "home_7", secondaryActorId: "home_10", team: "home", sector: "Right Half-Space", speedKmH: 28.4, pdr: 84, desc: "K. De Bruyne Line-Breaking Key Pass" },
      { type: "cross", actorId: "away_8", secondaryActorId: "away_9", team: "away", sector: "Right Flank", speedKmH: 29.5, pdr: 78, desc: "B. Saka Whipped Near-Post Cross" },
      { type: "clearance", actorId: "home_3", team: "home", sector: "Penalty Box", speedKmH: 26.2, desc: "R. Dias Powerful Box Clearance" },
      { type: "aerial_duel", actorId: "home_10", secondaryActorId: "away_2", team: "home", sector: "Central Corridor", speedKmH: 18.0, desc: "E. Haaland Aerial Contest Won" },
      { type: "save", actorId: "away_1", team: "away", sector: "Goal Mouth", speedKmH: 94.0, xG: 0.82, desc: "D. Raya Diving Reflex Save" },
      { type: "progressive_carry", actorId: "away_8", team: "away", sector: "Right Half-Space", speedKmH: 33.2, desc: "B. Saka Vertical Progression Burst" },
      { type: "block", actorId: "away_6", team: "away", sector: "Deep Defensive Corridor", speedKmH: 21.0, xG: 0.45, desc: "Gabriel Sliding Shot Block" },
      { type: "tackle", actorId: "away_7", team: "away", sector: "Midfield Pivot", speedKmH: 24.1, desc: "D. Rice Ground Challenge Won" },
      { type: "punch", actorId: "home_1", team: "home", sector: "6-Yard Box", speedKmH: 32.0, desc: "Ederson High Box Punch" },
      { type: "shot", actorId: "home_10", team: "home", sector: "Penalty Spot", speedKmH: 104.5, xG: 0.68, desc: "E. Haaland Fierce Shot on Target" },
      { type: "goal", actorId: "home_10", secondaryActorId: "home_7", team: "home", sector: "Top Right Corner", speedKmH: 108.4, xG: 0.78, desc: "E. Haaland Goal! Assisted by De Bruyne" },
      { type: "recovery", actorId: "home_4", team: "home", sector: "Rest-Defense Line", speedKmH: 22.0, desc: "Rodri Loose Ball Recovery" },
      { type: "corner_kick", actorId: "home_7", team: "home", sector: "Corner Arc", speedKmH: 30.0, desc: "K. De Bruyne Inswinging Corner" },
      { type: "interception", actorId: "home_2", team: "home", sector: "Central Channel", speedKmH: 25.0, desc: "K. Walker Passing Lane Cut" },
      { type: "yellow_card", actorId: "away_7", team: "away", sector: "Defensive Third", speedKmH: 0, desc: "D. Rice Cautioned for Tactical Breakdown" },
      { type: "claim", actorId: "home_1", team: "home", sector: "Penalty Area", speedKmH: 15.0, desc: "Ederson Dominant High Catch" },
      { type: "free_kick", actorId: "away_10", team: "away", sector: "Danger Corridor", speedKmH: 31.0, desc: "M. Odegaard Direct Free Kick" },
      { type: "offside", actorId: "away_9", team: "away", sector: "High Defensive Line", speedKmH: 27.0, desc: "K. Havertz Caught Offside" },
    ];

    const cycleIndex = Math.floor(tickSec / 5);
    const tpl = synthTemplates[cycleIndex % synthTemplates.length];
    const clockMin = Math.floor(tickSec / 60);
    const clockSec = Math.floor(tickSec % 60);
    const formattedClock = `${clockMin.toString().padStart(2, "0")}:${clockSec.toString().padStart(2, "0")}`;

    const syntheticEvent: MatchEvent = {
      id: `synth_evt_${cycleIndex}`,
      type: tpl.type,
      matchClock: formattedClock,
      timestampMs: Math.round(clockSec * 1000),
      team: tpl.team,
      actorId: tpl.actorId,
      targetId: tpl.secondaryActorId ?? null,
      x: bx,
      y: by,
      xG: tpl.xG,
      pdr: tpl.pdr,
      completed: true,
      score: { home: 1, away: 0 },
      description: tpl.desc,
      pitchSector: tpl.sector,
      speedKmH: tpl.speedKmH,
      secondaryActorId: tpl.secondaryActorId,
    };

    const syntheticShots: ShotRecord[] = (tpl.type === "shot" || tpl.type === "goal") ? [
      {
        id: `synth_shot_${cycleIndex}`,
        team: tpl.team,
        playerId: tpl.actorId,
        playerName: tpl.desc,
        matchClock: formattedClock,
        timestampMs: Date.now(),
        xG: tpl.xG ?? 0.68,
        distanceToGoalM: 14.5,
        outcome: tpl.type === "goal" ? "goal" : "saved",
        onTarget: true,
        x: bx,
        y: by,
      }
    ] : [];

    return {
      frame_id: Math.floor(tickSec * 5),
      timestamp_ms: Date.now(),
      match_clock_sec: tickSec,
      ball: {
        x: Math.max(2, Math.min(103, bx)),
        y: Math.max(2, Math.min(66, by)),
        z: ballZ,
        velocity_mps: bSpeed,
        speed_kmh: bSpeed * 3.6,
      },
      players,
      control_chaos: { control, chaos },
      game_rhythm: chaos < 45 ? "structured_possession" : "counter_attacking_transition",
      active_tactical_inflection: chaos > 50,
      events: [syntheticEvent],
      shots: syntheticShots,
    };
  }

  jumpToSeconds(seconds: number) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "jump_time", seconds }));
    } else {
      fetch("/api/playback/jump", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seconds }),
      }).catch(() => {});
    }
  }

  pause() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "pause" }));
    } else {
      fetch("/api/playback/pause", { method: "POST" }).catch(() => {});
    }
  }

  resume() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "resume" }));
    } else {
      fetch("/api/playback/resume", { method: "POST" }).catch(() => {});
    }
  }

  setSpeed(speed: number) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "set_speed", speed }));
    } else {
      fetch("/api/playback/speed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ speed }),
      }).catch(() => {});
    }
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
