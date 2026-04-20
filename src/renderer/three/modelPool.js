import * as THREE from 'three';

/**
 * Generic pooled-model manager for GLTF/clone-based THREE.Object3D instances.
 * Handles acquire, release, normalization, and full cleanup.
 *
 * Used by plant (tree) and entity layers to avoid duplicating the same
 * model-pool logic.
 */
export class ThreeModelPool {
  constructor(parentGroup, assetLoader) {
    this._parentGroup = parentGroup;
    this._assetLoader = assetLoader;
    this._instances = new Map();  // key → THREE.Object3D
    this._pools = new Map();      // modelKey → Array<THREE.Object3D>
  }

  /** Trigger an async load of the model template if not already cached. */
  ensureLoaded(modelKey, url, onReady) {
    this._assetLoader.ensureLoaded(modelKey, url, onReady);
  }

  /** Returns true if the template for `modelKey` is ready for cloning. */
  isReady(modelKey) {
    return Boolean(this._assetLoader.getTemplate(modelKey));
  }

  /**
   * Get or clone a model for `instanceKey`.
   * Returns null if the template is not yet loaded.
   * `normalizeFn` is called on freshly cloned meshes (e.g. Y-up fix).
   */
  acquire(instanceKey, modelKey, normalizeFn) {
    let model = this._instances.get(instanceKey);
    if (model) return model;

    let pool = this._pools.get(modelKey);
    if (!pool) {
      pool = [];
      this._pools.set(modelKey, pool);
    }

    if (pool.length > 0) {
      model = pool.pop();
      model.visible = true;
      this._parentGroup.add(model);
      this._instances.set(instanceKey, model);
      return model;
    }

    const template = this._assetLoader.getTemplate(modelKey);
    if (!template) return null;

    const mesh = template.clone(true);
    if (normalizeFn) normalizeFn(mesh);

    const root = new THREE.Group();
    root.userData.modelKey = modelKey;
    root.add(mesh);
    this._parentGroup.add(root);
    this._instances.set(instanceKey, root);
    return root;
  }

  /** Return a model to its pool. */
  release(instanceKey, modelKey) {
    const model = this._instances.get(instanceKey);
    if (!model) return;
    model.visible = false;
    this._parentGroup.remove(model);
    let pool = this._pools.get(modelKey);
    if (!pool) {
      pool = [];
      this._pools.set(modelKey, pool);
    }
    pool.push(model);
    this._instances.delete(instanceKey);
  }

  /** Release all instances whose keys are NOT in `keepSet`. */
  prune(keepSet, getModelKeyFn) {
    for (const [key, model] of this._instances) {
      if (keepSet.has(key)) continue;
      const modelKey = getModelKeyFn(model);
      if (modelKey != null) {
        this.release(key, modelKey);
      } else {
        this._parentGroup.remove(model);
        this._instances.delete(key);
      }
    }
  }

  /** Release every active instance. */
  releaseAll(getModelKeyFn) {
    for (const [key, model] of this._instances) {
      const modelKey = getModelKeyFn ? getModelKeyFn(model) : null;
      if (modelKey != null) {
        model.visible = false;
        this._parentGroup.remove(model);
        let pool = this._pools.get(modelKey);
        if (!pool) {
          pool = [];
          this._pools.set(modelKey, pool);
        }
        pool.push(model);
      } else {
        this._parentGroup.remove(model);
      }
    }
    this._instances.clear();
  }

  get(instanceKey) {
    return this._instances.get(instanceKey);
  }

  has(instanceKey) {
    return this._instances.has(instanceKey);
  }

  destroy() {
    this.releaseAll();
    const disposeDeep = (obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) m.dispose();
      }
      if (obj.children) obj.children.forEach(disposeDeep);
    };
    for (const pool of this._pools.values()) {
      for (const model of pool) {
        this._parentGroup.remove(model);
        disposeDeep(model);
      }
    }
    this._pools.clear();
    this._instances.clear();
    this._assetLoader.clear();
  }
}
