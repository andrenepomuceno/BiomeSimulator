# Reproduction

Navigation: [Documentation Home](../README.md) > [Simulation](README.md) > [Current Document](reproduction.md)
Return to [Documentation Home](../README.md).

```mermaid
flowchart TD
    Start["Animal wants to mate"] --> Adult{"Life Stage\n= ADULT?"}
    Adult -->|No| Fail["❌ Cannot mate"]
    Adult -->|Yes| Energy{"Energy > 50?"}
    Energy -->|No| Fail
    Energy -->|Yes| CD{"Mate cooldown\n= 0?"}
    CD -->|No| Fail
    CD -->|Yes| Mode{Reproduction\nMode?}

    Mode -->|ASEXUAL| PopCheck
    Mode -->|HERMAPHRODITE| FindAny["Find any same-species\nwithin radius 3"]
    Mode -->|SEXUAL| FindOpp["Find opposite-sex\nmate within radius 3"]

    FindAny --> Found{"Mate found?"}
    FindOpp --> Found
    Found -->|No| Fail
    Found -->|Yes| PopCheck{"Population\ncheck"}

    PopCheck --> Cap{"Species count\nvs effective cap"}
    Cap -->|"< 60% cap"| Success["✅ 100% success"]
    Cap -->|"60–100% cap"| Partial["⚠️ Linear decline\n(100% → 0%)"]
    Cap -->|"> 100% cap"| Blocked["❌ 0% success"]

    Success --> Spawn["Baby spawns on\nadjacent walkable tile"]
    Partial -->|"RNG pass"| Spawn
    Spawn --> Cooldown["Both parents get\nmateCooldown = 100 ticks"]
```

---

## Requirements

| Condition | Value |
|-----------|-------|
| Life Stage | `ADULT` (LifeStage 3) |
| Energy | > 50 |
| Mate cooldown | = 0 |
| Nearby mate | Within radius 3 |

---

## Sex Compatibility

| Mode | Rule |
|------|------|
| `SEXUAL` | Requires opposite sex (male + female) |
| `HERMAPHRODITE` | Any two of same species |
| `ASEXUAL` | Reproduces alone |

---

## Offspring

- Baby spawns on an adjacent walkable tile at tile center (`tileX + 0.5, tileY + 0.5`)
- Initial energy: 40% of species max
- Age: 0 (Life Stage: BABY)
- Both parents enter `MATING` state and receive `mateCooldown = 100` ticks

---

## Population Cap

Reproduction is throttled by species population:

- Each species has a `max_population` base cap (varies by tier: 80–800)
- When the global budget `max_animal_population` is set (> 0), effective caps are scaled proportionally:

  ```
  effectiveCap = baseCap × globalBudget / BASE_POP_TOTAL
  ```

- At 60% of effective cap: 100% mating success
- At 100% of effective cap: 0% mating success
- Linear decline between 60–100% capacity

Population count uses `world.getAliveSpeciesCount(species)`, which is lazily cached once per tick to avoid O(N) linear scans.

---

## See Also

- [Animal AI](ai.md) — mating priority in the decision tree (P5)
- [Energy & Needs](energy.md) — energy costs of mating
- [Animal Species Registry](../engine/animal-species.md) — per-species max_population and reproduction mode
- [World & Entities](../engine/world.md) — sex assignment and life stages
