/** Tiny synthesized sound effects — no audio files needed. */

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, vol: number, endFreq?: number) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur * 0.8);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** Bubbly "item appeared" pop. */
export function playPop() {
  tone(320, 0, 0.18, 'sine', 0.25, 980);
  tone(640, 0.05, 0.14, 'triangle', 0.08, 1400);
}

/** Rising arpeggio when a book lands on the shelf. */
export function playChime() {
  const notes = [784, 988, 1175, 1568];
  notes.forEach((f, i) => tone(f, i * 0.07, 0.45, 'triangle', 0.12));
  tone(196, 0, 0.12, 'sine', 0.2, 120); // soft wooden thunk
}

export function playWhoosh() {
  tone(500, 0, 0.3, 'sine', 0.05, 180);
}
