# BiomeSimulator

BiomeSimulator is a browser-based 2D ecosystem simulation. A procedural world is generated with terrain, rivers, biomes, and seasonal climate, then populated with autonomous plants and animals — each with its own diet, life cycle, and needs.

The goal is to watch the ecosystem self-regulate: populations rise and collapse, species compete for resources, and climate shapes plant growth across the seasons.

![Stack](https://img.shields.io/badge/JavaScript-ES2022-f7df1e?logo=javascript)
![Stack](https://img.shields.io/badge/React-18-61dafb?logo=react)
![Stack](https://img.shields.io/badge/PixiJS-7-e91e63?logo=webgl)

---

## What's in the simulation

**Procedurally generated world**
FBM noise terrain with rivers, beaches, mountains, wetlands, and fertile soil. Land/water ratio is configurable.

**Seasonal climate**
Four seasons with a deterministic temperature model (seasonal base + daily sinusoidal cycle). Heat and cold affect plant growth and mortality.

**16 plant species**
Each with life stages (seed → sprout → adult → fruit), terrain preferences, and water affinity. Seeds drop to the ground and germinate independently.

**18 animal species**
Herbivores, carnivores, and omnivores with autonomous AI: they seek food and water, flee predators, sleep, mate, and die of old age. Bolder species fight back when attacked; injured animals move slower.

**Ground items**
Meat, fruit, and seeds persist in the world after deaths and plant production. Animals consume them; seeds can germinate where they land.

**Day/night cycle**
Diurnal and nocturnal species take vision and energy penalties when active outside their preferred period.

**Interactive editor**
Paint terrain and place animals or plants by hand, with full undo/redo support.

**Statistics panel**
Population charts per species (including total), climate readout, event logs, and report export.

---

## Getting started

```bash
npm install
npm run dev
```

Opens at **http://localhost:3000**.

---

## Technical documentation

Architecture, engine internals, worker message API, and species references are in [`docs/`](docs/README.md).

---

## Key scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build (`dist/`) |
| `npm run test:run` | Run engine regression suite |
| `npm run test:perf:small` | Small performance gate |
| `npm run test:perf:medium` | Medium performance gate |
| `npm run profile:headless` | Headless benchmarks with JSON report |

---

## License

MIT. See the `LICENSE` file.
