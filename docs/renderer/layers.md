# Rendering Layers

Navigation: [Documentation Home](../README.md) > [Renderer](README.md) > [Current Document](layers.md)
Return to [Documentation Home](../README.md).

---

## Container Hierarchy (back → front)

```
worldContainer
  ├── TerrainLayer.container       — pixel terrain (1px / tile)
  ├── PlantLayer.container         — plant pixel overlay (1px / tile, fades at zoom ≥ 6)
  ├── _shadowContainer             — ground-level shadows for ALL plants and animals
  ├── _depthContainer              — Y-sorted: plant emoji sprites + animal sprites
  │     (sortableChildren = true, zIndex = y * 1000)
  ├── _overlayContainer            — HP bars, entity selection marker
  └── AnimationLayer.container     — particle effects (attack, birth, death, etc.)
```

**Depth sorting**: `_depthContainer` uses Pixi.js `sortableChildren`. Both plant emoji sprites and animal sprites share this container, with `zIndex` set to the Y coordinate × 1000 each frame. Entities with a higher Y (lower on screen) render in front, giving natural depth ordering where animals can appear in front of or behind plants.

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

## Shadow Container

Shared ground-level container for all shadow ellipses (plant + animal).

- **Plant shadows**: created for plants at growth stage ≥ 3, scaled by species category
- **Animal shadows**: created for each visible living animal, scaled proportionally to sprite size
- Shadow alpha: **0.35** (plants) / **0.30** (animals)
- Rendered below all entity sprites, always on the ground plane

---

## PlantLayer

Dual-mode rendering for performance across all zoom levels.

### Pixel Overlay (Always Active)

- 1 pixel per tile, colored by plant type and stage
- Uses `PLANT_COLORS['${type}_${stage}']` lookup
- Dead plants (stage 5) and empty tiles are transparent

### Emoji Overlay (Zoom ≥ 6 Only)

- Sprites added to the shared `_depthContainer` for Y-sorted depth
- Sprite pool with recycling (max **8000 sprites** in viewport)
- Anchor: `(0.5, 1.0)` — base-aligned for correct Y-sorting

### Variable Plant Sizing

| Category | Species | Visual Scale | Max Size |
|----------|---------|-------------|----------|
| Trees | Apple, Mango, Oak, Coconut Palm, Olive | 1.4× | ~1.4 tiles |
| Medium | Strawberry, Blueberry, Sunflower, Tomato, Chili, Cactus | 1.0× | ~1.0 tile |
| Low | Grass, Mushroom, Carrot, Potato | 0.75× | ~0.75 tiles |

Base scale: `1.0 / FRAME_SIZE` per tile, multiplied by category factor and ±10% per-cell jitter.

| Method | Description |
|--------|-------------|
| `init(width, height)` | Allocate pixel buffer and GPU texture |
| `applyChanges(changes)` | Update pixels and raw type/stage arrays |
| `setFromArrays(types, stages, w, h)` | Batch load entire grid |
| `updateEmojis(vx, vy, vw, vh, zoom)` | Refresh emoji sprites in viewport |

---

## EntityLayer

Renders animals as procedural pixel-art sprites with depth-sorted rendering.

- Animal sprites are added to the shared `_depthContainer`
- HP bars and selection markers are in the `_overlayContainer` (always on top)
- Anchor: `(0.5, 1.0)` — feet-aligned for correct Y-sorting

| Method | Description |
|--------|-------------|
| `update(animals, renderer, currentTick, zoom)` | Reposition sprites, manage sprite pool, apply scaling, update shadows |

### Variable Animal Sizing

| Category | Species | Visual Scale | Approx Size |
|----------|---------|-------------|-------------|
| Insects | Mosquito, Caterpillar, Cricket, Beetle | 0.55× | ~0.75 tiles |
| Small | Rabbit, Squirrel, Lizard, Crow | 0.70× | ~0.75 tiles |
| Medium | Fox, Snake, Hawk, Raccoon | 0.85× | ~0.85 tiles |
| Large Herbivores | Deer, Goat, Boar | 0.95× | ~0.95 tiles |
| Apex / Large | Wolf, Crocodile, Bear | 1.10× | ~1.1–1.4 tiles |

Base scale: `1.0 / FRAME_SIZE`, multiplied by species factor, energy factor (0.8–1.2), life stage factor (0.5–1.0), and pregnancy factor (1.0–1.1). Final scale clamped to `[0.75, 1.5]` tiles.

### Sprite Behavior

| Property | Rule |
|----------|------|
| Texture | Species directional sprite (4 dirs × 3 frames), or special states (EGG, SLEEPING, DEAD, PUPA) |
| Scale | `BASE_SCALE × speciesScale × energyFactor × stageFactor × pregnantFactor` (clamped 0.75–1.5 tiles) |
| Stage Scale | Baby 0.5×, Young 0.7×, Young Adult 0.85×, Adult 1.0× |
| Alpha | 1.0 normal, 0.65 sleeping, fading for dead over 300 ticks |
| Shadow | Ellipse shadow on ground, scaled proportionally to sprite size |

---

## AnimationLayer

Particle-based visual feedback for key simulation events.

| Animation | Trigger | Particles | Shape |
|-----------|---------|-----------|-------|
| Attack | Combat hit | 5 stars | ⭐ burst |
| Birth | Offspring spawned | 6 circles | Ring expand |
| Death | Animal dies | 8 circles | Fade scatter |
| Fruit Sparkle | Plant reaches Fruit stage | 4 sparkles | Rising glint |
| Mating | Reproduction | 4 hearts | Float up |
| Eating | Consuming food | 4 crumbs | Scatter down |

- Max **600 particles** active (ring buffer allocation)
- Runtime-generated textures: circle, star, heart, sparkle (canvas-drawn)
- Per-particle physics: position, velocity, gravity, life, scale curves, alpha curves

---

## Emoji Textures (`utils/emojiTextures.js`)

Generates PIXI textures from emoji characters via offscreen canvas.

| Function | Returns |
|----------|---------|
| `generateEmojiTextures()` | `{RABBIT, SQUIRREL, ..., SLEEPING, DEAD}` — 13 animal textures |
| `generatePlantEmojiTextures()` | `{'${type}_${stage}': Texture}` — 24 plant textures |

**Implementation details:**

- 64×64px canvas per emoji
- Cached as singletons (lazy-loaded on first use)
- `LINEAR` scale mode for smooth appearance at all zoom levels
