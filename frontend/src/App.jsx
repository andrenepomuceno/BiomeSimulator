/**
 * App — main layout wiring canvas, sidebar, toolbar, and all hooks together.
 */
import React, { useRef, useEffect, useCallback, useState } from 'react';
import useSimStore from './store/simulationStore';
import { useSimulation } from './hooks/useSimulation';
import { useEditor } from './hooks/useEditor';
import { GameRenderer } from './renderer/GameRenderer';
import Toolbar from './components/Toolbar';
import GameMenu from './components/GameMenu';
import TerrainEditor from './components/TerrainEditor';
import EntityInspector from './components/EntityInspector';
import StatsPanel from './components/StatsPanel';
import Minimap from './components/Minimap';
import SimulationReport from './components/SimulationReport';
import EntitySummaryWindow from './components/EntitySummaryWindow';

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
  const canvasContainerRef = useRef(null);
  const rendererRef = useRef(null);
  const { postCmd, requestTileInfo } = useSimulation();
  const { handleTileClick } = useEditor(rendererRef);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [entitySummaryOpen, setEntitySummaryOpen] = useState(false);
  const debouncedSpeedChangeRef = useRef(null);

  const {
    terrainData, mapWidth, mapHeight, animals, plantChanges,
    clock, stats, worldReady, plantSnapshot, selectedEntity, selectedTile,
  } = useSimStore();

  // Initialize renderer
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const onViewportChange = (vp) => {
      useSimStore.getState().setViewport(vp);
    };

    const onTileClick = (x, y) => {
      handleTileClick(x, y);
    };

    const renderer = new GameRenderer(canvasContainerRef.current, onViewportChange, onTileClick);
    rendererRef.current = renderer;

    // Generate initial map via worker
    postCmd('generate');

    return () => {
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
    postCmd('start');
    useSimStore.getState().setSimState({ running: true, paused: false });
  }

  function _handlePause() {
    postCmd('pause');
    useSimStore.getState().setSimState({ paused: true });
  }

  function _handleResume() {
    postCmd('resume');
    useSimStore.getState().setSimState({ paused: false });
  }

  function _handleStep() {
    postCmd('step');
  }

  function _handleReset() {
    postCmd('reset');
    useSimStore.getState().setSimState({ running: false, paused: true });
  }

  function _handleNewGame(params = {}) {
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

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e) {
      // Ignore when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        const { running, paused } = useSimStore.getState();
        if (!running) _handleStart();
        else if (paused) _handleResume();
        else _handlePause();
      }

      if (e.code === 'Escape') {
        setMenuOpen(prev => !prev);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function _handleMinimapNavigate(x, y) {
    if (rendererRef.current) {
      rendererRef.current.centerOn(x, y);
    }
  }

  function _handleFocusEntity(entity) {
    if (!entity) return;
    if (!Number.isFinite(entity.x) || !Number.isFinite(entity.y)) return;
    if (rendererRef.current) {
      rendererRef.current.centerOn(entity.x, entity.y);
    }
  }

  function _handleInspectFromSummary(item) {
    if (!item) return;
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
    useSimStore.getState().setSaveCallback(callback);
    postCmd('saveState');
  }

  function _handleLoad(data) {
    postCmd('loadState', { state: data });
    useSimStore.getState().setSimState({ running: false, paused: true });
  }

  return (
    <div className="app-container">
      <GameMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNewGame={(p) => _handleNewGame(p)}
        onSave={_handleSave}
        onLoad={_handleLoad}
      />
      <SimulationReport open={reportOpen} onClose={() => setReportOpen(false)} />
      <EntitySummaryWindow
        open={entitySummaryOpen}
        onClose={() => setEntitySummaryOpen(false)}
        onInspect={_handleInspectFromSummary}
      />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <Toolbar
          onStart={_handleStart}
          onPause={_handlePause}
          onResume={_handleResume}
          onStep={_handleStep}
          onReset={() => _handleReset()}
          onSpeedChange={_handleSpeedChange}
          onMenuToggle={() => setMenuOpen(true)}
          onReportToggle={() => setReportOpen(true)}
          onEntitiesToggle={() => setEntitySummaryOpen(true)}
        />
        <div className="main-area">
          <div className="sidebar sidebar-left">
            <Minimap onNavigate={_handleMinimapNavigate} />
            <StatsPanel />
          </div>
          <div className="canvas-area" ref={canvasContainerRef} />
          <div className="sidebar sidebar-right">
            <EntityInspector onFocusEntity={_handleFocusEntity} />
            <TerrainEditor />
          </div>
        </div>
      </div>
    </div>
  );
}
