/**
 * Spatial hash grid for O(1) neighbor lookups.
 */
import { benchmarkAdd, benchmarkEnd, benchmarkStart } from './benchmarkProfiler.js';

export class SpatialHash {
  constructor(cellSize = 16) {
    this.cellSize = cellSize;
    this._cells = new Map(); // intKey → Map<id, entity>
    this._entityCell = new Map(); // id → intKey
    this._benchmarkCollector = null;
  }

  setBenchmarkCollector(collector) {
    this._benchmarkCollector = collector;
  }

  _key(x, y) {
    // Encode cell coords as single integer: cx + cy * 0x10000
    // Supports cell coords up to ±32767 (maps up to ~524k tiles wide at cellSize=16)
    return (Math.floor(x / this.cellSize) & 0xFFFF) | ((Math.floor(y / this.cellSize) & 0xFFFF) << 16);
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
    const startedAt = benchmarkStart(this._benchmarkCollector);
    const results = [];
    const cellsRange = Math.floor(radius / this.cellSize) + 1;
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const rSq = radius * radius;
    const cells = this._cells;

    for (let dx = -cellsRange; dx <= cellsRange; dx++) {
      const kcx = (cx + dx) & 0xFFFF;
      for (let dy = -cellsRange; dy <= cellsRange; dy++) {
        const key = kcx | (((cy + dy) & 0xFFFF) << 16);
        const cell = cells.get(key);
        if (!cell) continue;
        for (const entity of cell.values()) {
          const deltaX = entity.x - x;
          const deltaY = entity.y - y;
          if (deltaX * deltaX + deltaY * deltaY <= rSq) {
            results.push(entity);
          }
        }
      }
    }
    benchmarkEnd(this._benchmarkCollector, 'queryRadius', startedAt);
    benchmarkAdd(this._benchmarkCollector, 'queryRadiusResults', results.length);
    return results;
  }

  rebuild(entities) {
    this.clear();
    for (const e of entities) {
      if (e.alive) this.insert(e);
    }
  }
}
