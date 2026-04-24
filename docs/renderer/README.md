# Renderer Reference

Navigation: [Documentation Home](../README.md) > [Renderer](README.md) > [Current Document](README.md)
Return to [Documentation Home](../README.md).

The renderer layer (`src/renderer/`) handles all visual output and supports two runtime backends:

- `pixi` via `GameRenderer` (Pixi.js 7)
- `three` via `ThreeRenderer` (Three.js)

Both implementations are presentation-only and keep simulation rules outside the renderer.

## Documentation Sets

### Pixi.js

| Document | Description |
|----------|-------------|
| [Pixi Renderer Index](pixi.md) | Pixi entry point and how docs are organized |
| [Overview & Camera (Pixi)](overview.md) | GameRenderer, camera, coordinate system, data flow, viewport culling |
| [Rendering Layers (Pixi)](layers.md) | TerrainLayer, PlantLayer, EntityLayer, AnimationLayer, atlas sprites |
| [ItemLayer (Pixi)](item-layer.md) | Ground items (meat, fruit, seeds), dual-mode rendering, sprite pooling |
| [Sprite Authoring Guide](sprites.md) | Reusable workflow for procedural atlas sprites |

### Three.js

| Document | Description |
|----------|-------------|
| [Three.js Renderer Guide](threejs.md) | ThreeRenderer API, camera/orbit modes, rendering layers, GLB pipeline |

See [Architecture](../architecture.md) for how the renderer fits into the broader application flow.

---

## File Overview

| File | Purpose |
|------|---------|
| `rendererFactory.js` | Runtime backend factory (`pixi` ↔ `three`) |
| `GameRenderer.js` | Top-level renderer: initializes Pixi app, layers, camera, input |
| `ThreeRenderer.js` | Three.js renderer with terrain texture, zoom-gated points/sprites/models, orbit controls, particles, and day/night overlay |
| `Camera.js` | Viewport pan/zoom, coordinate conversion |
| `ViewCamera.js` | Three view camera (pan/zoom/rotation and world bounds) |
| `TerrainLayer.js` | Renders terrain as a single pixel texture |
| `PlantLayer.js` | Renders plants as pixel overlay + emoji sprites |
| `ItemLayer.js` | Renders ground items (meat, fruit, seeds) as pixel overlay + emoji sprites |
| `EntityLayer.js` | Renders animals as emoji sprites |
| `AnimationLayer.js` | Particle effects: attack, birth, death, mating, eating |

---

## Layer Stack (Back to Front)

```
1. TerrainLayer    — terrain types as RGBA pixels (1 pixel = 1 tile)
2. PlantLayer      — plant pixel overlay (always visible)
3. ItemLayer       — item pixel overlay (meat, fruit, seeds; always visible)
4. PlantLayer      — plant emoji sprites (zoom ≥ 6 only)
5. ItemLayer       — item emoji sprites (zoom ≥ 6 only)
6. EntityLayer     — animal emoji sprites
7. AnimationLayer  — particle effects (attack, birth, death, mating)
8. Night Overlay   — semi-transparent dark rectangle (0–35% alpha)
```

The Pixi backend uses a single `PIXI.Container` (`worldContainer`) transformed by camera state.
The Three backend uses `worldGroup`, separate point/sprite/model pools, and a screen-space overlay scene for day/night tint.

## Runtime Switch And Fallback

- Renderer mode is stored in Zustand (`rendererMode`) and can be toggled in the toolbar.
- On mode switch, the inactive renderer is destroyed and the active renderer is rehydrated from store snapshots.
- If Three initialization fails at runtime, `App` falls back automatically to Pixi and pushes a warning UI toast.
