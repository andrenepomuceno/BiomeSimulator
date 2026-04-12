"""Spatial hash grid for O(1) neighbor lookups."""


class SpatialHash:
    """Grid-based spatial hashing for fast proximity queries."""

    def __init__(self, cell_size=16):
        self.cell_size = cell_size
        self._cells = {}
        self._entity_cell = {}  # entity_id -> (cx, cy)

    def _key(self, x, y):
        return (x // self.cell_size, y // self.cell_size)

    def clear(self):
        self._cells.clear()
        self._entity_cell.clear()

    def insert(self, entity):
        key = self._key(entity.x, entity.y)
        if key not in self._cells:
            self._cells[key] = {}
        self._cells[key][entity.id] = entity
        self._entity_cell[entity.id] = key

    def remove(self, entity):
        old_key = self._entity_cell.pop(entity.id, None)
        if old_key and old_key in self._cells:
            self._cells[old_key].pop(entity.id, None)
            if not self._cells[old_key]:
                del self._cells[old_key]

    def update(self, entity):
        """Re-insert entity if it moved to a different cell."""
        new_key = self._key(entity.x, entity.y)
        old_key = self._entity_cell.get(entity.id)
        if old_key == new_key:
            return
        self.remove(entity)
        self.insert(entity)

    def query_radius(self, x, y, radius):
        """Return all entities within `radius` tiles of (x, y)."""
        results = []
        cells_range = (radius // self.cell_size) + 1
        cx, cy = x // self.cell_size, y // self.cell_size
        r_sq = radius * radius

        for dx in range(-cells_range, cells_range + 1):
            for dy in range(-cells_range, cells_range + 1):
                cell = self._cells.get((cx + dx, cy + dy))
                if cell:
                    for entity in cell.values():
                        dist_sq = (entity.x - x) ** 2 + (entity.y - y) ** 2
                        if dist_sq <= r_sq:
                            results.append(entity)
        return results

    def rebuild(self, entities):
        """Rebuild the entire hash from a list of entities."""
        self.clear()
        for e in entities:
            if e.alive:
                self.insert(e)
