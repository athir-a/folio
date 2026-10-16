/**
 * Detects a hand waved sideways in front of the webcam.
 *
 * This is the classic OpenCV motion recipe, done on a tiny frame so it's cheap:
 * grey-scale each frame, take the absolute difference from the previous one,
 * threshold it into a motion mask, and follow the mask's centroid. A centroid
 * that sweeps steadily across the frame is a wave.
 */

export type Swipe = 'left' | 'right';

export interface WaveFrame {
  /** Share of the frame that moved, 0..1. */
  motion: number;
  /** Where the movement is, 0 (viewer's left) .. 1 (viewer's right), or null if still. */
  x: number | null;
}

const W = 80;
const H = 60;
/** Brightness change (0..255) for a pixel to count as moving. */
const PIXEL_THRESHOLD = 30;
/** Less than this share of the frame moving is just noise. */
const MIN_MOTION = 0.015;
/** More than this is the camera re-exposing or being bumped, not a hand. */
const MAX_MOTION = 0.6;
/** A wave must travel this far across the frame... */
const MIN_TRAVEL = 0.3;
/** ...within this long. */
const WINDOW_MS = 700;
const COOLDOWN_MS = 900;

interface Sample {
  t: number;
  x: number;
}

export class WaveDetector {
  private video = document.createElement('video');
  private canvas = document.createElement('canvas');
  private ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
  private prev: Uint8Array | null = null;
  private history: Sample[] = [];
  private lastMotionAt = 0;
  private cooldownUntil = 0;
  private stream: MediaStream | null = null;
  private raf = 0;
  private lastTick = 0;

  constructor(
    private onSwipe: (dir: Swipe) => void,
    private onFrame?: (frame: WaveFrame) => void,
  ) {
    this.canvas.width = W;
    this.canvas.height = H;
    this.video.muted = true;
    this.video.playsInline = true;
  }

  /** The live camera feed, for showing a preview. */
  get mediaStream(): MediaStream | null {
    return this.stream;
  }

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: 'user' }, audio: false });
    this.video.srcObject = this.stream;
    await this.video.play();
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      // ~30 checks a second is plenty for a wave
      if (now - this.lastTick < 33) return;
      this.lastTick = now;
      this.tick(now);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.video.srcObject = null;
    this.prev = null;
    this.history = [];
  }

  private tick(now: number) {
    if (this.video.readyState < 2) return;
    this.ctx.drawImage(this.video, 0, 0, W, H);
    const rgba = this.ctx.getImageData(0, 0, W, H).data;
    const grey = new Uint8Array(W * H);
    for (let i = 0; i < grey.length; i++) grey[i] = (rgba[i * 4] * 77 + rgba[i * 4 + 1] * 150 + rgba[i * 4 + 2] * 29) >> 8;

    const prev = this.prev;
    this.prev = grey;
    if (!prev) return;

    // motion mask and its centroid
    let count = 0;
    let sumX = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (Math.abs(grey[i] - prev[i]) > PIXEL_THRESHOLD) {
          count++;
          sumX += x;
        }
      }
    }
    const motion = count / (W * H);
    // the camera sees you mirrored; flip so "left" means your left on screen
    const x = motion >= MIN_MOTION && motion <= MAX_MOTION ? 1 - sumX / count / (W - 1) : null;
    this.onFrame?.({ motion, x });

    if (x === null) {
      // a pause ends the gesture
      if (now - this.lastMotionAt > 200) this.history = [];
      return;
    }
    this.lastMotionAt = now;
    if (now < this.cooldownUntil) return;
    this.history.push({ t: now, x });
    while (this.history.length && now - this.history[0].t > WINDOW_MS) this.history.shift();
    this.detect(now);
  }

  /** A wave: the centroid travels far enough, mostly in one direction. */
  private detect(now: number) {
    const h = this.history;
    if (h.length < 4) return;
    const travel = h[h.length - 1].x - h[0].x;
    if (Math.abs(travel) < MIN_TRAVEL) return;
    let agree = 0;
    for (let i = 1; i < h.length; i++) if (Math.sign(h[i].x - h[i - 1].x) === Math.sign(travel)) agree++;
    if (agree / (h.length - 1) < 0.65) return;
    this.history = [];
    this.cooldownUntil = now + COOLDOWN_MS;
    this.onSwipe(travel < 0 ? 'left' : 'right');
  }
}
