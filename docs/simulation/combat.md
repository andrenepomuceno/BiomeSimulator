# HP & Combat

Navigation: [Documentation Home](../README.md) > [Simulation](README.md) > [Current Document](combat.md)
Return to [Documentation Home](../README.md).

---

## HP (Health Points) System

Every animal has an `hp` stat representing physical health. HP is the **sole survival metric** — when HP reaches 0 the animal dies.

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
| Combat (attacked) | `attackPower − defense × defense_factor` (min `min_damage`) | Per attack hit |
| High hunger (> 80% of max) | 0–0.5 per tick (scales linearly) | Stacks with thirst penalty |
| High thirst (> 80% of max) | 0–0.5 per tick (scales linearly) | Stacks with hunger penalty |

HP penalty formula:

```
penalty = max_penalty × (stat - threshold) / (max_stat - threshold)
```

Defaults: `threshold_fraction = 0.8`, `max_penalty = 0.5`.

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

### Death Conditions

- HP reaches 0 → death
- Age exceeds `max_age` → death

Hunger, thirst, and energy **do not kill directly**. High hunger/thirst drain HP over time, and zero energy forces sleep.

---

## Combat

Triggered when a carnivore reaches an adjacent prey tile.

```
damage = attacker.attackPower − (defender.defense × defense_factor)
minimum damage = min_damage
```

- Defender's `hp` is reduced by `damage`
- If defender HP ≤ 0 → defender dies
- On kill: attacker recovers hunger (−80), energy (+25), and HP (+15)
- Cooldown and damage coefficients are species-configurable via `combat` in `animalSpecies.js`

**Defaults:** `cooldown = 3`, `defense_factor = 0.5`, `min_damage = 1`
