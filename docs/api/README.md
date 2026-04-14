# Worker API Reference

Navigation: [Documentation Home](../README.md) > [API](README.md) > [Current Document](README.md)
Return to [Documentation Home](../README.md).

Message protocol between the main thread (React UI) and the simulation Web Worker.

**Communication:** `postMessage` / `onmessage` via the standard Web Worker API.

## Contents

| Document | Description |
|----------|-------------|
| [Commands](commands.md) | Main → Worker messages (generate, start, pause, editTerrain, etc.) |
| [Messages](messages.md) | Worker → Main messages and shared data types |
| [Fauna Sub-Worker](fauna-worker.md) | Internal protocol for parallel fauna processing |

For a high-level overview of how the worker fits into the application, see [Architecture](../architecture.md).
