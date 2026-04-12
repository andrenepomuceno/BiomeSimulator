/**
 * useEditor hook — handles terrain painting, entity placement, and tile inspection.
 */
import { useCallback } from 'react';
import useSimStore from '../store/simulationStore';
import { fetchMsgpack } from '../utils/msgpack';

export function useEditor(rendererRef) {
  const {
    tool, paintTerrain, brushSize, placeEntityType,
    setSelectedEntity, setSelectedTile,
  } = useSimStore();

  const handleTileClick = useCallback(async (x, y) => {
    const currentTool = useSimStore.getState().tool;

    switch (currentTool) {
      case 'SELECT':
        await _inspectTile(x, y);
        break;

      case 'PAINT_TERRAIN':
        await _paintTerrain(x, y);
        break;

      case 'PLACE_ENTITY':
        await _placeEntity(x, y);
        break;

      case 'ERASE':
        await _eraseTile(x, y);
        break;
    }
  }, []);

  async function _inspectTile(x, y) {
    try {
      const res = await fetch(`/api/tile/${x}/${y}`);
      const data = await res.json();

      // Check if there's an animal on this tile
      const animals = useSimStore.getState().animals;
      const animal = animals.find(a => a.x === x && a.y === y);

      if (animal) {
        // Fetch full entity details
        const eres = await fetch(`/api/entity/${animal.id}`);
        const edata = await eres.json();
        setSelectedEntity(edata);
      } else {
        setSelectedTile(data);
      }
    } catch (e) {
      console.warn('Inspect failed:', e);
    }
  }

  async function _paintTerrain(x, y) {
    const state = useSimStore.getState();
    const bs = state.brushSize;
    const pt = state.paintTerrain;

    const changes = [];
    for (let dy = -bs + 1; dy < bs; dy++) {
      for (let dx = -bs + 1; dx < bs; dx++) {
        changes.push({ x: x + dx, y: y + dy, terrain: pt });
      }
    }

    try {
      await fetch('/api/map/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes }),
      });

      // Update terrain locally for instant feedback
      if (rendererRef.current) {
        rendererRef.current.terrainLayer.updateTiles(changes);
      }
    } catch (e) {
      console.warn('Paint failed:', e);
    }
  }

  async function _placeEntity(x, y) {
    const state = useSimStore.getState();
    try {
      await fetch('/api/entity/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: state.placeEntityType, x, y }),
      });
    } catch (e) {
      console.warn('Place entity failed:', e);
    }
  }

  async function _eraseTile(x, y) {
    // Check if there's an animal to remove
    const animals = useSimStore.getState().animals;
    const animal = animals.find(a => a.x === x && a.y === y);
    if (animal) {
      try {
        await fetch(`/api/entity/${animal.id}`, { method: 'DELETE' });
      } catch (e) {
        console.warn('Erase failed:', e);
      }
    }
  }

  return { handleTileClick };
}
