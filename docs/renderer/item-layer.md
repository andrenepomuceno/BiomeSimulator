# ItemLayer

Navigation: [Documentation Home](../README.md) > [Renderer](README.md) > [Current Document](item-layer.md)
Return to [Documentation Home](../README.md).

---

## Overview

`ItemLayer` renders ground items (meat, fruit, seeds) dropped by animals or plants. It uses dual-mode rendering for performance across all zoom levels:

- **Low zoom (< 6):** Items appear as small colored pixel dots (1×1 tile).
- **High zoom (≥ 6):** Items appear as emoji sprites from the sprite atlas.

The layer follows the same incremental update pattern as `PlantLayer` and `EntityLayer`, using a sprite pool for efficient recycling.

---

## Container Structure

```
worldContainer
  ├── pixelContainer (ItemLayer)
  │   └── pixelGfx (Graphics) — low-zoom colored dots
  └── _depthContainer (shared)
      └── item sprites (Sprite pool) — high-zoom emoji renderings
```

- **Pixel overlay** (`pixelContainer`): Always rendered, contains colored pixel dots for low-zoom visibility.
- **Sprite pool** (shared `_depthContainer`): Pooled sprites reused for high-zoom emoji rendering.

---

## Item Types & Display

| Type ID | Name | Emoji | Pixel Color |
|---------|------|-------|-------------|
| 1 | Meat | 🥩 | `0xcc4444` (red) |
| 2 | Fruit | 🍑 | `0xffaa33` (orange) |
| 3 | Seed | 🌰 | `0xaa8833` (brown) |

### Meat Variants

Meat texture selection depends on the source animal's mass category:

| Category | Texture Key |
|----------|-------------|
| Small | `MEAT_SMALL_0` |
| Medium | `MEAT_MEDIUM_0` |
| Large | `MEAT_LARGE_0` |

See `buildMassDropMap()` in `src/engine/animalSpecies.js` for mass-to-category mapping.

### Fruit & Seed Variants

- **Fruits** use textures from `buildFruitKeysBySource()` (default: `FRUIT_STRAWBERRY_0`)
- **Seeds** use textures from `buildSeedKeysBySource()` (default: `SEED_STRAWBERRY_0`)

Both are keyed by source plant species ID, loaded from the plant species definitions.

---

## Rendering Modes

### Pixel Overlay (Always Active)

Drawn as 1×1 colored rectangles in a `PIXI.Graphics` object:

- Position: `(item.x + 0.25, item.y + 0.25)` — centered within tile
- Size: `0.5 × 0.5` tile units
- Color: Per-item type (see table above)
- Alpha: **0.85**
- Z-index: `-500000` (below animals, above terrain)

Redrawn **every frame** items change (add, remove, update). Small viewport sizes keep redraw cost low.

### Emoji Sprites (Zoom ≥ 6)

Rendered via a sprite pool in the shared `_depthContainer`:

- **Sprite anchor:** `(0.5, 0.5)` — center alignment
- **Scale:** `(1.0 / FRAME_SIZE) × 0.85` — slightly smaller than animal sprites for visual distinction
- **Z-index:** `Math.round((item.y + 0.5) * 1000)` — Y-sorted depth
- **Visibility:** Toggled by `updateZoom(zoom)`

---

## Public API

### Constructor

```javascript
constructor(depthContainer)
```

- **`depthContainer`** (`PIXI.Container`): The shared Y-sorted container for depth rendering.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `pixelContainer` | `PIXI.Container` | The pixel overlay container (added to worldContainer) |

### Methods

| Method | Description |
|--------|-------------|
| `updateItems(changes)` | Apply incremental item deltas (add/remove/update) |
| `setItems(items)` | Full sync — replace all item sprites |
| `updateZoom(zoom)` | Toggle sprite vs. pixel rendering based on zoom level |
| `destroy()` | Cleanup and recycle all sprites |

#### updateItems(changes)

Processes an array of item change objects:

```javascript
{
  op: 'add'|'remove'|'update',
  item: {id, x, y, type, source, consumed}
}
```

- **`'add'`**: Creates a new sprite (or reuses from pool) and updates pixel overlay.
- **`'remove'`**: Recycles the sprite and removes from pixel tracking.
- **`'update'`**: Occurs when item type changes (e.g., fruit → seed). Removes old sprite and re-adds if not consumed.

Pixel overlay is redrawn **after all changes** are applied.

#### setItems(items)

Full replacement of all items:
1. Recycles all existing sprites
2. Clears pixel buffer
3. Adds each item from the provided array (skips consumed items)
4. Redraws pixel overlay

#### updateZoom(zoom)

Toggles rendering mode:
- If `zoom < 6`: Shows pixel overlay, hides all sprites.
- If `zoom >= 6`: Shows sprites, hides pixel overlay.

Called on each camera zoom change to maintain visual clarity across zoom ranges.

#### destroy()

Cleans up all resources:
- Recycles all pooled sprites
- Destroys pixel graphics and containers
- Clears item tracking maps

---

## Internal Helpers

### Sprite Pool

- **`_pool`** (Array): Recycled sprite instances
- **`_sprites`** (Map): Active sprites by item ID

Recycling reduces allocation overhead; sprites are mutated (texture, position) rather than recreated.

### Pixel Tracking

- **`_items`** (Map): Tracks `{id → {x, y, type}}` for pixel overlay redraw
- **`_pixelGfx`** (PIXI.Graphics): Low-level drawing surface

### Texture Lazy-Loading

- **`_itemTextures`** (Object): Cached emoji textures from `generateItemEmojiTextures()`, loaded on first item addition

---

## Integration with Other Layers

### Coordinate System

Items use the same **sub-tile float coordinates** as animals:
- Item position: `(item.x, item.y)` — already centered at `tile + 0.5`
- Pixel overlay draws at `(x + 0.25, y + 0.25)` — adds half-tile offset to tile-center positioning

### Depth Sorting

Item sprites share `_depthContainer` with animal sprites. Z-index is calculated as `Math.round((item.y + 0.5) * 1000)`, which allows Y-sorted rendering where items behind/in-front of animals appear naturally.

### Data Flow

```
Simulation Engine
    ↓
itemChanges (worker message)
    ↓
Zustand Store (simulationStore.js)
    ↓
useSimulation Hook
    ↓
App.jsx useEffect
    ↓
itemLayer.updateItems(changes)
    ↓
Sprite pool + Pixel overlay updated
```

---

## Performance Considerations

### Sprite Pooling

Recycling avoids garbage collection pauses. The pool grows as needed but is never cleared, so long simulation runs eventually stabilize pool size.

### Pixel Overlay Redraw

Redrawing is $O(n)$ where $n$ is the number of active items. For typical scenarios (< 10K items per viewport), this is negligible.

### Zoom Threshold

The `ITEM_SPRITE_ZOOM = 6` threshold balances readability and GPU memory:
- Below zoom 6: Pixels are fast and clearly readable at small scale.
- Above zoom 6: Emojis provide detail for inspection and placement.

### High-Scale Scenarios

At 1000×1000 terrain with thousands of items, keep in mind:
- Pixel overlay is always drawn (use for low-zoom performance baseline).
- Sprite pool scales linearly with active items in viewport.
- Y-sorting overhead is proportional to sprite count in `_depthContainer`.

---

## See Also

- [PlantLayer](layers.md#plantlayer) — Similar dual-mode rendering pattern
- [EntityLayer](layers.md#entitylayer) — Shares `_depthContainer` for Y-sorted rendering
- [Container Hierarchy](layers.md#container-hierarchy-back--front) — Full layer stack overview
