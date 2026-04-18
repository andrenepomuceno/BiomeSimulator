import { beforeEach, describe, expect, it } from 'vitest';
import useSimStore, {
  AUDIO_LOG_LIMIT,
  DEFAULT_AUDIO_SETTINGS,
  sanitizePersistedAudioSettings,
} from '../simulationStore.js';

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
    pendingEntityPlacementQueue: [],
    uiToasts: [],
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

  it('removeAnimalById removes animal immediately and clears selected entity if needed', () => {
    useSimStore.getState().setAnimals([
      { id: 10, species: 'RABBIT', x: 1, y: 1, alive: true },
      { id: 11, species: 'FOX', x: 2, y: 2, alive: true },
    ]);
    useSimStore.setState({ selectedEntity: { id: 10, species: 'RABBIT' } });

    useSimStore.getState().removeAnimalById(10);

    const state = useSimStore.getState();
    expect(state.animals.map((a) => a.id)).toEqual([11]);
    expect(state._animalsById.has(10)).toBe(false);
    expect(state.selectedEntity).toBeNull();
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

  it('sanitizes persisted audio settings and always resets unlock state', () => {
    expect(sanitizePersistedAudioSettings({
      muted: true,
      masterVolume: 0.2,
      sfxEnabled: false,
      unlocked: true,
      unknown: 'ignored',
    })).toMatchObject({
      muted: true,
      masterVolume: 0.2,
      sfxEnabled: false,
      unlocked: false,
    });
  });

  it('queues pending entity placements in FIFO order', () => {
    const store = useSimStore.getState();

    store.enqueuePendingEntityPlacement({ targetStack: 'undo', tag: 1 });
    store.enqueuePendingEntityPlacement({ targetStack: 'redo', tag: 2 });

    expect(store.peekPendingEntityPlacement()).toMatchObject({ targetStack: 'undo', tag: 1 });

    const first = store.shiftPendingEntityPlacement();
    const second = store.shiftPendingEntityPlacement();
    const third = store.shiftPendingEntityPlacement();

    expect(first).toMatchObject({ targetStack: 'undo', tag: 1 });
    expect(second).toMatchObject({ targetStack: 'redo', tag: 2 });
    expect(third).toBeNull();
  });

  it('clears all pending placements with clearPendingEntityPlacements', () => {
    const store = useSimStore.getState();

    store.enqueuePendingEntityPlacement({ targetStack: 'undo' });
    store.enqueuePendingEntityPlacement({ targetStack: 'redo' });
    store.clearPendingEntityPlacements();

    expect(useSimStore.getState().pendingEntityPlacementQueue).toEqual([]);
    expect(store.shiftPendingEntityPlacement()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Terrain editing and undo/redo
// ---------------------------------------------------------------------------

describe('simulationStore — terrain editing', () => {
  beforeEach(() => {
    const terrain = new Uint8Array([1, 2, 3, 4]); // 2×2 grid
    useSimStore.setState({
      terrainData: terrain,
      mapWidth: 2,
      mapHeight: 2,
      worldReady: null,
      terrainUndoStack: [],
      terrainRedoStack: [],
      entityUndoStack: [],
      entityRedoStack: [],
      _actionSeq: 0,
    });
  });

  it('applyTerrainChanges mutates only the specified tiles', () => {
    useSimStore.getState().applyTerrainChanges([{ x: 1, y: 0, terrain: 9 }]);
    const t = useSimStore.getState().terrainData;
    expect(t[0]).toBe(1); // unchanged
    expect(t[1]).toBe(9); // changed: x=1, y=0 → idx=1
    expect(t[2]).toBe(3); // unchanged
    expect(t[3]).toBe(4); // unchanged
  });

  it('applyTerrainChanges is a no-op for an empty array', () => {
    useSimStore.getState().applyTerrainChanges([]);
    expect(useSimStore.getState().terrainData).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it('applyTerrainChanges updates worldReady.terrain when worldReady exists', () => {
    useSimStore.setState({ worldReady: { terrain: new Uint8Array([1, 2, 3, 4]), other: 'x' } });
    useSimStore.getState().applyTerrainChanges([{ x: 0, y: 1, terrain: 7 }]);
    const { worldReady } = useSimStore.getState();
    expect(worldReady.terrain[2]).toBe(7); // x=0, y=1 → idx=2
    expect(worldReady.other).toBe('x'); // other fields preserved
  });

  it('pushTerrainHistoryEntry appends to undo stack and clears redo stack', () => {
    const store = useSimStore.getState();
    store.pushTerrainHistoryEntry({ undo: [{ x: 0, y: 0, terrain: 1 }], redo: [{ x: 0, y: 0, terrain: 9 }] });

    const { terrainUndoStack, terrainRedoStack } = useSimStore.getState();
    expect(terrainUndoStack).toHaveLength(1);
    expect(terrainRedoStack).toHaveLength(0);
    expect(terrainUndoStack[0]).toMatchObject({ undo: [{ x: 0, y: 0 }] });
  });

  it('pushTerrainHistoryEntry is a no-op for invalid entries', () => {
    const store = useSimStore.getState();
    store.pushTerrainHistoryEntry({ undo: [], redo: [{ x: 0, y: 0, terrain: 1 }] }); // empty undo
    store.pushTerrainHistoryEntry(null);
    expect(useSimStore.getState().terrainUndoStack).toHaveLength(0);
  });

  it('popTerrainUndoEntry moves top entry from undo to redo and returns it', () => {
    const store = useSimStore.getState();
    const entry = { undo: [{ x: 0, y: 0, terrain: 1 }], redo: [{ x: 0, y: 0, terrain: 2 }] };
    store.pushTerrainHistoryEntry(entry);

    const popped = store.popTerrainUndoEntry();

    expect(popped).toMatchObject({ undo: entry.undo, redo: entry.redo });
    expect(useSimStore.getState().terrainUndoStack).toHaveLength(0);
    expect(useSimStore.getState().terrainRedoStack).toHaveLength(1);
  });

  it('popTerrainUndoEntry returns null when stack is empty', () => {
    expect(useSimStore.getState().popTerrainUndoEntry()).toBeNull();
  });

  it('popTerrainRedoEntry moves top entry from redo to undo and returns it', () => {
    const store = useSimStore.getState();
    const entry = { undo: [{ x: 1, y: 0, terrain: 3 }], redo: [{ x: 1, y: 0, terrain: 5 }] };
    store.pushTerrainHistoryEntry(entry);
    store.popTerrainUndoEntry(); // move to redo
    const popped = store.popTerrainRedoEntry();

    expect(popped).toMatchObject({ undo: entry.undo, redo: entry.redo });
    expect(useSimStore.getState().terrainRedoStack).toHaveLength(0);
    expect(useSimStore.getState().terrainUndoStack).toHaveLength(1);
  });

  it('popTerrainRedoEntry returns null when stack is empty', () => {
    expect(useSimStore.getState().popTerrainRedoEntry()).toBeNull();
  });

  it('clearTerrainHistory resets all stacks and the action sequence', () => {
    const store = useSimStore.getState();
    store.pushTerrainHistoryEntry({ undo: [{ x: 0, y: 0, terrain: 1 }], redo: [{ x: 0, y: 0, terrain: 2 }] });
    store.clearTerrainHistory();

    const state = useSimStore.getState();
    expect(state.terrainUndoStack).toHaveLength(0);
    expect(state.terrainRedoStack).toHaveLength(0);
    expect(state.entityUndoStack).toHaveLength(0);
    expect(state.entityRedoStack).toHaveLength(0);
    expect(state._actionSeq).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Entity undo/redo
// ---------------------------------------------------------------------------

describe('simulationStore — entity undo/redo', () => {
  beforeEach(() => {
    useSimStore.setState({
      entityUndoStack: [],
      entityRedoStack: [],
      _actionSeq: 0,
    });
  });

  it('pushEntityUndoEntry appends with an incremented sequence and clears redo', () => {
    const store = useSimStore.getState();
    store.pushEntityUndoEntry({ kind: 'place', entityId: 10 });
    store.pushEntityUndoEntry({ kind: 'remove', entityId: 11 });

    const state = useSimStore.getState();
    expect(state.entityUndoStack).toHaveLength(2);
    expect(state.entityUndoStack[0]._seq).toBeLessThan(state.entityUndoStack[1]._seq);
    expect(state.entityRedoStack).toHaveLength(0);
  });

  it('pushEntityUndoEntry is a no-op for entries without kind', () => {
    useSimStore.getState().pushEntityUndoEntry({ entityId: 1 });
    expect(useSimStore.getState().entityUndoStack).toHaveLength(0);
  });

  it('popEntityUndoEntry moves top from undo to redo and returns it', () => {
    const store = useSimStore.getState();
    store.pushEntityUndoEntry({ kind: 'place', entityId: 5 });
    const popped = store.popEntityUndoEntry();

    expect(popped).toMatchObject({ kind: 'place', entityId: 5 });
    expect(useSimStore.getState().entityUndoStack).toHaveLength(0);
    expect(useSimStore.getState().entityRedoStack).toHaveLength(1);
  });

  it('popEntityUndoEntry returns null when stack is empty', () => {
    expect(useSimStore.getState().popEntityUndoEntry()).toBeNull();
  });

  it('popEntityRedoEntry moves top from redo to undo and returns it', () => {
    const store = useSimStore.getState();
    store.pushEntityUndoEntry({ kind: 'place', entityId: 7 });
    store.popEntityUndoEntry(); // push to redo
    const popped = store.popEntityRedoEntry();

    expect(popped).toMatchObject({ kind: 'place', entityId: 7 });
    expect(useSimStore.getState().entityRedoStack).toHaveLength(0);
    expect(useSimStore.getState().entityUndoStack).toHaveLength(1);
  });

  it('updateTopEntityUndoEntryId updates entityId of the most recent undo entry', () => {
    const store = useSimStore.getState();
    store.pushEntityUndoEntry({ kind: 'place', entityId: null });
    store.updateTopEntityUndoEntryId(42);
    expect(useSimStore.getState().entityUndoStack.at(-1).entityId).toBe(42);
  });

  it('updateTopEntityRedoEntryId updates entityId of the most recent redo entry', () => {
    const store = useSimStore.getState();
    store.pushEntityUndoEntry({ kind: 'place', entityId: null });
    store.popEntityUndoEntry();
    store.updateTopEntityRedoEntryId(99);
    expect(useSimStore.getState().entityRedoStack.at(-1).entityId).toBe(99);
  });
});

// ---------------------------------------------------------------------------
// Ground item changes (setItemChanges and setItemSnapshot)
// ---------------------------------------------------------------------------

describe('simulationStore — ground item changes', () => {
  beforeEach(() => {
    useSimStore.setState({ groundItems: new Map(), itemChanges: [], selectedItem: null });
  });

  it('setItemChanges op:add inserts a new item into groundItems', () => {
    const item = { id: 1, x: 3, y: 4, type: 'MEAT' };
    useSimStore.getState().setItemChanges([{ op: 'add', item }]);
    expect(useSimStore.getState().groundItems.get(1)).toMatchObject({ id: 1, type: 'MEAT' });
  });

  it('setItemChanges op:remove deletes the item and clears selectedItem if matching', () => {
    const item = { id: 2, x: 1, y: 1, type: 'FRUIT' };
    useSimStore.setState({ groundItems: new Map([[2, item]]), selectedItem: item });
    useSimStore.getState().setItemChanges([{ op: 'remove', item }]);
    expect(useSimStore.getState().groundItems.has(2)).toBe(false);
    expect(useSimStore.getState().selectedItem).toBeNull();
  });

  it('setItemChanges op:remove does not clear selectedItem when ids differ', () => {
    const itemA = { id: 3, x: 1, y: 1, type: 'MEAT' };
    const itemB = { id: 4, x: 2, y: 2, type: 'SEED' };
    useSimStore.setState({ groundItems: new Map([[3, itemA], [4, itemB]]), selectedItem: itemB });
    useSimStore.getState().setItemChanges([{ op: 'remove', item: itemA }]);
    expect(useSimStore.getState().groundItems.has(3)).toBe(false);
    expect(useSimStore.getState().selectedItem).toMatchObject({ id: 4 });
  });

  it('setItemChanges op:update merges fields into the existing item', () => {
    const item = { id: 5, x: 0, y: 0, type: 'SEED', age: 10 };
    useSimStore.setState({ groundItems: new Map([[5, item]]) });
    useSimStore.getState().setItemChanges([{ op: 'update', item: { id: 5, age: 30 } }]);
    expect(useSimStore.getState().groundItems.get(5)).toMatchObject({ id: 5, type: 'SEED', age: 30 });
  });

  it('setItemChanges op:update also refreshes selectedItem when it matches', () => {
    const item = { id: 6, x: 1, y: 1, type: 'FRUIT', age: 5 };
    useSimStore.setState({ groundItems: new Map([[6, item]]), selectedItem: item });
    useSimStore.getState().setItemChanges([{ op: 'update', item: { id: 6, age: 50 } }]);
    expect(useSimStore.getState().selectedItem).toMatchObject({ id: 6, age: 50 });
  });

  it('setItemSnapshot builds groundItems Map from items array', () => {
    const snapshot = { items: [{ id: 10, type: 'MEAT' }, { id: 11, type: 'SEED' }], tick: 100 };
    useSimStore.getState().setItemSnapshot(snapshot);
    const gItems = useSimStore.getState().groundItems;
    expect(gItems.size).toBe(2);
    expect(gItems.get(10)).toMatchObject({ type: 'MEAT' });
    expect(gItems.get(11)).toMatchObject({ type: 'SEED' });
  });
});

// ---------------------------------------------------------------------------
// Selection mutual exclusion
// ---------------------------------------------------------------------------

describe('simulationStore — selection', () => {
  beforeEach(() => {
    useSimStore.setState({ selectedEntity: null, selectedTile: null, selectedItem: null });
  });

  it('setSelectedEntity clears tile and item', () => {
    useSimStore.setState({ selectedTile: { x: 1, y: 1 }, selectedItem: { id: 1 } });
    useSimStore.getState().setSelectedEntity({ id: 42, species: 'RABBIT' });
    const state = useSimStore.getState();
    expect(state.selectedEntity).toMatchObject({ id: 42 });
    expect(state.selectedTile).toBeNull();
    expect(state.selectedItem).toBeNull();
  });

  it('setSelectedTile clears entity and item', () => {
    useSimStore.setState({ selectedEntity: { id: 1 }, selectedItem: { id: 2 } });
    useSimStore.getState().setSelectedTile({ x: 3, y: 5, terrain: 2 });
    const state = useSimStore.getState();
    expect(state.selectedTile).toMatchObject({ x: 3, y: 5 });
    expect(state.selectedEntity).toBeNull();
    expect(state.selectedItem).toBeNull();
  });

  it('setSelectedItem clears entity and tile', () => {
    useSimStore.setState({ selectedEntity: { id: 1 }, selectedTile: { x: 0, y: 0 } });
    useSimStore.getState().setSelectedItem({ id: 7, type: 'FRUIT' });
    const state = useSimStore.getState();
    expect(state.selectedItem).toMatchObject({ id: 7 });
    expect(state.selectedEntity).toBeNull();
    expect(state.selectedTile).toBeNull();
  });

  it('clearSelection nulls all three selection fields', () => {
    useSimStore.setState({
      selectedEntity: { id: 1 },
      selectedTile: { x: 0, y: 0 },
      selectedItem: { id: 2 },
    });
    useSimStore.getState().clearSelection();
    const state = useSimStore.getState();
    expect(state.selectedEntity).toBeNull();
    expect(state.selectedTile).toBeNull();
    expect(state.selectedItem).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// UI toasts and supervisor flashes
// ---------------------------------------------------------------------------

describe('simulationStore — UI toasts', () => {
  beforeEach(() => {
    useSimStore.setState({ uiToasts: [] });
  });

  it('pushUiToast adds a toast and auto-generates an id when none provided', () => {
    useSimStore.getState().pushUiToast({ message: 'hello' });
    const toasts = useSimStore.getState().uiToasts;
    expect(toasts).toHaveLength(1);
    expect(typeof toasts[0].id).toBe('string');
    expect(toasts[0].message).toBe('hello');
  });

  it('pushUiToast preserves a provided id', () => {
    useSimStore.getState().pushUiToast({ id: 'my-id', message: 'test' });
    expect(useSimStore.getState().uiToasts[0].id).toBe('my-id');
  });

  it('pushUiToast defaults variant to warning when not set', () => {
    useSimStore.getState().pushUiToast({ message: 'x' });
    expect(useSimStore.getState().uiToasts[0].variant).toBe('warning');
  });

  it('pushUiToast preserves an explicitly set variant', () => {
    useSimStore.getState().pushUiToast({ id: 'v', variant: 'error', message: 'x' });
    expect(useSimStore.getState().uiToasts[0].variant).toBe('error');
  });

  it('pushUiToast is a no-op for a falsy value', () => {
    useSimStore.getState().pushUiToast(null);
    expect(useSimStore.getState().uiToasts).toHaveLength(0);
  });

  it('dismissUiToast removes only the matching toast', () => {
    useSimStore.getState().pushUiToast({ id: 'a', message: 'A' });
    useSimStore.getState().pushUiToast({ id: 'b', message: 'B' });
    useSimStore.getState().dismissUiToast('a');
    const toasts = useSimStore.getState().uiToasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].id).toBe('b');
  });
});

describe('simulationStore — supervisor flashes', () => {
  beforeEach(() => {
    useSimStore.setState({ supervisorFlashes: [] });
  });

  it('pushSupervisorFlash adds a flash', () => {
    useSimStore.getState().pushSupervisorFlash({ id: 'f1', message: 'overlap detected' });
    expect(useSimStore.getState().supervisorFlashes).toHaveLength(1);
  });

  it('pushSupervisorFlash caps at 5 entries', () => {
    for (let i = 0; i < 7; i++) {
      useSimStore.getState().pushSupervisorFlash({ id: `f${i}`, message: `msg ${i}` });
    }
    expect(useSimStore.getState().supervisorFlashes).toHaveLength(5);
  });

  it('dismissSupervisorFlash removes only the matching flash', () => {
    useSimStore.getState().pushSupervisorFlash({ id: 'x', message: 'X' });
    useSimStore.getState().pushSupervisorFlash({ id: 'y', message: 'Y' });
    useSimStore.getState().dismissSupervisorFlash('x');
    const flashes = useSimStore.getState().supervisorFlashes;
    expect(flashes).toHaveLength(1);
    expect(flashes[0].id).toBe('y');
  });
});

// ---------------------------------------------------------------------------
// Climate, selection targets, audio batch, rate multipliers
// ---------------------------------------------------------------------------

describe('simulationStore — climate', () => {
  it('setClimate replaces the climate object', () => {
    useSimStore.getState().setClimate({ season: 2, seasonName: 'Autumn', temperature: 11 });
    expect(useSimStore.getState().climate).toMatchObject({
      season: 2,
      seasonName: 'Autumn',
      temperature: 11,
    });
  });
});

describe('simulationStore — selection targets', () => {
  beforeEach(() => {
    useSimStore.setState({ selectionTargets: { animals: true, plants: true, terrain: true, items: true } });
  });

  it('setSelectionTarget updates only the specified key', () => {
    useSimStore.getState().setSelectionTarget('animals', false);
    const targets = useSimStore.getState().selectionTargets;
    expect(targets.animals).toBe(false);
    expect(targets.plants).toBe(true);
    expect(targets.terrain).toBe(true);
    expect(targets.items).toBe(true);
  });

  it('setSelectionTarget can set a key back to true', () => {
    useSimStore.setState({ selectionTargets: { animals: false, plants: false, terrain: false, items: false } });
    useSimStore.getState().setSelectionTarget('plants', true);
    expect(useSimStore.getState().selectionTargets.plants).toBe(true);
    expect(useSimStore.getState().selectionTargets.animals).toBe(false);
  });
});

describe('simulationStore — pushAudioLogBatch', () => {
  beforeEach(() => {
    useSimStore.setState({ audioLog: [] });
  });

  it('prepends all entries and keeps newest first', () => {
    useSimStore.getState().pushAudioLog({ type: 'existing', tick: 1 });
    useSimStore.getState().pushAudioLogBatch([
      { type: 'new-a', tick: 10 },
      { type: 'new-b', tick: 11 },
    ]);
    const log = useSimStore.getState().audioLog;
    expect(log[0]).toMatchObject({ type: 'new-a' });
    expect(log[1]).toMatchObject({ type: 'new-b' });
    expect(log[2]).toMatchObject({ type: 'existing' });
  });

  it('respects AUDIO_LOG_LIMIT when batching', () => {
    const batch = Array.from({ length: AUDIO_LOG_LIMIT + 20 }, (_, i) => ({ type: `e${i}`, tick: i }));
    useSimStore.getState().pushAudioLogBatch(batch);
    expect(useSimStore.getState().audioLog).toHaveLength(AUDIO_LOG_LIMIT);
  });
});

describe('simulationStore — rate multipliers', () => {
  it('setHungerMultiplier updates hungerMultiplier without touching thirstMultiplier', () => {
    const prev = useSimStore.getState().thirstMultiplier;
    useSimStore.getState().setHungerMultiplier(2.5);
    expect(useSimStore.getState().hungerMultiplier).toBe(2.5);
    expect(useSimStore.getState().thirstMultiplier).toBe(prev);
  });

  it('setThirstMultiplier updates thirstMultiplier without touching hungerMultiplier', () => {
    const prev = useSimStore.getState().hungerMultiplier;
    useSimStore.getState().setThirstMultiplier(3.0);
    expect(useSimStore.getState().thirstMultiplier).toBe(3.0);
    expect(useSimStore.getState().hungerMultiplier).toBe(prev);
  });
});