import ANIMAL_SPECIES, {
  ALL_ANIMAL_IDS,
  getEffectiveAnimalPopulationCap,
  buildProportionalAnimalCounts,
  normalizeAnimalCountsToBudget,
} from '../../engine/animalSpecies';
import { ALL_PLANT_IDS, buildInitialPlantCounts, buildPlantMaxCounts } from '../../engine/plantSpecies';

const NUMBER_FORMATTER = new Intl.NumberFormat('en-US');
export const DEFAULT_PLANT_COUNTS = buildInitialPlantCounts();
export const PLANT_MAX_COUNTS = buildPlantMaxCounts();
export const DEFAULT_MAX_ANIMAL_POPULATION = 10000;
export const DEFAULT_POPULATION_FRACTION = 0.1;

export const MAP_PRESETS = [
  {
    id: 'compact',
    label: 'Compact',
    description: 'Fast setup for a smaller world.',
    values: {
      map_width: 300,
      map_height: 300,
      sea_level: 0.48,
      island_count: 8,
      island_size_factor: 0.22,
      min_land_ratio: 0.35,
      river_count: 3,
      river_width: 2,
    },
  },
  {
    id: 'balanced',
    label: 'Balanced',
    description: 'Default sandbox with room to grow.',
    values: {
      map_width: 500,
      map_height: 500,
      sea_level: 0.46,
      island_count: 8,
      island_size_factor: 0.24,
      min_land_ratio: 0.35,
      river_count: 4,
      river_width: 2,
    },
  },
  {
    id: 'frontier',
    label: 'Frontier',
    description: 'Larger map with broader habitats.',
    values: {
      map_width: 1000,
      map_height: 1000,
      sea_level: 0.44,
      island_count: 10,
      island_size_factor: 0.24,
      min_land_ratio: 0.35,
      river_count: 6,
      river_width: 2,
    },
  },
];

export const FAUNA_PRESETS = {
  balanced: { herbivore: 1.0, carnivore: 1.0, omnivore: 1.0 },
  predators: { herbivore: 0.7, carnivore: 1.35, omnivore: 1.2 },
  herbivores: { herbivore: 1.35, carnivore: 0.65, omnivore: 0.95 },
};

export const FLORA_PRESETS = {
  balanced: 1.0,
  predators: 0.85,
  herbivores: 1.2,
};

export const TABS = ['new', 'save', 'load'];

export function formatNumber(value) {
  return NUMBER_FORMATTER.format(Math.round(value || 0));
}

export function sumValues(values = {}) {
  return Object.values(values).reduce((sum, value) => sum + (value || 0), 0);
}

export function getDisplayedAnimalBudget(globalBudget) {
  if (globalBudget > 0) return globalBudget;
  return ALL_ANIMAL_IDS.reduce((sum, speciesId) => sum + getEffectiveAnimalPopulationCap(speciesId, 0), 0);
}

export function buildDefaultParams() {
  const n0 = Math.round(DEFAULT_POPULATION_FRACTION * DEFAULT_MAX_ANIMAL_POPULATION);
  return {
    map_width: 500,
    map_height: 500,
    sea_level: 0.46,
    island_count: 8,
    island_size_factor: 0.24,
    min_land_ratio: 0.35,
    river_count: 4,
    river_width: 2,
    seed: '',
    initial_population_fraction: DEFAULT_POPULATION_FRACTION,
    initial_animal_counts: buildProportionalAnimalCounts(n0, DEFAULT_MAX_ANIMAL_POPULATION),
    initial_plant_density: 0.1,
    initial_plant_counts: { ...DEFAULT_PLANT_COUNTS },
    max_animal_population: DEFAULT_MAX_ANIMAL_POPULATION,
  };
}

export function randomizeAnimalCounts(maxAnimalPopulation, fraction) {
  const n0 = Math.round(fraction * maxAnimalPopulation);
  const lo = Math.round(0.9 * n0);
  const hi = Math.round(1.1 * n0);
  const randomTotal = lo + Math.floor(Math.random() * (hi - lo + 1));
  return buildProportionalAnimalCounts(randomTotal, maxAnimalPopulation);
}

export function randomizePlantCounts() {
  const counts = {};
  for (const id of ALL_PLANT_IDS) {
    const max = Math.max(20, Math.round(PLANT_MAX_COUNTS[id] || 120));
    const lo = Math.max(5, Math.round(max * 0.15));
    const hi = Math.max(lo, Math.round(max * 0.7));
    counts[id] = lo + Math.floor(Math.random() * (hi - lo + 1));
  }
  return counts;
}

export function applyPresetToAnimals(presetKey, maxAnimalPopulation, fraction) {
  const preset = FAUNA_PRESETS[presetKey] || FAUNA_PRESETS.balanced;
  const n0 = Math.round(fraction * maxAnimalPopulation);
  const base = buildProportionalAnimalCounts(n0, maxAnimalPopulation);
  const counts = {};
  for (const [key, species] of Object.entries(ANIMAL_SPECIES)) {
    const multiplier = species.diet === 'HERBIVORE'
      ? preset.herbivore
      : species.diet === 'CARNIVORE'
        ? preset.carnivore
        : preset.omnivore;
    const effectiveCap = getEffectiveAnimalPopulationCap(key, maxAnimalPopulation);
    const target = Math.round((base[key] || 0) * multiplier);
    counts[key] = Math.min(effectiveCap || target, Math.max(0, target));
  }
  return normalizeAnimalCountsToBudget(counts, maxAnimalPopulation);
}

export function applyPresetToPlants(presetKey) {
  const multiplier = FLORA_PRESETS[presetKey] || 1;
  const counts = {};
  for (const [id, value] of Object.entries(DEFAULT_PLANT_COUNTS)) {
    const max = PLANT_MAX_COUNTS[id] || Math.max(50, value * 4);
    counts[id] = Math.min(max, Math.max(0, Math.round(value * multiplier)));
  }
  return counts;
}
