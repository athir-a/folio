/**
 * Pixel-art props shared by the scenes. Each function draws one object at the
 * given position; animated ones take the current time `t` (seconds).
 */
import { archHalfWidth, bandedGradient, disc, dither, floorGlow, glow, outline, rect, seeded, tint, type Ctx } from './draw';
import { OLD_BINDINGS, P } from './palette';

/** Candle flicker in 0.85..1.15, different per `seed`. */
export function flicker(t: number, seed = 0) {
  return 1 + Math.sin(t * 11 + seed) * 0.06 + Math.sin(t * 6.3 + seed * 2) * 0.05 + Math.sin(t * 23.7 + seed * 3) * 0.03;
}

/** Wood panelling across a wall area, with a skirting board at the bottom. */
export function panelledWall(ctx: Ctx, x: number, y: number, w: number, h: number) {
  rect(ctx, x, y, w, h, P.wood1);
  for (let px = x + 2; px < x + w; px += 26) {
    rect(ctx, px, y, 1, h, P.wood0);
    rect(ctx, px + 1, y, 1, h, P.wood2);
  }
  // dado rail and wainscot
  const dado = y + Math.round(h * 0.68);
  rect(ctx, x, dado, w, 2, P.wood3);
  rect(ctx, x, dado + 2, w, 1, P.wood0);
  for (let px = x + 5; px < x + w - 18; px += 26) outline(ctx, px, dado + 6, 18, h - (dado - y) - 12, P.wood0);
  rect(ctx, x, y + h - 4, w, 4, P.wood2);
  rect(ctx, x, y + h - 4, w, 1, P.wood3);
}

/** Wooden floorboards in perspective-free rows with staggered joints. */
export function floorboards(ctx: Ctx, x: number, y: number, w: number, h: number) {
  rect(ctx, x, y, w, h, P.wood3);
  const rand = seeded(17);
  for (let row = 0, py = y; py < y + h; row++, py += 5 + Math.floor(row / 3)) {
    rect(ctx, x, py, w, 1, P.wood2);
    let px = x - Math.floor(rand() * 40);
    while (px < x + w) {
      px += 30 + Math.floor(rand() * 30);
      rect(ctx, px, py, 1, 5 + Math.floor(row / 3), P.wood2);
    }
    if (row % 2 === 0) rect(ctx, x, py + 1, w, 1, tint(P.wood3, 0.06));
  }
}

/**
 * A walnut bookcase. With `fill`, its shelves are packed with old books.
 * Returns the y of each shelf's top surface so callers can place things.
 */
export function bookcase(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  rows: number,
  opts: { fill?: boolean; seed?: number; light?: boolean } = {},
) {
  const side = 3;
  const top = 4;
  const base = 4;
  const shelfY: number[] = [];
  const frame = opts.light ? P.wood5 : P.wood4;
  // back panel with vertical boards
  rect(ctx, x, y, w, h, P.wood1);
  for (let px = x + side + 5; px < x + w - side; px += 7) rect(ctx, px, y + top, 1, h - top - base, P.wood0);
  const inner = h - top - base;
  const rowH = inner / rows;
  const rand = seeded(opts.seed ?? 1);
  for (let r = 0; r < rows; r++) {
    const floor = Math.round(y + top + rowH * (r + 1)) - 2;
    shelfY.push(floor);
    if (opts.fill) fillRow(ctx, x + side + 1, floor, w - side * 2 - 2, Math.round(rowH) - 3, rand);
    // board
    rect(ctx, x + side, floor, w - side * 2, 2, frame);
    rect(ctx, x + side, floor, w - side * 2, 1, tint(frame, 0.18));
    rect(ctx, x + side, floor + 2, w - side * 2, 1, P.wood0);
  }
  // sides, crown and plinth
  rect(ctx, x, y, side, h, frame);
  rect(ctx, x + w - side, y, side, h, frame);
  rect(ctx, x, y, 1, h, tint(frame, 0.2));
  rect(ctx, x + w - 1, y, 1, h, tint(frame, -0.35));
  rect(ctx, x - 2, y - 2, w + 4, top + 1, frame);
  rect(ctx, x - 2, y - 2, w + 4, 1, tint(frame, 0.25));
  rect(ctx, x - 2, y + top - 2, w + 4, 1, P.wood0);
  rect(ctx, x, y + h - base, w, base, tint(frame, -0.2));
  return shelfY;
}

/** Packs one shelf with small antique books: varied heights, the odd gap or leaning volume. */
function fillRow(ctx: Ctx, x: number, floor: number, w: number, maxH: number, rand: () => number) {
  let px = x;
  while (px < x + w - 2) {
    const roll = rand();
    if (roll < 0.05) {
      px += 2 + Math.floor(rand() * 4);
      continue;
    }
    const bw = 2 + Math.floor(rand() * 3);
    if (px + bw > x + w) break;
    const bh = Math.max(4, Math.round(maxH * (0.55 + rand() * 0.42)));
    const c = OLD_BINDINGS[Math.floor(rand() * OLD_BINDINGS.length)];
    rect(ctx, px, floor - bh, bw, bh, c);
    rect(ctx, px, floor - bh, 1, bh, tint(c, 0.18));
    if (bw > 2) rect(ctx, px + bw - 1, floor - bh, 1, bh, tint(c, -0.35));
    if (rand() < 0.5) rect(ctx, px, floor - bh + 2, bw, 1, P.goldDark);
    px += bw + (rand() < 0.15 ? 1 : 0);
  }
}

/** Night sky seen through the great window: gradient, stars, moon, mountains and a twinkling city. */
export function windowView(ctx: Ctx, cx: number, top: number, bottom: number, halfW: number, rise: number, t: number) {
  const spring = top + rise;
  // clip to the pointed arch
  ctx.save();
  ctx.beginPath();
  for (let y = top; y <= bottom; y++) {
    const hw = y < spring ? Math.floor(archHalfWidth(halfW, rise, spring - y)) : halfW;
    ctx.rect(cx - hw, y, hw * 2, 1);
  }
  ctx.clip();
  bandedGradient(ctx, cx - halfW, top, halfW * 2, bottom - top, [P.night0, P.night1, P.night2, P.night3, P.night4]);
  // stars
  const rand = seeded(5);
  for (let i = 0; i < 70; i++) {
    const sx = cx - halfW + Math.floor(rand() * halfW * 2);
    const sy = top + Math.floor(rand() * (bottom - top) * 0.7);
    const phase = rand() * 10;
    const tw = Math.sin(t * (1 + rand() * 2) + phase);
    if (tw > -0.3) rect(ctx, sx, sy, 1, 1, tw > 0.75 ? P.star : P.night6);
    if (tw > 0.97) {
      rect(ctx, sx - 1, sy, 3, 1, P.night6);
      rect(ctx, sx, sy - 1, 1, 3, P.night6);
      rect(ctx, sx, sy, 1, 1, P.star);
    }
  }
  // crescent moon
  const mx = cx + Math.round(halfW * 0.45);
  const my = top + Math.round(rise * 0.75);
  glow(ctx, mx, my, 12, P.night6, 0.08, 3);
  disc(ctx, mx, my, 5, P.moon);
  disc(ctx, mx + 2, my - 1, 4, P.night2);
  // mountains: far range with moonlit snow, then a darker near range
  const ridge = (base: number, amp: number, freq: number, color: string, snow?: string) => {
    for (let px = cx - halfW; px < cx + halfW; px++) {
      const k = px * freq;
      const hgt = Math.round(amp * (0.55 + 0.45 * Math.abs(Math.sin(k)) * Math.abs(Math.cos(k * 0.37 + 1))));
      rect(ctx, px, base - hgt, 1, bottom - base + hgt, color);
      if (snow && hgt > amp * 0.75) rect(ctx, px, base - hgt, 1, 2, snow);
    }
  };
  ridge(bottom - 26, 22, 0.09, P.night3, P.night6);
  ridge(bottom - 16, 12, 0.13, P.night2);
  // the city: dark rooftops speckled with warm windows that twinkle
  rect(ctx, cx - halfW, bottom - 10, halfW * 2, 10, P.night1);
  const city = seeded(9);
  for (let i = 0; i < 40; i++) {
    const lx = cx - halfW + Math.floor(city() * halfW * 2);
    const ly = bottom - 9 + Math.floor(city() * 8);
    const on = Math.sin(t * 0.7 + i * 1.7) > -0.6;
    if (on) rect(ctx, lx, ly, 1, 1, city() > 0.2 ? P.lamp : P.night6);
  }
  ctx.restore();
}

/** Iron frame and tracery for the arched window. */
export function windowFrame(ctx: Ctx, cx: number, top: number, bottom: number, halfW: number, rise: number) {
  const spring = top + rise;
  const color = P.wood0;
  for (let y = top; y <= bottom; y++) {
    const hw = y < spring ? Math.floor(archHalfWidth(halfW, rise, spring - y)) : halfW;
    rect(ctx, cx - hw - 2, y, 2, 1, color);
    rect(ctx, cx + hw, y, 2, 1, color);
    // two pointed lancets in the head of the arch
    if (y >= spring - 8 && y < spring + 2) {
      const lw = Math.floor(archHalfWidth(halfW / 2, 10, Math.max(0, spring + 2 - y)));
      rect(ctx, cx - halfW / 2 - lw, y, 1, 1, color);
      rect(ctx, cx - halfW / 2 + lw, y, 1, 1, color);
      rect(ctx, cx + halfW / 2 - lw, y, 1, 1, color);
      rect(ctx, cx + halfW / 2 + lw, y, 1, 1, color);
    }
  }
  rect(ctx, cx - 1, top + 4, 2, bottom - top - 4, color);
  rect(ctx, cx - halfW / 2, spring + 2, 1, bottom - spring - 2, color);
  rect(ctx, cx + halfW / 2, spring + 2, 1, bottom - spring - 2, color);
  rect(ctx, cx - halfW, spring + Math.round((bottom - spring) * 0.45), halfW * 2, 1, color);
  // rose ring near the apex
  for (let a = 0; a < 24; a++) {
    const ang = (a / 24) * Math.PI * 2;
    rect(ctx, Math.round(cx + Math.cos(ang) * 5), Math.round(top + rise * 0.55 + Math.sin(ang) * 5), 1, 1, color);
  }
  // sill
  rect(ctx, cx - halfW - 6, bottom, halfW * 2 + 12, 3, P.wood5);
  rect(ctx, cx - halfW - 6, bottom, halfW * 2 + 12, 1, P.wood6);
  rect(ctx, cx - halfW - 6, bottom + 3, halfW * 2 + 12, 1, P.wood0);
}

/** Small candle with an animated flame; draws its own glow. */
export function candle(ctx: Ctx, x: number, y: number, t: number, seed = 0) {
  rect(ctx, x - 2, y - 1, 5, 1, P.gold); // brass dish
  rect(ctx, x - 1, y - 6, 3, 5, P.cream);
  rect(ctx, x + 1, y - 6, 1, 5, tint(P.cream, -0.15));
  const f = flicker(t, seed);
  const fh = f > 1.04 ? 3 : 2;
  rect(ctx, x, y - 6 - fh, 1, fh, P.flame);
  rect(ctx, x, y - 7, 1, 1, P.glow);
  glow(ctx, x, y - 8, Math.round(14 * f), P.flame, 0.07, 4);
}

/** Wall sconce: brass bracket with a candle. */
export function sconce(ctx: Ctx, x: number, y: number, t: number, seed = 0) {
  rect(ctx, x - 1, y, 3, 4, P.goldDark);
  rect(ctx, x - 3, y + 4, 7, 1, P.gold);
  candle(ctx, x, y + 4, t, seed);
  glow(ctx, x, y - 2, Math.round(26 * flicker(t, seed)), P.lamp, 0.05, 4);
}

/** Table lamp with a fabric shade and a warm glow. */
export function tableLamp(ctx: Ctx, x: number, y: number, t: number, seed = 0) {
  rect(ctx, x - 2, y - 1, 5, 1, P.goldDark);
  rect(ctx, x, y - 7, 1, 6, P.gold);
  // shade (trapezoid)
  for (let i = 0; i < 6; i++) rect(ctx, x - 3 - Math.floor(i / 2), y - 13 + i, 7 + Math.floor(i / 2) * 2, 1, i === 0 ? P.glow : P.lamp);
  rect(ctx, x - 5, y - 8, 11, 1, P.flame);
  const f = flicker(t, seed) * 0.5 + 0.5;
  glow(ctx, x, y - 10, Math.round(34 * f), P.lamp, 0.06, 5);
  floorGlow(ctx, x, y + 14, 30, 6, P.lamp, 0.07);
}

/** Tall floor lamp. */
export function floorLamp(ctx: Ctx, x: number, floorY: number, t: number, seed = 0) {
  rect(ctx, x - 3, floorY - 1, 7, 1, P.goldDark);
  rect(ctx, x, floorY - 40, 1, 39, P.gold);
  for (let i = 0; i < 7; i++) rect(ctx, x - 4 - Math.floor(i / 2), floorY - 50 + i, 9 + Math.floor(i / 2) * 2, 1, i === 0 ? P.glow : P.lamp);
  rect(ctx, x - 7, floorY - 43, 15, 1, P.flame);
  const f = flicker(t, seed) * 0.4 + 0.6;
  glow(ctx, x, floorY - 46, Math.round(44 * f), P.lamp, 0.05, 5);
  floorGlow(ctx, x, floorY + 2, 34, 6, P.lamp, 0.08);
}

/** Velvet wingback armchair, facing right. (x, floorY) is its front-left foot. */
export function armchair(ctx: Ctx, x: number, floorY: number) {
  const v0 = '#2a2f55';
  const v1 = '#3a4275';
  const v2 = '#525c99';
  rect(ctx, x, floorY - 26, 7, 22, v0); // back
  rect(ctx, x + 1, floorY - 25, 5, 20, v1);
  rect(ctx, x + 1, floorY - 25, 1, 20, v2);
  rect(ctx, x + 4, floorY - 12, 16, 7, v1); // seat
  rect(ctx, x + 4, floorY - 12, 16, 1, v2);
  rect(ctx, x + 14, floorY - 15, 7, 10, v0); // arm
  rect(ctx, x + 14, floorY - 15, 7, 1, v2);
  rect(ctx, x + 6, floorY - 17, 6, 5, '#c79a45'); // cushion
  rect(ctx, x + 6, floorY - 17, 6, 1, tint('#c79a45', 0.3));
  rect(ctx, x + 1, floorY - 5, 2, 5, P.wood2); // legs
  rect(ctx, x + 18, floorY - 5, 2, 5, P.wood2);
}

/** Small round side table. */
export function sideTable(ctx: Ctx, x: number, floorY: number) {
  rect(ctx, x - 7, floorY - 15, 15, 2, P.wood5);
  rect(ctx, x - 7, floorY - 15, 15, 1, P.wood6);
  rect(ctx, x, floorY - 13, 1, 12, P.wood3);
  rect(ctx, x - 3, floorY - 1, 7, 1, P.wood2);
}

/** A rug seen at a slight angle: madder field, navy border, gold medallion, fringe. */
export function rug(ctx: Ctx, cx: number, y: number, w: number, h: number) {
  for (let r = 0; r < h; r++) {
    const rowW = Math.round(w * (0.82 + 0.18 * (r / h)));
    const x0 = Math.round(cx - rowW / 2);
    const edge = r < 2 || r >= h - 2;
    rect(ctx, x0, y + r, rowW, 1, edge ? P.navy : P.rug1);
    rect(ctx, x0, y + r, 3, 1, P.navy);
    rect(ctx, x0 + rowW - 3, y + r, 3, 1, P.navy);
    if (!edge && (r === 3 || r === h - 4)) rect(ctx, x0 + 4, y + r, rowW - 8, 1, P.rug2);
    if (r % 2 === 0) rect(ctx, x0 - 2, y + r, 1, 1, P.cream); // fringe
    if (r % 2 === 0) rect(ctx, x0 + rowW + 1, y + r, 1, 1, P.cream);
  }
  // medallion: nested diamonds (wide, because the rug is seen at an angle)
  const my = y + Math.floor(h / 2);
  for (let dy = -6; dy <= 6; dy++) {
    const d = Math.abs(dy);
    rect(ctx, cx - (6 - d) * 4, my + dy, (6 - d) * 8 + 1, 1, P.gold);
    if (d < 4) rect(ctx, cx - (4 - d) * 4, my + dy, (4 - d) * 8 + 1, 1, P.rug2);
    if (d < 2) rect(ctx, cx - (2 - d) * 4, my + dy, (2 - d) * 8 + 1, 1, P.navy);
  }
}

/** Sleeping cat curled on the rug: breathes, and flicks its tail now and then. */
export function sleepingCat(ctx: Ctx, x: number, y: number, t: number) {
  const fur = '#3a3046';
  const furLight = '#5a4c6a';
  const breath = Math.sin(t * 1.8) > 0 ? 1 : 0;
  // body
  for (let r = 0; r < 5 + breath; r++) {
    const half = Math.round(7 * Math.sqrt(1 - ((r - 2.5 - breath / 2) / (3 + breath / 2)) ** 2));
    rect(ctx, x + 9 - half, y - 5 - breath + r, half * 2, 1, fur);
  }
  rect(ctx, x + 5, y - 5 - breath, 7, 1, furLight);
  // head with ears and closed eyes
  disc(ctx, x + 3, y - 3, 3, fur);
  rect(ctx, x + 1, y - 7, 1, 2, fur);
  rect(ctx, x + 5, y - 7, 1, 2, fur);
  rect(ctx, x + 2, y - 3, 1, 1, furLight);
  rect(ctx, x + 4, y - 3, 1, 1, furLight);
  // tail wrapping round, flicking every few seconds
  const flick = (t % 6) < 0.4 ? -1 : 0;
  rect(ctx, x + 6, y + 1 + flick, 9, 1, fur);
  rect(ctx, x + 15, y + flick, 1, 1, fur);
  // little "z" drifting up
  const zt = (t % 3) / 3;
  ctx.globalAlpha = 1 - zt;
  rect(ctx, x + 8, Math.round(y - 12 - zt * 8), 3, 1, P.night6);
  rect(ctx, x + 9, Math.round(y - 11 - zt * 8), 1, 1, P.night6);
  rect(ctx, x + 8, Math.round(y - 10 - zt * 8), 3, 1, P.night6);
  ctx.globalAlpha = 1;
}

/** Trailing pothos in a pot, for the tops of bookcases and window sills. */
export function pottedPlant(ctx: Ctx, x: number, y: number, trail = 14) {
  rect(ctx, x - 3, y - 5, 7, 5, P.rug3);
  rect(ctx, x - 4, y - 6, 9, 1, tint(P.rug3, 0.2));
  const leaves: [number, number][] = [[-3, -8], [0, -10], [3, -8], [-5, -6], [5, -6], [1, -7]];
  leaves.forEach(([lx, ly], i) => rect(ctx, x + lx, y + ly, 2, 2, i % 2 ? P.leaf2 : P.leaf3));
  for (let i = 0; i < trail; i++) {
    const vx = x + 4 + Math.round(Math.sin(i * 0.6) * 1.5);
    rect(ctx, vx, y - 4 + i, 1, 1, P.leaf1);
    if (i % 3 === 0) rect(ctx, vx + (i % 2 ? -2 : 1), y - 4 + i, 2, 2, i % 2 ? P.leaf2 : P.leaf3);
  }
}

/** Ladder leaning against a bookcase. */
export function ladder(ctx: Ctx, x: number, topY: number, floorY: number) {
  const h = floorY - topY;
  for (let i = 0; i < h; i++) {
    const lean = Math.round((i / h) * 8);
    rect(ctx, x + lean, topY + i, 1, 1, P.wood5);
    rect(ctx, x + 7 + lean, topY + i, 1, 1, P.wood5);
    if (i % 7 === 3) rect(ctx, x + lean, topY + i, 8, 1, P.wood4);
  }
}

/** Hanging wooden sign on two chains, used to mark the visitor's shelf. */
export function sign(ctx: Ctx, cx: number, y: number, w: number, lit: boolean) {
  rect(ctx, cx - w / 2 + 3, y - 6, 1, 6, P.goldDark);
  rect(ctx, cx + w / 2 - 4, y - 6, 1, 6, P.goldDark);
  rect(ctx, cx - w / 2, y, w, 11, P.wood5);
  rect(ctx, cx - w / 2, y, w, 1, P.wood6);
  rect(ctx, cx - w / 2, y + 10, w, 1, P.wood2);
  outline(ctx, cx - w / 2, y, w, 11, P.wood2);
  if (lit) glow(ctx, cx, y + 5, w * 0.7, P.lamp, 0.07, 3);
}

/** Dithered moonlight falling from the window onto the floor. */
export function moonlightPool(ctx: Ctx, cx: number, y: number, w: number, h: number) {
  for (let r = 0; r < h; r++) {
    const rowW = Math.round(w * (0.7 + 0.3 * (r / h)));
    ctx.save();
    ctx.globalAlpha = 0.12 * (1 - r / h);
    dither(ctx, Math.round(cx - rowW / 2), y + r, rowW, 1, 'rgba(0,0,0,0)', P.night6, 0.5);
    ctx.restore();
  }
}

/**
 * Rolling library ladder, hooked over a rail at the top and leaning out at the
 * foot. (topX, topY) is the top of its left rail, (footX, floorY) the bottom.
 */
export function libraryLadder(ctx: Ctx, topX: number, topY: number, footX: number, floorY: number, width = 12) {
  const h = floorY - topY;
  for (let i = 0; i <= h; i++) {
    const x = Math.round(topX + ((footX - topX) * i) / h);
    const y = topY + i;
    // two rails, each lit on the left and shaded on the right
    rect(ctx, x, y, 1, 1, P.wood6);
    rect(ctx, x + 1, y, 1, 1, P.wood4);
    rect(ctx, x + width - 2, y, 1, 1, P.wood5);
    rect(ctx, x + width - 1, y, 1, 1, P.wood3);
    if (i > 3 && i % 9 === 0) {
      rect(ctx, x + 2, y, width - 4, 1, P.wood5);
      rect(ctx, x + 2, y + 1, width - 4, 1, P.wood2);
    }
  }
  // brass hooks over the rail, and little wheels at the foot
  rect(ctx, topX, topY - 3, 2, 3, P.gold);
  rect(ctx, topX + width - 2, topY - 3, 2, 3, P.gold);
  rect(ctx, topX + 1, topY - 4, 2, 1, P.goldDark);
  rect(ctx, topX + width - 1, topY - 4, 2, 1, P.goldDark);
  rect(ctx, footX - 1, floorY - 1, 3, 2, P.goldDark);
  rect(ctx, footX + width - 2, floorY - 1, 3, 2, P.goldDark);
}

/** Carved wooden pilaster between bookcase bays: capital, fluted shaft, plinth. */
export function pilaster(ctx: Ctx, x: number, y: number, w: number, h: number) {
  rect(ctx, x, y, w, h, P.wood3);
  rect(ctx, x, y, 1, h, P.wood4);
  rect(ctx, x + w - 1, y, 1, h, P.wood1);
  // recessed panel with a carved rosette near the top
  outline(ctx, x + 2, y + 9, w - 4, h - 19, P.wood1);
  rect(ctx, x + 3, y + 10, 1, h - 21, P.wood4);
  const mid = x + Math.floor(w / 2);
  rect(ctx, mid - 1, y + 13, 3, 3, P.wood4);
  rect(ctx, mid, y + 14, 1, 1, P.wood1);
  // capital and plinth stick out a pixel each side
  rect(ctx, x - 1, y, w + 2, 6, P.wood4);
  rect(ctx, x - 1, y, w + 2, 1, P.wood5);
  rect(ctx, x - 1, y + 5, w + 2, 1, P.wood1);
  for (let px = x + 1; px < x + w - 1; px += 2) rect(ctx, px, y + 2, 1, 2, P.wood2);
  rect(ctx, x - 1, y + h - 7, w + 2, 7, P.wood4);
  rect(ctx, x - 1, y + h - 7, w + 2, 1, P.wood5);
  rect(ctx, x - 1, y + h - 1, w + 2, 1, P.wood1);
}

/** Gallery floor with a balustrade on top, running from x to x + w; y is the walkway's top. */
export function gallery(ctx: Ctx, x: number, y: number, w: number) {
  const railH = 10;
  // balusters, then a handrail with a brass cap
  for (let px = x + 2; px < x + w; px += 6) {
    rect(ctx, px, y - railH, 2, railH, P.wood3);
    rect(ctx, px, y - railH, 1, railH, P.wood4);
  }
  rect(ctx, x, y - railH - 2, w, 2, P.wood4);
  rect(ctx, x, y - railH - 2, w, 1, P.goldDark);
  // the walkway's front edge, with a brass rail for the ladder hooks under it
  rect(ctx, x, y, w, 5, P.wood4);
  rect(ctx, x, y, w, 1, P.wood6);
  rect(ctx, x, y + 4, w, 1, P.wood1);
  rect(ctx, x, y + 6, w, 1, P.goldDark);
  rect(ctx, x, y + 7, w, 1, P.wood0);
}

const GLASS = [P.night3, P.night4, P.night5, P.night5, P.night6, '#6f63c4', '#9d8fe6', '#c4bdf2'];

/**
 * Tall arched stained-glass window, mostly beyond the right edge of the screen,
 * so only its left side shows. `x` is where the glass starts.
 */
export function stainedWindow(ctx: Ctx, x: number, top: number, bottom: number, fullW: number) {
  const halfW = Math.round(fullW / 2);
  const cx = x + halfW;
  const rise = Math.round(fullW * 0.9);
  const spring = top + rise;
  const rand = seeded(31);
  // deep stone reveal around the opening
  for (let y = top - 4; y <= bottom + 3; y++) {
    const hw = y < spring ? Math.floor(archHalfWidth(halfW + 4, rise + 4, spring - y)) : halfW + 4;
    rect(ctx, cx - hw, y, hw - halfW + 4, 1, P.wood2);
  }
  // glass: small quarries of mixed blues and lilacs between lead cames
  const cells = new Map<string, string>();
  for (let y = top; y <= bottom; y++) {
    const hw = y < spring ? Math.floor(archHalfWidth(halfW, rise, spring - y)) : halfW;
    for (let px = cx - hw; px < cx + hw; px++) {
      const gx = px - x;
      const gy = y - top;
      const lead = gx % 5 === 4 || gy % 7 === 6 || px === cx - hw;
      const bar = gx % 15 === 14 || gy % 28 === 27;
      let color = P.night0;
      if (!lead && !bar) {
        const key = `${Math.floor(gx / 5)},${Math.floor(gy / 7)}`;
        if (!cells.has(key)) cells.set(key, GLASS[Math.floor(rand() * GLASS.length)]);
        color = cells.get(key)!;
        if ((gx + gy) % 5 === 0) color = tint(color, 0.15); // ripples in old glass
      } else if (bar) color = P.wood1;
      rect(ctx, px, y, 1, 1, color);
    }
  }
  // the stone sill
  rect(ctx, x - 6, bottom + 1, fullW + 12, 3, P.wood4);
  rect(ctx, x - 6, bottom + 1, fullW + 12, 1, P.wood5);
  rect(ctx, x - 6, bottom + 4, fullW + 12, 1, P.wood0);
}

/**
 * Moonlight through a window: a slanting shaft in the air, falling as a grid
 * of window-shaped patches on the floor. Drawn additively over the scene.
 */
export function moonbeam(
  ctx: Ctx,
  win: { x: number; top: number; bottom: number },
  floor: { y: number; bottom: number; left: number },
  right: number,
  t: number,
) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = P.night5;
  const pulse = 1 + Math.sin(t * 0.7) * 0.12;
  // the shaft narrows towards the window and widens towards the floor
  for (let y = win.top; y < floor.y; y++) {
    const k = (y - win.top) / (floor.y - win.top);
    const l = Math.round(win.x + (floor.left - win.x) * k);
    const r = Math.round(right + (win.x - 8 - right) * Math.max(0, (y - win.bottom) / (floor.y - win.bottom)));
    if (r <= l) continue;
    ctx.globalAlpha = 0.08 * pulse * (0.4 + k * 0.6);
    ctx.fillRect(l, y, r - l, 1);
    // a couple of brighter streaks drifting inside it
    for (let s = 0; s < 2; s++) {
      const sx = l + Math.round((r - l) * (0.3 + s * 0.35 + Math.sin(t * 0.4 + s * 2) * 0.05));
      ctx.globalAlpha = 0.06 * pulse;
      ctx.fillRect(sx, y, Math.max(2, Math.round((r - l) * 0.08)), 1);
    }
  }
  // window panes on the floor: skewed tiles, brightest nearest the window
  const depth = floor.bottom - floor.y;
  for (let row = 0; row < depth; row++) {
    if (row % 6 === 5) continue; // shadow of a glazing bar
    const y = floor.y + row;
    const start = floor.left - Math.round(row * 1.6);
    for (let px = start; px < right; px += 16) {
      const k = (px - start) / (right - start);
      ctx.globalAlpha = (0.1 + 0.4 * k) * (1 - (row / depth) * 0.5) * pulse;
      if (k > 0.3) ctx.fillRect(px, y, 14, 1);
      // dither the faint end so it breaks up rather than fading smoothly
      else for (let d = (px + y) & 1; d < 14; d += 2) ctx.fillRect(px + d, y, 1, 1);
    }
  }
  ctx.restore();
}

/** A small untidy stack of old books lying flat on the floor. */
export function bookPile(ctx: Ctx, x: number, floorY: number, seed = 0) {
  const rand = seeded(seed + 50);
  let y = floorY;
  for (let i = 0; i < 4; i++) {
    const w = 12 + Math.floor(rand() * 6);
    const h = 3 + Math.floor(rand() * 2);
    const c = OLD_BINDINGS[Math.floor(rand() * OLD_BINDINGS.length)];
    const off = Math.floor(rand() * 4) - 2;
    rect(ctx, x + off, y - h, w, h, c);
    rect(ctx, x + off, y - h, w, 1, tint(c, 0.2));
    rect(ctx, x + off + w - 2, y - h + 1, 2, h - 1, P.cream); // page edges
    y -= h;
  }
}
