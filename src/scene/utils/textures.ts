import * as THREE from 'three';
import { luminance, shade } from '../../lib/color';
import { mulberry32 } from '../../lib/random';

/**
 * Textures that are unique to this library (book spines, the rug, the night
 * sky…) are painted on a canvas at runtime. Generic surfaces (wood, plaster,
 * fabric weave) use the scanned PBR textures in public/assets instead.
 */

export const DISPLAY_FONT = '"Cormorant Garamond", "EB Garamond", Georgia, serif';

function makeCanvas(w: number, h: number) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return [canvas, canvas.getContext('2d')!] as const;
}

function toTexture(canvas: HTMLCanvasElement, srgb = true) {
  const tex = new THREE.CanvasTexture(canvas);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

export interface SpineTextures {
  map: THREE.Texture;
  /** Green = roughness, blue = metalness. Makes the foil title actually shine. */
  orm: THREE.Texture;
}

/**
 * Book spine: bookcloth colour with gold-foil bands and title (or dark ink on
 * light-coloured books). Drawn twice: once for colour, once for the
 * roughness/metalness mask so the foil reflects light like the real thing.
 */
export function spineTextures(title: string, color: string, thickness: number, height: number): SpineTextures {
  const H = 1024;
  const W = Math.max(64, Math.round((H * thickness) / height)); // keep the true aspect so letters are not squashed
  const foil = luminance(color) < 0.45;
  const [canvas, ctx] = makeCanvas(W, H);
  const [ormCanvas, orm] = makeCanvas(W, H);

  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, shade(color, -0.03));
  g.addColorStop(0.5, color);
  g.addColorStop(1, shade(color, -0.05));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  orm.fillStyle = 'rgb(0, 210, 0)'; // cloth: rough, non-metal
  orm.fillRect(0, 0, W, H);

  const ink = foil ? '#e2bd6a' : '#2b1d14';
  const inkOrm = foil ? 'rgb(0, 85, 255)' : 'rgb(0, 150, 0)';
  const paint = (draw: (c: CanvasRenderingContext2D) => void) => {
    ctx.fillStyle = ink;
    orm.fillStyle = inkOrm;
    draw(ctx);
    draw(orm);
  };

  paint((c) => {
    for (const y of [H * 0.065, H * 0.935]) {
      c.fillRect(W * 0.08, y - 7, W * 0.84, 5);
      c.fillRect(W * 0.08, y + 5, W * 0.84, 2.5);
    }
  });

  const fontSize = Math.min(W * 0.6, 72); // as large as the spine allows, so titles read from the shelf view
  paint((c) => {
    c.save();
    c.translate(W / 2, H / 2);
    c.rotate(Math.PI / 2);
    c.font = `700 ${fontSize}px ${DISPLAY_FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(fitText(c, title, H * 0.72), 0, 2);
    c.restore();
  });

  return { map: toTexture(canvas), orm: toTexture(ormCanvas, false) };
}

/** Page block: cream paper with fine lines between the leaves. Returned as colour + bump. */
export function pagesTextures() {
  const [canvas, ctx] = makeCanvas(256, 64);
  const [bumpCanvas, bump] = makeCanvas(256, 64);
  ctx.fillStyle = '#efe2c6';
  ctx.fillRect(0, 0, 256, 64);
  bump.fillStyle = '#fff';
  bump.fillRect(0, 0, 256, 64);
  const rand = mulberry32(21);
  for (let x = 0; x < 256; x += 2) {
    ctx.fillStyle = `rgba(120, 90, 60, ${0.06 + rand() * 0.12})`;
    ctx.fillRect(x, 0, 1, 64);
    bump.fillStyle = `rgba(0, 0, 0, ${0.4 + rand() * 0.4})`;
    bump.fillRect(x, 0, 1, 64);
  }
  return { map: toTexture(canvas), bump: toTexture(bumpCanvas, false) };
}

/**
 * Spine detail shared by the thousands of library books: a white base (so the
 * per-book colour shows through) with tooled bands near head and tail.
 */
export function fillerSpineTexture() {
  const [canvas, ctx] = makeCanvas(32, 256);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 32, 256);
  ctx.fillStyle = '#d8b46a';
  for (const y of [22, 30, 226, 234]) ctx.fillRect(3, y, 26, 3);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(5, 70, 22, 110); // title label
  ctx.fillStyle = 'rgba(216,180,106,0.8)';
  for (let y = 84; y < 170; y += 14) ctx.fillRect(10, y, 12, 2);
  return toTexture(canvas);
}

/**
 * The view through the great window: deep blue night, drifting clouds, moonlit
 * snowy mountains and a city of warm lights in the valley. Stars are added as
 * real points in the scene so they can twinkle.
 */
export function nightSkyTexture() {
  const W = 2048;
  const H = 1536;
  const [canvas, ctx] = makeCanvas(W, H);
  const rand = mulberry32(77);
  const horizon = H * 0.62;

  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, '#060c22');
  sky.addColorStop(0.55, '#10254f');
  sky.addColorStop(1, '#2a4f8c');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // soft moonlit clouds: stretched radial gradients. (No canvas filters here:
  // they re-blur on every draw call and stall the page for seconds.)
  for (let i = 0; i < 26; i++) {
    const x = rand() * W;
    const y = horizon * (0.25 + rand() * 0.6);
    const rx = 120 + rand() * 260;
    const ry = 30 + rand() * 50;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(rx / ry, 1);
    const cloud = ctx.createRadialGradient(0, 0, 0, 0, 0, ry * 1.6);
    cloud.addColorStop(0, `rgba(120, 160, 225, ${0.1 + rand() * 0.14})`);
    cloud.addColorStop(1, 'rgba(120, 160, 225, 0)');
    ctx.fillStyle = cloud;
    ctx.fillRect(-ry * 1.6, -ry * 1.6, ry * 3.2, ry * 3.2);
    ctx.restore();
  }

  // mountain ranges, far to near
  const ranges = [
    { base: horizon + 10, peak: 360, color: '#1e3866', snow: 'rgba(200, 220, 255, 0.55)', jag: 0.9 },
    { base: horizon + 60, peak: 240, color: '#152a50', snow: 'rgba(170, 195, 240, 0.35)', jag: 1.1 },
    { base: horizon + 120, peak: 150, color: '#0f1f3c', snow: null, jag: 1.3 },
  ];
  ranges.forEach((r) => {
    // a ridge line built from a few big peaks plus finer jagged detail
    const pts: [number, number][] = [];
    for (let x = -40; x <= W + 80; x += 12) {
      const centre = Math.abs(x - W * 0.42) / W; // tallest peaks a little left of centre
      const big = Math.abs(Math.sin(x * 0.0042 + r.base)) ** 1.6;
      const detail = Math.sin(x * 0.031 + r.peak) * 0.08 + (rand() - 0.5) * 0.06 * r.jag;
      const h = r.peak * Math.max(0.12, (1 - centre * 1.2) * (0.35 + big * 0.65 + detail));
      pts.push([x, r.base - h]);
    }
    const ridge = () => {
      ctx.beginPath();
      ctx.moveTo(-40, H);
      pts.forEach(([px, py]) => ctx.lineTo(px, py));
      ctx.lineTo(W + 80, H);
      ctx.closePath();
    };
    ctx.fillStyle = r.color;
    ridge();
    ctx.fill();
    if (r.snow) {
      // moonlit snow on the upper slopes, fading down the mountainside
      ctx.save();
      ridge();
      ctx.clip();
      const snow = ctx.createLinearGradient(0, r.base - r.peak, 0, r.base - r.peak * 0.35);
      snow.addColorStop(0, r.snow);
      snow.addColorStop(1, 'rgba(160, 190, 240, 0)');
      ctx.fillStyle = snow;
      ctx.fillRect(0, r.base - r.peak - 10, W, r.peak);
      ctx.restore();
    }
  });

  // the city: towers and spires, then thousands of warm windows
  const cityTop = horizon + 90;
  ctx.fillStyle = '#0b1530';
  for (let i = 0; i < 140; i++) {
    const x = rand() * W;
    const w = 14 + rand() * 40;
    const h = 30 + rand() * 120 * (1 - Math.abs(x - W / 2) / W);
    const y = cityTop + 120 + rand() * (H - cityTop - 120);
    ctx.fillRect(x, y - h, w, h);
    if (rand() > 0.6) {
      ctx.beginPath();
      ctx.moveTo(x - 2, y - h);
      ctx.lineTo(x + w / 2, y - h - 30 - rand() * 50);
      ctx.lineTo(x + w + 2, y - h);
      ctx.fill();
    }
  }
  for (let i = 0; i < 2600; i++) {
    const y = cityTop + Math.pow(rand(), 0.7) * (H - cityTop);
    const spread = 0.3 + ((y - cityTop) / (H - cityTop)) * 0.7;
    const x = W / 2 + (rand() - 0.5) * W * spread * 1.2;
    const warm = rand();
    ctx.fillStyle = warm > 0.15 ? `rgba(255, ${190 + rand() * 50}, ${110 + rand() * 50}, ${0.5 + rand() * 0.5})` : 'rgba(180, 210, 255, 0.6)';
    const s = 1.5 + rand() * 2.5;
    ctx.fillRect(x, y, s, s);
  }
  // warm haze over the city
  const haze = ctx.createLinearGradient(0, cityTop, 0, H);
  haze.addColorStop(0, 'rgba(255, 170, 90, 0)');
  haze.addColorStop(1, 'rgba(255, 170, 90, 0.18)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, cityTop, W, H - cityTop);
  return toTexture(canvas);
}

/** Antique Persian rug: madder-red field, navy borders, central medallion. */
export function persianRugTexture() {
  const W = 1536;
  const H = 1024;
  const [canvas, ctx] = makeCanvas(W, H);
  const rand = mulberry32(13);
  ctx.fillStyle = '#7d2324';
  ctx.fillRect(0, 0, W, H);

  const border = (m: number, w: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.strokeRect(m, m, W - m * 2, H - m * 2);
  };
  border(30, 50, '#1b2847');
  border(30, 4, '#d8b46a');
  border(55, 4, '#d8b46a');
  border(95, 22, '#a8432f');
  // tiny motifs along the main border
  ctx.fillStyle = '#d8b46a';
  for (let x = 60; x < W - 60; x += 34) {
    for (const y of [30, H - 30]) {
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (let y = 60; y < H - 60; y += 34) {
    for (const x of [30, W - 30]) {
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // field pattern
  for (let i = 0; i < 260; i++) {
    const x = 140 + rand() * (W - 280);
    const y = 140 + rand() * (H - 280);
    ctx.fillStyle = ['#a8432f', '#1b2847', '#c99a4f', '#5a1a1c'][i % 4];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    const s = 6 + rand() * 10;
    ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.restore();
  }
  // central medallion
  ctx.save();
  ctx.translate(W / 2, H / 2);
  const rings: [number, string][] = [
    [300, '#1b2847'],
    [270, '#d8b46a'],
    [255, '#a8432f'],
    [190, '#1b2847'],
    [120, '#c99a4f'],
    [60, '#7d2324'],
  ];
  rings.forEach(([r, c]) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    for (let k = 0; k <= 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const rr = k % 2 ? r * 0.82 : r;
      ctx.lineTo(Math.cos(a) * rr * 1.25, Math.sin(a) * rr * 0.8);
    }
    ctx.fill();
  });
  ctx.restore();
  // wear and yarn variation, gentle
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = `rgba(${rand() > 0.5 ? '255,235,210' : '20,10,10'}, ${rand() * 0.07})`;
    ctx.fillRect(rand() * W, rand() * H, 2 + rand() * 6, 1.5);
  }
  return toTexture(canvas);
}

/** Navy velvet banner with a golden crescent moon and star. */
export function bannerTexture() {
  const [canvas, ctx] = makeCanvas(512, 1280);
  ctx.fillStyle = '#16244a';
  ctx.fillRect(0, 0, 512, 1280);
  ctx.strokeStyle = '#d8b46a';
  ctx.lineWidth = 10;
  ctx.strokeRect(28, 28, 456, 1224);
  ctx.lineWidth = 3;
  ctx.strokeRect(48, 48, 416, 1184);
  ctx.fillStyle = '#e2c27a';
  ctx.beginPath();
  ctx.arc(256, 560, 150, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#16244a';
  ctx.beginPath();
  ctx.arc(306, 520, 140, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e2c27a';
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
    const r = k % 2 ? 18 : 46;
    ctx.lineTo(300 + Math.cos(a) * r, 330 + Math.sin(a) * r);
  }
  ctx.fill();
  return toTexture(canvas);
}

/** Small engraved brass plaque for the visitor's bay. */
export function plaqueTexture(text: string) {
  const [canvas, ctx] = makeCanvas(512, 128);
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, '#e6c77e');
  g.addColorStop(0.5, '#c9a052');
  g.addColorStop(1, '#a37a35');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#6e4f1f';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, 492, 108);
  ctx.fillStyle = '#3d2a10';
  ctx.font = `700 54px ${DISPLAY_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 68);
  return toTexture(canvas);
}

/** Radial "item get!" rays used behind a newly added book. */
export function raysTexture() {
  const [canvas, ctx] = makeCanvas(512, 512);
  const g = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  g.addColorStop(0, 'rgba(255, 244, 200, 1)');
  g.addColorStop(0.35, 'rgba(255, 210, 120, 0.55)');
  g.addColorStop(1, 'rgba(255, 180, 90, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  ctx.translate(256, 256);
  for (let i = 0; i < 12; i++) {
    ctx.rotate((Math.PI * 2) / 12);
    const rg = ctx.createLinearGradient(0, 0, 0, -256);
    rg.addColorStop(0, 'rgba(255,255,230,0.6)');
    rg.addColorStop(1, 'rgba(255,255,230,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(-28, -256);
    ctx.lineTo(28, -256);
    ctx.lineTo(10, 0);
    ctx.fill();
  }
  return toTexture(canvas);
}
