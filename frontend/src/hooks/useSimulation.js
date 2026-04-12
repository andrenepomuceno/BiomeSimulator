/**
 * useSimulation hook — manages Web Worker and sim state syncing.
 */
import { useEffect, useRef, useCallback } from 'react';
import useSimStore from '../store/simulationStore';

export function useSimulation() {
  const workerRef = useRef(null);

  useEffect(() => {
    const worker = new Worker(
      new URL('../worker/simWorker.js', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;
    useSimStore.getState().setWorker(worker);

    worker.onmessage = (e) => {
      const msg = e.data;
      const store = useSimStore.getState();

      switch (msg.type) {
        case 'worldReady': {
          const terrain = new Uint8Array(msg.terrain);
          const plantType = new Uint8Array(msg.plantType);
          const plantStage = new Uint8Array(msg.plantStage);
          store.setTerrain(terrain, msg.width, msg.height);
          store.setAnimals(msg.animals || []);
          store.setClock(msg.clock);
          // Store plant arrays for renderer (App.jsx reads these)
          useSimStore.setState({
            worldReady: {
              terrain, plantType, plantStage,
              width: msg.width, height: msg.height, seed: msg.seed,
            },
          });
          break;
        }

        case 'tick':
          if (msg.clock) store.setClock(msg.clock);
          if (msg.animals) store.setAnimals(msg.animals);
          if (msg.plantChanges) store.setPltChanges(msg.plantChanges);
          if (msg.stats) store.setStats(msg.stats);
          if (msg.statsHistory) store.setStatsHistory(msg.statsHistory);
          break;

        case 'tileInfo':
          if (msg.info) {
            if (msg.info.animals && msg.info.animals.length > 0) {
              store.setSelectedEntity(msg.info.animals[0]);
            } else {
              store.setSelectedTile({ x: msg.x, y: msg.y, ...msg.info });
            }
          }
          break;

        case 'entityPlaced':
          // No-op; entity will appear in next tick
          break;

        case 'entityRemoved':
          // No-op; entity will disappear in next tick
          break;
      }
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
      useSimStore.getState().setWorker(null);
    };
  }, []);

  const postCmd = useCallback((cmd, data = {}) => {
    if (workerRef.current) {
      workerRef.current.postMessage({ cmd, ...data });
    }
  }, []);

  return { postCmd };
}
