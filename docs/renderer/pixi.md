# Pixi Renderer Index

Navigation: [Documentation Home](../README.md) > [Renderer](README.md) > [Current Document](pixi.md)
Return to [Documentation Home](../README.md).

This section covers the Pixi backend implementation in `src/renderer/pixi/`.

## Documents

| Document | Scope |
|----------|-------|
| [Overview & Camera (Pixi)](overview.md) | `GameRenderer` lifecycle, camera, input, and data flow |
| [Rendering Layers (Pixi)](layers.md) | Terrain, plants, items, entities, animation layers and depth sorting |
| [ItemLayer (Pixi)](item-layer.md) | Dual-mode item rendering and sprite pooling |
| [Sprite Authoring Guide](sprites.md) | Sprite template and atlas authoring workflow |

## Runtime Summary

- Entry point: `src/renderer/pixi/GameRenderer.js`
- Camera: `src/renderer/pixi/Camera.js`
- Layer composition: pixel overlays + atlas sprites + particle layer
- Rendering style: heavily optimized 2D tile rendering with incremental updates and pooled sprites

## Backend Selection

Renderer mode is selected via `src/renderer/rendererFactory.js` using mode `pixi` or `three`.

See [Three.js Renderer Guide](threejs.md) for the 3D backend.
