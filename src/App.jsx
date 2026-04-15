/**
 * App — main layout wiring canvas, sidebar, toolbar, and all hooks together.
 */
import React, { useRef, useEffect, useState } from 'react';
import packageJson from '../package.json';
import useSimStore from './store/simulationStore';
import { useSimulation } from './hooks/useSimulation';
import { useEditor } from './hooks/useEditor';
import { useAudio } from './hooks/useAudio';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { GameRenderer } from './renderer/GameRenderer';
import Toolbar from './components/Toolbar';
import GameMenu from './components/GameMenu';
import TerrainEditor from './components/TerrainEditor';
import EntityInspector from './components/EntityInspector';
import StatsPanel from './components/StatsPanel';
import Minimap from './components/Minimap';
import SimulationReport from './components/SimulationReport';
import EntitySummaryWindow from './components/EntitySummaryWindow';
import HelpModal from './components/HelpModal';
import SimulationConfigModal from './components/SimulationConfigModal';

const MODALS = {
  MENU: 'menu',
  GUIDE: 'guide',
  CONFIG: 'config',
  REPORT: 'report',
  ENTITIES: 'entities',
};

const DRAWER_BREAKPOINT = 1024;

// Simple debounce implementation for speed slider
function createDebounce(callback, delayMs) {
  let timeoutId = null;
  return function debounced(...args) {
    if (timeoutId !== null) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      callback.apply(this, args);
      timeoutId = null;
    }, delayMs);
  };
}

export default function App() {
  const appVersion = packageJson?.version ?? 'dev';
  const canvasContainerRef = useRef(null);
  const rendererRef = useRef(null);
  const { postCmd, requestTileInfo, requestAnimalDetail } = useSimulation();
  const { handleTileClick } = useEditor(rendererRef);
  const { unlockAudio, updateListenerViewport, playUiClick, playWorldEffect, syncAmbience } = useAudio();
  const [activeModal, setActiveModal] = useState(null);
  const [activeDrawer, setActiveDrawer] = useState(null);
  const [isCompactLayout, setIsCompactLayout] = useState(() => window.innerWidth < DRAWER_BREAKPOINT);
  const debouncedSpeedChangeRef = useRef(null);
  const autoPausedRef = useRef(false);

  const {
    terrainData, mapWidth, mapHeight, animals, plantChanges,
    clock, stats, worldReady, plantSnapshot, selectedEntity, selectedTile, isGeneratingWorld,
  } = useSimStore();

  useEffect(() => {
    const updateLayoutMode = () => {
      const compact = window.innerWidth < DRAWER_BREAKPOINT;
      setIsCompactLayout(compact);
      if (!compact) setActiveDrawer(null);
    };

    updateLayoutMode();
    window.addEventListener('resize', updateLayoutMode);
    return () => window.removeEventListener('resize', updateLayoutMode);
  }, []);

  // Initialize renderer
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const onViewportChange = (vp) => {
      useSimStore.getState().setViewport(vp);
      updateListenerViewport(vp);
    };

    const onTileClick = (x, y) => {
      handleTileClick(x, y);
    };

    const renderer = new GameRenderer(
      canvasContainerRef.current,
      onViewportChange,
      onTileClick,
      playWorldEffect,
    );
    rendererRef.current = renderer;

    // Dev-only automation bridge for capture scripts
    if (import.meta.env.DEV) {
      window.__ecoCapture = {
        getState: () => useSimStore.getState(),
        _subscribe: (fn) => useSimStore.subscribe(fn),
        postCmd: (cmd, data) => postCmd(cmd, data),
        waitForWorld: () => new Promise((resolve) => {
          if (useSimStore.getState().worldReady) { resolve(); return; }
          const unsub = useSimStore.subscribe((state) => {
            if (state.worldReady) { unsub(); resolve(); }
          });
        }),
        waitForTick: (n) => new Promise((resolve) => {
          if (useSimStore.getState().clock.tick >= n) { resolve(); return; }
          const unsub = useSimStore.subscribe((state) => {
            if (state.clock.tick >= n) { unsub(); resolve(); }
          });
        }),
        centerOn: (x, y) => rendererRef.current?.centerOn(x, y),
        setZoom: (z) => rendererRef.current?.setZoom(z),
        capture: () => rendererRef.current?.captureViewport(),
      };
    }

    // Generate initial map via worker
    useSimStore.getState().setGeneratingWorld(true);
    postCmd('generate');

    return () => {
      if (import.meta.env.DEV) delete window.__ecoCapture;
      renderer.destroy();
      rendererRef.current = null;
    };
  }, []);

  // When world is ready from worker, set up renderer
  useEffect(() => {
    if (!worldReady || !rendererRef.current) return;
    const { terrain, plantType, plantStage, width, height, heightmap, waterProximity } = worldReady;

    rendererRef.current.setTerrain(terrain, width, height, heightmap, waterProximity);
    rendererRef.current.plantLayer.setFromArrays(plantType, plantStage, width, height);
  }, [worldReady]);

  // Update entities when animals change
  useEffect(() => {
    if (rendererRef.current) {
      const app = rendererRef.current.app;
      const zoom = rendererRef.current.camera.zoom;
      rendererRef.current.updateEntities(animals, app.renderer, clock.tick, zoom);
    }
  }, [animals]);

  // Update plant changes
  useEffect(() => {
    if (rendererRef.current && plantChanges.length > 0) {
      rendererRef.current.updatePlants(plantChanges);
    }
  }, [plantChanges]);

  useEffect(() => {
    if (!rendererRef.current || !plantSnapshot) return;
    rendererRef.current.plantLayer.setFromArrays(
      plantSnapshot.plantType,
      plantSnapshot.plantStage,
      plantSnapshot.width,
      plantSnapshot.height,
    );
  }, [plantSnapshot]);

  // Update day/night overlay
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.updateDayNight(clock);
    }
  }, [clock.is_night, clock.tick]);

  useEffect(() => {
    syncAmbience(clock);
  }, [clock.is_night, clock.tick_in_day, clock.ticks_per_day, syncAmbience]);

  useEffect(() => {
    const attemptUnlock = () => {
      if (useSimStore.getState().audioSettings.unlocked) return;
      void unlockAudio();
    };

    window.addEventListener('pointerdown', attemptUnlock, true);
    window.addEventListener('keydown', attemptUnlock, true);

    return () => {
      window.removeEventListener('pointerdown', attemptUnlock, true);
      window.removeEventListener('keydown', attemptUnlock, true);
    };
  }, [unlockAudio]);

  // Sync selection marker to renderer
  useEffect(() => {
    if (!rendererRef.current) return;
    if (selectedEntity) {
      rendererRef.current.setSelectedEntity(selectedEntity.id);
    } else if (selectedTile) {
      rendererRef.current.setSelectedTile(selectedTile.x, selectedTile.y);
    } else {
      rendererRef.current.clearSelection();
    }
  }, [selectedEntity, selectedTile]);

  // --- Actions ---

  function _handleStart() {
    playUiClick();
    postCmd('start');
    useSimStore.getState().setSimState({ running: true, paused: false });
  }

  function _handlePause() {
    playUiClick();
    autoPausedRef.current = false;
    postCmd('pause');
    useSimStore.getState().setSimState({ paused: true });
  }

  function _handleResume() {
    playUiClick();
    autoPausedRef.current = false;
    postCmd('resume');
    useSimStore.getState().setSimState({ paused: false });
  }

  function _handleStep() {
    playUiClick();
    postCmd('step');
  }

  function _handleReset() {
    playUiClick();
    postCmd('reset');
    useSimStore.getState().setSimState({ running: false, paused: true });
  }

  function _handleNewGame(params = {}) {
    useSimStore.getState().setGeneratingWorld(true);
    postCmd('generate', { config: params });
    useSimStore.getState().setGameConfig(params);
    useSimStore.getState().setSimState({ running: false, paused: true });
  }

  // Initialize debounced speed handler on first render
  if (!debouncedSpeedChangeRef.current) {
    debouncedSpeedChangeRef.current = createDebounce((tps) => {
      postCmd('setSpeed', { tps });
    }, 250);
  }

  function _handleSpeedChange(tps) {
    // Update UI immediately for snappy feedback
    useSimStore.getState().setSimState({ tps });
    // Send to worker with 250ms debounce to avoid interval recreation spam
    debouncedSpeedChangeRef.current(tps);
  }

  useEffect(() => {
    useSimStore.getState().clearTerrainHistory();
  }, [worldReady?.seed, mapWidth, mapHeight]);

  // Auto-pause when browser tab is hidden
  useEffect(() => {
    function onVisibilityChange() {
      const { running, paused, pauseOnBackground } = useSimStore.getState();
      if (document.hidden) {
        if (pauseOnBackground && running && !paused) {
          postCmd('pause');
          useSimStore.getState().setSimState({ paused: true });
          autoPausedRef.current = true;
        }
      } else {
        if (autoPausedRef.current) {
          postCmd('resume');
          useSimStore.getState().setSimState({ paused: false });
          autoPausedRef.current = false;
        }
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  function _handleMinimapNavigate(x, y) {
    if (isCompactLayout) {
      setActiveDrawer(null);
    }
    if (rendererRef.current) {
      rendererRef.current.centerOn(x, y);
    }
  }

  function _handleFocusEntity(entity) {
    if (!entity) return;
    if (!Number.isFinite(entity.x) || !Number.isFinite(entity.y)) return;
    if (isCompactLayout) {
      setActiveDrawer(null);
    }
    if (rendererRef.current) {
      rendererRef.current.centerOn(entity.x, entity.y);
    }
  }

  function _handleInspectFromSummary(item) {
    if (!item) return;
    if (isCompactLayout) {
      setActiveDrawer(null);
    }
    if (Number.isFinite(item.x) && Number.isFinite(item.y) && rendererRef.current) {
      rendererRef.current.centerOn(item.x, item.y);
    }
    if (item.entityType === 'animal' && item.raw) {
      useSimStore.getState().setSelectedEntity(item.raw);
      return;
    }
    if (item.entityType === 'plant' && Number.isFinite(item.x) && Number.isFinite(item.y)) {
      requestTileInfo(item.x, item.y);
    }
  }

  function _handleSave(callback) {
    playUiClick();
    useSimStore.getState().setSaveCallback(callback);
    postCmd('saveState');
  }

  function _handleLoad(data) {
    postCmd('loadState', { state: data });
    useSimStore.getState().setSimState({ running: false, paused: true });
  }

  function _openModal(modalId) {
    playUiClick();
    setActiveDrawer(null);
    setActiveModal(modalId);
  }

  function _closeModal() {
    if (activeModal) playUiClick();
    setActiveModal(null);
  }

  function _handleToggleBackground() {
    playUiClick();
    const current = useSimStore.getState().pauseOnBackground;
    useSimStore.getState().setPauseOnBackground(!current);
    autoPausedRef.current = false;
  }

  function _handleUndo() {
    const store = useSimStore.getState();
    // Pick the most recently pushed action from either stack (by _seq)
    const terrainTop = store.terrainUndoStack[store.terrainUndoStack.length - 1];
    const entityTop = store.entityUndoStack[store.entityUndoStack.length - 1];
    if (!terrainTop && !entityTop) return;
    const useEntity = entityTop && (!terrainTop || (entityTop._seq || 0) > (terrainTop._seq || 0));
    if (useEntity) {
      const entry = store.popEntityUndoEntry();
      if (!entry) return;
      playUiClick();
      if (entry.kind === 'placedAnimal') {
        if (store.worker) store.worker.postMessage({ cmd: 'removeEntity', entityId: entry.entityId });
        const sel = store.selectedEntity;
        if (sel && sel.id === entry.entityId) store.clearSelection();
      } else if (entry.kind === 'erasedAnimal') {
        store.setPendingEntityPlacement({ targetStack: 'redo' });
        if (store.worker) {
          store.worker.postMessage({ cmd: 'placeEntity', entityType: entry.species, x: entry.x, y: entry.y });
        }
      }
    } else {
      const entry = store.popTerrainUndoEntry();
      if (!entry) return;
      playUiClick();
      store.applyTerrainChanges(entry.undo);
      if (store.worker) store.worker.postMessage({ cmd: 'editTerrain', changes: entry.undo });
      if (rendererRef.current) rendererRef.current.terrainLayer.updateTiles(entry.undo);
    }
  }

  function _handleRedo() {
    const store = useSimStore.getState();
    const terrainTop = store.terrainRedoStack[store.terrainRedoStack.length - 1];
    const entityTop = store.entityRedoStack[store.entityRedoStack.length - 1];
    if (!terrainTop && !entityTop) return;
    const useEntity = entityTop && (!terrainTop || (entityTop._seq || 0) > (terrainTop._seq || 0));
    if (useEntity) {
      const entry = store.popEntityRedoEntry();
      if (!entry) return;
      playUiClick();
      if (entry.kind === 'placedAnimal') {
        store.setPendingEntityPlacement({ targetStack: 'undo' });
        if (store.worker) {
          store.worker.postMessage({ cmd: 'placeEntity', entityType: entry.species, x: entry.x, y: entry.y });
        }
      } else if (entry.kind === 'erasedAnimal') {
        if (store.worker) {
          store.worker.postMessage({ cmd: 'removeEntity', entityId: entry.entityId });
        }
        const sel = store.selectedEntity;
        if (sel && sel.id === entry.entityId) store.clearSelection();
      }
    } else {
      const entry = store.popTerrainRedoEntry();
      if (!entry) return;
      playUiClick();
      store.applyTerrainChanges(entry.redo);
      if (store.worker) {
        store.worker.postMessage({ cmd: 'editTerrain', changes: entry.redo });
      }
      if (rendererRef.current) {
        rendererRef.current.terrainLayer.updateTiles(entry.redo);
      }
    }
  }

  function _handleDrawerToggle(side) {
    playUiClick();
    setActiveDrawer(current => (current === side ? null : side));
  }

  function _closeDrawer() {
    setActiveDrawer(null);
  }

  function _handleUnlockAudio() {
    void unlockAudio();
  }

  useKeyboardShortcuts({
    rendererRef,
    activeModal,
    activeDrawer,
    isCompactLayout,
    setActiveModal,
    setActiveDrawer,
    modals: MODALS,
    playUiClick,
    onStart: _handleStart,
    onPause: _handlePause,
    onResume: _handleResume,
    onStep: _handleStep,
    onSpeedChange: _handleSpeedChange,
    onUndo: _handleUndo,
    onRedo: _handleRedo,
  });

  return (
    <div className="app-container">
      <GameMenu
        open={activeModal === MODALS.MENU}
        onClose={_closeModal}
        onNewGame={(p) => _handleNewGame(p)}
        onSave={_handleSave}
        onLoad={_handleLoad}
      />
      <HelpModal open={activeModal === MODALS.GUIDE} onClose={_closeModal} />
      <SimulationConfigModal
        open={activeModal === MODALS.CONFIG}
        onClose={_closeModal}
        onUnlock={_handleUnlockAudio}
        onToggleBackground={_handleToggleBackground}
      />
      <SimulationReport open={activeModal === MODALS.REPORT} onClose={_closeModal} />
      <EntitySummaryWindow
        open={activeModal === MODALS.ENTITIES}
        onClose={_closeModal}
        onInspect={_handleInspectFromSummary}
      />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <Toolbar
          appVersion={appVersion}
          activeDrawer={activeDrawer}
          isCompactLayout={isCompactLayout}
          onStart={_handleStart}
          onPause={_handlePause}
          onResume={_handleResume}
          onStep={_handleStep}
          onReset={() => _handleReset()}
          onSpeedChange={_handleSpeedChange}
          onMenuToggle={() => _openModal(MODALS.MENU)}
          onGuideToggle={() => _openModal(MODALS.GUIDE)}
          onConfigToggle={() => _openModal(MODALS.CONFIG)}
          onReportToggle={() => _openModal(MODALS.REPORT)}
          onEntitiesToggle={() => _openModal(MODALS.ENTITIES)}
          onLeftSidebarToggle={() => _handleDrawerToggle('left')}
          onRightSidebarToggle={() => _handleDrawerToggle('right')}
        />
        <div className="main-area">
          {isCompactLayout && activeDrawer && (
            <button className="sidebar-drawer-backdrop" aria-label="Close sidebar" onClick={_closeDrawer} />
          )}
          <div className={`sidebar sidebar-left${isCompactLayout ? ' sidebar-drawer' : ''}${activeDrawer === 'left' ? ' open' : ''}`}>
            <div className="sidebar-drawer-header">
              <span>Overview</span>
              <button className="btn btn-sm btn-outline-secondary" onClick={_closeDrawer} aria-label="Close overview panel">
                <i className="bi bi-x-lg" aria-hidden="true" />
              </button>
            </div>
            <Minimap onNavigate={_handleMinimapNavigate} />
            <StatsPanel />
          </div>
          <div className="canvas-area" ref={canvasContainerRef} />
          <div className={`sidebar sidebar-right${isCompactLayout ? ' sidebar-drawer' : ''}${activeDrawer === 'right' ? ' open' : ''}`}>
            <div className="sidebar-drawer-header">
              <span>Inspector</span>
              <button className="btn btn-sm btn-outline-secondary" onClick={_closeDrawer} aria-label="Close inspector panel">
                <i className="bi bi-x-lg" aria-hidden="true" />
              </button>
            </div>
            <EntityInspector onFocusEntity={_handleFocusEntity} requestAnimalDetail={requestAnimalDetail} />
            <TerrainEditor />
          </div>
          {isGeneratingWorld && (
            <div className="world-loading-overlay" role="status" aria-live="polite" aria-label="Generating world">
              <div className="world-loading-card">
                <div className="spinner-border text-info" aria-hidden="true" />
                <div>
                  <div className="world-loading-title">Generating world</div>
                  <div className="world-loading-subtitle">Building terrain, plants, and starting populations.</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
