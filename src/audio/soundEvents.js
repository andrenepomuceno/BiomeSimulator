/**
 * Species size scale used for pitch/gain variation.
 * Maps species display name → a 0–1 factor where 0 = tiny, 1 = massive.
 * Derived from the canonical ANIMAL_SPECIES registry.
 */
import { buildSpeciesAudioScale, buildSpeciesSoundGroup, buildSpeciesVocalProfile } from '../engine/animalSpecies.js';
export const SPECIES_AUDIO_SCALE = buildSpeciesAudioScale();

/**
 * Species sound group classification.
 * Each group gets distinct synthesis parameters for richer audio variety.
 * Derived from the canonical ANIMAL_SPECIES registry.
 */
export const SPECIES_SOUND_GROUP = buildSpeciesSoundGroup();
export const SPECIES_VOCAL_PROFILE = buildSpeciesVocalProfile();

/**
 * Per-group synthesis modifiers applied on top of the base preset.
 * Each entry adjusts frequencies, filter types, and tonal characteristics
 * to give the group a distinct identity.
 *
 * Fields:
 *   pitchMul   – base frequency multiplier (>1 higher, <1 lower)
 *   noiseBand  – preferred noise filter type for the group
 *   noiseFreq  – center/cutoff frequency for the noise filter
 *   toneType   – oscillator waveform colour for tonal layers
 *   attackMs   – envelope attack time scale factor
 *   gainMul    – gain level multiplier applied to the voice
 */
export const SOUND_GROUP_PARAMS = {
  insect: {
    pitchMul: 1.6,
    noiseBand: 'highpass',
    noiseFreq: 4500,
    toneType: 'square',
    attackMs: 0.6,
    gainMul: 0.7,
  },
  bird: {
    pitchMul: 1.35,
    noiseBand: 'bandpass',
    noiseFreq: 3200,
    toneType: 'sine',
    attackMs: 0.8,
    gainMul: 0.9,
  },
  smallMammal: {
    pitchMul: 1.1,
    noiseBand: 'bandpass',
    noiseFreq: 2000,
    toneType: 'triangle',
    attackMs: 1.0,
    gainMul: 1.0,
  },
  largeMammal: {
    pitchMul: 0.75,
    noiseBand: 'lowpass',
    noiseFreq: 800,
    toneType: 'sawtooth',
    attackMs: 1.2,
    gainMul: 1.15,
  },
  reptile: {
    pitchMul: 0.9,
    noiseBand: 'bandpass',
    noiseFreq: 1200,
    toneType: 'triangle',
    attackMs: 1.1,
    gainMul: 0.95,
  },
};

/**
 * Audio pipeline defaults.
 * We currently run procedural-first and keep sample playback as an explicit fallback.
 */
export const AUDIO_PIPELINE_DEFAULTS = {
  proceduralOnly: true,
  sampleFallbackEnabled: false,
};

export const SOUND_EVENTS = {
  uiClick: {
    category: 'ui',
    preset: 'uiClick',
    positional: false,
    cooldownMs: 40,
    baseGain: 0.32,
    priority: 0,
  },
  pause: {
    category: 'ui',
    preset: 'pause',
    positional: false,
    cooldownMs: 120,
    baseGain: 0.36,
    priority: 0,
  },
  resume: {
    category: 'ui',
    preset: 'resume',
    positional: false,
    cooldownMs: 120,
    baseGain: 0.36,
    priority: 0,
  },
  attack: {
    category: 'sfx',
    preset: 'attack',
    positional: true,
    cooldownMs: 90,
    baseGain: 0.44,
    audibleRadiusTiles: 24,
    priority: 2,
    samples: ['/audio/attack-1.wav', '/audio/attack-2.wav', '/audio/attack-3.wav'],
  },
  attackVocal: {
    category: 'vocal',
    preset: 'attackVocal',
    positional: true,
    cooldownMs: 320,
    baseGain: 0.2,
    audibleRadiusTiles: 22,
    priority: 3,
  },
  death: {
    category: 'sfx',
    preset: 'death',
    positional: true,
    cooldownMs: 180,
    baseGain: 0.56,
    audibleRadiusTiles: 28,
    priority: 1,
    samples: ['/audio/death-1.wav', '/audio/death-2.wav', '/audio/death-3.wav'],
  },
  eat: {
    category: 'sfx',
    preset: 'eat',
    positional: true,
    cooldownMs: 100,
    baseGain: 0.28,
    audibleRadiusTiles: 18,
    priority: 3,
    samples: ['/audio/eat-1.wav', '/audio/eat-2.wav', '/audio/eat-3.wav'],
  },
  fruit: {
    category: 'sfx',
    preset: 'fruit',
    positional: true,
    cooldownMs: 140,
    baseGain: 0.36,
    audibleRadiusTiles: 20,
    priority: 3,
    samples: ['/audio/fruit-1.wav', '/audio/fruit-2.wav', '/audio/fruit-3.wav'],
  },
  mate: {
    category: 'sfx',
    preset: 'mate',
    positional: true,
    cooldownMs: 200,
    baseGain: 0.32,
    audibleRadiusTiles: 22,
    priority: 2,
    samples: ['/audio/mate-1.wav', '/audio/mate-2.wav'],
  },
  drink: {
    category: 'sfx',
    preset: 'drink',
    positional: true,
    cooldownMs: 120,
    baseGain: 0.24,
    audibleRadiusTiles: 16,
    priority: 3,
    samples: ['/audio/drink-1.wav', '/audio/drink-2.wav'],
  },
  idleVocal: {
    category: 'vocal',
    preset: 'idleVocal',
    positional: true,
    cooldownMs: 1200,
    baseGain: 0.12,
    audibleRadiusTiles: 18,
    priority: 4,
  },
  flee: {
    enabled: false,
    category: 'sfx',
    preset: 'flee',
    positional: true,
    cooldownMs: 250,
    baseGain: 0.12,
    audibleRadiusTiles: 20,
    priority: 3,
    samples: ['/audio/flee-1.wav', '/audio/flee-2.wav'],
  },
  extinctionWarning: {
    category: 'macro',
    preset: 'extinctionWarning',
    positional: false,
    cooldownMs: 5000,
    baseGain: 0.5,
    priority: 1,
    samples: ['/audio/extinction-warning.wav'],
  },
  populationBoom: {
    category: 'macro',
    preset: 'populationBoom',
    positional: false,
    cooldownMs: 5000,
    baseGain: 0.4,
    priority: 2,
    samples: ['/audio/population-boom.wav'],
  },
  ecosystemCollapse: {
    category: 'macro',
    preset: 'ecosystemCollapse',
    positional: false,
    cooldownMs: 8000,
    baseGain: 0.56,
    priority: 1,
    samples: ['/audio/ecosystem-collapse.wav'],
  },
};

/** Ambience loop sample URLs loaded by the multi-layer ambience system. */
export const AMBIENCE_SAMPLES = [
  '/audio/ambience-birds.wav',
  '/audio/ambience-insects.wav',
  '/audio/ambience-crickets.wav',
  '/audio/ambience-wind.wav',
];

export function getSoundEventConfig(type) {
  return SOUND_EVENTS[type] || null;
}