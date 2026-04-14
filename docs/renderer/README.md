# Renderer Reference

Navigation: [Documentation Home](../README.md) > [Renderer](README.md) > [Current Document](README.md)
Return to [Documentation Home](../README.md).

The renderer layer (`frontend/src/renderer/`) handles all visual output using Pixi.js 7. It is strictly presentation — no game logic.

## Contents

| Document | Description |
|----------|-------------|
| [Overview & Camera](overview.md) | GameRenderer, camera, coordinate system, data flow, viewport culling |
| [Rendering Layers](layers.md) | TerrainLayer, PlantLayer, EntityLayer, AnimationLayer, emoji textures |

See [Architecture](../architecture.md) for how the renderer fits into the broader application flow.

---

## File Overview

| File | Purpose |
|------|---------|
| `GameRenderer.js` | Top-level renderer: initializes Pixi app, layers, camera, input |
| `Camera.js` | Viewport pan/zoom, coordinate conversion |
| `TerrainLayer.js` | Renders terrain as a single pixel texture |
| `PlantLayer.js` | Renders plants as pixel overlay + emoji sprites |
| `EntityLayer.js` | Renders animals as emoji sprites |
| `AnimationLayer.js` | Particle effects: attack, birth, death, mating, eating |

---

## Layer Stack (Back to Front)

```
1. TerrainLayer    — terrain types as RGBA pixels (1 pixel = 1 tile)
2. PlantLayer      — plant pixel overlay (always visible)
3. PlantLayer      — plant emoji sprites (zoom ≥ 6 only)
4. EntityLayer     — animal emoji sprites
5. AnimationLayer  — particle effects (attack, birth, death, mating)
6. Night Overlay   — semi-transparent dark rectangle (0–35% alpha)
```

All layers live inside a single `PIXI.Container` (`worldContainer`) that is transformed by the camera.
