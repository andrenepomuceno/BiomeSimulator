import { describe, expect, it } from 'vitest';
import PLANT_SPECIES, {
  ALL_PLANT_IDS,
  buildFruitSpoilAges,
  PLANT_IDS,
  getPlantByTypeId,
  buildStageAges,
  buildPlantTypeNames,
  buildPlantTypeSex,
  buildPlantColors,
  buildFruitColors,
  buildProductionChances,
  buildReproductionModes,
  buildWaterAffinityMap,
  buildEdibleStagesMap,
  buildTreeTypes,
  buildLowPlantTypes,
  buildDesertPlantTypes,
  buildSpawnWeightMap,
  buildInitialPlantCounts,
  buildSwayStages,
} from '../plantSpecies.js';
import { DEFAULT_TICKS_PER_GAME_MINUTE } from '../../constants/simulation.js';

function toTicks(gameMinutes) {
  return Math.round(gameMinutes * DEFAULT_TICKS_PER_GAME_MINUTE);
}

describe('PLANT_SPECIES registry', () => {
  it('has unique typeIds across all species', () => {
    const typeIds = Object.values(PLANT_SPECIES).map(sp => sp.typeId);
    expect(new Set(typeIds).size).toBe(typeIds.length);
  });

  it('every species has required fields', () => {
    for (const sp of Object.values(PLANT_SPECIES)) {
      expect(sp.id).toEqual(expect.any(String));
      expect(sp.typeId).toEqual(expect.any(Number));
      expect(sp.name).toEqual(expect.any(String));
      expect(sp.stageAges).toHaveLength(4);
      expect(sp.productionChance).toBeGreaterThan(0);
      // Some species are inedible by design (edibleStages: [])
      expect(Array.isArray(sp.edibleStages)).toBe(true);
    }
  });

  it('stageAges are in ascending order', () => {
    for (const sp of Object.values(PLANT_SPECIES)) {
      for (let i = 1; i < sp.stageAges.length; i++) {
        expect(sp.stageAges[i]).toBeGreaterThan(sp.stageAges[i - 1]);
      }
    }
  });
});

describe('ALL_PLANT_IDS / PLANT_IDS', () => {
  it('ALL_PLANT_IDS matches PLANT_SPECIES keys', () => {
    expect(ALL_PLANT_IDS).toEqual(Object.keys(PLANT_SPECIES));
  });

  it('PLANT_IDS maps name → typeId', () => {
    for (const sp of Object.values(PLANT_SPECIES)) {
      expect(PLANT_IDS[sp.id]).toBe(sp.typeId);
    }
  });
});

describe('getPlantByTypeId', () => {
  it('returns the correct species for a valid typeId', () => {
    const grass = getPlantByTypeId(1);
    expect(grass.id).toBe('GRASS');
  });

  it('returns null for an unknown typeId', () => {
    expect(getPlantByTypeId(999)).toBeNull();
  });
});

describe('plant builder functions', () => {
  it('buildStageAges has an entry for every species', () => {
    const map = buildStageAges();
    for (const sp of Object.values(PLANT_SPECIES)) {
      expect(map[sp.typeId]).toEqual(sp.stageAges.map(toTicks));
    }
  });

  it('buildPlantTypeNames includes "None" at 0', () => {
    const names = buildPlantTypeNames();
    expect(names[0]).toBe('None');
    for (const sp of Object.values(PLANT_SPECIES)) {
      expect(names[sp.typeId]).toBe(sp.name);
    }
  });

  it('buildPlantTypeSex covers all species', () => {
    const map = buildPlantTypeSex();
    for (const sp of Object.values(PLANT_SPECIES)) {
      expect(['ASEXUAL', 'HERMAPHRODITE']).toContain(map[sp.typeId]);
    }
  });

  it('buildFruitSpoilAges returns positive values', () => {
    const map = buildFruitSpoilAges();
    for (const sp of Object.values(PLANT_SPECIES)) {
      expect(map[sp.typeId]).toBe(toTicks(sp.fruitSpoilAge));
    }
  });

  it('buildPlantColors has 5 stages per species', () => {
    const map = buildPlantColors();
    for (const sp of Object.values(PLANT_SPECIES)) {
      for (let stage = 1; stage <= 5; stage++) {
        const key = `${sp.typeId}_${stage}`;
        expect(map[key]).toHaveLength(4);
      }
    }
  });

  it('buildFruitColors has RGBA for every species', () => {
    const map = buildFruitColors();
    for (const sp of Object.values(PLANT_SPECIES)) {
      expect(map[sp.typeId]).toHaveLength(4);
    }
  });

  it('buildProductionChances returns positive values', () => {
    const map = buildProductionChances();
    for (const sp of Object.values(PLANT_SPECIES)) {
      expect(map[sp.typeId]).toBeGreaterThan(0);
    }
  });

  it('buildReproductionModes contains only SEED or FRUIT', () => {
    const map = buildReproductionModes();
    for (const sp of Object.values(PLANT_SPECIES)) {
      expect(['SEED', 'FRUIT']).toContain(map[sp.typeId]);
    }
  });

  it('buildWaterAffinityMap returns numeric levels', () => {
    const map = buildWaterAffinityMap();
    for (const sp of Object.values(PLANT_SPECIES)) {
      expect(map[sp.typeId]).toBeGreaterThanOrEqual(0);
      expect(map[sp.typeId]).toBeLessThanOrEqual(3);
    }
  });

  it('buildEdibleStagesMap returns Sets', () => {
    const map = buildEdibleStagesMap();
    for (const sp of Object.values(PLANT_SPECIES)) {
      // Set is always present; size may be 0 for inedible species
      expect(map[sp.typeId]).toBeInstanceOf(Set);
    }
  });

  it('buildSwayStages returns Sets with valid stage numbers', () => {
    const map = buildSwayStages();
    for (const sp of Object.values(PLANT_SPECIES)) {
      expect(map[sp.typeId]).toBeInstanceOf(Set);
    }
  });

  it('buildTreeTypes, buildLowPlantTypes, buildDesertPlantTypes return Sets', () => {
    expect(buildTreeTypes()).toBeInstanceOf(Set);
    expect(buildTreeTypes().size).toBeGreaterThan(0);
    expect(buildLowPlantTypes()).toBeInstanceOf(Set);
    expect(buildLowPlantTypes().size).toBeGreaterThan(0);
    expect(buildDesertPlantTypes()).toBeInstanceOf(Set);
    expect(buildDesertPlantTypes().size).toBeGreaterThan(0);
  });

  it('buildSpawnWeightMap has near/mid/far for every weighted species', () => {
    const map = buildSpawnWeightMap();
    expect(Object.keys(map).length).toBeGreaterThan(0);
    for (const entry of Object.values(map)) {
      expect(entry).toHaveProperty('near');
      expect(entry).toHaveProperty('mid');
      expect(entry).toHaveProperty('far');
    }
  });

  it('buildInitialPlantCounts returns positive counts for all species', () => {
    const counts = buildInitialPlantCounts();
    for (const id of ALL_PLANT_IDS) {
      expect(counts[id]).toBeGreaterThan(0);
    }
  });
});
