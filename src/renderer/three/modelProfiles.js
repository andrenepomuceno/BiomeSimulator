import {
  TREE_MODEL_URLS,
  PLANT_MODEL_URLS,
  DEAD_TREE_MODEL_URL,
  ENTITY_MODEL_URLS,
  ITEM_MODEL_URLS,
} from './rendererConfig.js';

export const MODEL_SIDEWAYS_RATIO_THRESHOLD = 1.15;

// All models that need a 90° X rotation to stand upright.
// Keys are URL constants from rendererConfig.js so changes propagate automatically.
export const MODEL_ROTATE_X_OVERRIDES_BY_URL = {
  [DEAD_TREE_MODEL_URL]: Math.PI / 2,
  [PLANT_MODEL_URLS[13]]: Math.PI / 2,  // crops_leafsStageA
  [PLANT_MODEL_URLS[16]]: Math.PI / 2,  // flower_purpleB
  [PLANT_MODEL_URLS[7]]:  Math.PI / 2,  // flower_yellowC
  [PLANT_MODEL_URLS[1]]:  Math.PI / 2,  // grass_leafs
  [PLANT_MODEL_URLS[3]]:  Math.PI / 2,  // plant_bushDetailed
  [PLANT_MODEL_URLS[2]]:  Math.PI / 2,  // plant_bushSmall
  [PLANT_MODEL_URLS[8]]:  Math.PI / 2,  // tomato
  [PLANT_MODEL_URLS[9]]:  Math.PI / 2,  // mushroom_red
  [PLANT_MODEL_URLS[14]]: Math.PI / 2,  // pepper
  [ENTITY_MODEL_URLS.SQUIRREL]: Math.PI / 2,  // animal-beaver
  [ENTITY_MODEL_URLS.GOAT]:     Math.PI / 2,  // animal-cow
  [ENTITY_MODEL_URLS.FOX]:      Math.PI / 2,  // animal-fox
  [ENTITY_MODEL_URLS.WOLF]:     Math.PI / 2,  // animal-dog
  [ENTITY_MODEL_URLS.BOAR]:     Math.PI / 2,  // animal-hog
  [ENTITY_MODEL_URLS.BEAR]:     Math.PI / 2,  // animal-polar
  [ENTITY_MODEL_URLS.RACCOON]:  Math.PI / 2,  // animal-cat
  [ENTITY_MODEL_URLS.CROW]:     Math.PI / 2,  // animal-parrot (also used by HAWK)
  '/model-assets/animals/animal-crab.glb': Math.PI / 2,
  [ITEM_MODEL_URLS[2]]: Math.PI / 2,  // apple
  [ITEM_MODEL_URLS[1]]: Math.PI / 2,  // meat-cooked
  [ITEM_MODEL_URLS[3]]: Math.PI / 2,  // pumpkin-basic
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
