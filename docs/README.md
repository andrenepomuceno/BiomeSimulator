# EcoGame Documentation

Navigation: [Documentation Home](README.md) | [Architecture](architecture.md) | [Engine](engine/) | [Simulation](simulation/) | [Renderer](renderer/) | [API](api/)
Return to [Documentation Home](README.md).

Technical documentation for the EcoGame ecosystem simulation. For the project overview and quick start, see [../README.md](../README.md).

---

## Sections

| Section | Description |
|---------|-------------|
| [Architecture](architecture.md) | High-level system design, layer boundaries, data flow, component tree, design decisions |
| [Engine](engine/) | Config, species registries, world model, simulation engine, pathfinding, spatial hash |
| [Simulation Rules](simulation/) | Animal AI, movement, energy, interactions, plant lifecycle |
| [Renderer](renderer/) | Pixi.js layer stack, camera, entity/plant/terrain rendering, emoji textures |
| [Worker API](api/) | Main↔Worker message protocol: commands, responses, data types |

For setup, build commands, and performance profiling, see [../frontend/README.md](../frontend/README.md).

---

## Documentation Layout

- Folder `README.md` files stay short and act as navigation hubs.
- Prefer expanding an existing topic page before creating a new standalone article under roughly 100 lines.

---

## Navigation by Task

**Understanding the system:**
1. Start with [Architecture](architecture.md) for the big picture
2. Dive into [Engine](engine/) for module structure and species data

**Working on animal behavior:**
1. [Animal AI Decision Tree](simulation/ai.md)
2. [Movement System](simulation/movement.md)
3. [Energy & Needs](simulation/energy.md)
4. [Animal Interactions](simulation/animal-interactions.md) for HP, combat, and mating rules
5. [Species config](engine/animal-species.md) for threshold tuning

**Working on plant systems:**
1. [Plant Lifecycle](simulation/plants.md)
2. [Plant Species Registry](engine/plant-species.md)

**Working on rendering:**
1. [Renderer Overview & Camera](renderer/overview.md)
2. [Rendering Layers](renderer/layers.md)

**Extending the Worker API:**
1. [Commands reference](api/commands.md)
2. [Messages & data types](api/messages.md)
