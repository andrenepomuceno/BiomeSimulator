/**
 * useSimulation hook — manages Web Worker and sim state syncing.
 */
import { useEffect, useRef, useCallback } from 'react';
import useSimStore from '../store/simulationStore.js';

const TILE_INFO_REFRESH_INTERVAL = 10;
const ANIMAL_DETAIL_REFRESH_INTERVAL = 10;

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
          const waterProximity = new Uint8Array(msg.waterProximity);
          const heightmap = msg.heightmap ? new Float32Array(msg.heightmap) : null;
          store.setGeneratingWorld(false);
          store.setTerrain(terrain, msg.width, msg.height);
          store.setAnimals(msg.animals || []);
          store.setClock(msg.clock);
          if (msg.climate) store.setClimate(msg.climate);
          if (msg.config?.ticks_per_second != null) {
            store.setSimState({ tps: msg.config.ticks_per_second });
          }
          if (msg.hungerMultiplier != null) store.setHungerMultiplier(msg.hungerMultiplier);
          if (msg.thirstMultiplier != null) store.setThirstMultiplier(msg.thirstMultiplier);
          if (msg.config) {
            store.setGameConfig(msg.config);
          } else if (msg.max_animal_population != null) {
            store.setGameConfig({ max_animal_population: msg.max_animal_population });
          }
          store.setPlantSnapshot(null);
          // Store plant arrays for renderer (App.jsx reads these)
          useSimStore.setState({
            worldReady: {
              terrain, plantType, plantStage, waterProximity, heightmap,
              width: msg.width, height: msg.height, seed: msg.seed,
            },
            groundItems: new Map(),
            itemSnapshot: null,
            selectedItem: null,
          });
          break;
        }

        case 'tick':
          if (msg.clock) store.setClock(msg.clock);
          if (msg.climate) store.setClimate(msg.climate);
          if (msg.animals) {
            if (msg.incremental) {
              // Incremental update: merge deltas into existing animals map
              store.mergeAnimalDeltas(msg.animals, msg.animalsDead || []);
            } else {
              store.setAnimals(msg.animals);
            }
            // Update selected entity with fresh data if one is inspected
            // Re-read state after the update to avoid a stale snapshot
            const freshState = useSimStore.getState();
            const sel = freshState.selectedEntity;
            if (sel && !sel._gone) {
              const updated = freshState.animals.find(a => a.id === sel.id);
              if (updated) {
                // Only update store if meaningful fields changed
                if (updated.hp !== sel.hp || updated.energy !== sel.energy ||
                    updated.hunger !== sel.hunger || updated.thirst !== sel.thirst ||
                    updated.state !== sel.state || updated.age !== sel.age ||
                    updated.x !== sel.x || updated.y !== sel.y ||
                    updated.alive !== sel.alive || updated.pregnant !== sel.pregnant ||
                    updated.lifeStage !== sel.lifeStage ||
                    updated.mateCooldown !== sel.mateCooldown ||
                    updated.attackCooldown !== sel.attackCooldown ||
                    updated.direction !== sel.direction ||
                    updated.gestationTimer !== sel.gestationTimer) {
                  // Merge tick data into existing selection to preserve detail fields
                  // (_birthTick, homeX/Y, actionHistory, _tileTerrain, etc.)
                  store.setSelectedEntity({ ...sel, ...updated });
                }
              } else {
                store.clearSelection(); // entity died / removed
              }
            }
            // Periodically request full detail for inspected animal (actionHistory, nav context)
            if (sel && sel.alive && workerRef.current && msg.clock &&
                (msg.clock.tick % ANIMAL_DETAIL_REFRESH_INTERVAL === 0)) {
              workerRef.current.postMessage({ cmd: 'getAnimalDetail', id: sel.id });
            }
          }
          if (msg.plantChanges) store.setPltChanges(msg.plantChanges);
          if (msg.fruitChanges) store.setFruitChanges(msg.fruitChanges);
          if (msg.itemChanges) store.setItemChanges(msg.itemChanges);
          if (msg.itemsFullSync) {
            store.setItemSnapshot({
              items: msg.itemsFullSync,
              version: msg.clock?.tick ?? Date.now(),
            });
          }
          if (msg.plantsFullSync) {
            store.setPlantSnapshot({
              width: msg.plantsFullSync.width,
              height: msg.plantsFullSync.height,
              plantType: new Uint8Array(msg.plantsFullSync.plantType),
              plantStage: new Uint8Array(msg.plantsFullSync.plantStage),
              version: msg.clock?.tick ?? Date.now(),
            });
          }
          if (msg.stats) store.setStats(msg.stats);
          if (msg.statsHistory) store.setStatsHistory(msg.statsHistory);
          if (msg.profiling && msg.profiling.engine) {
            store.setEngineProfile(msg.profiling.engine);
          }
          const isPaintingTerrain = store.tool === 'PAINT_TERRAIN';
          if (msg.supervisorReport && !isPaintingTerrain) {
            store.pushSupervisorFlash({
              id: `sv-${msg.supervisorReport.tick}-${Date.now()}`,
              tick: msg.supervisorReport.tick,
              issueCount: msg.supervisorReport.issueCount,
              countsByType: msg.supervisorReport.countsByType,
              samples: msg.supervisorReport.samples,
              at: Date.now(),
            });
          }
          // Refresh selected tile info each tick so plant data stays current
          {
            const tile = store.selectedTile;
            const shouldRefreshTile = tile && workerRef.current && msg.clock && (msg.clock.tick % TILE_INFO_REFRESH_INTERVAL === 0);
            if (shouldRefreshTile) {
              workerRef.current.postMessage({ cmd: 'getTileInfo', x: tile.x, y: tile.y, refreshOnly: true });
            }
          }
          break;

        case 'tileInfo':
          if (msg.info) {
            // Apply selection-target filters
            const targets = useSimStore.getState().selectionTargets;
            const filtered = { ...msg.info };
            if (!targets.animals) filtered.animals = [];
            if (!targets.plants) filtered.plant = null;
            if (!targets.items) filtered.items = [];

            if (msg.refreshOnly) {
              // Periodic refresh — only update if still viewing the same tile
              const currentTile = useSimStore.getState().selectedTile;
              if (currentTile && currentTile.x === msg.x && currentTile.y === msg.y) {
                store.setSelectedTile({ x: msg.x, y: msg.y, ...filtered });
              }
            } else {
              // Fresh click: auto-select lone targets only on otherwise empty tiles; mixed tiles open tile view
              const tileAnimals = filtered.animals || [];
              const tileItems = filtered.items || [];
              const hasPlant = !!(filtered.plant?.type);
              if (tileAnimals.length === 1 && !hasPlant && tileItems.length === 0) {
                store.setSelectedEntity(tileAnimals[0]);
                // Also request detailed info (actionHistory, nav context)
                if (workerRef.current) {
                  workerRef.current.postMessage({ cmd: 'getAnimalDetail', id: tileAnimals[0].id });
                }
              } else if (tileAnimals.length === 0 && !hasPlant && tileItems.length === 1) {
                // Auto-select a lone item on an otherwise empty tile
                const fromStore = useSimStore.getState().groundItems.get(tileItems[0].id);
                store.setSelectedItem(fromStore || tileItems[0]);
              } else if (tileAnimals.length > 0 || hasPlant || tileItems.length > 0 || targets.terrain) {
                store.setSelectedTile({ x: msg.x, y: msg.y, ...filtered });
              }
              // If nothing matched filters, skip selection entirely
            }
          }
          break;

        case 'animalDetail':
          if (msg.detail) {
            // Only apply if the same entity is still selected (guard against stale responses)
            const currentSel = useSimStore.getState().selectedEntity;
            if (currentSel && currentSel.id === msg.id) {
              store.setSelectedEntity({ ...currentSel, ...msg.detail });
            }
          }
          break;

        case 'entityPlaced': {
          const placed = msg.entity;
          const pending = store.shiftPendingEntityPlacement();

          if (!placed) {
            store.pushUiToast({
              variant: 'warning',
              title: 'Placement failed',
              message: msg.error || 'Cannot place entity on this tile.',
            });
            break;
          }

          // Plant placements return { type, x, y } and do not participate in entity undo stacks.
          if (placed.id == null) {
            if (Array.isArray(msg.plantChange) && msg.plantChange.length === 4) {
              store.setPltChanges([msg.plantChange]);
            }
            const selectedTile = store.selectedTile;
            if (selectedTile && selectedTile.x === (placed.x | 0) && selectedTile.y === (placed.y | 0)) {
              workerRef.current?.postMessage({ cmd: 'getTileInfo', x: selectedTile.x, y: selectedTile.y });
            }
            break;
          }

          // Animal placements should appear immediately instead of waiting for next tick payload.
          store.mergeAnimalDeltas([placed], []);

          if (pending?.targetStack === 'undo') {
            store.updateTopEntityUndoEntryId(placed.id);
            break;
          }
          if (pending?.targetStack === 'redo') {
            store.updateTopEntityRedoEntryId(placed.id);
            break;
          }

          store.pushEntityUndoEntry({
            kind: 'placedAnimal',
            entityId: placed.id,
            species: placed.species,
            x: placed.x | 0,
            y: placed.y | 0,
          });
          break;
        }

        case 'entityRemoved':
          if (msg.ok && msg.entityId != null) {
            store.removeAnimalById(msg.entityId);
          }
          break;

        case 'savedState': {
          const cb = store._saveCallback;
          if (cb && msg.data) {
            cb(msg.data);
            store.setSaveCallback(null);
          }
          break;
        }
      }
    };

    worker.onerror = (e) => {
      useSimStore.getState().setGeneratingWorld(false);
      console.error('[SimWorker] Uncaught worker error:', e.message, e);
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
      useSimStore.getState().setWorker(null);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const postCmd = useCallback((cmd, data = {}) => {
    if (workerRef.current) {
      workerRef.current.postMessage({ cmd, ...data });
    }
  }, []);

  const requestTileInfo = useCallback((x, y) => {
    if (!workerRef.current) return;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    workerRef.current.postMessage({ cmd: 'getTileInfo', x, y });
  }, []);

  const requestAnimalDetail = useCallback((id) => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({ cmd: 'getAnimalDetail', id });
  }, []);

  return { postCmd, requestTileInfo, requestAnimalDetail };
}
