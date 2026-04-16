/**
 * Ground item system — independent item entities (meat, fruit, seed) that
 * exist on the world grid and can be consumed by animals or transform over time.
 *
 * Worker-safe: no DOM, no Pixi, no React refs.
 */

/** Item type constants. */
export const ITEM_TYPE = Object.freeze({
  MEAT:  1,
  FRUIT: 2,
  SEED:  3,
});

/** Nutrition restored when an animal eats an item. */
export const ITEM_NUTRITION = {
  [ITEM_TYPE.MEAT]:  { hunger: 65, energy: 20, hp: 12 },
  [ITEM_TYPE.FRUIT]: { hunger: 40, energy: 6,  hp: 6  },
  [ITEM_TYPE.SEED]:  { hunger: 15, energy: 2,  hp: 2  },
};

/** Human-readable labels for logging. */
export const ITEM_TYPE_NAMES = {
  [ITEM_TYPE.MEAT]:  'meat',
  [ITEM_TYPE.FRUIT]: 'fruit',
  [ITEM_TYPE.SEED]:  'seed',
};

/**
 * Derives meat size category from species mass field.
 * Returns [minCount, maxCount] for uniform random drop.
 */
export function meatDropRange(mass) {
  if (mass === 'large')  return [0, 3];
  if (mass === 'medium') return [0, 2];
  return [0, 1]; // small
}

/** Partition constants for worker-safe unique IDs. */
export const ITEM_ID_BASE  = 2_000_000_000; // well above animal/egg ID space
let _localCounter = 0;

/**
 * Returns a locally unique item ID. In sub-workers, pass a workerBase offset
 * so IDs from different workers don't collide.
 */
export function nextItemId(workerBase = ITEM_ID_BASE) {
  return workerBase + (++_localCounter);
}

/** Reset counter (used only in headless tests). */
export function resetItemIdCounter() {
  _localCounter = 0;
}

export class GroundItem {
  /**
   * @param {number} id        - Unique item ID.
   * @param {number} x         - Tile X.
   * @param {number} y         - Tile Y.
   * @param {number} type      - ITEM_TYPE constant.
   * @param {string} source    - Species id or plant type id that produced this item.
   * @param {number} createdTick - World tick when the item was created.
   */
  constructor(id, x, y, type, source, createdTick) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.type = type;
    this.source = source;
    this.createdTick = createdTick;
    this.consumed = false;
  }

  /** Lightweight delta for worker messages and renderer sync. */
  toDelta() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      type: this.type,
      source: this.source,
      createdTick: this.createdTick,
      consumed: this.consumed,
    };
  }
}
