/**
 * Deterministic pseudo-random number generator (mulberry32).
 *
 * The synthetic match must be reproducible: the same seed always produces the
 * same match, so a narrated moment can be cited and re-verified.
 */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform float in [min, max). */
export function range(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** Integer in [min, max]. */
export function intRange(rng: () => number, min: number, max: number): number {
  return Math.floor(range(rng, min, max + 1));
}

/** Pick one element uniformly. */
export function pick<T>(rng: () => number, items: T[]): T {
  return items[Math.floor(rng() * items.length) % items.length];
}
