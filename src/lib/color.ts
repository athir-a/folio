/** Small colour helpers (hex <-> hsl) used for book spines and UI accents. */

export type HSL = { h: number; s: number; l: number };

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: h * 60, s, l };
}

export function hslToHex({ h, s, l }: HSL): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
}

/** Lighten (amt > 0) or darken (amt < 0) a hex colour. */
export function shade(hex: string, amt: number): string {
  const hsl = rgbToHsl(...hexToRgb(hex));
  return hslToHex({ ...hsl, l: Math.max(0, Math.min(1, hsl.l + amt)) });
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Bright-but-cozy palette used when a cover has no strong colour of its own. */
export const COZY_PALETTE = [
  '#ff6f59', // coral
  '#f2b134', // mustard
  '#2ec4b6', // teal
  '#ff8fab', // pink
  '#9b5de5', // violet
  '#ff9f1c', // orange
  '#43aa8b', // leaf green
  '#e63946', // cherry
  '#4cc9f0', // sky
  '#f15bb5', // magenta
];

/** Push any hue into a saturated, friendly range so spines always look lively. */
export function cozify(hue: number): string {
  return hslToHex({ h: hue, s: 0.72, l: 0.56 });
}
