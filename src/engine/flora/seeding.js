import { PLANT_IDS } from '../plantSpecies.js';
import { idxToXY, shuffleInPlace } from '../helpers.js';
import { DIRT, FERTILE_SOIL, MOUNTAIN, MUD, ROCK, SAND, SOIL } from '../world.js';
import { STAGE_AGES } from './lookups.js';
import { _canPlantGrow, _pickInitialStageAndAge, _pickPlantTypeByWaterProximity } from './helpers.js';

export function seedInitialPlants(world) {
  const density = world.config.initial_plant_density ?? 0.15;
  const width = world.width;
  const height = world.height;
  const stageAgesMap = world.config.plant_stage_ages || STAGE_AGES;

  const eligible = [];
  for (let i = 0; i < width * height; i++) {
    const terrain = world.terrain[i];
    if (terrain === SOIL || terrain === DIRT || terrain === FERTILE_SOIL || terrain === ROCK || terrain === MOUNTAIN || terrain === MUD || terrain === SAND) {
      eligible.push(i);
    }
  }

  const nPlants = Math.floor(eligible.length * density);
  shuffleInPlace(eligible);

  const seedPlantAt = (idx, ptype) => {
    const ages = stageAgesMap[ptype];
    const { stage, age } = _pickInitialStageAndAge(ages, world);

    world.plantType[idx] = ptype;
    world.plantStage[idx] = stage;
    world.plantAge[idx] = age;
    world.activePlantTiles.add(idx);
    world.clearPlantLog(idx);
    world.logPlantEvent(idx, 'PLANTED', { stage });
  };

  const configuredCounts = world.config.initial_plant_counts || null;
  const hasConfiguredPlantCounts = configuredCounts && Object.values(configuredCounts).some(value => (value || 0) > 0);

  if (hasConfiguredPlantCounts && nPlants > 0) {
    const validEntries = Object.entries(configuredCounts)
      .map(([id, count]) => [PLANT_IDS[id], Math.max(0, Math.round(Number(count) || 0))])
      .filter(([ptype, count]) => ptype != null && count > 0);

    if (validEntries.length > 0) {
      const requestedTotal = validEntries.reduce((sum, [, count]) => sum + count, 0);
      const scale = requestedTotal > nPlants ? (nPlants / requestedTotal) : 1;

      const normalized = validEntries.map(([ptype, count]) => {
        const scaled = count * scale;
        return { ptype, floor: Math.floor(scaled), frac: scaled - Math.floor(scaled) };
      });

      let assigned = normalized.reduce((sum, entry) => sum + entry.floor, 0);
      const slotsLeft = Math.max(0, nPlants - assigned);
      normalized.sort((a, b) => b.frac - a.frac);
      for (let i = 0; i < slotsLeft && i < normalized.length; i++) {
        normalized[i].floor += 1;
      }

      const terrainBuckets = {};
      for (const idx of eligible) {
        const terrain = world.terrain[idx];
        for (const entry of normalized) {
          if (_canPlantGrow(terrain, entry.ptype)) {
            if (!terrainBuckets[entry.ptype]) terrainBuckets[entry.ptype] = [];
            terrainBuckets[entry.ptype].push(idx);
          }
        }
      }

      for (const ptypeKey of Object.keys(terrainBuckets)) {
        shuffleInPlace(terrainBuckets[ptypeKey]);
      }

      const used = new Set();
      let seeded = 0;
      for (const entry of normalized) {
        const bucket = terrainBuckets[entry.ptype] || [];
        let placedForType = 0;
        while (placedForType < entry.floor && bucket.length > 0 && seeded < nPlants) {
          const idx = bucket.pop();
          if (used.has(idx)) continue;
          used.add(idx);
          seedPlantAt(idx, entry.ptype);
          placedForType += 1;
          seeded += 1;
        }
      }

      for (const idx of eligible) {
        if (seeded >= nPlants) break;
        if (used.has(idx)) continue;

        const ptype = _pickPlantTypeByWaterProximity(world.waterProximity[idx], world);
        if (!_canPlantGrow(world.terrain[idx], ptype)) continue;

        used.add(idx);
        seedPlantAt(idx, ptype);
        seeded += 1;
      }

      return;
    }
  }

  for (let n = 0; n < nPlants && n < eligible.length; n++) {
    const idx = eligible[n];
    const ptype = _pickPlantTypeByWaterProximity(world.waterProximity[idx], world);
    if (!_canPlantGrow(world.terrain[idx], ptype)) continue;
    seedPlantAt(idx, ptype);
  }
}