# Three.js Renderer Guide

Navigation: [Documentation Home](../README.md) > [Renderer](README.md) > [Current Document](threejs.md)
Return to [Documentation Home](../README.md).

This document covers the Three backend in `src/renderer/three/`.

---

## Overview

`ThreeRenderer` is the Three.js runtime backend used by `rendererFactory.js` when mode is `three`.
It keeps rendering concerns separate from simulation logic and consumes store/worker snapshots similarly to the Pixi backend.

Core responsibilities:

- Build and render terrain as a `THREE.DataTexture` on a plane mesh.
- Manage zoom-dependent visibility for plants, items, and entities (points, sprite fallback, and GLB models).
- Handle camera pan/zoom/rotation with an orthographic gameplay mode and optional perspective orbit mode.
- Render particles for simulation events.
- Render day/night tint through a screen-space overlay scene.

Main entry point:

- `src/renderer/three/ThreeRenderer.js`

---

## Scene Architecture

```text
THREE.Scene
  ├── lights (AmbientLight + DirectionalLight)
  ├── cameraGroup
  │    └── worldGroup
  │         ├── terrain mesh (DataTexture on PlaneGeometry)
  │         ├── ThreePlantLayer outputs (points/sprites/models)
  │         ├── ThreeItemLayer outputs (points/sprites/models)
  │         ├── ThreeEntityLayer outputs (points/sprites/models)
  │         ├── particle system (ThreeParticleSystem)
  │         └── selection marker (LineLoop)
  └── overlay scene (night tint full-screen quad)
```

The renderer uses two cameras:

- `camera3D` (`THREE.OrthographicCamera`) for standard gameplay view.
- `_orbitCamera3D` (`THREE.PerspectiveCamera`) when orbit mode is enabled.

The active camera is tracked by `_activeCamera3D`.

---

## Camera And Input

### View Camera (`ViewCamera`)

File: `src/renderer/three/ViewCamera.js`

`ViewCamera` manages tile-world navigation for the orthographic mode:

- `zoom` range: `MIN_ZOOM`..`MAX_ZOOM` (`0.25..200`).
- Pan via screen-space deltas converted to world-space movement.
- Zoom around mouse cursor (`onWheel`) while preserving pointer focus in world coordinates.
- Optional Z-rotation support for non-orbit mode.
- Viewport world bounds and tile bounds helpers.

### Input Handler (`ThreeInputHandler`)

File: `src/renderer/three/inputHandler.js`

Responsibilities:

- Pointer down/move/up for panning and tile selection.
- Brush behavior for `PLACE_ENTITY` (tile-by-tile paint on movement).
- Wheel zoom forwarding to `ViewCamera` when not in orbit mode.
- Orbit-aware context-menu suppression.
- Resize observer hookup.

### Orbit Mode

Files: `src/renderer/three/rendererOrbit.js`, `src/renderer/three/ThreeRenderer.js`

- Uses `OrbitControls` with tuned damping, speed, and polar-angle constraints.
- Enforced camera floor via `clampCameraAboveGround`.
- On enable, renderer syncs orbit target and distance from current tile viewport using `buildOrbitCameraPreset`.
- Tile picking in orbit mode uses ray-plane intersection and `worldGroup.worldToLocal(...)`.

---

## Rendering Layers (Three)

Three backend composes each domain with dedicated helpers that choose the right visual representation per zoom and asset readiness.

### Terrain

- `setTerrain(terrainData, width, height)` builds a `Uint8Array` RGBA buffer and uploads as `THREE.DataTexture`.
- Filtering is nearest-neighbor (`NearestFilter`) for tile clarity.
- `updateTerrainTiles(changes)` edits pixel bytes in place and toggles `needsUpdate`.

### Plants (`ThreePlantLayer`)

File: `src/renderer/three/plantLayer.js`

- Maintains `plantType`/`plantStage` arrays with full snapshot + incremental change updates.
- Zoomed-out: `ThreePointLayer` colored dots (`MAX_VISIBLE_PLANT_POINTS`).
- Zoomed-in or orbit: sprite/model path with cap `MAX_VISIBLE_PLANT_SPRITES`.
- Model path:
  - Uses `PLANT_MODEL_URLS` and `TREE_MODEL_URLS`.
  - Dead tree stage (`stage > 5`) uses `DEAD_TREE_MODEL_URL` stump for tree species.
  - Applies per-stage and per-species scale multipliers.
- Sprite fallback remains active when model is loading/missing.

### Items (`ThreeItemLayer`)

File: `src/renderer/three/itemLayer.js`

- Maintains `_itemsById` via incremental `applyChanges` and full `setAll`.
- Zoomed-out: colored points (`ITEM_COLORS`) with cap `MAX_VISIBLE_ITEM_POINTS`.
- Zoomed-in or orbit: model-first rendering with sprite fallback and cap `MAX_VISIBLE_ITEM_SPRITES`.
- Model path uses `ITEM_MODEL_URLS` plus `ITEM_MODEL_SCALE_MULTIPLIERS`.
- Sprite fallback uses `ITEM_EMOJIS` through `ThreeSpritePool`.

### Entities (`ThreeEntityLayer`)

File: `src/renderer/three/entityLayer.js`

- Maintains current animals array and transition state cache.
- Zoomed-out: species-colored points (`MAX_VISIBLE_ENTITY_POINTS`).
- Zoomed-in or orbit: sprite/model rendering with species/life-stage scaling.
- Model path:
  - Uses `ENTITY_MODEL_URLS` and `ENTITY_MODEL_SCALE_MULTIPLIERS`.
  - Direction is mapped to Z-yaw (`Direction -> DIRECTION_YAW`).
  - Falls back to emoji sprites when model is unavailable.
- State transitions emit particle/effect events (`attack`, `death`, `mate`, `eat`, `drink`, `flee`, `sleep`) with flee dedup by 8x8 bucket.

---

## Shared Helpers

### Emoji Atlas

File: `src/renderer/three/emojiAtlas.js`

- Central `emoji -> CanvasTexture` cache shared by plant/item/entity layers.
- Prevents duplicate canvas and texture creation across layers.

### Sprite Pool

File: `src/renderer/three/spritePool.js`

- Reuses `THREE.Sprite` instances by logical key.
- Supports acquire/release/prune/releaseAll for low-GC refresh cycles.

### Model Asset Loader and Pool

Files: `src/renderer/three/modelAssetLoader.js`, `src/renderer/three/modelPool.js`

- `GLTFLoader` cache with pending tracking.
- `ensureLoaded` is non-blocking; render path keeps fallback visuals until model is ready.
- Mesh normalization and orientation correction are applied in layer-level normalization hooks.

### Particles

File: `src/renderer/three/particleSystem.js`

- Uses shared particle config from `rendererConfig.js` (`PARTICLE_DEFS`, `MAX_PARTICLES`).
- Ticked every animation frame from `ThreeRenderer._animate`.

---

## Visibility Refresh Strategy

`ThreeRenderer` batches visual refresh with `_scheduleVisibilityRefresh()`:

1. Coalesces repeated triggers into a single `requestAnimationFrame` pass.
2. Computes viewport bounds (`_getViewportBounds`).
3. Rebuilds points and sprites/models for plant, item, and entity layers.
4. Refreshes selection marker.

This keeps updates responsive while avoiding immediate full rebuild on every event.

---

## Public API (ThreeRenderer)

Key methods exposed to app/hook integration:

- `setTerrain(terrainData, width, height)`
- `updateTerrainTiles(changes)`
- `setPlantSnapshot(plantType, plantStage, width, height)`
- `updatePlants(plantChanges)`
- `setItems(items)`
- `updateItems(itemChanges)`
- `updateEntities(animals, nativeRenderer, tick, zoom)`
- `updateDayNight(clock)`
- `setSelectedEntity(id)` / `setSelectedTile(x, y)` / `clearSelection()`
- `setOrbitControlsEnabled(enabled)` / `toggleOrbitControls()` / `isOrbitControlsEnabled()`
- `prepareAssets(onStep)`
- `getViewportTiles()`
- `centerOn(x, y)` / `setZoom(z)`
- `captureViewport()`
- `getNativeRenderer()`
- `destroy()`

Compatibility shims:

- `terrainLayer.updateTiles(...)` delegates to `updateTerrainTiles(...)`.
- `plantLayer.setFromArrays(...)` delegates to `setPlantSnapshot(...)`.

---

## Runtime Selection And Fallback

- Backend creation is centralized in `src/renderer/rendererFactory.js`.
- App-level runtime can switch between `pixi` and `three` modes.
- If Three initialization fails, app logic can fall back to Pixi while keeping simulation state intact.

For Pixi details, see [Pixi Renderer Index](pixi.md).
