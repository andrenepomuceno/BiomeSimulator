import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function createModelAssetLoader() {
  const loader = new GLTFLoader();
  const cache = new Map();
  const pending = new Set();

  const buildFallbackUrls = (url) => {
    const out = [];
    const add = (candidate) => {
      if (typeof candidate !== 'string' || !candidate) return;
      if (!out.includes(candidate)) out.push(candidate);
    };

    const raw = String(url || '').trim();
    const noOrigin = raw.replace(/^https?:\/\/[^/]+/i, '');
    const noBiomePrefix = noOrigin.replace(/^\/BiomeSimulator\//, '/');
    const noLeadingSlash = noBiomePrefix.replace(/^\/+/, '');

    const rootVariant = `/${noLeadingSlash}`;
    const biomeVariant = `/BiomeSimulator/${noLeadingSlash}`;
    const relativeVariant = noLeadingSlash;

    const path = typeof window !== 'undefined' ? window.location.pathname : '/';
    const prefersBiome = path.startsWith('/BiomeSimulator/');

    // Try the most likely host base first to reduce noisy 404s in console.
    if (prefersBiome) {
      add(biomeVariant);
      add(rootVariant);
    } else {
      add(rootVariant);
      add(biomeVariant);
    }

    add(url);

    // Keep a relative fallback as last resort for unusual hosting setups.
    add(relativeVariant);

    return out;
  };

  const loadWithFallback = (urls, onSuccess, onError, index = 0) => {
    if (index >= urls.length) {
      onError?.();
      return;
    }

    const candidate = urls[index];
    loader.load(
      candidate,
      (gltf) => onSuccess?.(gltf),
      undefined,
      () => loadWithFallback(urls, onSuccess, onError, index + 1)
    );
  };

  const ensureLoaded = (key, url, onReady) => {
    if (cache.has(key) || pending.has(key)) return;
    if (!url) {
      cache.set(key, null);
      return;
    }

    pending.add(key);
    const urlCandidates = buildFallbackUrls(url);
    loadWithFallback(
      urlCandidates,
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
