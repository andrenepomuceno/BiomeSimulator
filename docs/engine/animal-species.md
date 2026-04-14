# Animal Species Registry

Navigation: [Documentation Home](../README.md) > [Engine](README.md) > [Current Document](animal-species.md)
Return to [Documentation Home](../README.md).

`animalSpecies.js` is the **single source of truth** for all animal data. `config.js` derives its fauna configuration from here via `buildAnimalSpeciesConfig()` and `buildInitialAnimalCounts()`.

---

## Species Table

Speed values are **sub-cell steps per tick**. With `SUB_CELL_DIVISOR = 4`, a speed of 4 means 1 tile/tick, speed 8 = 2 tiles/tick, etc.

| Species | Diet | Speed | Tiles/tick | Vision | Max Energy | Max HP | Max Age | Attack | Defense | Max Pop | Initial Count |
|---------|------|-------|------------|--------|-----------|--------|---------|--------|---------|---------|---------------|
| 🐰 Rabbit | Herbivore | 4 | 1 | 10 | 100 | 50 | 1400 | 1 | 2 | 500 | 100 |
| 🐿️ Squirrel | Herbivore | 4 | 1 | 11 | 90 | 40 | 1300 | 1 | 1 | 500 | 60 |
| 🪲 Beetle | Herbivore | 4 | 1 | 7 | 70 | 20 | 1000 | 1 | 4 | 800 | 80 |
| 🐐 Goat | Herbivore | 4 | 1 | 12 | 150 | 80 | 2200 | 3 | 5 | 300 | 35 |
| 🦌 Deer | Herbivore | 8 | 2 | 14 | 140 | 70 | 2000 | 2 | 3 | 300 | 35 |
| 🦟 Mosquito | Herbivore | 8 | 2 | 8 | 40 | 10 | 600 | 1 | 0 | 800 | 60 |
| 🐛 Caterpillar | Herbivore | 4 | 1 | 5 | 50 | 15 | 800 | 0 | 1 | 800 | 70 |
| 🦗 Cricket | Herbivore | 8 | 2 | 6 | 45 | 15 | 700 | 0 | 0 | 800 | 90 |
| 🦊 Fox | Carnivore | 8 | 2 | 14 | 130 | 60 | 1600 | 6 | 4 | 150 | 28 |
| 🐺 Wolf | Carnivore | 8 | 2 | 16 | 160 | 120 | 1800 | 9 | 6 | 80 | 20 |
| 🐍 Snake | Carnivore | 4 | 1 | 12 | 120 | 40 | 1600 | 5 | 3 | 150 | 20 |
| 🦅 Hawk | Carnivore | 12 | 3 | 20 | 110 | 45 | 1800 | 7 | 3 | 150 | 15 |
| 🐊 Crocodile | Carnivore | 4 | 1 | 12 | 180 | 180 | 2400 | 9 | 8 | 80 | 10 |
| 🐗 Boar | Omnivore | 4 | 1 | 12 | 150 | 100 | 1800 | 5 | 5 | 300 | 30 |
| 🐻 Bear | Omnivore | 4 | 1 | 14 | 200 | 200 | 2500 | 10 | 8 | 80 | 12 |
| 🦝 Raccoon | Omnivore | 4 | 1 | 11 | 100 | 50 | 1400 | 3 | 3 | 300 | 25 |
| 🐦‍⬛ Crow | Omnivore | 8 | 2 | 16 | 80 | 30 | 1200 | 2 | 1 | 300 | 35 |
| 🦎 Lizard | Omnivore | 4 | 1 | 11 | 85 | 45 | 1300 | 3 | 2 | 300 | 35 |

---

## Species Data Fields

```javascript
{
  id: 'RABBIT',           // unique key
  name: 'Rabbit',         // display name
  emoji: '🐰',            // renderer display
  diet: 'HERBIVORE',      // HERBIVORE | CARNIVORE | OMNIVORE
  reproduction: 'SEXUAL', // SEXUAL | ASEXUAL | HERMAPHRODITE
  color: 0x66cc66,        // hex color for renderer
  speed: 4,               // sub-cell steps per tick (4 steps = 1 tile)
  vision_range: 10,       // perception radius in tiles
  max_energy: 100,        // energy cap
  max_hp: 50,             // health points cap
  max_hunger: 100,        // hunger cap
  max_thirst: 100,        // thirst cap
  max_age: 1400,          // ticks until death from old age
  max_population: 500,    // population cap per species (varies by tier)
  mature_age: 80,         // ticks before eligible to mate
  life_stage_ages: [30, 60, 80], // [baby→young, young→young_adult, young_adult→adult]
  decision_interval: 2,   // ticks between AI decisions
  attack_power: 1,        // damage dealt in combat
  defense: 2,             // reduces incoming damage
  walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'FERTILE_SOIL', 'MUD'],
  edible_plants: ['GRASS', 'STRAWBERRY', 'CARROT'],
  prey_species: [],       // species IDs this animal can hunt
  can_scavenge: false,    // whether the animal can eat decomposing bodies
  energy_costs: {
    IDLE: 0.02, WALK: 0.1, RUN: 0.35,
    EAT: 0.05, DRINK: 0.05, SLEEP: -4.0,
    ATTACK: 0.8, MATE: 1.5, FLEE: 0.35,
  },
  hunger_rate: 0.12,      // hunger increase per tick
  thirst_rate: 0.14,      // thirst increase per tick
  initial_count: 100,     // default spawn count
}
```

---

## Exports

| Export | Type | Description |
|--------|------|-------------|
| `default` (ANIMAL_SPECIES) | Object | Full registry keyed by species ID |
| `ALL_ANIMAL_IDS` | Array | All 18 species keys |
| `HERBIVORE_IDS` | Array | 8 herbivore species keys |
| `CARNIVORE_IDS` | Array | 5 carnivore species keys |
| `OMNIVORE_IDS` | Array | 5 omnivore species keys |
| `BASE_POP_TOTAL` | Number | Sum of all species' `max_population` (5690) |
| `buildAnimalSpeciesConfig()` | Function | Returns sim-only params (strips display fields) |
| `buildInitialAnimalCounts()` | Function | Returns `{RABBIT: 100, ...}` from registry |
| `buildDecisionIntervals()` | Function | Returns `{RABBIT: 3, ...}` from registry |
