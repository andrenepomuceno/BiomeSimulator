import { useEffect, useRef } from 'react';
import useSimStore from '../store/simulationStore';

const PAN_SPEED = 8;
const ZOOM_FACTOR = 1.15;
const MIN_TPS = 1;
const MAX_TPS = 60;
const TPS_STEP = 5;
const DEBUG_CAMERA_ROTATE_STEP = Math.PI / 24;

const PAN_KEYS = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowLeft',
  'ArrowDown',
  'ArrowRight',
]);

const TOOL_SHORTCUTS = {
  Digit1: 'SELECT',
  Digit2: 'PAINT_TERRAIN',
  Digit3: 'PLACE_ENTITY',
  Digit4: 'ERASE',
};

const MODAL_SHORTCUTS = {
  KeyG: 'GUIDE',
  KeyR: 'REPORT',
  KeyC: 'CONFIG',
  KeyE: 'ENTITIES',
};

function isTypingTarget(target) {
  if (!target) return false;
  const tagName = target.tagName;
  return tagName === 'INPUT'
    || tagName === 'TEXTAREA'
    || tagName === 'SELECT'
    || target.isContentEditable;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function supportsDebugCamera(renderer) {
  return renderer
    && typeof renderer.toggleDebugCamera === 'function'
    && typeof renderer.rotateDebugCameraBy === 'function';
}

export function useKeyboardShortcuts({
  rendererRef,
  activeModal,
  activeDrawer,
  isCompactLayout,
  setActiveModal,
  setActiveDrawer,
  modals,
  playUiClick,
  onStart,
  onPause,
  onResume,
  onStep,
  onSpeedChange,
  onUndo,
  onRedo,
}) {
  const configRef = useRef(null);
  const heldKeysRef = useRef(new Set());
  const panFrameRef = useRef(null);

  configRef.current = {
    rendererRef,
    activeModal,
    activeDrawer,
    isCompactLayout,
    setActiveModal,
    setActiveDrawer,
    modals,
    playUiClick,
    onStart,
    onPause,
    onResume,
    onStep,
    onSpeedChange,
    onUndo,
    onRedo,
  };

  const stopPanLoop = () => {
    if (panFrameRef.current !== null) {
      window.cancelAnimationFrame(panFrameRef.current);
      panFrameRef.current = null;
    }
  };

  const clearHeldKeys = () => {
    heldKeysRef.current.clear();
    stopPanLoop();
  };

  useEffect(() => {
    const runPanFrame = () => {
      const currentConfig = configRef.current;
      const renderer = currentConfig.rendererRef.current;

      if (!renderer || currentConfig.activeModal || heldKeysRef.current.size === 0) {
        stopPanLoop();
        return;
      }

      let dx = 0;
      let dy = 0;

      if (heldKeysRef.current.has('KeyW') || heldKeysRef.current.has('ArrowUp')) dy += PAN_SPEED;
      if (heldKeysRef.current.has('KeyS') || heldKeysRef.current.has('ArrowDown')) dy -= PAN_SPEED;
      if (heldKeysRef.current.has('KeyA') || heldKeysRef.current.has('ArrowLeft')) dx += PAN_SPEED;
      if (heldKeysRef.current.has('KeyD') || heldKeysRef.current.has('ArrowRight')) dx -= PAN_SPEED;

      if (dx !== 0 || dy !== 0) {
        renderer.camera.pan(dx, dy);
      }

      panFrameRef.current = window.requestAnimationFrame(runPanFrame);
    };

    const ensurePanLoop = () => {
      if (panFrameRef.current === null) {
        panFrameRef.current = window.requestAnimationFrame(runPanFrame);
      }
    };

    const toggleModal = (modalKey) => {
      const currentConfig = configRef.current;
      const nextModal = currentConfig.modals[modalKey];
      if (!nextModal) return;

      currentConfig.playUiClick();
      currentConfig.setActiveDrawer(null);
      currentConfig.setActiveModal(current => (current === nextModal ? null : nextModal));
      clearHeldKeys();
    };

    const onKeyDown = (event) => {
      if (isTypingTarget(event.target)) return;

      const modifierPressed = event.ctrlKey || event.metaKey;
      if (modifierPressed && !event.altKey) {
        const key = event.key.toLowerCase();
        if (key === 'z' && !event.shiftKey) {
          event.preventDefault();
          configRef.current.onUndo();
          return;
        }
        if (key === 'y' || (key === 'z' && event.shiftKey)) {
          event.preventDefault();
          configRef.current.onRedo();
          return;
        }
      }

      if (event.ctrlKey || event.metaKey || event.altKey) return;

      if (PAN_KEYS.has(event.code)) {
        event.preventDefault();
        heldKeysRef.current.add(event.code);
        if (!configRef.current.activeModal) {
          ensurePanLoop();
        }
        return;
      }

      if (event.repeat) return;

      if (event.code === 'Escape') {
        event.preventDefault();
        if (configRef.current.isCompactLayout && configRef.current.activeDrawer) {
          configRef.current.setActiveDrawer(null);
          clearHeldKeys();
          return;
        }
        if (configRef.current.activeModal) {
          configRef.current.playUiClick();
          configRef.current.setActiveModal(null);
          clearHeldKeys();
          return;
        }
        configRef.current.playUiClick();
        configRef.current.setActiveDrawer(null);
        configRef.current.setActiveModal(configRef.current.modals.MENU);
        clearHeldKeys();
        return;
      }

      const modalShortcut = MODAL_SHORTCUTS[event.code];
      if (modalShortcut) {
        event.preventDefault();
        toggleModal(modalShortcut);
        return;
      }

      if (event.code === 'KeyM') {
        event.preventDefault();
        const store = useSimStore.getState();
        configRef.current.playUiClick();
        store.setAudioSettings({ muted: !store.audioSettings.muted });
        return;
      }

      if (configRef.current.activeModal) {
        return;
      }

      if (event.code === 'KeyV') {
        const renderer = configRef.current.rendererRef.current;
        if (supportsDebugCamera(renderer)) {
          event.preventDefault();
          renderer.toggleDebugCamera();
        }
        return;
      }

      if (event.code === 'KeyQ' || event.code === 'KeyF') {
        const renderer = configRef.current.rendererRef.current;
        if (supportsDebugCamera(renderer) && renderer.isDebugCameraEnabled?.()) {
          event.preventDefault();
          const direction = event.code === 'KeyQ' ? -1 : 1;
          renderer.rotateDebugCameraBy(direction * DEBUG_CAMERA_ROTATE_STEP);
        }
        return;
      }

      if (event.code === 'KeyX') {
        const renderer = configRef.current.rendererRef.current;
        if (supportsDebugCamera(renderer) && renderer.isDebugCameraEnabled?.()) {
          event.preventDefault();
          renderer.resetDebugCameraRotation?.();
        }
        return;
      }

      if (event.code === 'Space') {
        event.preventDefault();
        const { running, paused } = useSimStore.getState();
        if (!running) configRef.current.onStart();
        else if (paused) configRef.current.onResume();
        else configRef.current.onPause();
        return;
      }

      if (event.code === 'KeyN') {
        const { paused } = useSimStore.getState();
        if (!paused) return;
        event.preventDefault();
        configRef.current.onStep();
        return;
      }

      if (event.code === 'BracketLeft' || event.code === 'BracketRight') {
        event.preventDefault();
        const { tps } = useSimStore.getState();
        const delta = event.code === 'BracketLeft' ? -TPS_STEP : TPS_STEP;
        const nextTps = clamp(tps + delta, MIN_TPS, MAX_TPS);
        if (nextTps !== tps) {
          configRef.current.onSpeedChange(nextTps);
        }
        return;
      }

      if (event.code === 'Equal' || event.code === 'NumpadAdd') {
        event.preventDefault();
        const renderer = configRef.current.rendererRef.current;
        if (renderer) {
          renderer.camera.setZoom(renderer.camera.zoom * ZOOM_FACTOR);
        }
        return;
      }

      if (event.code === 'Minus' || event.code === 'NumpadSubtract') {
        event.preventDefault();
        const renderer = configRef.current.rendererRef.current;
        if (renderer) {
          renderer.camera.setZoom(renderer.camera.zoom / ZOOM_FACTOR);
        }
        return;
      }

      const nextTool = TOOL_SHORTCUTS[event.code];
      if (nextTool) {
        event.preventDefault();
        const store = useSimStore.getState();
        if (store.tool !== nextTool) {
          configRef.current.playUiClick();
          store.setTool(nextTool);
        }
      }
    };

    const onKeyUp = (event) => {
      if (!PAN_KEYS.has(event.code)) return;
      heldKeysRef.current.delete(event.code);
      if (heldKeysRef.current.size === 0) {
        stopPanLoop();
      }
    };

    const onBlur = () => {
      clearHeldKeys();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      clearHeldKeys();
    };
  }, []);

  useEffect(() => {
    if (activeModal) {
      clearHeldKeys();
    }
  }, [activeModal]);
}