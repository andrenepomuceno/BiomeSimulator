/**
 * Simulation state store — zustand.
 */
import { create } from 'zustand';
import { DEFAULT_TICKS_PER_DAY } from '../constants/simulation';

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
  setTerrain: (data, w, h) => set({ terrainData: data, mapWidth: w, mapHeight: h }),

  // Simulation state
  running: false,
  paused: true,
  tps: 10,
  clock: { tick: 0, day: 0, tick_in_day: 0, is_night: false, ticks_per_day: DEFAULT_TICKS_PER_DAY },

  setSimState: (s) => set(s),
  setClock: (clock) => set({ clock }),

  // Animals (in current viewport)
  animals: [],
  _animalsById: new Map(),
  setAnimals: (a) => {
    const map = new Map();
    for (const animal of a) map.set(animal.id, animal);
    set({ animals: a, _animalsById: map });
  },
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

  // Stats
  stats: { herbivores: 0, carnivores: 0, plants_total: 0, fruits: 0 },
  statsHistory: [],
  setStats: (s) => set({ stats: s }),
  setStatsHistory: (h) => set({ statsHistory: h }),

  // Profiling (engine + renderer)
  profilingEnabled: false,
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
  setProfilingEnabled: (enabled) => set({ profilingEnabled: !!enabled }),
  setEngineProfile: (engine) => set(state => ({ profiling: { ...state.profiling, engine } })),
  setRendererProfile: (renderer) => set(state => ({ profiling: { ...state.profiling, renderer } })),

  // Selected entity / tile
  selectedEntity: null,
  selectedTile: null,
  setSelectedEntity: (e) => set({ selectedEntity: e, selectedTile: null }),
  setSelectedTile: (t) => set({ selectedTile: t, selectedEntity: null }),
  clearSelection: () => set({ selectedEntity: null, selectedTile: null }),

  // Editor
  tool: 'SELECT', // SELECT, PAINT_TERRAIN, PLACE_ENTITY, ERASE
  setTool: (t) => set({ tool: t }),

  paintTerrain: 3, // SOIL by default
  setPaintTerrain: (t) => set({ paintTerrain: t }),

  brushSize: 1,
  setBrushSize: (s) => set({ brushSize: s }),

  placeEntityType: 'RABBIT',
  setPlaceEntityType: (t) => set({ placeEntityType: t }),

  // Global rate multipliers
  hungerMultiplier: 1.2,
  thirstMultiplier: 1.25,
  setHungerMultiplier: (v) => set({ hungerMultiplier: v }),
  setThirstMultiplier: (v) => set({ thirstMultiplier: v }),

  // Viewport
  viewport: { x: 0, y: 0, w: 100, h: 100 },
  setViewport: (v) => set({ viewport: v }),

  // Save callback (set temporarily when saving)
  _saveCallback: null,
  setSaveCallback: (fn) => set({ _saveCallback: fn }),
}));

export default useSimStore;
