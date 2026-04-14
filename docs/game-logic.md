# Game Logic

This document describes the simulation rules: how animals think, fight, reproduce, eat, and die — and how plants grow and spread.

---

## Animal AI — Decision Tree

Each tick, every alive animal runs `decideAndAct()`, which evaluates priorities in strict order. The first matching condition wins.

### Ongoing Actions (always processed first)

If the animal is currently SLEEPING, EATING, or DRINKING, the action continues until complete.

### Opportunistic Actions

| Condition | Action |
|-----------|--------|
| Adjacent to water AND thirst > 25 | Start drinking |
| On edible plant tile AND hunger > threshold | Start eating (threshold varies by plant stage) |

### Priority-Based Decisions

| Priority | Condition | Action |
|----------|-----------|--------|
| 1 | Thirst > 55 (critical) | Seek water via A* |
| 2 | Predator in vision range (herbivores/omnivores) | Flee |
| 3 | Hunger > 45 (critical) | Seek food (plants or prey) |
| 4 | Energy < 20 | Sleep |
| 5 | Adult + cooldown=0 + energy > 50 | Find mate |
| 6 | Hunger > 30 (moderate) | Proactive food seeking |
| 7 | Thirst > 35 (moderate) | Proactive water seeking |
| 8 | Has existing path | Follow path |
| 9 | Else | Random walk (30% chance) or idle |

Notes:
- These thresholds are now driven by species config (`decision_thresholds`) with defaults injected by `animalSpecies.js`.
- Effective vision is derived from species base `vision_range` and then scaled by `animal_global_vision_multiplier`.
- Day/night then modifies that scaled result (`night_vision_reduction_factor`, `nocturnal_day_vision_factor`).
- Vision is clamped with a minimum of 1 tile to avoid zero-range behavior.

---

## Movement System

Animals move in **sub-tile increments** rather than jumping full tiles. Each tile is logically divided into a 4×4 sub-grid (`SUB_CELL_DIVISOR = 4`), so each movement step covers 0.25 tiles (`SUB_CELL_STEP`).

### Coordinates

- Animal positions (`x`, `y`) are **floats** (e.g. `5.5, 3.25`)
- Animals spawn at tile centers (`tileX + 0.5, tileY + 0.5`)
- Tile membership is determined by flooring: `tile = position | 0`
- All `world.js` methods floor float inputs internally, so tile lookups are transparent

### Speed

Species `speed` values represent **sub-cell steps per tick**. With 4 sub-cells per tile:

| Code Speed | Effective Tiles/Tick | Example Species |
|------------|---------------------|------------------|
| 4 | 1 | Rabbit, Beetle, Bear |
| 8 | 2 | Deer, Fox, Wolf |
| 12 | 3 | Hawk |

### Path Following (`_walkPath`)

Each tick, `_walkPath` calls `_followPath` up to `speed ± 1` times (with terrain adjustment):
- A random **speed jitter** of −1, 0, or +1 sub-steps is applied each tick, so animals of the same species move at slightly different paces
- **Terrain speed factor** reduces effective steps on difficult ground: MUD/MOUNTAIN 50%, SAND/ROCK 75%
- Each `_followPath` moves 0.25 tiles toward the next A* waypoint center
- Movement is along the dominant axis (larger delta of dx/dy)
- Waypoint is considered reached when within 0.125 of its center
- **A* pathfinding remains tile-based** — start and goal are floored to integer tiles

### Random Walk

Random walk executes `speed ± 1` sub-steps per tick (with terrain adjustment):
- Each sub-step moves 0.25 tiles in a random cardinal direction
- **Directional inertia:** 50% chance to keep the previous step's direction, producing smoother, more natural paths instead of zig-zag
- Home bias is preserved (60% chance to prefer home direction when far, overrides inertia)

### Tile Occupancy

- The `animalGrid` occupancy map operates at **tile granularity** (not sub-tile)
- Occupancy is updated only when an animal crosses a tile boundary
- Two animals can share the same tile if they're on different sub-cells within it — but tile-boundary crossings check `isTileOccupied`

### Energy Costs

- Walking energy cost is applied **once per tile boundary crossing**, not per sub-step
- **Terrain energy multiplier** increases cost on difficult ground:

| Terrain | Speed Factor | Energy Multiplier |
|---------|-------------|-------------------|
| Soil, Dirt, Fertile Soil | 1.0× | 1.0× |
| Sand | 0.75× | 1.3× |
| Rock | 0.75× | 1.3× |
| Mud | 0.5× | 1.5× |
| Mountain | 0.5× | 1.8× |

- Running/hunting energy is **proportional to tiles actually crossed** — a blocked predator pays only IDLE cost instead of full RUN
- Day/night activity penalty (1.3×) applies on top of terrain multipliers for species active during the wrong period

---

## Energy System

Every action costs energy. Energy is clamped between 0 and `maxEnergy` (species-specific).

| Action | Typical Cost Range | Notes |
|--------|--------------------|-------|
| IDLE | 0.01–0.04 | Minimal drain |
| WALK | 0.06–0.15 | Standard movement |
| RUN | 0.20–0.55 | Fast movement (fleeing, chasing) |
| EAT | 0.03–0.08 | Consuming food |
| DRINK | 0.03–0.08 | Consuming water |
| SLEEP | −2.0 to −3.5 | **Recovers** energy (negative cost) |
| ATTACK | 0.4–2.0 | Combat |
| MATE | 0.8–2.5 | Reproduction |
| FLEE | 0.2–0.6 | Escape predators |

### Passive Regeneration

Animals slowly recover energy and HP during light activities:

| State | Energy Regen/tick | HP Regen/tick |
|-------|-------------------|---------------|
| Idle | +0.01 | +0.01 |
| Sleeping | via SLEEP cost (e.g. +2.0 to +5.0) | +0.8 |

These recovery values are configurable per species via `recovery` in the derived animal config.

### Energy Depletion

When energy reaches 0, the animal is **forced to sleep** and cannot perform any other action. While sleeping, hunger and thirst continue to rise (via `tickNeeds`), which may cause HP damage. This creates an indirect survival pressure — the animal must recover energy before it can eat or drink.

---

## HP (Health Points) System

Every animal has an HP stat (`hp`) that represents physical health. HP is the **sole survival metric** — when HP reaches 0, the animal dies.

### Max HP by Species

| Tier | Species | Max HP |
|------|---------|--------|
| Insects | 🦟 Mosquito | 10 |
| Insects | 🐛 Caterpillar, 🦗 Cricket | 15 |
| Insects | 🪲 Beetle | 20 |
| Small | 🐦‍⬛ Crow | 30 |
| Small | 🐿️ Squirrel, 🐍 Snake | 40 |
| Mid | 🦎 Lizard, 🦅 Hawk | 45 |
| Mid | 🐰 Rabbit, 🦝 Raccoon | 50 |
| Mid | 🦊 Fox | 60 |
| Large | 🦌 Deer | 70 |
| Large | 🐐 Goat | 80 |
| Large | 🐗 Boar | 100 |
| Apex | 🐺 Wolf | 120 |
| Apex | 🐊 Crocodile | 180 |
| Apex | 🐻 Bear | 200 |

### HP Damage Sources

| Source | Damage | Notes |
|--------|--------|-------|
| Combat (attacked) | `attackPower - defense × defense_factor` (min `min_damage`) | Per attack hit |
| High hunger (> 80% of max) | 0–0.5 per tick (scales linearly) | Stacks with thirst penalty |
| High thirst (> 80% of max) | 0–0.5 per tick (scales linearly) | Stacks with hunger penalty |

HP penalty formula: `penalty = max_penalty × (stat - threshold) / (max_stat - threshold)` where `threshold = threshold_fraction × max_stat`.
Defaults remain `threshold_fraction = 0.8` and `max_penalty = 0.5`.

### HP Recovery Sources

| Source | Recovery | Notes |
|--------|----------|-------|
| Sleeping | +0.8 per tick | Most reliable recovery method |
| Idle | +0.01 per tick | Slow passive regen |
| Eating plant (Fruit stage) | +10 | Best plant nutrition |
| Eating plant (Adult stage) | +5 | Moderate |
| Eating plant (Seed stage) | +3 | Minimal |
| Ongoing eating state | +2 per tick | While in EATING state |
| Scavenging corpse | +8 | Corpse consumption |
| Killing prey | +15 | Attacker bonus on kill |

**Death conditions:**
- HP reaches 0 → death
- Age exceeds `max_age` → death

Hunger, thirst, and energy **no longer kill directly**. Instead, high hunger/thirst drain HP over time, and zero energy forces the animal to sleep.

---

## Needs System

Animals have two constantly increasing needs:

| Need | Rate | Consequences |
|------|------|-------------|
| **Hunger** | species-specific | Decision thresholds are species-configurable (`decision_thresholds`) |
| **Thirst** | species-specific | Decision thresholds are species-configurable (`decision_thresholds`) |

### Feeding

**Herbivores** seek plants:
- Plants have **edible stages** defined per species (see `plantSpecies.js`)
- Fruit-producing plants: edible at Seed (stage 1) and Fruit (stage 5)
- Non-fruit plants: edible at Seed (stage 1) and Adult (stage 4)
- Oak Tree and Cactus: only edible at Seed (stage 1)
- Eating **removes the plant entirely** (tile cleared)
- Stage-based nutrition: Seed=15 hunger, Adult=35, Fruit=55
- Vision-range search can expand when hunger is high (species-configurable desperation thresholds)
- Seed/adult/opportunistic minimum hunger checks are now species-configurable thresholds

**Carnivores** seek prey:
- Use spatial hash for radius query within vision range
- Chase and attack nearest prey
- Multi-step RUN pursuit if adjacent
- Fallback: eat fruit if available

### Scavenging

Some species can eat decomposing bodies (dead animals still on the map). Only species with `can_scavenge: true` can scavenge.

**Can scavenge:** Beetle, Fox, Wolf, Boar, Bear, Raccoon, Crow, Crocodile
**Cannot scavenge:** Rabbit, Squirrel, Goat, Deer, Mosquito, Caterpillar, Snake, Hawk

---

## Combat

Triggered when a carnivore reaches an adjacent prey tile.

```
damage = attacker.attackPower - (defender.defense × defense_factor)
minimum damage = min_damage
```

- Defender's **HP** is reduced by `damage`
- If defender HP ≤ 0 → defender dies
- On kill: attacker recovers hunger (−80), energy (+25), and HP (+15)
- Cooldown and damage coefficients are now species-configurable via `combat` (defaults: cooldown=3, defense_factor=0.5, min_damage=1)

### Threat Detection (Herbivores & Omnivores)

- Scan vision range for carnivores using spatial hash
- If threat found: FLEE state → burst-move away from threat
- Each burst jumps to a full tile (not sub-step), using `effectiveSpeed = ceil(speed / SUB_CELL_DIVISOR)` bursts
- Direct flee: tries stepping 3→1 tiles along the escape vector
- Lateral fallback: evaluates all 8 neighbors if direct path is blocked
- Flying species get +1 burst
- Both herbivores and omnivores will flee from stronger predators

---

## Reproduction

### Requirements

| Condition | Value |
|-----------|-------|
| Life Stage | `ADULT` (LifeStage 3) |
| Energy | > 50 |
| Mate cooldown | = 0 |
| Nearby mate | Within radius 3 |

### Sex Compatibility

| Mode | Rule |
|------|------|
| `SEXUAL` | Requires opposite sex (male + female) |
| `HERMAPHRODITE` | Any two of same species |
| `ASEXUAL` | Reproduces alone |

### Offspring

- Baby spawns on an adjacent walkable tile at tile center (`tileX + 0.5, tileY + 0.5`)
- Initial energy: 40% of species max
- Age: 0 (Life Stage: BABY)
- Both parents enter `MATING` state
- Both parents receive `mateCooldown = 100` ticks
### Population Cap

Reproduction is throttled by species population:

- Each species has a `max_population` base cap (varies by tier: 80–800)
- When `max_animal_population` (global budget) is set (> 0), effective caps are proportionally scaled: `effectiveCap = baseCap × globalBudget / BASE_POP_TOTAL`
- At 60% of effective cap: 100% mating success
- At 100% of effective cap: 0% mating success
- Linear decline between 60–100% capacity
- Species population count uses `world.getAliveSpeciesCount(species)` which is lazily cached once per tick, avoiding O(N) linear scans
---

## Plant Lifecycle

### Plant Types

| Type | Constant | Reproduction | Notes |
|------|----------|-------------|-------|
| 🌱 Grass | `P_GRASS = 1` | Seed | Most common, fast growth |
| 🍓 Strawberry | `P_STRAWBERRY = 2` | Fruit | Medium water affinity |
| 🫐 Blueberry | `P_BLUEBERRY = 3` | Fruit | Medium water affinity |
| 🍎 Apple Tree | `P_APPLE_TREE = 4` | Fruit | Slow growth, long-lived |
| 🥭 Mango Tree | `P_MANGO_TREE = 5` | Fruit | Slow growth, long-lived |
| 🥕 Carrot | `P_CARROT = 6` | Seed | Inland |
| 🌻 Sunflower | `P_SUNFLOWER = 7` | Seed | Fast growth |
| 🍅 Tomato | `P_TOMATO = 8` | Fruit | Medium water affinity |
| 🍄 Mushroom | `P_MUSHROOM = 9` | Seed | Fastest lifecycle |
| 🌳 Oak Tree | `P_OAK_TREE = 10` | Seed | Longest-lived, slow growth |
| 🌵 Cactus | `P_CACTUS = 11` | Seed | Desert plant, thrives on sand/rock |
| 🌴 Coconut Palm | `P_COCONUT_PALM = 12` | Fruit | Coastal tree, grows on sand |
| 🥔 Potato | `P_POTATO = 13` | Seed | Root crop, resilient inland |
| 🌶️ Chili Pepper | `P_CHILI_PEPPER = 14` | Fruit | Medium water affinity |
| 🫒 Olive Tree | `P_OLIVE_TREE = 15` | Fruit | Drought-tolerant tree |

### Growth Stages

```
SEED → YOUNG_SPROUT → ADULT_SPROUT → ADULT → FRUIT → DEAD
```

Each stage transition is governed by age thresholds (in ticks) defined in `plantSpecies.js`:

| Plant | Seed→Young Sprout | Young→Adult Sprout | Adult Sprout→Adult | Max Age (Dead) |
|-------|-------------------|-------------------|-------------------|----------------|
| Grass | 5 | 18 | 35 | 180 |
| Strawberry | 10 | 40 | 100 | 400 |
| Blueberry | 15 | 55 | 140 | 550 |
| Apple Tree | 35 | 140 | 350 | 1600 |
| Mango Tree | 40 | 180 | 420 | 1800 |
| Carrot | 8 | 35 | 80 | 350 |
| Sunflower | 8 | 38 | 100 | 500 |
| Tomato | 10 | 45 | 120 | 450 |
| Mushroom | 6 | 22 | 50 | 220 |
| Oak Tree | 50 | 220 | 500 | 2500 |
| Cactus | 30 | 120 | 300 | 1600 |
| Coconut Palm | 60 | 260 | 580 | 2400 |
| Potato | 12 | 42 | 95 | 420 |
| Chili Pepper | 11 | 46 | 125 | 500 |
| Olive Tree | 55 | 240 | 560 | 2600 |

### Water Proximity Bonus

Plants within `water_proximity_threshold` (default 10) tiles of water get a growth bonus. Water growth multipliers are now configurable through `plant_water_growth_modifiers`.

### Terrain Growth Modifiers

Each plant species defines a per-terrain growth multiplier in `terrainGrowth`. Growth rate is multiplied by the terrain factor each tick. A value of `0.0` means the plant cannot grow on that terrain at all.

Example multipliers (varies by species — see `plantSpecies.js` for full data):

| Terrain | Typical Range | Notes |
|---------|--------------|-------|
| SOIL | 0.4–1.2× | Default growing terrain for most plants |
| FERTILE_SOIL | 0.3–1.3× | Best for most non-desert plants |
| DIRT | 0.3–0.8× | Generally slower growth |
| SAND | 0.0–1.5× | Only desert plants (Cactus, Coconut Palm) thrive here |
| ROCK | 0.0–1.2× | Most plants cannot grow; Cactus tolerates it |
| MOUNTAIN | 0.0–0.8× | Very few plants survive |
| MUD | 0.0–0.8× | Swampy terrain, variable growth |

Plants on **dirt terrain** also have a per-tick chance of premature death:

| Stage | Death Chance/Tick |
|-------|-----------------|
| Seed | 0.3% |
| Young Sprout | 0.2% |
| Adult Sprout | 0.1% |
| Adult | 0.05% |
| Fruit | 0.2% |

### Seed Spreading

Each tick during the plant phase:
1. Collect all fruiting plants, shuffle
2. Dynamic processing cap is configurable (defaults: base 800, 50% at >40% coverage, 25% at >60% coverage)
3. Each fruiting plant has a species-specific **production chance** to spread
4. **Density check:** if local density (adjacent plants / 8) ≥ suppress threshold (default 0.7), reproduction is blocked; between reduce threshold (default 0.5) and suppress threshold, reduction chance is configurable (default 50%)
5. Seed lands `1..plant_offspring_max_spread` tiles away (default 1–3), random 8-way direction
6. Target tile must be empty (no plant) and SOIL, DIRT, FERTILE_SOIL, or SAND terrain
7. On harsh terrain, rooting success is configurable (`plant_offspring_harsh_root_chance`, `plant_offspring_mountain_root_chance`)
8. Desert plants (Cactus, Coconut Palm) can seed on SAND tiles
9. Reproduction chance is multiplied by the **seasonal reproduction modifier**

### Initial Seeding

On world generation:
1. Collect eligible tiles (SOIL, DIRT, FERTILE_SOIL, or SAND)
2. Shuffle; place `density × eligibleCount` plants
3. Type selection weighted by water proximity:
   - **Near water** → more berries, trees, and coconut palms
   - **Far from water** → more grass, carrots, and cacti
4. Random initial stage distribution is configurable via `initial_plant_stage_distribution` (default 25/25/25/25 across seed/young/adult sprout/adult)

---

## Seasonal Cycle

The simulation features four seasons that affect plant growth, death, and reproduction. The season is determined by the simulation day:

```
season = floor(totalDays / season_length_days) % 4
```

| Season | Index | Growth Mult | Reproduction Mult | Death Mult |
|--------|-------|------------|-------------------|------------|
| 🌱 Spring | 0 | 1.2× | 1.5× | 0.8× |
| ☀️ Summer | 1 | 1.0× | 1.0× | 1.0× |
| 🍂 Autumn | 2 | 0.8× | 0.7× | 1.2× |
| ❄️ Winter | 3 | 0.5× | 0.2× | 2.0× |

Default `season_length_days` is 30. Growth multiplier affects plant aging speed. Reproduction multiplier scales seed-spreading chance. Death multiplier increases natural death probability.

---

## Water Stress

Plants with medium or high water affinity (≥2) suffer mortality when far from water:

- Applies when `waterProximity > water_stress_threshold` (default 20)
- Base death rate: `water_stress_death_rate` (default 0.001) per tick phase
- **Severe stress** multiplier is configurable (`water_stress_severe_multiplier`, default 2.0)
- **High affinity** multiplier is configurable (`water_stress_high_affinity_multiplier`, default 1.5)
- Seasonal death modifier also applies
- Plants near water (wp ≤ threshold) get a growth bonus instead

Affected species: Strawberry, Blueberry, Sunflower (medium); Apple Tree, Mango Tree, Tomato, Oak Tree, Coconut Palm (high).
Unaffected: Grass, Carrot, Mushroom (low); Cactus (none).

---

## Density Competition

Local plant density affects growth and reproduction:

- **Crowding penalty:** adjacent plants threshold is configurable (`plant_crowding_neighbor_threshold`, default 5), growth multiplier via `plant_crowding_growth_penalty` (default 0.7)
- **Reproduction suppression:** local density ≥ 0.7 (suppress threshold) → reproduction completely blocked
- **Reproduction reduction:** local density 0.5–0.7 → 50% chance of reproduction being blocked
- Local density = count of adjacent plant tiles / 8

---

## Day/Night Cycle

- **Day length:** `ticks_per_day` (default 200 ticks)
- **Daylight fraction:** `day_fraction` (default 0.6 = 60%)
- **Night:** Visual overlay at 35% opacity
- **Gameplay effect on fauna:** effective vision is reduced at night for non-nocturnal species and reduced during daytime for nocturnal species

---

## Death and Cleanup

| Cause | Trigger |
|-------|---------|
| Old age | Age ≥ `max_age` |
| HP depletion | HP ≤ 0 (combat or need penalties) |
| Manual removal | Player uses ERASE tool |

- Dead animals are marked `alive = false`, state = `DEAD`
- A `_deathTick` timestamp is recorded for fade timing
- Dead animals remain on the map for up to `corpse_persistence_ticks` (default currently 300 in simulation logic)
- Cleanup interval is adaptive by population (faster cleanup at high populations)
- Corpses may be consumed by scavengers before cleanup

---

## Life Stages

Animals progress through four life stages based on their age and species-specific `life_stage_ages` thresholds:

| Stage | Enum | Sprite Scale | Description |
|-------|------|-------------|-------------|
| 🍼 Filhote (Baby) | 0 | 0.5× | Newborn, cannot mate |
| 🌱 Jovem (Young) | 1 | 0.7× | Growing, cannot mate |
| 🌿 Adulto Jovem (Young Adult) | 2 | 0.85× | Near maturity, cannot mate |
| 🌳 Adulto (Adult) | 3 | 1.0× | Full size, can reproduce |

### Stage Thresholds

Each species defines `life_stage_ages: [baby→young, young→young_adult, young_adult→adult]`:

| Species | Baby → Young | Young → Young Adult | Young Adult → Adult |
|---------|-------------|--------------------|-----------|
| 🐰 Rabbit | 30 | 60 | 100 |
| 🐿️ Squirrel | 25 | 50 | 80 |
| 🪲 Beetle | 15 | 35 | 60 |
| 🐐 Goat | 60 | 120 | 200 |
| 🦌 Deer | 50 | 100 | 160 |
| 🦊 Fox | 50 | 100 | 160 |
| 🐺 Wolf | 60 | 120 | 200 |
| 🐗 Boar | 55 | 110 | 180 |
| 🐻 Bear | 75 | 150 | 250 |
| 🦝 Raccoon | 30 | 60 | 100 |
| 🐦‍⬛ Crow | 18 | 38 | 60 |
| 🦟 Mosquito | 8 | 18 | 30 |
| 🐛 Caterpillar | 10 | 25 | 40 |
| 🐍 Snake | 30 | 60 | 100 |
| 🦅 Hawk | 30 | 65 | 110 |
| 🐊 Crocodile | 50 | 100 | 160 |

### Gameplay Effects

- **Mating** requires `LifeStage.ADULT` (both partners)
- **Sprite size** scales with life stage for visual progression
- The `lifeStage` field is included in `toDict()` and shown in the Entity Inspector

---

## Action History

Each animal maintains a rolling `actionHistory` log stored as an **O(1) ring buffer** (default max 100 entries). The cap is configurable per species via `action_history_max_size`. Internally, `logAction()` overwrites the oldest entry in a circular `_actionBuf` array, avoiding `Array.shift()` overhead. The `actionHistory` getter reconstructs chronological order on demand.

**Logged actions:** Eat (plant/prey), Drink, Sleep, Flee, Attack, Kill, Mate, Born, Death, Scavenge, Wander

Each entry contains:
- `tick` — simulation tick when the action occurred
- `action` — action type string
- `detail` — additional context (species name, hunger value, etc.)

Timestamps are displayed in the UI as `D{day} HH:MM` format, derived from the tick and `ticksPerDay` config.
