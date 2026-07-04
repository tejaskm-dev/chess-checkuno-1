/**
 * Procedural chess sound effects via the Web Audio API.
 *
 * No audio files required — every sound is synthesized: a wooden "knock" is a
 * short filtered-noise transient plus a resonant body tone, and the alert cues
 * are simple oscillator gestures. Everything runs through a small procedural
 * room reverb so it sits in the candlelit-cabin space.
 */

let ctx = null;
let busIn = null; // sounds connect here; splits into dry + reverb send
let master = null;
let noiseBuf = null;

function build() {
  if (ctx || typeof window === 'undefined') return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();

  master = ctx.createGain();
  master.gain.value = 0.62;
  // Bus compressor — glues the layered hits together and gives them punch
  // (and stops the sub-bass thumps from clipping).
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 22;
  comp.ratio.value = 4;
  comp.attack.value = 0.002;
  comp.release.value = 0.16;
  master.connect(comp).connect(ctx.destination);

  busIn = ctx.createGain();
  const dry = ctx.createGain();
  dry.gain.value = 0.92;
  busIn.connect(dry).connect(master);

  // Short procedural room reverb for a little wooden-cabin tail.
  const conv = ctx.createConvolver();
  conv.buffer = impulse(0.4, 2.6);
  const wet = ctx.createGain();
  wet.gain.value = 0.13;
  busIn.connect(conv).connect(wet).connect(master);

  noiseBuf = whiteNoise(0.4);
}

function whiteNoise(dur) {
  const n = Math.floor(ctx.sampleRate * dur);
  const b = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

function impulse(dur, decay) {
  const n = Math.floor(ctx.sampleRate * dur);
  const b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
  }
  return b;
}

// Quick percussive amplitude envelope (fast attack, exponential decay).
function env(g, t, peak, dur) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

// Wooden knock: noise transient + resonant body + faint click harmonic.
function knock(t, { level = 1, bright = 1500, body = 210, dur = 0.12 } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = bright * (0.9 + Math.random() * 0.2);
  bp.Q.value = 1.2;
  const ng = ctx.createGain();
  env(ng, t, 0.5 * level, 0.05);
  src.connect(bp).connect(ng).connect(busIn);
  src.start(t);
  src.stop(t + 0.09);

  const bf = body * (0.94 + Math.random() * 0.12);
  const o = ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(bf, t);
  o.frequency.exponentialRampToValueAtTime(bf * 0.6, t + dur);
  const og = ctx.createGain();
  env(og, t, 0.55 * level, dur);
  o.connect(og).connect(busIn);
  o.start(t);
  o.stop(t + dur + 0.02);

  const o2 = ctx.createOscillator();
  o2.type = 'sine';
  o2.frequency.setValueAtTime(bf * 3.1, t);
  const o2g = ctx.createGain();
  env(o2g, t, 0.18 * level, 0.04);
  o2.connect(o2g).connect(busIn);
  o2.start(t);
  o2.stop(t + 0.05);
}

function tone(t, freq, dur, { type = 'sine', level = 0.3, glideTo = null } = {}) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
  const g = ctx.createGain();
  env(g, t, level, dur);
  o.connect(g).connect(busIn);
  o.start(t);
  o.stop(t + dur + 0.02);
}

// Sharp high-frequency transient — the satisfying "tick"/"crack" attack.
function click(t, { freq = 2800, level = 0.35, dur = 0.02 } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.playbackRate.value = 0.9 + Math.random() * 0.35;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = freq * 0.5;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq;
  bp.Q.value = 0.8;
  const g = ctx.createGain();
  env(g, t, level, dur);
  src.connect(hp).connect(bp).connect(g).connect(busIn);
  src.start(t);
  src.stop(t + dur + 0.02);
}

// Low-end punch with a pitch drop — the "chest-thump" body of an impact.
function thump(t, { freq = 120, drop = 60, dur = 0.16, level = 0.5 } = {}) {
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(drop, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(level, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(busIn);
  o.start(t);
  o.stop(t + dur + 0.02);
}

// Resolve the context to "now", resuming it if the browser suspended it.
function at() {
  build();
  if (!ctx) return null;
  if (ctx.state === 'suspended') ctx.resume();
  return ctx.currentTime + 0.001;
}

/** Call from a user gesture (e.g. the Start button) to unlock audio. */
export function unlock() {
  build();
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

export function select() {
  const t = at();
  if (t == null) return;
  // Crisp bright "grab" with a satisfying upward flick.
  click(t, { freq: 3400, level: 0.22, dur: 0.014 });
  const o = ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(430, t);
  o.frequency.exponentialRampToValueAtTime(680, t + 0.05);
  const g = ctx.createGain();
  env(g, t, 0.16, 0.07);
  o.connect(g).connect(busIn);
  o.start(t);
  o.stop(t + 0.09);
}

export function move() {
  const t = at();
  if (t == null) return;
  // Crack + woody knock + tight low thump = a punchy, confident placement.
  click(t, { freq: 2900, level: 0.32, dur: 0.018 });
  knock(t, { level: 0.85, bright: 1650, body: 245, dur: 0.1 });
  thump(t, { freq: 165, drop: 95, dur: 0.09, level: 0.32 });
}

export function capture() {
  const t = at();
  if (t == null) return;
  // Chunky, weighty hit: sharp crack, two heavy knocks, a low sub punch and a
  // downward crunch — the "took a piece" dopamine beat.
  click(t, { freq: 2400, level: 0.4, dur: 0.025 });
  knock(t, { level: 0.7, bright: 1150, body: 185, dur: 0.13 });
  knock(t + 0.045, { level: 1.0, bright: 780, body: 135, dur: 0.19 });
  thump(t + 0.02, { freq: 95, drop: 44, dur: 0.24, level: 0.75 });
  // grinding crunch (lowpass sweep of noise)
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(1900, t);
  lp.frequency.exponentialRampToValueAtTime(280, t + 0.2);
  const g = ctx.createGain();
  env(g, t, 0.28, 0.2);
  src.connect(lp).connect(g).connect(busIn);
  src.start(t);
  src.stop(t + 0.24);
}

export function castle() {
  const t = at();
  if (t == null) return;
  click(t, { freq: 2900, level: 0.28, dur: 0.018 });
  knock(t, { level: 0.85, bright: 1600, body: 235, dur: 0.11 });
  thump(t, { freq: 150, drop: 90, dur: 0.09, level: 0.28 });
  knock(t + 0.14, { level: 0.8, bright: 1450, body: 250, dur: 0.11 });
  thump(t + 0.14, { freq: 150, drop: 90, dur: 0.09, level: 0.24 });
}

export function check() {
  const t = at();
  if (t == null) return;
  // Ominous low boom under a tense, dissonant bell — real "uh-oh".
  thump(t, { freq: 120, drop: 55, dur: 0.55, level: 0.55 });
  tone(t, 466, 0.6, { type: 'sine', level: 0.15 });
  tone(t + 0.005, 494, 0.55, { type: 'sine', level: 0.11 }); // grinding minor 2nd
  tone(t + 0.02, 932, 0.4, { type: 'triangle', level: 0.07 });
  tone(t + 0.28, 1245, 0.3, { type: 'sine', level: 0.05 }); // late shimmer
}

export function promote() {
  const t = at();
  if (t == null) return;
  // Bright rising arpeggio with a sparkle on top — a little reward jingle.
  const notes = [392, 523, 659, 784, 1046];
  notes.forEach((f, i) => {
    tone(t + i * 0.075, f, 0.3, { type: 'triangle', level: 0.16 });
    tone(t + i * 0.075, f * 2, 0.18, { type: 'sine', level: 0.05 }); // octave shimmer
  });
  click(t + 0.3, { freq: 5000, level: 0.12, dur: 0.02 });
}

export function gameEnd(win) {
  const t = at();
  if (t == null) return;
  if (win) {
    // Triumphant major fanfare with a low hit for weight.
    thump(t, { freq: 130, drop: 65, dur: 0.4, level: 0.5 });
    const notes = [392, 494, 587, 784, 988];
    notes.forEach((f, i) => {
      tone(t + i * 0.11, f, 0.7, { type: 'triangle', level: 0.18 });
      tone(t + i * 0.11, f * 2, 0.4, { type: 'sine', level: 0.05 });
    });
    tone(t + 0.55, 1568, 0.6, { type: 'sine', level: 0.08 });
  } else {
    // Heavy, somber descent.
    thump(t, { freq: 90, drop: 45, dur: 0.6, level: 0.5 });
    tone(t, 220, 1.1, { type: 'sine', level: 0.16, glideTo: 165 });
    tone(t + 0.04, 262, 1.1, { type: 'sine', level: 0.12, glideTo: 185 });
  }
}

/* ---- Interaction sounds ---- */

// A crisp mechanical "clack" for pressing the chess clock.
export function clockPress() {
  const t = at();
  if (t == null) return;
  click(t, { freq: 3000, level: 0.3, dur: 0.018 });
  knock(t, { level: 0.55, bright: 1900, body: 340, dur: 0.06 });
}

// Very soft high tick when hovering a movable piece.
export function hoverTick() {
  const t = at();
  if (t == null) return;
  click(t, { freq: 4400, level: 0.07, dur: 0.01 });
}

// Airy downward whoosh when a candle is snuffed out.
export function snuff() {
  const t = at();
  if (t == null) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(1900, t);
  bp.frequency.exponentialRampToValueAtTime(380, t + 0.26);
  bp.Q.value = 0.7;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  src.connect(bp).connect(g).connect(busIn);
  src.start(t);
  src.stop(t + 0.32);
}

// Spark + flare when a candle is relit.
export function relight() {
  const t = at();
  if (t == null) return;
  click(t, { freq: 2600, level: 0.24, dur: 0.03 });
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(600, t);
  bp.frequency.exponentialRampToValueAtTime(1500, t + 0.2);
  const g = ctx.createGain();
  env(g, t, 0.13, 0.22);
  src.connect(bp).connect(g).connect(busIn);
  src.start(t);
  src.stop(t + 0.24);
}

// A light wooden tap for nudging props.
export function propTick() {
  const t = at();
  if (t == null) return;
  knock(t, { level: 0.45, bright: 1400, body: 260, dur: 0.08 });
}

// Metallic ring for spinning coins.
export function coinSpin() {
  const t = at();
  if (t == null) return;
  tone(t, 1250, 0.45, { type: 'sine', level: 0.06 });
  tone(t + 0.012, 1680, 0.38, { type: 'sine', level: 0.045 });
  tone(t + 0.024, 2200, 0.32, { type: 'sine', level: 0.03 });
}
