import * as THREE from 'three';
import { luminance, shade } from '../../lib/color';
import { mulberry32 } from '../../lib/random';

/**
 * Every texture in the room is painted on a canvas at runtime, so the scene
 * needs no image assets.
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

/** Book spine: cloth-like colour, gold bands and the title running top-to-bottom. */
export function spineTexture(title: string, color: string, thickness: number, height: number) {
  const H = 512;
  const W = Math.max(40, Math.round((H * thickness) / height));
  const [canvas, ctx] = makeCanvas(W, H);

  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, shade(color, -0.18));
  g.addColorStop(0.3, color);
  g.addColorStop(0.65, shade(color, 0.06));
  g.addColorStop(1, shade(color, -0.22));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // faint cloth weave
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = '#000';
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
  ctx.globalAlpha = 1;

  const dark = luminance(color) > 0.5;
  const accent = dark ? '#3b2a20' : '#ffe6a8';
  ctx.fillStyle = accent;
  for (const y of [H * 0.07, H * 0.93]) {
    ctx.fillRect(0, y - 4, W, 3);
    ctx.fillRect(0, y + 3, W, 1.5);
  }

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(Math.PI / 2);
  const fontSize = Math.min(W * 0.48, 34);
  ctx.font = `700 ${fontSize}px Fraunces, Georgia, serif`;
  ctx.fillStyle = dark ? '#2b1d14' : '#fff8ec';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(fitText(ctx, title, H * 0.74), 0, 1);
  ctx.restore();

  return toTexture(canvas);
}

/** Page block seen from the top / fore-edge of a book. */
export function pagesTexture() {
  const [canvas, ctx] = makeCanvas(64, 256);
  ctx.fillStyle = '#f6ecd8';
  ctx.fillRect(0, 0, 64, 256);
  ctx.fillStyle = 'rgba(120, 90, 60, 0.18)';
  for (let x = 0; x < 64; x += 2) ctx.fillRect(x, 0, 1, 256);
  return toTexture(canvas);
}

/** Honey-coloured wooden floor planks. */
export function woodFloorTexture() {
  const [canvas, ctx] = makeCanvas(1024, 1024);
  const rand = mulberry32(7);
  const planks = 8;
  const pw = 1024 / planks;
  const tones = ['#c98b4f', '#bf7f45', '#d39a5c', '#b8763f', '#cc9255'];
  for (let i = 0; i < planks; i++) {
    let y = -rand() * 400;
    while (y < 1024) {
      const len = 300 + rand() * 500;
      ctx.fillStyle = tones[Math.floor(rand() * tones.length)];
      ctx.fillRect(i * pw, y, pw, len);
      // grain
      ctx.strokeStyle = 'rgba(90, 50, 20, 0.16)';
      ctx.lineWidth = 1.5;
      for (let k = 0; k < 7; k++) {
        const gx = i * pw + 6 + rand() * (pw - 12);
        ctx.beginPath();
        for (let yy = y; yy < y + len; yy += 8) ctx.lineTo(gx + Math.sin(yy * 0.02 + k) * 3, yy);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(60, 30, 10, 0.55)';
      ctx.fillRect(i * pw, y, pw, 2);
      y += len;
    }
    ctx.fillStyle = 'rgba(60, 30, 10, 0.5)';
    ctx.fillRect(i * pw, 0, 2, 1024);
  }
  const tex = toTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

/** Light "cookie" projected by the sun spotlight: window panes plus leaf shadows. */
export function windowCookieTexture() {
  const [canvas, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 512, 512);
  ctx.filter = 'blur(5px)';
  ctx.fillStyle = '#fff';
  const pane = 110;
  const gap = 14;
  const ox = 256 - pane - gap / 2;
  const oy = 256 - pane * 1.5 - gap;
  for (let c = 0; c < 2; c++) {
    for (let r = 0; r < 3; r++) ctx.fillRect(ox + c * (pane + gap), oy + r * (pane + gap), pane, pane);
  }
  ctx.filter = 'blur(7px)';
  ctx.fillStyle = '#000';
  const rand = mulberry32(3);
  for (let i = 0; i < 26; i++) {
    ctx.beginPath();
    ctx.ellipse(130 + rand() * 120, 90 + rand() * 330, 10 + rand() * 18, 5 + rand() * 7, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  return toTexture(canvas, false);
}

/** Bright sky seen through the window. */
export function skyTexture() {
  const [canvas, ctx] = makeCanvas(256, 384);
  const g = ctx.createLinearGradient(0, 0, 0, 384);
  g.addColorStop(0, '#6ec3ff');
  g.addColorStop(0.6, '#c9ecff');
  g.addColorStop(1, '#fff6dc');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 384);
  ctx.filter = 'blur(6px)';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (const [x, y, r] of [[60, 70, 28], [95, 62, 34], [130, 76, 24], [190, 150, 20], [215, 145, 26]]) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.filter = 'blur(2px)';
  const greens = ['#5fae5a', '#4a9a4f', '#7cc36a'];
  const rand = mulberry32(11);
  for (let i = 0; i < 18; i++) {
    ctx.fillStyle = greens[i % 3];
    ctx.beginPath();
    ctx.arc(rand() * 256, 330 + rand() * 40, 25 + rand() * 25, 0, Math.PI * 2);
    ctx.fill();
  }
  return toTexture(canvas);
}

/** Teal curtain fabric with golden leaf print (like the reference). */
export function curtainTexture() {
  const [canvas, ctx] = makeCanvas(512, 1024);
  ctx.fillStyle = '#12676d';
  ctx.fillRect(0, 0, 512, 1024);
  const rand = mulberry32(5);
  for (let i = 0; i < 140; i++) {
    const x = rand() * 512;
    const y = rand() * 1024;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.6 + rand() * 1.2);
    ctx.fillStyle = rand() > 0.45 ? 'rgba(232, 190, 96, 0.75)' : 'rgba(46, 176, 168, 0.8)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 7, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  const tex = toTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Woven rug with colourful stripes. */
export function rugTexture() {
  const [canvas, ctx] = makeCanvas(512, 320);
  ctx.fillStyle = '#f4e4c9';
  ctx.fillRect(0, 0, 512, 320);
  const stripes = ['#ff6f59', '#f2b134', '#2155c4', '#2ec4b6'];
  stripes.forEach((c, i) => {
    ctx.strokeStyle = c;
    ctx.lineWidth = 8;
    const m = 18 + i * 14;
    ctx.strokeRect(m, m, 512 - m * 2, 320 - m * 2);
  });
  ctx.fillStyle = 'rgba(0,0,0,0.05)';
  for (let y = 0; y < 320; y += 4) ctx.fillRect(0, y, 512, 1);
  // centre diamonds
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = stripes[i % stripes.length];
    ctx.save();
    ctx.translate(136 + i * 60, 160);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-14, -14, 28, 28);
    ctx.restore();
  }
  return toTexture(canvas);
}

/** Small botanical print for the picture frame. */
export function artTexture() {
  const [canvas, ctx] = makeCanvas(256, 320);
  ctx.fillStyle = '#f7efe0';
  ctx.fillRect(0, 0, 256, 320);
  ctx.strokeStyle = '#3f7d4e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(128, 290);
  ctx.bezierCurveTo(120, 220, 140, 120, 126, 40);
  ctx.stroke();
  ctx.fillStyle = '#4f9a5e';
  for (let i = 0; i < 9; i++) {
    const y = 260 - i * 24;
    const side = i % 2 ? 1 : -1;
    ctx.save();
    ctx.translate(128 + side * 4, y);
    ctx.rotate(side * 0.9);
    ctx.beginPath();
    ctx.ellipse(0, -22, 10, 24 - i, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#ff8fab';
  ctx.beginPath();
  ctx.arc(126, 38, 12, 0, Math.PI * 2);
  ctx.fill();
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
