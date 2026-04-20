import {
  TREE_MODEL_URLS,
  PLANT_MODEL_URLS,
  DEAD_TREE_MODEL_URL,
  ENTITY_MODEL_URLS,
  ITEM_MODEL_URLS,
} from './threeRendererConfig.js';

export const MODEL_SIDEWAYS_RATIO_THRESHOLD = 1.15;

export const MODEL_ROTATE_X_OVERRIDES_BY_URL = {
  [DEAD_TREE_MODEL_URL]: Math.PI / 2,
  '/model-assets/animals/animal-beaver.glb': Math.PI / 2,
  '/model-assets/animals/animal-cow.glb': Math.PI / 2,
  '/model-assets/animals/animal-fox.glb': Math.PI / 2,
  '/model-assets/animals/animal-dog.glb': Math.PI / 2,
  '/model-assets/animals/animal-hog.glb': Math.PI / 2,
  '/model-assets/animals/animal-polar.glb': Math.PI / 2,
  '/model-assets/animals/animal-cat.glb': Math.PI / 2,
  '/model-assets/animals/animal-parrot.glb': Math.PI / 2,
  '/model-assets/animals/animal-crab.glb': Math.PI / 2,
};

function uniqueSorted(urls) {
  const filtered = urls.filter((url) => typeof url === 'string' && url.endsWith('.glb'));
  return [...new Set(filtered)].sort();
}

export function getModelRotateXOverride(modelUrl) {
  return MODEL_ROTATE_X_OVERRIDES_BY_URL[modelUrl] ?? null;
}

export function shouldAutoRotateModel(size) {
  if (!size) return false;
  return size.y > size.z * MODEL_SIDEWAYS_RATIO_THRESHOLD;
}

export function buildRuntimeModelCatalog() {
  const natureUrls = uniqueSorted([
    ...Object.values(TREE_MODEL_URLS),
    ...Object.values(PLANT_MODEL_URLS),
    DEAD_TREE_MODEL_URL,
  ]);

  return new Map([
    ['Nature', natureUrls],
    ['Animals', uniqueSorted(Object.values(ENTITY_MODEL_URLS))],
    ['Items', uniqueSorted(Object.values(ITEM_MODEL_URLS))],
  ]);
}

export function getAllRuntimeModelUrls() {
  const catalog = buildRuntimeModelCatalog();
  return uniqueSorted([...catalog.values()].flat());
}
