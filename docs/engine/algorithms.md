# Algorithms

Navigation: [Documentation Home](../README.md) > [Engine](README.md) > [Current Document](algorithms.md)
Return to [Documentation Home](../README.md).

---

## Terrain Generation (`mapGenerator.js`)

### `generateTerrain(config)` → `{terrain, waterProximity, seed}`

**Pipeline:**

1. **Perlin noise FBM** — 6 octaves at scale 0.005, persistence 0.5 → heightmap [0, 1]
2. **Island mask** — Gaussian blobs centered near map center, configurable count and size
3. **Combine** — `heightmap × islandMask`
4. **Classify terrain** by height thresholds:
   - `> seaLevel + 0.45` → ROCK
   - `0.12 – 0.45` → GRASS
   - `0.05 – 0.12` → DIRT
   - `0 – 0.05` → SAND
   - `≤ 0` → WATER
5. **Detail noise** — 3-octave FBM on GRASS tiles adds DIRT/ROCK variation
6. **Water proximity BFS** — flood fill from all water tiles, 4-directional

### Noise Functions

| Function | Purpose |
|----------|---------|
| `mulberry32(seed)` | Seeded 32-bit PRNG for reproducibility |
| `perlinNoise2D(w, h, seed, scale)` | Single-octave gradient noise with Perlin fade curve |
| `fbmNoise(w, h, seed, octaves, scale, lacunarity, persistence)` | Multi-octave fractal Brownian motion |
| `generateIslandMask(w, h, count, sizeFactor, seed)` | Circular blobs via normal distribution |

---

## Spatial Hash (`spatialHash.js`)

Grid-based spatial indexing for efficient neighbor queries.

```javascript
const hash = new SpatialHash(cellSize); // default 16
hash.rebuild(aliveAnimals);
hash.queryRadius(x, y, radius);         // → [entity, ...]
```

**How it works:**

- Divides the world into cells of `cellSize × cellSize` tiles
- Cell key is a packed integer: `(cx & 0xFFFF) | ((cy & 0xFFFF) << 16)` — avoids string allocation in the hot loop
- Entities stored in `Map<intKey, Map<id, entity>>`
- `queryRadius` checks all cells overlapping the query circle, then filters by Euclidean distance²
- `rebuild` called each tick after movement

---

## A* Pathfinding (`pathfinding.js`)

### `aStar(sx, sy, gx, gy, world, maxDist = 50)` → `[[x, y], ...]`

Bounded A* with 4-directional movement (no diagonals).

- **Heuristic:** Manhattan distance
- **Expansion limit:** `maxDist` tiles from start position
- **Goal adjustment:** If goal tile is unwalkable, searches adjacent tiles
- **Data structures:** Binary min-heap for open set, flat array for visited
- **Returns:** Waypoint array, or empty array if unreachable

---

## Dependency Graph

```
config.js ← animalSpecies.js (builds species/counts)
         ← plantSpecies.js  (builds plant data)

simulation.js
├── world.js
├── entities.js (Animal)
├── spatialHash.js (SpatialHash)
├── mapGenerator.js (generateTerrain, computeWaterProximity)
├── flora.js (seedInitialPlants, processPlants)
├── behaviors.js (decideAndAct)
└── plantSpecies.js (stage ages, production chances)

behaviors.js
├── entities.js (AnimalState)
├── world.js (terrain checks)
├── pathfinding.js (aStar)
└── config.js (sex/reproduction constants)

simWorker.js
├── simulation.js (SimulationEngine)
├── faunaWorker.js (sub-worker pool, optional)
└── entities.js (for delta merge)

faunaWorker.js
├── behaviors.js (decideAndAct)
├── entities.js (Animal, for reconstruction)
├── spatialHash.js (local spatial index)
└── world.js (read-only terrain/plant data)

flora.js
├── world.js (terrain constants)
└── plantSpecies.js (stage thresholds, reproduction modes)

mapGenerator.js  ← world.js (terrain constants)
pathfinding.js   ← world.js (walkability)
entities.js      ← config.js (sex constants)
plantSpecies.js  ← world.js (terrain IDs)
spatialHash.js   — no dependencies
world.js         — no dependencies
```
