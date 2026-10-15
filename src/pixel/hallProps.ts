/**
 * Props for the great hall: vaulted ceiling, the castle window, galleries with
 * round balconies, and the leather furniture on the floor.
 */
import { archHalfWidth, bandedGradient, disc, glow, floorGlow, rect, seeded, tint, type Ctx } from './draw';
import { flicker } from './props';
import { P } from './palette';

/** Half-width of a pointed arch for every row from its apex down to its springing line. */
function archRows(halfW: number, rise: number) {
  const rows: number[] = [];
  for (let dy = rise; dy >= 0; dy--) rows.push(Math.floor(archHalfWidth(halfW, rise, dy)));
  return rows;
}

/** A pointed arch drawn as a moulded rib `thick` pixels wide; (cx, spring) is the centre of its base. */
export function archRib(ctx: Ctx, cx: number, spring: number, halfW: number, rise: number, thick = 3) {
  const rows = archRows(halfW, rise);
  let prev = 0;
  rows.forEach((hw, i) => {
    const y = spring - rise + i;
    // span from the previous row's edge, so the shallow top of the arch has no gaps
    const span = Math.max(1, hw - prev) + thick;
    rect(ctx, cx - hw - thick, y, span, 1, P.wood2);
    rect(ctx, cx + prev, y, span, 1, P.wood2);
    rect(ctx, cx - hw - thick, y, 1, 1, P.wood4);
    rect(ctx, cx + hw + thick - 1, y, 1, 1, P.wood1);
    prev = hw;
  });
}

/** The night sky seen through the vaulted ceiling, with stars that never move. */
export function ceilingSky(ctx: Ctx, w: number, bottom: number) {
  bandedGradient(ctx, 0, 0, w, bottom, [P.night0, P.night1, P.night1, P.night2]);
  const rand = seeded(77);
  for (let i = 0; i < w * bottom * 0.012; i++) {
    const x = Math.floor(rand() * w);
    const y = Math.floor(rand() * bottom);
    rect(ctx, x, y, 1, 1, rand() > 0.8 ? P.star : P.night5);
  }
}

/** Stars in the ceiling that twinkle; drawn every frame. */
export function twinkles(ctx: Ctx, w: number, bottom: number, t: number) {
  const rand = seeded(91);
  for (let i = 0; i < Math.round(w / 14); i++) {
    const x = Math.floor(rand() * w);
    const y = Math.floor(rand() * bottom);
    const phase = rand() * 20;
    const s = Math.sin(t * 1.3 + phase);
    if (s > 0.85) {
      rect(ctx, x - 1, y, 3, 1, P.night6);
      rect(ctx, x, y - 1, 1, 3, P.night6);
      rect(ctx, x, y, 1, 1, P.star);
    }
  }
}

/** Clustered stone-and-oak pier rising to the vault, with a carved capital. */
export function pier(ctx: Ctx, x: number, top: number, bottom: number, w = 10) {
  rect(ctx, x, top, w, bottom - top, P.wood2);
  for (let px = x + 1; px < x + w - 1; px += 3) {
    rect(ctx, px, top, 1, bottom - top, P.wood4);
    rect(ctx, px + 1, top, 1, bottom - top, P.wood3);
  }
  rect(ctx, x + w - 1, top, 1, bottom - top, P.wood1);
  // capital
  rect(ctx, x - 2, top, w + 4, 4, P.wood4);
  rect(ctx, x - 2, top, w + 4, 1, P.wood6);
  rect(ctx, x - 1, top + 4, w + 2, 2, P.wood3);
  // base
  rect(ctx, x - 2, bottom - 6, w + 4, 6, P.wood3);
  rect(ctx, x - 2, bottom - 6, w + 4, 1, P.wood5);
}

/**
 * The view through the great window: a crescent moon over snowy mountains,
 * a castle town on a crag with waterfalls, and a river with a stone bridge.
 */
export function castleView(ctx: Ctx, cx: number, top: number, bottom: number, halfW: number, rise: number, t: number) {
  const spring = top + rise;
  ctx.save();
  ctx.beginPath();
  for (let y = top; y <= bottom; y++) {
    const hw = y < spring ? Math.floor(archHalfWidth(halfW, rise, spring - y)) : halfW;
    ctx.rect(cx - hw, y, hw * 2, 1);
  }
  ctx.clip();
  const x0 = cx - halfW;
  const w = halfW * 2;
  bandedGradient(ctx, x0, top, w, bottom - top, [P.night0, P.night1, P.night2, P.night3, P.night4]);

  // stars, some twinkling
  const rand = seeded(12);
  for (let i = 0; i < 90; i++) {
    const sx = x0 + Math.floor(rand() * w);
    const sy = top + Math.floor(rand() * (bottom - top) * 0.55);
    const tw = Math.sin(t * (0.8 + rand() * 2) + rand() * 10);
    if (tw > -0.4) rect(ctx, sx, sy, 1, 1, tw > 0.8 ? P.star : P.night6);
  }

  // crescent moon
  const mx = cx + Math.round(halfW * 0.62);
  const my = top + rise + 10;
  glow(ctx, mx, my, 22, P.night6, 0.09, 3);
  disc(ctx, mx, my, 8, P.moon);
  disc(ctx, mx + 4, my - 3, 7, P.night2);

  // mountain ranges: far and snowy, then nearer and darker
  const ridge = (base: number, amp: number, freq: number, phase: number, color: string, snow?: string) => {
    for (let px = x0; px < x0 + w; px++) {
      const k = px * freq + phase;
      const hgt = Math.round(amp * (0.35 + 0.65 * Math.abs(Math.sin(k)) * (0.6 + 0.4 * Math.cos(k * 0.43))));
      rect(ctx, px, base - hgt, 1, bottom - base + hgt, color);
      if (snow && hgt > amp * 0.62) rect(ctx, px, base - hgt, 1, 1 + Math.round((hgt - amp * 0.62) / 3), snow);
    }
  };
  ridge(bottom - 48, 34, 0.075, 1.2, P.night3, P.night6);
  ridge(bottom - 34, 20, 0.11, 0.3, P.night2, tint(P.night5, -0.1));

  // the crag the castle stands on
  for (let px = x0; px < x0 + w; px++) {
    const d = Math.abs(px - cx) / halfW;
    const hgt = Math.round(46 * Math.max(0, 1 - d * 1.6) ** 0.8);
    if (hgt > 0) rect(ctx, px, bottom - 20 - hgt, 1, hgt + 20, P.night1);
  }

  // castle: towers with conical roofs, tallest in the middle
  const towers: [number, number, number][] = [[-14, 30, 4], [-7, 38, 5], [0, 58, 4], [6, 44, 5], [13, 34, 4], [-20, 24, 3], [19, 26, 3]];
  const lights = seeded(4);
  for (const [dx, hgt, tw] of towers) {
    const tx = cx + dx;
    const base = bottom - 40;
    rect(ctx, tx - Math.floor(tw / 2), base - hgt, tw, hgt, P.night1);
    rect(ctx, tx - Math.floor(tw / 2), base - hgt, 1, hgt, P.night3);
    // roof
    for (let r = 0; r < tw + 3; r++) {
      const half = Math.floor((r * (tw + 2)) / (tw + 3) / 2);
      rect(ctx, tx - half, base - hgt - tw - 3 + r, half * 2 + 1, 1, P.night0);
    }
    for (let ly = base - hgt + 3; ly < base - 2; ly += 5) {
      if (lights() > 0.72) rect(ctx, tx, ly, 1, 1, Math.sin(t * 0.6 + ly) > -0.7 ? P.lamp : P.flame);
    }
  }

  // town spilling down the hills, its windows lit
  const town = seeded(8);
  for (let i = 0; i < 26; i++) {
    const side = i % 2 ? 1 : -1;
    const hx = cx + side * (10 + Math.floor(town() * (halfW - 8)));
    const hy = bottom - 22 - Math.floor(town() * 16) + Math.floor((Math.abs(hx - cx) / halfW) * 10);
    rect(ctx, hx - 2, hy, 5, 4, P.night2);
    rect(ctx, hx - 3, hy - 1, 7, 1, P.night1);
    rect(ctx, hx - 2, hy - 2, 5, 1, P.night1);
    if (Math.sin(t * 0.5 + i * 2.1) > -0.8) rect(ctx, hx, hy + 1, 1, 1, P.lamp);
  }

  // waterfalls tumbling off the crag, the water moving downwards
  for (const [fx, fTop] of [[cx - 24, bottom - 30], [cx + 22, bottom - 28]]) {
    for (let y = fTop; y < bottom - 9; y++) {
      const flow = (((y - Math.floor(t * 24)) % 5) + 5) % 5;
      rect(ctx, fx, y, 1, 1, flow === 0 ? P.star : P.night5);
      rect(ctx, fx + 1, y, 1, 1, flow === 2 ? P.night6 : P.night4);
    }
    rect(ctx, fx - 2, bottom - 10, 6, 1, P.night6); // spray
  }

  // forest edges
  for (let px = x0; px < x0 + w; px++) {
    const hgt = 6 + Math.round(Math.abs(Math.sin(px * 0.9)) * 4 + Math.abs(Math.sin(px * 0.31)) * 5);
    const d = Math.abs(px - cx) / halfW;
    if (d > 0.35) rect(ctx, px, bottom - 8 - hgt * d, 1, hgt * d + 8, d > 0.7 ? P.forest0 : P.forest1);
  }

  // river with shimmer, and a stone bridge
  rect(ctx, x0, bottom - 8, w, 8, P.night3);
  for (let i = 0; i < 18; i++) {
    const sx = x0 + ((i * 37 + Math.floor(t * 6)) % w);
    if ((i + Math.floor(t * 2)) % 3) rect(ctx, sx, bottom - 6 + (i % 3) * 2, 3, 1, P.night5);
  }
  const bw = 34;
  rect(ctx, cx - bw / 2, bottom - 12, bw, 3, P.night2);
  rect(ctx, cx - bw / 2, bottom - 12, bw, 1, P.night4);
  for (const ax of [cx - 9, cx + 9]) {
    for (let r = 0; r < 4; r++) rect(ctx, ax - 5 + Math.round(r * 0.8), bottom - 9 + r, 10 - Math.round(r * 1.6), 1, P.night3);
  }
  rect(ctx, cx - 1, bottom - 13, 1, 1, P.lamp);
  ctx.restore();
}

/** Five-light gothic window frame with circular tracery in its head. */
export function grandWindowFrame(ctx: Ctx, cx: number, top: number, bottom: number, halfW: number, rise: number) {
  const spring = top + rise;
  const c = P.wood1;
  // outer moulding
  archRib(ctx, cx, spring, halfW + 4, rise + 4, 4);
  rect(ctx, cx - halfW - 4, spring, 4, bottom - spring, P.wood2);
  rect(ctx, cx + halfW, spring, 4, bottom - spring, P.wood2);
  rect(ctx, cx - halfW - 4, spring, 1, bottom - spring, P.wood4);
  // mullions and the pointed head of each light
  const lw = (halfW * 2) / 5;
  for (let i = 1; i < 5; i++) rect(ctx, Math.round(cx - halfW + lw * i) - 1, spring - 6, 2, bottom - spring + 6, c);
  for (let i = 0; i < 5; i++) {
    const lcx = Math.round(cx - halfW + lw * (i + 0.5));
    const rows = archRows(lw / 2, 9);
    rows.forEach((hw, r) => {
      const y = spring - 9 + r - 6;
      rect(ctx, lcx - hw - 1, y, 1, 1, c);
      rect(ctx, lcx + hw, y, 1, 1, c);
    });
  }
  // transom
  rect(ctx, cx - halfW, spring + Math.round((bottom - spring) * 0.55), halfW * 2, 2, c);
  // tracery: a big rose and two smaller quatrefoils
  const ring = (rx: number, ry: number, r: number) => {
    for (let a = 0; a < 48; a++) {
      const ang = (a / 48) * Math.PI * 2;
      rect(ctx, Math.round(rx + Math.cos(ang) * r), Math.round(ry + Math.sin(ang) * r), 1, 1, c);
    }
    for (let k = 0; k < 4; k++) {
      const ang = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const fx = rx + Math.cos(ang) * r * 0.45;
      const fy = ry + Math.sin(ang) * r * 0.45;
      for (let a = 0; a < 20; a++) {
        const b = (a / 20) * Math.PI * 2;
        rect(ctx, Math.round(fx + Math.cos(b) * r * 0.42), Math.round(fy + Math.sin(b) * r * 0.42), 1, 1, c);
      }
    }
  };
  ring(cx, top + Math.round(rise * 0.42), 10);
  ring(cx - Math.round(halfW * 0.5), top + Math.round(rise * 0.82), 7);
  ring(cx + Math.round(halfW * 0.5), top + Math.round(rise * 0.82), 7);
  // sill
  rect(ctx, cx - halfW - 6, bottom, halfW * 2 + 12, 3, P.wood4);
  rect(ctx, cx - halfW - 6, bottom, halfW * 2 + 12, 1, P.wood6);
}

/** Straight gallery: balustrade, then the walkway's moulded front edge. y is the walkway level. */
export function galleryRun(ctx: Ctx, x0: number, x1: number, y: number) {
  for (let x = x0 + 1; x < x1; x += 4) {
    rect(ctx, x, y - 8, 2, 8, P.wood3);
    rect(ctx, x, y - 6, 2, 1, P.wood5);
  }
  rect(ctx, x0, y - 10, x1 - x0, 2, P.wood4);
  rect(ctx, x0, y - 10, x1 - x0, 1, P.wood6);
  rect(ctx, x0, y, x1 - x0, 6, P.wood3);
  rect(ctx, x0, y, x1 - x0, 1, P.wood5);
  rect(ctx, x0, y + 3, x1 - x0, 1, P.wood2);
  rect(ctx, x0, y + 6, x1 - x0, 1, P.wood0);
}

/** A round balcony jutting out from the gallery, seen from slightly below. */
export function roundBalcony(ctx: Ctx, cx: number, y: number, r: number) {
  const sag = 5;
  for (let dx = -r; dx <= r; dx++) {
    const k = Math.sqrt(1 - (dx / r) ** 2);
    const by = y + Math.round(k * sag);
    rect(ctx, cx + dx, by, 1, 6, Math.abs(dx) > r * 0.75 ? P.wood2 : P.wood3);
    rect(ctx, cx + dx, by, 1, 1, P.wood5);
    rect(ctx, cx + dx, by + 6, 1, 1, P.wood0);
    rect(ctx, cx + dx, by - 10, 1, 2, P.wood4);
    rect(ctx, cx + dx, by - 10, 1, 1, P.wood6);
  }
  // balusters spaced by angle, so they bunch up towards the sides
  for (let a = 0.15; a < Math.PI; a += 0.26) {
    const dx = Math.round(-Math.cos(a) * r);
    const by = y + Math.round(Math.sin(a) * sag);
    rect(ctx, cx + dx, by - 8, 2, 8, P.wood3);
    rect(ctx, cx + dx, by - 6, 2, 1, P.wood5);
  }
}

/** Spiral stair winding down from a balcony: a central post and fanned treads. */
export function spiralStair(ctx: Ctx, cx: number, top: number, bottom: number, r: number) {
  rect(ctx, cx - 1, top, 3, bottom - top, P.wood2);
  rect(ctx, cx - 1, top, 1, bottom - top, P.wood4);
  for (let i = 0, y = top + 4; y < bottom - 2; i++, y += 4) {
    const s = Math.sin(i * 0.8);
    const w = Math.round(r * (0.5 + 0.5 * Math.abs(s)));
    const x = s > 0 ? cx : cx - w;
    rect(ctx, x, y, w, 2, P.wood4);
    rect(ctx, x, y, w, 1, P.wood5);
    rect(ctx, x, y + 2, w, 1, P.wood1);
  }
}

/** Little brass lamp on a balustrade post, with a warm globe. */
export function postLamp(ctx: Ctx, x: number, y: number, t: number, seed = 0) {
  rect(ctx, x - 1, y - 6, 3, 6, P.wood4);
  rect(ctx, x, y - 9, 1, 3, P.goldDark);
  rect(ctx, x - 2, y - 13, 5, 4, P.lamp);
  rect(ctx, x - 1, y - 14, 3, 1, P.glow);
  rect(ctx, x - 2, y - 13, 1, 4, P.flame);
  glow(ctx, x, y - 11, Math.round(22 * flicker(t, seed)), P.lamp, 0.06, 4);
}

/** Floorboards in perspective, their seams running towards a vanishing point. */
export function perspectiveFloor(ctx: Ctx, w: number, top: number, bottom: number, vx: number, vy: number) {
  rect(ctx, 0, top, w, bottom - top, P.wood3);
  const rand = seeded(23);
  // plank rows get deeper towards the viewer
  let y = top;
  for (let i = 0; y < bottom; i++) {
    const depth = 3 + Math.floor((y - top) / 12);
    rect(ctx, 0, y, w, 1, P.wood2);
    if (i % 2) rect(ctx, 0, y + 1, w, 1, tint(P.wood3, 0.05));
    // staggered end joints
    for (let n = 0; n < w / 40; n++) rect(ctx, Math.floor(rand() * w), y, 1, depth, P.wood2);
    y += depth;
  }
  // long seams fanning out from the vanishing point
  for (let i = -40; i <= 40; i++) {
    for (let yy = top; yy < bottom; yy++) {
      const x = Math.round(vx + i * 9 * ((yy - vy) / (top - vy + 20)));
      if (x >= 0 && x < w) rect(ctx, x, yy, 1, 1, P.wood2);
    }
  }
}

/** A Persian rug in perspective: madder field, dark border, gold medallion. */
export function persianRug(ctx: Ctx, cx: number, y: number, w: number, h: number, seed = 0) {
  for (let r = 0; r < h; r++) {
    const rowW = Math.round(w * (0.78 + 0.22 * (r / h)));
    const x0 = Math.round(cx - rowW / 2);
    const edge = r < 2 || r >= h - 2;
    rect(ctx, x0, y + r, rowW, 1, edge ? P.rug0 : P.rug1);
    rect(ctx, x0, y + r, 4, 1, P.rug0);
    rect(ctx, x0 + rowW - 4, y + r, 4, 1, P.rug0);
    if (!edge && (r === 3 || r === h - 4)) rect(ctx, x0 + 5, y + r, rowW - 10, 1, P.goldDark);
    if (r % 3 === 1) {
      // little woven motifs along the border
      for (let mx = x0 + 6 + (seed % 3); mx < x0 + rowW - 6; mx += 7) rect(ctx, mx, y + r, 1, 1, P.rug2);
    }
    if (r % 2 === 0) {
      rect(ctx, x0 - 2, y + r, 1, 1, P.cream);
      rect(ctx, x0 + rowW + 1, y + r, 1, 1, P.cream);
    }
  }
  const my = y + Math.floor(h / 2);
  const md = Math.floor(h / 2) - 3;
  for (let dy = -md; dy <= md; dy++) {
    const d = Math.abs(dy);
    rect(ctx, cx - (md - d) * 3, my + dy, (md - d) * 6 + 1, 1, P.rug2);
    if (d < md - 2) rect(ctx, cx - (md - 2 - d) * 3, my + dy, (md - 2 - d) * 6 + 1, 1, P.navy);
    if (d < md - 4) rect(ctx, cx - (md - 4 - d) * 3, my + dy, (md - 4 - d) * 6 + 1, 1, P.gold);
  }
}

/** Buttoned chesterfield sofa seen from the front. (cx, floorY) is the middle of its base. */
export function chesterfield(ctx: Ctx, cx: number, floorY: number, w = 36) {
  const x = Math.round(cx - w / 2);
  // back with button tufting
  rect(ctx, x + 2, floorY - 17, w - 4, 9, P.leather1);
  rect(ctx, x + 2, floorY - 17, w - 4, 1, P.leather3);
  for (let bx = x + 5; bx < x + w - 4; bx += 4) {
    rect(ctx, bx, floorY - 14, 1, 1, P.leather0);
    rect(ctx, bx + 2, floorY - 11, 1, 1, P.leather0);
  }
  // seat cushions
  rect(ctx, x + 4, floorY - 9, w - 8, 4, P.leather2);
  rect(ctx, x + 4, floorY - 9, w - 8, 1, P.leather3);
  rect(ctx, Math.round(cx), floorY - 9, 1, 4, P.leather1);
  // rolled arms
  for (const ax of [x, x + w - 5]) {
    rect(ctx, ax, floorY - 13, 5, 10, P.leather1);
    rect(ctx, ax, floorY - 13, 5, 2, P.leather2);
    rect(ctx, ax + 1, floorY - 13, 3, 1, P.leather3);
  }
  rect(ctx, x, floorY - 5, w, 3, P.leather0);
  rect(ctx, x + 2, floorY - 2, 2, 2, P.wood1);
  rect(ctx, x + w - 4, floorY - 2, 2, 2, P.wood1);
}

/** Leather club chair, seen from the front. */
export function clubChair(ctx: Ctx, cx: number, floorY: number) {
  chesterfield(ctx, cx, floorY, 17);
}

/** Low coffee table with a stack of books. */
export function coffeeTable(ctx: Ctx, cx: number, floorY: number, w = 24) {
  const x = Math.round(cx - w / 2);
  rect(ctx, x, floorY - 8, w, 2, P.wood5);
  rect(ctx, x, floorY - 8, w, 1, P.wood6);
  rect(ctx, x + 1, floorY - 6, w - 2, 3, P.wood2);
  rect(ctx, x + 1, floorY - 3, 2, 3, P.wood1);
  rect(ctx, x + w - 3, floorY - 3, 2, 3, P.wood1);
  rect(ctx, x + 3, floorY - 10, 7, 2, P.rug1);
  rect(ctx, x + 4, floorY - 12, 6, 2, P.navy);
}

/** Writing desk with drawers and a green banker's lamp. */
export function desk(ctx: Ctx, x: number, floorY: number, t: number) {
  const w = 30;
  rect(ctx, x, floorY - 14, w, 2, P.wood5);
  rect(ctx, x, floorY - 14, w, 1, P.wood6);
  rect(ctx, x + 1, floorY - 12, 9, 12, P.wood3);
  rect(ctx, x + w - 10, floorY - 12, 9, 12, P.wood3);
  for (const dx of [x + 1, x + w - 10]) {
    rect(ctx, dx, floorY - 8, 9, 1, P.wood1);
    rect(ctx, dx, floorY - 4, 9, 1, P.wood1);
    rect(ctx, dx + 4, floorY - 11, 1, 1, P.gold);
    rect(ctx, dx + 4, floorY - 7, 1, 1, P.gold);
  }
  rect(ctx, x + 10, floorY - 12, w - 20, 3, P.wood2);
  // papers and the lamp
  rect(ctx, x + 12, floorY - 15, 6, 1, P.parchment);
  rect(ctx, x + 23, floorY - 21, 1, 7, P.gold);
  rect(ctx, x + 19, floorY - 23, 8, 3, P.leaf1);
  rect(ctx, x + 19, floorY - 23, 8, 1, P.leaf2);
  rect(ctx, x + 20, floorY - 20, 6, 1, P.lamp);
  const f = flicker(t, 9) * 0.4 + 0.6;
  glow(ctx, x + 23, floorY - 18, Math.round(24 * f), P.lamp, 0.06, 4);
  floorGlow(ctx, x + 15, floorY - 14, 16, 3, P.lamp, 0.1);
}
