export const SOUND_EVENTS = {
  uiClick: {
    category: 'ui',
    preset: 'uiClick',
    positional: false,
    cooldownMs: 40,
    baseGain: 0.16,
  },
  attack: {
    category: 'sfx',
    preset: 'attack',
    positional: true,
    cooldownMs: 90,
    baseGain: 0.22,
    audibleRadiusTiles: 24,
    samples: ['/audio/attack-1.wav', '/audio/attack-2.wav', '/audio/attack-3.wav'],
  },
  death: {
    category: 'sfx',
    preset: 'death',
    positional: true,
    cooldownMs: 180,
    baseGain: 0.28,
    audibleRadiusTiles: 28,
    samples: ['/audio/death-1.wav', '/audio/death-2.wav', '/audio/death-3.wav'],
  },
  eat: {
    category: 'sfx',
    preset: 'eat',
    positional: true,
    cooldownMs: 100,
    baseGain: 0.14,
    audibleRadiusTiles: 18,
    samples: ['/audio/eat-1.wav', '/audio/eat-2.wav', '/audio/eat-3.wav'],
  },
  fruit: {
    category: 'sfx',
    preset: 'fruit',
    positional: true,
    cooldownMs: 140,
    baseGain: 0.18,
    audibleRadiusTiles: 20,
    samples: ['/audio/fruit-1.wav', '/audio/fruit-2.wav', '/audio/fruit-3.wav'],
  },
};

export function getSoundEventConfig(type) {
  return SOUND_EVENTS[type] || null;
}