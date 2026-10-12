import * as THREE from 'three';
import { luminance, shade } from '../../lib/color';
import { mulberry32 } from '../../lib/random';

/**
 * Textures that are unique per object (book spines, the curtain print…) are
 * painted on a canvas at runtime. Generic surfaces (wood, plaster, fabric
 * weave) use the scanned PBR textures in public/assets instead.
 */

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

  // subtle tonal variation, as real bookcloth is never perfectly flat
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

  // head and tail bands
  paint((c) => {
    for (const y of [H * 0.065, H * 0.935]) {
      c.fillRect(W * 0.08, y - 7, W * 0.84, 5);
      c.fillRect(W * 0.08, y + 5, W * 0.84, 2.5);
    }
  });

  const fontSize = Math.min(W * 0.42, 52);
  const font = `700 ${fontSize}px Fraunces, Georgia, serif`;
  paint((c) => {
    c.save();
    c.translate(W / 2, H / 2);
    c.rotate(Math.PI / 2);
    c.font = font;
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
  ctx.fillStyle = '#f3e7cf';
  ctx.fillRect(0, 0, 256, 64);
  bump.fillStyle = '#fff';
  bump.fillRect(0, 0, 256, 64);
  const rand = mulberry32(21);
  for (let x = 0; x < 256; x += 2) {
    const a = 0.06 + rand() * 0.12;
    ctx.fillStyle = `rgba(120, 90, 60, ${a})`;
    ctx.fillRect(x, 0, 1, 64);
    bump.fillStyle = `rgba(0, 0, 0, ${0.4 + rand() * 0.4})`;
    bump.fillRect(x, 0, 1, 64);
  }
  return { map: toTexture(canvas), bump: toTexture(bumpCanvas, false) };
}

/** Light "cookie" projected by the sun spotlight: window panes plus leaf shadows. */
export function windowCookieTexture() {
  const [canvas, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 512, 512);
  ctx.filter = 'blur(6px)';
  ctx.fillStyle = '#fff';
  const pane = 110;
  const gap = 14;
  const ox = 256 - pane - gap / 2;
  const oy = 256 - pane * 1.5 - gap;
  for (let c = 0; c < 2; c++) {
    for (let r = 0; r < 3; r++) ctx.fillRect(ox + c * (pane + gap), oy + r * (pane + gap), pane, pane);
  }
  ctx.filter = 'blur(8px)';
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  const rand = mulberry32(3);
  for (let i = 0; i < 26; i++) {
    ctx.beginPath();
    ctx.ellipse(130 + rand() * 120, 90 + rand() * 330, 10 + rand() * 18, 5 + rand() * 7, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  return toTexture(canvas, false);
}

/** The bright garden view outside the window. */
export function outdoorTexture() {
  const [canvas, ctx] = makeCanvas(1024, 1024);
  const sky = ctx.createLinearGradient(0, 0, 0, 1024);
  sky.addColorStop(0, '#5fb6f2');
  sky.addColorStop(0.55, '#bfe5fb');
  sky.addColorStop(0.75, '#f6efd9');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1024, 1024);
  const rand = mulberry32(11);

  ctx.filter = 'blur(10px)';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  for (let i = 0; i < 9; i++) {
    const x = rand() * 1024;
    const y = 80 + rand() * 260;
    for (let k = 0; k < 5; k++) {
      ctx.beginPath();
      ctx.arc(x + k * 34 - 60, y + Math.sin(k) * 14, 30 + rand() * 30, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // distant house facade
  ctx.filter = 'blur(3px)';
  ctx.fillStyle = '#f0d59a';
  ctx.fillRect(560, 520, 300, 240);
  ctx.fillStyle = '#8e5a43';
  ctx.beginPath();
  ctx.moveTo(540, 525);
  ctx.lineTo(710, 420);
  ctx.lineTo(880, 525);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  for (const [x, y] of [[600, 570], [700, 570], [790, 570]]) ctx.fillRect(x, y, 44, 60);
  // trees and hedges, several depth layers
  ctx.filter = 'blur(4px)';
  const greens = ['#3f7f3a', '#4f9447', '#62a854', '#77b960'];
  for (let layer = 0; layer < 4; layer++) {
    ctx.fillStyle = greens[layer];
    for (let i = 0; i < 22; i++) {
      ctx.beginPath();
      ctx.arc(rand() * 1100 - 40, 700 + layer * 70 + rand() * 50, 40 + rand() * 60, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.filter = 'blur(2px)';
  const flowers = ['#ff6f91', '#ffd166', '#ff8c42', '#f72585', '#fff1e6'];
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = flowers[i % flowers.length];
    ctx.beginPath();
    ctx.arc(rand() * 1024, 900 + rand() * 120, 4 + rand() * 5, 0, Math.PI * 2);
    ctx.fill();
  }
  return toTexture(canvas);
}

/** Printed leaf pattern for the teal velvet curtains. */
export function curtainPrintTexture() {
  const [canvas, ctx] = makeCanvas(1024, 1024);
  ctx.fillStyle = '#0f5c63';
  ctx.fillRect(0, 0, 1024, 1024);
  const rand = mulberry32(5);
  for (let i = 0; i < 70; i++) {
    const x = rand() * 1024;
    const y = rand() * 1024;
    const len = 60 + rand() * 70;
    const lean = -0.5 + rand();
    // a fern-like frond: stem plus paired leaflets
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(lean);
    const gold = rand() > 0.4;
    ctx.strokeStyle = gold ? 'rgba(214, 170, 82, 0.85)' : 'rgba(64, 170, 160, 0.85)';
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -len);
    ctx.stroke();
    for (let k = 1; k < 7; k++) {
      const py = (-len * k) / 7;
      const s = (1 - k / 8) * 14;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(side * s * 0.7, py, s, s * 0.35, side * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
  const tex = toTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Woven flat-weave rug with colourful vintage borders. */
export function rugTexture() {
  const [canvas, ctx] = makeCanvas(1024, 640);
  ctx.fillStyle = '#efe0c4';
  ctx.fillRect(0, 0, 1024, 640);
  const bands = ['#d9563f', '#e5a630', '#2a5bc4', '#2ba59a', '#d9563f'];
  bands.forEach((c, i) => {
    ctx.strokeStyle = c;
    ctx.lineWidth = 12;
    const m = 34 + i * 24;
    ctx.strokeRect(m, m, 1024 - m * 2, 640 - m * 2);
  });
  // central medallion of diamonds
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = bands[i % 4];
    ctx.save();
    ctx.translate(512 + (i - 3) * 82, 320);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-22, -22, 44, 44);
    ctx.fillStyle = '#efe0c4';
    ctx.fillRect(-9, -9, 18, 18);
    ctx.restore();
  }
  // yarn irregularity
  const rand = mulberry32(8);
  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = `rgba(${rand() > 0.5 ? '255,255,255' : '60,40,20'}, ${rand() * 0.06})`;
    ctx.fillRect(rand() * 1024, rand() * 640, 3 + rand() * 6, 1.5);
  }
  return toTexture(canvas);
}

/**
 * Pothos leaf in leaf-UV space (0..1 across the leaf's bounding box):
 * colour with golden variegation, plus a bump map for the midrib and veins.
 */
export function leafTextures() {
  const S = 256;
  const [canvas, ctx] = makeCanvas(S, S);
  const [bumpCanvas, bump] = makeCanvas(S, S);
  const base = ctx.createLinearGradient(0, S, 0, 0);
  base.addColorStop(0, '#3f8a3a');
  base.addColorStop(1, '#4f9c43');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, S, S);
  const rand = mulberry32(31);
  ctx.filter = 'blur(3px)';
  ctx.strokeStyle = 'rgba(214, 222, 120, 0.55)';
  for (let i = 0; i < 9; i++) {
    ctx.lineWidth = 2 + rand() * 5;
    ctx.beginPath();
    const x = S / 2 + (rand() - 0.5) * S * 0.6;
    ctx.moveTo(S / 2, S * 0.95);
    ctx.quadraticCurveTo(x, S * 0.5, x + (rand() - 0.5) * 60, S * 0.1);
    ctx.stroke();
  }
  ctx.filter = 'none';

  bump.fillStyle = '#808080';
  bump.fillRect(0, 0, S, S);
  const veins = (c: CanvasRenderingContext2D, colour: string) => {
    c.strokeStyle = colour;
    c.lineCap = 'round';
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(S / 2, S);
    c.lineTo(S / 2, 0);
    c.stroke();
    c.lineWidth = 2.5;
    for (let k = 1; k < 7; k++) {
      const y = S - (k * S) / 7.5;
      for (const side of [-1, 1]) {
        c.beginPath();
        c.moveTo(S / 2, y);
        c.quadraticCurveTo(S / 2 + side * S * 0.2, y - 18, S / 2 + side * S * 0.42, y - 40);
        c.stroke();
      }
    }
  };
  veins(ctx, 'rgba(190, 220, 140, 0.45)');
  bump.filter = 'blur(1.5px)';
  veins(bump, '#3a3a3a');
  return { map: toTexture(canvas), bump: toTexture(bumpCanvas, false) };
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

/** Soft vertical gradient used for the faint sunbeam shaft. */
export function beamTexture() {
  const [canvas, ctx] = makeCanvas(64, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.3, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 256);
  const h = ctx.createLinearGradient(0, 0, 64, 0);
  h.addColorStop(0, 'rgba(0,0,0,1)');
  h.addColorStop(0.5, 'rgba(0,0,0,0)');
  h.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = h;
  ctx.fillRect(0, 0, 64, 256);
  return toTexture(canvas);
}
