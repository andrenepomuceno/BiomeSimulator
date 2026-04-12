/**
 * Spatial hash grid for O(1) neighbor lookups.
 */

export class SpatialHash {
  constructor(cellSize = 16) {
    this.cellSize = cellSize;
    this._cells = new Map(); // "cx,cy" → Map<id, entity>
    this._entityCell = new Map(); // id → "cx,cy"
  }

  _key(x, y) {
    return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`;
  }

  clear() {
    this._cells.clear();
    this._entityCell.clear();
  }

  insert(entity) {
    const key = this._key(entity.x, entity.y);
    let cell = this._cells.get(key);
    if (!cell) {
      cell = new Map();
      this._cells.set(key, cell);
    }
    cell.set(entity.id, entity);
    this._entityCell.set(entity.id, key);
  }

  remove(entity) {
    const oldKey = this._entityCell.get(entity.id);
    if (oldKey !== undefined) {
      this._entityCell.delete(entity.id);
      const cell = this._cells.get(oldKey);
      if (cell) {
        cell.delete(entity.id);
        if (cell.size === 0) this._cells.delete(oldKey);
      }
    }
  }

  update(entity) {
    const newKey = this._key(entity.x, entity.y);
    const oldKey = this._entityCell.get(entity.id);
    if (oldKey === newKey) return;
    this.remove(entity);
    this.insert(entity);
  }

  queryRadius(x, y, radius) {
    const results = [];
    const cellsRange = Math.floor(radius / this.cellSize) + 1;
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const rSq = radius * radius;

    for (let dx = -cellsRange; dx <= cellsRange; dx++) {
      for (let dy = -cellsRange; dy <= cellsRange; dy++) {
        const cell = this._cells.get(`${cx + dx},${cy + dy}`);
        if (cell) {
          for (const entity of cell.values()) {
            const distSq = (entity.x - x) ** 2 + (entity.y - y) ** 2;
            if (distSq <= rSq) {
              results.push(entity);
            }
          }
        }
      }
    }
    return results;
  }

  rebuild(entities) {
    this.clear();
    for (const e of entities) {
      if (e.alive) this.insert(e);
    }
  }
}
