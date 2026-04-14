/**
 * Species size scale used for pitch/gain variation.
 * Maps species name → a 0–1 factor where 0 = tiny, 1 = massive.
 * Derived from max_hp: scale = clamp((max_hp - 10) / 190, 0, 1).
 */
export const SPECIES_AUDIO_SCALE = {
  Mosquito: 0.0,
  Caterpillar: 0.026,
  Cricket: 0.026,
  Beetle: 0.053,
  Crow: 0.105,
  Squirrel: 0.158,
  Snake: 0.158,
  Lizard: 0.184,
  Hawk: 0.184,
  Rabbit: 0.211,
  Raccoon: 0.211,
  Fox: 0.263,
  Deer: 0.316,
  Goat: 0.368,
  Boar: 0.474,
  Wolf: 0.579,
  Crocodile: 0.895,
  Bear: 1.0,
};

export const SOUND_EVENTS = {
  uiClick: {
    category: 'ui',
    preset: 'uiClick',
    positional: false,
    cooldownMs: 40,
    baseGain: 0.16,
    priority: 0,
  },
  attack: {
    category: 'sfx',
    preset: 'attack',
    positional: true,
    cooldownMs: 90,
    baseGain: 0.22,
    audibleRadiusTiles: 24,
    priority: 2,
    samples: ['/audio/attack-1.wav', '/audio/attack-2.wav', '/audio/attack-3.wav'],
  },
  death: {
    category: 'sfx',
    preset: 'death',
    positional: true,
    cooldownMs: 180,
    baseGain: 0.28,
    audibleRadiusTiles: 28,
    priority: 1,
    samples: ['/audio/death-1.wav', '/audio/death-2.wav', '/audio/death-3.wav'],
  },
  eat: {
    category: 'sfx',
    preset: 'eat',
    positional: true,
    cooldownMs: 100,
    baseGain: 0.14,
    audibleRadiusTiles: 18,
    priority: 3,
    samples: ['/audio/eat-1.wav', '/audio/eat-2.wav', '/audio/eat-3.wav'],
  },
  fruit: {
    category: 'sfx',
    preset: 'fruit',
    positional: true,
    cooldownMs: 140,
    baseGain: 0.18,
    audibleRadiusTiles: 20,
    priority: 3,
    samples: ['/audio/fruit-1.wav', '/audio/fruit-2.wav', '/audio/fruit-3.wav'],
  },
  mate: {
    category: 'sfx',
    preset: 'mate',
    positional: true,
    cooldownMs: 200,
    baseGain: 0.16,
    audibleRadiusTiles: 22,
    priority: 2,
    samples: ['/audio/mate-1.wav', '/audio/mate-2.wav'],
  },
  drink: {
    category: 'sfx',
    preset: 'drink',
    positional: true,
    cooldownMs: 120,
    baseGain: 0.12,
    audibleRadiusTiles: 16,
    priority: 3,
    samples: ['/audio/drink-1.wav', '/audio/drink-2.wav'],
  },
  flee: {
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
    baseGain: 0.25,
    priority: 1,
    samples: ['/audio/extinction-warning.wav'],
  },
  populationBoom: {
    category: 'macro',
    preset: 'populationBoom',
    positional: false,
    cooldownMs: 5000,
    baseGain: 0.20,
    priority: 2,
    samples: ['/audio/population-boom.wav'],
  },
  ecosystemCollapse: {
    category: 'macro',
    preset: 'ecosystemCollapse',
    positional: false,
    cooldownMs: 8000,
    baseGain: 0.28,
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