/**
 * Chiptune sound effects, synthesised with the Web Audio API in the style of
 * an 8-bit console: square and triangle waves plus little noise bursts.
 * No audio files needed.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;

function audio(): AudioContext | null {
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.5;
      // a touch of low-pass keeps the square waves from being harsh
      const soften = ctx.createBiquadFilter();
      soften.type = 'lowpass';
      soften.frequency.value = 6000;
      master.connect(soften).connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

const NOTE = (n: string) => {
  const names: Record<string, number> = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
  const m = /^([A-G])(#?)(\d)$/.exec(n)!;
  return 440 * 2 ** ((names[m[1]] + (m[2] ? 1 : 0) + (Number(m[3]) - 4) * 12) / 12);
};

/** One chip-style note with a short attack and decay. */
function note(freq: number, start: number, dur: number, vol = 0.12, type: OscillatorType = 'square', slideTo?: number) {
  const ac = audio();
  if (!ac || !master) return;
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.005);
  gain.gain.setValueAtTime(vol, t0 + dur * 0.6);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** Short burst of filtered noise: steps, paper, thumps. */
function hiss(start: number, dur: number, vol: number, freq: number, type: BiquadFilterType = 'bandpass') {
  const ac = audio();
  if (!ac || !master) return;
  if (!noise) {
    noise = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
    const d = noise.getChannelData(0);
    // stepped noise sounds more "8-bit" than smooth white noise
    let v = 0;
    for (let i = 0; i < d.length; i++) {
      if (i % 4 === 0) v = Math.random() * 2 - 1;
      d[i] = v;
    }
  }
  const t0 = ac.currentTime + start;
  const src = ac.createBufferSource();
  src.buffer = noise;
  const f = ac.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(gain).connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

/** "Item get!" fanfare when a new book appears. */
export function playPop() {
  const seq = ['G4', 'C5', 'E5', 'G5', 'C6'];
  seq.forEach((n, i) => note(NOTE(n), i * 0.07, 0.12, 0.09));
  note(NOTE('E6'), seq.length * 0.07, 0.35, 0.09);
  note(NOTE('C4'), 0, 0.5, 0.08, 'triangle');
}

/** Coin-style "ding" when the book lands on the shelf. */
export function playChime() {
  hiss(0, 0.06, 0.25, 400, 'lowpass'); // little thud
  note(NOTE('B5'), 0.02, 0.07, 0.1);
  note(NOTE('E6'), 0.09, 0.3, 0.1);
}

/** Swoop for the iris wipe between the hall and the shelf, with two soft steps. */
export function playTransition() {
  note(NOTE('C5'), 0, 0.4, 0.05, 'triangle', NOTE('C6'));
  hiss(0.05, 0.05, 0.15, 300, 'lowpass');
  hiss(0.3, 0.05, 0.15, 300, 'lowpass');
}

/** Page turn: a quick paper blip. */
export function playPageTurn() {
  hiss(0, 0.08, 0.12, 3500);
  note(NOTE('A5'), 0.02, 0.04, 0.03);
}

/** Opening a book: two rising chirps. */
export function playOpenBook() {
  note(NOTE('E5'), 0, 0.07, 0.08);
  note(NOTE('A5'), 0.08, 0.12, 0.08);
}

/** Button click. */
export function playClick() {
  note(NOTE('C6'), 0, 0.03, 0.05);
}
