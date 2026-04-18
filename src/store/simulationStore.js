/**
 * Simulation state store — zustand.
 */
import { create } from 'zustand';
import { DEFAULT_TICKS_PER_DAY } from '../constants/simulation.js';

export const DEFAULT_AUDIO_SETTINGS = {
  muted: false,
  masterVolume: 0.72,
  sfxVolume: 0.88,
  ambienceVolume: 0,
  sfxEnabled: true,
  ambienceEnabled: true,
  unlocked: false,
};

export const AUDIO_LOG_LIMIT = 300;
export const AUDIO_SETTINGS_STORAGE_KEY = 'biomeSimulator.audioSettings';
const TERRAIN_HISTORY_LIMIT = 50;

const PAUSE_ON_BG_STORAGE_KEY = 'biomeSimulator.pauseOnBackground';

function loadPauseOnBackground() {
  if (typeof window === 'undefined' || !window.localStorage) return true;
  try {
    const raw = window.localStorage.getItem(PAUSE_ON_BG_STORAGE_KEY);
    if (raw === null) return true;
    return JSON.parse(raw) !== false;
  } catch {
    return true;
  }
}

function persistPauseOnBackground(value) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(PAUSE_ON_BG_STORAGE_KEY, JSON.stringify(!!value));
  } catch { /* ignore */ }
}

const PERSISTED_AUDIO_SETTINGS_KEYS = [
  'muted',
  'masterVolume',
  'sfxVolume',
  'ambienceVolume',
  'sfxEnabled',
  'ambienceEnabled',
];

export function sanitizePersistedAudioSettings(rawSettings) {
  if (!rawSettings || typeof rawSettings !== 'object') return { ...DEFAULT_AUDIO_SETTINGS };

  const nextSettings = { ...DEFAULT_AUDIO_SETTINGS };
  for (const key of PERSISTED_AUDIO_SETTINGS_KEYS) {
    if (!(key in rawSettings)) continue;
    nextSettings[key] = rawSettings[key];
  }
  nextSettings.unlocked = false;
  return nextSettings;
}

function loadPersistedAudioSettings() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }

  try {
    const serialized = window.localStorage.getItem(AUDIO_SETTINGS_STORAGE_KEY);
    if (!serialized) return { ...DEFAULT_AUDIO_SETTINGS };
    return sanitizePersistedAudioSettings(JSON.parse(serialized));
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
}

function persistAudioSettings(audioSettings) {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const persisted = {};
    for (const key of PERSISTED_AUDIO_SETTINGS_KEYS) {
      persisted[key] = audioSettings[key];
    }
    window.localStorage.setItem(AUDIO_SETTINGS_STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // Ignore storage failures; audio should still work for the current session.
  }
}

const RATE_MULTIPLIERS_STORAGE_KEY = 'biomeSimulator.rateMultipliers';

function loadPersistedRateMultipliers() {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(RATE_MULTIPLIERS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      hungerMultiplier: Number.isFinite(parsed.hungerMultiplier) ? parsed.hungerMultiplier : null,
      thirstMultiplier: Number.isFinite(parsed.thirstMultiplier) ? parsed.thirstMultiplier : null,
    };
  } catch {
    return null;
  }
}

function persistRateMultipliers(hunger, thirst) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(
      RATE_MULTIPLIERS_STORAGE_KEY,
      JSON.stringify({ hungerMultiplier: hunger, thirstMultiplier: thirst }),
    );
  } catch { /* ignore */ }
}

const _persistedRateMultipliers = loadPersistedRateMultipliers();

const PROFILING_STORAGE_KEY = 'biomeSimulator.profilingEnabled';

const SHOW_ANIMAL_HP_BARS_STORAGE_KEY = 'biomeSimulator.showAnimalHpBars';

function loadPersistedProfiling() {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    const raw = window.localStorage.getItem(PROFILING_STORAGE_KEY);
    return raw === 'true';
  } catch {
    return false;
  }
}

function persistProfiling(enabled) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(PROFILING_STORAGE_KEY, String(!!enabled));
  } catch { /* ignore */ }
}

function loadPersistedShowAnimalHpBars() {
  if (typeof window === 'undefined' || !window.localStorage) return true;
  try {
    const raw = window.localStorage.getItem(SHOW_ANIMAL_HP_BARS_STORAGE_KEY);
    if (raw === null) return true;
    return raw !== 'false';
  } catch {
    return true;
  }
}

function persistShowAnimalHpBars(enabled) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(SHOW_ANIMAL_HP_BARS_STORAGE_KEY, String(!!enabled));
  } catch { /* ignore */ }
}

const useSimStore = create((set, get) => ({

  // Worker reference (set once by useSimulation)
  worker: null,
  setWorker: (w) => set({ worker: w }),

  // Game config (params used at game start)
  gameConfig: {},
  setGameConfig: (c) => set(state => ({ gameConfig: { ...state.gameConfig, ...c } })),

  // World
  mapWidth: 0,
  mapHeight: 0,
  terrainData: null, // Uint8Array
  worldReady: null,
  isGeneratingWorld: false,
  isPreparingAssets: false,
  assetPreparationTitle: '',
  assetPreparationSubtitle: '',
  terrainUndoStack: [],
  terrainRedoStack: [],
  _actionSeq: 0,
  entityUndoStack: [],
  entityRedoStack: [],
  pendingEntityPlacementQueue: [],
  setTerrain: (data, w, h) => set({ terrainData: data, mapWidth: w, mapHeight: h }),
  setGeneratingWorld: (isGeneratingWorld) => set({ isGeneratingWorld: !!isGeneratingWorld }),
  startAssetPreparation: (title, subtitle = '') => set({
    isPreparingAssets: true,
    assetPreparationTitle: title || 'Preparing assets',
    assetPreparationSubtitle: subtitle || '',
  }),
  updateAssetPreparation: (title, subtitle = '') => set((state) => ({
    isPreparingAssets: true,
    assetPreparationTitle: title || state.assetPreparationTitle || 'Preparing assets',
    assetPreparationSubtitle: subtitle || '',
  })),
  finishAssetPreparation: () => set({
    isPreparingAssets: false,
    assetPreparationTitle: '',
    assetPreparationSubtitle: '',
  }),
  applyTerrainChanges: (changes) => set((state) => {
    if (!state.terrainData || !Array.isArray(changes) || changes.length === 0) return {};
    const nextTerrain = new Uint8Array(state.terrainData);
    for (const change of changes) {
      const idx = change.y * state.mapWidth + change.x;
      if (idx >= 0 && idx < nextTerrain.length) {
        nextTerrain[idx] = change.terrain;
      }
    }
    return { terrainData: nextTerrain };
  }),
  pushTerrainHistoryEntry: (entry) => set((state) => {
    if (!entry?.undo?.length || !entry?.redo?.length) return {};
    const seq = state._actionSeq + 1;
    return {
      _actionSeq: seq,
      terrainUndoStack: [...state.terrainUndoStack, { ...entry, _seq: seq }].slice(-TERRAIN_HISTORY_LIMIT),
      terrainRedoStack: [],
    };
  }),
  popTerrainUndoEntry: () => {
    const state = get();
    if (state.terrainUndoStack.length === 0) return null;
    const entry = state.terrainUndoStack[state.terrainUndoStack.length - 1];
    set({
      terrainUndoStack: state.terrainUndoStack.slice(0, -1),
      terrainRedoStack: [...state.terrainRedoStack, entry].slice(-TERRAIN_HISTORY_LIMIT),
    });
    return entry;
  },
  popTerrainRedoEntry: () => {
    const state = get();
    if (state.terrainRedoStack.length === 0) return null;
    const entry = state.terrainRedoStack[state.terrainRedoStack.length - 1];
    set({
      terrainRedoStack: state.terrainRedoStack.slice(0, -1),
      terrainUndoStack: [...state.terrainUndoStack, entry].slice(-TERRAIN_HISTORY_LIMIT),
    });
    return entry;
  },
  pushEntityUndoEntry: (entry) => set((state) => {
    if (!entry?.kind) return {};
    const seq = state._actionSeq + 1;
    return {
      _actionSeq: seq,
      entityUndoStack: [...state.entityUndoStack, { ...entry, _seq: seq }].slice(-TERRAIN_HISTORY_LIMIT),
      entityRedoStack: [],
    };
  }),
  popEntityUndoEntry: () => {
    const state = get();
    if (state.entityUndoStack.length === 0) return null;
    const entry = state.entityUndoStack[state.entityUndoStack.length - 1];
    set({
      entityUndoStack: state.entityUndoStack.slice(0, -1),
      entityRedoStack: [...state.entityRedoStack, entry].slice(-TERRAIN_HISTORY_LIMIT),
    });
    return entry;
  },
  popEntityRedoEntry: () => {
    const state = get();
    if (state.entityRedoStack.length === 0) return null;
    const entry = state.entityRedoStack[state.entityRedoStack.length - 1];
    set({
      entityRedoStack: state.entityRedoStack.slice(0, -1),
      entityUndoStack: [...state.entityUndoStack, entry].slice(-TERRAIN_HISTORY_LIMIT),
    });
    return entry;
  },
  updateTopEntityUndoEntryId: (entityId) => set((state) => {
    if (state.entityUndoStack.length === 0) return {};
    const next = [...state.entityUndoStack];
    next[next.length - 1] = { ...next[next.length - 1], entityId };
    return { entityUndoStack: next };
  }),
  updateTopEntityRedoEntryId: (entityId) => set((state) => {
    if (state.entityRedoStack.length === 0) return {};
    const next = [...state.entityRedoStack];
    next[next.length - 1] = { ...next[next.length - 1], entityId };
    return { entityRedoStack: next };
  }),
  enqueuePendingEntityPlacement: (pending) => set((state) => {
    if (!pending) return {};
    return {
      pendingEntityPlacementQueue: [...state.pendingEntityPlacementQueue, pending].slice(-TERRAIN_HISTORY_LIMIT),
    };
  }),
  peekPendingEntityPlacement: () => {
    const queue = get().pendingEntityPlacementQueue;
    return queue.length > 0 ? queue[0] : null;
  },
  shiftPendingEntityPlacement: () => {
    const state = get();
    if (state.pendingEntityPlacementQueue.length === 0) return null;
    const [head, ...rest] = state.pendingEntityPlacementQueue;
    set({ pendingEntityPlacementQueue: rest });
    return head;
  },
  clearPendingEntityPlacements: () => set({ pendingEntityPlacementQueue: [] }),
  clearTerrainHistory: () => set({
    terrainUndoStack: [],
    terrainRedoStack: [],
    entityUndoStack: [],
    entityRedoStack: [],
    pendingEntityPlacementQueue: [],
    _actionSeq: 0,
  }),

  // Simulation state
  running: false,
  paused: true,
  tps: 10,
  clock: { tick: 0, day: 0, tick_in_day: 0, is_night: false, ticks_per_day: DEFAULT_TICKS_PER_DAY },

  setSimState: (s) => set(s),
  setClock: (clock) => set({ clock }),

  // Climate state (season + temperature) — updated every tick from worker
  climate: { season: 0, seasonName: 'Spring', temperature: 15 },
  setClimate: (c) => set({ climate: c }),

  // Animals (in current viewport)
  animals: [],
  _animalsById: new Map(),
  setAnimals: (a) => {
    const map = new Map();
    for (const animal of a) map.set(animal.id, animal);
    set({ animals: a, _animalsById: map });
  },
  removeAnimalById: (id) => set((state) => {
    if (id == null || !state._animalsById.has(id)) return {};
    const map = new Map(state._animalsById);
    map.delete(id);
    const animals = state.animals.filter((a) => a.id !== id);
    const selectedEntity = state.selectedEntity?.id === id ? null : state.selectedEntity;
    return { animals, _animalsById: map, selectedEntity };
  }),
  mergeAnimalDeltas: (deltas, deadIds) => {
    const state = get();
    const map = new Map(state._animalsById);
    // Apply deltas (update existing or add new)
    for (const delta of deltas) {
      const existing = map.get(delta.id);
      if (existing) {
        map.set(delta.id, { ...existing, ...delta });
      } else {
        // New animal (born this tick) — delta has full data from toDelta()
        map.set(delta.id, delta);
      }
    }
    // Mark dead animals (set _deathTick so renderer can fade the skull)
    const currentTick = state.clock.tick;
    for (const id of deadIds) {
      const existing = map.get(id);
      if (existing) {
        map.set(id, { ...existing, alive: false, state: 9, _deathTick: existing._deathTick ?? currentTick });
      }
    }
    // Keep alive animals; retain state-9 corpses for 300 ticks (matching engine cleanup)
    const animals = [];
    for (const a of map.values()) {
      if (a.alive) {
        animals.push(a);
      } else if (a.state === 9) {
        if (a.consumed) {
          map.delete(a.id);
          continue;
        }
        const deathTick = a._deathTick ?? currentTick;
        if (currentTick - deathTick < 300) {
          animals.push(a);
        } else {
          map.delete(a.id); // evict expired corpses so _animalsById doesn't grow without bound
        }
      }
    }
    set({ animals, _animalsById: map });
  },

  // Plant changes queue
  plantChanges: [],
  setPltChanges: (c) => set({ plantChanges: c }),
  fruitChanges: [],
  setFruitChanges: (c) => set({ fruitChanges: c }),
  plantSnapshot: null,
  setPlantSnapshot: (snapshot) => set({ plantSnapshot: snapshot }),
  itemSnapshot: null,
  setItemSnapshot: (snapshot) => set((state) => {
    if (!snapshot?.items) return { itemSnapshot: snapshot };
    const groundItems = new Map();
    for (const item of snapshot.items) {
      groundItems.set(item.id, item);
    }
    let selectedItem = state.selectedItem;
    if (selectedItem) {
      selectedItem = groundItems.get(selectedItem.id) || null;
    }
    return { itemSnapshot: snapshot, groundItems, selectedItem };
  }),

  // Ground item changes (add/remove/update deltas)
  itemChanges: [],
  setItemChanges: (changes) => set((state) => {
    if (!changes || changes.length === 0) return { itemChanges: changes };
    const groundItems = new Map(state.groundItems);
    let selectedItem = state.selectedItem;
    for (const change of changes) {
      if (change.op === 'add') {
        groundItems.set(change.item.id, change.item);
      } else if (change.op === 'remove') {
        groundItems.delete(change.item.id);
        if (selectedItem?.id === change.item.id) selectedItem = null;
      } else if (change.op === 'update') {
        const existing = groundItems.get(change.item.id);
        const merged = existing ? { ...existing, ...change.item } : change.item;
        groundItems.set(change.item.id, merged);
        if (selectedItem?.id === change.item.id) selectedItem = merged;
      }
    }
    return { itemChanges: changes, groundItems, selectedItem };
  }),
  groundItems: new Map(), // id → full item delta, kept in sync with itemChanges

  // Stats
  stats: { herbivores: 0, carnivores: 0, plants_total: 0, fruits: 0 },
  statsHistory: [],
  setStats: (s) => set({ stats: s }),
  setStatsHistory: (h) => set({ statsHistory: h }),

  // Profiling (engine + renderer)
  profilingEnabled: loadPersistedProfiling(),
  showAnimalHpBars: loadPersistedShowAnimalHpBars(),
  profiling: {
    engine: {
      tick: 0,
      tickMs: 0,
      phases: {
        plantsMs: 0,
        behaviorMs: 0,
        spatialMs: 0,
        cleanupMs: 0,
        statsMs: 0,
      },
      counts: {
        animalsTotal: 0,
        animalsAlive: 0,
        activePlants: 0,
      },
    },
    renderer: {
      fps: 0,
      frameMs: 0,
      entityUpdateMs: 0,
      plantUpdateMs: 0,
      lastTickAt: 0,
    },
  },
  setProfilingEnabled: (enabled) => { persistProfiling(enabled); set({ profilingEnabled: !!enabled }); },
  setShowAnimalHpBars: (enabled) => { persistShowAnimalHpBars(enabled); set({ showAnimalHpBars: !!enabled }); },
  setEngineProfile: (engine) => set(state => ({ profiling: { ...state.profiling, engine } })),
  setRendererProfile: (renderer) => set(state => ({ profiling: { ...state.profiling, renderer } })),

  // Background pause
  pauseOnBackground: loadPauseOnBackground(),
  setPauseOnBackground: (v) => {
    const val = !!v;
    persistPauseOnBackground(val);
    set({ pauseOnBackground: val });
  },

  // Audio
  audioSettings: loadPersistedAudioSettings(),
  setAudioSettings: (patch) => set(state => {
    const audioSettings = { ...state.audioSettings, ...patch };
    persistAudioSettings(audioSettings);
    return { audioSettings };
  }),
  audioLog: [],
  pushAudioLog: (entry) => set(state => ({
    audioLog: [entry, ...state.audioLog].slice(0, AUDIO_LOG_LIMIT),
  })),
  pushAudioLogBatch: (entries) => set(state => ({
    audioLog: [...entries, ...state.audioLog].slice(0, AUDIO_LOG_LIMIT),
  })),
  clearAudioLog: () => set({ audioLog: [] }),

  // Selected entity / tile / item
  selectedEntity: null,
  selectedTile: null,
  selectedItem: null,
  setSelectedEntity: (e) => set({ selectedEntity: e, selectedTile: null, selectedItem: null }),
  setSelectedTile: (t) => set({ selectedTile: t, selectedEntity: null, selectedItem: null }),
  setSelectedItem: (item) => set({ selectedItem: item, selectedEntity: null, selectedTile: null }),
  clearSelection: () => set({ selectedEntity: null, selectedTile: null, selectedItem: null }),

  // Editor
  tool: 'SELECT', // SELECT, PAINT_TERRAIN, PLACE_ENTITY, ERASE
  setTool: (t) => set({ tool: t }),

  paintTerrain: 3, // SOIL by default
  setPaintTerrain: (t) => set({ paintTerrain: t }),

  brushSize: 1,
  setBrushSize: (s) => set({ brushSize: s }),

  placeEntityType: 'RABBIT',
  setPlaceEntityType: (t) => set({ placeEntityType: t }),

  // Selection target filters (what the SELECT tool picks)
  selectionTargets: { animals: true, plants: true, terrain: true, items: true },
  setSelectionTarget: (key, value) => set(state => ({
    selectionTargets: { ...state.selectionTargets, [key]: value },
  })),

  // Global rate multipliers
  hungerMultiplier: _persistedRateMultipliers?.hungerMultiplier ?? 1.2,
  thirstMultiplier: _persistedRateMultipliers?.thirstMultiplier ?? 1.25,
  setHungerMultiplier: (v) => set(state => {
    persistRateMultipliers(v, state.thirstMultiplier);
    return { hungerMultiplier: v };
  }),
  setThirstMultiplier: (v) => set(state => {
    persistRateMultipliers(state.hungerMultiplier, v);
    return { thirstMultiplier: v };
  }),

  // Viewport
  viewport: { x: 0, y: 0, w: 100, h: 100, zoom: 4 },
  setViewport: (v) => set({ viewport: v }),

  // Supervisor flash messages
  supervisorFlashes: [],
  pushSupervisorFlash: (flash) => set(state => ({
    supervisorFlashes: [...state.supervisorFlashes, flash].slice(-5),
  })),
  dismissSupervisorFlash: (id) => set(state => ({
    supervisorFlashes: state.supervisorFlashes.filter(f => f.id !== id),
  })),

  // Generic UI toasts (placement errors, transient warnings)
  uiToasts: [],
  pushUiToast: (toast) => set((state) => {
    if (!toast) return {};
    const id = toast.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      uiToasts: [...state.uiToasts, { variant: 'warning', ...toast, id }].slice(-5),
    };
  }),
  dismissUiToast: (id) => set((state) => ({
    uiToasts: state.uiToasts.filter(t => t.id !== id),
  })),

  // Save callback (set temporarily when saving)
  _saveCallback: null,
  setSaveCallback: (fn) => set({ _saveCallback: fn }),
}));

export default useSimStore;
