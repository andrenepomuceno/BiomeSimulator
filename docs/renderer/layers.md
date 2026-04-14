# Rendering Layers

Navigation: [Documentation Home](../README.md) > [Renderer](README.md) > [Current Document](layers.md)
Return to [Documentation Home](../README.md).

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

### Emoji Overlay (Zoom ≥ 6 Only)

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

### Sprite Positioning

Animal sprites are placed at `(animal.x, animal.y)` in world-space. Since animal positions are sub-tile floats already centered on tiles, no additional offset is applied. HP bars are positioned relative to the animal's float coordinates.

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
- Removed when entity is no longer in viewport data
