export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
export const easeInQuad = (t: number) => t * t;
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export const easeOutBack = (t: number, s = 2.2) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2;

export const easeOutElastic = (t: number) =>
  t === 0 || t === 1 ? t : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;

/** Progress of `t` inside the [start, end] window, clamped to 0..1. */
export const phase = (t: number, start: number, end: number) => clamp01((t - start) / (end - start));
