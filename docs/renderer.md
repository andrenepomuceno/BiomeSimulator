# Renderer

The renderer layer (`frontend/src/renderer/`) handles all visual output using Pixi.js 7. It is strictly presentation — no game logic.

---

## File Overview

| File | Purpose |
|------|---------|
| `GameRenderer.js` | Top-level renderer: initializes Pixi app, layers, camera, input |
| `Camera.js` | Viewport pan/zoom, coordinate conversion |
| `TerrainLayer.js` | Renders terrain as a single pixel texture |
| `PlantLayer.js` | Renders plants as pixel overlay + emoji sprites |
| `EntityLayer.js` | Renders animals as emoji sprites |

---

## Layer Stack (Back to Front)

```
1. TerrainLayer   — terrain types as RGBA pixels (1 pixel = 1 tile)
2. PlantLayer     — plant pixel overlay (always visible)
3. PlantLayer     — plant emoji sprites (zoom ≥ 6 only)
4. EntityLayer    — animal emoji sprites
5. Night Overlay  — semi-transparent dark rectangle (0–35% alpha)
```

All layers live inside a single `PIXI.Container` (`worldContainer`) that is transformed by the camera.

---

## GameRenderer

Coordinates all layers and handles user input.

```javascript
const renderer = new GameRenderer(container, onViewportChange, onTileClick);
```

### Public Methods

| Method | Description |
|--------|-------------|
| `setTerrain(terrainData, width, height)` | Initialize terrain texture, plant buffers, camera bounds |
| `updatePlants(plantChanges)` | Apply plant deltas to pixel overlay + emoji sprites |
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

---

## TerrainLayer

Renders the entire terrain map as a single sprite.

- **Approach:** 1 pixel per tile, nearest-neighbor scaling
- **Pixel buffer:** `Uint8Array(width × height × 4)` — RGBA
- **GPU upload:** `PIXI.BaseTexture` with `SCALE_MODES.NEAREST`

| Method | Description |
|--------|-------------|
| `setTerrain(terrainData, w, h)` | Convert terrain array to RGBA texture |
| `updateTiles(changes)` | In-place pixel edits, re-upload to GPU |

### Terrain Colors

| Type | Color |
|------|-------|
| Water | Deep blue |
| Sand | Light tan |
| Dirt | Brown |
| Grass | Green |
| Rock | Gray |

---

## PlantLayer

Dual-mode rendering for performance across all zoom levels.

### Pixel Overlay (Always Active)
- 1 pixel per tile, colored by plant type and stage
- Uses `PLANT_COLORS['${type}_${stage}']` lookup
- Dead plants (stage 5) and empty tiles are transparent

### Emoji Overlay (Zoom ≥ 6)
- Actual emoji sprites positioned on tiles
- Sprite pool with recycling (max **8000 sprites** in viewport)
- Lazy-loaded textures from `emojiTextures.js`

| Method | Description |
|--------|-------------|
| `init(width, height)` | Allocate pixel buffer and GPU texture |
| `applyChanges(changes)` | Update pixels and raw type/stage arrays |
| `setFromArrays(types, stages, w, h)` | Batch load entire grid |
| `updateEmojis(vx, vy, vw, vh, zoom)` | Refresh emoji sprites in viewport |

### Plant Emoji Map

| Stage | Emoji |
|-------|-------|
| Seed | 🌱 |
| Sprout | 🌿 (most) or 🥬 (carrot) |
| Mature | 🌾 (grass), 🌳 (trees), 🥬 (carrot) |
| Fruiting | Species-specific: 🍓 🫐 🍎 🥭 🥕 🌾 |

---

## EntityLayer

Renders animals as emoji sprites with state-dependent appearance.

| Method | Description |
|--------|-------------|
| `update(animals, renderer, currentTick)` | Reposition sprites, manage sprite pool, apply life stage scaling and skull fade |

### Sprite Behavior

| Property | Rule |
|----------|------|
| Texture | Species emoji (🐰 🐿️ 🪲 🐐 🦌 🦊 🐺 🐗 🐻 🦝 🐦‍⬛), or 💤 (sleeping), 💀 (dead) |
| Scale | `0.018 × energyFactor × stageFactor` — varies by life stage and health |
| Stage Scale | Baby 0.5×, Young 0.7×, Young Adult 0.85×, Adult 1.0× |
| Alpha | 1.0 normal, 0.65 sleeping, fading `0.8 × (1 - elapsed/300)` for dead (over 300 ticks, min 0.05) |

### Sprite Pool

- Sprites cached in `Map<id, PIXI.Sprite>`
- Created on first sight, reused on subsequent ticks
- Removed when entity no longer in viewport data

---

## Emoji Textures (`utils/emojiTextures.js`)

Generates PIXI textures from emoji characters via offscreen canvas.

| Function | Returns |
|----------|---------|
| `generateEmojiTextures()` | `{RABBIT, SQUIRREL, ..., SLEEPING, DEAD}` — 13 textures |
| `generatePlantEmojiTextures()` | `{'${type}_${stage}': Texture}` — 24 textures |

- 64×64px canvas per emoji
- Cached as singletons (lazy-loaded)
- `LINEAR` scale mode for smooth appearance

---

## Rendering Data Flow

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

### Viewport Culling

- Animals are filtered to current viewport in the worker (`getStateForViewport`) — includes both alive and recently dead animals
- Plant emojis are viewport-scoped in `PlantLayer.updateEmojis()`
- Terrain and plant pixel overlays cover the full map (single texture each)
