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
| 10 | Mature + cooldown=0 + energy > 50 | Find mate |
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
| Age | ≥ `mature_age` |
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
- Initial energy: 60% of species max
- Age: 0
- Both parents enter `MATING` state
- Both parents receive `mateCooldown = 100` ticks

---

## Plant Lifecycle

### Plant Types

| Type | Constant | Sex | Notes |
|------|----------|-----|-------|
| 🌱 Grass | `P_GRASS = 1` | Asexual | Most common |
| 🍓 Strawberry | `P_STRAWBERRY = 2` | Hermaphrodite | Near water |
| 🫐 Blueberry | `P_BLUEBERRY = 3` | Hermaphrodite | Near water |
| 🍎 Apple Tree | `P_APPLE_TREE = 4` | Hermaphrodite | Near water, slow growth |
| 🥭 Mango Tree | `P_MANGO_TREE = 5` | Hermaphrodite | Near water, slow growth |
| 🥕 Carrot | `P_CARROT = 6` | Asexual | Inland |

### Growth Stages

```
SEED → SPROUT → MATURE → FRUITING → DEAD
```

Each stage transition is governed by age thresholds (in ticks):

| Plant | Seed→Sprout | Sprout→Mature | Mature→Fruiting | Fruiting→Dead |
|-------|-------------|---------------|-----------------|---------------|
| Grass | 10 | 40 | 80 | 300 |
| Strawberry | 15 | 60 | 150 | 500 |
| Blueberry | 20 | 80 | 200 | 700 |
| Apple Tree | 50 | 200 | 500 | 2000 |
| Mango Tree | 60 | 250 | 600 | 2200 |
| Carrot | 12 | 50 | 120 | 400 |

### Water Proximity Bonus

Plants within `water_proximity_threshold` (10) tiles of water grow **30% faster** (age multiplied by 1.3 per tick).

### Seed Spreading

Each tick during the plant phase:
1. Collect all fruiting plants, shuffle
2. Cap processing at 800 plants per tick
3. Each fruiting plant has a **6% chance** to spread
4. Seed lands 1–3 tiles away in a random direction (8-way)
5. Target tile must be empty (no plant) and GRASS or DIRT terrain

### Initial Seeding

On world generation:
1. Collect eligible tiles (GRASS or DIRT)
2. Shuffle; place `density × eligibleCount` plants
3. Type selection weighted by water proximity:
   - **Near water** → more berries and trees
   - **Far from water** → more grass and carrots
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

- Dead animals are marked `alive = false`, state = `DEAD`
- Rendered with 45% opacity
- Removed from the animal array every 50 ticks (cleanup cycle)
