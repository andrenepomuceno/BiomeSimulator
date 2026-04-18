/**
 * useEditor hook tests.
 *
 * React's `useCallback` is mocked to the identity function so the hook can be
 * called outside a component render cycle. All side-effects (worker.postMessage,
 * store mutations) are verified directly.
 */

// Mock React before the hook is imported so useCallback becomes an identity fn.
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useCallback: (fn) => fn };
});

import useSimStore from '../../store/simulationStore.js';
import { useEditor } from '../../hooks/useEditor.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build a Uint8Array terrain of size w×h filled with SOIL (3). */
function makeTerrain(w, h, fill = 3) {
  return new Uint8Array(w * h).fill(fill);
}

/** A mock worker that records postMessage calls. */
function makeWorker() {
  return { postMessage: vi.fn() };
}

/** A mock renderer ref with terrain update tracking. */
function makeRendererRef() {
  return { current: { terrainLayer: { updateTiles: vi.fn() } } };
}

// Reset the store before each test so state does not bleed between scenarios.
beforeEach(() => {
  useSimStore.setState({
    tool: 'SELECT',
    worker: null,
    brushSize: 1,
    paintTerrain: 3,
    terrainData: null,
    mapWidth: 0,
    mapHeight: 0,
    animals: [],
    selectedEntity: null,
    placeEntityType: 'DEER',
    terrainUndoStack: [],
    terrainRedoStack: [],
    entityUndoStack: [],
    entityRedoStack: [],
  });
});

// ── SELECT tool ──────────────────────────────────────────────────────────────

describe('useEditor — SELECT tool', () => {
  it('dispatches getTileInfo to the worker', () => {
    const worker = makeWorker();
    useSimStore.setState({ tool: 'SELECT', worker });
    const { handleTileClick } = useEditor(makeRendererRef());
    handleTileClick(4, 7);
    expect(worker.postMessage).toHaveBeenCalledWith({ cmd: 'getTileInfo', x: 4, y: 7 });
  });

  it('does nothing when worker is null', () => {
    useSimStore.setState({ tool: 'SELECT', worker: null });
    // Should not throw
    const { handleTileClick } = useEditor(makeRendererRef());
    expect(() => handleTileClick(0, 0)).not.toThrow();
  });
});

// ── PAINT_TERRAIN tool ───────────────────────────────────────────────────────

describe('useEditor — PAINT_TERRAIN tool', () => {
  const W = 10;
  const H = 10;

  function setupPaint(brushSize, paintTerrain = 5 /* FERTILE_SOIL */) {
    const worker = makeWorker();
    const terrain = makeTerrain(W, H, 3 /* SOIL */);
    useSimStore.setState({
      tool: 'PAINT_TERRAIN',
      worker,
      brushSize,
      paintTerrain,
      terrainData: terrain,
      mapWidth: W,
      mapHeight: H,
    });
    return worker;
  }

  it('dispatches editTerrain when painting over a different terrain type', () => {
    const worker = setupPaint(1);
    const { handleTileClick } = useEditor(makeRendererRef());
    handleTileClick(5, 5);
    expect(worker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ cmd: 'editTerrain' }),
    );
  });

  it('redo changes contain the new terrain value', () => {
    const worker = setupPaint(1);
    const { handleTileClick } = useEditor(makeRendererRef());
    handleTileClick(5, 5);
    const call = worker.postMessage.mock.calls[0][0];
    expect(call.changes).toBeDefined();
    expect(call.changes.every(c => c.terrain === 5)).toBe(true);
  });

  it('does not dispatch when painting the same terrain type', () => {
    const worker = setupPaint(1, 3 /* SOIL — same as existing */);
    const { handleTileClick } = useEditor(makeRendererRef());
    handleTileClick(5, 5);
    expect(worker.postMessage).not.toHaveBeenCalled();
  });

  it('brushSize 1 paints exactly one tile at the target coordinate', () => {
    const worker = setupPaint(1);
    const { handleTileClick } = useEditor(makeRendererRef());
    handleTileClick(5, 5);
    const call = worker.postMessage.mock.calls[0][0];
    expect(call.changes).toHaveLength(1);
    expect(call.changes[0]).toMatchObject({ x: 5, y: 5, terrain: 5 });
  });

  it('brushSize 2 paints a 3×3 area (9 tiles)', () => {
    const worker = setupPaint(2);
    const { handleTileClick } = useEditor(makeRendererRef());
    handleTileClick(5, 5);
    const call = worker.postMessage.mock.calls[0][0];
    // brush 2 → dy/dx in range [-1,0,1] = 3×3 = 9 tiles
    expect(call.changes).toHaveLength(9);
  });

  it('brushSize 3 paints a 5×5 area (25 tiles) when not at map edge', () => {
    const worker = setupPaint(3);
    const { handleTileClick } = useEditor(makeRendererRef());
    handleTileClick(5, 5);
    const call = worker.postMessage.mock.calls[0][0];
    expect(call.changes).toHaveLength(25);
  });

  it('clamps tiles to map boundaries when painting near an edge', () => {
    const worker = setupPaint(2);
    const { handleTileClick } = useEditor(makeRendererRef());
    handleTileClick(0, 0); // top-left corner — brush can only paint the 2×2 quadrant
    const call = worker.postMessage.mock.calls[0][0];
    // All changed tiles must be within [0,W)×[0,H)
    for (const c of call.changes) {
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.y).toBeGreaterThanOrEqual(0);
      expect(c.x).toBeLessThan(W);
      expect(c.y).toBeLessThan(H);
    }
  });

  it('undo array contains the original terrain values for each painted tile', () => {
    const worker = setupPaint(1);
    const rendererRef = makeRendererRef();
    const { handleTileClick } = useEditor(rendererRef);
    handleTileClick(5, 5);

    const { terrainUndoStack } = useSimStore.getState();
    expect(terrainUndoStack).toHaveLength(1);
    const entry = terrainUndoStack[0];
    expect(entry.undo).toHaveLength(1);
    expect(entry.undo[0]).toMatchObject({ x: 5, y: 5, terrain: 3 }); // original SOIL
    expect(entry.redo).toHaveLength(1);
    expect(entry.redo[0]).toMatchObject({ x: 5, y: 5, terrain: 5 }); // new FERTILE_SOIL
  });

  it('updates the in-memory terrainData via applyTerrainChanges', () => {
    const worker = setupPaint(1);
    const { handleTileClick } = useEditor(makeRendererRef());
    handleTileClick(5, 5);

    const { terrainData, mapWidth } = useSimStore.getState();
    const idx = 5 * mapWidth + 5;
    expect(terrainData[idx]).toBe(5); // changed to FERTILE_SOIL
  });

  it('calls rendererRef.current.terrainLayer.updateTiles', () => {
    const worker = setupPaint(1);
    const rendererRef = makeRendererRef();
    const { handleTileClick } = useEditor(rendererRef);
    handleTileClick(5, 5);
    expect(rendererRef.current.terrainLayer.updateTiles).toHaveBeenCalledOnce();
  });
});

// ── PLACE_ENTITY tool ────────────────────────────────────────────────────────

describe('useEditor — PLACE_ENTITY tool', () => {
  it('dispatches placeEntity with entityType and coordinates', () => {
    const worker = makeWorker();
    useSimStore.setState({ tool: 'PLACE_ENTITY', worker, placeEntityType: 'WOLF' });
    const { handleTileClick } = useEditor(makeRendererRef());
    handleTileClick(3, 4);
    expect(worker.postMessage).toHaveBeenCalledWith({
      cmd: 'placeEntity',
      entityType: 'WOLF',
      x: 3,
      y: 4,
      source: 'editor',
    });
  });
});

// ── ERASE tool ───────────────────────────────────────────────────────────────

describe('useEditor — ERASE tool', () => {
  const aliveAnimal = { id: 42, species: 'DEER', alive: true, x: 3, y: 4 };
  const deadAnimal  = { id: 99, species: 'WOLF', alive: false, x: 3, y: 4 };

  it('dispatches removeEntity for the animal on the clicked tile', () => {
    const worker = makeWorker();
    useSimStore.setState({
      tool: 'ERASE',
      worker,
      animals: [aliveAnimal],
      selectedEntity: null,
    });
    const { handleTileClick } = useEditor(makeRendererRef());
    handleTileClick(3, 4);
    expect(worker.postMessage).toHaveBeenCalledWith({
      cmd: 'removeEntity',
      entityId: 42,
    });
  });

  it('prefers the selected entity when it is alive and on the tile', () => {
    const other = { id: 77, species: 'FOX', alive: true, x: 3, y: 4 };
    const worker = makeWorker();
    useSimStore.setState({
      tool: 'ERASE',
      worker,
      animals: [aliveAnimal, other],
      selectedEntity: other,
    });
    const { handleTileClick } = useEditor(makeRendererRef());
    handleTileClick(3, 4);
    expect(worker.postMessage).toHaveBeenCalledWith({
      cmd: 'removeEntity',
      entityId: 77,
    });
  });

  it('ignores dead animals when searching for an erase target', () => {
    const worker = makeWorker();
    useSimStore.setState({
      tool: 'ERASE',
      worker,
      animals: [deadAnimal],
      selectedEntity: null,
    });
    const { handleTileClick } = useEditor(makeRendererRef());
    handleTileClick(3, 4);
    expect(worker.postMessage).toHaveBeenCalledWith({
      cmd: 'eraseAt',
      x: 3,
      y: 4,
    });
  });

  it('delegates empty tile erase to worker via eraseAt', () => {
    const worker = makeWorker();
    useSimStore.setState({
      tool: 'ERASE',
      worker,
      animals: [],
      selectedEntity: null,
    });
    const { handleTileClick } = useEditor(makeRendererRef());
    handleTileClick(0, 0);
    expect(worker.postMessage).toHaveBeenCalledWith({
      cmd: 'eraseAt',
      x: 0,
      y: 0,
    });
  });

  it('pushes an entity undo entry when erasing', () => {
    const worker = makeWorker();
    useSimStore.setState({
      tool: 'ERASE',
      worker,
      animals: [aliveAnimal],
      selectedEntity: null,
    });
    const { handleTileClick } = useEditor(makeRendererRef());
    handleTileClick(3, 4);

    const { entityUndoStack } = useSimStore.getState();
    expect(entityUndoStack).toHaveLength(1);
    expect(entityUndoStack[0]).toMatchObject({
      kind: 'erasedAnimal',
      entityId: 42,
      species: 'DEER',
    });
  });
});
