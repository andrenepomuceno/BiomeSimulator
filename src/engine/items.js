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
 * Derives meat drop range from a numeric mass_kg value.
 * Thresholds match massCategory(): ≥80=large, ≥5=medium, else small.
 * @param {number} mass_kg
 * @returns {[number, number]} [minCount, maxCount]
 */
export function meatDropRange(mass_kg) {
  if (mass_kg >= 80) return [2, 3]; // large: always drops 2-3
  if (mass_kg >= 5)  return [1, 2]; // medium: always drops 1-2
  return [1, 1]; // small: always drops exactly 1
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
  /**
   * @param {number} id
   * @param {number} x
   * @param {number} y
   * @param {number} type        - ITEM_TYPE constant.
   * @param {string|number} source - Species id or plant typeId that produced this item.
   * @param {number} createdTick
   * @param {number} [germinationTicks] - Ticks until a SEED item disappears (per-species).
   */
  constructor(id, x, y, type, source, createdTick, germinationTicks = 0) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.type = type;
    this.source = source;
    this.createdTick = createdTick;
    this.germinationTicks = germinationTicks; // per-species seed lifetime (0 = use global fallback)
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
      germinationTicks: this.germinationTicks,
      consumed: this.consumed,
    };
  }
}
