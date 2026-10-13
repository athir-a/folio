/**
 * Synthesised sound effects for a hushed, slightly magical library: no audio
 * files needed. Everything runs through a soft "room" echo so the sounds feel
 * like they happen in a big wooden hall.
 */

let ctx: AudioContext | null = null;
let room: AudioNode | null = null;
let noise: AudioBuffer | null = null;

function audio(): AudioContext | null {
  try {
    if (!ctx) {
      ctx = new AudioContext();
      // a gentle feedback delay, darkened with a low-pass, standing in for reverb
      const input = ctx.createGain();
      const delay = ctx.createDelay(1);
      delay.delayTime.value = 0.19;
      const feedback = ctx.createGain();
      feedback.gain.value = 0.38;
      const tone = ctx.createBiquadFilter();
      tone.type = 'lowpass';
      tone.frequency.value = 2200;
      const wet = ctx.createGain();
      wet.gain.value = 0.32;
      input.connect(delay).connect(tone).connect(feedback).connect(delay);
      tone.connect(wet).connect(ctx.destination);
      room = input;
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function out(ac: AudioContext, node: AudioNode) {
  node.connect(ac.destination);
  if (room) node.connect(room);
}

function noiseBuffer(ac: AudioContext) {
  if (!noise) {
    noise = ac.createBuffer(1, ac.sampleRate * 1, ac.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noise;
}

/** A bell-like partial: sine with a slow exponential decay. */
function bell(freq: number, start: number, dur: number, vol: number, type: OscillatorType = 'sine') {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  out(ac, gain);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/** Filtered noise burst: footsteps, paper, thumps. */
function rustle(start: number, dur: number, vol: number, filter: BiquadFilterType, freq: number, endFreq = freq, q = 0.8) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + start;
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac);
  const f = ac.createBiquadFilter();
  f.type = filter;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t0);
  f.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur);
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.02, dur / 4));
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(gain);
  out(ac, gain);
  src.start(t0, Math.random() * 0.5);
  src.stop(t0 + dur + 0.05);
}

/** A new book materialises: a shimmering celesta glissando. */
export function playPop() {
  const notes = [1046.5, 1318.5, 1568, 2093, 2637];
  notes.forEach((f, i) => {
    bell(f, i * 0.045, 0.9, 0.05);
    bell(f * 2.01, i * 0.045, 0.4, 0.012); // bright overtone
  });
  rustle(0, 0.5, 0.025, 'highpass', 6000, 9000);
}

/** The book settles onto the shelf: a soft wooden knock and a warm bell. */
export function playChime() {
  rustle(0, 0.09, 0.22, 'lowpass', 900, 300, 1.2);
  bell(110, 0, 0.18, 0.18);
  bell(784, 0.03, 1.6, 0.06);
  bell(1174.7, 0.05, 1.4, 0.035);
  bell(1568, 0.07, 1.2, 0.02);
}

/** Unhurried footsteps on wooden boards while the camera walks. */
export function playFootsteps(steps = 6) {
  for (let i = 0; i < steps; i++) {
    const t = 0.25 + i * 0.47 + Math.random() * 0.04;
    rustle(t, 0.12, 0.16, 'lowpass', 520, 180, 1.4);
    bell(70 + Math.random() * 10, t, 0.1, 0.07);
  }
}

/** A page turning: a quick sweep of paper noise. */
export function playPageTurn() {
  rustle(0, 0.28, 0.05, 'bandpass', 2500, 5200, 0.7);
  rustle(0.06, 0.18, 0.03, 'highpass', 4000, 7000);
}

/** Opening a book: a soft thump of boards and a breath of pages. */
export function playOpenBook() {
  rustle(0, 0.12, 0.15, 'lowpass', 700, 200, 1.1);
  rustle(0.08, 0.35, 0.04, 'bandpass', 1800, 4200, 0.6);
}

/** Quiet wooden tick for buttons. */
export function playClick() {
  rustle(0, 0.05, 0.08, 'bandpass', 1800, 1200, 2);
}
