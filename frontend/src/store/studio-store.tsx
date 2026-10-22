'use client';

/**
 * The studio's Single Base Memory.
 *
 * One store holds every fact the studio renders. Cards subscribe to slices
 * of it; nothing renders from a private copy of the data. The store is
 * owned by a React context (see `StudioStoreProvider`) rather than being a
 * module-level singleton, because a module-level singleton in Next.js is
 * shared between server requests.
 *
 * The pattern is `useSyncExternalStore`: the store is the source of truth
 * and React is told when it changes.
 */

import { createContext, useContext, useRef, useSyncExternalStore } from 'react';
import type {
  BroadcastLanguage,
  ExperiencePersona,
  SyntheticScenarioType,
  TelemetryFrame,
} from '../types/telemetry';

export type ConnectionStatus = 'connecting' | 'live' | 'local' | 'offline';
export type ThemeMode = 'dark' | 'light';

/** How many published frames the studio keeps for the scrubber. */
export const FRAME_HISTORY_LIMIT = 240;

export interface StudioState {
  /** The frame on screen. */
  frame: TelemetryFrame | null;
  /** The rolling window of published frames, oldest first. */
  frames: TelemetryFrame[];
  /** Index of the frame on screen within `frames`. */
  cursor: number;
  scenario: SyntheticScenarioType;
  persona: ExperiencePersona;
  language: BroadcastLanguage;
  theme: ThemeMode;
  playing: boolean;
  selectedPlayerId: string | null;
  connection: ConnectionStatus;
  latencyMs: number;
  error: string | null;
}

export const initialStudioState: StudioState = {
  frame: null,
  frames: [],
  cursor: -1,
  scenario: 'high_possession',
  persona: 'analyst',
  language: 'en',
  theme: 'dark',
  playing: true,
  selectedPlayerId: null,
  connection: 'connecting',
  latencyMs: 0,
  error: null,
};

export class StudioStore {
  private state: StudioState = initialStudioState;
  private listeners = new Set<() => void>();

  getState = (): StudioState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private set(patch: Partial<StudioState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  /** Append a newly published frame. */
  pushFrame = (frame: TelemetryFrame): void => {
    const frames = [...this.state.frames, frame].slice(-FRAME_HISTORY_LIMIT);
    this.set({ frame, frames, cursor: frames.length - 1 });
  };

  setScenario = (scenario: SyntheticScenarioType): void => this.set({ scenario });

  setPersona = (persona: ExperiencePersona): void => this.set({ persona });

  setLanguage = (language: BroadcastLanguage): void => this.set({ language });

  setTheme = (theme: ThemeMode): void => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.classList.toggle('light', theme === 'light');
      root.classList.toggle('dark', theme === 'dark');
      root.setAttribute('data-theme', theme);
    }
    this.set({ theme });
  };

  toggleTheme = (): void => {
    this.setTheme(this.state.theme === 'dark' ? 'light' : 'dark');
  };

  togglePlaying = (): void => this.set({ playing: !this.state.playing });

  setPlaying = (playing: boolean): void => this.set({ playing });

  selectPlayer = (selectedPlayerId: string | null): void =>
    this.set({ selectedPlayerId });

  /** Move the scrubber. The frame on screen follows the cursor. */
  setCursor = (cursor: number): void => {
    const clamped = Math.max(0, Math.min(this.state.frames.length - 1, cursor));
    if (clamped < 0) return;
    this.set({ cursor: clamped, frame: this.state.frames[clamped] });
  };

  setConnection = (connection: ConnectionStatus, latencyMs = 0): void =>
    this.set({ connection, latencyMs });

  setError = (error: string | null): void => this.set({ error });
}

/* ------------------------------------------------------------------ */
/* React binding                                                       */
/* ------------------------------------------------------------------ */

const StudioStoreContext = createContext<StudioStore | null>(null);

export function StudioStoreProvider({
  children,
  store,
}: {
  children: React.ReactNode;
  store?: StudioStore;
}) {
  const ref = useRef<StudioStore | null>(null);
  if (ref.current === null) ref.current = store ?? new StudioStore();
  return (
    <StudioStoreContext.Provider value={ref.current}>
      {children}
    </StudioStoreContext.Provider>
  );
}

/**
 * Subscribe to a slice of the studio store.
 *
 * The selector must return a stable value for unchanged state — return a
 * primitive or a memoised object, never a fresh object literal, or React
 * will re-render on every publication.
 */
export function useStudioStore<T>(selector: (state: StudioState) => T): T {
  const store = useContext(StudioStoreContext);
  if (!store) {
    throw new Error('useStudioStore must be used inside a StudioStoreProvider');
  }
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  );
}

/** The whole state. Prefer `useStudioStore` with a narrow selector. */
export function useStudio(): StudioState {
  return useStudioStore((state) => state);
}

export function useStudioActions(): StudioStore {
  const store = useContext(StudioStoreContext);
  if (!store) {
    throw new Error('useStudioActions must be used inside a StudioStoreProvider');
  }
  return store;
}
