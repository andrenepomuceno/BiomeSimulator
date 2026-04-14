import { useCallback, useEffect, useRef } from 'react';
import { SoundManager } from '../audio/soundManager.js';
import useSimStore from '../store/simulationStore.js';

export function useAudio() {
  const managerRef = useRef(null);

  const ensureManager = () => {
    if (!managerRef.current) {
      managerRef.current = new SoundManager();
    }
    return managerRef.current;
  };

  useEffect(() => {
    const manager = ensureManager();
    let previousAudioSettings = useSimStore.getState().audioSettings;
    manager.applySettings(previousAudioSettings);

    const unsubscribe = useSimStore.subscribe((state) => {
      if (state.audioSettings !== previousAudioSettings) {
        previousAudioSettings = state.audioSettings;
        manager.applySettings(previousAudioSettings);
      }
    });

    return () => {
      unsubscribe();
      manager.destroy();
      if (managerRef.current === manager) {
        managerRef.current = null;
      }
    };
  }, []);

  const unlockAudio = useCallback(async () => {
    const manager = ensureManager();

    const unlocked = await manager.unlock();
    const store = useSimStore.getState();
    if (store.audioSettings.unlocked !== unlocked) {
      store.setAudioSettings({ unlocked });
    }
    return unlocked;
  }, []);

  const updateListenerViewport = useCallback((viewport) => {
    ensureManager().setViewport(viewport);
  }, []);

  const playUiClick = useCallback(() => {
    ensureManager().play('uiClick');
  }, []);

  const playWorldEffect = useCallback((event) => {
    ensureManager().play(event);
  }, []);

  const syncAmbience = useCallback((clock) => {
    ensureManager().syncClock(clock);
  }, []);

  return {
    unlockAudio,
    updateListenerViewport,
    playUiClick,
    playWorldEffect,
    syncAmbience,
  };
}