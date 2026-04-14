import {
  buildStageAges,
  buildFruitSpoilAges,
  buildProductionChances,
  buildReproductionModes,
  buildTerrainGrowthMap,
  buildWaterAffinityMap,
  buildTreeTypes,
  buildLowPlantTypes,
  buildDesertPlantTypes,
  buildSpawnWeightMap,
} from '../plantSpecies.js';

export const STAGE_AGES = buildStageAges();
export const FRUIT_SPOIL_AGES = buildFruitSpoilAges();
export const PRODUCTION_CHANCES = buildProductionChances();
export const REPRODUCTION_MODES = buildReproductionModes();
export const SPECIES_TERRAIN_GROWTH = buildTerrainGrowthMap();
export const WATER_AFFINITY = buildWaterAffinityMap();
export const TREE_TYPES = buildTreeTypes();
export const LOW_PLANT_TYPES = buildLowPlantTypes();
export const DESERT_PLANT_TYPES = buildDesertPlantTypes();
export const SPAWN_WEIGHT_MAP = buildSpawnWeightMap();