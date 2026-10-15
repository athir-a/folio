import { useEffect, useRef, useState } from 'react';
import { playTransition } from '../lib/sfx';
import { useSettings } from '../state/settingsStore';
import { useView, type View } from '../state/viewStore';
import { rect } from './draw';
import { P } from './palette';
import { HallScene } from './scenes/hallScene';
import { ShelfScene } from './scenes/shelfScene';
import type { Hover, Scene } from './scenes/types';

/** Rough art size we aim for; the real size adapts to the window at a whole-number scale. */
const TARGET = { landscape: [400, 250], portrait: [200, 360] } as const;
const IRIS_SECONDS = 0.45;

function pickScale(width: number, height: number) {
  const [tw, th] = width >= height ? TARGET.landscape : TARGET.portrait;
  return Math.max(1, Math.round(Math.min(width / tw, height / th)));
}

interface Transition {
  from: View;
  to: View;
  t: number;
  swapped: boolean;
}

/**
 * The pixel-art stage: a small canvas scaled up with crisp, square pixels.
 * It runs the scenes, the iris-wipe transition between hall and shelf, and
 * reports what's under the pointer so the HTML tooltip can follow it.
 */
export function PixelStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<(Hover & { scale: number }) | null>(null);
  const [clickable, setClickable] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const scenes: Record<View, Scene> = { hall: new HallScene(), shelf: new ShelfScene() };
    let shown: View = useView.getState().view;
    let transition: Transition | null = null;
    let scale = 1;
    let lastHoverKey: string | null = null;

    const resize = () => {
      scale = pickScale(window.innerWidth, window.innerHeight);
      canvas.width = Math.ceil(window.innerWidth / scale);
      canvas.height = Math.ceil(window.innerHeight / scale);
      canvas.style.width = `${canvas.width * scale}px`;
      canvas.style.height = `${canvas.height * scale}px`;
      ctx.imageSmoothingEnabled = false;
      scenes.hall.resize(canvas.width, canvas.height, scale);
      scenes.shelf.resize(canvas.width, canvas.height, scale);
    };
    resize();
    window.addEventListener('resize', resize);

    // a new destination starts an iris wipe; the scene swaps when the circle is closed
    const unsubscribe = useView.subscribe((state, prev) => {
      if (state.view === prev.view) return;
      transition = { from: shown, to: state.view, t: 0, swapped: false };
      if (!useSettings.getState().muted) playTransition();
    });

    const toArt = (e: PointerEvent | MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: Math.floor((e.clientX - r.left) / scale), y: Math.floor((e.clientY - r.top) / scale) };
    };
    const onMove = (e: PointerEvent) => {
      if (transition) return;
      const p = toArt(e);
      setClickable(scenes[shown].pointer(p.x, p.y));
    };
    const onClick = (e: MouseEvent) => {
      if (transition) return;
      const p = toArt(e);
      scenes[shown].click(p.x, p.y);
    };
    const onLeave = () => {
      scenes[shown].pointer(-1, -1);
      setClickable(false);
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('pointerleave', onLeave);

    let raf = 0;
    let last = performance.now();
    const start = last;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const time = (now - start) / 1000;

      if (transition) {
        transition.t += dt;
        if (!transition.swapped && transition.t >= IRIS_SECONDS) {
          transition.swapped = true;
          shown = transition.to;
          scenes[shown].pointer(-1, -1);
        }
        if (transition.t >= IRIS_SECONDS * 2) {
          transition = null;
          useView.getState().markArrived();
        }
      }

      const scene = scenes[shown];
      scene.update(dt, time);
      scene.draw(ctx, time);

      if (transition) drawIris(ctx, canvas.width, canvas.height, transition, scenes);

      // keep the tooltip in sync without re-rendering React every frame
      const h = transition ? null : scene.hover();
      const key = h ? `${h.key}:${h.x}:${h.y}:${h.subtitle}` : null;
      if (key !== lastHoverKey) {
        lastHoverKey = key;
        setHover(h ? { ...h, scale } : null);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      unsubscribe();
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className={`pixel-stage ${clickable ? 'pixel-stage--clickable' : ''}`} />
      {hover && (
        <div
          className={`pixel-tooltip ${showBelow(hover) ? 'pixel-tooltip--below' : ''}`}
          style={{ left: hover.x * hover.scale, top: (showBelow(hover) ? hover.below! : hover.y) * hover.scale }}
        >
          <strong>{hover.title}</strong>
          {hover.subtitle && <span>{hover.subtitle}</span>}
        </div>
      )}
    </>
  );
}

/** Near the top of the screen there is no room for the tooltip above, so it goes below. */
const showBelow = (h: Hover & { scale: number }) => h.below !== undefined && h.y * h.scale < 130;

/** Classic circle wipe: closes on the old scene's focus point, opens on the new one's. */
function drawIris(ctx: CanvasRenderingContext2D, w: number, h: number, tr: Transition, scenes: Record<View, Scene>) {
  const closing = tr.t < IRIS_SECONDS;
  const k = closing ? tr.t / IRIS_SECONDS : (tr.t - IRIS_SECONDS) / IRIS_SECONDS;
  const focus = scenes[closing ? tr.from : tr.to].focus();
  const maxR = Math.hypot(Math.max(focus.x, w - focus.x), Math.max(focus.y, h - focus.y));
  const r = Math.round(maxR * (closing ? 1 - k * k : k * k));
  // fill everything outside the circle, row by row, so the edge stays pixel-crisp
  for (let y = 0; y < h; y++) {
    const dy = y - focus.y;
    if (Math.abs(dy) >= r) {
      rect(ctx, 0, y, w, 1, P.shadow);
      continue;
    }
    const half = Math.floor(Math.sqrt(r * r - dy * dy));
    rect(ctx, 0, y, Math.max(0, focus.x - half), 1, P.shadow);
    rect(ctx, focus.x + half, y, Math.max(0, w - focus.x - half), 1, P.shadow);
  }
}
