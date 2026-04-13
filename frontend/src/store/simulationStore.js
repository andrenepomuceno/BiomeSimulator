/**
 * Simulation state store — zustand.
 */
import { create } from 'zustand';

const useSimStore = create((set, get) => ({
  // Worker reference (set once by useSimulation)
  worker: null,
  setWorker: (w) => set({ worker: w }),

  // Game config (params used at game start)
  gameConfig: {},
  setGameConfig: (c) => set({ gameConfig: c }),

  // World
  mapWidth: 0,
  mapHeight: 0,
  terrainData: null, // Uint8Array
  setTerrain: (data, w, h) => set({ terrainData: data, mapWidth: w, mapHeight: h }),

  // Simulation state
  running: false,
  paused: true,
  tps: 10,
  clock: { tick: 0, day: 0, tick_in_day: 0, is_night: false, ticks_per_day: 200 },

  setSimState: (s) => set(s),
  setClock: (clock) => set({ clock }),

  // Animals (in current viewport)
  animals: [],
  setAnimals: (a) => set({ animals: a }),

  // Plant changes queue
  plantChanges: [],
  setPltChanges: (c) => set({ plantChanges: c }),

  // Stats
  stats: { herbivores: 0, carnivores: 0, plants_total: 0, fruits: 0 },
  statsHistory: [],
  setStats: (s) => set({ stats: s }),
  setStatsHistory: (h) => set({ statsHistory: h }),

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
  hungerMultiplier: 1.0,
  thirstMultiplier: 1.0,
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
