# Game Logic

This document describes the simulation rules: how animals think, fight, reproduce, eat, and die — and how plants grow and spread.

---

## Animal AI — Decision Tree

Each tick, every alive animal runs `decideAndAct()`, which evaluates priorities in strict order. The first matching condition wins.

| Priority | Condition | Action |
|----------|-----------|--------|
| 1 | Currently SLEEPING, EATING, or DRINKING | Continue (finish action) |
| 2 | Adjacent to water AND thirst > 25 | Start drinking |
| 3 | On food tile AND hunger > 20 | Start eating |
| 4 | Thirst > 55 (critical) | Seek water via A* |
| 5 | Hunger > 45 (critical) | Seek food (plants or prey) |
| 6 | Energy < 20 | Sleep |
| 7 | Predator in vision range (herbivores only) | Flee |
| 8 | Hunger > 30 (moderate) | Proactive food seeking |
| 9 | Thirst > 35 (moderate) | Proactive water seeking |
| 10 | Adult + cooldown=0 + energy > 50 | Find mate |
| 11 | Has existing path | Follow path |
| 12 | Else | Random walk |

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

**Death conditions:**
- Energy reaches 0 → death
- Age exceeds `max_age` → death

---

## Needs System

Animals have two constantly increasing needs:

| Need | Rate | Consequences |
|------|------|-------------|
| **Hunger** | 0.07–0.16 per tick (species-specific) | > 45 = critical seek food, > 30 = moderate seek |
| **Thirst** | 0.08–0.14 per tick (species-specific) | > 55 = critical seek water, > 35 = moderate seek |

### Feeding

**Herbivores** seek plants:
- Priority: fruit > mature plant
- Vision-range search; expands to 3× if hunger > 65 (desperation)
- Eating reduces hunger

**Carnivores** seek prey:
- Use spatial hash for radius query within vision range
- Chase and attack nearest prey
- Multi-step RUN pursuit if adjacent
- Fallback: eat fruit if available

---

## Combat

Triggered when a carnivore reaches an adjacent prey tile.

```
damage = attacker.attackPower - (defender.defense × 0.5)
minimum damage = 1
```

- Defender's energy is reduced by `damage`
- If defender energy ≤ 0 → defender dies
- On kill: attacker recovers hunger (−40) and energy (+20)
- Cooldown: `attackCooldown` ticks between attacks

### Threat Detection (Herbivores)

- Scan vision range for carnivores using spatial hash
- If threat found: FLEE state → move 3 tiles in opposite direction
- Uses A* for escape pathfinding

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

- Baby spawns at parent's position
- Initial energy: 40% of species max
- Age: 0 (Life Stage: BABY)
- Both parents enter `MATING` state
- Both parents receive `mateCooldown = 100` ticks

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
| Cactus | 20 | 80 | 200 | 1200 |
| Coconut Palm | 45 | 200 | 450 | 2000 |

### Water Proximity Bonus

Plants within `water_proximity_threshold` (10) tiles of water grow **30% faster** (age multiplied by 1.3 per tick).

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
2. Dynamic processing cap: 800 base, reduced to 400 if coverage > 40%, 200 if > 60%
3. Each fruiting plant has a species-specific **production chance** to spread
4. Seed lands 1–3 tiles away in a random direction (8-way)
5. Target tile must be empty (no plant) and SOIL, DIRT, FERTILE_SOIL, or SAND terrain
6. On DIRT terrain, seeding has only a 60% success rate
7. Desert plants (Cactus, Coconut Palm) can seed on SAND tiles

### Initial Seeding

On world generation:
1. Collect eligible tiles (SOIL, DIRT, FERTILE_SOIL, or SAND)
2. Shuffle; place `density × eligibleCount` plants
3. Type selection weighted by water proximity:
   - **Near water** → more berries, trees, and coconut palms
   - **Far from water** → more grass, carrots, and cacti
4. Random initial stage: 33% seed, 33% sprout, 33% mature

---

## Day/Night Cycle

- **Day length:** `ticks_per_day` (default 200 ticks)
- **Daylight fraction:** `day_fraction` (default 0.6 = 60%)
- **Night:** Visual overlay at 35% opacity
- **No gameplay effect** on animal behavior (visual only)

---

## Death and Cleanup

| Cause | Trigger |
|-------|---------|
| Starvation | Energy ≤ 0 |
| Old age | Age ≥ `max_age` |
| Predation | Energy ≤ 0 from combat |
| Manual removal | Player uses ERASE tool |

- Dead animals are marked `alive = false`, state = `DEAD`
- A `_deathTick` timestamp is recorded for fade timing
- Dead animals remain on the map as 💀 skulls for **300 ticks**
- Skull alpha fades from 0.5 → 0.05 over the 200-tick window
- After 200 ticks, the entity is permanently removed from the animal array
- Cleanup runs every 50 ticks

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

### Gameplay Effects

- **Mating** requires `LifeStage.ADULT` (both partners)
- **Sprite size** scales with life stage for visual progression
- The `lifeStage` field is included in `toDict()` and shown in the Entity Inspector
