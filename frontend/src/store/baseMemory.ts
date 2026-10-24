import { useSyncExternalStore } from "react";
import {
  FrameTelemetry,
  TacticalBlackboard,
  PersonaMode,
  SupportedLanguage,
  PlayerKinematics,
  BallKinematics,
  PassingLane,
  PitchControlCell,
  MatchMetrics,
  NarrativeEvent,
  AgentTrace,
} from "../types/telemetry";

export interface ServerStatus {
  isConnected: boolean;
  latencyMs: number;
  lastSyncTime: number;
}

export interface MatchScore {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  period: string;
}

export type ThemeMode = "dark" | "light";

export interface BaseMemoryState {
  matchClock: number;
  score: MatchScore;
  currentFrame: FrameTelemetry | null;
  blackboard: TacticalBlackboard;
  selectedPersona: PersonaMode;
  selectedLanguage: SupportedLanguage;
  selectedPlayerId: string | null;
  serverStatus: ServerStatus;
  theme: ThemeMode;
}

const initialBlackboard: TacticalBlackboard = {
  latest_frame_id: 0,
  current_game_rhythm: "structured_possession",
  control_index: 64,
  chaos_index: 36,
  active_tactical_inflection: false,
  latest_pdr: 0.42,
  narrative_headline: "Man City sustained possession pinning Arsenal low block",
  persona_overviews: {
    analyst:
      "Defensive block compact in central corridor (width 26.4m). Passing network shows 82% ball progression via right half-space.",
    casual:
      "Total siege! City are relentless on the edge of the box, searching for the killer pass.",
    player_cam:
      "Tracking Home #7: 29.8 km/h sprint burst into the penalty box. Off-ball distance covered: 3.4 km.",
    club_centric:
      "City asserting complete control with 68% territorial dominance in the final third.",
  },
};

const initialState: BaseMemoryState = {
  matchClock: 1458, // 24:18 min
  score: {
    homeTeam: "MCI",
    awayTeam: "ARS",
    homeScore: 1,
    awayScore: 0,
    period: "1st Half",
  },
  currentFrame: null,
  blackboard: initialBlackboard,
  selectedPersona: "analyst",
  selectedLanguage: "en",
  selectedPlayerId: "home_7",
  serverStatus: {
    isConnected: false,
    latencyMs: 0,
    lastSyncTime: Date.now(),
  },
  theme: "dark",
};

export function normalizeFrame(raw: unknown): FrameTelemetry {
  if (!raw || typeof raw !== "object") {
    return {
      frame_id: 0,
      timestamp_ms: Date.now(),
      match_clock_sec: 0,
      ball: {
        x: 52.5,
        y: 34.0,
        z: 0,
        velocity_mps: 0,
        speed_kmh: 0,
      },
      players: [],
      control_chaos: { control: 50, chaos: 50 },
      game_rhythm: "structured_possession",
      active_tactical_inflection: false,
    };
  }

  const r = raw as Record<string, unknown>;
  const metrics = r.metrics as Record<string, unknown> | undefined;
  const controlChaos = r.control_chaos as Record<string, unknown> | undefined;
  const latestNarrative = r.latestNarrative as Record<string, unknown> | undefined;

  // 1. Control vs Chaos
  // Read frame.metrics?.controlVsChaosIndex ?? frame.control_chaos?.control ?? 50 and chaos 100 - control
  const controlVal = metrics?.controlVsChaosIndex ?? controlChaos?.control ?? 50;
  const control = Math.round(Number(controlVal));
  const chaos = Math.round(
    Number(controlChaos?.chaos ?? (100 - control))
  );

  // 2. Ball
  const rawBall = (r.ball && typeof r.ball === "object" ? r.ball : {}) as Record<string, unknown>;
  const bvx = typeof rawBall.vx === "number" ? rawBall.vx : 0;
  const bvy = typeof rawBall.vy === "number" ? rawBall.vy : 0;
  const bVel = typeof rawBall.velocity_mps === "number"
    ? rawBall.velocity_mps
    : (rawBall.vx !== undefined && rawBall.vy !== undefined ? Math.hypot(bvx, bvy) : 0);
  const bSpeedKmh = typeof rawBall.speed_kmh === "number"
    ? rawBall.speed_kmh
    : (typeof rawBall.speedKmH === "number" ? Number(rawBall.speedKmH) : bVel * 3.6);
  const bCarrier = (rawBall.carrier_player_id ?? rawBall.possessionPlayerId ?? null) as string | null;

  const normalizedBall: BallKinematics = {
    x: typeof rawBall.x === "number" ? rawBall.x : 52.5,
    y: typeof rawBall.y === "number" ? rawBall.y : 34.0,
    z: typeof rawBall.z === "number" ? rawBall.z : 0,
    velocity_mps: bVel,
    speed_kmh: bSpeedKmh,
    carrier_player_id: bCarrier,
    vx: bvx,
    vy: bvy,
    vz: typeof rawBall.vz === "number" ? rawBall.vz : 0,
    speedKmH: bSpeedKmh,
    possessionTeam: (rawBall.possessionTeam as "home" | "away" | null) ?? null,
    possessionPlayerId: bCarrier,
  };

  // 3. Players
  const rawPlayers: unknown[] = Array.isArray(r.players) ? r.players : [];
  const normalizedPlayers: PlayerKinematics[] = rawPlayers.map((item) => {
    const p = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const pId = String(p.player_id ?? p.id ?? "");
    const pNum = Number(p.shirt_number ?? p.number ?? 0);
    const isCarrier = Boolean(p.is_ball_carrier ?? p.onBall ?? (bCarrier && bCarrier === pId));

    const vx = typeof p.vx === "number" ? p.vx : 0;
    const vy = typeof p.vy === "number" ? p.vy : 0;
    const hasCartesian = p.vx !== undefined && p.vy !== undefined;

    const velMps = typeof p.velocity_mps === "number"
      ? p.velocity_mps
      : (hasCartesian ? Math.hypot(vx, vy) : 0);
    const speedKmh = typeof p.speed_kmh === "number"
      ? p.speed_kmh
      : (typeof p.speedKmH === "number" ? Number(p.speedKmH) : velMps * 3.6);

    let headingDeg: number;
    if (typeof p.heading_deg === "number") {
      headingDeg = p.heading_deg;
    } else if (hasCartesian) {
      headingDeg = (Math.atan2(vy, vx) * 180) / Math.PI;
      if (isNaN(headingDeg)) headingDeg = 0;
    } else {
      headingDeg = 0;
    }

    return {
      player_id: pId,
      id: pId,
      name: String(p.name ?? ""),
      shortName: String(p.shortName ?? p.name ?? ""),
      team: p.team === "away" ? "away" : "home",
      shirt_number: pNum,
      number: pNum,
      position: String(p.position ?? "MID"),
      role: String(p.role ?? (p.position === "GK" ? "GK" : "MF")),
      x: typeof p.x === "number" ? p.x : 0,
      y: typeof p.y === "number" ? p.y : 0,
      vx,
      vy,
      velocity_mps: velMps,
      speed_kmh: speedKmh,
      speedKmH: speedKmh,
      heading_deg: headingDeg,
      is_ball_carrier: isCarrier,
      onBall: isCarrier,
      distanceMeters: typeof p.distanceMeters === "number" ? p.distanceMeters : 0,
      touches: typeof p.touches === "number" ? p.touches : 0,
      homeX: typeof p.homeX === "number" ? p.homeX : (typeof p.x === "number" ? p.x : 0),
      homeY: typeof p.homeY === "number" ? p.homeY : (typeof p.y === "number" ? p.y : 0),
      isDesignatedPlayerCam: Boolean(p.isDesignatedPlayerCam),
    };
  });

  const frameId = Number(r.frame_id ?? r.frameId ?? 0);
  const matchClockSec = Number(r.match_clock_sec ?? r.matchSeconds ?? 0);
  const gameRhythm = String(
    r.game_rhythm ??
    metrics?.gameRhythm ??
    (chaos < 45 ? "structured_possession" : "counter_attacking_transition")
  );
  const activeInflection = Boolean(
    r.active_tactical_inflection ??
    latestNarrative?.isTacticalInflectionPoint ??
    false
  );

  return {
    frame_id: frameId,
    timestamp_ms: Number(r.timestamp_ms ?? Date.now()),
    match_clock_sec: matchClockSec,
    ball: normalizedBall,
    players: normalizedPlayers,
    control_chaos: {
      control,
      chaos,
    },
    game_rhythm: gameRhythm,
    active_tactical_inflection: activeInflection,

    // Canonical fields compatibility
    frameId,
    matchClock: typeof r.matchClock === "string" ? r.matchClock : `${Math.floor(matchClockSec / 60)}:${Math.floor(matchClockSec % 60).toString().padStart(2, "0")}`,
    matchSeconds: matchClockSec,
    scenario: typeof r.scenario === "string" ? r.scenario : undefined,
    score: (r.score as { home: number; away: number }) ?? undefined,
    passingLanes: (r.passingLanes as PassingLane[]) ?? undefined,
    pitchControlCells: (r.pitchControlCells as PitchControlCell[]) ?? undefined,
    metrics: (metrics as unknown as MatchMetrics) ?? undefined,
    latestNarrative: (latestNarrative as unknown as NarrativeEvent) ?? undefined,
    agentTrace: (r.agentTrace as AgentTrace[]) ?? undefined,
  };
}

export function normalizeBlackboard(raw: unknown, current: TacticalBlackboard): TacticalBlackboard {
  if (!raw || typeof raw !== "object") return current;

  const r = raw as Record<string, unknown>;

  const latestFrameId = r.latest_frame_id !== undefined
    ? Number(r.latest_frame_id)
    : r.frame_id !== undefined
    ? Number(r.frame_id)
    : r.frameId !== undefined
    ? Number(r.frameId)
    : current.latest_frame_id;

  const currentGameRhythm = String(
    r.current_game_rhythm ?? r.game_rhythm ?? current.current_game_rhythm
  );

  let controlIndex = current.control_index;
  let chaosIndex = current.chaos_index;
  if (r.control_index !== undefined) {
    controlIndex = Math.round(Number(r.control_index));
    chaosIndex = Math.round(Number(r.chaos_index ?? (100 - controlIndex)));
  } else if (r.control_vs_chaos !== undefined) {
    chaosIndex = Math.round(Number(r.control_vs_chaos));
    controlIndex = 100 - chaosIndex;
  }

  let activeInflection = current.active_tactical_inflection;
  if (r.active_tactical_inflection !== undefined) {
    activeInflection = Boolean(r.active_tactical_inflection);
  } else if (Array.isArray(r.inflection_candidates)) {
    activeInflection = r.inflection_candidates.length > 0;
  }

  let latestPdr = current.latest_pdr;
  if (r.latest_pdr !== undefined) {
    latestPdr = Number(r.latest_pdr);
  } else if (r.pass_difficulty_rating !== undefined) {
    const rawPdr = Number(r.pass_difficulty_rating);
    latestPdr = rawPdr > 1.0 ? rawPdr / 100 : rawPdr;
  }

  let narrativeHeadline = current.narrative_headline;
  const narrative = r.narrative as Record<string, unknown> | string | undefined;
  const multiStream = r.multilingual_stream as Record<string, unknown> | undefined;

  if (typeof narrative === "string") {
    narrativeHeadline = narrative;
  } else if (narrative && typeof narrative === "object") {
    const nHead = narrative.headline as Record<string, unknown> | string | undefined;
    if (nHead && typeof nHead === "object" && typeof nHead.en === "string") {
      narrativeHeadline = nHead.en;
    } else if (typeof nHead === "string") {
      narrativeHeadline = nHead;
    }
  } else if (multiStream && typeof multiStream === "object") {
    const msHead = multiStream.headline as Record<string, unknown> | string | undefined;
    if (msHead && typeof msHead === "object" && typeof msHead.en === "string") {
      narrativeHeadline = msHead.en;
    }
  } else if (typeof r.narrative_headline === "string") {
    narrativeHeadline = r.narrative_headline;
  } else if (typeof r.headline === "string") {
    narrativeHeadline = r.headline;
  } else if (typeof r.narrative_arc === "string") {
    narrativeHeadline = r.narrative_arc;
  }

  const personaOverviews = r.persona_overviews as Record<string, string> | undefined;

  const analyst = String(
    r.analyst_context ??
    personaOverviews?.analyst ??
    current.persona_overviews.analyst
  );

  const casual = String(
    r.casual_context ??
    personaOverviews?.casual ??
    current.persona_overviews.casual
  );

  const playerCam = String(
    r.player_cam_context ??
    personaOverviews?.player_cam ??
    current.persona_overviews.player_cam
  );

  let clubCentric =
    personaOverviews?.club_centric ??
    current.persona_overviews.club_centric ??
    "";

  if (r.club_centric_context !== undefined) {
    if (typeof r.club_centric_context === "string") {
      clubCentric = r.club_centric_context;
    } else if (typeof r.club_centric_context === "object" && r.club_centric_context !== null) {
      const cc = r.club_centric_context as Record<string, unknown>;
      const homeFrame = String(cc.homeFrame || "");
      const awayFrame = String(cc.awayFrame || "");
      clubCentric = homeFrame && awayFrame ? `${homeFrame} | ${awayFrame}` : (homeFrame || awayFrame);
    }
  }

  return {
    latest_frame_id: latestFrameId,
    current_game_rhythm: currentGameRhythm,
    control_index: controlIndex,
    chaos_index: chaosIndex,
    active_tactical_inflection: activeInflection,
    latest_pdr: latestPdr,
    narrative_headline: narrativeHeadline,
    persona_overviews: {
      analyst,
      casual,
      player_cam: playerCam,
      club_centric: clubCentric,
    },
  };
}

class BaseMemoryStore {
  private state: BaseMemoryState = initialState;
  private listeners: Set<() => void> = new Set();

  getState = (): BaseMemoryState => {
    return this.state;
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  // --- Actions to update Base Memory from Server or UI ---

  updateFrame = (rawFrame: unknown) => {
    const frame = normalizeFrame(rawFrame);

    // Also sync match score if available in frame
    let updatedScore = this.state.score;
    if (frame.score && typeof frame.score.home === "number" && typeof frame.score.away === "number") {
      updatedScore = {
        ...this.state.score,
        homeScore: frame.score.home,
        awayScore: frame.score.away,
      };
    }

    this.state = {
      ...this.state,
      currentFrame: frame,
      matchClock: frame.match_clock_sec,
      score: updatedScore,
      blackboard: {
        ...this.state.blackboard,
        latest_frame_id: frame.frame_id,
        current_game_rhythm: frame.game_rhythm,
        control_index: frame.control_chaos.control,
        chaos_index: frame.control_chaos.chaos,
        active_tactical_inflection: frame.active_tactical_inflection,
      },
    };
    this.notify();
  };

  updateBlackboard = (blackboardUpdates: unknown) => {
    this.state = {
      ...this.state,
      blackboard: normalizeBlackboard(blackboardUpdates, this.state.blackboard),
    };
    this.notify();
  };

  setPersona = (persona: PersonaMode) => {
    this.state = {
      ...this.state,
      selectedPersona: persona,
    };
    this.notify();
  };

  setLanguage = (language: SupportedLanguage) => {
    this.state = {
      ...this.state,
      selectedLanguage: language,
    };
    this.notify();
  };

  setSelectedPlayer = (playerId: string | null) => {
    this.state = {
      ...this.state,
      selectedPlayerId: playerId,
    };
    this.notify();
  };

  setServerStatus = (status: Partial<ServerStatus>) => {
    this.state = {
      ...this.state,
      serverStatus: {
        ...this.state.serverStatus,
        ...status,
      },
    };
    this.notify();
  };

  setMatchClock = (sec: number) => {
    this.state = {
      ...this.state,
      matchClock: sec,
    };
    this.notify();
  };

  updateScore = (updates: Partial<MatchScore>) => {
    this.state = {
      ...this.state,
      score: {
        ...this.state.score,
        ...updates,
      },
    };
    this.notify();
  };

  setTheme = (theme: ThemeMode) => {
    this.state = {
      ...this.state,
      theme,
    };
    if (typeof document !== "undefined") {
      const isDark = theme === "dark";
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.toggle("ion-palette-dark", isDark);
      document.documentElement.setAttribute("data-theme", theme);
    }
    this.notify();
  };

  toggleTheme = () => {
    const nextTheme = this.state.theme === "dark" ? "light" : "dark";
    this.setTheme(nextTheme);
  };
}

export const baseMemory = new BaseMemoryStore();

/**
 * Universal React Hook connecting any screen or component to Single Base Memory
 */
export function useBaseMemory<T>(selector: (state: BaseMemoryState) => T): T {
  return useSyncExternalStore(
    baseMemory.subscribe,
    () => selector(baseMemory.getState()),
    () => selector(baseMemory.getState())
  );
}
