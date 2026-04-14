---
description: "Use when writing or modifying code or technical docs in this ecosystem simulation project. Covers React component structure, Zustand patterns, Pixi.js renderer boundaries, and Web Worker-safe engine conventions."
applyTo: "**"
---

# Ecogame Project Instructions

Ecogame is a browser-based 2D ecosystem simulation. Most implementation work lives in the frontend, where React UI, a Pixi.js renderer, and a simulation engine run client-side with Web Workers. When editing docs, keep terminology and boundaries aligned with that architecture.

## Tech Stack

- React 18 with JSX; do not introduce TypeScript files.
- Zustand for a single centralized simulation store.
- Pixi.js 7 for rendering.
- Vite for the frontend toolchain.
- Bootstrap 5 for UI components and layout.
- Chart.js for reporting and charts.

## Code Style

- Export React components as default-exported function declarations: `export default function Toolbar() {}`.
- Use named exports for classes, constants, helpers, and builder functions.
- Use arrow functions for event handlers and short callbacks.
- Keep module-level JSDoc blocks where present, but do not add per-function JSDoc unless a module already uses it heavily.
- Match the existing file's naming and structure before introducing new abstractions.

## Architecture

- `frontend/src/engine/`: simulation logic only. Keep it class-based and free of React, DOM, and browser rendering APIs so it remains worker-safe.
- `frontend/src/renderer/`: Pixi.js rendering only. Keep simulation rules and state mutations out of renderer classes.
- `frontend/src/store/simulationStore.js`: the single Zustand store. Extend this store instead of creating new stores.
- `frontend/src/hooks/`: bridge React, the store, and worker or renderer lifecycle code.
- `frontend/src/components/`: Bootstrap-based UI components. Keep canvas and simulation logic out of components.
- `frontend/src/worker/`: worker entry points and message plumbing. Keep payloads serializable.

## Patterns

- Use immutable Zustand updates: `set(state => ({ ...state, key: value }))`.
- In React components and hooks, read store state through the Zustand hook. Outside React render flow, use imperative access like `useSimStore.getState()`.
- Keep species and config modules data-driven. Prefer named constants plus builder functions that derive lookup tables from canonical definitions instead of duplicating hard-coded maps.
- Keep engine configuration centralized in `frontend/src/engine/config.js` and related constants modules.
- Use event-driven callbacks for camera, viewport, tile editing, and other canvas interactions.
- Preserve the worker boundary: engine and worker code should exchange plain serializable data, not class instances tied to DOM or Pixi objects.

## Workflow

- After a large or important modification, end the response with a concise suggested commit message that summarizes the change.
- Update documentation whenever the change affects behavior, architecture, configuration, controls, worker messages, or other user-facing or developer-facing workflows.
