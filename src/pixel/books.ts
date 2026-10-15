import { BOOK_COLOURS } from './palette';

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const snapCache = new Map<string, string>();

/** Snaps any colour to the nearest colour in the book palette, keeping the art coherent. */
export function snapColour(hex: string) {
  const cached = snapCache.get(hex);
  if (cached) return cached;
  const [r, g, b] = rgb(hex);
  let best = BOOK_COLOURS[0];
  let bestD = Infinity;
  for (const c of BOOK_COLOURS) {
    const [cr, cg, cb] = rgb(c);
    // weighted RGB distance, close enough to perceptual for a small palette
    const d = 2 * (r - cr) ** 2 + 4 * (g - cg) ** 2 + 3 * (b - cb) ** 2;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  snapCache.set(hex, best);
  return best;
}
