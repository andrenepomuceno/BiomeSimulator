# Plant Species Registry

Navigation: [Documentation Home](../README.md) > [Engine](README.md) > [Current Document](plant-species.md)
Return to [Documentation Home](../README.md).

`plantSpecies.js` is the **single source of truth** for all plant data. Stage timing fields are authored in **game minutes**, and `flora.js` consumes tick-based lookup tables derived from those values.

---

## Species Table

The table below shows the **effective default tick thresholds** produced when `ticks_per_day = 260`. The source registry now authors stage timing in game-time units and converts those values during config build.

| Species | TypeId | Reproduction | Water Affinity | Edible Stages | Stage Ages (seed→young→adult→max) |
|---------|--------|-------------|----------------|---------------|-----------------------------------|
| 🌱 Grass | 1 | Seed | low (1) | Seed, Adult | 5, 18, 35, 180 |
| 🍓 Strawberry | 2 | Fruit | medium (2) | Seed, Fruit | 10, 40, 100, 400 |
| 🫐 Blueberry | 3 | Fruit | medium (2) | Seed, Fruit | 15, 55, 140, 550 |
| 🍎 Apple Tree | 4 | Fruit | high (3) | Seed, Fruit | 35, 140, 350, 1600 |
| 🥭 Mango Tree | 5 | Fruit | high (3) | Seed, Fruit | 40, 180, 420, 1800 |
| 🥕 Carrot | 6 | Seed | low (1) | Seed, Adult | 8, 35, 80, 350 |
| 🌻 Sunflower | 7 | Seed | medium (2) | Seed, Adult | 8, 38, 100, 500 |
| 🍅 Tomato | 8 | Fruit | high (3) | Seed, Fruit | 10, 45, 120, 450 |
| 🍄 Mushroom | 9 | Seed | low (1) | Seed, Adult | 6, 22, 50, 220 |
| 🌳 Oak Tree | 10 | Seed | high (3) | Seed | 50, 220, 500, 2500 |
| 🌵 Cactus | 11 | Seed | none (0) | Seed | 30, 120, 300, 1600 |
| 🌴 Coconut Palm | 12 | Fruit | high (3) | Seed, Fruit | 60, 260, 580, 2400 |
| 🥔 Potato | 13 | Seed | low (1) | Seed, Adult | 12, 42, 95, 420 |
| 🌶️ Chili Pepper | 14 | Fruit | medium (2) | Seed, Fruit | 11, 46, 125, 500 |
| 🫒 Olive Tree | 15 | Fruit | medium (2) | Seed, Fruit | 55, 240, 560, 2600 |

---

## Exports

| Export | Type | Description |
|--------|------|-------------|
| `PLANT_SPECIES` | Object | Full registry keyed by species ID |
| `ALL_PLANT_IDS` | Array | All 15 plant species keys |
| `getPlantByTypeId(typeId)` | Function | Lookup plant data by numeric typeId |
| `buildStageAges(ticksPerGameMinute)` | Function | Returns effective tick thresholds per typeId from the authored minute-based registry |
| `buildFruitSpoilAges(ticksPerGameMinute)` | Function | Returns fruit decay thresholds in ticks per typeId |
| `buildPlantColors()` | Function | Returns stage→RGBA colors per typeId |
| `buildPlantEmojiMap()` | Function | Returns stage→emoji per typeId |
| `buildProductionChances()` | Function | Returns seed spreading chance per typeId |
| `buildReproductionModes()` | Function | Returns `SEED` or `FRUIT` per typeId |
| `buildEdibleStagesMap()` | Function | Returns `{typeId: Set([stages...]), ...}` for edible stages |
| `buildWaterAffinityMap()` | Function | Returns `{typeId: numericAffinity, ...}` (0–3) |
| `buildTreeTypes()` | Function | Returns `Set<typeId>` for tree compatibility rules |
| `buildLowPlantTypes()` | Function | Returns `Set<typeId>` for mountain-compatible low plants |
| `buildDesertPlantTypes()` | Function | Returns `Set<typeId>` for sand-compatible desert plants |
| `buildSpawnWeightMap()` | Function | Returns per-type weighted spawn data for near/mid/far water zones |
