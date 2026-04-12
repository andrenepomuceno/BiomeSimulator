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

export default function App() {
  const canvasContainerRef = useRef(null);
  const rendererRef = useRef(null);
  const { postCmd } = useSimulation();
  const { handleTileClick } = useEditor(rendererRef);
  const [menuOpen, setMenuOpen] = useState(false);

  const {
    terrainData, mapWidth, mapHeight, animals, plantChanges,
    clock, stats, worldReady, selectedEntity, selectedTile,
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
    const { terrain, plantType, plantStage, width, height } = worldReady;

    rendererRef.current.setTerrain(terrain, width, height);
    rendererRef.current.plantLayer.setFromArrays(plantType, plantStage, width, height);
  }, [worldReady]);

  // Update entities when animals change
  useEffect(() => {
    if (rendererRef.current && animals.length >= 0) {
      const app = rendererRef.current.app;
      rendererRef.current.entityLayer.update(animals, app.renderer);
    }
  }, [animals]);

  // Update plant changes
  useEffect(() => {
    if (rendererRef.current && plantChanges.length > 0) {
      rendererRef.current.updatePlants(plantChanges);
    }
  }, [plantChanges]);

  // Update night overlay
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setNight(clock.is_night);
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
    useSimStore.getState().setSimState({ running: false, paused: true });
  }

  function _handleSpeedChange(tps) {
    useSimStore.getState().setSimState({ tps });
    postCmd('setSpeed', { tps });
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
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <Toolbar
          onStart={_handleStart}
          onPause={_handlePause}
          onResume={_handleResume}
          onStep={_handleStep}
          onReset={() => _handleReset()}
          onSpeedChange={_handleSpeedChange}
          onMenuToggle={() => setMenuOpen(true)}
        />
        <div className="main-area">
          <div className="sidebar sidebar-left">
            <Minimap onNavigate={_handleMinimapNavigate} />
            <StatsPanel />
          </div>
          <div className="canvas-area" ref={canvasContainerRef} />
          <div className="sidebar sidebar-right">
            <EntityInspector />
            <TerrainEditor />
          </div>
        </div>
      </div>
    </div>
  );
}
