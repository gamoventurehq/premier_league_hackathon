'use client';

/**
 * The studio's provider.
 *
 * This component owns the two long-lived objects the studio needs:
 *
 *  - a `StudioStore` (the Single Base Memory), and
 *  - a `TelemetryClient`, which talks to the Azure-native FastAPI backend
 *    over a WebSocket and falls back to the real `MatchSimulationEngine`
 *    running in the browser when that backend is not reachable.
 *
 * Both are created inside `useRef` rather than at module scope: a
 * module-level singleton would be shared between server requests, which
 * is exactly the bug the store's own documentation warns about.
 */

import { useEffect, useRef } from 'react';

import { TelemetryClient } from '../../services/telemetry-client';
import { StudioStore, StudioStoreProvider } from '../../store/studio-store';

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<StudioStore | null>(null);
  if (storeRef.current === null) storeRef.current = new StudioStore();
  const store = storeRef.current;

  const clientRef = useRef<TelemetryClient | null>(null);
  if (clientRef.current === null) clientRef.current = new TelemetryClient(store);
  const client = clientRef.current;

  // The client is started once, when the studio mounts, and stopped when
  // it unmounts, so a navigation away from /studio tears down the socket
  // and the local simulation timer.
  useEffect(() => {
    // Sync the persisted theme onto the document root. The store owns the
    // class list; this only makes the initial state authoritative.
    store.setTheme(store.getState().theme);
    client.start();
    return () => {
      client.stop();
    };
  }, [client, store]);

  // A Synthetic Match Scenario is a property of the simulation, not just
  // of the label. When the store's scenario changes, the running engine
  // is told to switch too, so the numbers on screen always belong to the
  // scenario that is selected.
  useEffect(() => {
    const applied = { current: store.getState().scenario };
    const unsubscribe = store.subscribe(() => {
      const next = store.getState().scenario;
      if (next === applied.current) return;
      applied.current = next;
      client.setScenario(next);
    });
    return unsubscribe;
  }, [client, store]);

  return <StudioStoreProvider store={store}>{children}</StudioStoreProvider>;
}
