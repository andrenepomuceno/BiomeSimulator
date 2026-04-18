# Animal Species Registry

Navigation: [Documentation Home](../README.md) > [Engine](README.md) > [Current Document](animal-species.md)
Return to [Documentation Home](../README.md).

`animalSpecies.js` is the **single source of truth** for all animal data. Time values in the registry are now authored in **game minutes**. `config.js` derives tick-based fauna configuration from here via `buildAnimalSpeciesConfig()` and `buildInitialAnimalCounts()`.

---

## Species Table

Speed values are **sub-cell steps per tick**. With `SUB_CELL_DIVISOR = 4`, a speed of 4 means 1 tile/tick, speed 8 = 2 tiles/tick, etc.

The table below shows the **effective default tick values** produced when `ticks_per_day = 500`. The source registry itself stores those timing fields in game-time units (game minutes), and `buildAnimalSpeciesConfig()` converts them to ticks at build time.

Population caps reflect the trophic structure of the ecosystem — insects are the most numerous, apex predators the fewest. When a global `max_animal_population` budget is active, each species' effective cap is scaled proportionally from its base cap.

| Species | Diet | Flags | Speed | Tiles/tick | Vision | Max Energy | Max HP | Max Age (ticks) | Attack | Defense | Max Pop | Initial Count |
|---------|------|-------|-------|------------|--------|-----------|--------|-----------------|--------|---------|---------|---------------|
| 🐰 Rabbit | Herbivore | | 4 | 1 | 10 | 100 | 50 | 1400 | 1 | 2 | 350 | 100 |
| 🐿️ Squirrel | Herbivore | | 4 | 1 | 11 | 90 | 40 | 1300 | 1 | 1 | 350 | 60 |
| 🪲 Beetle | Herbivore | | 4 | 1 | 7 | 70 | 20 | 1000 | 1 | 4 | 400 | 100 |
| 🐐 Goat | Herbivore | | 4 | 1 | 12 | 150 | 80 | 2200 | 3 | 5 | 200 | 35 |
| 🦌 Deer | Herbivore | | 8 | 2 | 14 | 140 | 70 | 2000 | 2 | 3 | 200 | 50 |
| 🦟 Mosquito | Herbivore | fly | 8 | 2 | 8 | 40 | 10 | 600 | 1 | 0 | 400 | 120 |
| 🐛 Caterpillar | Herbivore | | 4 | 1 | 5 | 50 | 15 | 800 | 0 | 1 | 400 | 120 |
| 🦗 Cricket | Herbivore | | 8 | 2 | 6 | 45 | 15 | 700 | 0 | 0 | 400 | 90 |
| 🦊 Fox | Carnivore | noc | 8 | 2 | 14 | 130 | 60 | 1600 | 6 | 4 | 120 | 28 |
| 🐺 Wolf | Carnivore | | 8 | 2 | 16 | 160 | 120 | 1800 | 9 | 6 | 60 | 20 |
| 🐍 Snake | Carnivore | | 4 | 1 | 12 | 120 | 40 | 1600 | 5 | 3 | 120 | 20 |
| 🦅 Hawk | Carnivore | fly | 12 | 3 | 20 | 110 | 45 | 1800 | 7 | 3 | 120 | 15 |
| 🐊 Crocodile | Carnivore | | 4 | 1 | 12 | 180 | 180 | 2400 | 9 | 8 | 60 | 10 |
| 🐗 Boar | Omnivore | | 4 | 1 | 12 | 150 | 100 | 1800 | 5 | 5 | 200 | 30 |
| 🐻 Bear | Omnivore | noc | 4 | 1 | 14 | 200 | 200 | 2500 | 10 | 8 | 50 | 12 |
| 🦝 Raccoon | Omnivore | noc | 4 | 1 | 11 | 100 | 50 | 1400 | 3 | 3 | 200 | 25 |
| 🐦‍⬛ Crow | Omnivore | noc, fly | 8 | 2 | 16 | 80 | 30 | 1200 | 2 | 1 | 200 | 40 |
| 🦎 Lizard | Omnivore | | 4 | 1 | 11 | 85 | 45 | 1300 | 3 | 2 | 200 | 35 |

**Flags:** `noc` = nocturnal (day vision penalized, active at night without penalty); `fly` = can traverse any terrain including WATER and MOUNTAIN.

---

## Defaults-Plus-Overrides Pattern

Rather than repeating every field in each species entry, the registry uses a merge-at-build-time approach. `buildAnimalSpeciesConfig()` calls `_mergeAnimalDefaults()` on each raw entry before converting game-time fields to ticks. This means a species definition only needs to specify values that differ from the defaults — thresholds, multipliers, and sub-blocks all fall back to shared constants if omitted:

- `DEFAULT_DECISION_THRESHOLDS` — AI threshold values (e.g. `critical_hunger`, `mate_energy_min`, `fight_back_hp_threshold`)
- `DEFAULT_METABOLIC_MULTIPLIERS` — life-stage hunger/thirst rate scaling
- `DEFAULT_HEALTH_PENALTY` — HP drain threshold and severity
- `DEFAULT_RECOVERY` — idle/sleep energy and HP regeneration rates, eat/drink restoration amounts
- `DEFAULT_COMBAT` — attack cooldown, defense factor, minimum damage, threat attack margin
- `DEFAULT_HISTORY` — action ring buffer size

---

## Species Data Fields

```javascript
{
  // Identity & display
  id: 'RABBIT',           // unique key
  name: 'Rabbit',         // display name
  emoji: '🐰',            // renderer display
  color: 0x66cc66,        // hex color for minimap/pixel overlay
  visualScale: 0.7,       // sprite size relative to base (1.0)
  audioScale: 0.211,      // audio volume scale
  soundGroup: 'smallMammal', // synthesis profile for sound events
  vocalization: {
    enabled: true,          // species can emit attack/idle vocal events
    attackChance: 0.5,      // chance on ATTACKING state transition
    idleChance: 0.06,       // chance when idle vocal check window is hit
    idleIntervalTicks: 160, // check cadence while IDLE/WALKING/FLYING
    idleCooldownTicks: 260, // minimum spacing per entity between idle calls
    gainMultiplier: 1.15,   // per-species loudness trim for vocal events
  },

  // Behaviour flags
  diet: 'HERBIVORE',      // HERBIVORE | CARNIVORE | OMNIVORE
  nocturnal: false,       // true = penalized during day, full vision at night
  can_fly: false,         // true = walkable_terrain ignored; can cross any tile

  // Reproduction
  reproduction: 'SEXUAL',       // SEXUAL | ASEXUAL | HERMAPHRODITE
  reproduction_type: 'VIVIPAROUS', // VIVIPAROUS | OVIPAROUS | METAMORPHOSIS
  gestation_period: 166,         // game minutes (VIVIPAROUS) before birth
  incubation_period: 111,        // game minutes (OVIPAROUS/METAMORPHOSIS) before hatching
  clutch_size: [1, 1],           // [min, max] offspring per birth/clutch
  egg_hp: 8,                     // hit points for OVIPAROUS eggs on the map
  pupa_age: 166,                 // game minutes (METAMORPHOSIS) when larva enters pupa stage
  pupa_duration: 332,            // game minutes the pupa stage lasts

  // Movement
  speed: 4,               // sub-cell steps per tick (4 steps = 1 tile)
  walkable_terrain: ['SAND', 'DIRT', 'SOIL', 'FERTILE_SOIL', 'MUD'],

  // Stats (all game-minute timing fields are converted to ticks at build time)
  vision_range: 10,       // perception radius in tiles
  max_energy: 100,        // energy cap
  max_hp: 50,             // health points cap
  max_hunger: 100,        // hunger cap
  max_thirst: 100,        // thirst cap
  max_age: 7754,          // game minutes until death from old age
  max_population: 350,    // base population cap per species (trophic-tier constant)
  mature_age: 443,        // game minutes before eligible to mate
  mate_cooldown: 155,     // game minutes between mating events
  life_stage_ages: [166, 332, 443], // [baby→young, young→young_adult, young_adult→adult] in game minutes
  decision_interval: 11,  // game minutes between full AI re-evaluations

  // Combat
  attack_power: 1,        // base damage dealt
  defense: 2,             // reduces incoming damage

  // Diet
  edible_plants: ['GRASS', 'STRAWBERRY', 'CARROT'],
  prey_species: [],       // species IDs this animal can hunt
  can_scavenge: false,    // whether the animal can eat decomposing bodies

  // Energy
  energy_costs: {
    IDLE: 0.01, WALK: 0.05, RUN: 0.18,
    EAT: 0.02, DRINK: 0.02, SLEEP: -4.0,
    ATTACK: 0.5, MATE: 1.0, FLEE: 0.2,
  },
  hunger_rate: 0.06,      // hunger increase per tick
  thirst_rate: 0.07,      // thirst increase per tick
  initial_count: 100,     // default spawn count
}
```

Fields `decision_thresholds`, `metabolic_multipliers`, `health_penalty`, `recovery`, and `combat` are merged from their respective `DEFAULT_*` constants unless overridden. See the source for the full default values.

---

## Exports

| Export | Type | Description |
|--------|------|-------------|
| `default` (ANIMAL_SPECIES) | Object | Full registry keyed by species ID |
| `DIET` | Object | Frozen diet enum: `{ HERBIVORE, CARNIVORE, OMNIVORE }` |
| `SOUND_GROUP` | Object | Frozen sound-group enum: `{ INSECT, BIRD, SMALL_MAMMAL, LARGE_MAMMAL, REPTILE }` |
| `ALL_ANIMAL_IDS` | Array | All 18 species keys in registry order |
| `HERBIVORE_IDS` | Array | 8 herbivore species keys |
| `CARNIVORE_IDS` | Array | 5 carnivore species keys |
| `OMNIVORE_IDS` | Array | 5 omnivore species keys |
| `BASE_POP_TOTAL` | Number | Sum of all species' base `max_population` (4030) — used to proportionally scale per-species caps when a global budget is active |
| `BASE_INITIAL_TOTAL` | Number | Sum of all species' `initial_count` — used as proportion weights for `buildProportionalAnimalCounts` |
| `MAX_ANIMAL_ENERGY` | Number | Highest `max_energy` across all species — used as a normalisation constant in rendering |
| `buildAnimalSpeciesConfig(ticksPerGameMinute)` | Function | Strips display-only fields, merges defaults, converts game-time fields to ticks; returns the `animal_species` config block |
| `buildInitialAnimalCounts()` | Function | Returns `{RABBIT: 100, ...}` from each species' raw `initial_count` |
| `buildProportionalAnimalCounts(totalPop, globalBudget)` | Function | Distributes `totalPop` across species proportionally by `initial_count`, clamped to effective per-species caps |
| `normalizeAnimalCountsToBudget(counts, globalBudget, opts)` | Function | Clamps and rebalances a count map so the total stays within `globalBudget`, with optional locked species |
| `buildDecisionIntervals(ticksPerGameMinute)` | Function | Returns `{RABBIT: N, ...}` — tick intervals for AI re-evaluation per species |
| `buildSpeciesInfo()` | Function | Returns `{RABBIT: {emoji, name, diet}, ...}` — lightweight display map for UI labels |
| `buildAnimalColors()` | Function | Returns `{RABBIT: 0x66cc66, ...}` — Pixi hex colors per species |
| `buildAnimalHexColors()` | Function | Returns `{RABBIT: '#66cc66', ...}` — CSS hex strings per species |
| `buildSpeciesAudioScale()` | Function | Returns `{Rabbit: 0.211, ...}` — display-name keyed audio scale lookup |
| `buildSpeciesSoundGroup()` | Function | Returns `{Rabbit: 'smallMammal', ...}` — display-name keyed synthesis group lookup |
| `buildSpeciesVocalProfile()` | Function | Returns display-name keyed vocalization profiles used by renderer/audio emission logic |
| `buildCanFlySet()` | Function | Returns a `Set` of species keys that have `can_fly: true` |
| `getEffectiveAnimalPopulationCap(speciesId, globalBudget)` | Function | Returns the effective per-species cap given the global budget (scales base cap proportionally) |
