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
    const isOnTile = (animal) => (animal.x | 0) === x && (animal.y | 0) === y;

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
        const { animals, eggs, selectedEntity } = state;
        // Prefer the selected entity if it's alive and on the clicked tile
        const target =
          (selectedEntity && selectedEntity.alive && isOnTile(selectedEntity))
            ? selectedEntity
            : animals.find(a => a.alive && isOnTile(a))
              || (eggs || []).find(eg => eg.alive && isOnTile(eg));
        if (target) {
          worker.postMessage({ cmd: 'removeEntity', entityId: target.id, isEgg: !!target.isEgg });
        }
        break;
      }
    }
  }, [rendererRef]);

  return { handleTileClick };
}
