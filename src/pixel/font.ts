/**
 * A tiny 5×7 bitmap font, drawn pixel by pixel so text stays perfectly crisp
 * when the canvas is scaled up. Letters are upper-case only (retro style).
 */

const GLYPHS: Record<string, string[]> = {
  A: [' ### ', '#   #', '#   #', '#####', '#   #', '#   #', '#   #'],
  B: ['#### ', '#   #', '#   #', '#### ', '#   #', '#   #', '#### '],
  C: [' ### ', '#   #', '#    ', '#    ', '#    ', '#   #', ' ### '],
  D: ['#### ', '#   #', '#   #', '#   #', '#   #', '#   #', '#### '],
  E: ['#####', '#    ', '#    ', '#### ', '#    ', '#    ', '#####'],
  F: ['#####', '#    ', '#    ', '#### ', '#    ', '#    ', '#    '],
  G: [' ### ', '#   #', '#    ', '# ###', '#   #', '#   #', ' ####'],
  H: ['#   #', '#   #', '#   #', '#####', '#   #', '#   #', '#   #'],
  I: ['###', ' # ', ' # ', ' # ', ' # ', ' # ', '###'],
  J: ['  ###', '   # ', '   # ', '   # ', '   # ', '#  # ', ' ##  '],
  K: ['#   #', '#  # ', '# #  ', '##   ', '# #  ', '#  # ', '#   #'],
  L: ['#    ', '#    ', '#    ', '#    ', '#    ', '#    ', '#####'],
  M: ['#   #', '## ##', '# # #', '# # #', '#   #', '#   #', '#   #'],
  N: ['#   #', '#   #', '##  #', '# # #', '#  ##', '#   #', '#   #'],
  O: [' ### ', '#   #', '#   #', '#   #', '#   #', '#   #', ' ### '],
  P: ['#### ', '#   #', '#   #', '#### ', '#    ', '#    ', '#    '],
  Q: [' ### ', '#   #', '#   #', '#   #', '# # #', '#  # ', ' ## #'],
  R: ['#### ', '#   #', '#   #', '#### ', '# #  ', '#  # ', '#   #'],
  S: [' ####', '#    ', '#    ', ' ### ', '    #', '    #', '#### '],
  T: ['#####', '  #  ', '  #  ', '  #  ', '  #  ', '  #  ', '  #  '],
  U: ['#   #', '#   #', '#   #', '#   #', '#   #', '#   #', ' ### '],
  V: ['#   #', '#   #', '#   #', '#   #', '#   #', ' # # ', '  #  '],
  W: ['#   #', '#   #', '#   #', '# # #', '# # #', '# # #', ' # # '],
  X: ['#   #', '#   #', ' # # ', '  #  ', ' # # ', '#   #', '#   #'],
  Y: ['#   #', '#   #', ' # # ', '  #  ', '  #  ', '  #  ', '  #  '],
  Z: ['#####', '    #', '   # ', '  #  ', ' #   ', '#    ', '#####'],
  '0': [' ### ', '#   #', '#  ##', '# # #', '##  #', '#   #', ' ### '],
  '1': [' # ', '## ', ' # ', ' # ', ' # ', ' # ', '###'],
  '2': [' ### ', '#   #', '    #', '   # ', '  #  ', ' #   ', '#####'],
  '3': ['#####', '   # ', '  #  ', '   # ', '    #', '#   #', ' ### '],
  '4': ['   # ', '  ## ', ' # # ', '#  # ', '#####', '   # ', '   # '],
  '5': ['#####', '#    ', '#### ', '    #', '    #', '#   #', ' ### '],
  '6': ['  ## ', ' #   ', '#    ', '#### ', '#   #', '#   #', ' ### '],
  '7': ['#####', '    #', '   # ', '  #  ', ' #   ', ' #   ', ' #   '],
  '8': [' ### ', '#   #', '#   #', ' ### ', '#   #', '#   #', ' ### '],
  '9': [' ### ', '#   #', '#   #', ' ####', '    #', '   # ', ' ##  '],
  ' ': ['   ', '   ', '   ', '   ', '   ', '   ', '   '],
  '.': [' ', ' ', ' ', ' ', ' ', ' ', '#'],
  ',': ['  ', '  ', '  ', '  ', '  ', ' #', '# '],
  ':': [' ', '#', ' ', ' ', ' ', '#', ' '],
  ';': ['  ', ' #', '  ', '  ', '  ', ' #', '# '],
  '!': ['#', '#', '#', '#', '#', ' ', '#'],
  '?': [' ### ', '#   #', '    #', '   # ', '  #  ', '     ', '  #  '],
  "'": ['#', '#', ' ', ' ', ' ', ' ', ' '],
  '"': ['# #', '# #', '   ', '   ', '   ', '   ', '   '],
  '-': ['    ', '    ', '    ', '####', '    ', '    ', '    '],
  '+': ['     ', '  #  ', '  #  ', '#####', '  #  ', '  #  ', '     '],
  '&': [' ##  ', '#  # ', '# #  ', ' #   ', '# # #', '#  # ', ' ## #'],
  '(': [' #', '# ', '# ', '# ', '# ', '# ', ' #'],
  ')': ['# ', ' #', ' #', ' #', ' #', ' #', '# '],
  '/': ['    #', '    #', '   # ', '  #  ', ' #   ', '#    ', '#    '],
  '#': [' # # ', ' # # ', '#####', ' # # ', '#####', ' # # ', ' # # '],
  '…': ['     ', '     ', '     ', '     ', '     ', '     ', '# # #'],
};

export const GLYPH_HEIGHT = 7;
const SPACING = 1;

function glyph(ch: string) {
  return GLYPHS[ch] ?? GLYPHS[ch.toUpperCase()] ?? GLYPHS['?'];
}

/** Normalises text for the font: accents stripped, unknown characters become '?'. */
export function pixelText(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
}

export function textWidth(text: string, scale = 1) {
  let w = 0;
  for (const ch of pixelText(text)) w += (glyph(ch)[0].length + SPACING) * scale;
  return Math.max(0, w - SPACING * scale);
}

/** Draws horizontal text with its top-left at (x, y). */
export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, scale = 1) {
  ctx.fillStyle = color;
  let cx = Math.round(x);
  for (const ch of pixelText(text)) {
    const rows = glyph(ch);
    rows.forEach((row, gy) => {
      for (let gx = 0; gx < row.length; gx++) {
        if (row[gx] === '#') ctx.fillRect(cx + gx * scale, Math.round(y) + gy * scale, scale, scale);
      }
    });
    cx += (rows[0].length + SPACING) * scale;
  }
}

/** Centred horizontal text, optionally with a 1px drop shadow. */
export function drawTextCentred(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, color: string, scale = 1, shadow?: string) {
  const x = Math.round(cx - textWidth(text, scale) / 2);
  if (shadow) drawText(ctx, text, x + scale, y + scale, shadow, scale);
  drawText(ctx, text, x, y, color, scale);
}

/** Shortens a title to fit `maxChars`, ending with an ellipsis. */
export function fitTitle(title: string, maxChars: number) {
  const t = pixelText(title).replace(/\s+/g, ' ').trim();
  if (t.length <= maxChars) return t;
  if (maxChars <= 1) return t.slice(0, maxChars);
  return `${t.slice(0, maxChars - 1).trimEnd()}…`;
}

/* ---------- compact 3×5 font for long titles on narrow spines ---------- */

const SMALL: Record<string, string[]> = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  B: ['##.', '#.#', '##.', '#.#', '##.'],
  C: ['.##', '#..', '#..', '#..', '.##'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'],
  F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'],
  H: ['#.#', '#.#', '###', '#.#', '#.#'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  J: ['..#', '..#', '..#', '#.#', '.#.'],
  K: ['#.#', '#.#', '##.', '#.#', '#.#'],
  L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
  N: ['#..#', '##.#', '#.##', '#..#', '#..#'],
  O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  P: ['##.', '#.#', '##.', '#..', '#..'],
  Q: ['.#.', '#.#', '#.#', '##.', '.##'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'],
  V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
  W: ['#...#', '#...#', '#.#.#', '##.##', '#...#'],
  X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
  Z: ['###', '..#', '.#.', '#..', '###'],
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['##.', '..#', '.#.', '#..', '###'],
  '3': ['##.', '..#', '.#.', '..#', '##.'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '##.', '..#', '##.'],
  '6': ['.##', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '.#.', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '##.'],
  ' ': ['..', '..', '..', '..', '..'],
  '.': ['.', '.', '.', '.', '#'],
  ',': ['.', '.', '.', '#', '#'],
  ':': ['.', '#', '.', '#', '.'],
  ';': ['.', '#', '.', '#', '#'],
  '!': ['#', '#', '#', '.', '#'],
  '?': ['##.', '..#', '.#.', '...', '.#.'],
  "'": ['#', '#', '.', '.', '.'],
  '"': ['#.#', '#.#', '...', '...', '...'],
  '-': ['...', '...', '###', '...', '...'],
  '+': ['...', '.#.', '###', '.#.', '...'],
  '&': ['.#.', '#.#', '.#.', '#.#', '.##'],
  '(': ['.#', '#.', '#.', '#.', '.#'],
  ')': ['#.', '.#', '.#', '.#', '#.'],
  '/': ['..#', '..#', '.#.', '#..', '#..'],
  '#': ['#.#', '###', '#.#', '###', '#.#'],
  '…': ['...', '...', '...', '...', '#.#'],
};

export interface PixelFont {
  height: number;
  glyph: (ch: string) => string[];
}

/** The regular 5×7 font. */
export const FONT: PixelFont = { height: GLYPH_HEIGHT, glyph };
/** The compact 3×5 font. */
export const SMALL_FONT: PixelFont = { height: 5, glyph: (ch) => SMALL[ch] ?? SMALL[ch.toUpperCase()] ?? SMALL['?'] };

/** Length along the text direction, in pixels. */
export function measure(text: string, font: PixelFont) {
  let len = 0;
  for (const ch of pixelText(text)) len += font.glyph(ch)[0].length + SPACING;
  return Math.max(0, len - SPACING);
}

/** Shortens text (with an ellipsis) until it is no longer than `maxLength` pixels in `font`. */
export function fitToLength(text: string, maxLength: number, font: PixelFont) {
  const t = pixelText(text).replace(/\s+/g, ' ').trim();
  if (measure(t, font) <= maxLength) return { text: t, complete: true };
  let cut = t;
  while (cut.length > 0 && measure(`${cut.trimEnd()}…`, font) > maxLength) cut = cut.slice(0, -1);
  return { text: cut.length ? `${cut.trimEnd()}…` : '', complete: false };
}

/**
 * Breaks text between words into at most `maxLines` lines of no more than
 * `maxLength` pixels. Whatever doesn't fit is cut with an ellipsis, and
 * `complete` says whether the whole text made it.
 */
export function wrapToLength(text: string, maxLength: number, font: PixelFont, maxLines: number) {
  const words = pixelText(text).replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let i = 0;
  while (i < words.length && lines.length < maxLines) {
    let line = words[i++];
    while (i < words.length && measure(`${line} ${words[i]}`, font) <= maxLength) line += ` ${words[i++]}`;
    lines.push(line);
  }
  if (i < words.length) lines[lines.length - 1] += ` ${words.slice(i).join(' ')}`;
  let complete = true;
  const fitted = lines.map((line) => {
    const fit = fitToLength(line, maxLength, font);
    complete &&= fit.complete;
    return fit.text;
  });
  return { lines: fitted, complete };
}

/**
 * Vertical text reading top-to-bottom, like an English book spine: each glyph
 * is turned a quarter clockwise. (x, y) is the top-left of the column, which is
 * `font.height * scale` pixels wide.
 */
export function drawVertical(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, font: PixelFont, scale = 1) {
  ctx.fillStyle = color;
  let cy = Math.round(y);
  for (const ch of pixelText(text)) {
    const rows = font.glyph(ch);
    rows.forEach((row, gy) => {
      for (let gx = 0; gx < row.length; gx++) {
        if (row[gx] === '#') ctx.fillRect(Math.round(x) + (font.height - 1 - gy) * scale, cy + gx * scale, scale, scale);
      }
    });
    cy += (rows[0].length + SPACING) * scale;
  }
}
