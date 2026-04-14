# Overview & Camera

Navigation: [Documentation Home](../README.md) > [Renderer](README.md) > [Current Document](overview.md)
Return to [Documentation Home](../README.md).

---

## GameRenderer

Coordinates all layers and handles user input. All layers live inside a single `PIXI.Container` (`worldContainer`) transformed by the camera.

```javascript
const renderer = new GameRenderer(container, onViewportChange, onTileClick);
```

### Public Methods

| Method | Description |
|--------|-------------|
| `setTerrain(terrainData, width, height)` | Initialize terrain texture, plant buffers, camera bounds |
| `updatePlants(plantChanges)` | Apply plant deltas to pixel overlay and emoji sprites |
| `setNight(isNight)` | Toggle night overlay (alpha 0 or 0.35) |
| `centerOn(tileX, tileY)` | Pan camera to center on a tile |
| `getViewportTiles()` | Current visible tile range `{x, y, w, h}` |
| `destroy()` | Cleanup Pixi app, observers, listeners |

### Input Handling

| Input | Action |
|-------|--------|
| Mouse wheel | Zoom in/out (factor 1.15× per step) |
| Click + drag | Pan the viewport |
| Click (no drag) | Converts screen→tile coordinates, fires `onTileClick(x, y)` |

---

## Camera

Manages viewport transform: pan, zoom, and coordinate conversion.

```javascript
const camera = new Camera(worldContainer, screen, onChanged);
```

### Properties

| Property | Range | Description |
|----------|-------|-------------|
| `zoom` | 1–60 | Current scale factor |
| `worldW`, `worldH` | — | Map dimensions in tiles |

### Methods

| Method | Description |
|--------|-------------|
| `pan(dx, dy)` | Move viewport by screen pixels, clamped to bounds |
| `onWheel(event)` | Zoom around mouse position |
| `centerOn(tileX, tileY)` | Position tile at screen center |
| `screenToTile(sx, sy)` → `{x, y}` | Convert screen coordinates to world tile |
| `getViewportTiles()` → `{x, y, w, h}` | Current visible tile range |

### Coordinate System

```
World (tiles) ←→ Texture (1px = 1 tile) ←→ Screen (Pixi app)

Screen → Tile:
  tileX = (screenX - container.x) / zoom
  tileY = (screenY - container.y) / zoom
```

Animal positions are **sub-tile floats** (e.g. `5.5, 3.25`), already centered at `tile + 0.5`. Sprites are placed directly at `(animal.x, animal.y)` in world coordinates — no `+0.5` offset is needed. Plant and terrain coordinates remain integer tile indices.

---

## Data Flow

```mermaid
flowchart TD
    Worker["simWorker\npostMessage({type: 'tick'})"] --> Hook["useSimulation hook"]
    Hook --> Store["Zustand Store\n(animals, plantChanges, clock)"]

    Store --> UE["App.jsx useEffect hooks"]

    UE --> EL["entityLayer.update()\nSprite pool + state textures\n+ life stage scaling"]
    UE --> PL["updatePlants()\nPixel overlay + emoji sprites"]
    UE --> Night["setNight()\nOverlay alpha 0–35%"]

    subgraph Layers["Pixi.js Layer Stack (back → front)"]
        direction TB
        L1["1. TerrainLayer\n1px/tile RGBA texture"]
        L2["2. PlantLayer pixel overlay\n(always visible)"]
        L3["3. PlantLayer emoji sprites\n(zoom ≥ 6 only)"]
        L4["4. EntityLayer\nanimal emoji sprites"]
        L5["5. AnimationLayer\nparticle effects"]
        L6["6. Night Overlay\nsemi-transparent rectangle"]
        L1 --- L2 --- L3 --- L4 --- L5 --- L6
    end

    EL --> L4
    PL --> L2
    PL --> L3
    Night --> L6

    Layers --> Render["GPU renders at 60fps"]
```

---

## Viewport Culling

- Animals are filtered to the current viewport in the worker (`getStateForViewport`) — includes both alive and recently dead animals
- Plant emojis are viewport-scoped in `PlantLayer.updateEmojis()`
- Terrain and plant pixel overlays cover the full map (single texture each)

---

## See Also

- [Rendering Layers](layers.md) — detailed layer implementation, sprite pooling, animations, emoji textures
- [Architecture: Tick Pipeline](../architecture.md#simulation-tick) — full data flow from worker to screen
- [Worker API: Messages](../api/messages.md) — tick message format consumed by the renderer
