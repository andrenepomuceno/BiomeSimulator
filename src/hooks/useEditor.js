/**
 * useEditor hook — handles terrain painting, entity placement, and tile inspection.
 */
import { useCallback } from 'react';
import useSimStore from '../store/simulationStore.js';

export function useEditor(rendererRef) {
  const handleTileClick = useCallback((x, y) => {
    const state = useSimStore.getState();
    const worker = state.worker;
    if (!worker) return;
    const isOnTile = (animal) => (animal.x | 0) === x && (animal.y | 0) === y;

    switch (state.tool) {
      case 'SELECT':
        worker.postMessage({ cmd: 'getTileInfo', x, y });
        break;

      case 'PAINT_TERRAIN': {
        const bs = state.brushSize;
        const pt = state.paintTerrain;
        const redo = [];
        const undo = [];
        const seen = new Set();
        for (let dy = -bs + 1; dy < bs; dy++) {
          for (let dx = -bs + 1; dx < bs; dx++) {
            const tx = x + dx;
            const ty = y + dy;
            if (tx < 0 || ty < 0 || tx >= state.mapWidth || ty >= state.mapHeight) continue;
            const key = `${tx}:${ty}`;
            if (seen.has(key)) continue;
            seen.add(key);
            const idx = ty * state.mapWidth + tx;
            const previousTerrain = state.terrainData?.[idx];
            if (previousTerrain == null || previousTerrain === pt) continue;
            redo.push({ x: tx, y: ty, terrain: pt });
            undo.push({ x: tx, y: ty, terrain: previousTerrain });
          }
        }
        if (redo.length === 0) break;
        worker.postMessage({ cmd: 'editTerrain', changes: redo });
        state.applyTerrainChanges(redo);
        state.pushTerrainHistoryEntry({ undo, redo });
        // Instant visual feedback
        if (rendererRef.current) {
          rendererRef.current.terrainLayer.updateTiles(redo);
        }
        break;
      }

      case 'PLACE_ENTITY':
        worker.postMessage({ cmd: 'placeEntity', entityType: state.placeEntityType, x, y });
        break;

      case 'ERASE': {
        const { animals, selectedEntity } = state;
        // Prefer the selected entity if it's alive and on the clicked tile
        const target =
          (selectedEntity && selectedEntity.alive && isOnTile(selectedEntity))
            ? selectedEntity
            : animals.find(a => a.alive && isOnTile(a));
        if (target) {
          state.pushEntityUndoEntry({
            kind: 'erasedAnimal',
            entityId: target.id,
            species: target.species,
            x: target.x | 0,
            y: target.y | 0,
          });
          worker.postMessage({ cmd: 'removeEntity', entityId: target.id });
        }
        break;
      }
    }
  }, [rendererRef]);

  return { handleTileClick };
}
