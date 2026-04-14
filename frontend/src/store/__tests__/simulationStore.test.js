import { beforeEach, describe, expect, it } from 'vitest';
import useSimStore, { AUDIO_LOG_LIMIT, DEFAULT_AUDIO_SETTINGS } from '../simulationStore.js';

const initialClock = useSimStore.getState().clock;

function resetStore() {
  useSimStore.setState({
    animals: [],
    _animalsById: new Map(),
    clock: { ...initialClock, tick: 0 },
    audioSettings: { ...DEFAULT_AUDIO_SETTINGS },
    audioLog: [],
    selectedEntity: null,
    selectedTile: null,
  });
}

describe('simulationStore mergeAnimalDeltas', () => {
  beforeEach(() => {
    resetStore();
  });

  it('merges runtime deltas without losing stable animal fields', () => {
    useSimStore.getState().setAnimals([
      {
        id: 1,
        species: 'RABBIT',
        diet: 'HERBIVORE',
        x: 1,
        y: 1,
        state: 0,
        energy: 80,
        hp: 20,
        hunger: 5,
        thirst: 7,
        age: 10,
        alive: true,
      },
    ]);

    useSimStore.getState().mergeAnimalDeltas([
      {
        id: 1,
        x: 2,
        y: 1,
        state: 1,
        energy: 72.4,
        hp: 19,
        hunger: 12,
        thirst: 11,
        age: 11,
        alive: true,
      },
    ], []);

    const animal = useSimStore.getState().animals[0];

    expect(animal).toMatchObject({
      id: 1,
      species: 'RABBIT',
      diet: 'HERBIVORE',
      x: 2,
      y: 1,
      state: 1,
      energy: 72.4,
      age: 11,
      alive: true,
    });
  });

  it('keeps dead animals visible for 300 ticks before eviction', () => {
    useSimStore.getState().setAnimals([
      {
        id: 7,
        species: 'FOX',
        x: 4,
        y: 3,
        state: 2,
        energy: 50,
        hp: 12,
        hunger: 10,
        thirst: 8,
        age: 20,
        alive: true,
      },
    ]);
    useSimStore.setState({ clock: { ...initialClock, tick: 25 } });

    useSimStore.getState().mergeAnimalDeltas([], [7]);

    let animal = useSimStore.getState().animals[0];
    expect(animal).toMatchObject({
      id: 7,
      alive: false,
      state: 9,
      _deathTick: 25,
    });

    useSimStore.setState({ clock: { ...initialClock, tick: 324 } });
    useSimStore.getState().mergeAnimalDeltas([], []);
    expect(useSimStore.getState().animals).toHaveLength(1);

    useSimStore.setState({ clock: { ...initialClock, tick: 325 } });
    useSimStore.getState().mergeAnimalDeltas([], []);

    animal = useSimStore.getState().animals[0];
    expect(animal).toBeUndefined();
    expect(useSimStore.getState()._animalsById.has(7)).toBe(false);
  });

  it('keeps the newest audio log entries within the configured limit', () => {
    const store = useSimStore.getState();

    for (let i = 0; i < AUDIO_LOG_LIMIT + 5; i++) {
      store.pushAudioLog({ type: `sound-${i}`, tick: i, at: i });
    }

    expect(useSimStore.getState().audioLog).toHaveLength(AUDIO_LOG_LIMIT);
    expect(useSimStore.getState().audioLog[0]).toMatchObject({ type: `sound-${AUDIO_LOG_LIMIT + 4}` });
    expect(useSimStore.getState().audioLog.at(-1)).toMatchObject({ type: 'sound-5' });

    store.clearAudioLog();
    expect(useSimStore.getState().audioLog).toEqual([]);
  });
});