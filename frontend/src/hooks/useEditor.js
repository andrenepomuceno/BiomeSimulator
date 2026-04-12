/**
 * useEditor hook — handles terrain painting, entity placement, and tile inspection.
 */
import { useCallback } from 'react';
import useSimStore from '../store/simulationStore';

export function useEditor(rendererRef) {
  const handleTileClick = useCallback((x, y) => {
    const state = useSimStore.getState();
    const worker = state.worker;
    if (!worker) return;

    switch (state.tool) {
      case 'SELECT':
        worker.postMessage({ cmd: 'getTileInfo', x, y });
        break;

      case 'PAINT_TERRAIN': {
        const bs = state.brushSize;
        const pt = state.paintTerrain;
        const changes = [];
        for (let dy = -bs + 1; dy < bs; dy++) {
          for (let dx = -bs + 1; dx < bs; dx++) {
            changes.push({ x: x + dx, y: y + dy, terrain: pt });
          }
        }
        worker.postMessage({ cmd: 'editTerrain', changes });
        // Instant visual feedback
        if (rendererRef.current) {
          rendererRef.current.terrainLayer.updateTiles(changes);
        }
        break;
      }

      case 'PLACE_ENTITY':
        worker.postMessage({ cmd: 'placeEntity', entityType: state.placeEntityType, x, y });
        break;

      case 'ERASE': {
        const animals = state.animals;
        const animal = animals.find(a => a.x === x && a.y === y);
        if (animal) {
          worker.postMessage({ cmd: 'removeEntity', entityId: animal.id });
        }
        break;
      }
    }
  }, [rendererRef]);

  return { handleTileClick };
}
