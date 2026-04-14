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
| `zoom` | 1–40 | Current scale factor |
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

```
Worker sends tick message
  ↓
useSimulation hook → Store (animals, plantChanges, clock)
  ↓
App.jsx useEffect hooks
  ├── renderer.entityLayer.update(animals, renderer, clock.tick)
  ├── renderer.updatePlants(plantChanges)
  └── renderer.setNight(clock.is_night)
  ↓
Pixi.js renders at 60fps
```

---

## Viewport Culling

- Animals are filtered to the current viewport in the worker (`getStateForViewport`) — includes both alive and recently dead animals
- Plant emojis are viewport-scoped in `PlantLayer.updateEmojis()`
- Terrain and plant pixel overlays cover the full map (single texture each)
