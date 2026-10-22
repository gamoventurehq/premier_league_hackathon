import { useSyncExternalStore } from "react";
import {
  FrameTelemetry,
  TacticalBlackboard,
  PersonaMode,
  SupportedLanguage,
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

  updateFrame = (frame: FrameTelemetry) => {
    this.state = {
      ...this.state,
      currentFrame: frame,
      matchClock: frame.match_clock_sec,
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

  updateBlackboard = (blackboardUpdates: Partial<TacticalBlackboard>) => {
    this.state = {
      ...this.state,
      blackboard: {
        ...this.state.blackboard,
        ...blackboardUpdates,
      },
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
