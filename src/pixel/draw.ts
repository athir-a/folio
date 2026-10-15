/** Low-level pixel drawing helpers. All coordinates are in canvas (art) pixels. */

export type Ctx = CanvasRenderingContext2D;

export function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function outline(ctx: Ctx, x: number, y: number, w: number, h: number, color: string) {
  rect(ctx, x, y, w, 1, color);
  rect(ctx, x, y + h - 1, w, 1, color);
  rect(ctx, x, y, 1, h, color);
  rect(ctx, x + w - 1, y, 1, h, color);
}

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/** Fills a rect with `b` dithered over `a` at the given coverage (0..1), retro style. */
export function dither(ctx: Ctx, x: number, y: number, w: number, h: number, a: string, b: string, amount: number) {
  rect(ctx, x, y, w, h, a);
  ctx.fillStyle = b;
  const t = amount * 16;
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      if (BAYER[(y + yy) & 3][(x + xx) & 3] < t) ctx.fillRect(x + xx, y + yy, 1, 1);
    }
  }
}

/** Vertical gradient through a list of colours, in dithered bands. */
export function bandedGradient(ctx: Ctx, x: number, y: number, w: number, h: number, colors: string[]) {
  const steps = colors.length - 1;
  const band = h / steps;
  for (let i = 0; i < steps; i++) {
    const y0 = Math.round(y + i * band);
    const y1 = Math.round(y + (i + 1) * band);
    const half = Math.round((y1 - y0) / 2);
    rect(ctx, x, y0, w, half, colors[i]);
    dither(ctx, x, y0 + half, w, y1 - y0 - half, colors[i], colors[i + 1], 0.5);
  }
}

/** Filled pixel circle (no anti-aliasing). */
export function disc(ctx: Ctx, cx: number, cy: number, r: number, color: string) {
  ctx.fillStyle = color;
  for (let y = -r; y <= r; y++) {
    const half = Math.floor(Math.sqrt(r * r - y * y));
    ctx.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2 + 1, 1);
  }
}

/**
 * A soft pool of light drawn as a few hard-edged rings (banded, like old
 * games), added on top of what's already there.
 */
export function glow(ctx: Ctx, cx: number, cy: number, radius: number, color: string, strength = 0.18, rings = 4) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = strength;
  for (let i = 0; i < rings; i++) disc(ctx, cx, cy, Math.round(radius * (1 - i / rings)), color);
  ctx.restore();
}

/** Elliptical light pool on the floor. */
export function floorGlow(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, color: string, strength = 0.12, rings = 3) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = strength;
  ctx.fillStyle = color;
  for (let i = 0; i < rings; i++) {
    const k = 1 - i / rings;
    const a = rx * k;
    const b = ry * k;
    for (let y = -Math.floor(b); y <= Math.floor(b); y++) {
      const half = Math.floor(a * Math.sqrt(1 - (y * y) / (b * b)));
      ctx.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2 + 1, 1);
    }
  }
  ctx.restore();
}

/** Half-width of a pointed (gothic) arch at height `dy` above its springing line. */
export function archHalfWidth(halfWidth: number, rise: number, dy: number) {
  // two arcs of radius r centred inside the opening, meeting at the apex
  const r = (halfWidth * halfWidth + rise * rise) / (2 * halfWidth);
  const cx = halfWidth - r; // centre of the right-hand arc (negative)
  const x = cx + Math.sqrt(Math.max(0, r * r - dy * dy));
  return Math.max(0, x);
}

/** Deterministic PRNG so decoration looks the same on every visit. */
export function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Lighten/darken a hex colour by a fraction, in plain RGB. */
export function tint(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(amount >= 0 ? v + (255 - v) * amount : v * (1 + amount))));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
