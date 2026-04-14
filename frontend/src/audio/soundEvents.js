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
    cooldownMs: 75,
    baseGain: 0.26,
    audibleRadiusTiles: 24,
  },
  death: {
    category: 'sfx',
    preset: 'death',
    positional: true,
    cooldownMs: 150,
    baseGain: 0.3,
    audibleRadiusTiles: 28,
  },
  eat: {
    category: 'sfx',
    preset: 'eat',
    positional: true,
    cooldownMs: 100,
    baseGain: 0.16,
    audibleRadiusTiles: 18,
  },
  fruit: {
    category: 'sfx',
    preset: 'fruit',
    positional: true,
    cooldownMs: 140,
    baseGain: 0.18,
    audibleRadiusTiles: 20,
  },
};

export function getSoundEventConfig(type) {
  return SOUND_EVENTS[type] || null;
}