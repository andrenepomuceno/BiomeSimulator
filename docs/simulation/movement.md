# Movement System

Navigation: [Documentation Home](../README.md) > [Simulation](README.md) > [Current Document](movement.md)
Return to [Documentation Home](../README.md).

Animals move in **sub-tile increments** rather than jumping full tiles. Each tile is logically divided into a 4×4 sub-grid (`SUB_CELL_DIVISOR = 4`), so each movement step covers 0.25 tiles (`SUB_CELL_STEP`).

---

## Coordinates

- Animal positions (`x`, `y`) are **floats** (e.g. `5.5, 3.25`)
- Animals spawn at tile centers (`tileX + 0.5, tileY + 0.5`)
- Tile membership is determined by flooring: `tile = position | 0`
- All `world.js` methods floor float inputs internally, so tile lookups are transparent

---

## Speed

Species `speed` values represent **sub-cell steps per tick**. With 4 sub-cells per tile:

| Sub-cell Speed | Effective Tiles/Tick | Example Species |
|----------------|---------------------|-----------------|
| 4 | 1 | Rabbit, Beetle, Bear |
| 8 | 2 | Deer, Fox, Wolf |
| 12 | 3 | Hawk |

---

## Path Following (`_walkPath`)

Each tick, `_walkPath` calls `_followPath` up to `speed ± 1` times (with terrain adjustment):

- A random **speed jitter** of −1, 0, or +1 sub-steps is applied each tick, so animals of the same species move at slightly different paces
- **Terrain speed factor** reduces effective steps on difficult ground (see table below)
- Each `_followPath` moves 0.25 tiles toward the next A* waypoint center
- Movement is along the dominant axis (larger delta of dx/dy)
- Waypoint is considered reached when within 0.125 of its center
- **A* pathfinding remains tile-based** — start and goal are floored to integer tiles

---

## Random Walk

Random walk executes `speed ± 1` sub-steps per tick (with terrain adjustment):

- Each sub-step moves 0.25 tiles in a random cardinal direction
- **Directional inertia:** 50% chance to keep the previous step's direction, producing smoother paths instead of zig-zag
- Home bias is preserved (60% chance to prefer home direction when far, overrides inertia)

---

## Tile Occupancy

- The `animalGrid` occupancy map operates at **tile granularity** (not sub-tile)
- Occupancy is updated only when an animal crosses a tile boundary
- Two animals can share the same tile if they're on different sub-cells within it — but tile-boundary crossings check `isTileOccupied`

---

## Terrain Costs

Walking energy cost is applied **once per tile boundary crossing**, not per sub-step. Terrain also affects movement speed:

| Terrain | Speed Factor | Energy Multiplier |
|---------|-------------|-------------------|
| Soil, Dirt, Fertile Soil | 1.0× | 1.0× |
| Sand | 0.75× | 1.3× |
| Rock | 0.75× | 1.3× |
| Mud | 0.5× | 1.5× |
| Mountain | 0.5× | 1.8× |

Additional notes:

- Running/hunting energy is proportional to tiles actually crossed — a blocked predator pays only IDLE cost instead of full RUN cost
- Day/night activity penalty (1.3×) applies on top of terrain multipliers for species active during the wrong period
