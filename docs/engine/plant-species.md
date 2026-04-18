# Plant Species Registry

Navigation: [Documentation Home](../README.md) > [Engine](README.md) > [Current Document](plant-species.md)
Return to [Documentation Home](../README.md).

`plantSpecies.js` is the **single source of truth** for all plant data. Stage timing fields are authored in **game minutes**, and `flora.js` consumes tick-based lookup tables derived from those values.

---

## Species Table

The table below shows the **effective default tick thresholds** produced when `ticks_per_day = 500`. The source registry now authors stage timing in game-time units and converts those values during config build.

| Species | TypeId | Reproduction | Water Affinity | Edible Stages | Stage Ages (seed→young→adult→max) |
|---------|--------|-------------|----------------|---------------|-----------------------------------|
| 🌱 Grass | 1 | Seed | low (1) | Seed, Adult | 8, 29, 56, 365 |
| 🍓 Strawberry | 2 | Fruit | medium (2) | Seed, Fruit | 19, 77, 192, 769 |
| 🫐 Blueberry | 3 | Fruit | medium (2) | Seed, Fruit | 29, 106, 269, 1058 |
| 🍎 Apple Tree | 4 | Fruit | high (3) | Seed, Fruit | 67, 269, 673, 3077 |
| 🥭 Mango Tree | 5 | Fruit | high (3) | Seed, Fruit | 77, 346, 808, 3461 |
| 🥕 Carrot | 6 | Seed | low (1) | Seed, Adult | 15, 67, 154, 673 |
| 🌻 Sunflower | 7 | Seed | medium (2) | Seed, Adult | 15, 73, 192, 961 |
| 🍅 Tomato | 8 | Fruit | high (3) | Seed, Fruit | 19, 86, 231, 865 |
| 🍄 Mushroom | 9 | Seed | low (1) | Seed, Adult | 11, 42, 96, 423 |
| 🌳 Oak Tree | 10 | Seed | high (3) | Seed | 96, 423, 961, 4808 |
| 🌵 Cactus | 11 | Seed | none (0) | Seed | 58, 231, 577, 3077 |
| 🌴 Coconut Palm | 12 | Fruit | high (3) | Seed, Fruit | 115, 500, 1115, 4615 |
| 🥔 Potato | 13 | Seed | low (1) | Seed, Adult | 23, 81, 183, 808 |
| 🌶️ Chili Pepper | 14 | Fruit | medium (2) | Seed, Fruit | 21, 89, 240, 961 |
| 🫒 Olive Tree | 15 | Fruit | medium (2) | Seed, Fruit | 106, 461, 1077, 5000 |
| 🌼 Edelweiss | 16 | Seed | low (1) | Seed, Adult | 19, 77, 173, 769 |

---

## Exports

| Export | Type | Description |
|--------|------|-------------|
| `PLANT_SPECIES` | Object | Full registry keyed by species ID |
| `ALL_PLANT_IDS` | Array | All 16 plant species keys |
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
