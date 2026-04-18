# Renderer Reference

Navigation: [Documentation Home](../README.md) > [Renderer](README.md) > [Current Document](README.md)
Return to [Documentation Home](../README.md).

The renderer layer (`src/renderer/`) handles all visual output using Pixi.js 7. It is strictly presentation — no game logic.

## Contents

| Document | Description |
|----------|-------------|
| [Overview & Camera](overview.md) | GameRenderer, camera, coordinate system, data flow, viewport culling |
| [Rendering Layers](layers.md) | TerrainLayer, PlantLayer, EntityLayer, AnimationLayer, emoji textures |
| [ItemLayer](item-layer.md) | Ground items (meat, fruit, seeds), dual-mode rendering, sprite pooling |
| [Sprite Authoring Guide](sprites.md) | Reusable workflow, helper catalog, grounding/anchor rules, quality checklist |

See [Architecture](../architecture.md) for how the renderer fits into the broader application flow.

---

## File Overview

| File | Purpose |
|------|---------|
| `GameRenderer.js` | Top-level renderer: initializes Pixi app, layers, camera, input |
| `Camera.js` | Viewport pan/zoom, coordinate conversion |
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

All layers live inside a single `PIXI.Container` (`worldContainer`) that is transformed by the camera.
