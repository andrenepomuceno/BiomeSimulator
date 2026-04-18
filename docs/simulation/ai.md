# Animal AI

Navigation: [Documentation Home](../README.md) > [Simulation](README.md) > [Current Document](ai.md)
Return to [Documentation Home](../README.md).

Each tick, every alive animal runs `decideAndAct()`, which evaluates priorities in strict order. The first matching condition wins.

See [Movement System](movement.md) for how animals travel, and [Energy & Needs](energy.md) for threshold context.

---

## Ongoing Actions

If the animal is currently `SLEEPING`, `EATING`, or `DRINKING`, the action continues until complete. These are always processed first before any new decision is made.

---

## Opportunistic Actions

Checked before the priority queue — these trigger immediately when local conditions are met.

| Condition | Action |
|-----------|--------|
| Adjacent to water AND thirst > 25 | Start drinking |
| On edible plant tile AND hunger > threshold | Start eating (threshold varies by plant stage) |

---

## Priority-Based Decisions

```mermaid
flowchart TD
    Start["decideAndAct()"] --> Ongoing{"Ongoing action?\n(SLEEPING/EATING/DRINKING)"}
    Ongoing -->|Yes| Continue["Continue current action"]
    Ongoing -->|No| Opp{"Opportunistic?\n(adjacent water+thirst>25\nor edible plant+hungry)"}
    Opp -->|Yes| OppAct["Start drinking / eating"]
    Opp -->|No| P1{"Thirst > 55?\n(critical)"}
    P1 -->|Yes| SeekWater["P1: Seek water via A*"]
    P1 -->|No| P2{"Predator in\nvision range?\n(herbivores/omnivores)"}
    P2 -->|Yes| Flee["P2: Flee from threat"]
    P2 -->|No| P2b{"Carnivore/omnivore:\nstronger predator nearby\n+ badly wounded?"}
    P2b -->|Yes| Retreat["P2b: Retreat from stronger predator"]
    P2b -->|No| P3{"Hunger > 45?\n(critical)"}
    P3 -->|Yes| SeekFood["P3: Seek food\n(plants or prey)"]
    P3 -->|No| P4{"Energy < 20?"}
    P4 -->|Yes| Sleep["P4: Sleep"]
    P4 -->|No| P5{"Adult + cooldown=0\n+ energy>50?"}
    P5 -->|Yes| Mate["P5: Find mate"]
    P5 -->|No| P6{"Hunger > 30?\n(moderate)"}
    P6 -->|Yes| ProFood["P6: Proactive\nfood seeking"]
    P6 -->|No| P7{"Thirst > 35?\n(moderate)"}
    P7 -->|Yes| ProWater["P7: Proactive\nwater seeking"]
    P7 -->|No| P8{"Has existing path?"}
    P8 -->|Yes| Follow["P8: Follow path"]
    P8 -->|No| P9["P9: Random walk (30%)\nor idle"]
```

| Priority | Condition | Action |
|----------|-----------|--------|
| 1 | Thirst > 55 (critical) | Seek water via A* |
| 2 | Predator in vision range (herbivores/omnivores) | Flee |
| 2b | Carnivore/omnivore: stronger predator nearby + badly wounded | Retreat (flee from that predator) |
| 3 | Hunger > 45 (critical) | Seek food (plants or prey) |
| 4 | Energy < 20 | Sleep |
| 5 | Adult + cooldown = 0 + energy > 50 | Find mate |
| 6 | Hunger > 30 (moderate) | Proactive food seeking |
| 7 | Thirst > 35 (moderate) | Proactive water seeking |
| 8 | Has existing path | Follow path |
| 9 | Else | Random walk (30% chance) or idle |

---

## Vision Range

Vision is computed from the species base stat and modified by config and day/night cycle:

```
vision_now = max(1, floor(vision_range × animal_global_vision_multiplier × dayNightModifier))
```

| Condition | Modifier |
|-----------|----------|
| Non-nocturnal species at night | `night_vision_reduction_factor` (default 0.65) |
| Nocturnal species during day | `nocturnal_day_vision_factor` (default 0.8) |
| Otherwise | 1.0 |

Vision is clamped to a minimum of 1 tile to prevent zero-range behavior. Thresholds driving priorities are species-configurable via `decision_thresholds` in `animalSpecies.js`.

---

## Threat Detection (Flee Behavior)

Herbivores and omnivores scan their vision range for carnivores using the spatial hash. If a threat is found:

1. Enter `FLEE` state
2. Burst-move away from the threat using `effectiveSpeed = ceil(speed / SUB_CELL_DIVISOR)` bursts
3. **Direct flee:** tries stepping 3 → 1 tiles along the escape vector
4. **Lateral fallback:** evaluates all 8 neighbors if the direct path is blocked
5. Flying species receive +1 burst

Both herbivores and omnivores flee from stronger predators.

### Flee/Chase Lock-In

Once an animal begins fleeing (or chasing), it commits to the same target for a window of ticks before re-evaluating. This prevents jitter from rapid target switches each tick.

| Parameter | Default | Description |
|-----------|---------|-------------|
| `flee_lock_ticks` | 5 | Ticks to continue fleeing the current threat before scanning again |
| `chase_lock_ticks` | 5 | Ticks to continue chasing the current prey before scanning again |

Both can be overridden per-species via `flee_lock_ticks` / `chase_lock_ticks` in `animalSpecies.js`.

### Carnivore/Omnivore Retreat

Carnivores and omnivores can also flee — not from prey, but from a **stronger predator** when they are badly wounded. This check runs after the herbivore/omnivore flee check (P2) and uses the same `_fleeFrom` movement logic.

**Retreat triggers when all of the following hold:**
- The animal is a carnivore or omnivore
- A stronger predator is within vision range (`threat.attack_power > animal.attack_power + carnivore_retreat_power_margin`)
- The animal's HP is below a threshold:
  - Normal mode: HP < `carnivore_retreat_hp_normal_threshold` (default 30%)
  - Desperate mode: HP < `carnivore_retreat_hp_desperate_threshold` (default 40%)
- Desperate mode activates when `hunger > carnivore_retreat_desperate_hunger` (default 45) OR `thirst > carnivore_retreat_desperate_thirst` (default 55)

Retreat also respects the flee lock-in window (`flee_lock_ticks`), so the animal commits to fleeing the same threat for several ticks before reconsidering.

---

## Threat Detection Cache

Scanning for threats is expensive (spatial hash query + diet validation per neighbor). To reduce cost:

- Results are cached for **10 ticks** per animal (`threat_cache_ttl`)
- After a scan returns "no threat found", rescans are throttled for **8 ticks** (`threat_scan_cooldown_ticks`)
- Cache stores: threat entity ref, distance, direction vector
- Cache is invalidated early if the animal crosses a tile boundary
- Each species has a staggered decision interval (e.g., insects decide every 2 ticks, large predators every tick)

---

## Food-Before-Hunt Priority

Carnivore and omnivore seek logic now prioritizes **visible nearby food** before pursuing prey. This reduces unnecessary chase churn and makes high-density item/corpse environments more stable.

Priority order inside `_seekPrey` / `_seekOmnivoreFood`:

1. Scavenge corpse (species with `can_scavenge: true`)
2. Eat nearby `MEAT` ground item
3. Eat nearby rival egg
4. Hunt prey only if no higher-priority food source is available in vision

Omnivores also check plant and fruit-item options before entering desperate hunt mode.

---

## Day/Night Activity

Animals have a `nocturnal` flag in their species config. Activity penalties apply when active during the wrong period:

| Scenario | Vision Modifier | Energy Cost Modifier |
|----------|----------------|---------------------|
| Diurnal species during day | 1.0× | 1.0× |
| Diurnal species at night | 0.65× (`night_vision_reduction_factor`) | 1.3× |
| Nocturnal species at night | 1.0× | 1.0× |
| Nocturnal species during day | 0.8× (`nocturnal_day_vision_factor`) | 1.3× |

---

## See Also

- [Movement System](movement.md) — how animals travel and terrain costs
- [Energy & Needs](energy.md) — threshold values and energy costs
- [Animal Interactions: HP & Combat](animal-interactions.md#hp--combat) — combat mechanics and damage
- [Animal Interactions: Reproduction](animal-interactions.md#reproduction) — mating conditions and population caps
- [Animal Species Registry](../engine/animal-species.md) — species stats and thresholds
- [Architecture: Tick Pipeline](../architecture.md#simulation-tick) — how AI fits in the tick loop
