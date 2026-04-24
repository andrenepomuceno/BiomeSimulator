// @vitest-environment jsdom
import React, { StrictMode } from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const {
  postCmdMock,
  requestTileInfoMock,
  requestAnimalDetailMock,
  createRendererMock,
  createdRenderers,
} = vi.hoisted(() => ({
  postCmdMock: vi.fn(),
  requestTileInfoMock: vi.fn(),
  requestAnimalDetailMock: vi.fn(),
  createRendererMock: vi.fn(),
  createdRenderers: [],
}));

function makeRendererStub() {
  return {
    camera: { zoom: 4 },
    setTerrain: vi.fn(),
    setPlantSnapshot: vi.fn(),
    setItems: vi.fn(),
    updateEntities: vi.fn(),
    updatePlants: vi.fn(),
    updateItems: vi.fn(),
    updateDayNight: vi.fn(),
    setSelectedEntity: vi.fn(),
    setSelectedTile: vi.fn(),
    clearSelection: vi.fn(),
    prepareAssets: vi.fn(async () => {}),
    getNativeRenderer: vi.fn(() => ({})),
    updateTerrainTiles: vi.fn(),
    centerOn: vi.fn(),
    setZoom: vi.fn(),
    captureViewport: vi.fn(() => ({ dataUrl: '', meta: {} })),
    destroy: vi.fn(),
  };
}

vi.mock('../hooks/useSimulation', () => ({
  useSimulation: () => ({
    postCmd: postCmdMock,
    requestTileInfo: requestTileInfoMock,
    requestAnimalDetail: requestAnimalDetailMock,
  }),
}));

vi.mock('../hooks/useEditor', () => ({
  useEditor: () => ({ handleTileClick: vi.fn() }),
}));

vi.mock('../hooks/useAudio', () => ({
  useAudio: () => ({
    unlockAudio: vi.fn(),
    prepareAudioAssets: vi.fn(async () => {}),
    updateListenerViewport: vi.fn(),
    playUiClick: vi.fn(),
    playWorldEffect: vi.fn(),
    syncAmbience: vi.fn(),
    setAudioLogging: vi.fn(),
  }),
}));

vi.mock('../hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: vi.fn(),
}));

vi.mock('../renderer/rendererFactory', () => ({
  createRenderer: (...args) => createRendererMock(...args),
}));

vi.mock('../config/featureFlags.js', () => ({
  IS_DEV: false,
  IS_PROD: true,
  FF_AUDIO_LOG_UI: false,
  FF_CAPTURE_BRIDGE: false,
}));

// Keep App tests focused on lifecycle behavior; UI components are irrelevant here.
vi.mock('../components/Toolbar', () => ({ default: () => null }));
vi.mock('../components/GameMenu', () => ({ default: () => null }));
vi.mock('../components/TerrainEditor', () => ({ default: () => null }));
vi.mock('../components/EntityInspector', () => ({ default: () => null }));
vi.mock('../components/StatsPanel', () => ({ default: () => null }));
vi.mock('../components/Minimap', () => ({ default: () => null }));
vi.mock('../components/FlashMessages', () => ({ default: () => null }));
vi.mock('../components/UiToasts', () => ({ default: () => null }));
vi.mock('../components/SimulationReport', () => ({ default: () => null }));
vi.mock('../components/EntitySummaryWindow', () => ({ default: () => null }));
vi.mock('../components/HelpModal', () => ({ default: () => null }));
vi.mock('../components/SimulationConfigModal', () => ({ default: () => null }));
vi.mock('../components/DevDebugModal', () => ({ default: () => null }));

import App from '../App.jsx';
import useSimStore from '../store/simulationStore.js';

const flushEffects = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('App renderer lifecycle regressions', () => {
  let container;
  let root;

  beforeEach(() => {
    postCmdMock.mockReset();
    requestTileInfoMock.mockReset();
    requestAnimalDetailMock.mockReset();
    createRendererMock.mockReset();
    createdRenderers.length = 0;

    createRendererMock.mockImplementation(() => {
      const renderer = makeRendererStub();
      createdRenderers.push(renderer);
      return renderer;
    });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    useSimStore.setState({
      terrainData: null,
      mapWidth: 0,
      mapHeight: 0,
      animals: [],
      plantChanges: [],
      itemChanges: [],
      clock: { tick: 0, tick_in_day: 0, ticks_per_day: 260, is_night: false },
      stats: {},
      worldReady: null,
      worldReadyVersion: 0,
      plantSnapshot: null,
      itemSnapshot: null,
      selectedEntity: null,
      selectedTile: null,
      selectedItem: null,
      isGeneratingWorld: false,
      isPreparingAssets: false,
      assetPreparationTitle: '',
      assetPreparationSubtitle: '',
      autoPauseOnModalOpen: true,
      rendererMode: 'pixi',
      paused: true,
      running: false,
    });
  });

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root.unmount();
      });
    }
    if (container?.parentNode) container.parentNode.removeChild(container);
    container = null;
    root = null;
  });

  it('re-issues generate under StrictMode double-invoke before worldReady', async () => {
    await act(async () => {
      root.render(
        <StrictMode>
          <App />
        </StrictMode>
      );
    });

    await flushEffects();

    const generateCalls = postCmdMock.mock.calls.filter(([cmd]) => cmd === 'generate');
    expect(generateCalls.length).toBeGreaterThanOrEqual(2);
  });

  it('does not regenerate world when only rendererMode changes after worldReady', async () => {
    await act(async () => {
      root.render(<App />);
    });
    await flushEffects();

    const generateCallsBefore = postCmdMock.mock.calls.filter(([cmd]) => cmd === 'generate').length;
    expect(generateCallsBefore).toBe(1);

    const worldReady = {
      terrain: new Uint8Array([3, 3, 3, 3]),
      plantType: new Uint8Array([0, 0, 0, 0]),
      plantStage: new Uint8Array([0, 0, 0, 0]),
      waterProximity: new Uint8Array([0, 0, 0, 0]),
      heightmap: new Float32Array([0, 0, 0, 0]),
      width: 2,
      height: 2,
      seed: 1,
    };

    act(() => {
      useSimStore.setState((state) => ({
        worldReady,
        worldReadyVersion: (state.worldReadyVersion || 0) + 1,
      }));
    });
    await flushEffects();

    act(() => {
      useSimStore.getState().setRendererMode('three');
    });
    await flushEffects();

    const generateCallsAfter = postCmdMock.mock.calls.filter(([cmd]) => cmd === 'generate').length;
    expect(generateCallsAfter).toBe(1);
    expect(createRendererMock).toHaveBeenCalledTimes(2);
    expect(createdRenderers[0].destroy).toHaveBeenCalledTimes(1);
  });

  it('falls back to pixi and shows a toast when three renderer init fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      root.render(<App />);
    });
    await flushEffects();

    const worldReady = {
      terrain: new Uint8Array([3, 3, 3, 3]),
      plantType: new Uint8Array([0, 0, 0, 0]),
      plantStage: new Uint8Array([0, 0, 0, 0]),
      waterProximity: new Uint8Array([0, 0, 0, 0]),
      heightmap: new Float32Array([0, 0, 0, 0]),
      width: 2,
      height: 2,
      seed: 1,
    };

    act(() => {
      useSimStore.setState((state) => ({
        worldReady,
        worldReadyVersion: (state.worldReadyVersion || 0) + 1,
      }));
    });
    await flushEffects();

    let firstThreeFailure = true;
    createRendererMock.mockImplementation((mode) => {
      if (mode === 'three' && firstThreeFailure) {
        firstThreeFailure = false;
        throw new Error('Three init failed');
      }
      const renderer = makeRendererStub();
      createdRenderers.push(renderer);
      return renderer;
    });

    act(() => {
      useSimStore.getState().setRendererMode('three');
    });
    await flushEffects();

    const state = useSimStore.getState();
    expect(state.rendererMode).toBe('pixi');
    expect(state.uiToasts.some(t => String(t.title).includes('Renderer fallback'))).toBe(true);
    expect(createRendererMock.mock.calls.some(([mode]) => mode === 'three')).toBe(true);
    expect(createRendererMock.mock.calls.some(([mode]) => mode === 'pixi')).toBe(true);

    errorSpy.mockRestore();
  });
});
