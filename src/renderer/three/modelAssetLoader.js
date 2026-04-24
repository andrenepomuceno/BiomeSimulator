import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function createModelAssetLoader() {
  const loader = new GLTFLoader();
  const cache = new Map();
  const pending = new Set();

  const ensureLoaded = (key, url, onReady) => {
    if (cache.has(key) || pending.has(key)) return;
    if (!url) {
      cache.set(key, null);
      return;
    }

    pending.add(key);
    loader.load(
      url,
      (gltf) => {
        const template = gltf?.scene || gltf?.scenes?.[0] || null;
        if (template) {
          template.traverse((node) => {
            if (node.isMesh) {
              node.castShadow = false;
              node.receiveShadow = false;
              if (node.material) {
                node.material.side = 2; // THREE.DoubleSide
                node.material.needsUpdate = true;
              }
            }
          });
        }
        cache.set(key, template);
        pending.delete(key);
        onReady?.(key, template);
      },
      undefined,
      () => {
        cache.set(key, null);
        pending.delete(key);
      }
    );
  };

  return {
    ensureLoaded,
    has: (key) => cache.has(key),
    getTemplate: (key) => cache.get(key),
    isPending: (key) => pending.has(key),
    clear: () => {
      cache.clear();
      pending.clear();
    },
  };
}
