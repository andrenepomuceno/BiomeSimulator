# Rendering Layers (Pixi)

Navigation: [Documentation Home](../README.md) > [Renderer](README.md) > [Current Document](layers.md)
Return to [Documentation Home](../README.md).

This document describes the Pixi backend only. For the Three.js layer model (points, sprites, GLB pools), see [Three.js Renderer Guide](threejs.md).

---

## Container Hierarchy (back → front)

```
worldContainer
  ├── TerrainLayer.container       — pixel terrain (1px / tile)
  ├── PlantLayer.container         — plant pixel overlay (1px / tile, fades at zoom ≥ 6)
  ├── ItemLayer.pixelContainer     — item pixel overlay (1px / tile, fades at zoom ≥ 6)
  ├── _shadowContainer             — ground-level shadows for ALL plants and animals
  ├── _depthContainer              — Y-sorted: plant emoji sprites + item sprites + animal sprites
  │     (sortableChildren = true, zIndex = y * 1000)
  ├── _overlayContainer            — HP bars, entity selection marker
  └── AnimationLayer.container     — particle effects (attack, birth, death, etc.)
```

**Depth sorting**: `_depthContainer` uses Pixi.js `sortableChildren`. Plant emoji sprites, item sprites, and animal sprites share this container, with `zIndex` set to the Y coordinate × 1000 each frame. Entities with a higher Y (lower on screen) render in front, giving natural depth ordering where animals and items can appear in front of or behind plants.

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
- Empty tiles are transparent
- Dead plants (stage 6) remain visible using the dead-stage color/sprite while they are pending cleanup

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
| `setShowAnimalHpBars(enabled)` | Toggle HP bar overlay visibility at runtime |

### Asset Preparation Stage

The app now runs a short blocking UI stage after `worldReady` to avoid first-frame hitches:

- Compilando texturas de animais
- Compilando texturas de plantas
- Compilando texturas de itens
- Preparando cache de áudio procedural
- Carregando/preparando samples de áudio

This stage is separate from world generation. World generation runs in the worker, while asset preparation runs on the main thread (renderer + audio manager).

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

### Anchor & Floating Fix

Terrestrial animals use `anchor.y = 0.78` to align sprite feet with the ground shadow. Flying species (`can_fly: true`: CROW, MOSQUITO, HAWK) keep `anchor.y = 1.0` to preserve the hovering effect.

### Pixel Overlay (Zoom < 6)

When zoomed out below the sprite threshold (zoom < 6), animals are rendered as colored dots on a per-species color basis using a `PIXI.Graphics` overlay. This mirrors the PlantLayer dual-mode approach:

- **Zoom < 6**: Pixel overlay at full opacity, sprites hidden
- **Zoom 6–10**: Both visible, pixel overlay fading out
- **Zoom ≥ 10**: Only sprites visible

Each animal is drawn as a 0.8×0.8 tile colored rectangle at its floor position, using the species `color` from `animalSpecies.js`.

---

## ItemLayer

Renders ground items (meat, fruit, seeds) using a dual-mode rendering approach for performance across all zoom levels.

### Pixel Overlay (Always Active)

- 1×1 colored rectangles per item
- Position: `(item.x + 0.25, item.y + 0.25)` — centered within tile
- Size: `0.5 × 0.5` tile units
- Color by type:
  - Meat (type 1): `0xcc4444` (red)
  - Fruit (type 2): `0xffaa33` (orange)
  - Seed (type 3): `0xaa8833` (brown)
- Alpha: **0.85**
- Z-index: **-500000** (below animals, above terrain)

Redrawn whenever items change (add, remove, update).

### Emoji Overlay (Zoom ≥ 6 Only)

- Sprites added to shared `_depthContainer` for Y-sorted depth
- Sprite pool with recycling
- Anchor: `(0.5, 0.5)` — center alignment
- Scale: `(1.0 / FRAME_SIZE) × 0.85` — slightly smaller than animal sprites
- Z-index: `Math.round((item.y + 0.5) * 1000)` — Y-sorted depth
- Visibility: Toggled by `updateZoom(zoom)`

### Item Types & Textures

| Type | Emoji | Pixel Color | Texture Keys |
|------|-------|-------------|--------------|
| Meat | 🥩 | Red | `MEAT_SMALL_0`, `MEAT_MEDIUM_0`, `MEAT_LARGE_0` (by source animal mass category) |
| Fruit | 🍑 | Orange | Per-plant-species texture (e.g., `FRUIT_STRAWBERRY_0`) from `buildFruitKeysBySource()` |
| Seed | 🌰 | Brown | Per-plant-species texture (e.g., `SEED_STRAWBERRY_0`) from `buildSeedKeysBySource()` |

### Zoom Threshold

- **Zoom < 6:** Pixel overlay visible, sprites hidden
- **Zoom ≥ 6:** Sprites visible, pixel overlay hidden

### Sprite Pooling

Items use efficient sprite recycling:
- Pooled sprites are mutated (texture, position) rather than recreated
- Reduces GC pressure and memory allocations
- Pool grows as needed but is never cleared, stabilizing at max active items in viewport

---

## AnimationLayer

Particle-based visual feedback for key simulation events.

| Animation | Trigger | Particles | Shape | Duration (frames) |
|-----------|---------|-----------|-------|--------------------|
| Attack | Combat hit | 10 stars | ⭐ burst | 44–64 |
| Birth | Offspring spawned | 10 circles | Ring expand | 48–66 |
| Death | Animal dies | 12 circles | Fade scatter + gravity | 54–76 |
| Fruit Sparkle | Plant reaches Fruit stage | 5 sparkles | Rising glint | 42–62 |
| Mating | Reproduction | 7 hearts | Float up | 52–76 |
| Eating | Consuming food | 5 crumbs | Scatter down | 32–46 |
| Drinking | Consuming water | 5 circles | Blue droplets rising | 32–48 |
| Fleeing | Starts fleeing | 6 circles | Dust puff | 28–42 |
| Sleeping | While asleep | 1 sparkle | Zzz drift up (1 per ~60 ticks) | 48–70 |

- Max **1200 particles** active (ring buffer allocation)
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
