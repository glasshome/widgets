/**
 * Deterministic pseudo-random sequence used by every scene to lay out particles.
 * Same `n` and `salt` always produce the same numbers — so component re-renders
 * never re-shuffle the rain, and Solid's reactivity stays clean (no Math.random
 * in JSX).
 *
 * Output: array of length `n` with values in [0, 1).
 */
export function seed(n: number, salt = 1): number[] {
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const r = Math.sin((i + 1) * 12.9898 * salt) * 43758.5453;
    out[i] = r - Math.floor(r);
  }
  return out;
}

/**
 * Combine multiple deterministic streams for a single particle.
 * Avoids correlation artefacts when one array drives several visual properties.
 */
export function streams(n: number, ...salts: number[]): number[][] {
  return salts.map((s) => seed(n, s));
}
