---
description: "Use when writing or modifying code in this ecosystem simulation project. Covers code style, architecture patterns, and tech stack conventions for React, Zustand, Pixi.js, and the simulation engine."
applyTo: "**"
---

# Ecogame Coding Instructions

EcoGame is a browser-based 2D ecosystem simulation with procedural terrain generation, plant lifecycle management, and autonomous animal AI with energy systems — running client-side in a Web Worker and rendered in real time with Pixi.js.

## Tech Stack

- **React 18** with JSX — no TypeScript
- **Zustand** for state management (single centralized store)
- **Pixi.js 7** for 2D WebGL rendering
- **Vite** as build tool
- **Bootstrap 5** for UI styling
- **Chart.js** for data visualization

## Code Style

- Use **default exports** for React components as function declarations: `export default function MyComponent() {}`
- Use **named exports** for constants, classes, and utility functions: `export class Foo {}`, `export const BAR = 1`
- Use **arrow functions** for event handlers and inline callbacks
- Use **function declarations** for components and top-level class methods
- Keep JSDoc module-level documentation where present; do not add JSDoc to every function

## Architecture

- **Engine layer** (`src/engine/`): class-based (`SimulationEngine`, `World`, `Animal`), designed to run in a Web Worker. Do not import React or DOM APIs here.
- **Renderer layer** (`src/renderer/`): Pixi.js rendering with separate layers (Terrain, Entity, Plant). Do not put game logic here.
- **Store** (`src/store/simulationStore.js`): single Zustand `create()` store. Update state via `set()` with immutable patterns. Do not create additional stores.
- **Hooks** (`src/hooks/`): custom hooks bridge the store and engine to components.
- **Components** (`src/components/`): React UI components using Bootstrap. Keep rendering logic in the renderer layer, not in components.
- **Config** (`src/engine/config.js`): centralized `DEFAULT_CONFIG` export for simulation parameters.

## Patterns

- Zustand updates: `set(state => ({ ...state, key: newValue }))` — always immutable
- Event-driven canvas interaction via callbacks (`onViewportChange`, `onTileClick`)
- Web Worker communication for simulation ticking — keep engine code serializable
