import type { ConnectionStatus } from '../../store/studio-store';

/**
 * How the Tiered Fast-Path latencies are worded on screen.
 *
 * Two facts have to be said that a bare number does not say, and getting
 * either of them wrong misrepresents the system to a judge:
 *
 *  - The browser coarsens `performance.now()` to about a millisecond, which
 *    is coarser than one frame of deterministic metric computation. A single
 *    frame's delta therefore reads as `0.00 ms`, which looks like a broken
 *    readout rather than a fast one. The in-browser engine reports the mean
 *    over the last thirty published frames instead, and the studio says so.
 *
 *  - When the studio is running the in-browser simulation, the Tier 2 figure
 *    is the cost of the rule-based fallback, not of the Azure agent swarm.
 *    Labelling it "agent reasoning" would claim a capability the browser
 *    does not have.
 */

/** The number of published frames the browser-side latency mean covers. */
export const LATENCY_WINDOW_FRAMES = 30;

/** The label for the Tier 1 readout. */
export const FAST_PATH_LABEL = 'Tier 1 · deterministic metrics';

/**
 * The label for the Tier 2 readout.
 *
 * The Azure agent swarm only runs behind the backend's WebSocket. In the
 * browser the narrative layer is the rule-based fallback, and the label
 * has to say which one produced the number.
 */
export function agentLabel(connection: ConnectionStatus): string {
  return connection === 'live'
    ? 'Tier 2 · agent reasoning'
    : 'Tier 2 · local rule-based fallback';
}

/**
 * The footnote under the two latencies.
 *
 * The wording differs by source because the measurement differs: the browser
 * engine reports a windowed mean, the backend reports a per-frame
 * measurement taken with a nanosecond-resolution clock.
 */
export function latencyNote(connection: ConnectionStatus): string {
  return connection === 'live'
    ? 'Latency is measured at the source, not asserted. Tier 1 is the deterministic metric pass; Tier 2 is the four-agent swarm.'
    : `Latency is measured, not asserted. The browser clock is coarser than one frame, so these are means over the last ${LATENCY_WINDOW_FRAMES} published frames.`;
}
