/**
 * Generate short WAV sound effect samples for the ecogame audio system.
 * Run: node scripts/generateSamples.mjs
 * Output: public/audio/*.wav
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '..', 'public', 'audio');
mkdirSync(OUTPUT_DIR, { recursive: true });

const SAMPLE_RATE = 44100;

// --- WAV encoder ---

function encodeWav(samples, sampleRate = SAMPLE_RATE) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = samples.length * (bitsPerSample / 8);
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    const int16 = clamped < 0 ? clamped * 32768 : clamped * 32767;
    buffer.writeInt16LE(Math.round(int16), 44 + i * 2);
  }
  return buffer;
}

// --- Synthesis helpers ---

function noise() { return Math.random() * 2 - 1; }

function envelope(t, attack, hold, decay) {
  if (t < attack) return t / attack;
  if (t < attack + hold) return 1;
  const d = (t - attack - hold) / decay;
  return Math.max(0, 1 - d);
}

function expDecay(t, duration) {
  return Math.exp(-5 * t / duration);
}

function bandpass(samples, centerFreq, Q, sampleRate = SAMPLE_RATE) {
  // Simple 2nd order biquad bandpass
  const w0 = 2 * Math.PI * centerFreq / sampleRate;
  const alpha = Math.sin(w0) / (2 * Q);
  const b0 = alpha;
  const b1 = 0;
  const b2 = -alpha;
  const a0 = 1 + alpha;
  const a1 = -2 * Math.cos(w0);
  const a2 = 1 - alpha;
  return biquad(samples, b0/a0, b1/a0, b2/a0, a1/a0, a2/a0);
}

function lowpass(samples, cutoff, Q, sampleRate = SAMPLE_RATE) {
  const w0 = 2 * Math.PI * cutoff / sampleRate;
  const alpha = Math.sin(w0) / (2 * Q);
  const cosw0 = Math.cos(w0);
  const b0 = (1 - cosw0) / 2;
  const b1 = 1 - cosw0;
  const b2 = (1 - cosw0) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cosw0;
  const a2 = 1 - alpha;
  return biquad(samples, b0/a0, b1/a0, b2/a0, a1/a0, a2/a0);
}

function highpass(samples, cutoff, Q, sampleRate = SAMPLE_RATE) {
  const w0 = 2 * Math.PI * cutoff / sampleRate;
  const alpha = Math.sin(w0) / (2 * Q);
  const cosw0 = Math.cos(w0);
  const b0 = (1 + cosw0) / 2;
  const b1 = -(1 + cosw0);
  const b2 = (1 + cosw0) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cosw0;
  const a2 = 1 - alpha;
  return biquad(samples, b0/a0, b1/a0, b2/a0, a1/a0, a2/a0);
}

function biquad(samples, b0, b1, b2, a1, a2) {
  const out = new Float64Array(samples.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i];
    out[i] = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x;
    y2 = y1; y1 = out[i];
  }
  return out;
}

function mix(a, b, bGain = 1) {
  const len = Math.max(a.length, b.length);
  const out = new Float64Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = (i < a.length ? a[i] : 0) + (i < b.length ? b[i] : 0) * bGain;
  }
  return out;
}

function normalize(samples, peak = 0.85) {
  let max = 0;
  for (let i = 0; i < samples.length; i++) max = Math.max(max, Math.abs(samples[i]));
  if (max === 0) return samples;
  const scale = peak / max;
  const out = new Float64Array(samples.length);
  for (let i = 0; i < samples.length; i++) out[i] = samples[i] * scale;
  return out;
}

function generate(durationSec, fn) {
  const len = Math.round(durationSec * SAMPLE_RATE);
  const out = new Float64Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    out[i] = fn(t, i, durationSec);
  }
  return out;
}

// --- Attack samples: scratch/swipe ---

function genAttack1() {
  const dur = 0.14;
  // Filtered noise burst with descending filter
  let raw = generate(dur, (t) => noise() * envelope(t, 0.003, 0.01, dur - 0.013));
  const filtered = bandpass(raw, 2800, 1.5);
  // Add a sharp transient click at the start
  const click = generate(dur, (t) => {
    if (t > 0.02) return 0;
    return Math.sin(2 * Math.PI * 600 * t) * expDecay(t, 0.015) * 0.6;
  });
  return normalize(mix(filtered, click));
}

function genAttack2() {
  const dur = 0.12;
  let raw = generate(dur, (t) => noise() * envelope(t, 0.002, 0.008, dur - 0.01));
  const filtered = bandpass(raw, 3200, 2.0);
  // Higher-pitched scratch
  const tone = generate(dur, (t) => {
    const freq = 800 - 400 * (t / dur);
    return Math.sin(2 * Math.PI * freq * t) * expDecay(t, 0.03) * 0.4;
  });
  return normalize(mix(filtered, tone));
}

function genAttack3() {
  const dur = 0.10;
  // Fast dry swipe
  let raw = generate(dur, (t) => noise() * envelope(t, 0.001, 0.005, dur - 0.006));
  const filtered = highpass(raw, 1800, 1.2);
  const bp = bandpass(filtered, 4000, 2.5);
  return normalize(bp);
}

// --- Death samples: thud/fall ---

function genDeath1() {
  const dur = 0.35;
  // Low impact with pitch drop
  const body = generate(dur, (t) => {
    const freq = 160 * Math.exp(-4 * t / dur);
    return Math.sin(2 * Math.PI * freq * t) * expDecay(t, dur * 0.7) * 0.9;
  });
  // Muffled noise thud
  let thud = generate(dur, (t) => noise() * envelope(t, 0.003, 0.02, 0.12));
  thud = lowpass(thud, 350, 0.7);
  return normalize(mix(body, thud, 0.5));
}

function genDeath2() {
  const dur = 0.30;
  // Deeper, shorter impact
  const body = generate(dur, (t) => {
    const freq = 120 * Math.exp(-5 * t / dur);
    return Math.sin(2 * Math.PI * freq * t) * expDecay(t, dur * 0.5) * 0.85;
  });
  // Darker noise
  let thud = generate(dur, (t) => noise() * envelope(t, 0.002, 0.015, 0.1));
  thud = lowpass(thud, 250, 0.5);
  // Sub rumble
  const sub = generate(dur, (t) => {
    return Math.sin(2 * Math.PI * 55 * t) * expDecay(t, dur * 0.6) * 0.3;
  });
  return normalize(mix(mix(body, thud, 0.45), sub));
}

function genDeath3() {
  const dur = 0.40;
  // Longer fall feel with pitch sweep
  const body = generate(dur, (t) => {
    const freq = 200 * Math.exp(-3 * t / dur);
    const phase = 200 * dur / 3 * (1 - Math.exp(-3 * t / dur));
    return Math.sin(2 * Math.PI * phase) * expDecay(t, dur * 0.8) * 0.8;
  });
  let thud = generate(0.15, (t) => noise() * envelope(t, 0.004, 0.03, 0.11));
  thud = lowpass(thud, 300, 0.6);
  // Pad thud to full duration
  const paddedThud = new Float64Array(Math.round(dur * SAMPLE_RATE));
  paddedThud.set(thud);
  return normalize(mix(body, paddedThud, 0.4));
}

// --- Eat samples: bite/crunch ---

function genEat1() {
  const dur = 0.08;
  // Sharp click + very short noise burst
  const click = generate(dur, (t) => {
    if (t > 0.015) return 0;
    return (noise() * 0.5 + Math.sin(2 * Math.PI * 1200 * t) * 0.5) * expDecay(t, 0.008);
  });
  let crunch = generate(dur, (t) => noise() * envelope(t, 0.001, 0.005, 0.04));
  crunch = highpass(crunch, 2500, 1.8);
  return normalize(mix(click, crunch, 0.7));
}

function genEat2() {
  const dur = 0.07;
  // Dry peck - mostly transient
  const peck = generate(dur, (t) => {
    if (t > 0.02) return 0;
    return Math.sin(2 * Math.PI * 900 * t) * expDecay(t, 0.01);
  });
  let snap = generate(dur, (t) => noise() * envelope(t, 0.001, 0.003, 0.03));
  snap = bandpass(snap, 3500, 2.2);
  return normalize(mix(peck, snap, 0.6));
}

function genEat3() {
  const dur = 0.09;
  // Crunch with more body
  let raw = generate(dur, (t) => noise() * envelope(t, 0.002, 0.008, dur - 0.01));
  const hi = highpass(raw, 2000, 1.5);
  const body = generate(dur, (t) => {
    return Math.sin(2 * Math.PI * 450 * t) * expDecay(t, 0.03) * 0.35;
  });
  return normalize(mix(hi, body));
}

// --- Fruit samples: pop/pluck/sparkle ---

function genFruit1() {
  const dur = 0.16;
  // Soft ascending pop
  const pop = generate(dur, (t) => {
    const freq = 600 + 500 * (t / dur);
    return Math.sin(2 * Math.PI * freq * t) * expDecay(t, dur * 0.5) * 0.7;
  });
  const harmonic = generate(dur, (t) => {
    const freq = 1200 + 400 * (t / dur);
    return Math.sin(2 * Math.PI * freq * t) * expDecay(t, dur * 0.3) * 0.25;
  });
  let sparkle = generate(dur * 0.4, (t) => noise() * expDecay(t, 0.03));
  sparkle = bandpass(sparkle, 5000, 3.0);
  const paddedSparkle = new Float64Array(Math.round(dur * SAMPLE_RATE));
  paddedSparkle.set(sparkle);
  return normalize(mix(mix(pop, harmonic), paddedSparkle, 0.2));
}

function genFruit2() {
  const dur = 0.14;
  // Pluck - quick attack, bell-like
  const fundamental = generate(dur, (t) => {
    return Math.sin(2 * Math.PI * 800 * t) * expDecay(t, dur * 0.4) * 0.8;
  });
  const overtone = generate(dur, (t) => {
    return Math.sin(2 * Math.PI * 1600 * t) * expDecay(t, dur * 0.2) * 0.3;
  });
  const shimmer = generate(dur, (t) => {
    return Math.sin(2 * Math.PI * 2400 * t) * expDecay(t, dur * 0.15) * 0.12;
  });
  return normalize(mix(mix(fundamental, overtone), shimmer));
}

function genFruit3() {
  const dur = 0.18;
  // Warmer, more organic
  const body = generate(dur, (t) => {
    const freq = 520 + 600 * Math.pow(t / dur, 0.7);
    return Math.sin(2 * Math.PI * freq * t) * expDecay(t, dur * 0.6) * 0.75;
  });
  const upper = generate(dur, (t) => {
    const freq = 1050 + 300 * (t / dur);
    return Math.sin(2 * Math.PI * freq * t) * expDecay(t, dur * 0.35) * 0.2;
  });
  let air = generate(dur * 0.3, (t) => noise() * expDecay(t, 0.04));
  air = bandpass(air, 4000, 2.5);
  const paddedAir = new Float64Array(Math.round(dur * SAMPLE_RATE));
  paddedAir.set(air);
  return normalize(mix(mix(body, upper), paddedAir, 0.15));
}

// --- Mate samples: soft chirp/call ---

function genMate1() {
  const dur = 0.15;
  const chirp = generate(dur, (t) => {
    const freq = 400 + 400 * (t / dur);
    return Math.sin(2 * Math.PI * freq * t) * envelope(t, 0.01, 0.04, dur - 0.05) * 0.7;
  });
  const harmonic = generate(dur, (t) => {
    const freq = 800 + 600 * (t / dur);
    return Math.sin(2 * Math.PI * freq * t) * envelope(t, 0.015, 0.03, dur - 0.045) * 0.2;
  });
  let air = generate(dur * 0.3, (t) => noise() * expDecay(t, 0.04));
  air = bandpass(air, 3000, 2.0);
  const paddedAir = new Float64Array(Math.round(dur * SAMPLE_RATE));
  paddedAir.set(air);
  return normalize(mix(mix(chirp, harmonic), paddedAir, 0.1));
}

function genMate2() {
  const dur = 0.18;
  // Two-note warble
  const note1 = generate(dur, (t) => {
    if (t > dur * 0.5) return 0;
    const freq = 500 + 300 * (t / (dur * 0.5));
    return Math.sin(2 * Math.PI * freq * t) * envelope(t, 0.008, 0.03, dur * 0.5 - 0.038) * 0.65;
  });
  const note2 = generate(dur, (t) => {
    if (t < dur * 0.45) return 0;
    const t2 = t - dur * 0.45;
    const dur2 = dur * 0.55;
    const freq = 600 + 350 * (t2 / dur2);
    return Math.sin(2 * Math.PI * freq * t) * envelope(t2, 0.008, 0.025, dur2 - 0.033) * 0.6;
  });
  return normalize(mix(note1, note2));
}

// --- Drink samples: splash/lap ---

function genDrink1() {
  const dur = 0.12;
  let splash = generate(dur, (t) => noise() * envelope(t, 0.003, 0.015, dur - 0.018));
  splash = lowpass(splash, 500, 0.8);
  const sub = generate(dur, (t) => {
    return Math.sin(2 * Math.PI * 80 * t) * expDecay(t, 0.06) * 0.25;
  });
  return normalize(mix(splash, sub));
}

function genDrink2() {
  const dur = 0.10;
  let lap = generate(dur, (t) => noise() * envelope(t, 0.002, 0.01, dur - 0.012));
  lap = lowpass(lap, 600, 0.6);
  // Subtle drip
  const drip = generate(dur, (t) => {
    if (t > 0.03) return 0;
    return Math.sin(2 * Math.PI * 350 * t) * expDecay(t, 0.015) * 0.4;
  });
  return normalize(mix(lap, drip));
}

// --- Flee samples: urgent rustle ---

function genFlee1() {
  const dur = 0.10;
  let rustle = generate(dur, (t) => noise() * envelope(t, 0.002, 0.01, dur - 0.012));
  rustle = bandpass(rustle, 1800, 1.5);
  const transient = generate(dur, (t) => {
    if (t > 0.03) return 0;
    const freq = 500 - 200 * (t / 0.03);
    // Use sawtooth-like wave for urgency
    return (2 * ((freq * t) % 1) - 1) * expDecay(t, 0.015) * 0.4;
  });
  return normalize(mix(rustle, transient));
}

function genFlee2() {
  const dur = 0.09;
  let hustle = generate(dur, (t) => noise() * envelope(t, 0.001, 0.008, dur - 0.009));
  hustle = bandpass(hustle, 2200, 1.8);
  const kick = generate(dur, (t) => {
    if (t > 0.025) return 0;
    return Math.sin(2 * Math.PI * 300 * t) * expDecay(t, 0.012) * 0.35;
  });
  return normalize(mix(hustle, kick));
}

// --- Ambience samples: long loops ---

function genAmbienceBirds() {
  const dur = 6.0;
  // Random chirps with natural gaps
  const out = new Float64Array(Math.round(dur * SAMPLE_RATE));
  const chirpCount = 12 + Math.floor(Math.random() * 6);
  for (let c = 0; c < chirpCount; c++) {
    const start = Math.random() * (dur - 0.3);
    const chirpDur = 0.06 + Math.random() * 0.12;
    const baseFreq = 2000 + Math.random() * 3000;
    const rise = (Math.random() - 0.3) * 1500;
    const startSample = Math.round(start * SAMPLE_RATE);
    const len = Math.round(chirpDur * SAMPLE_RATE);
    for (let i = 0; i < len && startSample + i < out.length; i++) {
      const t = i / SAMPLE_RATE;
      const freq = baseFreq + rise * (t / chirpDur);
      const env = envelope(t, 0.005, chirpDur * 0.3, chirpDur * 0.65);
      out[startSample + i] += Math.sin(2 * Math.PI * freq * t) * env * (0.15 + Math.random() * 0.05);
    }
  }
  return normalize(out, 0.6);
}

function genAmbienceInsects() {
  const dur = 6.0;
  // Continuous subtle buzz + sporadic clicks
  let buzz = generate(dur, (t) => {
    const base = Math.sin(2 * Math.PI * 220 * t) * 0.08;
    const mod = Math.sin(2 * Math.PI * 8 * t) * 0.5 + 0.5;
    return base * mod + noise() * 0.02;
  });
  buzz = bandpass(buzz, 3000, 1.5);
  // Add clicks
  const clicks = new Float64Array(Math.round(dur * SAMPLE_RATE));
  const clickCount = 20 + Math.floor(Math.random() * 15);
  for (let c = 0; c < clickCount; c++) {
    const pos = Math.round(Math.random() * (clicks.length - 200));
    const clickLen = 40 + Math.floor(Math.random() * 80);
    for (let i = 0; i < clickLen && pos + i < clicks.length; i++) {
      clicks[pos + i] = noise() * expDecay(i / SAMPLE_RATE, 0.001) * 0.25;
    }
  }
  return normalize(mix(buzz, clicks), 0.5);
}

function genAmbienceCrickets() {
  const dur = 6.0;
  // Rhythmic chirping pulses
  const out = generate(dur, (t) => {
    const pulseFreq = 4.5 + Math.sin(2 * Math.PI * 0.15 * t) * 0.5;
    const pulseEnv = Math.pow(Math.max(0, Math.sin(2 * Math.PI * pulseFreq * t)), 8);
    const freq = 4200 + Math.sin(2 * Math.PI * 0.3 * t) * 200;
    return Math.sin(2 * Math.PI * freq * t) * pulseEnv * 0.3 + noise() * pulseEnv * 0.08;
  });
  let filtered = bandpass(out, 4500, 2.0);
  return normalize(filtered, 0.55);
}

function genAmbienceWind() {
  const dur = 7.0;
  // Filtered noise with slow cutoff sweep
  let raw = generate(dur, (t) => noise());
  // Apply slow sweeping filter manually by chunking
  const chunkSize = Math.round(SAMPLE_RATE * 0.1);
  const out = new Float64Array(raw.length);
  for (let i = 0; i < raw.length; i += chunkSize) {
    const t = i / SAMPLE_RATE;
    const cutoff = 300 + 200 * Math.sin(2 * Math.PI * 0.08 * t);
    const chunk = raw.slice(i, Math.min(i + chunkSize + 200, raw.length));
    const filtered = lowpass(chunk, cutoff, 0.4);
    for (let j = 0; j < Math.min(chunkSize, filtered.length) && i + j < out.length; j++) {
      out[i + j] = filtered[j];
    }
  }
  return normalize(out, 0.5);
}

// --- Macro event samples ---

function genExtinctionWarning() {
  const dur = 0.5;
  // Ominous descending tone
  const body = generate(dur, (t) => {
    const freq = 250 * Math.exp(-2 * t / dur);
    return Math.sin(2 * Math.PI * freq * t) * envelope(t, 0.02, 0.1, dur - 0.12) * 0.8;
  });
  const sub = generate(dur, (t) => {
    return Math.sin(2 * Math.PI * 60 * t) * envelope(t, 0.03, 0.15, dur - 0.18) * 0.3;
  });
  let dark = generate(dur, (t) => noise() * envelope(t, 0.01, 0.08, dur - 0.09));
  dark = lowpass(dark, 200, 0.5);
  return normalize(mix(mix(body, sub), dark, 0.25));
}

function genPopulationBoom() {
  const dur = 0.4;
  // Subtle ascending chord
  const note1 = generate(dur, (t) => {
    const freq = 400 + 200 * (t / dur);
    return Math.sin(2 * Math.PI * freq * t) * envelope(t, 0.015, 0.1, dur - 0.115) * 0.5;
  });
  const note2 = generate(dur, (t) => {
    const freq = 600 + 300 * (t / dur);
    return Math.sin(2 * Math.PI * freq * t) * envelope(t, 0.02, 0.08, dur - 0.1) * 0.3;
  });
  const note3 = generate(dur, (t) => {
    const freq = 800 + 400 * (t / dur);
    return Math.sin(2 * Math.PI * freq * t) * envelope(t, 0.025, 0.06, dur - 0.085) * 0.15;
  });
  return normalize(mix(mix(note1, note2), note3));
}

function genEcosystemCollapse() {
  const dur = 0.8;
  // Dissonant drone
  const tone1 = generate(dur, (t) => {
    return Math.sin(2 * Math.PI * 90 * t) * envelope(t, 0.04, 0.2, dur - 0.24) * 0.6;
  });
  const tone2 = generate(dur, (t) => {
    return Math.sin(2 * Math.PI * 95 * t) * envelope(t, 0.04, 0.2, dur - 0.24) * 0.5;
  });
  const tone3 = generate(dur, (t) => {
    return Math.sin(2 * Math.PI * 135 * t) * envelope(t, 0.06, 0.15, dur - 0.21) * 0.35;
  });
  let rumble = generate(dur, (t) => noise() * envelope(t, 0.03, 0.3, dur - 0.33));
  rumble = lowpass(rumble, 150, 0.4);
  return normalize(mix(mix(mix(tone1, tone2), tone3), rumble, 0.3));
}

// --- Write all samples ---

const samples = {
  'attack-1': genAttack1,
  'attack-2': genAttack2,
  'attack-3': genAttack3,
  'death-1': genDeath1,
  'death-2': genDeath2,
  'death-3': genDeath3,
  'eat-1': genEat1,
  'eat-2': genEat2,
  'eat-3': genEat3,
  'fruit-1': genFruit1,
  'fruit-2': genFruit2,
  'fruit-3': genFruit3,
  'mate-1': genMate1,
  'mate-2': genMate2,
  'drink-1': genDrink1,
  'drink-2': genDrink2,
  'flee-1': genFlee1,
  'flee-2': genFlee2,
  'ambience-birds': genAmbienceBirds,
  'ambience-insects': genAmbienceInsects,
  'ambience-crickets': genAmbienceCrickets,
  'ambience-wind': genAmbienceWind,
  'extinction-warning': genExtinctionWarning,
  'population-boom': genPopulationBoom,
  'ecosystem-collapse': genEcosystemCollapse,
};

for (const [name, fn] of Object.entries(samples)) {
  const audio = fn();
  const wav = encodeWav(audio);
  const path = join(OUTPUT_DIR, `${name}.wav`);
  writeFileSync(path, wav);
  const kb = (wav.length / 1024).toFixed(1);
  console.log(`  ${name}.wav  (${kb} KB, ${(audio.length / SAMPLE_RATE).toFixed(3)}s)`);
}

console.log(`\nDone — ${Object.keys(samples).length} samples written to public/audio/`);
