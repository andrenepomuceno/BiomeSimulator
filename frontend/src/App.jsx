/**
 * App — main layout wiring canvas, sidebar, toolbar, and all hooks together.
 */
import React, { useRef, useEffect, useCallback } from 'react';
import useSimStore from './store/simulationStore';
import { useSimulation } from './hooks/useSimulation';
import { useEditor } from './hooks/useEditor';
import { GameRenderer } from './renderer/GameRenderer';
import { fetchMsgpack } from './utils/msgpack';
import Toolbar from './components/Toolbar';
import ControlPanel from './components/ControlPanel';
import TerrainEditor from './components/TerrainEditor';
import EntityInspector from './components/EntityInspector';
import StatsPanel from './components/StatsPanel';
import Minimap from './components/Minimap';

export default function App() {
  const canvasContainerRef = useRef(null);
  const rendererRef = useRef(null);
  const { sendViewport } = useSimulation();
  const { handleTileClick } = useEditor(rendererRef);

  const {
    terrainData, mapWidth, mapHeight, animals, plantChanges,
    clock, stats, setTerrain, setSimState, setStats, setStatsHistory,
  } = useSimStore();

  // Initialize renderer
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const onViewportChange = (vp) => {
      sendViewport(vp);
      useSimStore.getState().setViewport(vp);
    };

    const onTileClick = (x, y) => {
      handleTileClick(x, y);
    };

    const renderer = new GameRenderer(canvasContainerRef.current, onViewportChange, onTileClick);
    rendererRef.current = renderer;

    // Initial map generation
    _generateMap();

    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, []);

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

  // Fetch stats periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        if (data.current) setStats(data.current);
        if (data.history) setStatsHistory(data.history);
      } catch (e) { /* ignore */ }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // --- Actions ---

  async function _generateMap(params = {}) {
    try {
      const data = await fetchMsgpack('/api/map/generate', {
        method: 'POST',
        body: JSON.stringify(params),
      });

      const terrainArr = new Uint8Array(data.terrain);
      setTerrain(terrainArr, data.width, data.height);

      if (rendererRef.current) {
        rendererRef.current.setTerrain(terrainArr, data.width, data.height);
      }

      // Get initial sim state
      const statusRes = await fetch('/api/sim/status');
      const status = await statusRes.json();
      setSimState({ running: status.running, paused: status.paused, tps: status.tps });
      if (status.stats) setStats(status.stats);
    } catch (e) {
      console.error('Failed to generate map:', e);
    }
  }

  async function _handleStart() {
    await fetch('/api/sim/start', { method: 'POST' });
    setSimState({ running: true, paused: false });
  }

  async function _handlePause() {
    await fetch('/api/sim/pause', { method: 'POST' });
    setSimState({ paused: true });
  }

  async function _handleResume() {
    await fetch('/api/sim/resume', { method: 'POST' });
    setSimState({ paused: false });
  }

  async function _handleStep() {
    await fetch('/api/sim/step', { method: 'POST' });
  }

  async function _handleReset(params = {}) {
    try {
      const data = await fetchMsgpack('/api/sim/reset', {
        method: 'POST',
        body: JSON.stringify(params),
      });
      const terrainArr = new Uint8Array(data.terrain);
      setTerrain(terrainArr, data.width, data.height);
      if (rendererRef.current) {
        rendererRef.current.setTerrain(terrainArr, data.width, data.height);
      }
      setSimState({ running: false, paused: true });
    } catch (e) {
      console.error('Failed to reset:', e);
    }
  }

  async function _handleSpeedChange(tps) {
    useSimStore.getState().setSimState({ tps });
    await fetch('/api/sim/speed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tps }),
    });
  }

  function _handleMinimapNavigate(x, y) {
    if (rendererRef.current) {
      rendererRef.current.centerOn(x, y);
    }
  }

  return (
    <div className="app-container">
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <Toolbar
          onStart={_handleStart}
          onPause={_handlePause}
          onResume={_handleResume}
          onStep={_handleStep}
          onReset={() => _handleReset()}
          onSpeedChange={_handleSpeedChange}
        />
        <div className="canvas-area" ref={canvasContainerRef} />
      </div>

      <div className="sidebar">
        <EntityInspector />
        <TerrainEditor />
        <StatsPanel />
        <Minimap onNavigate={_handleMinimapNavigate} />
        <ControlPanel onRegenerate={_handleReset} />
      </div>
    </div>
  );
}
